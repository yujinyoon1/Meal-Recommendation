/**
 * 002 FR-010/011/012 — 유통기한 임박/만료 판정기 (순수 도메인).
 *
 * 식품군별 차등 임계(food_group_expiry_thresholds)를 적용해 보유 재료를
 * imminent(임박) / expired(만료) 로 분류한다. DB/LLM 비의존 — 단위 테스트 용이.
 *
 *  - days_left < 0            → expired
 *  - 0 <= days_left <= 임계   → imminent
 *  - 임계 미설정 식품군        → defaultDays 사용 (EC-3)
 */
export interface ExpiryItemInput {
  id: number;
  name: string;
  food_group: string | null;
  /** 오늘 기준 남은 일수. null 이면 유통기한 미입력 → 판정 제외. */
  days_left: number | null;
}

export type ExpiryThresholds = Record<string, number>;

export interface ExpiryResult {
  id: number;
  name: string;
  food_group: string | null;
  days_left: number;
  state: 'imminent' | 'expired';
}

export interface EvaluateOptions {
  /** 임계 미설정 식품군의 기본 임박 임계(일). 기본 3. */
  defaultDays?: number;
}

export function evaluateExpiry(
  items: ExpiryItemInput[],
  thresholds: ExpiryThresholds,
  opts: EvaluateOptions = {},
): { imminent: ExpiryResult[]; expired: ExpiryResult[] } {
  const defaultDays = opts.defaultDays ?? 3;
  const imminent: ExpiryResult[] = [];
  const expired: ExpiryResult[] = [];

  for (const it of items) {
    if (it.days_left == null) continue; // 유통기한 미입력 → 임박 판정 제외 (EC-3)
    const base = { id: it.id, name: it.name, food_group: it.food_group, days_left: it.days_left };
    if (it.days_left < 0) {
      expired.push({ ...base, state: 'expired' });
      continue;
    }
    const threshold = (it.food_group && thresholds[it.food_group] != null)
      ? thresholds[it.food_group]
      : defaultDays;
    if (it.days_left <= threshold) {
      imminent.push({ ...base, state: 'imminent' });
    }
  }

  imminent.sort((a, b) => a.days_left - b.days_left);
  expired.sort((a, b) => a.days_left - b.days_left);
  return { imminent, expired };
}
