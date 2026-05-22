import { z } from 'zod';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { Request, Response, NextFunction, Router } from 'express';
import { pool } from '../../db/pool.js';
import { authRequired } from '../../middleware/auth.js';
import { audit } from '../../middleware/audit.js';
import { encrypt, decrypt } from '../../utils/crypto.js';

export const HealthProfileInput = z.object({
  allergies: z.array(z.string().min(1).max(60)).max(50).default([]),
  diseases: z.array(z.string().min(1).max(60)).max(30).default([]),
  goal: z.enum(['lose_weight', 'maintain', 'gain_muscle']).nullable().optional(),
  target_calories_kcal: z.number().int().min(800).max(5000).nullable().optional(),
});
export type HealthProfileDto = z.infer<typeof HealthProfileInput>;

interface Row extends RowDataPacket {
  id: number;
  allergies_enc: Buffer | null;
  diseases_enc: Buffer | null;
  goal: string | null;
  target_calories_kcal: number | null;
}

export async function getCurrent(userId: number) {
  const [rows] = await pool.query<Row[]>(
    `SELECT id, allergies_enc, diseases_enc, goal, target_calories_kcal
       FROM health_profiles
      WHERE user_id = ? AND valid_to IS NULL
      ORDER BY valid_from DESC
      LIMIT 1`,
    [userId],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    allergies: r.allergies_enc ? decrypt<string[]>(r.allergies_enc) : [],
    diseases: r.diseases_enc ? decrypt<string[]>(r.diseases_enc) : [],
    goal: r.goal,
    target_calories_kcal: r.target_calories_kcal,
  };
}

export async function upsert(userId: number, dto: HealthProfileDto) {
  const allergiesEnc = encrypt(dto.allergies ?? []);
  const diseasesEnc = encrypt(dto.diseases ?? []);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE health_profiles SET valid_to = NOW() WHERE user_id = ? AND valid_to IS NULL', [userId]);
    await conn.query<ResultSetHeader>(
      `INSERT INTO health_profiles (user_id, allergies_enc, diseases_enc, goal, target_calories_kcal)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, allergiesEnc, diseasesEnc, dto.goal ?? null, dto.target_calories_kcal ?? null],
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

router.get(
  '/me/profile/health',
  authRequired,
  audit('health_profile.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(await getCurrent(req.user!.id)); } catch (e) { next(e); }
  },
);

router.put(
  '/me/profile/health',
  authRequired,
  audit('health_profile.write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = HealthProfileInput.parse(req.body);
      res.json(await upsert(req.user!.id, dto));
    } catch (e) { next(e); }
  },
);

export default router;
