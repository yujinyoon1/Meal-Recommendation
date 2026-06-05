import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { FeedbackInput, EditsInput, create, listByRecommendation, recordEdits } from './service.js';

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

// 002 FR-002 — POST /api/recommendations/:id/edits
export async function postEdits(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const edits = EditsInput.parse(req.body);
    const out = await recordEdits(req.user!.id, id, edits);
    res.status(201).json(out);
  } catch (e) { next(e); }
}
