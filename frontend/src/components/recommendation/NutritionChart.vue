<script setup lang="ts">
/**
 * NutritionChart — 탄단지 도넛 + RDA 비율 막대.
 * 차트 색은 Wise 팔레트:
 *  - 도넛: lime green / accent cyan / accent orange (콘트라스트 + 색맹 친화)
 *  - 막대: ink 라인 + lime fill.
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
    backgroundColor: ['#9fe870', '#38c8ff', '#ffc091'],
    borderColor: '#ffffff',
    borderWidth: 3,
  }],
}));

const donutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#454745',
        font: { family: 'Inter, system-ui, sans-serif', size: 13, weight: 600 as const },
        boxWidth: 12,
        boxHeight: 12,
        usePointStyle: true,
        pointStyle: 'circle' as const,
      },
    },
  },
  cutout: '62%',
};

const barData = computed(() => ({
  labels: ['칼로리', '단백질', '식이섬유', '나트륨'],
  datasets: [{
    label: 'RDA %',
    data: [
      props.nutrition.rda_ratio.calories * 100,
      props.nutrition.rda_ratio.protein  * 100,
      props.nutrition.rda_ratio.fiber    * 100,
      props.nutrition.rda_ratio.sodium   * 100,
    ],
    backgroundColor: '#9fe870',
    borderColor: '#0e0f0c',
    borderWidth: 1,
    borderRadius: 8,
  }],
}));

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: {
      ticks: { color: '#454745', font: { family: 'Inter, system-ui, sans-serif', size: 12 } },
      grid: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: {
        color: '#868685',
        font: { family: 'Inter, system-ui, sans-serif', size: 12 },
        callback: (v: number | string) => `${v}%`,
      },
      grid: { color: '#d2d6cf' },
      suggestedMax: 100,
    },
  },
};
</script>

<template>
  <section class="chart">
    <header class="chart__head">
      <span class="section-eyebrow">영양 분석</span>
      <span
        class="chart__confidence"
        :data-conf="nutrition.confidence"
      >
        <span class="dot" />
        신뢰도 · {{ nutrition.confidence }}
      </span>
    </header>

    <div class="chart__grid">
      <div class="chart__panel">
        <span class="chart__panel-label">에너지 구성</span>
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
        <span class="chart__panel-label">일일 권장량 대비</span>
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
.chart { display: flex; flex-direction: column; gap: var(--space-lg); }
.chart__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}
.section-eyebrow {
  font-size: var(--fs-caption);
  font-weight: var(--fw-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-muted);
}
.chart__confidence {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  background: var(--color-canvas-soft);
  font-size: var(--fs-body-sm);
  font-weight: var(--fw-semibold);
  color: var(--color-body);
}
.chart__confidence .dot {
  width: 8px; height: 8px; border-radius: var(--radius-full);
  background: var(--color-muted);
}
.chart__confidence[data-conf="high"]   { background: var(--color-primary-pale); color: var(--color-positive-deep); }
.chart__confidence[data-conf="high"] .dot   { background: var(--color-positive); }
.chart__confidence[data-conf="medium"] { background: #fff5d6; color: var(--color-warning-content); }
.chart__confidence[data-conf="medium"] .dot { background: var(--color-warning); }
.chart__confidence[data-conf="low"]    { background: #f9eaea; color: var(--color-negative-darkest); }
.chart__confidence[data-conf="low"] .dot    { background: var(--color-negative); }

.chart__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
}
@media (max-width: 720px) { .chart__grid { grid-template-columns: 1fr; } }

.chart__panel {
  background: var(--color-canvas-soft);
  border: none;
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}
.chart__panel-label {
  font-size: var(--fs-caption);
  font-weight: var(--fw-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-muted);
}
.chart__canvas { height: 220px; position: relative; }
.chart__total {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-display-sm);
  font-weight: var(--fw-display);
  color: var(--color-ink);
  letter-spacing: -0.015em;
}
.chart__total span {
  color: var(--color-muted);
  font-size: var(--fs-body);
  font-weight: var(--fw-regular);
  margin-left: 4px;
}
.chart__hint {
  color: var(--color-muted);
  font-size: var(--fs-caption);
  margin: 0;
}
</style>
