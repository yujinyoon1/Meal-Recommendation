import mysql, { Pool } from 'mysql2/promise';
import { env } from '../config/env.js';

export const pool: Pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: env.DB_POOL_LIMIT,
  charset: 'utf8mb4',
  // DB 세션 time_zone 이 +09:00(KST) 이라 반환 문자열도 KST 기준.
  // 'Z'(UTC)로 두면 mysql2 가 KST 문자열을 UTC 로 오해해 9시간 어긋남 → 맞춰준다.
  timezone: '+09:00',
  dateStrings: false,
  supportBigNumbers: true,
  bigNumberStrings: false,
  multipleStatements: false,
});

export async function ping(): Promise<boolean> {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    return true;
  } finally {
    conn.release();
  }
}
