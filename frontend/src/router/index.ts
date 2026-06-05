import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/pages/landing/LandingPage.vue'),
    meta: { public: true },
    // 이미 로그인한 사용자는 소개 페이지 대신 대시보드로.
    beforeEnter: () => {
      const auth = useAuthStore();
      return auth.isAuthenticated ? { name: 'dashboard' } : true;
    },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/auth/LoginPage.vue'),
    meta: { public: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/pages/auth/RegisterPage.vue'),
    meta: { public: true },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/pages/dashboard/DashboardPage.vue'),
    meta: { public: true },
  },
  {
    path: '/onboarding',
    name: 'onboarding',
    component: () => import('@/pages/onboarding/OnboardingWizard.vue'),
  },
  {
    path: '/inventory',
    name: 'inventory',
    component: () => import('@/pages/inventory/InventoryInputPage.vue'),
  },
  {
    path: '/recommendation/:id?',
    name: 'recommendation',
    component: () => import('@/pages/recommendation/ResultPage.vue'),
  },
  {
    path: '/history',
    name: 'history',
    component: () => import('@/pages/history/HistoryListPage.vue'),
  },
  {
    path: '/history/:id',
    name: 'history-detail',
    component: () => import('@/pages/history/HistoryDetailPage.vue'),
  },
  {
    path: '/bookmarks',
    name: 'bookmarks',
    component: () => import('@/pages/bookmarks/BookmarksPage.vue'),
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/pages/settings/SettingsPage.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  // 새로고침/직접 접속 시 refresh 쿠키로 세션 복원이 끝날 때까지 기다린 뒤 판정.
  await auth.ensureRestored();
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  return true;
});

export default router;
