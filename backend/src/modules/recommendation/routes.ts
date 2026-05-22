import { Router } from 'express';
import { authRequired } from '../../middleware/auth.js';
import { recommendationRateLimit } from '../../middleware/recommendationRateLimit.js';
import * as ctrl from './controller.js';

const router = Router();

router.use(authRequired);
router.post('/recommendations', recommendationRateLimit, ctrl.postRecommend);
router.get('/recommendations/:id', ctrl.getRecommendation);

export default router;
