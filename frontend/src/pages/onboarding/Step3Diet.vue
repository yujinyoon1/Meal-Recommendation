<script setup lang="ts">
import AppInput from '@/components/ui/AppInput.vue';

interface Model {
  meals_per_day: number | null;
  dining_out_per_week: number | null;
  delivery_per_week: number | null;
  avoid_ingredients: string[];
  prefer_categories: string[];
  cooking_time_max_min: number;
}
const props = defineProps<{ modelValue: Model }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: Model): void }>();

function patch<K extends keyof Model>(key: K, val: Model[K]) {
  emit('update:modelValue', { ...props.modelValue, [key]: val });
}
function asNum(s: string | number | null) {
  const n = typeof s === 'string' ? Number(s) : s;
  return n != null && Number.isFinite(n) ? n : null;
}
function splitCsv(s: string): string[] {
  return s.split(/[,\n]+/).map((x) => x.trim()).filter(Boolean);
}
function joinCsv(arr: string[]): string { return arr.join(', '); }
</script>

<template>
  <section class="step">
    <span class="label-uppercase eyebrow">STEP 3 / 3</span>
    <h2>DIET</h2>
    <p>식습관 — 1식/하루, 외식·배달 빈도, 조리 시간 상한.</p>

    <div class="grid">
      <AppInput
        :model-value="modelValue.meals_per_day"
        label="MEALS / DAY"
        type="number"
        @update:model-value="patch('meals_per_day', asNum($event))"
      />
      <AppInput
        :model-value="modelValue.dining_out_per_week"
        label="DINING OUT / WK"
        type="number"
        @update:model-value="patch('dining_out_per_week', asNum($event))"
      />
      <AppInput
        :model-value="modelValue.delivery_per_week"
        label="DELIVERY / WK"
        type="number"
        @update:model-value="patch('delivery_per_week', asNum($event))"
      />
      <AppInput
        :model-value="modelValue.cooking_time_max_min"
        label="COOK TIME MAX (MIN)"
        type="number"
        @update:model-value="patch('cooking_time_max_min', asNum($event) ?? 30)"
      />
    </div>

    <AppInput
      :model-value="joinCsv(modelValue.avoid_ingredients)"
      label="AVOID INGREDIENTS"
      placeholder="콤마로 구분 (예: 오이, 고수)"
      @update:model-value="patch('avoid_ingredients', splitCsv($event))"
    />
    <AppInput
      :model-value="joinCsv(modelValue.prefer_categories)"
      label="PREFER CATEGORIES"
      placeholder="콤마로 구분 (예: 한식, 채소)"
      @update:model-value="patch('prefer_categories', splitCsv($event))"
    />
  </section>
</template>

<style scoped>
.step { display: flex; flex-direction: column; gap: var(--space-md); }
.eyebrow { color: var(--color-muted); }
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-md); }
</style>
