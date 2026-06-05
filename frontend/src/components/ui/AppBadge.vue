<script setup lang="ts">
/**
 * AppBadge — Wise pill badge.
 *  - radius pill, semibold 14, 소문자/sentence case.
 * tone:
 *  - neutral : sage 배경 + ink 텍스트.
 *  - accent  : pale lime + ink-deep (positive 분위기).
 *  - red     : dark maroon bg + white (negative).
 *  - warn    : warning yellow bg + warning content text.
 *  - success : pale lime + positive-deep (badge-positive).
 *
 * variant:
 *  - outline : 보더만, 투명 배경.
 *  - solid   : tone fill.
 */
defineProps<{
  tone?: 'neutral' | 'accent' | 'red' | 'warn' | 'success';
  variant?: 'outline' | 'solid';
}>();
</script>

<template>
  <span
    class="badge"
    :class="[`badge--${tone ?? 'neutral'}`, `badge--${variant ?? 'solid'}`]"
  >
    <slot />
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 12px;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  font-size: var(--fs-body-sm);
  font-weight: var(--fw-semibold);
  letter-spacing: 0;
  text-transform: none;
  line-height: 1.5;
  white-space: nowrap;
}

/* solid (default) */
.badge--neutral.badge--solid {
  background: var(--color-canvas-soft);
  color: var(--color-ink);
}
.badge--accent.badge--solid {
  background: var(--color-primary-pale);
  color: var(--color-ink-deep);
}
.badge--success.badge--solid {
  background: var(--color-primary-pale);
  color: var(--color-positive-deep);
}
.badge--red.badge--solid {
  background: var(--color-negative-bg);
  color: #ffffff;
}
.badge--warn.badge--solid {
  background: var(--color-warning);
  color: var(--color-warning-content);
}

/* outline */
.badge--outline {
  background: transparent;
}
.badge--neutral.badge--outline { color: var(--color-body); border-color: var(--color-hairline); }
.badge--accent.badge--outline  { color: var(--color-ink-deep); border-color: var(--color-primary-neutral); }
.badge--success.badge--outline { color: var(--color-positive-deep); border-color: var(--color-positive); }
.badge--red.badge--outline     { color: var(--color-negative-darkest); border-color: var(--color-negative); }
.badge--warn.badge--outline    { color: var(--color-warning-deep); border-color: var(--color-warning); }
</style>
