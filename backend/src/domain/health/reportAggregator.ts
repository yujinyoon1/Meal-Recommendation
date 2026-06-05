/**
 * 002 FR-031/032 — 건강/영양 리포트 집계 (순수 도메인).
 *
 * 수동 입력 체중 기록 + 기간 내 추천 영양 분석을 받아
 * 체중 추이·평균 영양 균형·부족/과잉 영양소를 산출한다. DB/LLM 비의존.
 */
export interface WeightPoint {
  date: string; // YYYY-MM-DD
  weight_kg: number;
}
export interface NutritionPoint {
  total_kcal: number;
  carb_g: number;
  protein_g: number;
  fat_g: number;
  fiber_g: number;
  sodium_mg: number;
}

export interface NutritionBalance {
  avg_kcal: number;
  avg_carb_g: number;
  avg_protein_g: number;
  avg_fat_g: number;
  avg_fiber_g: number;
  avg_sodium_mg: number;
  sample_count: number;
}

export interface HealthReport {
  weight_trend: WeightPoint[];
  weight_change_kg: number | null;
  nutrition_balance: NutritionBalance | null;
  deficiencies: string[];
}

// 1인 1일 기준 단순 임계(참고용 — 의학적 기준 아님).
const PROTEIN_MIN = 50;
const FIBER_MIN = 25;
const SODIUM_MAX = 2000;

const round1 = (n: number) => Math.round(n * 10) / 10;

export function aggregateReport(weights: WeightPoint[], nutrition: NutritionPoint[]): HealthReport {
  const trend = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const weight_change_kg =
    trend.length >= 2 ? round1(trend[trend.length - 1].weight_kg - trend[0].weight_kg) : null;

  let nutrition_balance: NutritionBalance | null = null;
  const deficiencies: string[] = [];
  if (nutrition.length > 0) {
    const n = nutrition.length;
    const sum = nutrition.reduce(
      (acc, p) => ({
        kcal: acc.kcal + p.total_kcal,
        carb: acc.carb + p.carb_g,
        protein: acc.protein + p.protein_g,
        fat: acc.fat + p.fat_g,
        fiber: acc.fiber + p.fiber_g,
        sodium: acc.sodium + p.sodium_mg,
      }),
      { kcal: 0, carb: 0, protein: 0, fat: 0, fiber: 0, sodium: 0 },
    );
    nutrition_balance = {
      avg_kcal: round1(sum.kcal / n),
      avg_carb_g: round1(sum.carb / n),
      avg_protein_g: round1(sum.protein / n),
      avg_fat_g: round1(sum.fat / n),
      avg_fiber_g: round1(sum.fiber / n),
      avg_sodium_mg: round1(sum.sodium / n),
      sample_count: n,
    };
    if (nutrition_balance.avg_protein_g < PROTEIN_MIN) deficiencies.push('단백질 부족');
    if (nutrition_balance.avg_fiber_g < FIBER_MIN) deficiencies.push('식이섬유 부족');
    if (nutrition_balance.avg_sodium_mg > SODIUM_MAX) deficiencies.push('나트륨 과다');
  }

  return { weight_trend: trend, weight_change_kg, nutrition_balance, deficiencies };
}

/** 리포트 제공에 충분한 데이터인지 (데이터 희소 안내용, EC-5). */
export function hasEnoughData(weightCount: number, nutritionCount: number, minPoints = 2): boolean {
  return weightCount >= minPoints || nutritionCount >= minPoints;
}
