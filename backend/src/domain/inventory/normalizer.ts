/**
 * 자유 텍스트 → ingredient_items 입력 후보 정규화.
 * 입력 예: "계란 2개, 양파 1개\n두부 반 모\n2026-05-25 우유 200ml"
 *
 * 분리자: , 또는 줄바꿈
 * 패턴:
 *  - [YYYY-MM-DD] 식재료명 수량단위
 *  - 식재료명 수량단위
 *  - 식재료명만
 */

export interface NormalizedInventoryItem {
  rawText: string;
  normalized?: string;
  quantity?: number;
  unit?: string;
  expiresAt?: string; // YYYY-MM-DD
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const FRACTIONS: Record<string, number> = { '반': 0.5, '½': 0.5, '¼': 0.25, '¾': 0.75 };

function parseQuantityUnit(rest: string): { quantity?: number; unit?: string; name: string } {
  // 형태: "<name> <num><unit>" 또는 "<name> <num> <unit>" 또는 "<name>"
  const m =
    rest.match(/^(.+?)\s+([0-9.]+)\s*([가-힣A-Za-z]+)?$/) ??
    rest.match(/^(.+?)\s+(반|½|¼|¾)\s*([가-힣A-Za-z]+)?$/);
  if (!m) return { name: rest.trim() };
  const name = m[1].trim();
  const qtyRaw = m[2];
  const unit = (m[3] ?? '').trim() || undefined;
  const quantity = FRACTIONS[qtyRaw] ?? Number(qtyRaw);
  return { name, quantity: Number.isFinite(quantity) ? quantity : undefined, unit };
}

function parseLine(line: string): NormalizedInventoryItem | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // 선두 ISO date 가 있으면 expires_at 으로
  const tokens = trimmed.split(/\s+/);
  let expiresAt: string | undefined;
  let rest = trimmed;
  if (tokens.length > 1 && ISO_DATE.test(tokens[0])) {
    expiresAt = tokens[0];
    rest = tokens.slice(1).join(' ');
  }

  const { name, quantity, unit } = parseQuantityUnit(rest);
  return {
    rawText: trimmed,
    normalized: name,
    quantity,
    unit,
    expiresAt,
  };
}

export function normalizeInventoryText(text: string): NormalizedInventoryItem[] {
  if (!text) return [];
  // 쉼표 또는 줄바꿈으로 분리
  const parts = text.split(/[,\n]+/);
  const out: NormalizedInventoryItem[] = [];
  for (const p of parts) {
    const item = parseLine(p);
    if (item) out.push(item);
  }
  return out;
}
