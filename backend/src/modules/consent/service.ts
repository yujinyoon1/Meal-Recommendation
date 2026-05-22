import { z } from 'zod';
import type { RowDataPacket } from 'mysql2';
import { Request, Response, NextFunction, Router } from 'express';
import { pool } from '../../db/pool.js';
import { authRequired } from '../../middleware/auth.js';

const ConsentType = z.enum(['terms', 'privacy', 'sensitive_health', 'marketing', 'third_party_share']);

export const ConsentUpdate = z.object({
  type: ConsentType,
  granted: z.boolean(),
});
export const ConsentBatch = z.object({ consents: z.array(ConsentUpdate).min(1) });

interface ConsentRow extends RowDataPacket {
  consent_type: string;
  granted: number;
  version: string;
  granted_at: Date;
  revoked_at: Date | null;
}

export async function getLatestConsents(userId: number) {
  // 각 type 별 최신 1건
  const [rows] = await pool.query<ConsentRow[]>(
    `SELECT c1.consent_type, c1.granted, c1.version, c1.granted_at, c1.revoked_at
       FROM consent_records c1
       JOIN (
         SELECT consent_type, MAX(granted_at) AS mx
           FROM consent_records WHERE user_id = ?
          GROUP BY consent_type
       ) c2 ON c1.consent_type = c2.consent_type AND c1.granted_at = c2.mx
      WHERE c1.user_id = ?`,
    [userId, userId],
  );
  return rows.map((r) => ({
    type: r.consent_type,
    granted: !!r.granted,
    version: r.version,
    granted_at: r.granted_at,
    revoked_at: r.revoked_at,
  }));
}

function ipBuf(ip: string | undefined): Buffer | null {
  return ip ? Buffer.from(ip.slice(0, 45)) : null;
}

export async function setConsents(userId: number, items: Array<z.infer<typeof ConsentUpdate>>, ip?: string) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const c of items) {
      await conn.query(
        `INSERT INTO consent_records (user_id, consent_type, granted, evidence_ip)
         VALUES (?, ?, ?, ?)`,
        [userId, c.type, c.granted, ipBuf(ip)],
      );
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  return getLatestConsents(userId);
}

const router = Router();

router.get('/me/consents', authRequired, async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await getLatestConsents(req.user!.id)); } catch (e) { next(e); }
});

router.post('/me/consents', authRequired, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = ConsentBatch.parse(req.body);
    res.json(await setConsents(req.user!.id, body.consents, req.ip));
  } catch (e) { next(e); }
});

export default router;
