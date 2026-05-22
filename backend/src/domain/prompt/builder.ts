/**
 * 추천 프롬프트 빌더.
 * - spec FR-011: 1인 가구·간편식·30분 이내·1식 기본
 * - plan §1.2: 한국어, LLM-agnostic 출력 JSON 강제
 * - 버전 문자열을 반환해 recommendation_requests.prompt_version 에 기록
 */
import type { LlmMessage } from '../../adapters/llm/types.js';

export const PROMPT_VERSION = 'p1-2026-05-22';

export interface PromptProfile {
  age?: number | null;
  gender?: string | null;
  goal?: 'lose_weight' | 'maintain' | 'gain_muscle' | null;
  target_calories_kcal?: number | null;
  allergies?: string[];
  diseases?: string[];
  prefer_categories?: string[];
  avoid_ingredients?: string[];
  cooking_time_max_min?: number;
}

export interface PromptInventory {
  raw_text: string;
  normalized?: string | null;
  quantity?: number | null;
  unit?: string | null;
  expires_in_days?: number | null; // <=2 면 우선 사용
}

export interface PromptOptions {
  preferenceHints?: { dislike_categories?: string[]; dislike_ingredients?: string[] };
  mealsPerPlan?: number; // 기본 1식
}

export interface BuiltPrompt {
  version: string;
  messages: LlmMessage[];
}

const SYSTEM = `당신은 한국 1인 가구의 식단을 추천하는 영양/조리 어시스턴트입니다.
출력은 반드시 아래 JSON 스키마를 따르고, 그 외의 텍스트는 절대 포함하지 마세요.

스키마:
{
  "recipes": [
    {
      "name": string,
      "description": string,
      "ingredients": [{ "name": string, "quantity": number, "unit": string, "substitute"?: string }],
      "steps": string[],
      "est_cooking_min": number,
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}

규칙:
1. 사용자가 제공한 식재료를 최대한 활용한다. 부족분만 보충 재료로 명시한다.
2. 사용자의 알레르기·기피 재료는 절대로 사용하지 않는다.
3. 1인분 분량으로 작성한다.
4. 조리 시간은 사용자가 지정한 cooking_time_max_min 이하로 한다.
5. 의학적 진단/처방을 제공하지 않는다. 정보 제공 목적임을 유지한다.
6. "[유통기한 임박 — 우선 사용]"으로 표시된 재료는 ingredients 배열의 상단(첫 1~2번째)에 반드시 포함시킨다 (priority: high).`;

function profileBlock(p: PromptProfile): string {
  const lines: string[] = [];
  if (p.age) lines.push(`- 나이: ${p.age}`);
  if (p.gender) lines.push(`- 성별: ${p.gender}`);
  if (p.goal) lines.push(`- 목표: ${p.goal}`);
  if (p.target_calories_kcal) lines.push(`- 목표 칼로리: ${p.target_calories_kcal} kcal/일`);
  if (p.allergies?.length) lines.push(`- 알레르기(절대 금지): ${p.allergies.join(', ')}`);
  if (p.diseases?.length) lines.push(`- 질병 이력: ${p.diseases.join(', ')}`);
  if (p.prefer_categories?.length) lines.push(`- 선호 카테고리: ${p.prefer_categories.join(', ')}`);
  if (p.avoid_ingredients?.length) lines.push(`- 기피 재료(피해야 함): ${p.avoid_ingredients.join(', ')}`);
  if (p.cooking_time_max_min) lines.push(`- 조리 시간 상한: ${p.cooking_time_max_min}분`);
  return lines.join('\n');
}

function inventoryBlock(items: PromptInventory[]): string {
  return items
    .map((it) => {
      const name = it.normalized || it.raw_text;
      const qty = it.quantity != null && it.unit ? ` (${it.quantity}${it.unit})` : '';
      const urgent = it.expires_in_days != null && it.expires_in_days <= 2 ? ' [유통기한 임박 — 우선 사용]' : '';
      return `- ${name}${qty}${urgent}`;
    })
    .join('\n');
}

export function buildRecommendationPrompt(
  profile: PromptProfile,
  inventory: PromptInventory[],
  options: PromptOptions = {},
): BuiltPrompt {
  const meals = options.mealsPerPlan ?? 1;
  const hints: string[] = [];
  if (options.preferenceHints?.dislike_categories?.length)
    hints.push(`최근 부정 피드백 카테고리(가급적 회피): ${options.preferenceHints.dislike_categories.join(', ')}`);
  if (options.preferenceHints?.dislike_ingredients?.length)
    hints.push(`최근 부정 피드백 재료(가급적 회피): ${options.preferenceHints.dislike_ingredients.join(', ')}`);

  const user = `프로필:
${profileBlock(profile) || '- (제공된 프로필 없음)'}

보유 식재료:
${inventoryBlock(inventory) || '- (없음)'}

요청: 위 식재료를 활용한 ${meals}식 레시피를 추천하라.
${hints.length ? '\n참고:\n' + hints.map((h) => '- ' + h).join('\n') : ''}`;

  return {
    version: PROMPT_VERSION,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: user },
    ],
  };
}
