/**
 * 영양 계산기 (spec FR-016).
 * - 재료별 100g당 영양값 × 실제 사용량 → 레시피 총합
 * - RDA 비율 = 총 칼로리 / 목표 칼로리 (목표 미설정 시 2000 kcal 기본)
 *
 * unit 정규화: g / kg / ml / L / 개 / tbsp / tsp / 컵
 *   - 무게 외 단위는 환산표(approximation). 추후 식재료별 환산 데이터 도입 권장.
 */

export interface NutritionPer100g {
  kcal_per_100g: number | null;
  carb_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sodium_mg: number | null;
}

export interface NutritionInput extends NutritionPer100g {
  name: string;
  quantity: number | null;
  unit: string | null;
  matched: boolean; // foodLookup 매칭 성공 여부
}

export interface NutritionSummary {
  total_kcal: number;
  carb_g: number;
  protein_g: number;
  fat_g: number;
  fiber_g: number;
  sodium_mg: number;
  rda_ratio: {
    calories: number;
    protein: number;
    fiber: number;
    sodium: number;
  };
  confidence: 'high' | 'medium' | 'low';
}

const DEFAULT_RDA = {
  kcal: 2000,
  protein_g: 55,
  fiber_g: 25,
  sodium_mg: 2000,
};

// 단순 환산표 → grams
const UNIT_TO_GRAM: Record<string, number> = {
  g: 1,
  kg: 1000,
  ml: 1,
  l: 1000,
  L: 1000,
  '개': 60, // 평균치 (계란 ≈ 60g 등)
  tbsp: 15,
  tsp: 5,
  '컵': 240,
  cup: 240,
};

function toGrams(qty: number | null, unit: string | null): number | null {
  if (qty == null || qty <= 0) return null;
  const u = (unit ?? 'g').trim();
  const factor = UNIT_TO_GRAM[u];
  if (factor == null) return qty; // 알 수 없으면 그대로 통과
  return qty * factor;
}

export function calculateNutrition(
  ingredients: NutritionInput[],
  targetCaloriesKcal: number | null = null,
): NutritionSummary {
  let tk = 0, c = 0, p = 0, f = 0, fi = 0, na = 0;
  let matched = 0;
  let totalConsidered = 0;

  for (const ing of ingredients) {
    const grams = toGrams(ing.quantity, ing.unit);
    if (grams == null) continue;
    totalConsidered += 1;

    if (!ing.matched || ing.kcal_per_100g == null) continue;
    matched += 1;
    const k = grams / 100;
    tk += (ing.kcal_per_100g ?? 0) * k;
    c += (ing.carb_g ?? 0) * k;
    p += (ing.protein_g ?? 0) * k;
    f += (ing.fat_g ?? 0) * k;
    fi += (ing.fiber_g ?? 0) * k;
    na += (ing.sodium_mg ?? 0) * k;
  }

  const matchRatio = totalConsidered === 0 ? 0 : matched / totalConsidered;
  const confidence: NutritionSummary['confidence'] =
    matchRatio >= 0.8 ? 'high' : matchRatio >= 0.5 ? 'medium' : 'low';

  const targetKcal = targetCaloriesKcal && targetCaloriesKcal > 0 ? targetCaloriesKcal : DEFAULT_RDA.kcal;
  return {
    total_kcal: round1(tk),
    carb_g: round1(c),
    protein_g: round1(p),
    fat_g: round1(f),
    fiber_g: round1(fi),
    sodium_mg: round1(na),
    rda_ratio: {
      calories: round2(tk / targetKcal),
      protein: round2(p / DEFAULT_RDA.protein_g),
      fiber: round2(fi / DEFAULT_RDA.fiber_g),
      sodium: round2(na / DEFAULT_RDA.sodium_mg),
    },
    confidence,
  };
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }
