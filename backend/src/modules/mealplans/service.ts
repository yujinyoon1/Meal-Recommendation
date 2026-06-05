/**
 * 002 FR-020/021 — 식단 저장·재사용.
 *
 *  - save(): 추천 결과를 저장(이름/메모)
 *  - list(): 저장 식단 목록
 *  - reuse(): 재사용(reuse_count++) + 원본 추천 결과 반환 + 소비 기록/선호 재계산(학습 신호)
 */
import { z } from 'zod';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../../db/pool.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { lookupFood } from '../../adapters/nutrition/foodLookup.js';
import { recomputeWeights } from '../preferences/service.js';
import { loadResult, type RecommendationResult } from '../recommendation/orchestrator.js';

export const SaveInput = z.object({
  source_recommendation_id: z.coerce.number().int().positive(),
  name: z.string().min(1).max(100),
  memo: z.string().max(500).optional().nullable(),
});
export type SaveDto = z.infer<typeof SaveInput>;

export interface SavedMealPlan {
  id: number;
  source_recommendation_id: number | null;
  name: string;
  memo: string | null;
  reuse_count: number;
  last_used_at: string | null;
  created_at: string;
}

interface OwnerRow extends RowDataPacket { user_id: number }
interface PlanRow extends RowDataPacket {
  id: number;
  source_recommendation_id: number | null;
  name: string;
  memo: string | null;
  reuse_count: number;
  last_used_at: string | null;
  created_at: string;
}

export async function save(userId: number, dto: SaveDto): Promise<SavedMealPlan> {
  // 본인 추천만 저장 가능
  const [owners] = await pool.query<OwnerRow[]>(
    'SELECT user_id FROM recommendation_requests WHERE id = ? LIMIT 1',
    [dto.source_recommendation_id],
  );
  if (owners.length === 0) throw new AppError('NOT_FOUND', 'recommendation not found', 404);
  if (owners[0].user_id !== userId) throw new AppError('FORBIDDEN', 'not your recommendation', 403);

  const [res] = await pool.query<ResultSetHeader>(
    `INSERT INTO saved_meal_plans (user_id, source_recommendation_id, name, memo)
     VALUES (?, ?, ?, ?)`,
    [userId, dto.source_recommendation_id, dto.name, dto.memo ?? null],
  );
  return {
    id: res.insertId,
    source_recommendation_id: dto.source_recommendation_id,
    name: dto.name,
    memo: dto.memo ?? null,
    reuse_count: 0,
    last_used_at: null,
    created_at: new Date().toISOString(),
  };
}

export async function list(userId: number): Promise<SavedMealPlan[]> {
  const [rows] = await pool.query<PlanRow[]>(
    `SELECT id, source_recommendation_id, name, memo, reuse_count,
            DATE_FORMAT(last_used_at, '%Y-%m-%dT%H:%i:%sZ') AS last_used_at,
            DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at
       FROM saved_meal_plans
      WHERE user_id = ?
      ORDER BY created_at DESC`,
    [userId],
  );
  return rows.map((r) => ({
    id: r.id,
    source_recommendation_id: r.source_recommendation_id,
    name: r.name,
    memo: r.memo,
    reuse_count: r.reuse_count,
    last_used_at: r.last_used_at,
    created_at: r.created_at,
  }));
}

/** 원본 추천 레시피의 재료를 소비 기록으로 적재 → 선호 학습 신호 (FR-021). best-effort. */
async function logReuseSignal(userId: number, recommendationId: number): Promise<void> {
  interface IngRow extends RowDataPacket { ingredients_json: Array<{ name?: string }> | string | null }
  const [rows] = await pool.query<IngRow[]>(
    `SELECT r.ingredients_json
       FROM meal_plans mp
       JOIN meal_plan_recipes mpr ON mpr.meal_plan_id = mp.id
       JOIN recipes r ON r.id = mpr.recipe_id
      WHERE mp.recommendation_id = ?`,
    [recommendationId],
  );
  const names = new Set<string>();
  for (const row of rows) {
    const arr = typeof row.ingredients_json === 'string'
      ? (JSON.parse(row.ingredients_json) as Array<{ name?: string }>)
      : (row.ingredients_json ?? []);
    for (const ing of arr) {
      const n = (ing?.name ?? '').trim();
      if (n) names.add(n);
    }
  }
  for (const name of names) {
    const m = await lookupFood(name);
    await pool.query<ResultSetHeader>(
      `INSERT INTO consumption_records (user_id, food_id, recommendation_id) VALUES (?, ?, ?)`,
      [userId, m.food_id, recommendationId],
    );
  }
}

export async function reuse(userId: number, planId: number): Promise<RecommendationResult> {
  const [rows] = await pool.query<PlanRow[]>(
    'SELECT id, source_recommendation_id FROM saved_meal_plans WHERE id = ? AND user_id = ? LIMIT 1',
    [planId, userId],
  );
  const plan = rows[0];
  if (!plan) throw new AppError('NOT_FOUND', 'saved meal plan not found', 404);
  if (!plan.source_recommendation_id) {
    throw new AppError('GONE', '원본 추천이 삭제되어 재사용할 수 없습니다.', 410);
  }

  await pool.query<ResultSetHeader>(
    'UPDATE saved_meal_plans SET reuse_count = reuse_count + 1, last_used_at = NOW() WHERE id = ? AND user_id = ?',
    [planId, userId],
  );

  // 학습 신호 적재 + 재계산 (best-effort, 실패해도 재사용은 진행)
  logReuseSignal(userId, plan.source_recommendation_id)
    .then(() => recomputeWeights(userId))
    .catch((e) => logger.warn({ err: e, userId }, 'reuse learning signal failed'));

  const result = await loadResult(plan.source_recommendation_id);
  if (!result) throw new AppError('GONE', '원본 추천 결과를 찾을 수 없습니다.', 410);
  return result;
}
