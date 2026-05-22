<script setup lang="ts">
import { ref } from 'vue';
import ConsentsTab from './ConsentsTab.vue';
import DataExportTab from './DataExportTab.vue';
import WithdrawTab from './WithdrawTab.vue';

type Tab = 'consents' | 'export' | 'withdraw';
const active = ref<Tab>('consents');

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'consents', label: 'CONSENTS' },
  { key: 'export', label: 'MY DATA' },
  { key: 'withdraw', label: 'WITHDRAW' },
];
</script>

<template>
  <section class="settings">
    <div class="m-stripe" />
    <header class="settings__head">
      <span class="label-uppercase eyebrow">SETTINGS</span>
      <h1>계정 & 개인정보</h1>
    </header>

    <nav
      class="tabs"
      role="tablist"
    >
      <button
        v-for="t in TABS"
        :key="t.key"
        class="tab"
        :class="{ on: active === t.key }"
        role="tab"
        :aria-selected="active === t.key"
        @click="active = t.key"
      >
        {{ t.label }}
      </button>
    </nav>

    <div
      class="panel"
      role="tabpanel"
    >
      <ConsentsTab v-if="active === 'consents'" />
      <DataExportTab v-else-if="active === 'export'" />
      <WithdrawTab v-else-if="active === 'withdraw'" />
    </div>
  </section>
</template>

<style scoped>
.settings { display: flex; flex-direction: column; gap: var(--space-lg); }
.settings__head h1 { font-size: var(--fs-display-md); margin: var(--space-xs) 0; }
.eyebrow { color: var(--color-muted); }
.tabs {
  display: flex;
  gap: var(--space-md);
  border-bottom: 1px solid var(--color-hairline);
}
.tab {
  background: none;
  border: none;
  color: var(--color-body);
  font: inherit;
  font-size: var(--fs-label);
  font-weight: var(--fw-bold);
  letter-spacing: var(--ls-label);
  padding: var(--space-sm) 0;
  margin-bottom: -1px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}
.tab.on { color: var(--color-ink); border-bottom-color: var(--color-ink); }
.tab:hover:not(.on) { color: var(--color-body-strong); }
.panel { padding-top: var(--space-md); }
</style>
