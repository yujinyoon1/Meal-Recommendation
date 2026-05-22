import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { AppError } from './errorHandler.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: number };
  }
}

export function authRequired(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (!m) return next(new AppError('UNAUTHENTICATED', 'Missing bearer token', 401));
  try {
    const payload = verifyAccessToken(m[1]);
    req.user = { id: Number(payload.sub) };
    return next();
  } catch {
    return next(new AppError('UNAUTHENTICATED', 'Invalid or expired token', 401));
  }
}
