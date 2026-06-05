import { Router } from 'express';
import { authRequired } from '../../middleware/auth.js';
import * as ctrl from './controller.js';

const router = Router();
router.use(authRequired);

// 002 FR-030~034 — 건강 기록·리포트·캘린더
router.get('/health/logs', ctrl.listLogs);
router.post('/health/logs', ctrl.postLog);
router.get('/health/report', ctrl.report);
router.get('/history/calendar', ctrl.calendar);

export default router;
