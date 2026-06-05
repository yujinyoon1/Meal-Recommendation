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

// 002 FR-002 — 추천 수정(제외할 재료). 제출 시 학습에 반영됨.
const excludeInput = ref('');
const excluded = ref<string[]>([]);
const editsSaved = ref(false);

function addExclude() {
  const v = excludeInput.value.trim();
  if (v && !excluded.value.includes(v)) excluded.value.push(v);
  excludeInput.value = '';
}
function removeExclude(name: string) {
  excluded.value = excluded.value.filter((x) => x !== name);
}
async function submitEdits() {
  if (excluded.value.length === 0) return;
  submitting.value = true;
  error.value = null;
  try {
    await api.post(
      `/recommendations/${props.recommendationId}/edits`,
      excluded.value.map((name) => ({ action: 'exclude', target_type: 'ingredient', target_ref: name })),
    );
    editsSaved.value = true;
    excluded.value = [];
  } catch (e: unknown) {
    error.value = (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '수정 반영 실패';
  } finally {
    submitting.value = false;
  }
}

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
    <div class="edits">
      <p class="edits__title">맞지 않는 재료가 있나요? 제외하면 다음 추천에 반영됩니다.</p>
      <div class="edits__input">
        <input
          v-model="excludeInput"
          class="edits__field"
          placeholder="예: 가지"
          maxlength="120"
          @keyup.enter="addExclude"
        >
        <AppButton
          variant="ghost"
          :disabled="!excludeInput.trim()"
          @click="addExclude"
        >
          추가
        </AppButton>
      </div>
      <div
        v-if="excluded.length"
        class="edits__chips"
      >
        <button
          v-for="name in excluded"
          :key="name"
          type="button"
          class="chip"
          @click="removeExclude(name)"
        >
          {{ name }} ✕
        </button>
      </div>
    </div>
    <template #footer>
      <div class="actions">
        <AppButton
          v-if="excluded.length"
          variant="secondary"
          :disabled="submitting"
          @click="submitEdits"
        >
          제외 반영
        </AppButton>
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
      :open="editsSaved"
      tone="success"
      title="반영됨"
      @close="editsSaved = false"
    >
      제외한 재료가 다음 추천에 반영됩니다.
    </AppToast>
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
.actions { display: flex; justify-content: flex-end; gap: var(--space-sm); }
.edits { margin-top: var(--space-md); }
.edits__title { color: var(--color-muted); font-size: var(--fs-body-sm); margin: 0 0 var(--space-xs); }
.edits__input { display: flex; gap: var(--space-sm); }
.edits__field {
  flex: 1;
  background: var(--color-canvas);
  color: var(--color-ink);
  border: 1px solid var(--color-hairline);
  padding: var(--space-sm) var(--space-md);
  font: inherit;
  border-radius: var(--radius-md);
}
.edits__field:focus { outline: none; border-color: var(--color-ink); }
.edits__chips { display: flex; flex-wrap: wrap; gap: var(--space-xs); margin-top: var(--space-sm); }
.chip {
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  color: var(--color-ink);
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-size: var(--fs-body-sm);
  cursor: pointer;
}
.chip:hover { border-color: var(--color-ink); }
</style>
