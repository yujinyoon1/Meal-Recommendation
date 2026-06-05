<script setup lang="ts">
import { computed, ref } from 'vue';
import { api } from '@/api/client';
import AppCard from '@/components/ui/AppCard.vue';
import AppBadge from '@/components/ui/AppBadge.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ExpiryBadge from '@/components/inventory/ExpiryBadge.vue';

interface Item {
  id: number;
  raw_text: string;
  normalized: string | null;
  food_id?: number | null;
  quantity?: number | null;
  unit?: string | null;
  expires_at?: string | null;
  consumed?: boolean;
  warning?: string;
}

const props = defineProps<{ items: Item[]; recommending?: boolean }>();
const emit = defineEmits<{
  (e: 'changed'): void;
  (e: 'recommend', ids: number[]): void;
}>();

const sorted = computed(() => props.items.slice());

const selected = ref<Set<number>>(new Set());
const selectedCount = computed(() => selected.value.size);

function toggle(id: number) {
  const next = new Set(selected.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selected.value = next;
}
function clearSelection() {
  selected.value = new Set();
}
function recommendSelected() {
  if (selected.value.size === 0) return;
  emit('recommend', [...selected.value]);
}

async function markConsumed(id: number) {
  await api.patch(`/inventory/items/${id}`, { consumed: true });
  emit('changed');
}
async function removeItem(id: number) {
  await api.delete(`/inventory/items/${id}`);
  emit('changed');
}
</script>

<template>
  <div class="list">
    <header class="list__head">
      <span class="label-uppercase">CURRENT ITEMS</span>
      <span class="list__count">{{ items.length }}</span>
      <div class="spacer" />
      <span
        v-if="selectedCount"
        class="list__selinfo"
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
        :disabled="recommending"
        @click="recommendSelected"
      >
        {{ recommending ? '추천 중…' : `선택한 ${selectedCount}개로 레시피 →` }}
      </AppButton>
    </header>

    <p
      v-if="!items.length"
      class="list__empty"
    >
      아직 식재료가 없습니다.
    </p>

    <div
      v-else
      class="grid"
    >
      <AppCard
        v-for="it in sorted"
        :key="it.id"
        variant="soft"
        padding="md"
      >
        <header class="card-head">
          <label class="card-head__check">
            <input
              type="checkbox"
              :checked="selected.has(it.id)"
              @change="toggle(it.id)"
            >
          </label>
          <strong class="card-head__name">{{ it.normalized ?? it.raw_text }}</strong>
          <span
            v-if="it.quantity"
            class="card-head__qty"
          >{{ it.quantity }}{{ it.unit ?? '' }}</span>
        </header>
        <p class="card-head__raw">
          {{ it.raw_text }}
        </p>
        <div class="card-head__badges">
          <ExpiryBadge :expires-at="it.expires_at ?? null" />
          <AppBadge
            v-if="!it.food_id"
            tone="warn"
            variant="outline"
          >
            UNMATCHED
          </AppBadge>
          <AppBadge
            v-if="it.warning"
            tone="warn"
            variant="outline"
          >
            {{ it.warning }}
          </AppBadge>
        </div>
        <template #footer>
          <div class="card-actions">
            <AppButton
              variant="ghost"
              @click="markConsumed(it.id)"
            >
              소모
            </AppButton>
            <AppButton
              variant="ghost"
              @click="removeItem(it.id)"
            >
              삭제
            </AppButton>
          </div>
        </template>
      </AppCard>
    </div>
  </div>
</template>

<style scoped>
.list { display: flex; flex-direction: column; gap: var(--space-md); }
.list__head { display: flex; align-items: center; gap: var(--space-sm); flex-wrap: wrap; border-top: 1px solid var(--color-hairline); padding-top: var(--space-md); }
.list__count { color: var(--color-muted); font-size: var(--fs-caption); }
.list__head .spacer { flex: 1; }
.list__selinfo { color: var(--color-ink-deep); font-weight: var(--fw-semibold); font-size: var(--fs-body-sm); }
.card-head__check { display: inline-flex; align-items: center; }
.card-head__check input { width: 17px; height: 17px; accent-color: var(--color-primary); cursor: pointer; }
.list__empty { color: var(--color-muted); font-style: italic; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-md); }
.card-head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-xs); }
.card-head__name { font-weight: var(--fw-bold); }
.card-head__qty { color: var(--color-muted); font-size: var(--fs-body-sm); }
.card-head__raw { color: var(--color-muted); font-size: var(--fs-caption); margin: 0; }
.card-head__badges { display: flex; flex-wrap: wrap; gap: var(--space-xs); }
.card-actions { display: flex; justify-content: flex-end; gap: var(--space-xs); }
</style>
