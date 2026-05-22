<script setup lang="ts">
/**
 * AppCard — surface-card / 0px / hairline / 24px padding.
 * variant: default | soft | elevated
 * `mStripe` prop true → 상단 4px 트라이컬러 스트라이프.
 */
defineProps<{
  title?: string;
  eyebrow?: string;
  variant?: 'default' | 'soft' | 'elevated';
  mStripe?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}>();
</script>

<template>
  <article class="card" :class="[`card--${variant ?? 'default'}`, `card--pad-${padding ?? 'md'}`]">
    <div v-if="mStripe" class="m-stripe card__stripe" />
    <header v-if="eyebrow || title" class="card__head">
      <span v-if="eyebrow" class="card__eyebrow label-uppercase">{{ eyebrow }}</span>
      <h3 v-if="title" class="card__title">{{ title }}</h3>
    </header>
    <div class="card__body">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="card__footer">
      <slot name="footer" />
    </footer>
  </article>
</template>

<style scoped>
.card {
  position: relative;
  background: var(--color-surface-card);
  color: var(--color-ink);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-none);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}
.card--soft     { background: var(--color-surface-soft); }
.card--elevated { background: var(--color-surface-elevated); }

.card--pad-sm { padding: var(--space-md); }
.card--pad-md { padding: var(--space-lg); }
.card--pad-lg { padding: var(--space-xl); }

.card__stripe {
  position: absolute;
  inset: 0 0 auto 0;
}

.card__head {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}
.card__eyebrow {
  color: var(--color-muted);
}
.card__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-title-lg);
  font-weight: var(--fw-bold);
  text-transform: uppercase;
  letter-spacing: 0;
  line-height: 1.3;
}
.card__body {
  color: var(--color-body);
  font-weight: var(--fw-body);
  line-height: 1.5;
}
.card__footer {
  border-top: 1px solid var(--color-hairline);
  padding-top: var(--space-md);
}
</style>
