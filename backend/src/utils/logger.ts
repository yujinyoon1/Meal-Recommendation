import pino from 'pino';
import pinoHttp from 'pino-http';
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
  customProps: (req) => ({ requestId: (req as { id?: string }).id }),
  serializers: {
    req(req) {
      return { method: req.method, url: req.url, id: req.id };
    },
  },
});

export function childLogger(requestId: string) {
  return logger.child({ requestId });
}
