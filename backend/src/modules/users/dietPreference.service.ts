import { z } from 'zod';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { Request, Response, NextFunction, Router } from 'express';
import { pool } from '../../db/pool.js';
import { authRequired } from '../../middleware/auth.js';

export const DietPreferenceInput = z.object({
  meals_per_day: z.number().int().min(1).max(6).nullable().optional(),
  dining_out_per_week: z.number().int().min(0).max(21).nullable().optional(),
  delivery_per_week: z.number().int().min(0).max(21).nullable().optional(),
  avoid_ingredients: z.array(z.string().min(1).max(60)).max(50).default([]),
  prefer_categories: z.array(z.string().min(1).max(60)).max(20).default([]),
  cooking_time_max_min: z.number().int().min(5).max(180).default(30),
});
export type DietPreferenceDto = z.infer<typeof DietPreferenceInput>;

interface Row extends RowDataPacket {
  id: number;
  meals_per_day: number | null;
  dining_out_per_week: number | null;
  delivery_per_week: number | null;
  // MariaDB JSON 컬럼은 LONGTEXT라 mysql2가 문자열로 반환할 수 있음.
  avoid_ingredients_json: string | string[] | null;
  prefer_categories_json: string | string[] | null;
  cooking_time_max_min: number;
}

/** JSON 컬럼이 배열로 파싱돼 오든 문자열로 오든 안전하게 string[]로 변환. */
function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  if (typeof v === 'string' && v.trim()) {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function getCurrent(userId: number) {
  const [rows] = await pool.query<Row[]>(
    `SELECT id, meals_per_day, dining_out_per_week, delivery_per_week,
            avoid_ingredients_json, prefer_categories_json, cooking_time_max_min
       FROM diet_preferences
      WHERE user_id = ? AND valid_to IS NULL
      ORDER BY valid_from DESC
      LIMIT 1`,
    [userId],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    meals_per_day: r.meals_per_day,
    dining_out_per_week: r.dining_out_per_week,
    delivery_per_week: r.delivery_per_week,
    avoid_ingredients: asStringArray(r.avoid_ingredients_json),
    prefer_categories: asStringArray(r.prefer_categories_json),
    cooking_time_max_min: r.cooking_time_max_min,
  };
}

export async function upsert(userId: number, dto: DietPreferenceDto) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE diet_preferences SET valid_to = NOW() WHERE user_id = ? AND valid_to IS NULL', [userId]);
    await conn.query<ResultSetHeader>(
      // MariaDB의 JSON 컬럼은 LONGTEXT 별칭 — CAST(? AS JSON)은 구문 오류.
      // JSON 문자열을 그대로 바인딩하면 json_valid 체크를 통과해 저장된다.
      `INSERT INTO diet_preferences
        (user_id, meals_per_day, dining_out_per_week, delivery_per_week,
         avoid_ingredients_json, prefer_categories_json, cooking_time_max_min)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        dto.meals_per_day ?? null,
        dto.dining_out_per_week ?? null,
        dto.delivery_per_week ?? null,
        JSON.stringify(dto.avoid_ingredients ?? []),
        JSON.stringify(dto.prefer_categories ?? []),
        dto.cooking_time_max_min,
      ],
    );
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  return getCurrent(userId);
}

const router = Router();

router.get('/me/profile/diet', authRequired, async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await getCurrent(req.user!.id)); } catch (e) { next(e); }
});

router.put('/me/profile/diet', authRequired, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = DietPreferenceInput.parse(req.body);
    res.json(await upsert(req.user!.id, dto));
  } catch (e) { next(e); }
});

export default router;
