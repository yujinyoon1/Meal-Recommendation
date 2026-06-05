<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { useBookmarkStore } from '@/stores/bookmarks';
import RecipeCard from '@/components/recommendation/RecipeCard.vue';
import AppButton from '@/components/ui/AppButton.vue';
import AppToast from '@/components/ui/AppToast.vue';

const bookmarks = useBookmarkStore();

// 진입할 때마다 최신 목록을 다시 받아온다(다른 화면에서 추가/해제됐을 수 있으므로).
onMounted(() => { bookmarks.fetch().catch(() => {}); });
</script>

<template>
  <section class="bm">
    <div class="m-stripe" />
    <header class="bm__head">
      <span class="label-uppercase eyebrow">SAVED</span>
      <h1>저장한 레시피</h1>
      <p
        v-if="bookmarks.count"
        class="bm__sub"
      >
        {{ bookmarks.count }}개의 레시피를 저장했어요.
      </p>
    </header>

    <p
      v-if="bookmarks.loading && !bookmarks.items.length"
      class="loading"
    >
      불러오는 중…
    </p>

    <div
      v-else-if="!bookmarks.items.length"
      class="empty"
    >
      <p>아직 저장한 레시피가 없어요.</p>
      <RouterLink to="/inventory">
        <AppButton variant="primary">
          추천 받으러 가기 →
        </AppButton>
      </RouterLink>
    </div>

    <div
      v-else
      class="bm__grid"
    >
      <RecipeCard
        v-for="(r, i) in bookmarks.items"
        :key="r.id"
        :recipe="r"
        :index="i"
      />
    </div>

    <AppToast
      :open="!!bookmarks.error"
      tone="error"
      title="ERROR"
      @close="bookmarks.error = null"
    >
      {{ bookmarks.error }}
    </AppToast>
  </section>
</template>

<style scoped>
.bm { display: flex; flex-direction: column; gap: var(--space-lg); }
.bm__head h1 { font-size: var(--fs-display-md); margin: var(--space-xs) 0; }
.eyebrow { color: var(--color-muted); }
.bm__sub { color: var(--color-muted); margin: 0; }
.bm__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--space-lg);
  align-items: start;
}
.empty { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-md); color: var(--color-muted); }
.loading { text-align: center; color: var(--color-muted); font-size: var(--fs-caption); text-transform: uppercase; letter-spacing: var(--ls-label); }
</style>
