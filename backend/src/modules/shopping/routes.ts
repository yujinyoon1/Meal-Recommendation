import { Router } from 'express';
import { authRequired } from '../../middleware/auth.js';
import * as ctrl from './controller.js';

const router = Router();
router.use(authRequired);
router.get('/recommendations/:id/shopping-list', ctrl.getShoppingList);

export default router;
