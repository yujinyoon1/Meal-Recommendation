import type { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { corsOrigins } from '../config/env.js';

export function applySecurity(app: Express): void {
  app.use(helmet());

  app.use(
    cors({
      origin: (origin, cb) => {
        // 동일 출처(서버→서버) 또는 화이트리스트
        if (!origin) return cb(null, true);
        if (corsOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS blocked: ${origin}`));
      },
      credentials: true,
    }),
  );

  // 글로벌 rate limit 60/min/IP (recommendation은 별도 라우트에서 추가 제한)
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 60,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    }),
  );
}
