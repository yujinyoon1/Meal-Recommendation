import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../../middleware/errorHandler.js';
import * as orchestrator from './orchestrator.js';

export async function postRecommend(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await orchestrator.generate(req.user!.id);
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
