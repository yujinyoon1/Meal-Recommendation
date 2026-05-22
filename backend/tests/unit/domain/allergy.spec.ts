import { describe, it, expect } from 'vitest';
import { detectAllergyViolations } from '../../../src/domain/validator/allergy.js';

describe('detectAllergyViolations (FR-015)', () => {
  it('빈 알레르기 목록 → 위반 없음', () => {
    const v = detectAllergyViolations(
      { name: '두부 계란 양파볶음', ingredients: [{ name: '계란' }, { name: '두부' }] },
      [],
    );
    expect(v).toEqual([]);
  });

  it('정확 일치 매칭', () => {
    const v = detectAllergyViolations(
      { name: '땅콩 볶음', ingredients: [{ name: '땅콩' }, { name: '양파' }] },
      ['땅콩'],
    );
    expect(v).toHaveLength(1);
    expect(v[0].matchedAllergen).toBe('땅콩');
    expect(v[0].via).toBe('exact');
  });

  it('substring 매칭 — "땅콩버터"가 "땅콩" 알레르기에 걸림', () => {
    const v = detectAllergyViolations(
      { name: 'PB 샌드위치', ingredients: [{ name: '땅콩버터' }, { name: '식빵' }] },
      ['땅콩'],
    );
    expect(v).toHaveLength(1);
    expect(v[0].via).toBe('substring');
  });

  it('alias 매핑 — "피넛" → "땅콩"', () => {
    const v = detectAllergyViolations(
      { ingredients: [{ name: '피넛' }] },
      ['땅콩'],
      { '피넛': '땅콩' },
    );
    expect(v).toHaveLength(1);
    expect(v[0].via).toBe('alias');
  });

  it('대소문자 / 공백 정규화', () => {
    const v = detectAllergyViolations(
      { ingredients: [{ name: '  땅 콩  ' }] },
      ['땅콩'],
    );
    expect(v).toHaveLength(1);
  });

  it('혼합 — 일부 위반, 일부 안전', () => {
    const v = detectAllergyViolations(
      { ingredients: [{ name: '계란' }, { name: '땅콩' }, { name: '두부' }] },
      ['땅콩', '갑각류'],
    );
    expect(v.map((x) => x.ingredient)).toEqual(['땅콩']);
  });

  it('재료별로 최초 매칭 하나만 기록', () => {
    const v = detectAllergyViolations(
      { ingredients: [{ name: '땅콩버터' }] },
      ['땅콩', '땅콩버터'],
    );
    // 동일 재료에 대해 두 알레르겐 매칭이 가능해도 1건만 (break) — 결정적 행동 보장
    expect(v).toHaveLength(1);
  });
});
