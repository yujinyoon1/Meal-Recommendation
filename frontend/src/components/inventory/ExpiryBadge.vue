<script setup lang="ts">
/**
 * ExpiryBadge — 유통기한 D-day 배지.
 *  - expired (음수): 빨강(M red) solid
 *  - imminent (≤ 2일): 빨강 outline
 *  - soon (3~7일): 노랑 outline
 *  - 그 외: 회색 outline
 */
import { computed } from 'vue';
import AppBadge from '@/components/ui/AppBadge.vue';

// state: 서버(식품군별 차등 임계)가 판정한 임박/만료 — 주어지면 색을 우선 적용 (002 FR-011)
const props = defineProps<{ expiresAt: string | null; state?: 'imminent' | 'expired' | null }>();

const day = computed<number | null>(() => {
  if (!props.expiresAt) return null;
  const t = new Date(props.expiresAt + 'T00:00:00').getTime();
  if (!Number.isFinite(t)) return null;
  return Math.ceil((t - Date.now()) / (24 * 3600 * 1000));
});

const tone = computed<'red' | 'warn' | 'neutral'>(() => {
  if (props.state === 'expired') return 'red';
  if (props.state === 'imminent') return 'warn';
  if (day.value == null) return 'neutral';
  if (day.value < 0 || day.value <= 2) return 'red';
  if (day.value <= 7) return 'warn';
  return 'neutral';
});

const variant = computed<'solid' | 'outline'>(() => {
  if (props.state === 'expired') return 'solid';
  return day.value != null && day.value < 0 ? 'solid' : 'outline';
});

const label = computed<string>(() => {
  if (day.value == null) return '';
  if (day.value < 0) return `만료 +${Math.abs(day.value)}일`;
  if (day.value === 0) return 'D-day';
  return `D-${day.value}`;
});
</script>

<template>
  <AppBadge
    v-if="day != null"
    :tone="tone"
    :variant="variant"
  >
    {{ label }}
  </AppBadge>
</template>
