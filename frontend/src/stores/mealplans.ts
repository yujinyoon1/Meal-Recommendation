import { defineStore } from 'pinia';
import { api } from '@/api/client';
import type { RecommendationResult } from '@/stores/recommendation';

export interface SavedMealPlan {
  id: number;
  source_recommendation_id: number | null;
  name: string;
  memo: string | null;
  reuse_count: number;
  last_used_at: string | null;
  created_at: string;
}

interface State {
  saved: SavedMealPlan[];
  loading: boolean;
  error: string | null;
}

/** 002 FR-020/021 — 식단 저장·재사용. */
export const useMealPlansStore = defineStore('mealplans', {
  state: (): State => ({ saved: [], loading: false, error: null }),

  actions: {
    async fetch() {
      this.loading = true;
      try {
        const { data } = await api.get<SavedMealPlan[]>('/meal-plans');
        this.saved = data;
        return data;
      } finally {
        this.loading = false;
      }
    },

    async save(sourceRecommendationId: number, name: string, memo?: string | null) {
      const { data } = await api.post<SavedMealPlan>('/meal-plans', {
        source_recommendation_id: sourceRecommendationId,
        name,
        memo: memo ?? null,
      });
      this.saved.unshift(data);
      return data;
    },

    async reuse(planId: number) {
      const { data } = await api.post<RecommendationResult>(`/meal-plans/${planId}/reuse`);
      return data;
    },
  },
});
