<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api/client';
import AppButton from '@/components/ui/AppButton.vue';
import AppToast from '@/components/ui/AppToast.vue';
import Step1Basic from './Step1Basic.vue';
import Step2Health from './Step2Health.vue';
import Step3Diet from './Step3Diet.vue';

const router = useRouter();

const step = ref<1 | 2 | 3>(1);

const basic = reactive({ age: null as number | null, gender: null as string | null, height_cm: null as number | null, weight_kg: null as number | null });
const health = reactive({
  allergies: [] as string[],
  diseases: [] as string[],
  goal: null as 'lose_weight' | 'maintain' | 'gain_muscle' | null,
  target_calories_kcal: null as number | null,
});
const diet = reactive({
  meals_per_day: null as number | null,
  dining_out_per_week: null as number | null,
  delivery_per_week: null as number | null,
  avoid_ingredients: [] as string[],
  prefer_categories: [] as string[],
  cooking_time_max_min: 30,
});

const saving = ref(false);
const error = ref<string | null>(null);

async function finish() {
  saving.value = true;
  error.value = null;
  try {
    await Promise.all([
      api.put('/me/profile/basic', basic),
      api.put('/me/profile/health', health),
      api.put('/me/profile/diet', diet),
    ]);
    router.replace('/inventory');
  } catch (e: unknown) {
    error.value = (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '저장 실패';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section class="wizard">
    <div class="m-stripe" />
    <header class="wizard__head">
      <h1>ONBOARDING</h1>
      <div class="progress">
        <span :class="{ on: step >= 1 }">1</span>
        <span class="bar" :class="{ on: step >= 2 }" />
        <span :class="{ on: step >= 2 }">2</span>
        <span class="bar" :class="{ on: step >= 3 }" />
        <span :class="{ on: step >= 3 }">3</span>
      </div>
    </header>

    <Step1Basic v-if="step === 1" v-model="basic" />
    <Step2Health v-else-if="step === 2" v-model="health" />
    <Step3Diet v-else v-model="diet" />

    <footer class="wizard__nav">
      <AppButton v-if="step > 1" variant="outline" @click="step = (step - 1) as 1 | 2 | 3">PREV</AppButton>
      <div class="spacer" />
      <AppButton v-if="step < 3" variant="primary" @click="step = (step + 1) as 1 | 2 | 3">NEXT</AppButton>
      <AppButton v-else variant="primary" :disabled="saving" @click="finish">
        {{ saving ? 'SAVING…' : 'FINISH' }}
      </AppButton>
    </footer>

    <AppToast :open="!!error" tone="error" title="ERROR" @close="error = null">{{ error }}</AppToast>
  </section>
</template>

<style scoped>
.wizard { max-width: 720px; margin: 0 auto; padding: var(--space-lg); display: flex; flex-direction: column; gap: var(--space-lg); }
.wizard__head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-md); margin-top: var(--space-md); }
.wizard__head h1 { font-size: var(--fs-display-md); margin: 0; }
.progress { display: flex; align-items: center; gap: var(--space-xs); color: var(--color-muted); }
.progress span:not(.bar) {
  width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--color-hairline);
  font-size: var(--fs-caption); letter-spacing: var(--ls-label);
}
.progress span.on:not(.bar) {
  background: var(--color-ink); color: var(--color-canvas); border-color: var(--color-ink);
}
.progress .bar { width: 24px; height: 1px; background: var(--color-hairline); }
.progress .bar.on { background: var(--color-ink); }
.wizard__nav { display: flex; align-items: center; gap: var(--space-md); border-top: 1px solid var(--color-hairline); padding-top: var(--space-md); }
.spacer { flex: 1; }
</style>
