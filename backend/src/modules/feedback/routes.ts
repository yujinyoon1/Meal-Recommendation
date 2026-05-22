import { Router } from 'express';
import { authRequired } from '../../middleware/auth.js';
import * as ctrl from './controller.js';

const router = Router();
router.use(authRequired);
router.post('/recommendations/:id/feedback', ctrl.postFeedback);
router.get('/recommendations/:id/feedbacks', ctrl.getFeedbacks);

export default router;
