import { defineStore } from 'pinia';
import { api } from '@/api/client';

export interface ExpiringItem {
  id: number;
  raw_text: string;
  food_group: string | null;
  expires_at: string | null;
  days_left: number;
  state: 'imminent' | 'expired';
}
export interface ExpiringResult {
  imminent: ExpiringItem[];
  expired: ExpiringItem[];
}

interface State {
  expiring: ExpiringResult;
  loading: boolean;
}

/** 002 FR-010/011 — 식재료 유통기한/임박 관리. */
export const useInventoryStore = defineStore('inventory', {
  state: (): State => ({ expiring: { imminent: [], expired: [] }, loading: false }),

  getters: {
    /** 임박 + 만료 합계 — 대시보드 알림 배지용. */
    alertCount: (s): number => s.expiring.imminent.length + s.expiring.expired.length,
  },

  actions: {
    async fetchExpiring() {
      this.loading = true;
      try {
        const { data } = await api.get<ExpiringResult>('/inventory/expiring');
        this.expiring = data;
        return data;
      } catch {
        this.expiring = { imminent: [], expired: [] };
      } finally {
        this.loading = false;
      }
    },

    /** 유통기한/식품군 수정 (FR-010). */
    async updateExpiry(itemId: number, payload: { expires_at?: string | null; food_group?: string | null }) {
      await api.patch(`/inventory/items/${itemId}/expiry`, payload);
      await this.fetchExpiring();
    },
  },
});
