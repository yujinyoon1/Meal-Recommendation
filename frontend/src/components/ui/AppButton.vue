<script setup lang="ts">
/**
 * AppButton — Wise CTA 시그니처.
 * 기본: 24px pill, 48px 높이, semibold 16/24, sentence case.
 * variant:
 *  - primary  : lime green 채움 (#9fe870) + ink 텍스트. 페이지당 1개 권장.
 *  - secondary: sage canvas 채움 + ink 텍스트.
 *  - outline  : white 채움 + ink 1px 보더.
 *  - ghost    : 보더 없음, 텍스트 전용.
 *  - icon     : 44px 원형 white + ink 아이콘.
 */
defineProps<{
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'icon';
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
  gap: var(--space-sm);
  height: 48px;
  padding: 0 var(--space-xl);
  border: 1px solid transparent;
  border-radius: var(--radius-xl);
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-family: var(--font-sans);
  font-size: var(--fs-button);
  font-weight: var(--fw-semibold);
  letter-spacing: 0;
  text-transform: none;
  text-decoration: none;
  cursor: pointer;
  transition:
    background-color 120ms ease,
    color 120ms ease,
    border-color 120ms ease,
    opacity 120ms ease,
    transform 120ms ease;
}
.btn:hover:not(:disabled) { transform: translateY(-1px); }
.btn:active:not(:disabled) { transform: translateY(0); }
.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.btn--block { width: 100%; }

/* primary — Wise lime green */
.btn--primary { background: var(--color-primary); color: var(--color-on-primary); }
.btn--primary:hover:not(:disabled) { background: var(--color-primary-active); }

/* secondary — sage canvas */
.btn--secondary {
  background: var(--color-canvas-soft);
  color: var(--color-ink);
}
.btn--secondary:hover:not(:disabled) {
  background: var(--color-surface-elevated);
}

/* outline — white pill with ink border */
.btn--outline {
  background: var(--color-canvas);
  color: var(--color-ink);
  border-color: var(--color-ink);
}
.btn--outline:hover:not(:disabled) {
  background: var(--color-ink);
  color: var(--color-canvas);
}

/* ghost — text-only inline */
.btn--ghost {
  background: transparent;
  color: var(--color-ink);
  height: auto;
  padding: var(--space-sm) var(--space-md);
  text-decoration: underline;
  text-underline-offset: 4px;
}
.btn--ghost:hover:not(:disabled) {
  background: transparent;
  color: var(--color-ink-deep);
  transform: none;
}

/* icon — circular 44 */
.btn--icon {
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: var(--radius-full);
  background: var(--color-canvas);
  color: var(--color-ink);
  border: 1px solid var(--color-hairline);
}
.btn--icon:hover:not(:disabled) {
  background: var(--color-canvas-soft);
}
</style>
