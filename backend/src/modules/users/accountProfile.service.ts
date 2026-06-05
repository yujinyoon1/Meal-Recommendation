import { z } from 'zod';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { Request, Response, NextFunction, Router } from 'express';
import { pool } from '../../db/pool.js';
import { authRequired } from '../../middleware/auth.js';

export const AccountProfileInput = z.object({
  display_name: z.string().trim().min(1).max(40).nullable().optional(),
});
export type AccountProfileDto = z.infer<typeof AccountProfileInput>;

interface Row extends RowDataPacket {
  id: number;
  email: string;
  display_name: string | null;
  last_login_at: Date | string | null;
  previous_login_at: Date | string | null;
}

function toIso(v: Date | string | null): string | null {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function getCurrent(userId: number) {
  const [rows] = await pool.query<Row[]>(
    'SELECT id, email, display_name, last_login_at, previous_login_at FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [userId],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    email: r.email,
    display_name: r.display_name,
    last_login_at: toIso(r.last_login_at),
    previous_login_at: toIso(r.previous_login_at),
  };
}

export async function update(userId: number, dto: AccountProfileDto) {
  await pool.query<ResultSetHeader>(
    'UPDATE users SET display_name = ? WHERE id = ? AND deleted_at IS NULL',
    [dto.display_name ?? null, userId],
  );
  return getCurrent(userId);
}

const router = Router();

router.get('/me/profile/account', authRequired, async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await getCurrent(req.user!.id)); } catch (e) { next(e); }
});

router.put('/me/profile/account', authRequired, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = AccountProfileInput.parse(req.body);
    res.json(await update(req.user!.id, dto));
  } catch (e) { next(e); }
});

export default router;
