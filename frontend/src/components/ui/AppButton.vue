<script setup lang="ts">
/**
 * AppButton — BMW M 시그니처 CTA.
 * 기본: 사각(0px), 1px 흰 아웃라인, UPPERCASE 14/700, 1.5px 트래킹, height 48.
 * variant: primary (filled canvas) | outline (transparent border) | ghost (no border) | icon (48 round)
 */
defineProps<{
  variant?: 'primary' | 'outline' | 'ghost' | 'icon';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  block?: boolean;
}>();
defineEmits<{ (e: 'click', ev: MouseEvent): void }>();
</script>

<template>
  <button
    :type="type ?? 'button'"
    :disabled="disabled"
    class="btn"
    :class="[
      `btn--${variant ?? 'primary'}`,
      block ? 'btn--block' : '',
    ]"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  height: 48px;
  padding: 0 32px;
  border: 1px solid var(--color-ink);
  border-radius: var(--radius-none);
  background: var(--color-canvas);
  color: var(--color-ink);
  font: inherit;
  font-size: var(--fs-button);
  font-weight: var(--fw-bold);
  letter-spacing: var(--ls-label);
  text-transform: uppercase;
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease, opacity 120ms ease;
}
.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.btn--block {
  width: 100%;
}

/* primary — canvas fill + white outline */
.btn--primary:hover:not(:disabled) {
  background: var(--color-ink);
  color: var(--color-canvas);
}

/* outline — transparent fill, useful over photography */
.btn--outline {
  background: transparent;
}
.btn--outline:hover:not(:disabled) {
  background: var(--color-ink);
  color: var(--color-canvas);
}

/* ghost — no border, text-only inline */
.btn--ghost {
  border-color: transparent;
  background: transparent;
  padding: 0 var(--space-md);
  height: auto;
}
.btn--ghost:hover:not(:disabled) {
  color: var(--color-body-strong);
}

/* icon — circular 48 */
.btn--icon {
  width: 48px;
  height: 48px;
  padding: 0;
  border: none;
  border-radius: var(--radius-full);
  background: var(--color-surface-card);
}
.btn--icon:hover:not(:disabled) {
  background: var(--color-surface-elevated);
}
</style>
