import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header('x-request-id');
  const id = incoming && /^[A-Za-z0-9-_]{8,128}$/.test(incoming) ? incoming : randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}
