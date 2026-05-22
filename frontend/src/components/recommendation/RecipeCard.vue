<script setup lang="ts">
import { ref } from 'vue';
import AppCard from '@/components/ui/AppCard.vue';
import AppBadge from '@/components/ui/AppBadge.vue';
import type { Recipe } from '@/stores/recommendation';

defineProps<{ recipe: Recipe; index: number }>();

const showSteps = ref(true);
</script>

<template>
  <AppCard
    variant="elevated"
    padding="lg"
    :m-stripe="index === 0"
  >
    <header class="recipe-head">
      <span class="label-uppercase recipe-head__eyebrow">RECIPE {{ index + 1 }}</span>
      <h3 class="recipe-head__name">
        {{ recipe.name }}
      </h3>
      <div class="recipe-head__meta">
        <AppBadge
          tone="neutral"
          variant="outline"
        >
          {{ recipe.est_cooking_min }}분
        </AppBadge>
        <AppBadge
          :tone="recipe.difficulty === 'hard' ? 'red' : 'neutral'"
          variant="outline"
        >
          {{ recipe.difficulty.toUpperCase() }}
        </AppBadge>
      </div>
      <p
        v-if="recipe.description"
        class="recipe-head__desc"
      >
        {{ recipe.description }}
      </p>
    </header>

    <section class="ingredients">
      <span class="label-uppercase">INGREDIENTS</span>
      <ul>
        <li
          v-for="(ing, i) in recipe.ingredients"
          :key="i"
        >
          <span class="ing__name">{{ ing.name }}</span>
          <span class="ing__qty">{{ ing.quantity }} {{ ing.unit }}</span>
          <span
            v-if="ing.substitute"
            class="ing__sub"
          >↔ {{ ing.substitute }}</span>
        </li>
      </ul>
    </section>

    <section class="steps">
      <button
        class="steps__toggle label-uppercase"
        @click="showSteps = !showSteps"
      >
        STEPS
        <span
          class="steps__chevron"
          :class="{ open: showSteps }"
        >▾</span>
      </button>
      <ol v-if="showSteps">
        <li
          v-for="(s, i) in recipe.steps"
          :key="i"
        >
          {{ s }}
        </li>
      </ol>
    </section>
  </AppCard>
</template>

<style scoped>
.recipe-head { display: flex; flex-direction: column; gap: var(--space-xs); }
.recipe-head__eyebrow { color: var(--color-muted); }
.recipe-head__name { font-family: var(--font-display); font-size: var(--fs-title-lg); font-weight: var(--fw-bold); text-transform: uppercase; margin: 0; }
.recipe-head__meta { display: flex; gap: var(--space-xs); flex-wrap: wrap; }
.recipe-head__desc { color: var(--color-body); font-size: var(--fs-body-sm); margin: 0; }
.ingredients { display: flex; flex-direction: column; gap: var(--space-xs); border-top: 1px solid var(--color-hairline); padding-top: var(--space-md); }
.ingredients ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
.ingredients li { display: grid; grid-template-columns: 1fr auto auto; gap: var(--space-sm); color: var(--color-body); font-size: var(--fs-body-sm); }
.ing__name { color: var(--color-body-strong); }
.ing__qty { color: var(--color-muted); font-variant-numeric: tabular-nums; }
.ing__sub { color: var(--color-bmw-blue); font-size: var(--fs-caption); }
.steps { border-top: 1px solid var(--color-hairline); padding-top: var(--space-md); display: flex; flex-direction: column; gap: var(--space-sm); }
.steps__toggle {
  background: none; border: none; color: var(--color-ink); cursor: pointer;
  display: flex; align-items: center; justify-content: space-between; padding: 0;
}
.steps__chevron { transition: transform 120ms ease; }
.steps__chevron.open { transform: rotate(180deg); }
.steps ol { padding-left: 1.25rem; margin: 0; color: var(--color-body); display: flex; flex-direction: column; gap: var(--space-xs); }
</style>
