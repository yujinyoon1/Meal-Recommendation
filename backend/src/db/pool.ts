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
  timezone: 'Z',
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
