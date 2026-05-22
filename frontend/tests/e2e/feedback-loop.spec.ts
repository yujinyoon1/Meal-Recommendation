/**
 * Feedback loop E2E (T098).
 * 시나리오:
 *  1) 회원가입 → 온보딩 → 인벤토리 → 추천
 *  2) 결과 페이지에서 별점 2점 + 코멘트 제출
 *  3) /history 진입 → 동일 ID에 별점 표기 확인
 *  4) 재추천 — Mock LLM은 결정적이므로 "동일 카테고리 빈도 감소" 자체는 검증하지 않고
 *     백엔드가 preferenceHints 를 프롬프트에 주입했는지(통합 테스트 책임)에 위임.
 *     이 E2E는 사용자 가시 흐름(피드백 → 이력 → 재추천 → 결과)이 깨지지 않음을 보장한다.
 */
import { test, expect } from '@playwright/test';

test('피드백 등록 후 이력에 노출되고 재추천이 정상 동작', async ({ page }) => {
  const email = `fb-e2e+${Date.now()}@example.com`;

  await page.goto('/register');
  await page.getByLabel('EMAIL').fill(email);
  await page.getByLabel('PASSWORD').fill('test1234');
  await page.getByLabel(/필수.*이용약관/).check();
  await page.getByLabel(/필수.*개인정보/).check();
  await page.getByRole('button', { name: /CREATE ACCOUNT/i }).click();

  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByRole('button', { name: /^NEXT$/ }).click();
  await page.getByRole('button', { name: /^NEXT$/ }).click();
  await page.getByRole('button', { name: /FINISH/i }).click();

  await expect(page).toHaveURL(/\/inventory/);
  await page.locator('textarea').fill('계란 2개, 두부 반 모');
  await page.getByRole('button', { name: /ADD TO INVENTORY/i }).click();
  await page.getByRole('button', { name: /GET RECOMMENDATION/i }).click();

  await expect(page).toHaveURL(/\/recommendation/);
  await expect(page.getByText(/RECIPE 1/i)).toBeVisible({ timeout: 30_000 });

  // 별점 2점 + 코멘트 → 제출
  const stars = page.locator('button.star');
  await stars.nth(1).click(); // index 1 = 별 2개
  await page.getByPlaceholder(/아쉬웠던 점/).fill('두부 별로');
  await page.getByRole('button', { name: /SUBMIT FEEDBACK/i }).click();
  await expect(page.getByText(/피드백이 저장되었습니다/)).toBeVisible();

  // 이력 진입
  await page.goto('/history');
  await expect(page.getByText(/★ 2\/5/)).toBeVisible();

  // 재추천 — 깨지지 않고 RECIPE 1 표시
  await page.goto('/inventory');
  await page.getByRole('button', { name: /GET RECOMMENDATION/i }).click();
  await expect(page.getByText(/RECIPE 1/i)).toBeVisible({ timeout: 30_000 });
});
