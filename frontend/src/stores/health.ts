import { defineStore } from 'pinia';
import { api } from '@/api/client';

export interface HealthLog {
  logged_at: string;
  weight_kg: number | null;
  metrics: Record<string, unknown> | null;
  note: string | null;
}
export interface HealthReport {
  period_type: 'week' | 'month';
  weight_trend: { date: string; weight_kg: number }[];
  weight_change_kg: number | null;
  nutrition_balance: {
    avg_kcal: number; avg_carb_g: number; avg_protein_g: number;
    avg_fat_g: number; avg_fiber_g: number; avg_sodium_mg: number; sample_count: number;
  } | null;
  deficiencies: string[];
  disclaimer: string;
}

interface State {
  logs: HealthLog[];
  report: HealthReport | null;
  insufficient: boolean;
  loading: boolean;
  error: string | null;
}

/** 002 FR-030~034 — 건강 기록·리포트 (수동 입력). */
export const useHealthStore = defineStore('health', {
  state: (): State => ({ logs: [], report: null, insufficient: false, loading: false, error: null }),

  actions: {
    async fetchLogs() {
      const { data } = await api.get<HealthLog[]>('/health/logs');
      this.logs = data;
      return data;
    },

    async saveLog(payload: { logged_at: string; weight_kg?: number | null; note?: string | null }) {
      await api.post('/health/logs', payload);
      await this.fetchLogs();
    },

    async fetchReport(period: 'week' | 'month' = 'week') {
      this.loading = true;
      this.error = null;
      this.insufficient = false;
      try {
        const { data } = await api.get<HealthReport>('/health/report', { params: { period } });
        this.report = data;
        return data;
      } catch (e: unknown) {
        const status = (e as { response?: { status?: number } }).response?.status;
        if (status === 409) {
          this.insufficient = true;
          this.report = null;
        } else {
          this.error = (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '리포트 조회 실패';
        }
      } finally {
        this.loading = false;
      }
    },
  },
});
