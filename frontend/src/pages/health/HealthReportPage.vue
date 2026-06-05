<script setup lang="ts">
/**
 * 002 FR-030~034 — 건강 분석 리포트 페이지.
 *  - 수동 체중 기록 입력
 *  - 체중 추이 차트 + 평균 영양 균형 + 부족/과잉
 *  - 의학 면책 포함 (FR-034)
 */
import { onMounted, ref } from 'vue';
import { useHealthStore } from '@/stores/health';
import AppCard from '@/components/ui/AppCard.vue';
import AppButton from '@/components/ui/AppButton.vue';
import AppBadge from '@/components/ui/AppBadge.vue';
import AppToast from '@/components/ui/AppToast.vue';
import WeightTrendChart from '@/components/health/WeightTrendChart.vue';

const health = useHealthStore();
const period = ref<'week' | 'month'>('week');

const today = new Date().toISOString().slice(0, 10);
const form = ref<{ logged_at: string; weight_kg: number | null; note: string }>({
  logged_at: today, weight_kg: null, note: '',
});
const saving = ref(false);
const savedOk = ref(false);
const error = ref<string | null>(null);

async function load() {
  await Promise.all([health.fetchLogs(), health.fetchReport(period.value)]);
}
async function changePeriod(p: 'week' | 'month') {
  period.value = p;
  await health.fetchReport(p);
}
async function saveLog() {
  if (form.value.weight_kg == null) { error.value = '체중을 입력해 주세요.'; return; }
  saving.value = true;
  error.value = null;
  try {
    await health.saveLog({ logged_at: form.value.logged_at, weight_kg: form.value.weight_kg, note: form.value.note || null });
    savedOk.value = true;
    form.value.note = '';
    await health.fetchReport(period.value);
  } catch (e: unknown) {
    error.value = (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '저장 실패';
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section class="health">
    <header class="head">
      <span class="head__eyebrow">Health</span>
      <h1 class="head__title">건강 리포트</h1>
      <p class="head__lede">체중과 식단 추이를 한눈에. 기록할수록 정확해져요.</p>
    </header>

    <AppCard
      eyebrow="기록"
      title="오늘 체중 기록"
      variant="soft"
      padding="lg"
    >
      <div class="form">
        <input
          v-model="form.logged_at"
          type="date"
          class="field"
        >
        <input
          v-model.number="form.weight_kg"
          type="number"
          step="0.1"
          min="0"
          placeholder="체중 (kg)"
          class="field"
        >
        <input
          v-model="form.note"
          type="text"
          placeholder="메모 (선택)"
          class="field field--grow"
          maxlength="300"
        >
        <AppButton
          variant="primary"
          :disabled="saving"
          @click="saveLog"
        >
          {{ saving ? '저장 중…' : '기록' }}
        </AppButton>
      </div>
    </AppCard>

    <div class="period">
      <AppButton
        :variant="period === 'week' ? 'primary' : 'outline'"
        @click="changePeriod('week')"
      >
        주간
      </AppButton>
      <AppButton
        :variant="period === 'month' ? 'primary' : 'outline'"
        @click="changePeriod('month')"
      >
        월간
      </AppButton>
    </div>

    <AppCard
      v-if="health.insufficient"
      eyebrow="안내"
      title="기록이 더 필요해요"
      variant="default"
      padding="lg"
    >
      <p>체중·식단 기록이 쌓이면 추이와 영양 균형 리포트를 보여드릴게요. (최소 2회 이상)</p>
    </AppCard>

    <template v-else-if="health.report">
      <AppCard
        eyebrow="체중 추이"
        :title="health.report.weight_change_kg != null ? `${health.report.weight_change_kg > 0 ? '+' : ''}${health.report.weight_change_kg} kg` : '추이'"
        variant="default"
        padding="lg"
      >
        <WeightTrendChart
          v-if="health.report.weight_trend.length"
          :points="health.report.weight_trend"
        />
        <p
          v-else
          class="muted"
        >
          체중 기록을 추가하면 추이가 표시됩니다.
        </p>
      </AppCard>

      <AppCard
        v-if="health.report.nutrition_balance"
        eyebrow="평균 영양 균형"
        :title="`${health.report.nutrition_balance.avg_kcal} kcal / 끼`"
        variant="soft"
        padding="lg"
      >
        <ul class="balance">
          <li>탄수화물 <strong>{{ health.report.nutrition_balance.avg_carb_g }}g</strong></li>
          <li>단백질 <strong>{{ health.report.nutrition_balance.avg_protein_g }}g</strong></li>
          <li>지방 <strong>{{ health.report.nutrition_balance.avg_fat_g }}g</strong></li>
          <li>식이섬유 <strong>{{ health.report.nutrition_balance.avg_fiber_g }}g</strong></li>
          <li>나트륨 <strong>{{ health.report.nutrition_balance.avg_sodium_mg }}mg</strong></li>
        </ul>
        <div
          v-if="health.report.deficiencies.length"
          class="defs"
        >
          <AppBadge
            v-for="d in health.report.deficiencies"
            :key="d"
            tone="warn"
            variant="outline"
          >
            {{ d }}
          </AppBadge>
        </div>
      </AppCard>

      <p class="disclaimer">
        {{ health.report.disclaimer }}
      </p>
    </template>

    <AppToast
      :open="savedOk"
      tone="success"
      title="기록됨"
      @close="savedOk = false"
    >
      건강 기록이 저장되었습니다.
    </AppToast>
    <AppToast
      :open="!!error"
      tone="error"
      title="오류"
      @close="error = null"
    >
      {{ error }}
    </AppToast>
  </section>
</template>

<style scoped>
.health { display: flex; flex-direction: column; gap: var(--space-lg); }
.head__eyebrow { font-size: var(--fs-caption); font-weight: var(--fw-semibold); text-transform: uppercase; color: var(--color-muted); }
.head__title { margin: var(--space-xs) 0; font-family: var(--font-display); font-weight: var(--fw-display); font-size: var(--fs-display-sm); color: var(--color-ink); }
.head__lede { color: var(--color-body); margin: 0; }
.form { display: flex; flex-wrap: wrap; gap: var(--space-sm); align-items: center; }
.field { background: var(--color-canvas); border: 1px solid var(--color-hairline); border-radius: var(--radius-md); padding: var(--space-sm) var(--space-md); font: inherit; }
.field--grow { flex: 1; min-width: 160px; }
.field:focus { outline: none; border-color: var(--color-ink); }
.period { display: flex; gap: var(--space-sm); }
.balance { list-style: none; margin: 0 0 var(--space-md); padding: 0; display: flex; flex-wrap: wrap; gap: var(--space-md); color: var(--color-body); }
.balance strong { color: var(--color-ink); }
.defs { display: flex; flex-wrap: wrap; gap: var(--space-xs); }
.muted { color: var(--color-muted); margin: 0; }
.disclaimer { color: var(--color-muted); font-size: var(--fs-body-sm); }
</style>
