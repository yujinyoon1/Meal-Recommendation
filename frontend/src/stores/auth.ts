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
  restored: boolean;
}

// 부팅 복원을 1회만 수행하기 위한 모듈 레벨 캐시 (동시 호출 방지).
let restorePromise: Promise<void> | null = null;

export const useAuthStore = defineStore('auth', {
  state: (): State => ({ user: null, accessToken: null, restored: false }),

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

    async login(email: string, password: string, rememberMe = true) {
      const { data } = await api.post('/auth/login', { email, password, rememberMe });
      this.accessToken = data.accessToken;
      this.user = data.user;
    },

    async refresh() {
      // refresh cookie 사용 — 본문 없음
      const { data } = await api.post('/auth/refresh');
      this.accessToken = data.accessToken;
      if (data.user) this.user = data.user;
    },

    async tryRestore() {
      // 부팅 시 httpOnly refresh 쿠키로 세션 복원 시도.
      // 쿠키가 없거나 만료면 401 → 비로그인 상태로 조용히 진행.
      try {
        await this.refresh();
      } catch {
        this.user = null;
        this.accessToken = null;
      }
    },

    /**
     * 라우터 가드가 인증 판정 전에 호출. 최초 1회만 실제 복원을 수행하고,
     * 이후 호출은 즉시 반환한다. (새로고침/직접 접속 시 로그인 유지의 핵심)
     */
    async ensureRestored() {
      if (this.restored) return;
      if (!restorePromise) {
        restorePromise = this.tryRestore().then(() => {
          this.restored = true;
        });
      }
      await restorePromise;
    },

    async logout() {
      try { await api.post('/auth/logout'); } catch { /* ignore */ }
      this.user = null;
      this.accessToken = null;
    },
  },
});
