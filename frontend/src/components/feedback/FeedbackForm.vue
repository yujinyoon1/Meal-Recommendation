<script setup lang="ts">
import { ref } from 'vue';
import { api } from '@/api/client';
import AppButton from '@/components/ui/AppButton.vue';
import AppCard from '@/components/ui/AppCard.vue';
import AppToast from '@/components/ui/AppToast.vue';

const props = defineProps<{ recommendationId: number }>();
const emit = defineEmits<{ (e: 'submitted', payload: { id: number; rating: number; comment: string | null }): void }>();

const rating = ref(0);
const comment = ref('');
const submitting = ref(false);
const error = ref<string | null>(null);
const ok = ref(false);

async function onSubmit() {
  if (rating.value < 1 || rating.value > 5) {
    error.value = '별점을 선택해 주세요.';
    return;
  }
  submitting.value = true;
  error.value = null;
  try {
    const { data } = await api.post(`/recommendations/${props.recommendationId}/feedback`, {
      rating: rating.value,
      comment: comment.value || null,
    });
    ok.value = true;
    emit('submitted', { id: data.id, rating: rating.value, comment: comment.value || null });
    comment.value = '';
  } catch (e: unknown) {
    error.value = (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '피드백 전송 실패';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <AppCard
    eyebrow="피드백"
    title="이 추천은 어땠나요?"
    variant="soft"
    padding="lg"
  >
    <div
      class="stars"
      role="radiogroup"
      aria-label="별점"
    >
      <button
        v-for="i in 5"
        :key="i"
        type="button"
        class="star"
        :class="{ on: i <= rating }"
        :aria-checked="i === rating"
        role="radio"
        @click="rating = i"
      >
        ★
      </button>
      <span class="stars__label">{{ rating || '—' }} / 5</span>
    </div>
    <textarea
      v-model="comment"
      class="comment"
      placeholder="아쉬웠던 점, 좋았던 점을 알려주세요 (선택)"
      rows="3"
      maxlength="1000"
    />
    <template #footer>
      <div class="actions">
        <AppButton
          variant="primary"
          :disabled="submitting"
          @click="onSubmit"
        >
          {{ submitting ? '전송 중…' : '피드백 보내기' }}
        </AppButton>
      </div>
    </template>
    <AppToast
      :open="ok"
      tone="success"
      title="감사합니다"
      @close="ok = false"
    >
      피드백이 저장되었습니다. 다음 추천에 반영됩니다.
    </AppToast>
    <AppToast
      :open="!!error"
      tone="error"
      title="오류"
      @close="error = null"
    >
      {{ error }}
    </AppToast>
  </AppCard>
</template>

<style scoped>
.stars { display: flex; align-items: center; gap: var(--space-xs); }
.star {
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  color: var(--color-muted);
  padding: 6px 12px;
  font-size: 20px;
  cursor: pointer;
  border-radius: var(--radius-pill);
  transition: color 80ms ease, border-color 80ms ease, background-color 80ms ease;
}
.star:hover { border-color: var(--color-ink); }
.star.on {
  color: var(--color-warning-deep);
  border-color: var(--color-warning);
  background: #fff5d6;
}
.stars__label {
  margin-left: var(--space-sm);
  color: var(--color-muted);
  font-size: var(--fs-body-sm);
  font-weight: var(--fw-semibold);
}
.comment {
  width: 100%;
  background: var(--color-canvas);
  color: var(--color-ink);
  border: 1px solid var(--color-ink);
  padding: var(--space-md) var(--space-lg);
  font: inherit;
  font-size: var(--fs-body);
  line-height: 1.55;
  border-radius: var(--radius-md);
  resize: vertical;
  min-height: 96px;
  transition: box-shadow 120ms ease;
}
.comment::placeholder { color: var(--color-muted); }
.comment:focus {
  outline: none;
  border-color: var(--color-ink-deep);
  box-shadow: 0 0 0 3px var(--color-primary-pale);
}
.actions { display: flex; justify-content: flex-end; }
</style>
