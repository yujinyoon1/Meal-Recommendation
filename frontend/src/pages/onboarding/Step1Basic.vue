<script setup lang="ts">
import { computed } from 'vue';
import AppInput from '@/components/ui/AppInput.vue';

const props = defineProps<{
  modelValue: { age: number | null; gender: string | null; height_cm: number | null; weight_kg: number | null };
}>();
const emit = defineEmits<{ (e: 'update:modelValue', v: typeof props.modelValue): void }>();

function patch<K extends keyof typeof props.modelValue>(key: K, val: unknown) {
  emit('update:modelValue', { ...props.modelValue, [key]: val as never });
}
function asNum(s: string | number | null) {
  const n = typeof s === 'string' ? Number(s) : s;
  return n != null && Number.isFinite(n) ? n : null;
}

const bmi = computed(() => {
  const h = props.modelValue.height_cm;
  const w = props.modelValue.weight_kg;
  if (!h || !w || h <= 0) return null;
  return Math.round((w / Math.pow(h / 100, 2)) * 10) / 10;
});
</script>

<template>
  <section class="step">
    <span class="label-uppercase eyebrow">STEP 1 / 3</span>
    <h2>BASIC</h2>
    <p>본인 신체 데이터 — 추천 칼로리 계산에 사용합니다.</p>

    <div class="grid">
      <AppInput
        :model-value="modelValue.age"
        label="AGE"
        type="number"
        @update:model-value="patch('age', asNum($event))"
      />
      <label class="field">
        <span class="label-uppercase">GENDER</span>
        <select
          class="select"
          :value="modelValue.gender ?? ''"
          @change="patch('gender', ($event.target as HTMLSelectElement).value || null)"
        >
          <option value="">선택</option>
          <option value="male">남성</option>
          <option value="female">여성</option>
          <option value="other">기타</option>
          <option value="prefer_not_say">밝히지 않음</option>
        </select>
      </label>
      <AppInput
        :model-value="modelValue.height_cm"
        label="HEIGHT (CM)"
        type="number"
        @update:model-value="patch('height_cm', asNum($event))"
      />
      <AppInput
        :model-value="modelValue.weight_kg"
        label="WEIGHT (KG)"
        type="number"
        @update:model-value="patch('weight_kg', asNum($event))"
      />
    </div>

    <div
      v-if="bmi"
      class="bmi-preview"
    >
      <span class="label-uppercase bmi-preview__label">BMI</span>
      <span class="bmi-preview__value">{{ bmi }}</span>
    </div>
  </section>
</template>

<style scoped>
.step { display: flex; flex-direction: column; gap: var(--space-md); }
.eyebrow { color: var(--color-muted); }
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
}
.field { display: flex; flex-direction: column; gap: var(--space-xs); }
.select {
  height: 48px;
  padding: 12px 16px;
  background: var(--color-surface-card);
  color: var(--color-ink);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-none);
  font: inherit;
}
.bmi-preview {
  border-top: 1px solid var(--color-hairline);
  padding-top: var(--space-md);
  display: flex;
  align-items: baseline;
  gap: var(--space-md);
}
.bmi-preview__label { color: var(--color-muted); }
.bmi-preview__value {
  font-family: var(--font-display);
  font-size: var(--fs-display-sm);
  font-weight: var(--fw-bold);
}
</style>
