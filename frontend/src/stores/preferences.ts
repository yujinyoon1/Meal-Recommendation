import { defineStore } from 'pinia';
import { api } from '@/api/client';

export interface PreferenceWeight {
  dimension: 'category' | 'ingredient' | 'cuisine' | 'spiciness';
  key_ref: string;
  weight: number;
  confidence: number;
  sample_count: number;
}
export interface PreferenceSnapshot {
  cold_start: boolean;
  weights: PreferenceWeight[];
}

interface State {
  snapshot: PreferenceSnapshot | null;
  loading: boolean;
  error: string | null;
}

/** 002 FR-003/004 — 학습된 선호 가중치(개인화 적용 상태) 조회. */
export const usePreferencesStore = defineStore('preferences', {
  state: (): State => ({ snapshot: null, loading: false, error: null }),

  getters: {
    coldStart: (s): boolean => s.snapshot?.cold_start ?? true,
    prefer: (s): string[] =>
      (s.snapshot?.weights ?? []).filter((w) => w.dimension === 'ingredient' && w.weight >= 0.2).map((w) => w.key_ref),
    avoid: (s): string[] =>
      (s.snapshot?.weights ?? []).filter((w) => w.dimension === 'ingredient' && w.weight <= -0.2).map((w) => w.key_ref),
  },

  actions: {
    async fetch() {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await api.get<PreferenceSnapshot>('/preferences/weights');
        this.snapshot = data;
        return data;
      } catch (e: unknown) {
        this.error = (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '선호 정보 조회 실패';
        throw e;
      } finally {
        this.loading = false;
      }
    },
  },
});
