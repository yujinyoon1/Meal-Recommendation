<script setup lang="ts">
import { ref } from 'vue';
import { api } from '@/api/client';
import AppButton from '@/components/ui/AppButton.vue';
import AppCard from '@/components/ui/AppCard.vue';
import AppToast from '@/components/ui/AppToast.vue';

const downloading = ref(false);
const error = ref<string | null>(null);
const ok = ref(false);

async function onDownload() {
  downloading.value = true;
  error.value = null;
  try {
    const resp = await api.get('/me/data/export', { responseType: 'blob' });
    const blob = resp.data instanceof Blob ? resp.data : new Blob([JSON.stringify(resp.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mis2601-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    ok.value = true;
  } catch (e: unknown) {
    error.value = (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '내보내기 실패';
  } finally {
    downloading.value = false;
  }
}
</script>

<template>
  <section class="tab">
    <AppCard eyebrow="DATA EXPORT" title="내 데이터 내려받기" variant="soft" padding="lg" m-stripe>
      <p>
        가입 이래 입력한 모든 본인 데이터(프로필·인벤토리·추천·피드백·동의 이력)를
        하나의 JSON 파일로 내려받습니다. 알레르기/질병은 평문으로 포함됩니다.
      </p>
      <p class="warn">파일은 안전한 곳에 보관하세요. 공유 시 민감 정보 노출에 유의.</p>
      <template #footer>
        <AppButton variant="primary" :disabled="downloading" @click="onDownload">
          {{ downloading ? 'PREPARING…' : 'DOWNLOAD JSON' }}
        </AppButton>
      </template>
    </AppCard>

    <AppToast :open="ok" tone="success" title="DOWNLOADED" @close="ok = false">
      파일 다운로드가 시작되었습니다.
    </AppToast>
    <AppToast :open="!!error" tone="error" title="ERROR" @close="error = null">{{ error }}</AppToast>
  </section>
</template>

<style scoped>
.tab { display: flex; flex-direction: column; gap: var(--space-md); }
.warn { color: var(--color-warning); font-size: var(--fs-body-sm); margin: 0; }
</style>
