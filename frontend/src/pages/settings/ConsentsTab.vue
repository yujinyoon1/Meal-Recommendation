<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { api } from '@/api/client';
import AppButton from '@/components/ui/AppButton.vue';
import AppToast from '@/components/ui/AppToast.vue';

interface ConsentRow {
  type: 'terms' | 'privacy' | 'sensitive_health' | 'marketing' | 'third_party_share';
  granted: boolean;
  version: string;
  granted_at: string;
  revoked_at: string | null;
}

const TYPES: Array<{ type: ConsentRow['type']; label: string; required: boolean; hint: string }> = [
  { type: 'terms', label: '서비스 이용약관', required: true, hint: '필수 — 탈퇴 외 철회 불가' },
  { type: 'privacy', label: '개인정보 처리방침', required: true, hint: '필수 — 탈퇴 외 철회 불가' },
  { type: 'sensitive_health', label: '민감 건강정보 처리', required: false, hint: '알레르기/질병 입력 시 필요' },
  { type: 'marketing', label: '마케팅 정보 수신', required: false, hint: '이메일/푸시' },
  { type: 'third_party_share', label: '제3자 정보 제공', required: false, hint: '현재 비활성' },
];

const state = reactive<Record<string, boolean>>({});
const loading = ref(true);
const saving = ref(false);
const toast = ref<{ tone: 'success' | 'error'; msg: string } | null>(null);

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get<ConsentRow[]>('/me/consents');
    for (const r of data) state[r.type] = r.granted;
  } catch (e: unknown) {
    toast.value = {
      tone: 'error',
      msg: (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '동의 상태 조회 실패',
    };
  } finally {
    loading.value = false;
  }
}

async function toggle(type: ConsentRow['type'], granted: boolean) {
  saving.value = true;
  try {
    await api.post('/me/consents', { consents: [{ type, granted }] });
    state[type] = granted;
    toast.value = { tone: 'success', msg: granted ? '동의가 저장되었습니다.' : '동의가 철회되었습니다.' };
  } catch (e: unknown) {
    state[type] = !granted; // revert
    toast.value = {
      tone: 'error',
      msg: (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '저장 실패',
    };
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section class="tab">
    <p v-if="loading" class="muted">불러오는 중…</p>
    <ul v-else class="list">
      <li v-for="t in TYPES" :key="t.type" class="row">
        <div class="row__text">
          <span class="row__label">
            {{ t.label }}
            <span v-if="t.required" class="req">[필수]</span>
          </span>
          <span class="row__hint">{{ t.hint }}</span>
        </div>
        <label class="switch">
          <input
            type="checkbox"
            :checked="state[t.type] ?? false"
            :disabled="t.required || saving"
            @change="toggle(t.type, ($event.target as HTMLInputElement).checked)"
          />
          <span class="switch__track" />
        </label>
      </li>
    </ul>
    <AppButton variant="ghost" @click="load">REFRESH</AppButton>

    <AppToast :open="!!toast" :tone="toast?.tone ?? 'info'" title="CONSENTS" @close="toast = null">
      {{ toast?.msg }}
    </AppToast>
  </section>
</template>

<style scoped>
.tab { display: flex; flex-direction: column; gap: var(--space-md); }
.muted { color: var(--color-muted); }
.list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-xs); }
.row {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-md);
  background: var(--color-surface-soft);
  border: 1px solid var(--color-hairline);
}
.row__text { display: flex; flex-direction: column; gap: 2px; }
.row__label { color: var(--color-ink); font-weight: var(--fw-bold); }
.req { color: var(--color-m-red); font-size: var(--fs-caption); margin-left: var(--space-xs); }
.row__hint { color: var(--color-muted); font-size: var(--fs-caption); letter-spacing: var(--ls-caption); }
.switch { position: relative; display: inline-block; width: 48px; height: 24px; }
.switch input { opacity: 0; width: 0; height: 0; }
.switch__track {
  position: absolute; cursor: pointer; inset: 0;
  background: var(--color-surface-elevated);
  transition: background-color 120ms ease;
}
.switch__track::before {
  content: ''; position: absolute; left: 2px; top: 2px;
  width: 20px; height: 20px; background: var(--color-ink);
  transition: transform 120ms ease;
}
.switch input:checked + .switch__track { background: var(--color-bmw-blue); }
.switch input:checked + .switch__track::before { transform: translateX(24px); }
.switch input:disabled + .switch__track { opacity: 0.4; cursor: not-allowed; }
</style>
