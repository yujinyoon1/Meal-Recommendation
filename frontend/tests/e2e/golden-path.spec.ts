/**
 * Golden path E2E (T087).
 * 신규 회원가입 → 온보딩 → 식재료 입력 → 추천 결과 표시까지 30초 이내.
 *
 * 사전 요구사항:
 *  - backend 가 :9534 에서 LLM_PROVIDER=mock 으로 기동
 *  - DB 가 깨끗한 상태 (또는 test 전용 스키마)
 */
import { test, expect } from '@playwright/test';

test('회원가입~추천 완료까지 30초 이내', async ({ page }) => {
  const start = Date.now();
  const email = `e2e+${Date.now()}@example.com`;

  await page.goto('/register');
  await page.getByLabel('EMAIL').fill(email);
  await page.getByLabel('PASSWORD').fill('test1234');
  await page.getByLabel(/필수.*이용약관/).check();
  await page.getByLabel(/필수.*개인정보/).check();
  await page.getByRole('button', { name: /CREATE ACCOUNT/i }).click();

  // 온보딩 진입
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel('AGE').fill('30');
  await page.getByLabel('HEIGHT (CM)').fill('165');
  await page.getByLabel('WEIGHT (KG)').fill('58');
  await page.getByRole('button', { name: /^NEXT$/ }).click();
  await page.getByRole('button', { name: /^NEXT$/ }).click();
  await page.getByRole('button', { name: /FINISH/i }).click();

  // 인벤토리
  await expect(page).toHaveURL(/\/inventory/);
  await page.locator('textarea').fill('계란 2개, 양파 1개, 두부 반 모');
  await page.getByRole('button', { name: /ADD TO INVENTORY/i }).click();
  await page.getByRole('button', { name: /GET RECOMMENDATION/i }).click();

  // 결과
  await expect(page).toHaveURL(/\/recommendation/);
  await expect(page.getByText(/RECIPE 1/i)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/의학적 진단/)).toBeVisible();

  const elapsed = (Date.now() - start) / 1000;
  expect(elapsed).toBeLessThanOrEqual(30);
});
