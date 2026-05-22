import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../../db/pool.js';
import { AppError } from '../../middleware/errorHandler.js';
import { computeGap, type NutritionSnapshot, type ShoppingCandidate } from './gapCalculator.js';

interface OwnerRow extends RowDataPacket { user_id: number }
interface NutRow extends RowDataPacket {
  total_kcal: string | null;
  protein_g: string | null;
  fiber_g: string | null;
  sodium_mg: string | null;
  rda_ratio_json: { calories: number; protein: number; fiber: number; sodium: number } | null;
}
interface ItemRow extends RowDataPacket {
  id: number;
  food_id: number | null;
  name: string;
  category: string | null;
  reason: string | null;
  suggested_qty: string | null;
}

export interface ShoppingListResponse {
  recommendation_id: number;
  generated: boolean;
  warnings: string[];
  items: Array<{
    id: number;
    food_id: number | null;
    name: string;
    category: string | null;
    reason: string;
    suggested_qty: string;
  }>;
}

export async function listOrGenerate(userId: number, recommendationId: number): Promise<ShoppingListResponse> {
  // 본인 확인
  const [owners] = await pool.query<OwnerRow[]>(
    'SELECT user_id FROM recommendation_requests WHERE id = ? LIMIT 1',
    [recommendationId],
  );
  if (owners.length === 0) throw new AppError('NOT_FOUND', 'recommendation not found', 404);
  if (owners[0].user_id !== userId) throw new AppError('FORBIDDEN', 'not your recommendation', 403);

  // 기존 항목
  const [existing] = await pool.query<ItemRow[]>(
    'SELECT id, food_id, name, category, reason, suggested_qty FROM shopping_list_items WHERE recommendation_id = ? ORDER BY id',
    [recommendationId],
  );
  if (existing.length > 0) {
    return {
      recommendation_id: recommendationId,
      generated: false,
      warnings: [],
      items: existing.map((r) => ({
        id: r.id,
        food_id: r.food_id,
        name: r.name,
        category: r.category,
        reason: r.reason ?? '',
        suggested_qty: r.suggested_qty ?? '',
      })),
    };
  }

  // 영양 분석 로드
  const [nutRows] = await pool.query<NutRow[]>(
    'SELECT total_kcal, protein_g, fiber_g, sodium_mg, rda_ratio_json FROM nutrition_analyses WHERE recommendation_id = ? LIMIT 1',
    [recommendationId],
  );
  const nut = nutRows[0];
  if (!nut || !nut.rda_ratio_json) {
    return { recommendation_id: recommendationId, generated: false, warnings: ['nutrition analysis missing'], items: [] };
  }

  const snapshot: NutritionSnapshot = {
    total_kcal: Number(nut.total_kcal ?? 0),
    protein_g: Number(nut.protein_g ?? 0),
    fiber_g: Number(nut.fiber_g ?? 0),
    sodium_mg: Number(nut.sodium_mg ?? 0),
    rda_ratio: nut.rda_ratio_json,
  };

  const warnings: string[] = [];
  if (snapshot.rda_ratio.sodium > 1.5) {
    warnings.push(`나트륨 과다 (${Math.round(snapshot.rda_ratio.sodium * 100)}%) — 저나트륨 조리 권장`);
  }

  const candidates: ShoppingCandidate[] = await computeGap(snapshot);

  if (candidates.length === 0) {
    return { recommendation_id: recommendationId, generated: true, warnings, items: [] };
  }

  // 저장 (트랜잭션)
  const conn = await pool.getConnection();
  const inserted: ShoppingListResponse['items'] = [];
  try {
    await conn.beginTransaction();
    for (const c of candidates) {
      const [res] = await conn.query<ResultSetHeader>(
        `INSERT INTO shopping_list_items
           (recommendation_id, food_id, name, category, reason, suggested_qty)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [recommendationId, c.food_id, c.name, c.category, c.reason, c.suggested_qty],
      );
      inserted.push({
        id: res.insertId,
        food_id: c.food_id,
        name: c.name,
        category: c.category,
        reason: c.reason,
        suggested_qty: c.suggested_qty,
      });
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  return { recommendation_id: recommendationId, generated: true, warnings, items: inserted };
}
