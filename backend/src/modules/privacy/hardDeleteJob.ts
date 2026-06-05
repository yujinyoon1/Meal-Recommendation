/**
 * 30일 경과 탈퇴 사용자 hard-delete cron 작업.
 * - tsx src/modules/privacy/hardDeleteJob.ts
 * - 프로덕션: 일 1회 (예: 03:00 UTC) OS cron 또는 GitLab scheduled pipeline.
 *
 * 대상: users.status='withdrawn' AND deleted_at < NOW() - INTERVAL 30 DAY
 * 삭제 순서(FK 의존):
 *   feedbacks → shopping_list_items → nutrition_analyses → meal_plan_recipes → meal_plans
 *     → recipes (참조 정리 후 직접 삭제 안 함 — recipe 는 공유 가능하므로 유지)
 *   recommendation_cache → recommendation_requests
 *   ingredient_items → diet_preferences → health_profiles → basic_profiles → consent_records
 *   → users
 *
 * audit_logs 는 actor/target FK 가 ON DELETE SET NULL 이므로 자동 유지.
 */
import 'dotenv/config';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../../db/pool.js';
import { logger } from '../../utils/logger.js';

interface TargetRow extends RowDataPacket {
  id: number;
  email: string;
  deleted_at: Date;
}

export async function runHardDelete(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [targets] = await pool.query<TargetRow[]>(
    `SELECT id, email, deleted_at FROM users
      WHERE status = 'withdrawn' AND deleted_at IS NOT NULL AND deleted_at < ?`,
    [cutoff],
  );

  let purged = 0;
  for (const u of targets) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 추천 산출물 (recipes 자체는 공유 가능성 있어 보존)
      await conn.query(
        `DELETE fb FROM feedbacks fb WHERE fb.user_id = ?`,
        [u.id],
      );
      await conn.query(
        `DELETE sli FROM shopping_list_items sli
           JOIN recommendation_requests rr ON rr.id = sli.recommendation_id
          WHERE rr.user_id = ?`,
        [u.id],
      );
      await conn.query(
        `DELETE na FROM nutrition_analyses na
           JOIN recommendation_requests rr ON rr.id = na.recommendation_id
          WHERE rr.user_id = ?`,
        [u.id],
      );
      await conn.query(
        `DELETE mpr FROM meal_plan_recipes mpr
           JOIN meal_plans mp ON mp.id = mpr.meal_plan_id
           JOIN recommendation_requests rr ON rr.id = mp.recommendation_id
          WHERE rr.user_id = ?`,
        [u.id],
      );
      await conn.query(
        `DELETE mp FROM meal_plans mp
           JOIN recommendation_requests rr ON rr.id = mp.recommendation_id
          WHERE rr.user_id = ?`,
        [u.id],
      );
      await conn.query(
        `DELETE rc FROM recommendation_cache rc
           JOIN recommendation_requests rr ON rr.id = rc.recommendation_id
          WHERE rr.user_id = ?`,
        [u.id],
      );
      // 002 — 추천 수정 이력(recommendation_edits.fk_re_user 는 RESTRICT) 은 추천 삭제 전 정리
      await conn.query(
        `DELETE re FROM recommendation_edits re
           JOIN recommendation_requests rr ON rr.id = re.recommendation_id
          WHERE rr.user_id = ?`,
        [u.id],
      );
      await conn.query('DELETE FROM recommendation_requests WHERE user_id = ?', [u.id]);
      // 002 — 사용자 소유 데이터 (대부분 FK CASCADE 이나 명시적으로 정리)
      await conn.query('DELETE FROM user_preference_weights WHERE user_id = ?', [u.id]);
      await conn.query('DELETE FROM consumption_records WHERE user_id = ?', [u.id]);
      await conn.query('DELETE FROM saved_meal_plans WHERE user_id = ?', [u.id]);
      await conn.query('DELETE FROM health_logs WHERE user_id = ?', [u.id]);
      await conn.query('DELETE FROM health_reports WHERE user_id = ?', [u.id]);
      await conn.query('DELETE FROM ingredient_items WHERE user_id = ?', [u.id]);
      await conn.query('DELETE FROM diet_preferences WHERE user_id = ?', [u.id]);
      await conn.query('DELETE FROM health_profiles WHERE user_id = ?', [u.id]);
      await conn.query('DELETE FROM basic_profiles WHERE user_id = ?', [u.id]);
      // consent_records 는 법적 입증 목적으로 5년 보관 — 사용자 hard-delete 시에도 보존하고 user_id 만 NULL 처리
      // 그러나 FK NOT NULL 이므로 우선 삭제. 법무 요구에 따라 별도 archive 테이블로 이관 가능.
      await conn.query('DELETE FROM consent_records WHERE user_id = ?', [u.id]);

      // 감사 로그 (시스템 액션)
      await conn.query(
        `INSERT INTO audit_logs (actor_user_id, action, target_user_id, metadata_json)
         VALUES (NULL, 'user.hard_delete', NULL, JSON_OBJECT('email', ?, 'withdrew_at', ?))`,
        [u.email, u.deleted_at],
      );

      await conn.query('DELETE FROM users WHERE id = ?', [u.id]);

      await conn.commit();
      purged += 1;
      logger.info({ userId: u.id, email: u.email }, 'hard-deleted user');
    } catch (e) {
      await conn.rollback();
      logger.error({ err: e, userId: u.id }, 'hard-delete failed');
    } finally {
      conn.release();
    }
  }
  return purged;
}

// CLI 진입점
if (import.meta.url === `file://${process.argv[1]}`) {
  runHardDelete()
    .then((n) => {
      logger.info({ purged: n }, 'hard-delete job completed');
      return pool.end();
    })
    .then(() => process.exit(0))
    .catch((e) => {
      logger.error({ err: e }, 'hard-delete job failed');
      process.exit(1);
    });
}
