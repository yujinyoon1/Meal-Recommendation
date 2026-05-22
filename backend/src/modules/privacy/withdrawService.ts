/**
 * 회원 탈퇴 (FR-025).
 *  - users.status = 'withdrawn', deleted_at = NOW()
 *  - 30일 grace 후 hardDeleteJob 이 본인 보유 행 hard delete
 *  - refresh 쿠키 즉시 무효화
 */
import { z } from 'zod';
import { Request, Response, NextFunction, Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../../db/pool.js';
import { authRequired } from '../../middleware/auth.js';
import { audit } from '../../middleware/audit.js';
import { AppError } from '../../middleware/errorHandler.js';
import { verifyPassword } from '../../utils/password.js';

export const WithdrawInput = z.object({
  password: z.string().min(1).max(72),
  reason: z.string().max(500).optional(),
});

interface UserRow extends RowDataPacket {
  id: number;
  password_hash: string;
  status: string;
}

export async function withdraw(userId: number, password: string): Promise<void> {
  const [rows] = await pool.query<UserRow[]>(
    'SELECT id, password_hash, status FROM users WHERE id = ? LIMIT 1',
    [userId],
  );
  const u = rows[0];
  if (!u) throw new AppError('NOT_FOUND', 'user not found', 404);
  if (u.status === 'withdrawn') throw new AppError('ALREADY_WITHDRAWN', 'already withdrawn', 409);

  const ok = await verifyPassword(password, u.password_hash);
  if (!ok) throw new AppError('INVALID_PASSWORD', 'password verification failed', 401);

  const [res] = await pool.query<ResultSetHeader>(
    `UPDATE users SET status = 'withdrawn', deleted_at = NOW() WHERE id = ? AND status != 'withdrawn'`,
    [userId],
  );
  if (res.affectedRows === 0) throw new AppError('ALREADY_WITHDRAWN', 'already withdrawn', 409);
}

const router = Router();

router.delete(
  '/me',
  authRequired,
  audit('user.delete'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = WithdrawInput.parse(req.body);
      await withdraw(req.user!.id, dto.password);
      // refresh cookie 무효화
      res.clearCookie('mis_refresh', { path: '/api/auth' });
      res.status(204).end();
    } catch (e) { next(e); }
  },
);

export default router;
