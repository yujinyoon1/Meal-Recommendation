<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { useRouter, RouterLink } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();
auth.init();

async function onLogout() {
  await auth.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="app-header__inner">
        <RouterLink
          to="/"
          class="brand"
          aria-label="p14"
        >
          <span class="brand__dot" />
          <span class="brand__name">p14</span>
        </RouterLink>
        <nav
          v-if="auth.isAuthenticated"
          class="primary"
          aria-label="주요 메뉴"
        >
          <RouterLink to="/dashboard">
            대시보드
          </RouterLink>
          <RouterLink to="/inventory">
            식재료
          </RouterLink>
          <RouterLink to="/history">
            이력
          </RouterLink>
          <RouterLink to="/bookmarks">
            저장됨
          </RouterLink>
          <RouterLink to="/settings">
            설정
          </RouterLink>
        </nav>
        <div class="user">
          <template v-if="auth.isAuthenticated">
            <span
              v-if="auth.user"
              class="user__name"
            >{{ auth.user.displayName || auth.user.email }}</span>
            <button
              class="link"
              @click="onLogout"
            >
              로그아웃
            </button>
          </template>
          <template v-else>
            <RouterLink
              to="/login"
              class="auth-btn auth-btn--ghost"
            >
              로그인
            </RouterLink>
            <RouterLink
              to="/register"
              class="auth-btn auth-btn--cta"
            >
              회원가입
            </RouterLink>
          </template>
        </div>
      </div>
    </header>
    <main class="app-main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-canvas-soft);
  color: var(--color-ink);
}
.app-header {
  background: var(--color-canvas);
  border-bottom: 1px solid var(--color-hairline);
  position: sticky;
  top: 0;
  z-index: 10;
}
.app-header__inner {
  display: flex;
  align-items: center;
  gap: var(--space-xl);
  padding: var(--space-md) var(--space-xl);
  max-width: 1200px;
  margin: 0 auto;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  font-family: var(--font-display);
  font-weight: 900;
  font-size: 20px;
  color: var(--color-ink);
  text-decoration: none;
  letter-spacing: -0.02em;
}
.brand__dot {
  width: 14px;
  height: 14px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  display: inline-block;
}
.brand__name { line-height: 1; }

.primary {
  display: flex;
  gap: var(--space-lg);
  flex: 1;
}
.primary a {
  text-decoration: none;
  color: var(--color-body);
  font-size: var(--fs-body-sm);
  font-weight: 600;
  padding: var(--space-xs) 0;
  position: relative;
}
.primary a:hover {
  color: var(--color-ink);
}
.primary a.router-link-active {
  color: var(--color-ink);
}
.primary a.router-link-active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -18px;
  height: 3px;
  background: var(--color-primary);
  border-radius: var(--radius-pill) var(--radius-pill) 0 0;
}

.user {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-left: auto;
  color: var(--color-body);
  font-size: var(--fs-body-sm);
}
.auth-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  padding: 0 var(--space-lg);
  border-radius: var(--radius-pill);
  font-weight: 600;
  font-size: var(--fs-body-sm);
  text-decoration: none;
  transition: background-color 120ms ease, color 120ms ease, border-color 120ms ease;
}
.auth-btn--ghost {
  color: var(--color-ink);
  border: 1px solid var(--color-hairline);
  background: transparent;
}
.auth-btn--ghost:hover {
  border-color: var(--color-ink);
}
.auth-btn--cta {
  color: var(--color-on-primary);
  background: var(--color-primary);
}
.auth-btn--cta:hover {
  background: var(--color-primary-active);
}
.user__name {
  font-weight: 600;
  color: var(--color-ink);
}
.link {
  background: var(--color-canvas-soft);
  border: none;
  color: var(--color-ink);
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  font-size: var(--fs-body-sm);
  padding: 8px 16px;
  border-radius: var(--radius-pill);
  transition: background-color 120ms ease;
}
.link:hover {
  background: var(--color-surface-elevated);
}

.app-main {
  flex: 1;
  padding: var(--space-2xl) var(--space-xl);
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
}

/* tablet 이하: 네비 가로 스크롤 */
@media (max-width: 768px) {
  .app-header__inner {
    flex-wrap: wrap;
    gap: var(--space-md);
    padding: var(--space-md);
  }
  .primary {
    order: 3;
    width: 100%;
    overflow-x: auto;
    gap: var(--space-md);
  }
  .primary a.router-link-active::after {
    bottom: -10px;
  }
  .app-main {
    padding: var(--space-lg) var(--space-md);
  }
}
</style>
