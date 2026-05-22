import pino from 'pino';
import { pinoHttp } from 'pino-http';
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
      : undefined,
  base: { service: 'mis2601-backend' },
});

export const httpLogger = pinoHttp({
  logger,
  serializers: {
    req(req: { method: string; url: string; id?: string }) {
      return { method: req.method, url: req.url, id: req.id };
    },
  },
}) as unknown as RequestHandler;

export function childLogger(requestId: string) {
  return logger.child({ requestId });
}
