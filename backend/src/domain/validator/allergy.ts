/**
 * 알레르기/금기 결정적 검증 (research §R-9, spec FR-015).
 * LLM 출력의 ingredients 와 사용자 알레르기 목록을 alias map 으로 비교.
 *
 * 매칭 전략:
 *  1) 정확 일치
 *  2) alias 사전 일치 (예: "피넛" → "땅콩")
 *  3) 토큰 부분 포함 (한국어 형태소 분석 미사용 — 단순 substring)
 */

export interface RecipeIngredient {
  name: string;
}

export interface RecipeForValidation {
  name?: string;
  ingredients: RecipeIngredient[];
}

export interface AllergyViolation {
  recipeName?: string;
  ingredient: string;
  matchedAllergen: string;
  via: 'exact' | 'alias' | 'substring';
}

export type AliasMap = Record<string, string>; // alias → canonical name (예: "피넛" → "땅콩")

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '');
}

export function detectAllergyViolations(
  recipe: RecipeForValidation,
  userAllergies: string[],
  aliasMap: AliasMap = {},
): AllergyViolation[] {
  const out: AllergyViolation[] = [];
  const allergens = userAllergies.map(norm).filter(Boolean);
  if (allergens.length === 0) return out;

  // alias map 정규화 (key/value 모두 norm)
  const normalizedAlias: Record<string, string> = {};
  for (const [k, v] of Object.entries(aliasMap)) {
    normalizedAlias[norm(k)] = norm(v);
  }

  for (const ing of recipe.ingredients) {
    const ingNorm = norm(ing.name);
    const canonical = normalizedAlias[ingNorm] ?? ingNorm;

    for (const a of allergens) {
      // 1) exact
      if (ingNorm === a || canonical === a) {
        out.push({
          recipeName: recipe.name,
          ingredient: ing.name,
          matchedAllergen: a,
          via: ingNorm === a ? 'exact' : 'alias',
        });
        break;
      }
      // 2) substring (예: "땅콩버터" 포함 "땅콩")
      if (ingNorm.includes(a) || canonical.includes(a)) {
        out.push({
          recipeName: recipe.name,
          ingredient: ing.name,
          matchedAllergen: a,
          via: 'substring',
        });
        break;
      }
    }
  }
  return out;
}
