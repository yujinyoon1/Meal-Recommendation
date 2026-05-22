<script setup lang="ts">
/**
 * AppBadge — UPPERCASE letterspaced 라벨 칩.
 * tone: neutral | accent (BMW blue) | red (M red) | warn | success
 * variant: outline (default) | solid
 */
defineProps<{
  tone?: 'neutral' | 'accent' | 'red' | 'warn' | 'success';
  variant?: 'outline' | 'solid';
}>();
</script>

<template>
  <span
    class="badge label-uppercase"
    :class="[`badge--${tone ?? 'neutral'}`, `badge--${variant ?? 'outline'}`]"
  >
    <slot />
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: 1px solid currentColor;
  border-radius: var(--radius-none);
  font-size: var(--fs-caption);
  letter-spacing: var(--ls-label);
  line-height: 1.6;
  white-space: nowrap;
}

/* outline (default) — text in tone color, transparent bg */
.badge--neutral.badge--outline { color: var(--color-body); }
.badge--accent.badge--outline  { color: var(--color-bmw-blue); }
.badge--red.badge--outline     { color: var(--color-m-red); }
.badge--warn.badge--outline    { color: var(--color-warning); }
.badge--success.badge--outline { color: var(--color-success); }

/* solid — tone fill + on-tone text */
.badge--solid {
  border-color: transparent;
  color: var(--color-ink);
}
.badge--neutral.badge--solid { background: var(--color-surface-elevated); color: var(--color-body-strong); }
.badge--accent.badge--solid  { background: var(--color-bmw-blue); }
.badge--red.badge--solid     { background: var(--color-m-red); }
.badge--warn.badge--solid    { background: var(--color-warning); color: var(--color-canvas); }
.badge--success.badge--solid { background: var(--color-success); }
</style>
