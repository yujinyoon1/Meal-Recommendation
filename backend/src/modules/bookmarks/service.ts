import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../../db/pool.js';
import { AppError } from '../../middleware/errorHandler.js';

interface BookmarkRow extends RowDataPacket {
  recipe_id: number;
  created_at: Date;
  name: string;
  description: string | null;
  ingredients_json: Array<{ name: string; quantity: number; unit: string; substitute?: string }>;
  steps_json: string[];
  est_cooking_min: number | null;
  difficulty: 'easy' | 'medium' | 'hard';
}

function parseJson<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v === 'string') {
    try { return JSON.parse(v) as T; } catch { return fallback; }
  }
  return v as T;
}

/** 사용자가 저장한 레시피 목록 — 최신 저장순. 레시피 본문 포함(저장 페이지에서 바로 렌더). */
export async function list(userId: number) {
  const [rows] = await pool.query<BookmarkRow[]>(
    `SELECT rb.recipe_id, rb.created_at,
            r.name, r.description, r.ingredients_json, r.steps_json, r.est_cooking_min, r.difficulty
       FROM recipe_bookmarks rb
       JOIN recipes r ON r.id = rb.recipe_id
      WHERE rb.user_id = ?
      ORDER BY rb.created_at DESC, rb.recipe_id DESC`,
    [userId],
  );
  return rows.map((r) => ({
    id: r.recipe_id,
    bookmarked_at: r.created_at,
    name: r.name,
    description: r.description ?? undefined,
    ingredients: parseJson(r.ingredients_json, [] as BookmarkRow['ingredients_json']),
    steps: parseJson(r.steps_json, [] as string[]),
    est_cooking_min: r.est_cooking_min ?? 0,
    difficulty: r.difficulty,
  }));
}

interface OwnerRow extends RowDataPacket { user_id: number }

/** recipe_id 가 이 사용자 소유의 추천에 속하는지 검증 — 남의 레시피 북마크 방지. */
async function assertOwnsRecipe(userId: number, recipeId: number): Promise<void> {
  const [rows] = await pool.query<OwnerRow[]>(
    `SELECT rr.user_id
       FROM recipes r
       JOIN meal_plan_recipes mpr ON mpr.recipe_id = r.id
       JOIN meal_plans mp ON mp.id = mpr.meal_plan_id
       JOIN recommendation_requests rr ON rr.id = mp.recommendation_id
      WHERE r.id = ? LIMIT 1`,
    [recipeId],
  );
  if (rows.length === 0) throw new AppError('NOT_FOUND', 'recipe not found', 404);
  if (rows[0].user_id !== userId) throw new AppError('FORBIDDEN', 'not your recipe', 403);
}

/** 북마크 추가 (멱등 — 이미 있으면 무시). */
export async function add(userId: number, recipeId: number): Promise<void> {
  await assertOwnsRecipe(userId, recipeId);
  await pool.query<ResultSetHeader>(
    'INSERT IGNORE INTO recipe_bookmarks (user_id, recipe_id) VALUES (?, ?)',
    [userId, recipeId],
  );
}

/**
 * 추천(recommendation) 여러 건을 선택해 그에 속한 모든 레시피를 한 번에 북마크.
 * 본인 소유의 추천만 반영(WHERE rr.user_id), INSERT IGNORE 로 멱등.
 * @returns 실제로 새로 추가된 북마크 수
 */
export async function addByRecommendations(userId: number, recommendationIds: number[]): Promise<number> {
  if (recommendationIds.length === 0) return 0;
  const [res] = await pool.query<ResultSetHeader>(
    `INSERT IGNORE INTO recipe_bookmarks (user_id, recipe_id)
       SELECT rr.user_id, mpr.recipe_id
         FROM recommendation_requests rr
         JOIN meal_plans mp ON mp.recommendation_id = rr.id
         JOIN meal_plan_recipes mpr ON mpr.meal_plan_id = mp.id
        WHERE rr.user_id = ? AND rr.id IN (?)`,
    [userId, recommendationIds],
  );
  return res.affectedRows;
}

/** 북마크 제거 (멱등). */
export async function remove(userId: number, recipeId: number): Promise<void> {
  await pool.query<ResultSetHeader>(
    'DELETE FROM recipe_bookmarks WHERE user_id = ? AND recipe_id = ?',
    [userId, recipeId],
  );
}
