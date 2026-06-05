<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
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
  recipe_names: string | null;
}

const items = ref<Item[]>([]);
const cursor = ref<string | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const done = ref(false);

const router = useRouter();

const selected = ref<Set<number>>(new Set());
const selectedCount = computed(() => selected.value.size);
const deleting = ref(false);
const saving = ref(false);

// 정렬 — 서버는 최신순(request_at DESC) keyset 페이지네이션으로 고정이라,
// 이미 불러온 목록을 클라이언트에서 다시 정렬한다.
type SortKey = 'date_desc' | 'date_asc' | 'name_asc';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'date_desc', label: '최신순' },
  { key: 'date_asc', label: '오래된순' },
  { key: 'name_asc', label: '가나다순' },
];
const sortKey = ref<SortKey>('date_desc');

function titleOf(it: Item) { return it.recipe_names || `#${it.id}`; }

const sortedItems = computed(() => {
  const list = [...items.value];
  if (sortKey.value === 'name_asc') {
    return list.sort((a, b) => titleOf(a).localeCompare(titleOf(b), 'ko'));
  }
  const dir = sortKey.value === 'date_asc' ? 1 : -1;
  return list.sort((a, b) => {
    const diff = new Date(a.request_at).getTime() - new Date(b.request_at).getTime();
    return (diff !== 0 ? diff : a.id - b.id) * dir;
  });
});

function toggle(id: number) {
  const next = new Set(selected.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selected.value = next;
}
function clearSelection() {
  selected.value = new Set();
}

async function deleteSelected() {
  if (selected.value.size === 0 || deleting.value) return;
  const ids = [...selected.value];
  if (!window.confirm(`선택한 ${ids.length}개의 추천 이력을 삭제할까요? 되돌릴 수 없습니다.`)) return;
  deleting.value = true;
  error.value = null;
  try {
    await Promise.all(ids.map((id) => api.delete(`/recommendations/${id}`)));
    const removed = new Set(ids);
    items.value = items.value.filter((it) => !removed.has(it.id));
    clearSelection();
  } catch (e: unknown) {
    error.value = (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '삭제 실패';
  } finally {
    deleting.value = false;
  }
}

async function saveSelected() {
  if (selected.value.size === 0 || saving.value) return;
  const ids = [...selected.value];
  saving.value = true;
  error.value = null;
  try {
    // 선택한 추천들에 속한 모든 레시피를 일괄 북마크 → 저장됨 페이지로 이동.
    await api.post('/bookmarks/recommendations', { recommendation_ids: ids });
    clearSelection();
    router.push('/bookmarks');
  } catch (e: unknown) {
    error.value = (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '저장 실패';
  } finally {
    saving.value = false;
  }
}

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

// 보는 사람의 기기 시간대와 무관하게 항상 한국(KST) 기준으로 표시.
function fmt(d: string) { return new Date(d).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }); }

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
      <div
        v-if="items.length"
        class="hist__tools"
      >
        <span
          v-if="selectedCount"
          class="hist__selinfo"
        >{{ selectedCount }}개 선택됨</span>
        <AppButton
          v-if="selectedCount"
          variant="ghost"
          @click="clearSelection"
        >
          선택 해제
        </AppButton>
        <AppButton
          v-if="selectedCount"
          variant="primary"
          :disabled="saving || deleting"
          @click="saveSelected"
        >
          {{ saving ? '저장 중…' : `선택한 ${selectedCount}개 저장` }}
        </AppButton>
        <AppButton
          v-if="selectedCount"
          variant="outline"
          :disabled="deleting || saving"
          @click="deleteSelected"
        >
          {{ deleting ? '삭제 중…' : `선택한 ${selectedCount}개 삭제` }}
        </AppButton>
      </div>
    </header>

    <p
      v-if="!items.length && !loading"
      class="empty"
    >
      아직 추천 이력이 없습니다.
    </p>

    <div
      v-if="items.length"
      class="sortbar"
      role="group"
      aria-label="정렬"
    >
      <span class="sortbar__label">정렬</span>
      <div class="sortbar__opts">
        <button
          v-for="s in SORTS"
          :key="s.key"
          type="button"
          class="sortbar__pill"
          :class="{ 'is-active': sortKey === s.key }"
          :aria-pressed="sortKey === s.key"
          @click="sortKey = s.key"
        >
          {{ s.label }}
        </button>
      </div>
    </div>

    <div class="grid">
      <AppCard
        v-for="it in sortedItems"
        :key="it.id"
        variant="default"
        padding="md"
      >
        <header class="row">
          <label class="row__check">
            <input
              type="checkbox"
              :checked="selected.has(it.id)"
              @change="toggle(it.id)"
            >
            <strong class="row__title">{{ it.recipe_names || `#${it.id}` }}</strong>
          </label>
          <AppBadge
            :tone="it.status === 'validated' ? 'success' : (it.status === 'rejected' ? 'red' : 'neutral')"
            variant="outline"
          >
            {{ it.status.toUpperCase() }}
          </AppBadge>
        </header>
        <p class="meta">
          {{ fmt(it.request_at) }}
        </p>
        <p class="metrics">
          <span v-if="it.total_kcal != null">{{ it.total_kcal }} kcal</span>
          <span
            v-if="it.rating != null"
            class="rating"
          >★ {{ it.rating }}/5</span>
        </p>
        <template #footer>
          <RouterLink :to="`/recommendation/${it.id}`">
            <AppButton variant="ghost">
              상세 →
            </AppButton>
          </RouterLink>
        </template>
      </AppCard>
    </div>

    <div
      ref="sentinelRef"
      class="sentinel"
    />
    <p
      v-if="loading"
      class="loading"
    >
      불러오는 중…
    </p>
    <p
      v-if="done && items.length"
      class="done"
    >
      — 끝 —
    </p>
    <p
      v-if="error"
      class="error"
    >
      {{ error }}
    </p>
  </section>
</template>

<style scoped>
.hist { display: flex; flex-direction: column; gap: var(--space-lg); }
.hist__head h1 { font-size: var(--fs-display-md); margin: var(--space-xs) 0; }
.eyebrow { color: var(--color-muted); }
.hist__tools { display: flex; align-items: center; gap: var(--space-sm); flex-wrap: wrap; }
.hist__selinfo { font-weight: var(--fw-semibold); font-size: var(--fs-body-sm); color: var(--color-ink-deep); }
.row__check { display: inline-flex; align-items: center; gap: var(--space-xs); cursor: pointer; min-width: 0; }
.row__title { word-break: keep-all; overflow-wrap: anywhere; }
.row__check input { width: 16px; height: 16px; accent-color: var(--color-primary); cursor: pointer; }
.empty { color: var(--color-muted); }
.sortbar { display: flex; align-items: center; gap: var(--space-sm); flex-wrap: wrap; }
.sortbar__label { font-size: var(--fs-caption); letter-spacing: var(--ls-label); text-transform: uppercase; color: var(--color-muted); }
.sortbar__opts { display: inline-flex; gap: var(--space-2xs, 4px); padding: 4px; background: var(--color-canvas-soft); border-radius: var(--radius-pill); }
.sortbar__pill {
  border: 0;
  background: transparent;
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  font-size: var(--fs-body-sm);
  font-weight: var(--fw-semibold);
  color: var(--color-body);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.sortbar__pill:hover { color: var(--color-ink-deep); }
.sortbar__pill.is-active { background: var(--color-surface-card, #fff); color: var(--color-ink-deep); box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.08)); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--space-md); }
.row { display: flex; align-items: baseline; justify-content: space-between; }
.meta { color: var(--color-muted); font-size: var(--fs-caption); margin: 0; }
.metrics { display: flex; gap: var(--space-md); color: var(--color-body); font-size: var(--fs-body-sm); margin: var(--space-xs) 0 0; }
.rating { color: var(--color-warning); }
.sentinel { height: 1px; }
.loading, .done, .error { text-align: center; color: var(--color-muted); font-size: var(--fs-caption); letter-spacing: var(--ls-label); text-transform: uppercase; }
.error { color: var(--color-m-red); }
</style>
