import { Router } from 'express';
import { authRequired } from '../../middleware/auth.js';
import * as ctrl from './controller.js';

const router = Router();
router.use(authRequired);

// GET    /api/bookmarks              — 저장한 레시피 목록 (최신순, 본문 포함)
// POST   /api/bookmarks              — 레시피 북마크 추가 { recipe_id }
// DELETE /api/bookmarks/:recipeId    — 북마크 제거
router.get('/bookmarks', ctrl.getList);
router.post('/bookmarks', ctrl.postOne);
// POST /api/bookmarks/recommendations — 선택한 추천들의 모든 레시피를 일괄 북마크 { recommendation_ids }
router.post('/bookmarks/recommendations', ctrl.postByRecommendations);
router.delete('/bookmarks/:recipeId', ctrl.deleteOne);

export default router;
