<script setup lang="ts">
/**
 * EmptyState — 빈 상태/에러 일관성을 위한 공통 컴포넌트.
 * tone: empty (회색) | error (M red) | success
 */
defineProps<{
  title: string;
  message?: string;
  tone?: 'empty' | 'error' | 'success';
  icon?: string;
}>();
</script>

<template>
  <div
    class="empty"
    :class="`empty--${tone ?? 'empty'}`"
  >
    <div
      v-if="icon"
      class="empty__icon"
    >
      {{ icon }}
    </div>
    <h3 class="empty__title">
      {{ title }}
    </h3>
    <p
      v-if="message"
      class="empty__msg"
    >
      {{ message }}
    </p>
    <div
      v-if="$slots.default"
      class="empty__actions"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-sm);
  padding: var(--space-xl) var(--space-md);
  border: 1px dashed var(--color-hairline);
  background: var(--color-surface-soft);
}
.empty__icon { font-size: 28px; line-height: 1; }
.empty__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-title-md);
  font-weight: var(--fw-bold);
  text-transform: uppercase;
  letter-spacing: 0;
}
.empty__msg { margin: 0; color: var(--color-body); font-size: var(--fs-body-sm); }
.empty__actions { margin-top: var(--space-sm); display: flex; gap: var(--space-xs); }

.empty--error { border-color: var(--color-m-red); }
.empty--error .empty__title { color: var(--color-m-red); }
.empty--success { border-color: var(--color-success); }
.empty--success .empty__title { color: var(--color-success); }
</style>
