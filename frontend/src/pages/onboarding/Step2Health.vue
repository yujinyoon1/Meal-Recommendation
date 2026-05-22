<script setup lang="ts">
import { ref } from 'vue';
import AppInput from '@/components/ui/AppInput.vue';
import AppBadge from '@/components/ui/AppBadge.vue';
import AppButton from '@/components/ui/AppButton.vue';

interface Model {
  allergies: string[];
  diseases: string[];
  goal: 'lose_weight' | 'maintain' | 'gain_muscle' | null;
  target_calories_kcal: number | null;
}
const props = defineProps<{ modelValue: Model }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: Model): void }>();

function patch<K extends keyof Model>(key: K, val: Model[K]) {
  emit('update:modelValue', { ...props.modelValue, [key]: val });
}

const allergyInput = ref('');
const diseaseInput = ref('');

function addAllergy() {
  const v = allergyInput.value.trim();
  if (!v) return;
  if (props.modelValue.allergies.includes(v)) { allergyInput.value = ''; return; }
  patch('allergies', [...props.modelValue.allergies, v]);
  allergyInput.value = '';
}
function removeAllergy(v: string) {
  patch('allergies', props.modelValue.allergies.filter((a) => a !== v));
}
function addDisease() {
  const v = diseaseInput.value.trim();
  if (!v) return;
  if (props.modelValue.diseases.includes(v)) { diseaseInput.value = ''; return; }
  patch('diseases', [...props.modelValue.diseases, v]);
  diseaseInput.value = '';
}
function removeDisease(v: string) {
  patch('diseases', props.modelValue.diseases.filter((a) => a !== v));
}
</script>

<template>
  <section class="step">
    <span class="label-uppercase eyebrow">STEP 2 / 3</span>
    <h2>HEALTH</h2>
    <p>알레르기·질병·목표 — 알레르기는 추천에서 절대 배제됩니다.</p>

    <div class="chip-row">
      <span class="label-uppercase">ALLERGIES</span>
      <div class="chips">
        <AppBadge
          v-for="a in modelValue.allergies"
          :key="a"
          tone="red"
          variant="solid"
        >
          {{ a }} <button
            class="chip-x"
            @click="removeAllergy(a)"
          >
            ×
          </button>
        </AppBadge>
      </div>
      <div class="row">
        <AppInput
          v-model="allergyInput"
          placeholder="예: 땅콩"
        />
        <AppButton
          variant="outline"
          @click="addAllergy"
        >
          ADD
        </AppButton>
      </div>
    </div>

    <div class="chip-row">
      <span class="label-uppercase">DISEASES</span>
      <div class="chips">
        <AppBadge
          v-for="d in modelValue.diseases"
          :key="d"
          tone="warn"
          variant="outline"
        >
          {{ d }} <button
            class="chip-x"
            @click="removeDisease(d)"
          >
            ×
          </button>
        </AppBadge>
      </div>
      <div class="row">
        <AppInput
          v-model="diseaseInput"
          placeholder="예: 고혈압"
        />
        <AppButton
          variant="outline"
          @click="addDisease"
        >
          ADD
        </AppButton>
      </div>
    </div>

    <div class="grid">
      <label class="field">
        <span class="label-uppercase">GOAL</span>
        <select
          class="select"
          :value="modelValue.goal ?? ''"
          @change="patch('goal', ((e: Event) => (e.target as HTMLSelectElement).value as Model['goal'] || null)($event))"
        >
          <option value="">선택</option>
          <option value="lose_weight">감량</option>
          <option value="maintain">유지</option>
          <option value="gain_muscle">증량</option>
        </select>
      </label>
      <AppInput
        :model-value="modelValue.target_calories_kcal"
        label="TARGET KCAL / DAY"
        type="number"
        hint="비워두면 표준값 사용"
        @update:model-value="patch('target_calories_kcal', $event ? Number($event) : null)"
      />
    </div>
  </section>
</template>

<style scoped>
.step { display: flex; flex-direction: column; gap: var(--space-md); }
.eyebrow { color: var(--color-muted); }
.chip-row { display: flex; flex-direction: column; gap: var(--space-xs); }
.chips { display: flex; flex-wrap: wrap; gap: var(--space-xs); min-height: 24px; }
.chip-x {
  background: none; border: none; color: inherit; cursor: pointer; padding: 0 0 0 4px; font-size: 14px;
}
.row { display: flex; gap: var(--space-xs); align-items: end; }
.row > :first-child { flex: 1; }
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-md); }
.field { display: flex; flex-direction: column; gap: var(--space-xs); }
.select {
  height: 48px; padding: 12px 16px;
  background: var(--color-surface-card); color: var(--color-ink);
  border: 1px solid var(--color-hairline); border-radius: var(--radius-none); font: inherit;
}
</style>
