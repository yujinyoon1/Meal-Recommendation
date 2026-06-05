import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as service from './service.js';

export async function listItems(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.list(req.user!.id));
  } catch (e) { next(e); }
}

export async function postBulk(req: Request, res: Response, next: NextFunction) {
  try {
    const { text } = service.BulkCreateInput.parse(req.body);
    const items = await service.bulkCreateFromText(req.user!.id, text);
    res.status(201).json({ items });
  } catch (e) { next(e); }
}

export async function patchItem(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const dto = service.PatchInput.parse(req.body);
    res.json(await service.patch(req.user!.id, id, dto));
  } catch (e) { next(e); }
}

// 002 FR-011 — GET /api/inventory/expiring
export async function getExpiring(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.getExpiring(req.user!.id));
  } catch (e) { next(e); }
}

// 002 FR-010 — PATCH /api/inventory/items/:id/expiry
export async function patchExpiry(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const dto = service.ExpiryPatchInput.parse(req.body);
    res.json(await service.updateExpiry(req.user!.id, id, dto));
  } catch (e) { next(e); }
}

export async function deleteItem(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    await service.remove(req.user!.id, id);
    res.status(204).end();
  } catch (e) { next(e); }
}
