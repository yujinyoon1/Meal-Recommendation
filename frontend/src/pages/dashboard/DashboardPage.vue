<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api } from '@/api/client';
import { useAuthStore } from '@/stores/auth';
import AppCard from '@/components/ui/AppCard.vue';
import AppBadge from '@/components/ui/AppBadge.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { RouterLink } from 'vue-router';

const auth = useAuthStore();
const inventoryCount = ref(0);
const recent = ref<{ id: number; status: string; total_kcal: number | null } | null>(null);
const previousLoginAt = ref<string | null>(null);
const accountLoaded = ref(false);

// 신규·기존 유저 모두에게 보여주는 환영 인사.
const welcomeLabel = computed(() => (accountLoaded.value ? '👋 환영해요!' : null));

// 기존 유저에게만(직전 접속 기록이 있을 때) 마지막 접속 시각 표시.
const lastSeenLabel = computed(() => {
  if (!accountLoaded.value || !previousLoginAt.value) return null;
  const d = new Date(previousLoginAt.value);
  if (Number.isNaN(d.getTime())) return null;
  const formatted = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long', timeStyle: 'short' }).format(d);
  return `지난 접속: ${formatted}`;
});

async function load() {
  try {
    const { data: items } = await api.get('/inventory/items');
    inventoryCount.value = Array.isArray(items) ? items.length : 0;
  } catch { /* ignore */ }
  try {
    const { data } = await api.get('/me/profile/account');
    previousLoginAt.value = data?.previous_login_at ?? null;
    accountLoaded.value = true;
  } catch { /* ignore */ }
  // TODO Phase 4 — /api/recommendations 목록 API 도입 시 활성화
  recent.value = null;
}

onMounted(load);
</script>

<template>
  <section class="dash">
    <header class="hero">
      <span class="hero__eyebrow">Dashboard</span>
      <h1 class="hero__title">
        안녕하세요,<br>
        <span class="hero__name">{{ auth.user?.displayName || '식단 탐험가' }}</span>님.
      </h1>
      <p
        v-if="welcomeLabel"
        class="hero__welcome"
      >
        {{ welcomeLabel }}
      </p>
      <p class="hero__lede">
        오늘 무엇을 드실지, AI가 냉장고를 보고 골라드릴게요.
      </p>
      <p
        v-if="lastSeenLabel"
        class="hero__lastseen"
      >
        <span class="hero__lastseen-dot" />
        {{ lastSeenLabel }}
      </p>
      <div class="hero__cta">
        <RouterLink to="/inventory">
          <AppButton variant="primary">
            추천 받기 →
          </AppButton>
        </RouterLink>
        <RouterLink to="/history">
          <AppButton variant="secondary">
            지난 추천 보기
          </AppButton>
        </RouterLink>
      </div>
    </header>

    <div class="grid">
      <AppCard
        eyebrow="식재료"
        :title="`${inventoryCount}개 보유`"
        variant="default"
        padding="lg"
        accent
      >
        <p>보유 식재료를 입력하고 추천을 받아보세요.</p>
        <template #footer>
          <RouterLink to="/inventory">
            <AppButton variant="primary">
              식재료 관리 →
            </AppButton>
          </RouterLink>
        </template>
      </AppCard>

      <AppCard
        eyebrow="최근 추천"
        :title="recent ? `추천 #${recent.id}` : '아직 없음'"
        variant="soft"
        padding="lg"
      >
        <p v-if="recent">
          <AppBadge
            tone="success"
            variant="solid"
          >
            {{ recent.status }}
          </AppBadge>
          <span
            v-if="recent.total_kcal"
            class="kcal"
          >{{ recent.total_kcal }} kcal</span>
        </p>
        <p
          v-else
          class="muted"
        >
          아직 추천 이력이 없습니다. 식재료를 입력하면 첫 추천을 받을 수 있어요.
        </p>
      </AppCard>

      <AppCard
        variant="green"
        padding="lg"
      >
        <span class="card-eyebrow">Tip</span>
        <h3 class="card-title">
          냉장고를 깨끗하게,<br>
          식비는 가볍게.
        </h3>
        <p>유통기한이 임박한 재료를 우선 활용하면 낭비를 30%까지 줄일 수 있어요.</p>
      </AppCard>
    </div>
  </section>
</template>

<style scoped>
.dash {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
}

.hero {
  background: var(--color-canvas-soft);
  border-radius: var(--radius-xl);
  padding: clamp(32px, 6vw, 64px);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}
.hero__eyebrow {
  font-size: var(--fs-caption);
  font-weight: var(--fw-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-muted);
}
.hero__title {
  margin: 0;
  font-family: var(--font-display);
  font-weight: var(--fw-display);
  font-size: clamp(40px, 6vw, 72px);
  line-height: 1.0;
  letter-spacing: -0.02em;
  color: var(--color-ink);
  text-transform: none;
}
.hero__name { color: var(--color-ink-deep); }
.hero__lede {
  font-size: var(--fs-body-lg);
  color: var(--color-body);
  max-width: 52ch;
  margin: 0;
}
.hero__welcome {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  align-self: flex-start;
  margin: 0;
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  background: var(--color-primary-pale);
  color: var(--color-ink-deep);
  font-weight: var(--fw-semibold);
  font-size: var(--fs-body-sm);
}
.hero__lastseen {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  margin: 0;
  font-size: var(--fs-body-sm);
  color: var(--color-muted);
}
.hero__lastseen-dot {
  width: 7px;
  height: 7px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  display: inline-block;
}
.hero__cta {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
  margin-top: var(--space-sm);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-lg);
}
.kcal { margin-left: var(--space-sm); color: var(--color-muted); }
.muted { color: var(--color-muted); margin: 0; }

.card-eyebrow {
  font-size: var(--fs-caption);
  font-weight: var(--fw-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-ink-deep);
  opacity: 0.7;
}
.card-title {
  font-family: var(--font-display);
  font-weight: var(--fw-display);
  font-size: var(--fs-display-sm);
  line-height: 1.1;
  letter-spacing: -0.015em;
  color: var(--color-ink-deep);
  margin: var(--space-sm) 0 var(--space-xs);
  text-transform: none;
}
</style>
