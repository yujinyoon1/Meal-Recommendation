import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../../middleware/errorHandler.js';
import * as orchestrator from './orchestrator.js';

const RecommendBody = z.object({
  item_ids: z.array(z.coerce.number().int().positive()).max(100).optional(),
});

export async function postRecommend(req: Request, res: Response, next: NextFunction) {
  try {
    const { item_ids } = RecommendBody.parse(req.body ?? {});
    const result = await orchestrator.generate(req.user!.id, { itemIds: item_ids });
    res.status(201).json(result);
  } catch (e) { next(e); }
}

export async function getRecommendation(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const result = await orchestrator.loadResult(id);
    if (!result) throw new AppError('NOT_FOUND', 'recommendation not found', 404);
    res.json(result);
  } catch (e) { next(e); }
}
