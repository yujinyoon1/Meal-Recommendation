<script setup lang="ts">
/**
 * AppToast — 우측 하단 알림 카드(고정).
 * tone: info (default) | success | warn | error
 * 사용: <AppToast :open="show" tone="error" @close="show=false">메시지</AppToast>
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
      <div class="m-stripe toast__stripe" />
      <div class="toast__body">
        <strong
          v-if="title"
          class="toast__title label-uppercase"
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
  background: var(--color-surface-card);
  color: var(--color-ink);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-none);
  display: grid;
  grid-template-columns: 1fr auto;
  padding: var(--space-md) var(--space-md) var(--space-md) var(--space-lg);
  gap: var(--space-md);
  overflow: hidden;
}
.toast__stripe {
  position: absolute;
  inset: 0 0 auto 0;
}
.toast__body {
  grid-column: 1;
}
.toast__title {
  display: block;
  margin-bottom: 4px;
  color: var(--color-body-strong);
}
.toast__msg {
  margin: 0;
  color: var(--color-body);
  font-size: var(--fs-body-sm);
  line-height: 1.5;
}
.toast__close {
  grid-column: 2;
  align-self: start;
  background: none;
  border: none;
  color: var(--color-muted);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}
.toast__close:hover { color: var(--color-ink); }

/* tone — 좌측 보더 색상으로 톤 구분 (스트라이프는 항상 M 트라이컬러) */
.toast--success { border-left: 4px solid var(--color-success); }
.toast--warn    { border-left: 4px solid var(--color-warning); }
.toast--error   { border-left: 4px solid var(--color-m-red); }
.toast--info    { border-left: 4px solid var(--color-bmw-blue); }

.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
.toast-enter-active, .toast-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}
</style>
