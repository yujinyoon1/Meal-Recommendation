import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(9534),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:9514,https://p14.sumzip.com'),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(13306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
  DB_POOL_LIMIT: z.coerce.number().int().positive().default(10),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  APP_ENCRYPTION_KEY: z.string().min(1), // base64 32 bytes

  LLM_PROVIDER: z.enum(['openai', 'mock']).default('mock'),
  LLM_MODEL: z.string().default('gpt-4o-mini'),
  LLM_API_KEY: z.string().optional(),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(25_000),
  LLM_RETRIES: z.coerce.number().int().min(0).default(1),

  REC_RATE_PER_HOUR: z.coerce.number().int().positive().default(5),
  REC_RATE_PER_DAY: z.coerce.number().int().positive().default(20),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  PUBLIC_DOMAIN: z.string().default('p14.sumzip.com'),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // env 검증 실패 시 부팅 차단
    // eslint-disable-next-line no-console
    console.error('[env] invalid configuration:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export const env: Env = load();

export const corsOrigins = env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
