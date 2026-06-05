<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api } from '@/api/client';
import AppCard from '@/components/ui/AppCard.vue';
import AppBadge from '@/components/ui/AppBadge.vue';
import AppButton from '@/components/ui/AppButton.vue';

interface Item {
  id: number;
  food_id: number | null;
  name: string;
  category: string | null;
  reason: string;
  suggested_qty: string;
  priority_score: number;
}
interface MissingIngredient {
  name: string;
  suggested_qty: string;
}
interface Response {
  recommendation_id: number;
  generated: boolean;
  warnings: string[];
  items: Item[];
  missing_ingredients: MissingIngredient[];
}

const props = defineProps<{ recommendationId: number }>();

const data = ref<Response | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const copied = ref(false);

// 레시피에 필요하지만 재고에 없는 재료 (백엔드가 food_id 기준으로 계산).
const missing = computed<MissingIngredient[]>(() => data.value?.missing_ingredients ?? []);

// 패널 헤더 품목 수 = 없는 재료 + 영양 보충 추천.
const totalCount = computed(() => missing.value.length + (data.value?.items.length ?? 0));

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const { data: resp } = await api.get<Response>(`/recommendations/${props.recommendationId}/shopping-list`);
    data.value = resp;
  } catch (e: unknown) {
    error.value = (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '장보기 리스트 조회 실패';
  } finally {
    loading.value = false;
  }
}

const grouped = computed<Record<string, Item[]>>(() => {
  const m: Record<string, Item[]> = {};
  if (!data.value) return m;
  for (const it of data.value.items) {
    const k = it.category || '기타';
    if (!m[k]) m[k] = [];
    m[k].push(it);
  }
  // 002 FR-036 — 그룹 내 우선순위 내림차순
  for (const k of Object.keys(m)) m[k].sort((a, b) => b.priority_score - a.priority_score);
  return m;
});

// 가장 우선순위 높은 품목(들) — "우선" 배지 표시용 (FR-036)
const topPriority = computed<number>(() =>
  (data.value?.items ?? []).reduce((mx, it) => Math.max(mx, it.priority_score), 0),
);

async function copyAll() {
  if (totalCount.value === 0) return;
  const lines = [
    ...missing.value.map((m) => `- ${m.name}${m.suggested_qty ? ` (${m.suggested_qty})` : ''} — 레시피에 필요`),
    ...(data.value?.items ?? []).map((it) => `- ${it.name} (${it.suggested_qty}) — ${it.reason}`),
  ];
  const text = lines.join('\n');
  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1800);
  } catch {
    /* clipboard 권한 없음 — 무시 */
  }
}

onMounted(load);
</script>

<template>
  <AppCard
    eyebrow="장보기 리스트"
    :title="totalCount ? `${totalCount}개 품목` : '추가 구매 없음'"
    variant="default"
    padding="lg"
    accent
  >
    <p
      v-if="loading"
      class="muted"
    >
      불러오는 중…
    </p>
    <p
      v-else-if="error"
      class="error"
    >
      {{ error }}
    </p>

    <template v-else-if="data">
      <div
        v-if="data.warnings.length"
        class="warnings"
      >
        <AppBadge
          v-for="(w, i) in data.warnings"
          :key="i"
          tone="warn"
          variant="solid"
        >
          {{ w }}
        </AppBadge>
      </div>

      <section
        v-if="missing.length"
        class="group missing"
      >
        <header class="group__head">
          <span class="group__cat">없는 재료 · 레시피에 필요</span>
          <span class="group__count">{{ missing.length }}</span>
        </header>
        <ul>
          <li
            v-for="m in missing"
            :key="m.name"
            class="item"
          >
            <span class="item__name">{{ m.name }}</span>
            <span class="item__qty">{{ m.suggested_qty }}</span>
            <span class="item__reason">레시피에 필요 · 미보유</span>
          </li>
        </ul>
      </section>

      <p
        v-if="!data.items.length && !missing.length"
        class="muted"
      >
        보유 재료로 충분하고, 부족한 영양소도 감지되지 않았습니다.
      </p>

      <div
        v-if="data.items.length"
        class="groups"
      >
        <header class="subhead">
          영양 보충 추천
        </header>
        <section
          v-for="(items, cat) in grouped"
          :key="cat"
          class="group"
        >
          <header class="group__head">
            <span class="group__cat">{{ cat }}</span>
            <span class="group__count">{{ items.length }}</span>
          </header>
          <ul>
            <li
              v-for="it in items"
              :key="it.id"
              class="item"
            >
              <span class="item__name">
                {{ it.name }}
                <AppBadge
                  v-if="it.priority_score === topPriority && topPriority > 0"
                  tone="success"
                  variant="solid"
                >우선</AppBadge>
              </span>
              <span class="item__qty">{{ it.suggested_qty }}</span>
              <span
                class="item__reason"
                :title="it.reason"
              >{{ it.reason }}</span>
            </li>
          </ul>
        </section>
      </div>
    </template>

    <template #footer>
      <div class="actions">
        <AppButton
          v-if="totalCount"
          variant="secondary"
          @click="copyAll"
        >
          {{ copied ? '복사됨 ✓' : '전체 복사' }}
        </AppButton>
        <AppButton
          variant="ghost"
          @click="load"
        >
          새로고침
        </AppButton>
      </div>
    </template>
  </AppCard>
</template>

<style scoped>
.muted { color: var(--color-muted); margin: 0; }
.error { color: var(--color-negative-darkest); margin: 0; }
.warnings {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
}
.groups { display: flex; flex-direction: column; gap: var(--space-lg); }
.group { display: flex; flex-direction: column; gap: var(--space-sm); }
.missing { margin-bottom: var(--space-lg); }
.subhead {
  font-size: var(--fs-caption);
  font-weight: var(--fw-semibold);
  letter-spacing: var(--ls-label);
  text-transform: uppercase;
  color: var(--color-muted);
}
.group__head {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
}
.group__cat {
  font-size: var(--fs-body-sm);
  font-weight: var(--fw-semibold);
  color: var(--color-ink);
}
.group__count {
  color: var(--color-muted);
  font-size: var(--fs-caption);
  font-variant-numeric: tabular-nums;
}
.group ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.item {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  background: var(--color-canvas-soft);
  border: none;
  border-radius: var(--radius-md);
  align-items: baseline;
}
.item__name {
  font-weight: var(--fw-semibold);
  color: var(--color-ink);
}
.item__qty {
  color: var(--color-body);
  font-variant-numeric: tabular-nums;
  font-size: var(--fs-body-sm);
}
.item__reason {
  color: var(--color-ink-deep);
  font-size: var(--fs-caption);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
  align-items: center;
}
</style>
