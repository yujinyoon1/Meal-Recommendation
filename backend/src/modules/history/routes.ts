import { Router } from 'express';
import { authRequired } from '../../middleware/auth.js';
import * as ctrl from './controller.js';

const router = Router();
router.use(authRequired);

// GET /api/recommendations           — 이력 목록 (커서)
// GET /api/recommendations/:id/full  — 피드백 포함 상세 (기본 :id 는 recommendation 라우터 사용)
router.get('/recommendations', ctrl.getList);
router.get('/recommendations/:id/full', ctrl.getDetail);

export default router;
