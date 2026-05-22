import { Router } from 'express';
import { authRequired } from '../../middleware/auth.js';
import * as ctrl from './controller.js';

const router = Router();

router.use(authRequired);
router.get('/inventory/items', ctrl.listItems);
router.post('/inventory/items', ctrl.postBulk);
router.patch('/inventory/items/:id', ctrl.patchItem);
router.delete('/inventory/items/:id', ctrl.deleteItem);

export default router;
