/**
 * Privacy export/withdraw E2E (T118).
 * 시나리오:
 *  1) 회원가입 + 알레르기 1건 입력
 *  2) Settings → MY DATA 탭에서 JSON 다운로드 트리거
 *  3) Settings → WITHDRAW 탭에서 비밀번호 재확인 + 탈퇴 완료
 *  4) /login 으로 리다이렉트되는지 확인
 */
import { test, expect } from '@playwright/test';

test('내 데이터 내보내기 + 탈퇴 완료까지', async ({ page }) => {
  const email = `priv-e2e+${Date.now()}@example.com`;
  const password = 'test1234';

  // 회원가입
  await page.goto('/register');
  await page.getByLabel('EMAIL').fill(email);
  await page.getByLabel('PASSWORD').fill(password);
  await page.getByLabel(/필수.*이용약관/).check();
  await page.getByLabel(/필수.*개인정보/).check();
  await page.getByRole('button', { name: /CREATE ACCOUNT/i }).click();

  // 온보딩 — Step2에서 알레르기 1개 추가
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByRole('button', { name: /^NEXT$/ }).click(); // step1 → 2
  await page.getByPlaceholder(/땅콩/).fill('땅콩');
  await page.getByRole('button', { name: /^ADD$/ }).first().click();
  await page.getByRole('button', { name: /^NEXT$/ }).click(); // step2 → 3
  await page.getByRole('button', { name: /FINISH/i }).click();

  // Settings 진입
  await page.goto('/settings');
  await expect(page.getByText(/계정 & 개인정보/)).toBeVisible();

  // MY DATA 탭 — 다운로드 이벤트 기다림
  await page.getByRole('tab', { name: /MY DATA/i }).click();
  const downloadPromise = page.waitForEvent('download', { timeout: 10_000 });
  await page.getByRole('button', { name: /DOWNLOAD JSON/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^mis2601-export-/);

  // WITHDRAW 탭 — 비밀번호 입력 → 탈퇴
  await page.getByRole('tab', { name: /WITHDRAW/i }).click();
  await page.getByRole('button', { name: /PROCEED TO WITHDRAW/i }).click();
  await page.getByLabel('PASSWORD').fill(password);
  await page.getByRole('button', { name: /CONFIRM WITHDRAW/i }).click();

  // /login 으로 리다이렉트
  await expect(page).toHaveURL(/\/login/);

  // 동일 이메일로 재로그인 시도 → 실패 (withdrawn)
  await page.getByLabel('EMAIL').fill(email);
  await page.getByLabel('PASSWORD').fill(password);
  await page.getByRole('button', { name: /^LOG IN$/ }).click();
  await expect(page.getByText(/Invalid|로그인 실패/i)).toBeVisible();
});
