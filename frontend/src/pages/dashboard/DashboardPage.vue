<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '@/api/client';
import { useAuthStore } from '@/stores/auth';
import AppCard from '@/components/ui/AppCard.vue';
import AppBadge from '@/components/ui/AppBadge.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { RouterLink } from 'vue-router';

const auth = useAuthStore();
const inventoryCount = ref(0);
const recent = ref<{ id: number; status: string; total_kcal: number | null } | null>(null);

async function load() {
  try {
    const { data: items } = await api.get('/inventory/items');
    inventoryCount.value = Array.isArray(items) ? items.length : 0;
  } catch { /* ignore */ }
  // TODO Phase 4 — /api/recommendations 목록 API 도입 시 활성화
  recent.value = null;
}

onMounted(load);
</script>

<template>
  <section class="dash">
    <div class="m-stripe" />
    <header class="dash__head">
      <span class="label-uppercase eyebrow">DASHBOARD</span>
      <h1>안녕하세요, {{ auth.user?.displayName || auth.user?.email || 'GUEST' }}.</h1>
      <p>오늘 무엇을 드실지 정해드릴까요?</p>
    </header>

    <div class="grid">
      <AppCard eyebrow="INVENTORY" :title="`${inventoryCount} ITEMS`" variant="default" padding="lg" m-stripe>
        <p>보유 식재료를 입력하고 추천을 받아보세요.</p>
        <template #footer>
          <RouterLink to="/inventory">
            <AppButton variant="primary">GO TO INVENTORY →</AppButton>
          </RouterLink>
        </template>
      </AppCard>

      <AppCard eyebrow="RECENT RECOMMENDATION" :title="recent ? `#${recent.id}` : 'NONE YET'" variant="soft" padding="lg">
        <p v-if="recent">
          <AppBadge tone="success" variant="outline">{{ recent.status.toUpperCase() }}</AppBadge>
          <span v-if="recent.total_kcal" class="kcal">{{ recent.total_kcal }} kcal</span>
        </p>
        <p v-else class="muted">아직 추천 이력이 없습니다.</p>
      </AppCard>
    </div>
  </section>
</template>

<style scoped>
.dash { display: flex; flex-direction: column; gap: var(--space-lg); }
.dash__head h1 { font-size: var(--fs-display-md); margin: var(--space-xs) 0; }
.eyebrow { color: var(--color-muted); }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-lg);
}
.kcal { margin-left: var(--space-sm); color: var(--color-muted); }
.muted { color: var(--color-muted); margin: 0; }
</style>
