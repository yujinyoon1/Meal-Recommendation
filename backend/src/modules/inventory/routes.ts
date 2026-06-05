import { Router } from 'express';
import { authRequired } from '../../middleware/auth.js';
import * as ctrl from './controller.js';

const router = Router();

router.use(authRequired);
router.get('/inventory/items', ctrl.listItems);
router.get('/inventory/expiring', ctrl.getExpiring); // 002 FR-011
router.post('/inventory/items', ctrl.postBulk);
router.patch('/inventory/items/:id/expiry', ctrl.patchExpiry); // 002 FR-010 (구체 경로 우선)
router.patch('/inventory/items/:id', ctrl.patchItem);
router.delete('/inventory/items/:id', ctrl.deleteItem);

export default router;
