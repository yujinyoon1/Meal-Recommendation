<script lang="ts">
// 메뉴명 → 자동 검색 결과 URL 캐시. 모듈 스코프 = 모든 카드 인스턴스가 공유(중복 요청 방지).
const searchCache = new Map<string, string | null>();

const KO_API = 'https://ko.wikipedia.org/w/api.php';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const THUMB = '720';

const despace = (s: string) => s.replace(/\s+/g, '');

// 동의어 정규화 — 같은 재료의 다른 표기를 하나로. (예: 달걀=계란) 매칭 비교 시 사용.
const SYNONYMS: Array<[RegExp, string]> = [[/달걀/g, '계란']];
function canon(s: string): string {
  let x = despace(s);
  for (const [re, to] of SYNONYMS) x = x.replace(re, to);
  return x;
}

// 메뉴명 → 손수 고른 Wikimedia Commons 사진(파일명). 자동 검색보다 항상 우선 — 가장 예쁜/정확한 사진.
// ('토마토 계란 볶음'은 제외 — 위키 '토마토달걀볶음' article 사진을 자동으로 쓰도록.)
const CURATED: Record<string, string> = {
  '두부 계란 양파볶음': 'Korean cuisine-Dubu jorim-01.jpg',
  '닭가슴살 브로콜리 마늘볶음': 'Chicken breast, roast broccoli, and celery - Massachusetts.jpg',
  '애호박 새우젓 볶음': 'Saeu-aehobak-bokkeum.jpg',
  '현미 계란 볶음밥': 'Egg Fried Rice.jpg',
  '두부 된장국': 'KOCIS doenjangguk, Soybean Paste Soup (4556778160).jpg',
};
// 공백/동의어 차이(예: '달걀'↔'계란')가 있어도 매칭되도록 canon 키로 조회.
const CURATED_CANON = new Map<string, string>(
  Object.entries(CURATED).map(([k, v]) => [canon(k), v]),
);
function curatedUrl(name: string): string | null {
  const file = CURATED_CANON.get(canon(name));
  return file
    ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=720`
    : null;
}

// 요리 종류(완성요리 카테고리) 단어. 길이순 정렬(긴 것 우선 매칭)로 메뉴명 끝에서 종류를 식별.
// 핵심: '재료'가 아니라 '요리 종류'로 검색해 완성요리 사진을 얻는다.
//  예) 현미 계란 볶음밥 → '볶음밥'(볶음밥 사진), 닭가슴살 …마늘볶음 → '볶음'(볶음요리 사진)
const DISH_TYPES = [
  '볶음밥', '비빔밥', '주먹밥', '국밥', '덮밥', '초밥', '김밥', '볶음면', '비빔면',
  '김치찌개', '된장찌개', '순두부찌개', '부대찌개', '계란말이', '달걀말이', '오므라이스',
  '오믈렛', '샌드위치', '샐러드', '파스타', '리소토', '칼국수', '수제비', '국수', '라면',
  '만두', '볶음', '찌개', '전골', '조림', '구이', '무침', '나물', '튀김', '부침',
  '비빔국수', '잔치국수', '불고기', '떡볶이', '잡채', '감바스', '팟타이', '스테이크',
  '찜', '죽', '탕', '국', '면', '말이', '카레', '커리', '수프', '스프', '쌈', '전', '밥',
].sort((a, b) => b.length - a.length);

function detectDishType(name: string): string | null {
  const d = despace(name);
  return DISH_TYPES.find((t) => d.length > t.length && d.endsWith(t)) ?? null;
}
function titleIsDish(title: string): boolean {
  const t = despace(title);
  return DISH_TYPES.some((dt) => t === dt || t.endsWith(dt));
}

// 한국어 재료 → 영어. Commons 사진 검색은 영어 매칭이 훨씬 정확하다.
const ING_EN: Record<string, string> = {
  닭가슴살: 'chicken', 닭고기: 'chicken', 닭: 'chicken', 돼지고기: 'pork', 삼겹살: 'pork belly',
  소고기: 'beef', 쇠고기: 'beef', 두부: 'tofu', 계란: 'egg', 달걀: 'egg', 양파: 'onion',
  대파: 'green onion', 마늘: 'garlic', 브로콜리: 'broccoli', 당근: 'carrot', 감자: 'potato',
  고구마: 'sweet potato', 버섯: 'mushroom', 시금치: 'spinach', 애호박: 'zucchini', 가지: 'eggplant',
  토마토: 'tomato', 오이: 'cucumber', 배추: 'cabbage', 무: 'radish', 콩나물: 'bean sprout',
  숙주: 'bean sprout', 김치: 'kimchi', 현미: 'brown rice', 새우젓: 'shrimp', 새우: 'shrimp',
  오징어: 'squid', 고등어: 'mackerel', 연어: 'salmon', 참치: 'tuna', 들깨: 'perilla',
  고추: 'chili pepper', 피망: 'bell pepper', 파프리카: 'bell pepper', 채소: 'vegetable',
  야채: 'vegetable', 미역: 'seaweed', 떡: 'rice cake', 치즈: 'cheese', 햄: 'ham', 옥수수: 'corn',
  순두부: 'soft tofu', 당면: 'glass noodle', 소면: 'somen noodle', 쌀국수: 'rice noodle',
  양상추: 'lettuce', 어묵: 'fish cake', 된장: 'soybean paste', 소시지: 'sausage',
  단호박: 'pumpkin', 오트밀: 'oatmeal', 바나나: 'banana',
  아스파라거스: 'asparagus', 방울토마토: 'cherry tomato', 견과류: 'nuts',
};
// 한국어 요리 종류 → 영어.
const TYPE_EN: Record<string, string> = {
  볶음밥: 'fried rice', 비빔밥: 'bibimbap', 김밥: 'gimbap', 덮밥: 'rice bowl', 국밥: 'rice soup',
  주먹밥: 'rice ball', 볶음면: 'fried noodle', 볶음: 'stir fry', 김치찌개: 'kimchi stew',
  된장찌개: 'soybean paste stew', 순두부찌개: 'soft tofu stew', 부대찌개: 'army stew',
  찌개: 'stew', 전골: 'hot pot', 조림: 'braised', 구이: 'grilled', 무침: 'seasoned salad',
  나물: 'namul', 튀김: 'fritter', 부침: 'pancake', 찜: 'steamed', 죽: 'porridge', 탕: 'soup',
  국: 'soup', 국수: 'noodle soup', 칼국수: 'noodle soup', 면: 'noodle', 만두: 'dumpling',
  계란말이: 'rolled omelette', 달걀말이: 'rolled omelette', 오믈렛: 'omelette', 오므라이스: 'omurice',
  샌드위치: 'sandwich', 샐러드: 'salad', 파스타: 'pasta', 리소토: 'risotto', 카레: 'curry',
  커리: 'curry', 수프: 'soup', 스프: 'soup', 수제비: 'sujebi', 라면: 'ramen',
  비빔국수: 'bibim guksu spicy noodle', 잔치국수: 'janchi guksu noodle soup', 불고기: 'bulgogi',
  떡볶이: 'tteokbokki', 잡채: 'japchae', 감바스: 'gambas al ajillo garlic shrimp', 팟타이: 'pad thai',
  스테이크: 'steak',
};
const ING_KEYS = Object.keys(ING_EN).sort((a, b) => b.length - a.length); // 긴 재료명 우선(닭가슴살 > 닭)

// 메뉴명 → 영어 Commons 검색어. 예) '닭가슴살 브로콜리 마늘볶음' → 'chicken broccoli garlic stir fry'
function buildEnglishQuery(name: string): string {
  const d = despace(name);
  const koType = detectDishType(name);
  const enType = koType ? TYPE_EN[koType] ?? '' : '';
  const ings: string[] = [];
  for (const ko of ING_KEYS) {
    if (!d.includes(ko)) continue;
    const en = ING_EN[ko];
    if (ings.includes(en) || (enType && enType.includes(en))) continue; // 종류와 중복(예: rice)되면 생략
    ings.push(en);
    if (ings.length >= 3) break;
  }
  return [...ings, enType].filter(Boolean).join(' ').trim();
}

// ko.wikipedia: 쿼리에 대한 대표 article 의 대표 사진 + 제목.
async function koLeadImage(query: string): Promise<{ title: string; url: string } | null> {
  const params = new URLSearchParams({
    action: 'query', format: 'json', prop: 'pageimages', piprop: 'thumbnail',
    pithumbsize: THUMB, generator: 'search', gsrsearch: query, gsrlimit: '1', origin: '*',
  });
  const res = await fetch(`${KO_API}?${params.toString()}`);
  const data = await res.json();
  const pages = Object.values(data?.query?.pages ?? {}) as Array<{
    title?: string; thumbnail?: { source?: string };
  }>;
  const p = pages[0];
  return p?.thumbnail?.source ? { title: p.title ?? '', url: p.thumbnail.source } : null;
}

// Wikimedia Commons: 쿼리로 파일 검색 → 최상위 비트맵 사진(jpg/png) 1건.
// avoid: 제목에 포함되면 건너뛸 단어(예: 밥 요리가 아닐 때 'rice' 사진 배제).
async function commonsImage(query: string, avoid?: RegExp): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'query', format: 'json', generator: 'search', gsrnamespace: '6',
    gsrsearch: query, gsrlimit: '12', prop: 'imageinfo', iiprop: 'url|mediatype',
    iiurlwidth: THUMB, origin: '*',
  });
  const res = await fetch(`${COMMONS_API}?${params.toString()}`);
  const data = await res.json();
  const pages = (Object.values(data?.query?.pages ?? {}) as Array<{
    index?: number; title?: string;
    imageinfo?: Array<{ mediatype?: string; thumburl?: string; url?: string }>;
  }>).sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    const title = (p.title ?? '').toLowerCase();
    if (ii?.mediatype !== 'BITMAP' || !/\.(jpe?g|png)$/.test(title)) continue;
    if (avoid && avoid.test(title)) continue; // 의도와 다른 종류(예: 밥) 배제
    return ii.thumburl ?? ii.url ?? null;
  }
  return null;
}

// 메뉴의 '완성요리' 사진을 찾는다 (재료 사진이 아니라 요리 사진). API 키 불필요, origin=* CORS.
//  1) 메뉴명 전체 = 정식 한국 요리명이면 그 요리 사진 (예: 비빔밥, 김치찌개, 채소국, 볶음밥)
//  2) 마지막 토큰이 그 자체로 요리면 그 요리 사진 (예: '…채소국' → 채소국)
//  3) 재료·종류를 영어로 바꿔 Commons 검색 → 주재료가 맞는 완성요리 사진
//     (예: '닭가슴살 브로콜리 마늘볶음' → 'chicken broccoli garlic stir fry')  ← 합성 메뉴의 핵심 경로
//  4) 영어 '요리 종류'만으로 Commons 검색 (예: 'stir fry', 'fried rice')
//  5) 모두 실패하면 null (이모지 최후 폴백)
async function searchFoodImage(name: string): Promise<string | null> {
  // 0) 손수 고른 사진이 있으면 검색 없이 그대로 사용 (예: 닭가슴살 브로콜리 마늘볶음).
  const curated = curatedUrl(name);
  if (curated) return curated;
  if (searchCache.has(name)) return searchCache.get(name) ?? null;
  const m = canon(name); // 달걀=계란 등 동의어 통일
  const lastToken = name.split(/\s+/).filter(Boolean).pop() ?? '';
  const koType = detectDishType(name);
  const enType = koType ? TYPE_EN[koType] ?? '' : '';
  let url: string | null = null;
  try {
    // 1) 전체명이 정식 요리 article 과 (거의) 일치할 때만 채택 — 무관한 1순위를 배제.
    //    동의어 통일로 '토마토 계란 볶음' ↔ 위키 '토마토달걀볶음' 도 매칭됨.
    const full = await koLeadImage(name);
    if (full) {
      const t = canon(full.title);
      if (t === m || (m.includes(t) && t.length >= 2 && titleIsDish(full.title))) url = full.url;
    }
    // 2) 마지막 토큰이 그 자체로 요리명인 경우 (예: 채소국, 볶음밥)
    if (!url && lastToken && canon(lastToken) !== m) {
      const hit = await koLeadImage(lastToken);
      if (hit && canon(hit.title) === canon(lastToken) && titleIsDish(hit.title)) url = hit.url;
    }
    // 밥/면 등 탄수화물 주식 요리가 아니면, 검색 결과에서 'rice/볶음밥' 사진을 배제
    // (예: '두부 계란 양파볶음'에 볶음밥 사진이 들어가는 문제 방지).
    const isRiceDish = /rice|밥|bibimbap|risotto|paella/.test(`${enType} ${name}`.toLowerCase());
    const avoidRice = isRiceDish ? undefined : /rice|볶음밥|bibimbap|risotto|paella|fried\s*rice/;

    // 3) KO→EN Commons 검색 (재료 + 종류) — 주재료가 맞는 완성요리 사진
    if (!url) {
      const enQuery = buildEnglishQuery(name);
      if (enQuery) url = await commonsImage(enQuery, avoidRice);
    }
    // 4) 영어 요리 종류만으로 Commons (덜 구체적이지만 완성요리)
    if (!url && enType) {
      url = await commonsImage(enType, avoidRice);
    }
  } catch { /* 네트워크/파싱 실패 → url 유지(폴백) */ }
  searchCache.set(name, url);
  return url;
}
</script>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import AppCard from '@/components/ui/AppCard.vue';
import AppBadge from '@/components/ui/AppBadge.vue';
import type { Recipe } from '@/stores/recommendation';
import { useBookmarkStore } from '@/stores/bookmarks';

const props = defineProps<{ recipe: Recipe; index: number }>();

const bookmarks = useBookmarkStore();
onMounted(() => { bookmarks.ensureLoaded().catch(() => {}); });

const canBookmark = computed(() => props.recipe.id != null);
const isBookmarked = computed(() => bookmarks.has(props.recipe.id));
const bookmarkPending = computed(() => bookmarks.isPending(props.recipe.id));
function toggleBookmark() { bookmarks.toggle(props.recipe).catch(() => {}); }

const showSteps = ref(true);
const imgError = ref(false);
const loading = ref(false);
// 메뉴명 자동 검색으로 찾은 이미지 URL.
const fetchedUrl = ref<string | null>(null);

const imageUrl = computed(() => fetchedUrl.value);

// 메뉴가 정해지거나 바뀌면 메뉴명으로 음식 사진을 자동 검색.
watch(
  () => props.recipe.name,
  async (name) => {
    imgError.value = false;
    fetchedUrl.value = null;
    loading.value = true;
    fetchedUrl.value = await searchFoodImage(name);
    loading.value = false;
  },
  { immediate: true },
);
</script>

<template>
  <AppCard
    variant="default"
    padding="lg"
    :accent="index === 0"
  >
    <figure class="recipe-photo">
      <img
        v-if="imageUrl && !imgError"
        :src="imageUrl"
        :alt="`${recipe.name} 예상 완성 이미지`"
        loading="lazy"
        @error="imgError = true"
      >
      <div
        v-else-if="loading"
        class="recipe-photo__loading"
        aria-label="사진 검색 중"
      />
      <div
        v-else
        class="recipe-photo__fallback"
      >
        <span class="recipe-photo__emoji">🍳</span>
        <span class="recipe-photo__name">{{ recipe.name }}</span>
      </div>
      <figcaption class="recipe-photo__cap">예상 완성 이미지</figcaption>
    </figure>

    <header class="recipe-head">
      <div class="recipe-head__top">
        <span class="recipe-head__eyebrow">Recipe {{ index + 1 }}</span>
        <button
          v-if="canBookmark"
          type="button"
          class="bookmark"
          :class="{ 'is-on': isBookmarked }"
          :disabled="bookmarkPending"
          :aria-pressed="isBookmarked"
          :title="isBookmarked ? '북마크 해제' : '레시피 저장'"
          @click="toggleBookmark"
        >
          <span
            class="bookmark__icon"
            aria-hidden="true"
          >{{ isBookmarked ? '★' : '☆' }}</span>
          <span class="bookmark__label">{{ isBookmarked ? '저장됨' : '저장' }}</span>
        </button>
      </div>
      <h3 class="recipe-head__name">
        {{ recipe.name }}
      </h3>
      <div class="recipe-head__meta">
        <AppBadge
          tone="neutral"
          variant="solid"
        >
          {{ recipe.est_cooking_min }}분
        </AppBadge>
        <AppBadge
          :tone="recipe.difficulty === 'hard' ? 'red' : 'accent'"
          variant="solid"
        >
          {{ recipe.difficulty }}
        </AppBadge>
      </div>
      <p
        v-if="recipe.description"
        class="recipe-head__desc"
      >
        {{ recipe.description }}
      </p>
    </header>

    <section class="ingredients">
      <span class="section-eyebrow">재료</span>
      <ul>
        <li
          v-for="(ing, i) in recipe.ingredients"
          :key="i"
        >
          <span class="ing__name">{{ ing.name }}</span>
          <span class="ing__qty">{{ ing.quantity }} {{ ing.unit }}</span>
          <span
            v-if="ing.substitute"
            class="ing__sub"
          >↔ {{ ing.substitute }}</span>
        </li>
      </ul>
    </section>

    <section class="steps">
      <button
        class="steps__toggle"
        @click="showSteps = !showSteps"
      >
        <span class="section-eyebrow">조리 순서</span>
        <span
          class="steps__chevron"
          :class="{ open: showSteps }"
          aria-hidden="true"
        >▾</span>
      </button>
      <ol v-if="showSteps">
        <li
          v-for="(s, i) in recipe.steps"
          :key="i"
        >
          {{ s }}
        </li>
      </ol>
    </section>
  </AppCard>
</template>

<style scoped>
.recipe-photo {
  position: relative;
  /* 0.5배 — 카드 폭의 절반, 가운데 정렬 */
  max-width: 50%;
  margin: 0 auto var(--space-md);
  border-radius: var(--radius-lg, 16px);
  overflow: hidden;
  aspect-ratio: 16 / 10;
  background: var(--color-surface-soft);
}
@media (max-width: 560px) {
  .recipe-photo { max-width: 70%; }
}
.recipe-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.recipe-photo__fallback {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  background: linear-gradient(135deg, var(--color-primary-pale), var(--color-canvas-soft));
}
.recipe-photo__loading {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    100deg,
    var(--color-surface-soft) 30%,
    var(--color-canvas-soft) 50%,
    var(--color-surface-soft) 70%
  );
  background-size: 200% 100%;
  animation: recipe-shimmer 1.2s ease-in-out infinite;
}
@keyframes recipe-shimmer {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}
.recipe-photo__emoji { font-size: 44px; line-height: 1; }
.recipe-photo__name { font-weight: var(--fw-semibold); color: var(--color-ink-deep); }
.recipe-photo__cap {
  position: absolute;
  left: 10px;
  bottom: 10px;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: var(--fs-caption);
  letter-spacing: 0.02em;
}
.recipe-head { display: flex; flex-direction: column; gap: var(--space-sm); }
.recipe-head__top { display: flex; align-items: center; justify-content: space-between; gap: var(--space-sm); }
.bookmark {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-body);
  font-size: var(--fs-body-sm);
  font-weight: var(--fw-semibold);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  white-space: nowrap;
}
.bookmark:hover:not(:disabled) { border-color: var(--color-ink-deep); color: var(--color-ink-deep); }
.bookmark:disabled { opacity: 0.55; cursor: default; }
.bookmark__icon { font-size: 16px; line-height: 1; }
.bookmark.is-on {
  background: var(--color-primary-pale);
  border-color: var(--color-primary-neutral);
  color: var(--color-ink-deep);
}
.bookmark.is-on .bookmark__icon { color: var(--color-warning, #e0a800); }
.recipe-head__eyebrow {
  font-size: var(--fs-caption);
  font-weight: var(--fw-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-muted);
}
.recipe-head__name {
  font-family: var(--font-display);
  font-size: var(--fs-display-sm);
  font-weight: var(--fw-display);
  letter-spacing: -0.015em;
  line-height: 1.15;
  color: var(--color-ink);
  text-transform: none;
  margin: 0;
}
.recipe-head__meta { display: flex; gap: var(--space-xs); flex-wrap: wrap; }
.recipe-head__desc {
  color: var(--color-body);
  font-size: var(--fs-body);
  line-height: 1.55;
  margin: 0;
}

.section-eyebrow {
  font-size: var(--fs-caption);
  font-weight: var(--fw-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-muted);
}

.ingredients,
.steps {
  border-top: 1px solid var(--color-hairline);
  padding-top: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
.ingredients ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ingredients li {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: var(--space-sm);
  color: var(--color-body);
  font-size: var(--fs-body-sm);
  align-items: baseline;
}
.ing__name { color: var(--color-ink); font-weight: var(--fw-semibold); }
.ing__qty { color: var(--color-muted); font-variant-numeric: tabular-nums; }
.ing__sub { color: var(--color-ink-deep); font-size: var(--fs-caption); }

.steps__toggle {
  background: none;
  border: none;
  color: var(--color-ink);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  width: 100%;
}
.steps__chevron {
  transition: transform 120ms ease;
  color: var(--color-muted);
  font-size: 14px;
}
.steps__chevron.open { transform: rotate(180deg); }
.steps ol {
  padding-left: 1.25rem;
  margin: 0;
  color: var(--color-body);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  line-height: 1.55;
}
</style>
