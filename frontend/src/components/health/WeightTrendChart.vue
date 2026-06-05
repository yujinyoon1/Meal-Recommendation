<script setup lang="ts">
/**
 * 002 FR-031 — 체중 추이 라인 차트 (Wise 팔레트: ink 라인 + lime fill).
 */
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS, LineElement, PointElement, LineController,
  CategoryScale, LinearScale, Tooltip, Legend, Filler,
} from 'chart.js';

ChartJS.register(LineElement, PointElement, LineController, CategoryScale, LinearScale, Tooltip, Legend, Filler);

const props = defineProps<{ points: { date: string; weight_kg: number }[] }>();

const data = computed(() => ({
  labels: props.points.map((p) => p.date.slice(5)),
  datasets: [{
    label: '체중 (kg)',
    data: props.points.map((p) => p.weight_kg),
    borderColor: '#1b1d1b',
    backgroundColor: 'rgba(159, 232, 112, 0.35)',
    fill: true,
    tension: 0.3,
    pointBackgroundColor: '#9fe870',
    pointRadius: 4,
  }],
}));

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { ticks: { color: '#454745' }, grid: { color: '#e8ebe6' } },
    x: { ticks: { color: '#454745' }, grid: { display: false } },
  },
};
</script>

<template>
  <div class="chart">
    <Line
      :data="data"
      :options="options"
    />
  </div>
</template>

<style scoped>
.chart { height: 240px; }
</style>
