import { createHash } from 'node:crypto';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../../db/pool.js';

const TTL_MS = 30 * 60 * 1000; // 30분

export function cacheKey(userId: number, normalizedInventory: string[], profileVersion: string): string {
  const payload = [String(userId), profileVersion, ...normalizedInventory.slice().sort()].join('|');
  return createHash('sha256').update(payload).digest('hex');
}

interface CacheRow extends RowDataPacket {
  recommendation_id: number;
}

export async function lookup(key: string): Promise<number | null> {
  const [rows] = await pool.query<CacheRow[]>(
    'SELECT recommendation_id FROM recommendation_cache WHERE cache_key = ? AND expires_at > NOW() LIMIT 1',
    [key],
  );
  return rows[0]?.recommendation_id ?? null;
}

export async function store(key: string, recommendationId: number): Promise<void> {
  await pool.query(
    `INSERT INTO recommendation_cache (cache_key, recommendation_id, expires_at)
     VALUES (?, ?, FROM_UNIXTIME(?))
     ON DUPLICATE KEY UPDATE recommendation_id = VALUES(recommendation_id), expires_at = VALUES(expires_at)`,
    [key, recommendationId, Math.floor((Date.now() + TTL_MS) / 1000)],
  );
}
