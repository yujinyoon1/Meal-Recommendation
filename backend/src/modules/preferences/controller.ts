import { Request, Response, NextFunction } from 'express';
import { getWeights } from './service.js';

/** GET /api/preferences/weights — 현재 선호 가중치 + 콜드스타트 여부 (FR-003/004). */
export async function getPreferenceWeights(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getWeights(req.user!.id));
  } catch (e) {
    next(e);
  }
}
