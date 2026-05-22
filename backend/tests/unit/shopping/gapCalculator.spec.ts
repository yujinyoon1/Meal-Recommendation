/**
 * gapCalculator 단위 테스트 (T106).
 * mysql2 pool 을 mock — DB 없이 결정적 시나리오만 검증.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// pool.query stub
const queryMock = vi.fn();
vi.mock('../../../src/db/pool.js', () => ({
  pool: { query: (...args: unknown[]) => queryMock(...args) },
}));

const { computeGap } = await import('../../../src/modules/shopping/gapCalculator.js');

function row(name: string, category: string, over: Record<string, string> = {}) {
  return {
    id: Math.floor(Math.random() * 10_000),
    name_ko: name,
    category,
    protein_g: '20',
    fiber_g: '3',
    kcal_per_100g: '150',
    ...over,
  };
}

beforeEach(() => {
  queryMock.mockReset();
});

describe('computeGap', () => {
  it('단백질 부족 시 단백질 후보 식재료를 반환', async () => {
    // protein 쿼리 + calories 쿼리(0.4 < 0.5 도 트리거) 두 mock 을 호출 순서대로 등록
    queryMock.mockResolvedValueOnce([[row('닭가슴살', '육류', { protein_g: '31' }), row('두부', '콩류', { protein_g: '8' })]]);
    queryMock.mockResolvedValueOnce([[row('백미밥', '곡류', { kcal_per_100g: '370' })]]);

    const out = await computeGap({
      total_kcal: 800,
      protein_g: 20,
      fiber_g: 25,
      sodium_mg: 1000,
      rda_ratio: { calories: 0.4, protein: 0.36, fiber: 1.0, sodium: 0.5 },
    });

    expect(out.some((c) => c.reason.includes('단백질 부족'))).toBe(true);
  });

  it('식이섬유 부족 → 채소/과일/곡류 카테고리에서 후보', async () => {
    queryMock.mockResolvedValueOnce([[row('브로콜리', '채소', { fiber_g: '2.6' })]]);

    const out = await computeGap({
      total_kcal: 1800,
      protein_g: 80,
      fiber_g: 10,
      sodium_mg: 1500,
      rda_ratio: { calories: 0.9, protein: 1.45, fiber: 0.4, sodium: 0.75 },
    });

    expect(out.length).toBeGreaterThan(0);
    expect(out.every((c) => c.reason.includes('식이섬유'))).toBe(true);
  });

  it('모든 영양소 충족 → 빈 배열', async () => {
    const out = await computeGap({
      total_kcal: 2000,
      protein_g: 60,
      fiber_g: 30,
      sodium_mg: 1800,
      rda_ratio: { calories: 1.0, protein: 1.09, fiber: 1.2, sodium: 0.9 },
    });
    expect(out).toEqual([]);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('선호 카테고리 결과가 비면 폴백 전체 쿼리', async () => {
    queryMock.mockResolvedValueOnce([[]]); // preferred categories: 결과 없음
    queryMock.mockResolvedValueOnce([[row('계란', null as unknown as string, { protein_g: '13' })]]); // fallback

    const out = await computeGap({
      total_kcal: 1500,
      protein_g: 30,
      fiber_g: 25,
      sodium_mg: 1500,
      rda_ratio: { calories: 0.75, protein: 0.54, fiber: 1.0, sodium: 0.75 },
    });

    expect(out.length).toBeGreaterThan(0);
    expect(queryMock).toHaveBeenCalledTimes(2); // preferred → fallback
  });
});
