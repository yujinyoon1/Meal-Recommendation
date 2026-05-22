import 'dotenv/config';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

// Backend dev port: 9534 (Intent: p14.sumzip.com 도메인은 Nginx 종단에서 /api → :9534)
const app = createApp();
const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'backend listening');
});

const shutdown = (signal: string) => {
  logger.info({ signal }, 'shutting down');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
