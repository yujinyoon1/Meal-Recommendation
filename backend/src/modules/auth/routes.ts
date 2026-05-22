import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as ctrl from './controller.js';

const router = Router();

// 인증 시도는 IP 기준 강한 rate limit
const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

router.post('/register', authLimiter, ctrl.postRegister);
router.post('/login', authLimiter, ctrl.postLogin);
router.post('/refresh', ctrl.postRefresh);
router.post('/logout', ctrl.postLogout);

export default router;
