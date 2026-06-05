/**
 * 002 FR-035/036 — 장보기 항목 우선순위 산정 (순수 도메인).
 *
 * 영양 부족도(부족 영양소 종류 + 결핍 심각도)와 임박 대체 필요성을 기준으로
 * priority_score 를 매기고 내림차순 정렬한다. DB/LLM 비의존.
 */
export interface RankInput {
  name: string;
  reason: string;
  category?: string | null;
  /** 임박 재료 대체용으로 제안된 항목이면 가중 (FR-036). */
  imminentReplacement?: boolean;
}
export interface RankedItem extends RankInput {
  priority_score: number;
}

// 부족 영양소별 기본 가중(단백질이 가장 우선).
const NUTRIENT_BASE: Array<[RegExp, number]> = [
  [/단백질/, 30],
  [/칼로리/, 25],
  [/식이섬유/, 20],
];
const DEFAULT_BASE = 10;
const IMMINENT_BONUS = 15;

/** reason 문자열의 "(현재 N%)" 를 파싱해 결핍 심각도(낮을수록 높은 우선순위)를 점수화. */
function severityBonus(reason: string): number {
  const m = reason.match(/(\d+)\s*%/);
  if (!m) return 0;
  const pct = Number(m[1]);
  if (!Number.isFinite(pct)) return 0;
  return Math.max(0, Math.round((100 - pct) / 10)); // 0~10
}

function baseFor(reason: string): number {
  for (const [re, w] of NUTRIENT_BASE) if (re.test(reason)) return w;
  return DEFAULT_BASE;
}

export function rankShoppingItems<T extends RankInput>(items: T[]): Array<T & { priority_score: number }> {
  const scored = items.map((it) => ({
    ...it,
    priority_score:
      baseFor(it.reason) + severityBonus(it.reason) + (it.imminentReplacement ? IMMINENT_BONUS : 0),
  }));
  scored.sort((a, b) => b.priority_score - a.priority_score);
  return scored;
}
