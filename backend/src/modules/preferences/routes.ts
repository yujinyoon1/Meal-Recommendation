import { Router } from 'express';
import { authRequired } from '../../middleware/auth.js';
import * as ctrl from './controller.js';

const router = Router();
router.use(authRequired);

// GET /api/preferences/weights — 학습된 선호 가중치 조회 (FR-003)
router.get('/preferences/weights', ctrl.getPreferenceWeights);

export default router;
