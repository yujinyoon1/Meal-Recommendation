<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useRecommendationStore } from '@/stores/recommendation';
import AppButton from '@/components/ui/AppButton.vue';
import AppBadge from '@/components/ui/AppBadge.vue';
import AppToast from '@/components/ui/AppToast.vue';
import RecipeCard from '@/components/recommendation/RecipeCard.vue';
import NutritionChart from '@/components/recommendation/NutritionChart.vue';
import FeedbackForm from '@/components/feedback/FeedbackForm.vue';
import ShoppingListPanel from '@/components/shopping/ShoppingListPanel.vue';

const route = useRoute();
const router = useRouter();
const store = useRecommendationStore();

const id = computed(() => {
  const v = route.params.id;
  return Array.isArray(v) ? v[0] : v;
});

async function loadOrCheck() {
  if (id.value) {
    const n = Number(id.value);
    if (Number.isFinite(n) && (!store.current || store.current.recommendation_id !== n)) {
      await store.load(n);
    }
  } else if (!store.current) {
    router.replace('/inventory');
  }
}

onMounted(loadOrCheck);
watch(id, loadOrCheck);

const result = computed(() => store.current);
</script>

<template>
  <section class="result">
    <div class="m-stripe" />

    <header class="result__head">
      <span class="label-uppercase eyebrow">RECOMMENDATION</span>
      <h1>오늘의 한 끼</h1>
      <div
        v-if="result"
        class="result__meta"
      >
        <AppBadge
          :tone="result.status === 'validated' ? 'success' : 'red'"
          variant="solid"
        >
          {{ result.status.toUpperCase() }}
        </AppBadge>
        <AppBadge
          tone="neutral"
          variant="outline"
        >
          ID {{ result.recommendation_id }}
        </AppBadge>
      </div>
    </header>

    <p
      v-if="store.loading"
      class="result__loading"
    >
      불러오는 중…
    </p>

    <div v-else-if="result">
      <div
        v-if="result.warnings.length"
        class="warnings"
      >
        <span class="label-uppercase">WARNINGS</span>
        <ul>
          <li
            v-for="(w, i) in result.warnings"
            :key="i"
          >
            {{ w }}
          </li>
        </ul>
      </div>

      <div
        v-if="result.rationale && result.rationale.length"
        class="rationale"
      >
        <span class="rationale__label">왜 이 추천일까요?</span>
        <ul>
          <li
            v-for="(r, i) in result.rationale"
            :key="i"
          >
            {{ r.message }}
          </li>
        </ul>
      </div>

      <div class="recipes">
        <RecipeCard
          v-for="(r, i) in result.recipes"
          :key="i"
          :recipe="r"
          :index="i"
        />
      </div>

      <NutritionChart
        v-if="result.nutrition"
        :nutrition="result.nutrition"
      />

      <ShoppingListPanel
        v-if="result.status === 'validated'"
        :recommendation-id="result.recommendation_id"
      />

      <FeedbackForm
        v-if="result.status === 'validated'"
        :recommendation-id="result.recommendation_id"
      />

      <p class="disclaimer">
        {{ result.disclaimer }}
      </p>

      <footer class="result__nav">
        <AppButton
          variant="outline"
          @click="router.push('/inventory')"
        >
          ← INVENTORY
        </AppButton>
        <AppButton
          variant="primary"
          @click="router.push('/dashboard')"
        >
          DASHBOARD →
        </AppButton>
      </footer>
    </div>

    <AppToast
      :open="!!store.error"
      tone="error"
      title="ERROR"
      @close="store.error = null"
    >
      {{ store.error }}
    </AppToast>
  </section>
</template>

<style scoped>
.result { display: flex; flex-direction: column; gap: var(--space-lg); }
.result__head h1 { font-size: var(--fs-display-md); margin: var(--space-xs) 0; }
.eyebrow { color: var(--color-muted); }
.result__meta { display: flex; gap: var(--space-xs); }
.result__loading { color: var(--color-muted); }
.rationale {
  background: var(--color-primary-pale);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-lg);
  padding: var(--space-md) var(--space-lg);
  margin-bottom: var(--space-lg);
}
.rationale__label {
  display: block;
  font-weight: var(--fw-semibold);
  margin-bottom: var(--space-xs);
  color: var(--color-ink);
}
.rationale ul { margin: 0; padding-left: 1.25rem; color: var(--color-body-strong); }
.warnings {
  border: 1px solid var(--color-m-red);
  padding: var(--space-md);
  display: flex; flex-direction: column; gap: var(--space-xs);
  margin-bottom: var(--space-lg);
}
.warnings ul { margin: 0; padding-left: 1.25rem; color: var(--color-body-strong); }
.recipes { display: flex; flex-direction: column; gap: var(--space-lg); margin-bottom: var(--space-lg); }
.disclaimer {
  margin-top: var(--space-lg);
  padding: var(--space-md);
  border-top: 1px solid var(--color-hairline);
  color: var(--color-muted);
  font-size: var(--fs-caption);
}
.result__nav { display: flex; justify-content: space-between; gap: var(--space-md); padding-top: var(--space-md); border-top: 1px solid var(--color-hairline); }
</style>
