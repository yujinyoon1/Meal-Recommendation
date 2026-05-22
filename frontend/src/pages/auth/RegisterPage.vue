<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import AppButton from '@/components/ui/AppButton.vue';
import AppInput from '@/components/ui/AppInput.vue';
import AppToast from '@/components/ui/AppToast.vue';

const auth = useAuthStore();
const router = useRouter();

const form = reactive({
  email: '',
  password: '',
  displayName: '',
  consents: {
    terms: false,
    privacy: false,
    sensitive_health: false,
    marketing: false,
  },
});
const loading = ref(false);
const error = ref<string | null>(null);

async function onSubmit() {
  error.value = null;
  if (!form.consents.terms || !form.consents.privacy) {
    error.value = '필수 약관(서비스 이용약관, 개인정보 처리방침)에 동의가 필요합니다.';
    return;
  }
  loading.value = true;
  try {
    await auth.register({
      email: form.email,
      password: form.password,
      displayName: form.displayName || undefined,
      consents: [
        { type: 'terms', granted: form.consents.terms },
        { type: 'privacy', granted: form.consents.privacy },
        { type: 'sensitive_health', granted: form.consents.sensitive_health },
        { type: 'marketing', granted: form.consents.marketing },
      ],
    });
    router.replace('/onboarding');
  } catch (e: unknown) {
    error.value = (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '회원가입 실패';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="auth-page">
    <div class="m-stripe" />
    <h1 class="auth-page__title">SIGN UP</h1>
    <p class="auth-page__sub">한 끼, 데이터로 정확히.</p>

    <form class="auth-form" @submit.prevent="onSubmit">
      <AppInput v-model="form.email" label="EMAIL" type="email" autocomplete="email" required />
      <AppInput v-model="form.password" label="PASSWORD" type="password" autocomplete="new-password" hint="최소 8자" required />
      <AppInput v-model="form.displayName" label="DISPLAY NAME" />

      <fieldset class="consents">
        <legend class="label-uppercase">CONSENTS</legend>
        <label><input v-model="form.consents.terms" type="checkbox" /> [필수] 서비스 이용약관</label>
        <label><input v-model="form.consents.privacy" type="checkbox" /> [필수] 개인정보 처리방침</label>
        <label><input v-model="form.consents.sensitive_health" type="checkbox" /> [선택] 민감 건강정보 처리</label>
        <label><input v-model="form.consents.marketing" type="checkbox" /> [선택] 마케팅 정보 수신</label>
      </fieldset>

      <AppButton type="submit" variant="primary" :disabled="loading" block>
        {{ loading ? 'CREATING…' : 'CREATE ACCOUNT' }}
      </AppButton>

      <p class="auth-form__alt">
        이미 계정이 있으신가요?
        <router-link to="/login">LOG IN</router-link>
      </p>
    </form>

    <AppToast :open="!!error" tone="error" title="ERROR" @close="error = null">
      {{ error }}
    </AppToast>
  </section>
</template>

<style scoped>
.auth-page {
  max-width: 480px;
  margin: 0 auto;
  padding: var(--space-xxl) var(--space-lg);
}
.auth-page__title {
  font-size: var(--fs-display-lg);
  letter-spacing: 0;
  margin-top: var(--space-lg);
  margin-bottom: var(--space-xs);
}
.auth-page__sub {
  color: var(--color-body);
  font-weight: var(--fw-body);
  margin-bottom: var(--space-xl);
}
.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}
.consents {
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-none);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  background: var(--color-surface-soft);
}
.consents legend {
  color: var(--color-body-strong);
  padding: 0 var(--space-xs);
}
.consents label {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--color-body);
  font-size: var(--fs-body-sm);
}
.auth-form__alt {
  font-size: var(--fs-body-sm);
  color: var(--color-muted);
  text-align: center;
  margin: 0;
}
.auth-form__alt a {
  text-transform: uppercase;
  letter-spacing: var(--ls-label);
  font-weight: var(--fw-bold);
  font-size: var(--fs-caption);
}
</style>
