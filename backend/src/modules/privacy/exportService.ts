/**
 * 본인 데이터 내보내기 (FR-025).
 * 모든 본인 행을 JSON 한 덩어리로 반환. 민감 컬럼(allergies/diseases)은 복호화 후 포함.
 */
import { Request, Response, NextFunction, Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../../db/pool.js';
import { authRequired } from '../../middleware/auth.js';
import { audit } from '../../middleware/audit.js';
import { decrypt } from '../../utils/crypto.js';

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  display_name: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}
interface BasicRow extends RowDataPacket {
  id: number; age: number | null; gender: string | null;
  height_cm: string | null; weight_kg: string | null; bmi: string | null;
  valid_from: Date; valid_to: Date | null;
}
interface HealthRow extends RowDataPacket {
  id: number; allergies_enc: Buffer | null; diseases_enc: Buffer | null;
  goal: string | null; target_calories_kcal: number | null;
  valid_from: Date; valid_to: Date | null;
}
interface DietRow extends RowDataPacket {
  id: number; meals_per_day: number | null; dining_out_per_week: number | null;
  delivery_per_week: number | null; avoid_ingredients_json: unknown;
  prefer_categories_json: unknown; cooking_time_max_min: number;
  valid_from: Date; valid_to: Date | null;
}
interface ConsentRow extends RowDataPacket {
  id: number; consent_type: string; granted: number; version: string;
  granted_at: Date; revoked_at: Date | null;
}
interface InvRow extends RowDataPacket {
  id: number; raw_text: string; food_id: number | null;
  quantity: string | null; unit: string | null;
  expires_at: string | null; consumed: number; consumed_at: Date | null;
}
interface RecRow extends RowDataPacket {
  id: number; request_at: Date; status: string;
  llm_provider: string | null; llm_model: string | null; llm_latency_ms: number | null;
  failure_reason: string | null;
}
interface FbRow extends RowDataPacket {
  id: number; recommendation_id: number; rating: number;
  comment: string | null; created_at: Date;
}

export async function exportUserData(userId: number) {
  const [users] = await pool.query<UserRow[]>(
    'SELECT id, email, display_name, status, created_at, updated_at, deleted_at FROM users WHERE id = ? LIMIT 1',
    [userId],
  );
  const [basic] = await pool.query<BasicRow[]>(
    'SELECT id, age, gender, height_cm, weight_kg, bmi, valid_from, valid_to FROM basic_profiles WHERE user_id = ? ORDER BY valid_from',
    [userId],
  );
  const [health] = await pool.query<HealthRow[]>(
    'SELECT id, allergies_enc, diseases_enc, goal, target_calories_kcal, valid_from, valid_to FROM health_profiles WHERE user_id = ? ORDER BY valid_from',
    [userId],
  );
  const [diet] = await pool.query<DietRow[]>(
    `SELECT id, meals_per_day, dining_out_per_week, delivery_per_week,
            avoid_ingredients_json, prefer_categories_json, cooking_time_max_min, valid_from, valid_to
       FROM diet_preferences WHERE user_id = ? ORDER BY valid_from`,
    [userId],
  );
  const [consents] = await pool.query<ConsentRow[]>(
    'SELECT id, consent_type, granted, version, granted_at, revoked_at FROM consent_records WHERE user_id = ? ORDER BY granted_at',
    [userId],
  );
  const [inventory] = await pool.query<InvRow[]>(
    `SELECT id, raw_text, food_id, quantity, unit, DATE_FORMAT(expires_at, '%Y-%m-%d') AS expires_at, consumed, consumed_at
       FROM ingredient_items WHERE user_id = ? ORDER BY id`,
    [userId],
  );
  const [recs] = await pool.query<RecRow[]>(
    `SELECT id, request_at, status, llm_provider, llm_model, llm_latency_ms, failure_reason
       FROM recommendation_requests WHERE user_id = ? ORDER BY request_at`,
    [userId],
  );
  const [feedbacks] = await pool.query<FbRow[]>(
    'SELECT id, recommendation_id, rating, comment, created_at FROM feedbacks WHERE user_id = ? ORDER BY created_at',
    [userId],
  );

  // 002 — 신규 사용자 보유 데이터도 내보내기에 포함 (개인정보 이동권)
  const [preferenceWeights] = await pool.query<RowDataPacket[]>(
    'SELECT dimension, key_ref, weight, confidence, sample_count, updated_at FROM user_preference_weights WHERE user_id = ? ORDER BY ABS(weight) DESC',
    [userId],
  );
  const [recommendationEdits] = await pool.query<RowDataPacket[]>(
    `SELECT re.recommendation_id, re.action, re.target_type, re.target_ref, re.replacement_ref, re.created_at
       FROM recommendation_edits re WHERE re.user_id = ? ORDER BY re.created_at`,
    [userId],
  );
  const [consumption] = await pool.query<RowDataPacket[]>(
    'SELECT food_id, ingredient_item_id, recommendation_id, quantity, consumed_at FROM consumption_records WHERE user_id = ? ORDER BY consumed_at',
    [userId],
  );
  const [savedMealPlans] = await pool.query<RowDataPacket[]>(
    'SELECT id, source_recommendation_id, name, memo, reuse_count, last_used_at, created_at FROM saved_meal_plans WHERE user_id = ? ORDER BY created_at',
    [userId],
  );
  const [healthLogs] = await pool.query<RowDataPacket[]>(
    `SELECT DATE_FORMAT(logged_at, '%Y-%m-%d') AS logged_at, weight_kg, metrics_enc, note, created_at
       FROM health_logs WHERE user_id = ? ORDER BY logged_at`,
    [userId],
  );

  return {
    schema_version: '1.0',
    exported_at: new Date().toISOString(),
    user: users[0] ?? null,
    profiles: {
      basic: basic.map((r) => ({
        ...r,
        height_cm: r.height_cm == null ? null : Number(r.height_cm),
        weight_kg: r.weight_kg == null ? null : Number(r.weight_kg),
        bmi: r.bmi == null ? null : Number(r.bmi),
      })),
      health: health.map((r) => ({
        id: r.id,
        // 복호화하여 평문으로 내보냄 (사용자 본인 요청)
        allergies: r.allergies_enc ? decrypt<string[]>(r.allergies_enc) : [],
        diseases: r.diseases_enc ? decrypt<string[]>(r.diseases_enc) : [],
        goal: r.goal,
        target_calories_kcal: r.target_calories_kcal,
        valid_from: r.valid_from,
        valid_to: r.valid_to,
      })),
      diet,
    },
    consents,
    inventory,
    recommendations: recs,
    feedbacks,
    // 002 적응형 개인화·건강 데이터
    preference_weights: preferenceWeights,
    recommendation_edits: recommendationEdits,
    consumption_records: consumption,
    saved_meal_plans: savedMealPlans,
    health_logs: healthLogs.map((r) => ({
      logged_at: r.logged_at,
      weight_kg: r.weight_kg == null ? null : Number(r.weight_kg),
      // 민감 지표는 복호화하여 평문으로 (본인 요청)
      metrics: r.metrics_enc ? decrypt<Record<string, unknown>>(r.metrics_enc as Buffer) : null,
      note: r.note,
      created_at: r.created_at,
    })),
  };
}

const router = Router();

router.get(
  '/me/data/export',
  authRequired,
  audit('data.export'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await exportUserData(req.user!.id);
      const filename = `mis2601-export-${req.user!.id}-${new Date().toISOString().slice(0, 10)}.json`;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(JSON.stringify(data, null, 2));
    } catch (e) { next(e); }
  },
);

export default router;
