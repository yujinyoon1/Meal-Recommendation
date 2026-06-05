import { defineStore } from 'pinia';
import { api } from '@/api/client';

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  substitute?: string;
}
export interface Recipe {
  id?: number; // 추천 생성/조회 시 채워짐. 북마크 토글 대상.
  name: string;
  description?: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  est_cooking_min: number;
  difficulty: 'easy' | 'medium' | 'hard';
}
export interface NutritionSummary {
  total_kcal: number;
  carb_g: number;
  protein_g: number;
  fat_g: number;
  fiber_g: number;
  sodium_mg: number;
  rda_ratio: Record<string, number>;
  confidence: 'high' | 'medium' | 'low';
}
export interface RecommendationResult {
  recommendation_id: number;
  status: 'validated' | 'rejected' | 'failed';
  recipes: Recipe[];
  nutrition: NutritionSummary | null;
  warnings: string[];
  disclaimer: string;
}

interface State {
  current: RecommendationResult | null;
  loading: boolean;
  error: string | null;
}

export const useRecommendationStore = defineStore('recommendation', {
  state: (): State => ({ current: null, loading: false, error: null }),

  actions: {
    async request(opts: { itemIds?: number[] } = {}) {
      this.loading = true;
      this.error = null;
      try {
        const body = opts.itemIds && opts.itemIds.length ? { item_ids: opts.itemIds } : {};
        const { data } = await api.post<RecommendationResult>('/recommendations', body);
        this.current = data;
        return data;
      } catch (e: unknown) {
        this.error =
          (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '추천 실패';
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async load(id: number) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await api.get<RecommendationResult>(`/recommendations/${id}`);
        this.current = data;
        return data;
      } catch (e: unknown) {
        this.error =
          (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '추천 조회 실패';
        throw e;
      } finally {
        this.loading = false;
      }
    },

    clear() {
      this.current = null;
      this.error = null;
    },
  },
});
