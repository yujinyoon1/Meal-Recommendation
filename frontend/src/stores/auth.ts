import { defineStore } from 'pinia';
import { api, configureClient } from '@/api/client';

interface User {
  id: number;
  email: string;
  displayName?: string | null;
}

interface State {
  user: User | null;
  accessToken: string | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): State => ({ user: null, accessToken: null }),

  getters: {
    isAuthenticated: (s) => !!s.accessToken && !!s.user,
  },

  actions: {
    init() {
      // axios 클라이언트에 토큰/리프레시 훅 주입
      configureClient({
        getAccessToken: () => this.accessToken,
        onUnauthorized: async () => {
          try {
            await this.refresh();
            return this.accessToken;
          } catch {
            this.logout();
            return null;
          }
        },
      });
    },

    async register(input: {
      email: string;
      password: string;
      displayName?: string;
      consents: Array<{ type: string; granted: boolean }>;
    }) {
      const { data } = await api.post('/auth/register', input);
      this.accessToken = data.accessToken;
      this.user = data.user;
    },

    async login(email: string, password: string) {
      const { data } = await api.post('/auth/login', { email, password });
      this.accessToken = data.accessToken;
      this.user = data.user;
    },

    async refresh() {
      // refresh cookie 사용 — 본문 없음
      const { data } = await api.post('/auth/refresh');
      this.accessToken = data.accessToken;
      if (data.user) this.user = data.user;
    },

    async logout() {
      try { await api.post('/auth/logout'); } catch { /* ignore */ }
      this.user = null;
      this.accessToken = null;
    },
  },
});
