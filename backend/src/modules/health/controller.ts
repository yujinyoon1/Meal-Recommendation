import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { HealthLogInput, upsertLog, getLogs, getReport, getCalendar } from './service.js';

const DateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();

export async function postLog(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = HealthLogInput.parse(req.body);
    res.status(201).json(await upsertLog(req.user!.id, dto));
  } catch (e) { next(e); }
}

export async function listLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const from = DateStr.parse(req.query.from);
    const to = DateStr.parse(req.query.to);
    res.json(await getLogs(req.user!.id, from, to));
  } catch (e) { next(e); }
}

export async function report(req: Request, res: Response, next: NextFunction) {
  try {
    const period = z.enum(['week', 'month']).default('week').parse(req.query.period);
    res.json(await getReport(req.user!.id, period));
  } catch (e) { next(e); }
}

export async function calendar(req: Request, res: Response, next: NextFunction) {
  try {
    const month = z.string().regex(/^\d{4}-\d{2}$/).parse(req.query.month);
    res.json(await getCalendar(req.user!.id, month));
  } catch (e) { next(e); }
}
