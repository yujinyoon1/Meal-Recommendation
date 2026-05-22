/**
 * 감사 로그 미들웨어 데코레이터.
 * 사용: router.get('/me/profile/health', authRequired, audit('health_profile.read'), handler)
 *
 * 응답 200대만 기록. 메타는 metadata_json 에 자유 형식.
 */
import { NextFunction, Request, Response } from 'express';
import { pool } from '../db/pool.js';
import { logger } from '../utils/logger.js';

function ipToBuffer(ip: string | undefined): Buffer | null {
  if (!ip) return null;
  // IPv4 mapped → 16 bytes (단순 변환; 정밀 변환은 node:net 활용 권장)
  return Buffer.from(ip.slice(0, 45));
}

export function audit(action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const actorId = req.user?.id ?? null;
        const targetUserId = actorId; // 기본은 본인. 라우트에서 별도 지정 시 metadata에 표시.
        pool
          .query(
            `INSERT INTO audit_logs (actor_user_id, action, target_user_id, metadata_json, ip)
             VALUES (?, ?, ?, JSON_OBJECT('method', ?, 'path', ?, 'requestId', ?), ?)`,
            [actorId, action, targetUserId, req.method, req.originalUrl, req.id ?? null, ipToBuffer(req.ip)],
          )
          .catch((e: unknown) => logger.error({ err: e, action }, 'audit insert failed'));
      }
    });
    next();
  };
}
