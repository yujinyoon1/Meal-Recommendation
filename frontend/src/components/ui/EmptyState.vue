<script setup lang="ts">
/**
 * EmptyState — 빈 상태/에러 일관 컴포넌트.
 *  - Wise empty-state-card: sage 배경, radius-xl, 너그러운 패딩.
 * tone: empty | error | success
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
  gap: var(--space-md);
  padding: var(--space-3xl) var(--space-xl);
  border: none;
  border-radius: var(--radius-xl);
  background: var(--color-canvas-soft);
}
.empty__icon {
  font-size: 36px;
  line-height: 1;
  margin-bottom: var(--space-xs);
}
.empty__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-display-xs);
  font-weight: var(--fw-semibold);
  letter-spacing: -0.01em;
  text-transform: none;
  color: var(--color-ink);
}
.empty__msg {
  margin: 0;
  color: var(--color-body);
  font-size: var(--fs-body);
  max-width: 42ch;
}
.empty__actions {
  margin-top: var(--space-sm);
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
  justify-content: center;
}

.empty--error {
  background: #f9eaea;
}
.empty--error .empty__title { color: var(--color-negative-darkest); }
.empty--success {
  background: var(--color-primary-pale);
}
.empty--success .empty__title { color: var(--color-positive-deep); }
</style>
