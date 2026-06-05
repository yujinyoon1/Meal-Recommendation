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
      <div class="row">
        <AppInput
          v-model="allergyInput"
          placeholder="예: 땅콩"
          @keyup.enter="addAllergy"
        />
        <AppButton
          variant="outline"
          @click="addAllergy"
        >
          ADD
        </AppButton>
      </div>
      <ul
        v-if="modelValue.allergies.length"
        class="item-list"
      >
        <li
          v-for="a in modelValue.allergies"
          :key="a"
          class="item"
        >
          <AppBadge
            tone="red"
            variant="solid"
          >
            {{ a }}
          </AppBadge>
          <button
            class="item-x"
            type="button"
            :aria-label="`${a} 삭제`"
            @click="removeAllergy(a)"
          >
            ×
          </button>
        </li>
      </ul>
      <p
        v-else
        class="empty-hint"
      >
        추가한 알레르기가 여기에 표시됩니다.
      </p>
    </div>

    <div class="chip-row">
      <span class="label-uppercase">DISEASES</span>
      <div class="row">
        <AppInput
          v-model="diseaseInput"
          placeholder="예: 고혈압"
          @keyup.enter="addDisease"
        />
        <AppButton
          variant="outline"
          @click="addDisease"
        >
          ADD
        </AppButton>
      </div>
      <ul
        v-if="modelValue.diseases.length"
        class="item-list"
      >
        <li
          v-for="d in modelValue.diseases"
          :key="d"
          class="item"
        >
          <AppBadge
            tone="warn"
            variant="outline"
          >
            {{ d }}
          </AppBadge>
          <button
            class="item-x"
            type="button"
            :aria-label="`${d} 삭제`"
            @click="removeDisease(d)"
          >
            ×
          </button>
        </li>
      </ul>
      <p
        v-else
        class="empty-hint"
      >
        추가한 질병이 여기에 표시됩니다.
      </p>
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
.chip-row { display: flex; flex-direction: column; gap: var(--space-sm); }
.row { display: flex; gap: var(--space-xs); align-items: end; }

/* 입력칸 아래 추가된 항목 목록 */
.item-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}
.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: 8px 12px;
  background: var(--color-canvas-soft);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
}
.item-x {
  background: none;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 0 4px;
}
.item-x:hover { color: var(--color-ink); }
.empty-hint {
  margin: 0;
  font-size: var(--fs-body-sm);
  color: var(--color-muted);
}
.row > :first-child { flex: 1; }
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-md); }
.field { display: flex; flex-direction: column; gap: var(--space-xs); }
.select {
  height: 48px; padding: 12px 16px;
  background: var(--color-surface-card); color: var(--color-ink);
  border: 1px solid var(--color-hairline); border-radius: var(--radius-none); font: inherit;
}
</style>
