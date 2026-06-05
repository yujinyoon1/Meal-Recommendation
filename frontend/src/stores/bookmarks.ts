import { defineStore } from 'pinia';
import { api } from '@/api/client';
import type { Recipe } from './recommendation';

export interface BookmarkedRecipe extends Recipe {
  id: number;
  bookmarked_at: string;
}

interface State {
  items: BookmarkedRecipe[];
  ids: Set<number>;
  loaded: boolean;       // 목록을 한 번이라도 받아왔는지
  loading: boolean;
  error: string | null;
  pending: Set<number>;  // 토글 진행 중인 recipe id (중복 클릭 방지)
}

function msg(e: unknown, fallback: string): string {
  return (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback;
}

export const useBookmarkStore = defineStore('bookmarks', {
  state: (): State => ({
    items: [],
    ids: new Set(),
    loaded: false,
    loading: false,
    error: null,
    pending: new Set(),
  }),

  getters: {
    has: (s) => (recipeId?: number) => recipeId != null && s.ids.has(recipeId),
    isPending: (s) => (recipeId?: number) => recipeId != null && s.pending.has(recipeId),
    count: (s) => s.items.length,
  },

  actions: {
    /** 저장한 레시피 전체 목록(본문 포함). 저장 페이지 + id 집합 동기화. */
    async fetch() {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await api.get<{ items: BookmarkedRecipe[] }>('/bookmarks');
        this.items = data.items;
        this.ids = new Set(data.items.map((r) => r.id));
        this.loaded = true;
        return data.items;
      } catch (e: unknown) {
        this.error = msg(e, '북마크 조회 실패');
        throw e;
      } finally {
        this.loading = false;
      }
    },

    /** id 집합만 먼저 채워 토글 버튼의 on/off 표시를 정확히. (저장 페이지 진입 전에도 호출 가능) */
    async ensureLoaded() {
      if (this.loaded || this.loading) return;
      await this.fetch();
    },

    /** 북마크 토글. 낙관적 업데이트 후 실패 시 롤백. */
    async toggle(recipe: Recipe) {
      const id = recipe.id;
      if (id == null || this.pending.has(id)) return;
      const wasOn = this.ids.has(id);
      this.pending = new Set(this.pending).add(id);
      // 낙관적 반영
      const nextIds = new Set(this.ids);
      if (wasOn) nextIds.delete(id);
      else nextIds.add(id);
      this.ids = nextIds;

      try {
        if (wasOn) {
          await api.delete(`/bookmarks/${id}`);
          this.items = this.items.filter((r) => r.id !== id);
        } else {
          await api.post('/bookmarks', { recipe_id: id });
          // 목록에 본문이 필요하면 다음 fetch 에서 채워짐. 여기선 가벼운 stub 추가.
          if (!this.items.some((r) => r.id === id)) {
            this.items = [
              { ...recipe, id, bookmarked_at: '' } as BookmarkedRecipe,
              ...this.items,
            ];
          }
        }
      } catch (e: unknown) {
        // 롤백
        const rollback = new Set(this.ids);
        if (wasOn) rollback.add(id);
        else rollback.delete(id);
        this.ids = rollback;
        this.error = msg(e, '북마크 변경 실패');
        throw e;
      } finally {
        const p = new Set(this.pending);
        p.delete(id);
        this.pending = p;
      }
    },
  },
});
