import { z } from 'zod';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../../db/pool.js';
import { loadResult } from '../recommendation/orchestrator.js';

export const ListQuery = z.object({
  cursor: z.string().optional(),       // base64("<request_at_ms>|<id>")
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListQueryDto = z.infer<typeof ListQuery>;

interface HistRow extends RowDataPacket {
  id: number;
  request_at: Date;
  status: 'pending' | 'generated' | 'validated' | 'rejected' | 'failed';
  total_kcal: string | null;
  rating: number | null;
}

function encodeCursor(requestAt: Date, id: number): string {
  return Buffer.from(`${requestAt.getTime()}|${id}`, 'utf-8').toString('base64url');
}
function decodeCursor(c: string | undefined): { ts: number; id: number } | null {
  if (!c) return null;
  try {
    const s = Buffer.from(c, 'base64url').toString('utf-8');
    const [ts, id] = s.split('|').map(Number);
    if (!Number.isFinite(ts) || !Number.isFinite(id)) return null;
    return { ts, id };
  } catch { return null; }
}

export async function list(userId: number, dto: ListQueryDto) {
  const cur = decodeCursor(dto.cursor);
  const where = ['rr.user_id = ?'];
  const args: unknown[] = [userId];
  if (cur) {
    // (request_at, id) tuple 기반 keyset pagination
    where.push('(rr.request_at < FROM_UNIXTIME(? / 1000) OR (rr.request_at = FROM_UNIXTIME(? / 1000) AND rr.id < ?))');
    args.push(cur.ts, cur.ts, cur.id);
  }
  args.push(dto.limit + 1); // peek for next-cursor

  const [rows] = await pool.query<HistRow[]>(
    `SELECT rr.id, rr.request_at, rr.status,
            na.total_kcal,
            (SELECT MAX(rating) FROM feedbacks fb WHERE fb.recommendation_id = rr.id) AS rating
       FROM recommendation_requests rr
       LEFT JOIN nutrition_analyses na ON na.recommendation_id = rr.id
      WHERE ${where.join(' AND ')}
      ORDER BY rr.request_at DESC, rr.id DESC
      LIMIT ?`,
    args,
  );

  const hasMore = rows.length > dto.limit;
  const page = hasMore ? rows.slice(0, dto.limit) : rows;
  const last = page[page.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(last.request_at, last.id) : null;

  return {
    items: page.map((r) => ({
      id: r.id,
      request_at: r.request_at,
      status: r.status,
      total_kcal: r.total_kcal == null ? null : Number(r.total_kcal),
      rating: r.rating,
    })),
    next_cursor: nextCursor,
  };
}

interface OwnerRow extends RowDataPacket {
  user_id: number;
}

export async function detailWithFeedback(userId: number, recommendationId: number) {
  const [owners] = await pool.query<OwnerRow[]>(
    'SELECT user_id FROM recommendation_requests WHERE id = ? LIMIT 1',
    [recommendationId],
  );
  if (owners.length === 0 || owners[0].user_id !== userId) return null;

  const result = await loadResult(recommendationId);
  if (!result) return null;

  const [fb] = await pool.query<RowDataPacket[]>(
    'SELECT id, rating, comment, created_at FROM feedbacks WHERE recommendation_id = ? ORDER BY created_at DESC',
    [recommendationId],
  );
  return { ...result, feedbacks: fb };
}
