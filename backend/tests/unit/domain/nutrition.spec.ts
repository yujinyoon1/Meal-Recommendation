import { describe, it, expect } from 'vitest';
import { calculateNutrition, type NutritionInput } from '../../../src/domain/nutrition/calculator.js';

const mkMatched = (over: Partial<NutritionInput> = {}): NutritionInput => ({
  name: 'x',
  quantity: 100,
  unit: 'g',
  matched: true,
  kcal_per_100g: 100,
  carb_g: 10,
  protein_g: 10,
  fat_g: 5,
  fiber_g: 2,
  sodium_mg: 200,
  ...over,
});

describe('calculateNutrition (FR-016)', () => {
  it('100g 1개 → per100 그대로', () => {
    const s = calculateNutrition([mkMatched()]);
    expect(s.total_kcal).toBeCloseTo(100, 1);
    expect(s.carb_g).toBeCloseTo(10, 1);
    expect(s.confidence).toBe('high');
  });

  it('단위 환산 — 1kg = 1000g 환산', () => {
    const s = calculateNutrition([mkMatched({ quantity: 1, unit: 'kg' })]);
    expect(s.total_kcal).toBeCloseTo(1000, 1);
  });

  it('알 수 없는 단위는 그대로 통과 (그램 가정)', () => {
    const s = calculateNutrition([mkMatched({ quantity: 50, unit: 'pinch' })]);
    expect(s.total_kcal).toBeCloseTo(50, 1);
  });

  it('매칭 실패 비율 ↑ → confidence 강등', () => {
    const items: NutritionInput[] = [
      mkMatched(),
      { name: 'unknown1', quantity: 100, unit: 'g', matched: false, kcal_per_100g: null, carb_g: null, protein_g: null, fat_g: null, fiber_g: null, sodium_mg: null },
      { name: 'unknown2', quantity: 100, unit: 'g', matched: false, kcal_per_100g: null, carb_g: null, protein_g: null, fat_g: null, fiber_g: null, sodium_mg: null },
    ];
    const s = calculateNutrition(items);
    expect(s.confidence).toBe('low');
  });

  it('목표 칼로리 미설정 → 기본 RDA 2000 적용', () => {
    const s = calculateNutrition([mkMatched()]);
    expect(s.rda_ratio.calories).toBeCloseTo(0.05, 2); // 100 / 2000
  });

  it('목표 칼로리 1500 설정 시 RDA 비율 갱신', () => {
    const s = calculateNutrition([mkMatched()], 1500);
    expect(s.rda_ratio.calories).toBeCloseTo(0.067, 2);
  });

  it('수량 누락 항목은 합산에서 제외', () => {
    const s = calculateNutrition([
      mkMatched(),
      mkMatched({ quantity: null }),
    ]);
    expect(s.total_kcal).toBeCloseTo(100, 1);
  });
});
