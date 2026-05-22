<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import AppButton from '@/components/ui/AppButton.vue';
import AppInput from '@/components/ui/AppInput.vue';
import AppToast from '@/components/ui/AppToast.vue';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const form = reactive({ email: '', password: '' });
const loading = ref(false);
const error = ref<string | null>(null);

async function onSubmit() {
  loading.value = true;
  error.value = null;
  try {
    await auth.login(form.email, form.password);
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
.auth-form__alt { font-size: var(--fs-body-sm); color: var(--color-muted); text-align: center; margin: 0; }
.auth-form__alt a { text-transform: uppercase; letter-spacing: var(--ls-label); font-weight: var(--fw-bold); font-size: var(--fs-caption); }
</style>
