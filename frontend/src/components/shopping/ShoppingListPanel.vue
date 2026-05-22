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
}
interface Response {
  recommendation_id: number;
  generated: boolean;
  warnings: string[];
  items: Item[];
}

const props = defineProps<{ recommendationId: number }>();

const data = ref<Response | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const copied = ref(false);

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
  return m;
});

async function copyAll() {
  if (!data.value?.items?.length) return;
  const text = data.value.items
    .map((it) => `- ${it.name} (${it.suggested_qty}) — ${it.reason}`)
    .join('\n');
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
    eyebrow="SHOPPING LIST"
    :title="data?.items?.length ? `${data.items.length} ITEMS` : 'NO GAPS'"
    variant="default"
    padding="lg"
    m-stripe
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

      <p
        v-if="!data.items.length"
        class="muted"
      >
        부족한 영양소가 감지되지 않았습니다. 추천 식단으로 충분합니다.
      </p>

      <div
        v-else
        class="groups"
      >
        <section
          v-for="(items, cat) in grouped"
          :key="cat"
          class="group"
        >
          <header class="group__head">
            <span class="label-uppercase">{{ cat }}</span>
            <span class="group__count">{{ items.length }}</span>
          </header>
          <ul>
            <li
              v-for="it in items"
              :key="it.id"
              class="item"
            >
              <span class="item__name">{{ it.name }}</span>
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
          v-if="data?.items?.length"
          variant="outline"
          @click="copyAll"
        >
          {{ copied ? 'COPIED ✓' : 'COPY ALL' }}
        </AppButton>
        <AppButton
          variant="ghost"
          @click="load"
        >
          RELOAD
        </AppButton>
      </div>
    </template>
  </AppCard>
</template>

<style scoped>
.muted { color: var(--color-muted); margin: 0; }
.error { color: var(--color-m-red); margin: 0; }
.warnings { display: flex; flex-wrap: wrap; gap: var(--space-xs); margin-bottom: var(--space-md); }
.groups { display: flex; flex-direction: column; gap: var(--space-md); }
.group { display: flex; flex-direction: column; gap: var(--space-xs); }
.group__head { display: flex; align-items: baseline; gap: var(--space-xs); color: var(--color-body-strong); }
.group__count { color: var(--color-muted); font-size: var(--fs-caption); }
.group ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
.item {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  background: var(--color-surface-soft);
  border: 1px solid var(--color-hairline);
  align-items: baseline;
}
.item__name { font-weight: var(--fw-bold); color: var(--color-ink); }
.item__qty { color: var(--color-muted); font-variant-numeric: tabular-nums; }
.item__reason { color: var(--color-bmw-blue); font-size: var(--fs-caption); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.actions { display: flex; gap: var(--space-xs); justify-content: flex-end; }
</style>
