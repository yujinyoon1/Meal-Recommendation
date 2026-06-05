<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '@/api/client';
import RecipeCard from '@/components/recommendation/RecipeCard.vue';
import NutritionChart from '@/components/recommendation/NutritionChart.vue';
import FeedbackForm from '@/components/feedback/FeedbackForm.vue';
import AppBadge from '@/components/ui/AppBadge.vue';
import type { RecommendationResult } from '@/stores/recommendation';

interface Feedback { id: number; rating: number; comment: string | null; created_at: string }
interface DetailWithFeedback extends RecommendationResult { feedbacks: Feedback[] }

const route = useRoute();
const data = ref<DetailWithFeedback | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const id = Number(route.params.id);
    const r = await api.get<DetailWithFeedback>(`/recommendations/${id}/full`);
    data.value = r.data;
  } catch (e: unknown) {
    error.value = (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '조회 실패';
  } finally {
    loading.value = false;
  }
}

function onSubmitted(p: { id: number; rating: number; comment: string | null }) {
  if (!data.value) return;
  data.value.feedbacks = [
    { id: p.id, rating: p.rating, comment: p.comment, created_at: new Date().toISOString() },
    ...data.value.feedbacks,
  ];
}

onMounted(load);
</script>

<template>
  <section class="detail">
    <div class="m-stripe" />
    <header class="detail__head">
      <span class="label-uppercase eyebrow">HISTORY DETAIL</span>
      <h1 v-if="data">
        RECOMMENDATION #{{ data.recommendation_id }}
      </h1>
    </header>

    <p
      v-if="loading"
      class="muted"
    >
      불러오는 중…
    </p>
    <p
      v-else-if="error"
      class="error"
    >
      {{ error }}
    </p>

    <template v-else-if="data">
      <div class="recipes">
        <RecipeCard
          v-for="(r, i) in data.recipes"
          :key="i"
          :recipe="r"
          :index="i"
        />
      </div>

      <NutritionChart
        v-if="data.nutrition"
        :nutrition="data.nutrition"
      />

      <section
        v-if="data.feedbacks.length"
        class="feedback-list"
      >
        <h2>FEEDBACKS</h2>
        <ul>
          <li
            v-for="f in data.feedbacks"
            :key="f.id"
          >
            <AppBadge
              tone="warn"
              variant="solid"
            >
              ★ {{ f.rating }}
            </AppBadge>
            <span class="comment">{{ f.comment || '(코멘트 없음)' }}</span>
            <span class="when">{{ new Date(f.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) }}</span>
          </li>
        </ul>
      </section>

      <FeedbackForm
        :recommendation-id="data.recommendation_id"
        @submitted="onSubmitted"
      />

      <p class="disclaimer">
        {{ data.disclaimer }}
      </p>
    </template>
  </section>
</template>

<style scoped>
.detail { display: flex; flex-direction: column; gap: var(--space-lg); }
.detail__head h1 { font-size: var(--fs-display-md); margin: var(--space-xs) 0; }
.eyebrow { color: var(--color-muted); }
.muted { color: var(--color-muted); }
.error { color: var(--color-m-red); }
.recipes { display: flex; flex-direction: column; gap: var(--space-lg); }
.feedback-list h2 { font-size: var(--fs-title-lg); margin: 0 0 var(--space-sm); }
.feedback-list ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-sm); }
.feedback-list li { display: grid; grid-template-columns: auto 1fr auto; gap: var(--space-sm); align-items: center; padding: var(--space-sm); border: 1px solid var(--color-hairline); background: var(--color-surface-soft); }
.comment { color: var(--color-body); }
.when { color: var(--color-muted); font-size: var(--fs-caption); }
.disclaimer { color: var(--color-muted); font-size: var(--fs-caption); border-top: 1px solid var(--color-hairline); padding-top: var(--space-md); }
</style>
