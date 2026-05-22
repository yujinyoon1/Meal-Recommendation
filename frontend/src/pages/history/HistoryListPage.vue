<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '@/api/client';
import AppCard from '@/components/ui/AppCard.vue';
import AppBadge from '@/components/ui/AppBadge.vue';
import AppButton from '@/components/ui/AppButton.vue';

interface Item {
  id: number;
  request_at: string;
  status: 'pending' | 'generated' | 'validated' | 'rejected' | 'failed';
  total_kcal: number | null;
  rating: number | null;
}

const items = ref<Item[]>([]);
const cursor = ref<string | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const done = ref(false);

async function loadNext() {
  if (loading.value || done.value) return;
  loading.value = true;
  error.value = null;
  try {
    const params: Record<string, string | number> = { limit: 20 };
    if (cursor.value) params.cursor = cursor.value;
    const { data } = await api.get<{ items: Item[]; next_cursor: string | null }>('/recommendations', { params });
    items.value.push(...data.items);
    cursor.value = data.next_cursor;
    if (!data.next_cursor) done.value = true;
  } catch (e: unknown) {
    error.value = (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '이력 조회 실패';
  } finally {
    loading.value = false;
  }
}

function fmt(d: string) { return new Date(d).toLocaleString('ko-KR'); }

let sentinel: HTMLDivElement | null = null;
const sentinelRef = ref<HTMLElement | null>(null);
let io: IntersectionObserver | null = null;

onMounted(async () => {
  await loadNext();
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) loadNext();
    });
    sentinel = sentinelRef.value as HTMLDivElement | null;
    if (sentinel) io.observe(sentinel);
  }
});
onUnmounted(() => { io?.disconnect(); });
</script>

<template>
  <section class="hist">
    <div class="m-stripe" />
    <header class="hist__head">
      <span class="label-uppercase eyebrow">HISTORY</span>
      <h1>지난 추천</h1>
    </header>

    <p v-if="!items.length && !loading" class="empty">아직 추천 이력이 없습니다.</p>

    <div class="grid">
      <AppCard
        v-for="it in items"
        :key="it.id"
        variant="default"
        padding="md"
      >
        <header class="row">
          <strong>#{{ it.id }}</strong>
          <AppBadge :tone="it.status === 'validated' ? 'success' : (it.status === 'rejected' ? 'red' : 'neutral')" variant="outline">
            {{ it.status.toUpperCase() }}
          </AppBadge>
        </header>
        <p class="meta">{{ fmt(it.request_at) }}</p>
        <p class="metrics">
          <span v-if="it.total_kcal != null">{{ it.total_kcal }} kcal</span>
          <span v-if="it.rating != null" class="rating">★ {{ it.rating }}/5</span>
        </p>
        <template #footer>
          <RouterLink :to="`/recommendation/${it.id}`">
            <AppButton variant="ghost">상세 →</AppButton>
          </RouterLink>
        </template>
      </AppCard>
    </div>

    <div ref="sentinelRef" class="sentinel" />
    <p v-if="loading" class="loading">불러오는 중…</p>
    <p v-if="done && items.length" class="done">— 끝 —</p>
    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>

<style scoped>
.hist { display: flex; flex-direction: column; gap: var(--space-lg); }
.hist__head h1 { font-size: var(--fs-display-md); margin: var(--space-xs) 0; }
.eyebrow { color: var(--color-muted); }
.empty { color: var(--color-muted); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--space-md); }
.row { display: flex; align-items: baseline; justify-content: space-between; }
.meta { color: var(--color-muted); font-size: var(--fs-caption); margin: 0; }
.metrics { display: flex; gap: var(--space-md); color: var(--color-body); font-size: var(--fs-body-sm); margin: var(--space-xs) 0 0; }
.rating { color: var(--color-warning); }
.sentinel { height: 1px; }
.loading, .done, .error { text-align: center; color: var(--color-muted); font-size: var(--fs-caption); letter-spacing: var(--ls-label); text-transform: uppercase; }
.error { color: var(--color-m-red); }
</style>
