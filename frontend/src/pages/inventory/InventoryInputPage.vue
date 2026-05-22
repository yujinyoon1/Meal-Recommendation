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
const adding = ref(false);
const error = ref<string | null>(null);
const items = ref<Array<{ id: number; raw_text: string; normalized: string | null; warning?: string }>>([]);

async function reload() {
  const { data } = await api.get('/inventory/items');
  items.value = data;
}

async function onAdd() {
  if (!text.value.trim()) return;
  adding.value = true;
  error.value = null;
  try {
    await api.post('/inventory/items', { text: text.value });
    text.value = '';
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
      <textarea
        v-model="text"
        class="inv__textarea"
        placeholder="계란 2개, 양파 1개&#10;두부 반 모"
        rows="6"
      />
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
      @changed="reload"
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
</style>
