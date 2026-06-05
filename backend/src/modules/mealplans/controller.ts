import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SaveInput, save, list, reuse } from './service.js';

export async function getList(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await list(req.user!.id));
  } catch (e) { next(e); }
}

export async function postSave(req: Request, res: Response, next: NextFunction) {
  try {
    const dto = SaveInput.parse(req.body);
    res.status(201).json(await save(req.user!.id, dto));
  } catch (e) { next(e); }
}

export async function postReuse(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    res.json(await reuse(req.user!.id, id));
  } catch (e) { next(e); }
}
