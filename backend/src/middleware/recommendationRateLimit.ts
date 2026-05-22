/**
 * 사용자당 추천 호출 rate limit.
 * - 시간당 env.REC_RATE_PER_HOUR
 * - 일일 env.REC_RATE_PER_DAY
 *
 * MVP: in-memory 카운터 (단일 인스턴스 가정). 다중 인스턴스 환경에서는 Redis로 교체.
 */
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { AppError } from './errorHandler.js';

interface Bucket {
  hour: { count: number; resetAt: number };
  day: { count: number; resetAt: number };
}

const buckets = new Map<number, Bucket>();

function getOrInit(userId: number, now: number): Bucket {
  let b = buckets.get(userId);
  if (!b) {
    b = {
      hour: { count: 0, resetAt: now + 60 * 60_000 },
      day: { count: 0, resetAt: now + 24 * 60 * 60_000 },
    };
    buckets.set(userId, b);
  }
  if (now >= b.hour.resetAt) { b.hour = { count: 0, resetAt: now + 60 * 60_000 }; }
  if (now >= b.day.resetAt)  { b.day  = { count: 0, resetAt: now + 24 * 60 * 60_000 }; }
  return b;
}

export function recommendationRateLimit(req: Request, _res: Response, next: NextFunction) {
  const userId = req.user?.id;
  if (!userId) return next(new AppError('UNAUTHENTICATED', 'auth required', 401));
  const now = Date.now();
  const b = getOrInit(userId, now);
  if (b.hour.count >= env.REC_RATE_PER_HOUR) {
    return next(new AppError(
      'RATE_LIMIT_HOUR',
      `hourly quota exceeded (${env.REC_RATE_PER_HOUR}/h)`,
      429,
      { retryAfterMs: b.hour.resetAt - now },
    ));
  }
  if (b.day.count >= env.REC_RATE_PER_DAY) {
    return next(new AppError(
      'RATE_LIMIT_DAY',
      `daily quota exceeded (${env.REC_RATE_PER_DAY}/d)`,
      429,
      { retryAfterMs: b.day.resetAt - now },
    ));
  }
  b.hour.count += 1;
  b.day.count += 1;
  next();
}
