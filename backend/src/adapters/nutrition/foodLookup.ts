/**
 * 식재료 정규화/매칭.
 * 1) ingredient_alias 직접 매칭
 * 2) foods.name_ko FULLTEXT (BOOLEAN 모드)
 * 3) 둘 다 실패 → null, confidence='low'
 */
import type { RowDataPacket } from 'mysql2';
import { pool } from '../../db/pool.js';

export interface FoodMatch {
  food_id: number | null;
  name_ko: string;
  category: string | null;
  confidence: 'high' | 'medium' | 'low';
  kcal_per_100g: number | null;
  carb_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sodium_mg: number | null;
}

interface FoodRow extends RowDataPacket {
  id: number;
  name_ko: string;
  category: string | null;
  kcal_per_100g: string | null;
  carb_g: string | null;
  protein_g: string | null;
  fat_g: string | null;
  fiber_g: string | null;
  sodium_mg: string | null;
}

function toMatch(r: FoodRow, confidence: FoodMatch['confidence']): FoodMatch {
  const n = (v: string | null) => (v == null ? null : Number(v));
  return {
    food_id: r.id,
    name_ko: r.name_ko,
    category: r.category,
    confidence,
    kcal_per_100g: n(r.kcal_per_100g),
    carb_g: n(r.carb_g),
    protein_g: n(r.protein_g),
    fat_g: n(r.fat_g),
    fiber_g: n(r.fiber_g),
    sodium_mg: n(r.sodium_mg),
  };
}

export async function lookupFood(rawText: string): Promise<FoodMatch> {
  const query = rawText.trim();
  if (!query) {
    return missMatch(rawText);
  }

  // 1) alias 정확 일치
  const [aliasRows] = await pool.query<FoodRow[]>(
    `SELECT f.id, f.name_ko, f.category, f.kcal_per_100g, f.carb_g, f.protein_g, f.fat_g, f.fiber_g, f.sodium_mg
       FROM ingredient_alias a
       JOIN foods f ON f.id = a.food_id
      WHERE a.alias = ?
      LIMIT 1`,
    [query],
  );
  if (aliasRows.length > 0) return toMatch(aliasRows[0], 'high');

  // 2) FULLTEXT (BOOLEAN)
  const [ftRows] = await pool.query<FoodRow[]>(
    `SELECT id, name_ko, category, kcal_per_100g, carb_g, protein_g, fat_g, fiber_g, sodium_mg
       FROM foods
      WHERE MATCH(name_ko) AGAINST(? IN BOOLEAN MODE)
      ORDER BY MATCH(name_ko) AGAINST(?) DESC
      LIMIT 1`,
    [query + '*', query],
  );
  if (ftRows.length > 0) return toMatch(ftRows[0], 'medium');

  return missMatch(rawText);
}

function missMatch(rawText: string): FoodMatch {
  return {
    food_id: null,
    name_ko: rawText,
    category: null,
    confidence: 'low',
    kcal_per_100g: null,
    carb_g: null,
    protein_g: null,
    fat_g: null,
    fiber_g: null,
    sodium_mg: null,
  };
}
