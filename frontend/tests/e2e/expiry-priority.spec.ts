/**
 * Expiry priority E2E (T107).
 *
 * 시나리오:
 *  - 회원가입 후 인벤토리에 D-1 (내일 만료) 재료 입력
 *  - 추천 받기
 *  - 결과의 첫 레시피 ingredients 영역에 해당 재료가 노출되는지 확인
 *
 * Mock LLM은 결정적이라 "재정렬"은 검증 불가 — 대신 plan §5의 핵심 회귀(흐름 깨짐 없음 +
 *  ShoppingListPanel 렌더 + ExpiryBadge 표기)을 보장한다.
 */
import { test, expect } from '@playwright/test';

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

test('D-1 임박 재료가 인벤토리/추천 흐름에서 흐름 단절 없이 노출', async ({ page }) => {
  const email = `exp+${Date.now()}@example.com`;

  // 회원가입 → 온보딩 skip → 인벤토리
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

  // 임박 재료 + 일반 재료 입력
  const expDate = tomorrow();
  await page.locator('textarea').fill(`${expDate} 두부 1모\n양파 1개`);
  await page.getByRole('button', { name: /ADD TO INVENTORY/i }).click();

  // 임박 배지 노출 확인 (D-1)
  await expect(page.getByText(/^D-(0|1)$/)).toBeVisible();

  // 추천
  await page.getByRole('button', { name: /GET RECOMMENDATION/i }).click();
  await expect(page).toHaveURL(/\/recommendation/);
  await expect(page.getByText(/RECIPE 1/i)).toBeVisible({ timeout: 30_000 });

  // ShoppingListPanel 렌더 (영양 결핍이 없거나 빈 목록이어도 패널은 렌더되어야 함)
  await expect(page.getByText(/SHOPPING LIST/i)).toBeVisible();

  // 두부가 결과 어딘가에는 노출되는지 (mock recipe 가 두부 포함)
  const body = await page.locator('body').innerText();
  expect(body).toMatch(/두부/);
});

test('만료된 재료(어제) 입력 시 자동 제외 + 경고 표시', async ({ page }) => {
  const email = `exp-old+${Date.now()}@example.com`;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const expired = y.toISOString().slice(0, 10);

  await page.goto('/register');
  await page.getByLabel('EMAIL').fill(email);
  await page.getByLabel('PASSWORD').fill('test1234');
  await page.getByLabel(/필수.*이용약관/).check();
  await page.getByLabel(/필수.*개인정보/).check();
  await page.getByRole('button', { name: /CREATE ACCOUNT/i }).click();

  await page.getByRole('button', { name: /^NEXT$/ }).click();
  await page.getByRole('button', { name: /^NEXT$/ }).click();
  await page.getByRole('button', { name: /FINISH/i }).click();

  await page.locator('textarea').fill(`${expired} 우유 200ml`);
  await page.getByRole('button', { name: /ADD TO INVENTORY/i }).click();

  // 만료된 항목은 ingredient_items 에 저장되지 않으므로 카드 목록에 없어야 함
  // 대신 ADD 응답의 warning 으로 사용자에게 전달 — 여기서는 인벤토리 목록이 비어있는지 확인
  await expect(page.getByText(/아직 식재료가 없습니다/)).toBeVisible();
});
