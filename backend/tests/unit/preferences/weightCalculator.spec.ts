import { describe, it, expect } from 'vitest';
import {
  calculateWeights,
  splitPreferences,
  type PreferenceEvent,
} from '../../../src/domain/preferences/weightCalculator.js';

const ev = (
  key_ref: string,
  signal: number,
  ageInDays: number,
): PreferenceEvent => ({ dimension: 'ingredient', key_ref, signal, ageInDays });

describe('calculateWeights (002 FR-001/004)', () => {
  it('빈 입력 → 빈 결과', () => {
    expect(calculateWeights([])).toEqual([]);
  });

  it('콜드스타트: 샘플 수 < minSamples → 중립(0)', () => {
    const w = calculateWeights([ev('연어', 1, 0)], { minSamples: 2 });
    expect(w).toHaveLength(1);
    expect(w[0].weight).toBe(0); // 신뢰도 부족 → 중립
    expect(w[0].sample_count).toBe(1);
    expect(w[0].confidence).toBeLessThan(1);
  });

  it('상충 피드백(동시점 +1/-1) → 중립화(~0)', () => {
    const w = calculateWeights([ev('두부', 1, 0), ev('두부', -1, 0)], { minSamples: 2 });
    expect(w).toHaveLength(1);
    expect(Math.abs(w[0].weight)).toBeLessThan(0.001);
  });

  it('최신성: 최근 +1 이 오래된 -1 을 압도 → 양의 가중치', () => {
    const w = calculateWeights([ev('김치', 1, 0), ev('김치', -1, 90)], {
      halfLifeDays: 30,
      minSamples: 2,
    });
    expect(w[0].weight).toBeGreaterThan(0);
  });

  it('일관된 선호 누적 → 높은 가중치·신뢰도', () => {
    const w = calculateWeights(
      [ev('계란', 1, 0), ev('계란', 1, 5), ev('계란', 1, 10)],
      { fullConfidenceSamples: 5, minSamples: 2 },
    );
    expect(w[0].weight).toBeGreaterThan(0.9);
    expect(w[0].confidence).toBeCloseTo(0.6, 3);
    expect(w[0].sample_count).toBe(3);
  });

  it('splitPreferences: 임계 기준 prefer/avoid 분리', () => {
    const w = calculateWeights(
      [
        ev('연어', 1, 0), ev('연어', 1, 1),
        ev('가지', -1, 0), ev('가지', -1, 1),
      ],
      { minSamples: 2 },
    );
    const { prefer, avoid } = splitPreferences(w, 'ingredient', 0.2);
    expect(prefer).toContain('연어');
    expect(avoid).toContain('가지');
  });
});
