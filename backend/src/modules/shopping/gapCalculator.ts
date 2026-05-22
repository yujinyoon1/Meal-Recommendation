/**
 * 영양 결핍 → 보충 식재료 후보 산출 (FR-021).
 *
 * 입력: nutrition_analyses 1행 (총합 + RDA 비율)
 * 출력: 부족 영양소별 후보 식재료 (foods 테이블에서 영양소 밀도 상위 N개)
 *
 * 결핍 임계:
 *  - protein RDA < 0.7
 *  - fiber   RDA < 0.7
 *  - calories RDA < 0.5 (지나치게 적은 경우만)
 *  - sodium  RDA > 1.5 → 부족이 아닌 "주의" (장보기 리스트 미포함, 경고만)
 */
import type { RowDataPacket } from 'mysql2';
import { pool } from '../../db/pool.js';

export interface NutritionSnapshot {
  total_kcal: number;
  protein_g: number;
  fiber_g: number;
  sodium_mg: number;
  rda_ratio: { calories: number; protein: number; fiber: number; sodium: number };
}

export interface ShoppingCandidate {
  food_id: number | null;
  name: string;
  category: string | null;
  reason: string;
  suggested_qty: string;
}

interface FoodRow extends RowDataPacket {
  id: number;
  name_ko: string;
  category: string | null;
  protein_g: string | null;
  fiber_g: string | null;
  kcal_per_100g: string | null;
}

const TOP_PER_NUTRIENT = 3;

async function topByNutrient(
  column: 'protein_g' | 'fiber_g' | 'kcal_per_100g',
  preferredCategories: string[] = [],
): Promise<FoodRow[]> {
  // category 우선순위가 있으면 그 안에서 상위, 없으면 전체에서 상위
  if (preferredCategories.length > 0) {
    const placeholders = preferredCategories.map(() => '?').join(',');
    const [rows] = await pool.query<FoodRow[]>(
      `SELECT id, name_ko, category, protein_g, fiber_g, kcal_per_100g
         FROM foods
        WHERE category IN (${placeholders}) AND ${column} IS NOT NULL
        ORDER BY ${column} DESC
        LIMIT ?`,
      [...preferredCategories, TOP_PER_NUTRIENT],
    );
    if (rows.length > 0) return rows;
  }
  const [rows] = await pool.query<FoodRow[]>(
    `SELECT id, name_ko, category, protein_g, fiber_g, kcal_per_100g
       FROM foods
      WHERE ${column} IS NOT NULL
      ORDER BY ${column} DESC
      LIMIT ?`,
    [TOP_PER_NUTRIENT],
  );
  return rows;
}

export async function computeGap(n: NutritionSnapshot): Promise<ShoppingCandidate[]> {
  const out: ShoppingCandidate[] = [];

  if (n.rda_ratio.protein < 0.7) {
    const rows = await topByNutrient('protein_g', ['육류', '생선', '콩류', '유제품']);
    for (const r of rows) {
      out.push({
        food_id: r.id,
        name: r.name_ko,
        category: r.category,
        reason: `단백질 부족 보충 (현재 ${Math.round(n.rda_ratio.protein * 100)}%)`,
        suggested_qty: '100g',
      });
    }
  }

  if (n.rda_ratio.fiber < 0.7) {
    const rows = await topByNutrient('fiber_g', ['채소', '과일', '곡류']);
    for (const r of rows) {
      out.push({
        food_id: r.id,
        name: r.name_ko,
        category: r.category,
        reason: `식이섬유 부족 보충 (현재 ${Math.round(n.rda_ratio.fiber * 100)}%)`,
        suggested_qty: '1회 분량',
      });
    }
  }

  if (n.rda_ratio.calories < 0.5) {
    const rows = await topByNutrient('kcal_per_100g', ['곡류']);
    for (const r of rows) {
      out.push({
        food_id: r.id,
        name: r.name_ko,
        category: r.category,
        reason: `칼로리 보충 (현재 ${Math.round(n.rda_ratio.calories * 100)}%)`,
        suggested_qty: '한 끼 분량',
      });
    }
  }

  // foods 시드가 비어있으면 빈 배열이 반환됨 — 그 경우를 호출 측에서 처리
  return out;
}
