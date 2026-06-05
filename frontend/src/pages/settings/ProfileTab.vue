<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { api } from '@/api/client';
import { useAuthStore } from '@/stores/auth';
import AppButton from '@/components/ui/AppButton.vue';
import AppInput from '@/components/ui/AppInput.vue';
import AppToast from '@/components/ui/AppToast.vue';
import Step1Basic from '@/pages/onboarding/Step1Basic.vue';
import Step2Health from '@/pages/onboarding/Step2Health.vue';
import Step3Diet from '@/pages/onboarding/Step3Diet.vue';

const auth = useAuthStore();

const account = reactive({
  display_name: '' as string,
  email: '' as string,
});
const basic = reactive({
  age: null as number | null,
  gender: null as string | null,
  height_cm: null as number | null,
  weight_kg: null as number | null,
});
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

const loading = ref(true);
const saving = ref(false);
const toast = ref<{ tone: 'success' | 'error'; msg: string } | null>(null);

function errMsg(e: unknown, fallback: string) {
  return (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback;
}

async function load() {
  loading.value = true;
  // 각 프로필을 독립적으로 로드 — 한 엔드포인트가 실패해도 나머지는 채운다.
  const [a, b, h, d] = await Promise.allSettled([
    api.get('/me/profile/account'),
    api.get('/me/profile/basic'),
    api.get('/me/profile/health'),
    api.get('/me/profile/diet'),
  ]);
  if (a.status === 'fulfilled' && a.value.data) {
    account.display_name = a.value.data.display_name ?? '';
    account.email = a.value.data.email ?? '';
  }
  if (b.status === 'fulfilled' && b.value.data) {
    basic.age = b.value.data.age ?? null;
    basic.gender = b.value.data.gender ?? null;
    basic.height_cm = b.value.data.height_cm ?? null;
    basic.weight_kg = b.value.data.weight_kg ?? null;
  }
  if (h.status === 'fulfilled' && h.value.data) {
    health.allergies = h.value.data.allergies ?? [];
    health.diseases = h.value.data.diseases ?? [];
    health.goal = h.value.data.goal ?? null;
    health.target_calories_kcal = h.value.data.target_calories_kcal ?? null;
  }
  if (d.status === 'fulfilled' && d.value.data) {
    diet.meals_per_day = d.value.data.meals_per_day ?? null;
    diet.dining_out_per_week = d.value.data.dining_out_per_week ?? null;
    diet.delivery_per_week = d.value.data.delivery_per_week ?? null;
    diet.avoid_ingredients = d.value.data.avoid_ingredients ?? [];
    diet.prefer_categories = d.value.data.prefer_categories ?? [];
    diet.cooking_time_max_min = d.value.data.cooking_time_max_min ?? 30;
  }
  const failed = [a, b, h, d].some((r) => r.status === 'rejected');
  if (failed) {
    toast.value = { tone: 'error', msg: '일부 프로필을 불러오지 못했습니다.' };
  }
  loading.value = false;
}

async function save() {
  saving.value = true;
  try {
    const name = account.display_name.trim();
    const [acc] = await Promise.all([
      api.put('/me/profile/account', { display_name: name || null }),
      api.put('/me/profile/basic', { ...basic }),
      api.put('/me/profile/health', { ...health }),
      api.put('/me/profile/diet', { ...diet }),
    ]);
    account.display_name = acc.data?.display_name ?? '';
    if (auth.user) auth.user.displayName = acc.data?.display_name ?? null;
    toast.value = { tone: 'success', msg: '프로필이 저장되었습니다.' };
  } catch (e: unknown) {
    toast.value = { tone: 'error', msg: errMsg(e, '저장 실패') };
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section class="tab">
    <p
      v-if="loading"
      class="muted"
    >
      불러오는 중…
    </p>
    <template v-else>
      <div class="tab-head">
        <div class="tab-head__text">
          <h2 class="tab-head__title">
            계정 & 개인정보
          </h2>
          <p class="tab-head__sub">
            정보를 수정한 뒤 저장을 눌러주세요.
          </p>
        </div>
        <div class="tab-head__actions">
          <AppButton
            variant="outline"
            :disabled="saving"
            @click="load"
          >
            되돌리기
          </AppButton>
          <AppButton
            variant="primary"
            :disabled="saving"
            @click="save"
          >
            {{ saving ? '저장 중…' : '저장' }}
          </AppButton>
        </div>
      </div>

      <section class="step">
        <span class="label-uppercase eyebrow">ACCOUNT</span>
        <h2>ACCOUNT</h2>
        <p>표시 이름 — 추천 인사말 등에 사용합니다.</p>
        <div class="grid">
          <AppInput
            v-model="account.display_name"
            label="DISPLAY NAME"
            placeholder="예: 홍길동"
          />
          <AppInput
            :model-value="account.email"
            label="EMAIL"
            disabled
            hint="이메일은 변경할 수 없습니다"
          />
        </div>
      </section>

      <Step1Basic v-model="basic" />
      <Step2Health v-model="health" />
      <Step3Diet v-model="diet" />

      <footer class="actions">
        <AppButton
          variant="ghost"
          :disabled="saving"
          @click="load"
        >
          되돌리기
        </AppButton>
        <div class="spacer" />
        <AppButton
          variant="primary"
          :disabled="saving"
          @click="save"
        >
          {{ saving ? '저장 중…' : '저장' }}
        </AppButton>
      </footer>
    </template>

    <AppToast
      :open="!!toast"
      :tone="toast?.tone ?? 'info'"
      title="PROFILE"
      @close="toast = null"
    >
      {{ toast?.msg }}
    </AppToast>
  </section>
</template>

<style scoped>
.tab { display: flex; flex-direction: column; gap: var(--space-lg); padding-bottom: 72px; }
.muted { color: var(--color-muted); }
.tab-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
  padding-bottom: var(--space-md);
  border-bottom: 1px solid var(--color-hairline);
}
.tab-head__text { display: flex; flex-direction: column; gap: 2px; }
.tab-head__title {
  margin: 0;
  font-family: var(--font-display);
  font-weight: var(--fw-semibold);
  font-size: var(--fs-display-xs);
  color: var(--color-ink);
}
.tab-head__sub { margin: 0; color: var(--color-muted); font-size: var(--fs-body-sm); }
.tab-head__actions { display: flex; align-items: center; gap: var(--space-sm); }
.step { display: flex; flex-direction: column; gap: var(--space-md); }
.eyebrow { color: var(--color-muted); }
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-md); }
.actions {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  margin: 0 calc(-1 * var(--space-md));
  position: sticky;
  bottom: 0;
  background: var(--color-canvas);
  border-top: 1px solid var(--color-hairline);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  box-shadow: 0 -10px 28px -14px rgba(0, 0, 0, 0.22);
  z-index: 5;
}
.spacer { flex: 1; }
</style>
