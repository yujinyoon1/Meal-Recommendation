import { Router } from 'express';
import { authRequired } from '../../middleware/auth.js';
import * as ctrl from './controller.js';

const router = Router();
router.use(authRequired);

// 002 FR-020/021 — 식단 저장·재사용
router.get('/meal-plans', ctrl.getList);
router.post('/meal-plans', ctrl.postSave);
router.post('/meal-plans/:id/reuse', ctrl.postReuse);

export default router;
