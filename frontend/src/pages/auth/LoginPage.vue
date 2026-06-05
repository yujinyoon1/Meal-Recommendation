<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import AppButton from '@/components/ui/AppButton.vue';
import AppInput from '@/components/ui/AppInput.vue';
import AppToast from '@/components/ui/AppToast.vue';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const REMEMBER_KEY = 'p14_remember_email';

const form = reactive({ email: '', password: '' });
const rememberMe = ref(true);
const loading = ref(false);
const error = ref<string | null>(null);

onMounted(() => {
  // 자동 로그인으로 기억해 둔 이메일이 있으면 미리 채운다.
  const saved = localStorage.getItem(REMEMBER_KEY);
  if (saved) {
    form.email = saved;
    rememberMe.value = true;
  }
});

async function onSubmit() {
  loading.value = true;
  error.value = null;
  try {
    await auth.login(form.email, form.password, rememberMe.value);
    if (rememberMe.value) localStorage.setItem(REMEMBER_KEY, form.email);
    else localStorage.removeItem(REMEMBER_KEY);
    const redirect = (route.query.redirect as string) || '/dashboard';
    router.replace(redirect);
  } catch (e: unknown) {
    error.value = (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '로그인 실패';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="auth-page">
    <div class="m-stripe" />
    <h1 class="auth-page__title">
      LOG IN
    </h1>
    <p class="auth-page__sub">
      계속해서 추천받기.
    </p>

    <form
      class="auth-form"
      @submit.prevent="onSubmit"
    >
      <AppInput
        v-model="form.email"
        label="EMAIL"
        type="email"
        autocomplete="email"
        required
      />
      <AppInput
        v-model="form.password"
        label="PASSWORD"
        type="password"
        autocomplete="current-password"
        required
      />
      <label class="remember">
        <input
          v-model="rememberMe"
          type="checkbox"
          class="remember__box"
        >
        <span>자동 로그인</span>
      </label>
      <AppButton
        type="submit"
        variant="primary"
        :disabled="loading"
        block
      >
        {{ loading ? 'SIGNING IN…' : 'LOG IN' }}
      </AppButton>

      <p class="auth-form__alt">
        처음이신가요?
        <router-link to="/register">
          SIGN UP
        </router-link>
      </p>
      <p class="auth-form__demo">
        체험용 계정 — id: demo@p14.sumzip.com / pw: Demo1234!
      </p>
    </form>

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
.auth-page { max-width: 480px; margin: 0 auto; padding: var(--space-xxl) var(--space-lg); }
.auth-page__title { font-size: var(--fs-display-lg); margin: var(--space-lg) 0 var(--space-xs); }
.auth-page__sub { color: var(--color-body); margin-bottom: var(--space-xl); }
.auth-form { display: flex; flex-direction: column; gap: var(--space-md); }
.auth-form__demo {
  margin: calc(-1 * var(--space-xs)) 0 0;
  text-align: center;
  font-size: var(--fs-caption);
  color: var(--color-muted);
  letter-spacing: 0.01em;
}
.remember {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--fs-body-sm);
  color: var(--color-body);
  cursor: pointer;
  user-select: none;
}
.remember__box {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
  cursor: pointer;
}
.auth-form__alt { font-size: var(--fs-body-sm); color: var(--color-muted); text-align: center; margin: 0; }
.auth-form__alt a { text-transform: uppercase; letter-spacing: var(--ls-label); font-weight: var(--fw-bold); font-size: var(--fs-caption); }
</style>
