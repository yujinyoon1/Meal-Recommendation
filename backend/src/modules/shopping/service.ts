import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../../db/pool.js';
import { AppError } from '../../middleware/errorHandler.js';
import { lookupFood } from '../../adapters/nutrition/foodLookup.js';
import { computeGap, type NutritionSnapshot, type ShoppingCandidate } from './gapCalculator.js';
import { rankShoppingItems } from '../../domain/shopping/priorityRanker.js';

interface OwnerRow extends RowDataPacket { user_id: number }
interface NutRow extends RowDataPacket {
  total_kcal: string | null;
  protein_g: string | null;
  fiber_g: string | null;
  sodium_mg: string | null;
  rda_ratio_json: { calories: number; protein: number; fiber: number; sodium: number } | null;
}
interface ItemRow extends RowDataPacket {
  id: number;
  food_id: number | null;
  name: string;
  category: string | null;
  reason: string | null;
  suggested_qty: string | null;
  priority_score: number;
}

export interface ShoppingListResponse {
  recommendation_id: number;
  generated: boolean;
  warnings: string[];
  items: Array<{
    id: number;
    food_id: number | null;
    name: string;
    category: string | null;
    reason: string;
    suggested_qty: string;
    priority_score: number;
  }>;
  // 레시피에 필요하지만 현재 재고에 없는 재료 (매 호출 시 현재 재고 기준으로 새로 계산, 저장하지 않음).
  missing_ingredients: Array<{ name: string; suggested_qty: string }>;
}

interface RecipeIngredient { name?: string; quantity?: number | string | null; unit?: string | null }
interface IngredientsRow extends RowDataPacket { ingredients_json: RecipeIngredient[] | string | null }
interface InvRow extends RowDataPacket { food_id: number | null; raw_text: string | null; name_ko: string | null }

// 사오지 않는 기본 재료(수돗물 등)는 누락 목록에서 제외.
const IGNORE_INGREDIENTS = new Set(['물']);
// 동의어 정규화 — 같은 재료의 다른 표기를 통일. (예: 달걀=계란)
const SYNONYMS: Array<[RegExp, string]> = [[/달걀/g, '계란']];
function applySynonyms(s: string): string {
  let x = s;
  for (const [re, to] of SYNONYMS) x = x.replace(re, to);
  return x;
}
const norm = (s: string) => applySynonyms(s.replace(/\s+/g, '').toLowerCase());

/**
 * 추천의 레시피 재료 중 현재 재고(consumed=0)에 없는 것을 계산.
 * 매칭 우선순위: (1) 재료명을 food_id 로 해석해 재고 food_id 와 대조,
 *               (2) 실패 시 재고 이름(정규명/원문)과 부분일치 대조.
 */
async function computeMissingIngredients(
  userId: number,
  recommendationId: number,
): Promise<ShoppingListResponse['missing_ingredients']> {
  const [recipeRows] = await pool.query<IngredientsRow[]>(
    `SELECT rc.ingredients_json
       FROM meal_plans mp
       JOIN meal_plan_recipes mpr ON mpr.meal_plan_id = mp.id
       JOIN recipes rc ON rc.id = mpr.recipe_id
      WHERE mp.recommendation_id = ?`,
    [recommendationId],
  );
  const ingredients: RecipeIngredient[] = [];
  for (const r of recipeRows) {
    const raw = r.ingredients_json;
    const arr = typeof raw === 'string' ? (JSON.parse(raw) as RecipeIngredient[]) : raw;
    if (Array.isArray(arr)) ingredients.push(...arr);
  }
  if (ingredients.length === 0) return [];

  const [invRows] = await pool.query<InvRow[]>(
    `SELECT ii.food_id, ii.raw_text, f.name_ko
       FROM ingredient_items ii
       LEFT JOIN foods f ON f.id = ii.food_id
      WHERE ii.user_id = ? AND ii.consumed = 0`,
    [userId],
  );
  const ownedFoodIds = new Set<number>();
  const ownedNames: string[] = [];
  for (const r of invRows) {
    if (r.food_id != null) ownedFoodIds.add(Number(r.food_id));
    if (r.name_ko) ownedNames.push(norm(r.name_ko));
    if (r.raw_text) ownedNames.push(norm(r.raw_text));
  }
  const ownedNorm = ownedNames.filter(Boolean);

  const out: ShoppingListResponse['missing_ingredients'] = [];
  const seen = new Set<string>();
  for (const ing of ingredients) {
    const name = (ing.name ?? '').trim();
    const key = norm(name);
    if (!name || IGNORE_INGREDIENTS.has(name) || !key || seen.has(key)) continue;
    seen.add(key);

    let owned = false;
    const match = await lookupFood(applySynonyms(name)); // 달걀→계란 등 동의어 통일 후 food_id 해석
    if (match.food_id != null && ownedFoodIds.has(match.food_id)) owned = true;
    if (!owned) owned = ownedNorm.some((o) => o.includes(key) || key.includes(o));
    if (owned) continue;

    const qty = [ing.quantity, ing.unit]
      .filter((v) => v != null && v !== '')
      .join(' ')
      .trim();
    out.push({ name, suggested_qty: qty });
  }
  return out;
}

export async function listOrGenerate(userId: number, recommendationId: number): Promise<ShoppingListResponse> {
  // 본인 확인
  const [owners] = await pool.query<OwnerRow[]>(
    'SELECT user_id FROM recommendation_requests WHERE id = ? LIMIT 1',
    [recommendationId],
  );
  if (owners.length === 0) throw new AppError('NOT_FOUND', 'recommendation not found', 404);
  if (owners[0].user_id !== userId) throw new AppError('FORBIDDEN', 'not your recommendation', 403);

  // 레시피 재료 중 현재 재고에 없는 것 — 영양 부족분과 별개로 매번 새로 계산.
  const missing_ingredients = await computeMissingIngredients(userId, recommendationId);

  // 기존 항목
  const [existing] = await pool.query<ItemRow[]>(
    'SELECT id, food_id, name, category, reason, suggested_qty, priority_score FROM shopping_list_items WHERE recommendation_id = ? ORDER BY priority_score DESC, id',
    [recommendationId],
  );
  if (existing.length > 0) {
    return {
      recommendation_id: recommendationId,
      generated: false,
      warnings: [],
      items: existing.map((r) => ({
        id: r.id,
        food_id: r.food_id,
        name: r.name,
        category: r.category,
        reason: r.reason ?? '',
        suggested_qty: r.suggested_qty ?? '',
        priority_score: r.priority_score,
      })),
      missing_ingredients,
    };
  }

  // 영양 분석 로드
  const [nutRows] = await pool.query<NutRow[]>(
    'SELECT total_kcal, protein_g, fiber_g, sodium_mg, rda_ratio_json FROM nutrition_analyses WHERE recommendation_id = ? LIMIT 1',
    [recommendationId],
  );
  const nut = nutRows[0];
  if (!nut || !nut.rda_ratio_json) {
    return { recommendation_id: recommendationId, generated: false, warnings: ['nutrition analysis missing'], items: [], missing_ingredients };
  }

  const snapshot: NutritionSnapshot = {
    total_kcal: Number(nut.total_kcal ?? 0),
    protein_g: Number(nut.protein_g ?? 0),
    fiber_g: Number(nut.fiber_g ?? 0),
    sodium_mg: Number(nut.sodium_mg ?? 0),
    rda_ratio: nut.rda_ratio_json,
  };

  const warnings: string[] = [];
  if (snapshot.rda_ratio.sodium > 1.5) {
    warnings.push(`나트륨 과다 (${Math.round(snapshot.rda_ratio.sodium * 100)}%) — 저나트륨 조리 권장`);
  }

  const candidates: ShoppingCandidate[] = await computeGap(snapshot);

  if (candidates.length === 0) {
    return { recommendation_id: recommendationId, generated: true, warnings, items: [], missing_ingredients };
  }

  // 002 FR-035/036 — 영양 부족도 기준 우선순위 산정
  const ranked = rankShoppingItems(candidates);

  // 저장 (트랜잭션)
  const conn = await pool.getConnection();
  const inserted: ShoppingListResponse['items'] = [];
  try {
    await conn.beginTransaction();
    for (const c of ranked) {
      const [res] = await conn.query<ResultSetHeader>(
        `INSERT INTO shopping_list_items
           (recommendation_id, food_id, name, category, reason, suggested_qty, priority_score)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [recommendationId, c.food_id, c.name, c.category, c.reason, c.suggested_qty, c.priority_score],
      );
      inserted.push({
        id: res.insertId,
        food_id: c.food_id,
        name: c.name,
        category: c.category,
        reason: c.reason,
        suggested_qty: c.suggested_qty,
        priority_score: c.priority_score,
      });
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  return { recommendation_id: recommendationId, generated: true, warnings, items: inserted, missing_ingredients };
}
