import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    redirect: '/dashboard',
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

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  return true;
});

export default router;
