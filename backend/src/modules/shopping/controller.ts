import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { listOrGenerate } from './service.js';

export async function getShoppingList(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    res.json(await listOrGenerate(req.user!.id, id));
  } catch (e) { next(e); }
}
