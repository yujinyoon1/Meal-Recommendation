import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../../middleware/errorHandler.js';
import { ListQuery, list, detailWithFeedback, remove } from './service.js';

export async function getList(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = ListQuery.parse(req.query);
    res.json(await list(req.user!.id, dto));
  } catch (e) { next(e); }
}

export async function getDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const out = await detailWithFeedback(req.user!.id, id);
    if (!out) throw new AppError('NOT_FOUND', 'recommendation not found', 404);
    res.json(out);
  } catch (e) { next(e); }
}

export async function deleteOne(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    await remove(req.user!.id, id);
    res.status(204).end();
  } catch (e) { next(e); }
}
