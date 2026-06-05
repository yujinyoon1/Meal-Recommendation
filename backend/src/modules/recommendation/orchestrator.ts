/**
 * 추천 오케스트레이터 — spec FR-010~017 골든 패스.
 *
 *  1) 프로필/인벤토리 스냅샷 로드
 *  2) prompt builder
 *  3) LLM 호출 (timeout 25s, retries 1)
 *  4) 알레르기 검증 (위반 시 재시도 1회, 재위반 시 status=rejected)
 *  5) 영양 계산
 *  6) recommendation_requests / recipes / meal_plans / nutrition_analyses 저장
 *  7) disclaimer 포함 응답
 */
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../../db/pool.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../middleware/errorHandler.js';
import { getLlm, LlmError } from '../../adapters/llm/index.js';
import { lookupFood } from '../../adapters/nutrition/foodLookup.js';
import {
  buildRecommendationPrompt,
  PROMPT_VERSION,
  type PromptProfile,
  type PromptInventory,
} from '../../domain/prompt/builder.js';
import { detectAllergyViolations, type AliasMap } from '../../domain/validator/allergy.js';
import { calculateNutrition, type NutritionInput } from '../../domain/nutrition/calculator.js';
import { aggregateHints } from '../../domain/prompt/preferenceHints.js';
import { getCurrent as getBasic } from '../users/basicProfile.service.js';
import { getCurrent as getHealth } from '../users/healthProfile.service.js';
import { getCurrent as getDiet } from '../users/dietPreference.service.js';
import { list as listInventory } from '../inventory/service.js';
import { cacheKey, lookup as cacheLookup, store as cacheStore } from './cache.js';

const DISCLAIMER =
  '본 추천은 정보 제공 목적이며 의학적 진단/처방이 아닙니다. 알레르기·기저질환이 있으면 전문의와 상담하세요.';

export interface RecipeOut {
  id?: number; // DB 저장 후/조회 시 채워짐. LLM 파싱 단계에서는 없음.
  name: string;
  description?: string;
  ingredients: Array<{ name: string; quantity: number; unit: string; substitute?: string }>;
  steps: string[];
  est_cooking_min: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface RecommendationResult {
  recommendation_id: number;
  status: 'validated' | 'rejected' | 'failed';
  recipes: RecipeOut[];
  nutrition: {
    total_kcal: number;
    carb_g: number;
    protein_g: number;
    fat_g: number;
    fiber_g: number;
    sodium_mg: number;
    rda_ratio: Record<string, number>;
    confidence: 'high' | 'medium' | 'low';
  } | null;
  warnings: string[];
  disclaimer: string;
}

interface AliasRow extends RowDataPacket {
  alias: string;
  name_ko: string;
}

async function loadAliasMap(): Promise<AliasMap> {
  const [rows] = await pool.query<AliasRow[]>(
    'SELECT a.alias, f.name_ko FROM ingredient_alias a JOIN foods f ON f.id = a.food_id',
  );
  const m: AliasMap = {};
  for (const r of rows) m[r.alias] = r.name_ko;
  return m;
}

function parseLlmJson(text: string): { recipes: RecipeOut[] } {
  try {
    const obj = JSON.parse(text);
    if (!obj || !Array.isArray(obj.recipes)) throw new Error('missing recipes[]');
    return obj as { recipes: RecipeOut[] };
  } catch (e) {
    throw new AppError('LLM_PARSE_ERROR', 'failed to parse LLM JSON', 502, {
      preview: text.slice(0, 200),
      cause: (e as Error).message,
    });
  }
}

async function callLlm(messages: ReturnType<typeof buildRecommendationPrompt>['messages']) {
  const llm = getLlm();
  return llm.complete(messages, { timeoutMs: env.LLM_TIMEOUT_MS, jsonMode: true });
}

export async function generate(
  userId: number,
  opts: { itemIds?: number[] } = {},
): Promise<RecommendationResult> {
  // 1) 스냅샷 로드
  const [basic, health, diet, allInventory] = await Promise.all([
    getBasic(userId),
    getHealth(userId),
    getDiet(userId),
    listInventory(userId, { onlyActive: true }),
  ]);

  // 선택한 재료(itemIds)가 있으면 그것만 사용 — 체크한 재료로 레시피 만들기.
  let inventory = allInventory;
  if (opts.itemIds && opts.itemIds.length > 0) {
    const sel = new Set(opts.itemIds);
    inventory = allInventory.filter((it) => sel.has(it.id));
  }

  if (inventory.length === 0) {
    throw new AppError('EMPTY_INVENTORY', '식재료를 먼저 입력해 주세요.', 400);
  }

  const promptProfile: PromptProfile = {
    age: basic?.bmi ? null : basic?.age ?? null, // dummy: age 자체 사용
    gender: basic?.gender ?? null,
    goal: health?.goal as PromptProfile['goal'],
    target_calories_kcal: health?.target_calories_kcal ?? null,
    allergies: health?.allergies ?? [],
    diseases: health?.diseases ?? [],
    prefer_categories: diet?.prefer_categories ?? [],
    avoid_ingredients: diet?.avoid_ingredients ?? [],
    cooking_time_max_min: diet?.cooking_time_max_min ?? 30,
  };
  promptProfile.age = basic?.age ?? null;

  const promptInventory: PromptInventory[] = inventory.map((it) => ({
    raw_text: it.raw_text,
    normalized: it.normalized,
    quantity: it.quantity,
    unit: it.unit,
    expires_in_days: it.expires_at
      ? Math.ceil((new Date(it.expires_at).getTime() - Date.now()) / (24 * 3600 * 1000))
      : null,
  }));

  const profileVersion = `bp:${basic?.bmi ?? ''}|hp:${(health?.allergies ?? []).join(',')}|dp:${diet?.cooking_time_max_min ?? 30}`;
  const inventoryNorm = inventory.map((it) => `${it.normalized ?? it.raw_text}@${it.quantity ?? ''}${it.unit ?? ''}`);
  const ckey = cacheKey(userId, inventoryNorm, profileVersion);

  // 캐시 확인
  const cachedId = await cacheLookup(ckey);
  if (cachedId) {
    const cached = await loadResult(cachedId);
    if (cached) return cached;
  }

  // 2) prompt — 최근 30일 부정 피드백 힌트 주입 (FR-019)
  const hints = await aggregateHints(userId);
  const prompt = buildRecommendationPrompt(promptProfile, promptInventory, {
    preferenceHints: hints,
  });

  // 3) LLM 호출 + 4) 알레르기 검증 (재시도 1회)
  const aliasMap = await loadAliasMap();
  const llm = getLlm();
  let violations: ReturnType<typeof detectAllergyViolations> = [];
  let parsed: { recipes: RecipeOut[] } | null = null;
  let lastLatency = 0;
  let lastModel = '';
  let status: 'validated' | 'rejected' | 'failed' = 'failed';
  let failureReason: string | null = null;

  for (let attempt = 0; attempt < 1 + (env.LLM_RETRIES > 0 ? 1 : 0); attempt++) {
    try {
      const r = await callLlm(prompt.messages);
      lastLatency = r.latencyMs;
      lastModel = r.model;
      parsed = parseLlmJson(r.text);
    } catch (e) {
      if (e instanceof LlmError) {
        failureReason = `${e.code}: ${e.message}`.slice(0, 240);
        logger.warn({ err: e, attempt }, 'llm call failed');
        if (attempt === 0) continue; // 재시도
        break;
      }
      throw e;
    }

    violations = parsed.recipes.flatMap((r) =>
      detectAllergyViolations(
        { name: r.name, ingredients: r.ingredients ?? [] },
        promptProfile.allergies ?? [],
        aliasMap,
      ),
    );

    if (violations.length === 0) {
      status = 'validated';
      break;
    }
    // 위반 시 재시도 1회 (forced via prompt 강화 — 동일 prompt + warning prefix)
    if (attempt === 0) {
      prompt.messages.push({
        role: 'system',
        content: '직전 응답에 사용자 알레르기 위반이 있었습니다. 다른 재료로 재작성하세요.',
      });
      continue;
    }
    status = 'rejected';
    failureReason = `allergy_violation:${violations.map((v) => v.matchedAllergen).join(',')}`;
  }

  if (!parsed || status === 'failed') {
    // 6) 실패도 기록
    const id = await persistRequest(userId, {
      profileSnapshot: promptProfile,
      inventorySnapshot: inventory,
      promptVersion: PROMPT_VERSION,
      provider: llm.provider,
      model: lastModel,
      latencyMs: lastLatency,
      status: 'failed',
      failureReason,
    });
    throw new AppError('LLM_FAILED', failureReason ?? 'LLM call failed', 502, { recommendation_id: id });
  }

  // 5) 영양 계산
  const nutritionInputs: NutritionInput[] = [];
  for (const r of parsed.recipes) {
    for (const ing of r.ingredients ?? []) {
      const m = await lookupFood(ing.name);
      nutritionInputs.push({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        matched: m.food_id != null,
        kcal_per_100g: m.kcal_per_100g,
        carb_g: m.carb_g,
        protein_g: m.protein_g,
        fat_g: m.fat_g,
        fiber_g: m.fiber_g,
        sodium_mg: m.sodium_mg,
      });
    }
  }
  const nutrition = calculateNutrition(nutritionInputs, promptProfile.target_calories_kcal ?? null);

  // 6) 저장
  const recommendationId = await persistRequest(userId, {
    profileSnapshot: promptProfile,
    inventorySnapshot: inventory,
    promptVersion: PROMPT_VERSION,
    provider: llm.provider,
    model: lastModel,
    latencyMs: lastLatency,
    status,
    failureReason,
  });

  await persistArtifacts(recommendationId, parsed.recipes, nutrition);
  await cacheStore(ckey, recommendationId);

  // 7) 응답
  const warnings = violations.length
    ? [`알레르기 위반 검출 — 재시도 후 ${status === 'validated' ? '해소됨' : '재현됨'}.`]
    : [];

  return {
    recommendation_id: recommendationId,
    status,
    recipes: parsed.recipes,
    nutrition: status === 'validated' ? {
      total_kcal: nutrition.total_kcal,
      carb_g: nutrition.carb_g,
      protein_g: nutrition.protein_g,
      fat_g: nutrition.fat_g,
      fiber_g: nutrition.fiber_g,
      sodium_mg: nutrition.sodium_mg,
      rda_ratio: nutrition.rda_ratio as unknown as Record<string, number>,
      confidence: nutrition.confidence,
    } : null,
    warnings,
    disclaimer: DISCLAIMER,
  };
}

interface PersistInput {
  profileSnapshot: PromptProfile;
  inventorySnapshot: unknown;
  promptVersion: string;
  provider: string;
  model: string;
  latencyMs: number;
  status: 'pending' | 'generated' | 'validated' | 'rejected' | 'failed';
  failureReason: string | null;
}

async function persistRequest(userId: number, p: PersistInput): Promise<number> {
  const [res] = await pool.query<ResultSetHeader>(
    `INSERT INTO recommendation_requests
       (user_id, profile_snapshot_json, inventory_snapshot_json, prompt_version,
        llm_provider, llm_model, llm_latency_ms, status, failure_reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      JSON.stringify(p.profileSnapshot),
      JSON.stringify(p.inventorySnapshot),
      p.promptVersion,
      p.provider,
      p.model,
      p.latencyMs,
      p.status,
      p.failureReason,
    ],
  );
  return res.insertId;
}

async function persistArtifacts(
  recommendationId: number,
  recipes: RecipeOut[],
  nutrition: ReturnType<typeof calculateNutrition>,
) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [plan] = await conn.query<ResultSetHeader>(
      'INSERT INTO meal_plans (recommendation_id, label, sequence) VALUES (?, ?, ?)',
      [recommendationId, '1식', 1],
    );

    for (const r of recipes) {
      const [recipe] = await conn.query<ResultSetHeader>(
        `INSERT INTO recipes (name, description, ingredients_json, steps_json, est_cooking_min, difficulty)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          r.name,
          r.description ?? null,
          JSON.stringify(r.ingredients ?? []),
          JSON.stringify(r.steps ?? []),
          r.est_cooking_min ?? null,
          r.difficulty ?? 'easy',
        ],
      );
      await conn.query(
        'INSERT INTO meal_plan_recipes (meal_plan_id, recipe_id, serving_count) VALUES (?, ?, ?)',
        [plan.insertId, recipe.insertId, 1.0],
      );
      r.id = recipe.insertId; // 생성 직후 응답에도 recipe id 를 실어 보내 북마크 가능하게.
    }

    await conn.query(
      `INSERT INTO nutrition_analyses
         (recommendation_id, total_kcal, carb_g, protein_g, fat_g, fiber_g, sodium_mg, rda_ratio_json, confidence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recommendationId,
        nutrition.total_kcal,
        nutrition.carb_g,
        nutrition.protein_g,
        nutrition.fat_g,
        nutrition.fiber_g,
        nutrition.sodium_mg,
        JSON.stringify(nutrition.rda_ratio),
        nutrition.confidence,
      ],
    );

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

interface RecRow extends RowDataPacket {
  id: number;
  status: 'pending' | 'generated' | 'validated' | 'rejected' | 'failed';
}
interface RecipeRow extends RowDataPacket {
  id: number;
  name: string;
  description: string | null;
  ingredients_json: RecipeOut['ingredients'];
  steps_json: string[];
  est_cooking_min: number | null;
  difficulty: 'easy' | 'medium' | 'hard';
}
interface NutritionRow extends RowDataPacket {
  total_kcal: string;
  carb_g: string;
  protein_g: string;
  fat_g: string;
  fiber_g: string;
  sodium_mg: string;
  rda_ratio_json: Record<string, number>;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * MariaDB JSON 컬럼(LONGTEXT)은 mysql2가 문자열로 반환할 수 있다.
 * 문자열이면 파싱하고, 이미 객체/배열이면 그대로 반환한다.
 * (이걸 안 하면 프론트에서 steps 문자열을 v-for로 순회해 "한 글자씩" 표시됨)
 */
function parseJsonColumn<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return v as T;
}

export async function loadResult(recommendationId: number): Promise<RecommendationResult | null> {
  const [recRows] = await pool.query<RecRow[]>(
    'SELECT id, status FROM recommendation_requests WHERE id = ? LIMIT 1',
    [recommendationId],
  );
  const rec = recRows[0];
  if (!rec) return null;

  const [recipeRows] = await pool.query<RecipeRow[]>(
    `SELECT r.id, r.name, r.description, r.ingredients_json, r.steps_json, r.est_cooking_min, r.difficulty
       FROM meal_plans mp
       JOIN meal_plan_recipes mpr ON mpr.meal_plan_id = mp.id
       JOIN recipes r ON r.id = mpr.recipe_id
      WHERE mp.recommendation_id = ?`,
    [recommendationId],
  );
  const [nutRows] = await pool.query<NutritionRow[]>(
    'SELECT total_kcal, carb_g, protein_g, fat_g, fiber_g, sodium_mg, rda_ratio_json, confidence FROM nutrition_analyses WHERE recommendation_id = ? LIMIT 1',
    [recommendationId],
  );
  const n = nutRows[0];

  return {
    recommendation_id: rec.id,
    status: rec.status === 'pending' || rec.status === 'generated' ? 'validated' : rec.status,
    recipes: recipeRows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? undefined,
      ingredients: parseJsonColumn(r.ingredients_json, [] as RecipeOut['ingredients']),
      steps: parseJsonColumn(r.steps_json, [] as string[]),
      est_cooking_min: r.est_cooking_min ?? 0,
      difficulty: r.difficulty,
    })),
    nutrition: n ? {
      total_kcal: Number(n.total_kcal),
      carb_g: Number(n.carb_g),
      protein_g: Number(n.protein_g),
      fat_g: Number(n.fat_g),
      fiber_g: Number(n.fiber_g),
      sodium_mg: Number(n.sodium_mg),
      rda_ratio: parseJsonColumn(n.rda_ratio_json, {} as Record<string, number>),
      confidence: n.confidence,
    } : null,
    warnings: [],
    disclaimer: DISCLAIMER,
  };
}
