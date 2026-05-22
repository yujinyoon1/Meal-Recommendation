<script setup lang="ts">
/**
 * NutritionChart — 탄단지 도넛 + RDA 비율 막대.
 * 차트는 Chart.js (vue-chartjs). data-visualization 스킬의 권고:
 *  - 색맹 친화: 도넛 슬라이스에 패턴/명도 차 둠.
 *  - 막대는 100% 기준선 명시.
 *  - 단위/총합을 항상 동반 표기.
 */
import { computed } from 'vue';
import { Doughnut, Bar } from 'vue-chartjs';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  BarElement, CategoryScale, LinearScale,
} from 'chart.js';
import type { NutritionSummary } from '@/stores/recommendation';

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const props = defineProps<{ nutrition: NutritionSummary }>();

const donutData = computed(() => ({
  labels: ['탄수화물 (g)', '단백질 (g)', '지방 (g)'],
  datasets: [{
    data: [props.nutrition.carb_g, props.nutrition.protein_g, props.nutrition.fat_g],
    backgroundColor: ['#1c69d4', '#0fa336', '#e22718'], // M blue / success / M red
    borderColor: '#000000',
    borderWidth: 2,
  }],
}));

const donutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#bbbbbb', font: { family: 'inherit' } } },
  },
  cutout: '60%',
};

const barData = computed(() => ({
  labels: ['CALORIES', 'PROTEIN', 'FIBER', 'SODIUM'],
  datasets: [{
    label: 'RDA %',
    data: [
      props.nutrition.rda_ratio.calories * 100,
      props.nutrition.rda_ratio.protein  * 100,
      props.nutrition.rda_ratio.fiber    * 100,
      props.nutrition.rda_ratio.sodium   * 100,
    ],
    backgroundColor: '#ffffff',
    borderColor: '#1c69d4',
    borderWidth: 1,
  }],
}));

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: '#bbbbbb' }, grid: { color: '#262626' } },
    y: {
      beginAtZero: true,
      ticks: { color: '#bbbbbb', callback: (v: number | string) => `${v}%` },
      grid: { color: '#262626' },
      suggestedMax: 100,
    },
  },
};
</script>

<template>
  <section class="chart">
    <header class="chart__head">
      <span class="label-uppercase">NUTRITION</span>
      <span
        class="chart__confidence"
        :data-conf="nutrition.confidence"
      >
        CONFIDENCE: {{ nutrition.confidence.toUpperCase() }}
      </span>
    </header>

    <div class="chart__grid">
      <div class="chart__panel">
        <span class="label-uppercase chart__panel-label">MACRO MIX</span>
        <div class="chart__canvas">
          <Doughnut
            :data="donutData"
            :options="donutOptions"
          />
        </div>
        <p class="chart__total">
          {{ nutrition.total_kcal }} <span>kcal</span>
        </p>
      </div>

      <div class="chart__panel">
        <span class="label-uppercase chart__panel-label">RDA RATIO</span>
        <div class="chart__canvas">
          <Bar
            :data="barData"
            :options="barOptions"
          />
        </div>
        <p class="chart__hint">
          막대가 100% 선을 넘으면 일일 권장량 초과.
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.chart { display: flex; flex-direction: column; gap: var(--space-md); }
.chart__head { display: flex; align-items: baseline; justify-content: space-between; }
.chart__confidence { font-size: var(--fs-caption); letter-spacing: var(--ls-label); }
.chart__confidence[data-conf="high"]    { color: var(--color-success); }
.chart__confidence[data-conf="medium"]  { color: var(--color-warning); }
.chart__confidence[data-conf="low"]     { color: var(--color-m-red); }

.chart__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
}
@media (max-width: 720px) { .chart__grid { grid-template-columns: 1fr; } }

.chart__panel {
  background: var(--color-surface-soft);
  border: 1px solid var(--color-hairline);
  padding: var(--space-lg);
  display: flex; flex-direction: column; gap: var(--space-md);
}
.chart__panel-label { color: var(--color-muted); }
.chart__canvas { height: 220px; position: relative; }
.chart__total {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-display-sm);
  font-weight: var(--fw-bold);
}
.chart__total span { color: var(--color-muted); font-size: var(--fs-body-sm); font-weight: var(--fw-body); margin-left: 4px; }
.chart__hint { color: var(--color-muted); font-size: var(--fs-caption); margin: 0; }
</style>
