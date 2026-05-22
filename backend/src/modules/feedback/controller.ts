import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { FeedbackInput, create, listByRecommendation } from './service.js';

export async function postFeedback(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const dto = FeedbackInput.parse(req.body);
    const out = await create(req.user!.id, id, dto);
    res.status(201).json(out);
  } catch (e) { next(e); }
}

export async function getFeedbacks(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    res.json(await listByRecommendation(req.user!.id, id));
  } catch (e) { next(e); }
}
