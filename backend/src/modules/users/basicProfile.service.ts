import { z } from 'zod';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { Request, Response, NextFunction, Router } from 'express';
import { pool } from '../../db/pool.js';
import { authRequired } from '../../middleware/auth.js';

export const BasicProfileInput = z.object({
  age: z.number().int().min(10).max(120).nullable().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_say']).nullable().optional(),
  height_cm: z.number().min(80).max(250).nullable().optional(),
  weight_kg: z.number().min(20).max(300).nullable().optional(),
});
export type BasicProfileDto = z.infer<typeof BasicProfileInput>;

interface Row extends RowDataPacket {
  id: number;
  age: number | null;
  gender: string | null;
  height_cm: string | null;
  weight_kg: string | null;
  bmi: string | null;
}

export async function getCurrent(userId: number) {
  const [rows] = await pool.query<Row[]>(
    `SELECT id, age, gender, height_cm, weight_kg, bmi
       FROM basic_profiles
      WHERE user_id = ? AND valid_to IS NULL
      ORDER BY valid_from DESC
      LIMIT 1`,
    [userId],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    age: r.age,
    gender: r.gender,
    height_cm: r.height_cm == null ? null : Number(r.height_cm),
    weight_kg: r.weight_kg == null ? null : Number(r.weight_kg),
    bmi: r.bmi == null ? null : Number(r.bmi),
  };
}

export async function upsert(userId: number, dto: BasicProfileDto) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE basic_profiles SET valid_to = NOW() WHERE user_id = ? AND valid_to IS NULL', [userId]);
    await conn.query<ResultSetHeader>(
      `INSERT INTO basic_profiles (user_id, age, gender, height_cm, weight_kg)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, dto.age ?? null, dto.gender ?? null, dto.height_cm ?? null, dto.weight_kg ?? null],
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

router.get('/me/profile/basic', authRequired, async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await getCurrent(req.user!.id)); } catch (e) { next(e); }
});

router.put('/me/profile/basic', authRequired, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = BasicProfileInput.parse(req.body);
    res.json(await upsert(req.user!.id, dto));
  } catch (e) { next(e); }
});

export default router;
