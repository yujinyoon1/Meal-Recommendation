import { describe, it, expect } from 'vitest';
import {
  evaluateExpiry,
  type ExpiryItemInput,
  type ExpiryThresholds,
} from '../../../src/domain/expiry/expiryEvaluator.js';

const TH: ExpiryThresholds = { 채소: 2, 유제품: 5 };
const item = (id: number, name: string, group: string | null, days: number | null): ExpiryItemInput => ({
  id, name, food_group: group, days_left: days,
});

describe('evaluateExpiry (002 FR-010/011)', () => {
  it('식품군별 차등 임계 경계값', () => {
    const { imminent } = evaluateExpiry(
      [
        item(1, '시금치', '채소', 2), // == 임계 → 임박
        item(2, '상추', '채소', 3),   // 임계 초과 → 제외
        item(3, '우유', '유제품', 5), // == 임계 → 임박
      ],
      TH,
    );
    const ids = imminent.map((i) => i.id);
    expect(ids).toContain(1);
    expect(ids).toContain(3);
    expect(ids).not.toContain(2);
  });

  it('만료(days_left < 0) → expired 로 분리', () => {
    const { imminent, expired } = evaluateExpiry([item(1, '두부', '기타', -1)], TH);
    expect(expired.map((e) => e.id)).toContain(1);
    expect(imminent).toHaveLength(0);
  });

  it('임계 미설정 식품군 → defaultDays 적용 (EC-3)', () => {
    const { imminent } = evaluateExpiry([item(1, '계란', null, 3)], TH, { defaultDays: 3 });
    expect(imminent.map((i) => i.id)).toContain(1);
  });

  it('유통기한 미입력(days_left=null) → 판정 제외', () => {
    const { imminent, expired } = evaluateExpiry([item(1, '소금', '기타', null)], TH);
    expect(imminent).toHaveLength(0);
    expect(expired).toHaveLength(0);
  });

  it('임박 목록은 days_left 오름차순 정렬', () => {
    const { imminent } = evaluateExpiry(
      [item(1, 'a', '채소', 2), item(2, 'b', '채소', 0), item(3, 'c', '채소', 1)],
      TH,
    );
    expect(imminent.map((i) => i.days_left)).toEqual([0, 1, 2]);
  });
});
