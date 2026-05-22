<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRoute, RouterLink } from 'vue-router';

const auth = useAuthStore();
const route = useRoute();
auth.init();

const isAuthPage = computed(() => route.meta.public === true);
</script>

<template>
  <div class="app-shell">
    <header
      v-if="!isAuthPage"
      class="app-header"
    >
      <RouterLink
        to="/dashboard"
        class="brand"
      >
        🍱 mis2601
      </RouterLink>
      <nav class="primary">
        <RouterLink to="/dashboard">
          대시보드
        </RouterLink>
        <RouterLink to="/inventory">
          식재료
        </RouterLink>
        <RouterLink to="/history">
          이력
        </RouterLink>
        <RouterLink to="/settings">
          설정
        </RouterLink>
      </nav>
      <div class="user">
        <span v-if="auth.user">{{ auth.user.displayName || auth.user.email }}</span>
        <button
          v-if="auth.isAuthenticated"
          class="link"
          @click="auth.logout()"
        >
          로그아웃
        </button>
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
  background: var(--color-bg);
  color: var(--color-text);
}
.app-header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
}
.brand {
  font-weight: 700;
  font-size: 1.1rem;
  text-decoration: none;
  color: inherit;
}
.primary {
  display: flex;
  gap: var(--space-3);
  flex: 1;
}
.primary a {
  text-decoration: none;
  color: var(--color-text-muted);
}
.primary a.router-link-active {
  color: var(--color-primary);
  font-weight: 600;
}
.user {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
.link {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font: inherit;
}
.app-main {
  flex: 1;
  padding: var(--space-4);
  max-width: 1080px;
  width: 100%;
  margin: 0 auto;
}
</style>
