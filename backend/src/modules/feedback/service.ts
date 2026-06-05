import { z } from 'zod';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../../db/pool.js';
import { AppError } from '../../middleware/errorHandler.js';
import { recomputeWeights } from '../preferences/service.js';
import { logger } from '../../utils/logger.js';

export const FeedbackInput = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().nullable(),
});
export type FeedbackDto = z.infer<typeof FeedbackInput>;

// 002 FR-002 — 추천 수정 이력(구조화). 학습 신호로 사용.
export const EditInput = z.object({
  action: z.enum(['replace', 'exclude', 'substitute']),
  target_type: z.enum(['recipe', 'ingredient', 'menu']),
  target_ref: z.string().min(1).max(120),
  replacement_ref: z.string().max(120).optional().nullable(),
});
export const EditsInput = z.array(EditInput).min(1).max(50);
export type EditDto = z.infer<typeof EditInput>;

/** 선호 가중치 재계산을 비동기로 트리거(실패해도 본 흐름은 막지 않음). */
function triggerRecompute(userId: number) {
  recomputeWeights(userId).catch((e) => logger.warn({ err: e, userId }, 'recomputeWeights failed'));
}

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
  triggerRecompute(userId); // FR-001 학습 루프
  return {
    id: res.insertId,
    recommendation_id: recommendationId,
    rating: dto.rating,
    comment: dto.comment ?? null,
    created_at: new Date(),
  };
}

/**
 * 002 FR-002 — 추천 수정 이력 기록 + 선호 가중치 재계산.
 * 본인 추천만 허용.
 */
export async function recordEdits(userId: number, recommendationId: number, edits: EditDto[]) {
  const [owners] = await pool.query<OwnerRow[]>(
    'SELECT user_id FROM recommendation_requests WHERE id = ? LIMIT 1',
    [recommendationId],
  );
  if (owners.length === 0) throw new AppError('NOT_FOUND', 'recommendation not found', 404);
  if (owners[0].user_id !== userId) throw new AppError('FORBIDDEN', 'not your recommendation', 403);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const e of edits) {
      await conn.query<ResultSetHeader>(
        `INSERT INTO recommendation_edits
           (recommendation_id, user_id, action, target_type, target_ref, replacement_ref)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [recommendationId, userId, e.action, e.target_type, e.target_ref, e.replacement_ref ?? null],
      );
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  triggerRecompute(userId); // FR-001 학습 루프
  return { recorded: edits.length };
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
