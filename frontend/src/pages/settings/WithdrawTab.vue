<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api/client';
import { useAuthStore } from '@/stores/auth';
import AppButton from '@/components/ui/AppButton.vue';
import AppCard from '@/components/ui/AppCard.vue';
import AppInput from '@/components/ui/AppInput.vue';
import AppToast from '@/components/ui/AppToast.vue';

const router = useRouter();
const auth = useAuthStore();

const confirming = ref(false);
const password = ref('');
const reason = ref('');
const submitting = ref(false);
const error = ref<string | null>(null);

async function onConfirm() {
  if (!password.value) {
    error.value = '비밀번호를 입력해 주세요.';
    return;
  }
  submitting.value = true;
  error.value = null;
  try {
    await api.delete('/me', { data: { password: password.value, reason: reason.value || undefined } });
    auth.user = null;
    auth.accessToken = null;
    router.replace('/login');
  } catch (e: unknown) {
    error.value = (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '탈퇴 실패';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="tab">
    <AppCard
      eyebrow="WITHDRAW"
      title="회원 탈퇴"
      variant="default"
      padding="lg"
    >
      <p class="warn">
        탈퇴 시 즉시 로그아웃되며, <strong>30일 grace 기간</strong> 후 본인 모든 데이터가 영구 삭제됩니다.
        grace 기간 내 재로그인 복구는 지원되지 않습니다.
      </p>
      <ul class="effects">
        <li>프로필 · 인벤토리 · 추천 · 피드백 · 동의 이력 hard-delete</li>
        <li>법적 입증 목적의 감사 로그는 별도 정책으로 1년 보존</li>
        <li>이메일 / 비밀번호 재사용 불가 (30일 grace 동안)</li>
      </ul>
      <template #footer>
        <AppButton
          v-if="!confirming"
          variant="outline"
          @click="confirming = true"
        >
          PROCEED TO WITHDRAW
        </AppButton>
        <div
          v-else
          class="confirm"
        >
          <AppInput
            v-model="password"
            type="password"
            label="PASSWORD"
            autocomplete="current-password"
            required
          />
          <AppInput
            v-model="reason"
            label="REASON (OPTIONAL)"
            placeholder="떠나시는 이유를 알려주시면 도움이 됩니다."
          />
          <div class="confirm__actions">
            <AppButton
              variant="ghost"
              @click="confirming = false; password = ''; reason = ''"
            >
              CANCEL
            </AppButton>
            <AppButton
              variant="primary"
              :disabled="submitting"
              @click="onConfirm"
            >
              {{ submitting ? 'WITHDRAWING…' : 'CONFIRM WITHDRAW' }}
            </AppButton>
          </div>
        </div>
      </template>
    </AppCard>

    <AppToast
      :open="!!error"
      tone="error"
      title="ERROR"
      @close="error = null"
    >
      {{ error }}
    </AppToast>
  </section>
</template>

<style scoped>
.tab { display: flex; flex-direction: column; gap: var(--space-md); }
.warn { color: var(--color-warning); }
.warn strong { color: var(--color-m-red); }
.effects { color: var(--color-body); padding-left: 1.25rem; }
.effects li { margin-bottom: 4px; font-size: var(--fs-body-sm); }
.confirm { display: flex; flex-direction: column; gap: var(--space-md); width: 100%; }
.confirm__actions { display: flex; justify-content: flex-end; gap: var(--space-xs); }
</style>
