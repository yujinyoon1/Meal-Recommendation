<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api/client';
import { useRecommendationStore } from '@/stores/recommendation';
import AppButton from '@/components/ui/AppButton.vue';
import AppCard from '@/components/ui/AppCard.vue';
import AppToast from '@/components/ui/AppToast.vue';
import InventoryListSection from './InventoryListSection.vue';

const router = useRouter();
const rec = useRecommendationStore();

const text = ref('');
const expiry = ref(''); // YYYY-MM-DD — 이 입력 배치에 함께 적용할 유통기한(선택)
const adding = ref(false);
const error = ref<string | null>(null);
const items = ref<Array<{
  id: number; raw_text: string; normalized: string | null;
  quantity?: number | null; unit?: string | null; expires_at?: string | null;
  food_id?: number | null; consumed?: boolean; warning?: string;
}>>([]);

const todayStr = new Date().toISOString().slice(0, 10);

// 선택한 유통기한을, 아직 날짜가 없는 각 재료 줄 앞에 "YYYY-MM-DD " 형태로 붙인다.
function applyExpiry(raw: string, date: string): string {
  if (!date) return raw;
  const ISO = /^\d{4}-\d{2}-\d{2}/;
  return raw
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (ISO.test(s) ? s : `${date} ${s}`))
    .join('\n');
}

async function reload() {
  const { data } = await api.get('/inventory/items');
  items.value = data;
}

async function onAdd() {
  if (!text.value.trim()) return;
  adding.value = true;
  error.value = null;
  try {
    await api.post('/inventory/items', { text: applyExpiry(text.value, expiry.value) });
    text.value = '';
    expiry.value = '';
    await reload();
  } catch (e: unknown) {
    error.value = (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '추가 실패';
  } finally {
    adding.value = false;
  }
}

async function onRecommend() {
  try {
    const result = await rec.request();
    router.push(`/recommendation/${result.recommendation_id}`);
  } catch {
    /* error는 store가 보관 */
    error.value = rec.error;
  }
}

async function onRecommendSelected(ids: number[]) {
  try {
    const result = await rec.request({ itemIds: ids });
    router.push(`/recommendation/${result.recommendation_id}`);
  } catch {
    error.value = rec.error;
  }
}

onMounted(reload);
</script>

<template>
  <section class="inv">
    <div class="m-stripe" />
    <header class="inv__head">
      <span class="label-uppercase eyebrow">INVENTORY</span>
      <h1>보유 식재료</h1>
      <p>한 번에 여러 개 입력 가능. 콤마 또는 줄바꿈으로 구분. 예) <em>계란 2개, 양파 1개\n두부 반 모</em></p>
    </header>

    <AppCard padding="lg">
      <label class="inv__field">
        <span class="label-uppercase">유통기한 (선택 — 이 입력에 함께 적용)</span>
        <input
          v-model="expiry"
          type="date"
          class="inv__date"
          :min="todayStr"
        >
      </label>
      <textarea
        v-model="text"
        class="inv__textarea"
        placeholder="계란 2개, 양파 1개&#10;두부 반 모"
        rows="6"
      />
      <p class="inv__hint">
        위 날짜를 고르면 이번에 입력한 재료 전체에 유통기한이 적용됩니다.
        재료마다 다르게 지정하려면 줄 앞에 <code>2026-06-01 우유 200ml</code> 처럼 직접 적으세요.
        유통기한이 임박한 재료는 목록 상단에 표시되고 식단 추천에 우선 사용됩니다.
      </p>
      <template #footer>
        <div class="inv__actions">
          <AppButton
            variant="outline"
            :disabled="adding || !text.trim()"
            @click="onAdd"
          >
            {{ adding ? 'ADDING…' : 'ADD TO INVENTORY' }}
          </AppButton>
          <AppButton
            variant="primary"
            :disabled="rec.loading || items.length === 0"
            @click="onRecommend"
          >
            {{ rec.loading ? 'RECOMMENDING…' : 'GET RECOMMENDATION →' }}
          </AppButton>
        </div>
      </template>
    </AppCard>

    <InventoryListSection
      :items="items"
      :recommending="rec.loading"
      @changed="reload"
      @recommend="onRecommendSelected"
    />

    <AppToast
      :open="!!error"
      tone="error"
      title="ERROR"
      @close="error = null"
    >
      {{ error }}
    </AppToast>
  </section>
</template>

<style scoped>
.inv { display: flex; flex-direction: column; gap: var(--space-lg); }
.inv__head h1 { font-size: var(--fs-display-md); margin: var(--space-xs) 0; }
.eyebrow { color: var(--color-muted); }
.inv__textarea {
  width: 100%;
  background: var(--color-canvas);
  color: var(--color-ink);
  border: 1px solid var(--color-hairline);
  padding: var(--space-md);
  font: inherit;
  font-size: var(--fs-body);
  font-weight: var(--fw-body);
  border-radius: var(--radius-none);
  resize: vertical;
  min-height: 120px;
}
.inv__textarea:focus {
  outline: none;
  border-color: var(--color-ink);
  background: var(--color-surface-soft);
}
.inv__actions { display: flex; gap: var(--space-md); flex-wrap: wrap; }
.inv__field { display: flex; flex-direction: column; gap: var(--space-xs); margin-bottom: var(--space-md); }
.inv__date {
  height: 44px;
  width: max-content;
  min-width: 200px;
  padding: 8px 14px;
  background: var(--color-canvas);
  color: var(--color-ink);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  font: inherit;
}
.inv__date:focus { outline: none; border-color: var(--color-ink); }
.inv__hint {
  margin: var(--space-sm) 0 0;
  font-size: var(--fs-caption);
  color: var(--color-muted);
  line-height: 1.5;
}
.inv__hint code {
  background: var(--color-surface-soft);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 0.95em;
}
</style>
