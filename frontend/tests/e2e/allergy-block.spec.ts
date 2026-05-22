/**
 * Allergy-block E2E (T088).
 * 사용자가 "땅콩" 알레르기를 등록한 뒤, 결과의 어떤 레시피에도 "땅콩" 재료가 노출되지 않는다.
 */
import { test, expect } from '@playwright/test';

test('알레르기 등록 시 동일 재료가 결과에 미노출', async ({ page }) => {
  const email = `e2e-allergy+${Date.now()}@example.com`;

  // 회원가입
  await page.goto('/register');
  await page.getByLabel('EMAIL').fill(email);
  await page.getByLabel('PASSWORD').fill('test1234');
  await page.getByLabel(/필수.*이용약관/).check();
  await page.getByLabel(/필수.*개인정보/).check();
  await page.getByRole('button', { name: /CREATE ACCOUNT/i }).click();

  // 온보딩 — Step1 skip, Step2 알레르기 추가, Step3 skip
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByRole('button', { name: /^NEXT$/ }).click(); // step1 → step2
  await page.getByPlaceholder(/땅콩/).fill('땅콩');
  await page.getByRole('button', { name: /^ADD$/ }).first().click();
  await page.getByRole('button', { name: /^NEXT$/ }).click(); // step2 → step3
  await page.getByRole('button', { name: /FINISH/i }).click();

  // 인벤토리 + 추천
  await page.locator('textarea').fill('계란 2개, 양파 1개, 두부 반 모');
  await page.getByRole('button', { name: /ADD TO INVENTORY/i }).click();
  await page.getByRole('button', { name: /GET RECOMMENDATION/i }).click();

  // 결과에서 "땅콩" 텍스트가 없어야 함
  await expect(page).toHaveURL(/\/recommendation/);
  await expect(page.getByText(/RECIPE 1/i)).toBeVisible({ timeout: 30_000 });
  const body = await page.locator('body').innerText();
  expect(body).not.toContain('땅콩');
});
