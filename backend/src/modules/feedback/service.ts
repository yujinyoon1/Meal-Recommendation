import { z } from 'zod';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../../db/pool.js';
import { AppError } from '../../middleware/errorHandler.js';

export const FeedbackInput = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().nullable(),
});
export type FeedbackDto = z.infer<typeof FeedbackInput>;

interface FbRow extends RowDataPacket {
  id: number;
  recommendation_id: number;
  user_id: number;
  rating: number;
  comment: string | null;
  created_at: Date;
}

interface OwnerRow extends RowDataPacket {
  user_id: number;
}

export async function create(userId: number, recommendationId: number, dto: FeedbackDto) {
  // 본인 추천만 피드백 가능
  const [owners] = await pool.query<OwnerRow[]>(
    'SELECT user_id FROM recommendation_requests WHERE id = ? LIMIT 1',
    [recommendationId],
  );
  if (owners.length === 0) throw new AppError('NOT_FOUND', 'recommendation not found', 404);
  if (owners[0].user_id !== userId) throw new AppError('FORBIDDEN', 'not your recommendation', 403);

  const [res] = await pool.query<ResultSetHeader>(
    'INSERT INTO feedbacks (recommendation_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
    [recommendationId, userId, dto.rating, dto.comment ?? null],
  );
  return {
    id: res.insertId,
    recommendation_id: recommendationId,
    rating: dto.rating,
    comment: dto.comment ?? null,
    created_at: new Date(),
  };
}

export async function listByRecommendation(userId: number, recommendationId: number) {
  const [rows] = await pool.query<FbRow[]>(
    `SELECT id, recommendation_id, user_id, rating, comment, created_at
       FROM feedbacks
      WHERE recommendation_id = ? AND user_id = ?
      ORDER BY created_at DESC`,
    [recommendationId, userId],
  );
  return rows.map((r) => ({
    id: r.id,
    recommendation_id: r.recommendation_id,
    rating: r.rating,
    comment: r.comment,
    created_at: r.created_at,
  }));
}
