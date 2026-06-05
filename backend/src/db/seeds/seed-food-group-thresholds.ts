/**
 * 002 — 식품군별 유통기한 임박 임계(일) 시드. (research R-2)
 * 안전 idempotent (ON DUPLICATE KEY UPDATE).
 */
import 'dotenv/config';
import { pool } from '../pool.js';

const THRESHOLDS: Array<{ group: string; days: number }> = [
  { group: '채소', days: 2 },
  { group: '과일', days: 3 },
  { group: '육류', days: 3 },
  { group: '수산물', days: 2 },
  { group: '유제품', days: 5 },
  { group: '가공·냉동', days: 7 },
  { group: '기타', days: 3 },
];

async function main() {
  for (const t of THRESHOLDS) {
    await pool.query(
      `INSERT INTO food_group_expiry_thresholds (food_group, imminent_days)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE imminent_days = VALUES(imminent_days)`,
      [t.group, t.days],
    );
  }
  // eslint-disable-next-line no-console
  console.log(`seeded ${THRESHOLDS.length} food-group expiry thresholds`);
  await pool.end();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
