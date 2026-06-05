import { describe, it, expect } from 'vitest';
import {
  aggregateReport,
  hasEnoughData,
  type WeightPoint,
  type NutritionPoint,
} from '../../../src/domain/health/reportAggregator.js';

const w = (date: string, kg: number): WeightPoint => ({ date, weight_kg: kg });
const n = (over: Partial<NutritionPoint> = {}): NutritionPoint => ({
  total_kcal: 600, carb_g: 70, protein_g: 60, fat_g: 20, fiber_g: 30, sodium_mg: 1000, ...over,
});

describe('aggregateReport (002 FR-031/032)', () => {
  it('체중 추이는 날짜 오름차순 정렬 + 변화량 계산', () => {
    const r = aggregateReport([w('2026-06-03', 60), w('2026-06-01', 62)], []);
    expect(r.weight_trend.map((p) => p.date)).toEqual(['2026-06-01', '2026-06-03']);
    expect(r.weight_change_kg).toBe(-2);
  });

  it('체중 기록 1건 → 변화량 null', () => {
    const r = aggregateReport([w('2026-06-01', 60)], []);
    expect(r.weight_change_kg).toBeNull();
  });

  it('영양 평균 산출 + 부족/과잉 감지', () => {
    const r = aggregateReport([], [n({ protein_g: 40, fiber_g: 10, sodium_mg: 2500 })]);
    expect(r.nutrition_balance?.sample_count).toBe(1);
    expect(r.deficiencies).toContain('단백질 부족');
    expect(r.deficiencies).toContain('식이섬유 부족');
    expect(r.deficiencies).toContain('나트륨 과다');
  });

  it('충분한 영양이면 부족 없음', () => {
    const r = aggregateReport([], [n()]);
    expect(r.deficiencies).toEqual([]);
  });

  it('hasEnoughData: 데이터 희소 판정 (EC-5)', () => {
    expect(hasEnoughData(1, 1)).toBe(false);
    expect(hasEnoughData(2, 0)).toBe(true);
    expect(hasEnoughData(0, 3)).toBe(true);
  });
});
