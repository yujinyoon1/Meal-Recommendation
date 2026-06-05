<script setup lang="ts">
/**
 * AppToast — 우측 하단 알림 카드.
 *  - Wise card chrome: white 배경, radius-xl, 미세 그림자.
 *  - 톤은 좌측 4px 컬러 인디케이터로 표현.
 */
defineProps<{
  open: boolean;
  tone?: 'info' | 'success' | 'warn' | 'error';
  title?: string;
}>();
defineEmits<{ (e: 'close'): void }>();
</script>

<template>
  <transition name="toast">
    <div
      v-if="open"
      class="toast"
      :class="`toast--${tone ?? 'info'}`"
      role="status"
    >
      <div class="toast__indicator" />
      <div class="toast__body">
        <strong
          v-if="title"
          class="toast__title"
        >{{ title }}</strong>
        <p class="toast__msg">
          <slot />
        </p>
      </div>
      <button
        class="toast__close"
        aria-label="닫기"
        @click="$emit('close')"
      >
        ×
      </button>
    </div>
  </transition>
</template>

<style scoped>
.toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1000;
  min-width: 280px;
  max-width: 420px;
  background: var(--color-canvas);
  color: var(--color-ink);
  border: none;
  border-radius: var(--radius-xl);
  display: grid;
  grid-template-columns: 4px 1fr auto;
  padding: var(--space-md) var(--space-lg) var(--space-md) 0;
  gap: var(--space-md);
  overflow: hidden;
  box-shadow: var(--shadow-md);
}
.toast__indicator {
  grid-column: 1;
  align-self: stretch;
  background: var(--color-primary);
}
.toast__body {
  grid-column: 2;
  padding-left: var(--space-md);
}
.toast__title {
  display: block;
  margin-bottom: 2px;
  font-size: var(--fs-body-sm);
  font-weight: var(--fw-semibold);
  color: var(--color-ink);
}
.toast__msg {
  margin: 0;
  color: var(--color-body);
  font-size: var(--fs-body-sm);
  line-height: 1.5;
}
.toast__close {
  grid-column: 3;
  align-self: start;
  background: none;
  border: none;
  color: var(--color-muted);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}
.toast__close:hover { color: var(--color-ink); }

/* tone indicator */
.toast--success .toast__indicator { background: var(--color-positive); }
.toast--warn    .toast__indicator { background: var(--color-warning); }
.toast--error   .toast__indicator { background: var(--color-negative); }
.toast--info    .toast__indicator { background: var(--color-primary); }

.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
.toast-enter-active, .toast-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}
</style>
