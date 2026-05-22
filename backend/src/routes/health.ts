import { Router } from 'express';
import { ping } from '../db/pool.js';
import { getLlm } from '../adapters/llm/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.get('/live', (_req, res) => {
  res.json({ status: 'ok' });
});

router.get('/ready', async (_req, res) => {
  const checks: Record<string, 'ok' | 'fail'> = {};
  try {
    await ping();
    checks.db = 'ok';
  } catch (e) {
    logger.warn({ err: e }, '/health/ready db fail');
    checks.db = 'fail';
  }
  try {
    // Mock 어댑터 호출로 어댑터 팩토리 동작만 확인
    const llm = getLlm();
    await llm.complete([{ role: 'user', content: 'ping' }], { timeoutMs: 1500, healthCheck: true });
    checks.llm = 'ok';
  } catch (e) {
    logger.warn({ err: e }, '/health/ready llm fail');
    checks.llm = 'fail';
  }
  const overall = Object.values(checks).every((v) => v === 'ok') ? 200 : 503;
  res.status(overall).json({ status: overall === 200 ? 'ready' : 'degraded', checks });
});

export default router;
