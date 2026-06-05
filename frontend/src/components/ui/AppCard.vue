<script setup lang="ts">
/**
 * AppCard — Wise rounded-xl 카드.
 * variant:
 *  - default  : white(#fff) 카드. sage canvas 위에서 surface 대비로 elevation.
 *  - soft     : sage(#e8ebe6) feature card.
 *  - green    : pale lime(#e2f6d5) feature card.
 *  - dark     : ink 배경 + lime green 텍스트 (시그니처 promo).
 *  - elevated : white + 미세 그림자.
 * `accent` prop true → 상단 4px 라임 그린 액센트 라인.
 */
defineProps<{
  title?: string;
  eyebrow?: string;
  variant?: 'default' | 'soft' | 'green' | 'dark' | 'elevated';
  /** 상단 라임 그린 액센트 라인 (시그니처 강조용) */
  accent?: boolean;
  /** @deprecated 'accent' 사용. 하위호환을 위해 유지. */
  mStripe?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}>();
</script>

<template>
  <article
    class="card"
    :class="[`card--${variant ?? 'default'}`, `card--pad-${padding ?? 'md'}`]"
  >
    <div
      v-if="accent || mStripe"
      class="card__accent"
    />
    <header
      v-if="eyebrow || title"
      class="card__head"
    >
      <span
        v-if="eyebrow"
        class="card__eyebrow"
      >{{ eyebrow }}</span>
      <h3
        v-if="title"
        class="card__title"
      >
        {{ title }}
      </h3>
    </header>
    <div class="card__body">
      <slot />
    </div>
    <footer
      v-if="$slots.footer"
      class="card__footer"
    >
      <slot name="footer" />
    </footer>
  </article>
</template>

<style scoped>
.card {
  position: relative;
  background: var(--color-canvas);
  color: var(--color-ink);
  border: none;
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  overflow: hidden;
}
.card--soft     { background: var(--color-canvas-soft); }
.card--green    { background: var(--color-primary-pale); }
.card--dark     {
  background: var(--color-ink);
  color: var(--color-primary);
}
.card--dark .card__title { color: var(--color-primary); }
.card--dark .card__body  { color: var(--color-primary-pale); }
.card--dark .card__eyebrow { color: var(--color-primary-pale); }
.card--elevated {
  background: var(--color-canvas);
  box-shadow: var(--shadow-md);
}

.card--pad-sm { padding: var(--space-lg); }
.card--pad-md { padding: var(--space-xl); }
.card--pad-lg { padding: var(--space-2xl); }

.card__accent {
  position: absolute;
  inset: 0 0 auto 0;
  height: 4px;
  background: var(--color-primary);
}

.card__head {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}
.card__eyebrow {
  font-size: var(--fs-caption);
  font-weight: var(--fw-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-muted);
}
.card__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-display-xs);
  font-weight: var(--fw-semibold);
  letter-spacing: -0.01em;
  line-height: 1.25;
  color: var(--color-ink);
}
.card__body {
  color: var(--color-body);
  font-weight: var(--fw-regular);
  line-height: 1.5;
}
.card__footer {
  border-top: 1px solid var(--color-hairline);
  padding-top: var(--space-md);
}
.card--dark .card__footer {
  border-top-color: rgba(255, 255, 255, 0.12);
}
</style>
