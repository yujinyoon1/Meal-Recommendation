/**
 * 동의 철회 (FR-024).
 *  - 마케팅 / 민감 건강정보 동의를 즉시 철회
 *  - consent_records 에 새 행으로 granted=false 추가 + 이전 활성 행 revoked_at 갱신
 *  - 마케팅 철회 시 사용자의 mail 발송 플래그를 끄는 부수효과(이메일 발송기 미구현 — TODO)
 */
import type { ResultSetHeader } from 'mysql2';
import { pool } from '../../db/pool.js';
import { logger } from '../../utils/logger.js';

export type WithdrawableConsent = 'marketing' | 'sensitive_health' | 'third_party_share';

function ipBuf(ip: string | undefined): Buffer | null {
  return ip ? Buffer.from(ip.slice(0, 45)) : null;
}

export async function revokeConsent(
  userId: number,
  type: WithdrawableConsent,
  ip?: string,
): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // 직전 granted=1 행에 revoked_at 마킹
    await conn.query<ResultSetHeader>(
      `UPDATE consent_records
          SET revoked_at = NOW()
        WHERE user_id = ? AND consent_type = ? AND granted = TRUE AND revoked_at IS NULL`,
      [userId, type],
    );
    // 신규 granted=false 기록
    await conn.query<ResultSetHeader>(
      `INSERT INTO consent_records (user_id, consent_type, granted, evidence_ip)
       VALUES (?, ?, FALSE, ?)`,
      [userId, type, ipBuf(ip)],
    );
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  // 부수효과 — TODO: 메일러 통합 시 마케팅 플래그 끄기
  if (type === 'marketing') {
    logger.info({ userId }, 'marketing consent revoked — disable mailing list');
  }
}
