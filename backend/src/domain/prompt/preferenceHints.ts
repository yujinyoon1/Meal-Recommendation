/**
 * 최근 30일 부정 피드백(별점 ≤ 2) 추천의 레시피 ingredients_json 에서
 * 가장 자주 등장한 재료 / 카테고리를 상위 N개씩 추출.
 *
 *  - dislike_ingredients: 빈도 ≥ 2 회 또는 상위 5개
 *  - dislike_categories : foods.category 조인으로 매칭된 상위 3개
 *
 * 외부 의존성 없는 순수 쿼리 모듈 — orchestrator 가 호출.
 */
import type { RowDataPacket } from 'mysql2';
import { pool } from '../../db/pool.js';

interface IngredientRow extends RowDataPacket {
  ingredients_json: Array<{ name?: string }> | null;
}
interface CategoryRow extends RowDataPacket {
  category: string | null;
  cnt: number;
}

export interface PreferenceHints {
  dislike_ingredients: string[];
  dislike_categories: string[];
}

const WINDOW_DAYS = 30;
const TOP_INGREDIENTS = 5;
const TOP_CATEGORIES = 3;
const MIN_COUNT = 2;

export async function aggregateHints(userId: number): Promise<PreferenceHints> {
  // 부정 피드백 추천의 레시피 ingredients_json 모두 모아오기
  const [rows] = await pool.query<IngredientRow[]>(
    `SELECT r.ingredients_json
       FROM feedbacks fb
       JOIN recommendation_requests rr ON rr.id = fb.recommendation_id
       JOIN meal_plans mp ON mp.recommendation_id = rr.id
       JOIN meal_plan_recipes mpr ON mpr.meal_plan_id = mp.id
       JOIN recipes r ON r.id = mpr.recipe_id
      WHERE fb.user_id = ?
        AND fb.rating <= 2
        AND fb.created_at > DATE_SUB(NOW(), INTERVAL ${WINDOW_DAYS} DAY)`,
    [userId],
  );

  const counts = new Map<string, number>();
  for (const r of rows) {
    const arr = Array.isArray(r.ingredients_json) ? r.ingredients_json : [];
    for (const ing of arr) {
      const name = (ing?.name ?? '').toString().trim();
      if (!name) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  const dislike_ingredients = Array.from(counts.entries())
    .filter(([, n]) => n >= MIN_COUNT)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_INGREDIENTS)
    .map(([name]) => name);

  // 위에서 뽑힌 재료들을 foods.name_ko 로 매칭하여 카테고리 집계
  let dislike_categories: string[] = [];
  if (dislike_ingredients.length > 0) {
    const [cats] = await pool.query<CategoryRow[]>(
      `SELECT f.category, COUNT(*) AS cnt
         FROM foods f
         JOIN ingredient_alias a ON a.food_id = f.id
        WHERE a.alias IN (${dislike_ingredients.map(() => '?').join(',')})
           OR f.name_ko IN (${dislike_ingredients.map(() => '?').join(',')})
        GROUP BY f.category
        ORDER BY cnt DESC
        LIMIT ?`,
      [...dislike_ingredients, ...dislike_ingredients, TOP_CATEGORIES],
    );
    dislike_categories = cats.map((r) => r.category).filter((c): c is string => !!c);
  }

  return { dislike_ingredients, dislike_categories };
}
