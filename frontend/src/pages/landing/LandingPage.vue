<script setup lang="ts">
import { RouterLink } from 'vue-router';
import AppButton from '@/components/ui/AppButton.vue';
import AppCard from '@/components/ui/AppCard.vue';

const features = [
  {
    icon: '🧊',
    title: '냉장고부터 시작',
    body: '가진 재료를 입력하면 그걸로 만들 수 있는 한 끼를 골라드려요. 장보기 전에 먼저 비우세요.',
  },
  {
    icon: '🛡️',
    title: '알레르기·질병 안전',
    body: '등록한 알레르기와 기피 재료는 추천에서 100% 배제됩니다. 코드로 검증해 빠뜨리지 않아요.',
  },
  {
    icon: '📊',
    title: '영양까지 한눈에',
    body: '추천 식단의 칼로리·영양 균형을 차트로 보여드려요. 목표 칼로리에 맞춰 조절됩니다.',
  },
  {
    icon: '💸',
    title: '낭비는 줄이고',
    body: '유통기한이 임박한 재료를 우선 활용해 1인 가구의 식재료 낭비와 식비를 함께 덜어줍니다.',
  },
];

const steps = [
  { no: '01', title: '재료 입력', body: '냉장고에 있는 식재료를 빠르게 등록해요.' },
  { no: '02', title: 'AI 추천', body: '내 건강정보·선호를 반영한 맞춤 식단을 받아요.' },
  { no: '03', title: '요리 & 기록', body: '레시피대로 만들고 추천 이력으로 남겨요.' },
];
</script>

<template>
  <div class="landing">
    <!-- HERO -->
    <section class="hero">
      <span class="hero__eyebrow">AI 식단 추천 · 1인 가구를 위한</span>
      <h1 class="hero__title">
        오늘 뭐 먹지,<br>
        <span class="hero__accent">냉장고가 답해요.</span>
      </h1>
      <p class="hero__lede">
        가진 재료로 만들 수 있는 한 끼를 AI가 골라드립니다.
        알레르기는 안전하게 빼고, 영양은 챙기고, 식재료 낭비는 줄이면서요.
      </p>
      <div class="hero__cta">
        <RouterLink to="/register">
          <AppButton variant="primary">
            무료로 시작하기 →
          </AppButton>
        </RouterLink>
        <RouterLink to="/login">
          <AppButton variant="outline">
            로그인
          </AppButton>
        </RouterLink>
      </div>
    </section>

    <!-- FEATURES -->
    <section class="section">
      <header class="section__head">
        <span class="section__eyebrow">왜 p14인가요</span>
        <h2 class="section__title">
          1인 가구의 식사를 더 똑똑하게.
        </h2>
      </header>
      <div class="features">
        <AppCard
          v-for="f in features"
          :key="f.title"
          variant="default"
          padding="lg"
        >
          <span class="feature__icon">{{ f.icon }}</span>
          <h3 class="feature__title">
            {{ f.title }}
          </h3>
          <p class="feature__body">
            {{ f.body }}
          </p>
        </AppCard>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section class="section">
      <header class="section__head">
        <span class="section__eyebrow">How it works</span>
        <h2 class="section__title">
          3단계면 충분해요.
        </h2>
      </header>
      <ol class="steps">
        <li
          v-for="s in steps"
          :key="s.no"
          class="step"
        >
          <span class="step__no">{{ s.no }}</span>
          <h3 class="step__title">
            {{ s.title }}
          </h3>
          <p class="step__body">
            {{ s.body }}
          </p>
        </li>
      </ol>
    </section>

    <!-- CTA BAND -->
    <AppCard
      variant="dark"
      padding="lg"
      class="cta-band"
    >
      <h2 class="cta-band__title">
        냉장고를 열기 전에,<br>
        p14를 먼저 열어보세요.
      </h2>
      <RouterLink to="/register">
        <AppButton variant="primary">
          무료로 시작하기 →
        </AppButton>
      </RouterLink>
    </AppCard>
  </div>
</template>

<style scoped>
.landing {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
}

/* HERO */
.hero {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  padding: clamp(40px, 7vw, 88px) 0 var(--space-xl);
  max-width: 60ch;
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
  font-size: clamp(44px, 8vw, 88px);
  line-height: 1.0;
  letter-spacing: -0.025em;
  color: var(--color-ink);
}
.hero__accent { color: var(--color-ink-deep); }
.hero__lede {
  font-size: var(--fs-body-lg);
  line-height: 1.5;
  color: var(--color-body);
  max-width: 52ch;
  margin: 0;
}
.hero__cta {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
  margin-top: var(--space-sm);
}

/* SECTIONS */
.section { display: flex; flex-direction: column; gap: var(--space-xl); }
.section__head { display: flex; flex-direction: column; gap: var(--space-xs); }
.section__eyebrow {
  font-size: var(--fs-caption);
  font-weight: var(--fw-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-muted);
}
.section__title {
  margin: 0;
  font-family: var(--font-display);
  font-weight: var(--fw-display);
  font-size: clamp(28px, 4vw, var(--fs-display-md));
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--color-ink);
}

/* FEATURES */
.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-lg);
}
.feature__icon { font-size: 32px; line-height: 1; }
.feature__title {
  margin: var(--space-md) 0 var(--space-xs);
  font-family: var(--font-display);
  font-weight: var(--fw-semibold);
  font-size: var(--fs-display-xs);
  letter-spacing: -0.01em;
  color: var(--color-ink);
}
.feature__body { margin: 0; color: var(--color-body); line-height: 1.5; }

/* STEPS */
.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-lg);
}
.step {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding-top: var(--space-md);
  border-top: 2px solid var(--color-primary);
}
.step__no {
  font-family: var(--font-display);
  font-weight: var(--fw-display);
  font-size: var(--fs-display-sm);
  color: var(--color-ink-deep);
}
.step__title {
  margin: 0;
  font-weight: var(--fw-semibold);
  font-size: var(--fs-body-lg);
  color: var(--color-ink);
}
.step__body { margin: 0; color: var(--color-body); line-height: 1.5; }

/* CTA BAND */
.cta-band {
  text-align: center;
  align-items: center;
}
.cta-band__title {
  margin: 0 0 var(--space-md);
  font-family: var(--font-display);
  font-weight: var(--fw-display);
  font-size: clamp(26px, 4vw, var(--fs-display-md));
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--color-primary);
}
</style>
