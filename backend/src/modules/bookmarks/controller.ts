import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { list, add, addByRecommendations, remove } from './service.js';

const RecipeIdParam = z.coerce.number().int().positive();
const AddBody = z.object({ recipe_id: z.coerce.number().int().positive() });
const AddByRecBody = z.object({
  recommendation_ids: z.array(z.coerce.number().int().positive()).min(1).max(100),
});

export async function getList(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ items: await list(req.user!.id) });
  } catch (e) { next(e); }
}

export async function postOne(req: Request, res: Response, next: NextFunction) {
  try {
    const { recipe_id } = AddBody.parse(req.body);
    await add(req.user!.id, recipe_id);
    res.status(201).json({ recipe_id, bookmarked: true });
  } catch (e) { next(e); }
}

export async function postByRecommendations(req: Request, res: Response, next: NextFunction) {
  try {
    const { recommendation_ids } = AddByRecBody.parse(req.body);
    const added = await addByRecommendations(req.user!.id, recommendation_ids);
    res.status(201).json({ added });
  } catch (e) { next(e); }
}

export async function deleteOne(req: Request, res: Response, next: NextFunction) {
  try {
    const recipeId = RecipeIdParam.parse(req.params.recipeId);
    await remove(req.user!.id, recipeId);
    res.status(204).end();
  } catch (e) { next(e); }
}
