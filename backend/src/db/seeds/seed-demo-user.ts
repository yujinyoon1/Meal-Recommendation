/**
 * 데모 로그인 계정 시드.
 *  - email:    demo@p14.sumzip.com
 *  - password: Demo1234!
 *
 * 멱등(idempotent): 이미 존재하면 비밀번호/표시이름/동의 기록을 최신화하고
 * 기본 프로필·식단 선호도가 비어있을 때만 채워 넣습니다.
 *
 * 실행: npm run seed:demo
 *
 * 주의:
 *  - 운영(production) DB에서는 절대 실행하지 마세요. NODE_ENV !== 'production' 가드를 둡니다.
 *  - 민감(health) 프로필은 시드하지 않음 — 알레르기/질병 없는 신선한 데모 사용자.
 */
import 'dotenv/config';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../pool.js';
import { hashPassword } from '../../utils/password.js';

const DEMO_EMAIL = 'demo@p14.sumzip.com';
const DEMO_PASSWORD = 'Demo1234!';
const DEMO_DISPLAY_NAME = '데모 사용자';

interface UserRow extends RowDataPacket {
  id: number;
}
interface CountRow extends RowDataPacket {
  c: number;
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.error('[seed-demo-user] NODE_ENV=production 에서는 실행 금지');
    process.exit(1);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const hash = await hashPassword(DEMO_PASSWORD);

    // 1) 사용자 upsert
    const [existing] = await conn.query<UserRow[]>(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [DEMO_EMAIL],
    );

    let userId: number;
    if (existing.length > 0) {
      userId = existing[0].id;
      await conn.query(
        `UPDATE users
            SET password_hash = ?,
                display_name  = ?,
                status        = 'active',
                deleted_at    = NULL
          WHERE id = ?`,
        [hash, DEMO_DISPLAY_NAME, userId],
      );
      // eslint-disable-next-line no-console
      console.log(`[seed-demo-user] 기존 사용자 갱신 (id=${userId})`);
    } else {
      const [r] = await conn.query<ResultSetHeader>(
        'INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)',
        [DEMO_EMAIL, hash, DEMO_DISPLAY_NAME],
      );
      userId = r.insertId;
      // eslint-disable-next-line no-console
      console.log(`[seed-demo-user] 신규 사용자 생성 (id=${userId})`);
    }

    // 2) 필수 동의 (terms, privacy) — 기록이 없으면 추가
    for (const type of ['terms', 'privacy'] as const) {
      const [rows] = await conn.query<CountRow[]>(
        `SELECT COUNT(*) AS c
           FROM consent_records
          WHERE user_id = ? AND consent_type = ? AND granted = TRUE AND revoked_at IS NULL`,
        [userId, type],
      );
      if ((rows[0]?.c ?? 0) === 0) {
        await conn.query(
          'INSERT INTO consent_records (user_id, consent_type, granted) VALUES (?, ?, TRUE)',
          [userId, type],
        );
      }
    }

    // 3) 기본 프로필 — 비어있으면 1회 채우기 (30세 남성 / 175cm / 70kg)
    const [bpRows] = await conn.query<CountRow[]>(
      'SELECT COUNT(*) AS c FROM basic_profiles WHERE user_id = ?',
      [userId],
    );
    if ((bpRows[0]?.c ?? 0) === 0) {
      await conn.query(
        `INSERT INTO basic_profiles (user_id, age, gender, height_cm, weight_kg)
         VALUES (?, 30, 'male', 175.0, 70.0)`,
        [userId],
      );
    }

    // 4) 식단 선호도 — 비어있으면 1회 채우기 (하루 3끼 / 외식 2회 / 배달 1회 / 30분)
    const [dpRows] = await conn.query<CountRow[]>(
      'SELECT COUNT(*) AS c FROM diet_preferences WHERE user_id = ?',
      [userId],
    );
    if ((dpRows[0]?.c ?? 0) === 0) {
      await conn.query(
        `INSERT INTO diet_preferences
           (user_id, meals_per_day, dining_out_per_week, delivery_per_week,
            avoid_ingredients_json, prefer_categories_json, cooking_time_max_min)
         VALUES (?, 3, 2, 1, JSON_ARRAY(), JSON_ARRAY('한식','샐러드'), 30)`,
        [userId],
      );
    }

    await conn.commit();

    // eslint-disable-next-line no-console
    console.log('');
    // eslint-disable-next-line no-console
    console.log('================ 데모 로그인 계정 ================');
    // eslint-disable-next-line no-console
    console.log(`  Email    : ${DEMO_EMAIL}`);
    // eslint-disable-next-line no-console
    console.log(`  Password : ${DEMO_PASSWORD}`);
    // eslint-disable-next-line no-console
    console.log('==================================================');
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('[seed-demo-user] failed:', e);
  process.exit(1);
});
