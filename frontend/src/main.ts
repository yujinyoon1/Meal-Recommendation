import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';
import './styles/tokens.css';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(router);

// 새로고침/직접 접속 시에도 로그인 유지: refresh 쿠키로 세션 복원 후 마운트.
// 복원이 끝난 뒤 마운트해야 첫 라우터 가드가 올바른 인증 상태를 본다.
// axios 클라이언트(토큰/리프레시 훅)를 마운트 전에 구성.
// 세션 복원은 라우터 가드의 ensureRestored()가 첫 내비게이션에서 수행한다.
const auth = useAuthStore(pinia);
auth.init();
app.mount('#app');
