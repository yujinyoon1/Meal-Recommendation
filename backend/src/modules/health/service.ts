/**
 * 002 FR-030/031/032/033/038 — 건강 기록(수동) + 분석 리포트 + 캘린더.
 * 민감 지표는 앱 레벨 AES-256-GCM 암호화(utils/crypto 재사용).
 */
import { z } from 'zod';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../../db/pool.js';
import { AppError } from '../../middleware/errorHandler.js';
import { encrypt, decrypt } from '../../utils/crypto.js';
import {
  aggregateReport,
  hasEnoughData,
  type WeightPoint,
  type NutritionPoint,
} from '../../domain/health/reportAggregator.js';

export const HealthLogInput = z.object({
  logged_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight_kg: z.number().positive().max(500).optional().nullable(),
  metrics: z.record(z.unknown()).optional().nullable(),
  note: z.string().max(300).optional().nullable(),
});
export type HealthLogDto = z.infer<typeof HealthLogInput>;

const DISCLAIMER = '본 리포트는 정보 제공용이며 의학적 진단/처방이 아닙니다. 건강 우려가 있으면 전문의와 상담하세요.';

interface LogRow extends RowDataPacket {
  logged_at: string;
  weight_kg: string | null;
  metrics_enc: Buffer | null;
  note: string | null;
}

/** 일자별 UPSERT (FR-030). */
export async function upsertLog(userId: number, dto: HealthLogDto) {
  const metricsEnc = dto.metrics ? encrypt(dto.metrics) : null;
  await pool.query<ResultSetHeader>(
    `INSERT INTO health_logs (user_id, logged_at, weight_kg, metrics_enc, note)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE weight_kg = VALUES(weight_kg), metrics_enc = VALUES(metrics_enc), note = VALUES(note)`,
    [userId, dto.logged_at, dto.weight_kg ?? null, metricsEnc, dto.note ?? null],
  );
  return { logged_at: dto.logged_at };
}

export async function getLogs(userId: number, from?: string, to?: string) {
  const where = ['user_id = ?'];
  const args: unknown[] = [userId];
  if (from) { where.push('logged_at >= ?'); args.push(from); }
  if (to) { where.push('logged_at <= ?'); args.push(to); }
  const [rows] = await pool.query<LogRow[]>(
    `SELECT DATE_FORMAT(logged_at, '%Y-%m-%d') AS logged_at, weight_kg, metrics_enc, note
       FROM health_logs WHERE ${where.join(' AND ')} ORDER BY logged_at ASC`,
    args,
  );
  return rows.map((r) => ({
    logged_at: r.logged_at,
    weight_kg: r.weight_kg == null ? null : Number(r.weight_kg),
    metrics: r.metrics_enc ? decrypt<Record<string, unknown>>(r.metrics_enc) : null,
    note: r.note,
  }));
}

interface NutRow extends RowDataPacket {
  total_kcal: string; carb_g: string; protein_g: string; fat_g: string; fiber_g: string; sodium_mg: string;
}

/** 기간 리포트 (FR-031/032/034). 데이터 희소 시 409 (EC-5). */
export async function getReport(userId: number, period: 'week' | 'month') {
  const days = period === 'week' ? 7 : 30;
  const [wRows] = await pool.query<LogRow[]>(
    `SELECT DATE_FORMAT(logged_at, '%Y-%m-%d') AS logged_at, weight_kg, metrics_enc, note
       FROM health_logs
      WHERE user_id = ? AND logged_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND weight_kg IS NOT NULL
      ORDER BY logged_at ASC`,
    [userId, days],
  );
  const [nRows] = await pool.query<NutRow[]>(
    `SELECT na.total_kcal, na.carb_g, na.protein_g, na.fat_g, na.fiber_g, na.sodium_mg
       FROM nutrition_analyses na
       JOIN recommendation_requests rr ON rr.id = na.recommendation_id
      WHERE rr.user_id = ? AND na.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [userId, days],
  );

  if (!hasEnoughData(wRows.length, nRows.length)) {
    throw new AppError('INSUFFICIENT_DATA', '리포트를 만들기엔 기록이 부족합니다. 체중·식단 기록을 더 쌓아주세요.', 409);
  }

  const weights: WeightPoint[] = wRows.map((r) => ({ date: r.logged_at, weight_kg: Number(r.weight_kg) }));
  const nutrition: NutritionPoint[] = nRows.map((r) => ({
    total_kcal: Number(r.total_kcal), carb_g: Number(r.carb_g), protein_g: Number(r.protein_g),
    fat_g: Number(r.fat_g), fiber_g: Number(r.fiber_g), sodium_mg: Number(r.sodium_mg),
  }));
  const report = aggregateReport(weights, nutrition);
  return { period_type: period, ...report, disclaimer: DISCLAIMER };
}

interface CalRow extends RowDataPacket {
  day: string;
  recommendation_id: number;
  recipe_name: string | null;
}

/** 식단 이력 캘린더 (FR-033) — 월 단위 일자별 식단. */
export async function getCalendar(userId: number, month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new AppError('BAD_REQUEST', 'month must be YYYY-MM', 400);
  const [rows] = await pool.query<CalRow[]>(
    `SELECT DATE_FORMAT(rr.created_at, '%Y-%m-%d') AS day, rr.id AS recommendation_id, r.name AS recipe_name
       FROM recommendation_requests rr
       LEFT JOIN meal_plans mp ON mp.recommendation_id = rr.id
       LEFT JOIN meal_plan_recipes mpr ON mpr.meal_plan_id = mp.id
       LEFT JOIN recipes r ON r.id = mpr.recipe_id
      WHERE rr.user_id = ? AND DATE_FORMAT(rr.created_at, '%Y-%m') = ? AND rr.status = 'validated'
      ORDER BY rr.created_at ASC`,
    [userId, month],
  );
  const byDay: Record<string, { recommendation_id: number; recipes: string[] }[]> = {};
  for (const r of rows) {
    (byDay[r.day] ??= []);
    let entry = byDay[r.day].find((e) => e.recommendation_id === r.recommendation_id);
    if (!entry) { entry = { recommendation_id: r.recommendation_id, recipes: [] }; byDay[r.day].push(entry); }
    if (r.recipe_name) entry.recipes.push(r.recipe_name);
  }
  return byDay;
}
