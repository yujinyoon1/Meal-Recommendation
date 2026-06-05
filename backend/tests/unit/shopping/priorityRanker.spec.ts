import { describe, it, expect } from 'vitest';
import { rankShoppingItems } from '../../../src/domain/shopping/priorityRanker.js';

describe('rankShoppingItems (002 FR-035/036)', () => {
  it('단백질이 식이섬유보다 우선', () => {
    const r = rankShoppingItems([
      { name: '귀리', reason: '식이섬유 부족 보충 (현재 60%)' },
      { name: '닭가슴살', reason: '단백질 부족 보충 (현재 60%)' },
    ]);
    expect(r[0].name).toBe('닭가슴살');
  });

  it('결핍이 심할수록(낮은 %) 우선순위 높음', () => {
    const r = rankShoppingItems([
      { name: 'A', reason: '단백질 부족 보충 (현재 60%)' },
      { name: 'B', reason: '단백질 부족 보충 (현재 20%)' },
    ]);
    expect(r[0].name).toBe('B');
    expect(r[0].priority_score).toBeGreaterThan(r[1].priority_score);
  });

  it('임박 대체 항목은 가중치 보너스', () => {
    const r = rankShoppingItems([
      { name: '일반', reason: '식이섬유 부족 보충 (현재 60%)' },
      { name: '임박대체', reason: '식이섬유 부족 보충 (현재 60%)', imminentReplacement: true },
    ]);
    expect(r[0].name).toBe('임박대체');
  });

  it('priority_score 내림차순 정렬', () => {
    const r = rankShoppingItems([
      { name: 'A', reason: '식이섬유 부족 보충 (현재 90%)' },
      { name: 'B', reason: '단백질 부족 보충 (현재 10%)' },
    ]);
    expect(r.map((x) => x.priority_score)).toEqual([...r.map((x) => x.priority_score)].sort((a, b) => b - a));
  });
});
