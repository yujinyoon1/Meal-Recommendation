/**
 * 추천 골든패스 통합 테스트 (Mock LLM).
 *
 * 사전 요구사항:
 *  - DB 마이그레이션 완료 + masters 시드 완료
 *  - `LLM_PROVIDER=mock`
 *  - `.env`에 DB 자격증명 + APP_ENCRYPTION_KEY 설정
 *
 * DB 환경이 없으면 자동 skip.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

const hasDb =
  !!process.env.DB_HOST &&
  !!process.env.DB_USER &&
  !!process.env.DB_NAME &&
  !!process.env.APP_ENCRYPTION_KEY &&
  !!process.env.JWT_ACCESS_SECRET &&
  !!process.env.JWT_REFRESH_SECRET;

const d = hasDb ? describe : describe.skip;

d('recommendation flow (Mock LLM)', () => {
  let app: import('express').Express;
  let access: string;

  beforeAll(async () => {
    process.env.LLM_PROVIDER = 'mock';
    const { createApp } = await import('../../src/app.js');
    app = createApp();

    // 새 사용자 등록
    const email = `test+${Date.now()}@example.com`;
    const r = await request(app).post('/api/auth/register').send({
      email,
      password: 'test1234',
      consents: [
        { type: 'terms', granted: true },
        { type: 'privacy', granted: true },
      ],
    });
    expect(r.status).toBe(201);
    access = r.body.accessToken;
  });

  afterAll(async () => {
    const { pool } = await import('../../src/db/pool.js');
    await pool.end();
  });

  it('골든 패스 — 인벤토리 입력 → 추천 → 영양 + disclaimer 포함', async () => {
    await request(app).put('/api/me/profile/basic').set('Authorization', `Bearer ${access}`).send({ age: 30, gender: 'female', height_cm: 165, weight_kg: 58 });
    await request(app).put('/api/me/profile/health').set('Authorization', `Bearer ${access}`).send({ allergies: [], diseases: [], goal: 'maintain' });
    await request(app).put('/api/me/profile/diet').set('Authorization', `Bearer ${access}`).send({ meals_per_day: 3, cooking_time_max_min: 30 });

    const inv = await request(app)
      .post('/api/inventory/items')
      .set('Authorization', `Bearer ${access}`)
      .send({ text: '계란 2개, 양파 1개, 두부 반 모' });
    expect(inv.status).toBe(201);
    expect(inv.body.items.length).toBeGreaterThan(0);

    const rec = await request(app)
      .post('/api/recommendations')
      .set('Authorization', `Bearer ${access}`);
    expect(rec.status).toBe(201);
    expect(rec.body.status).toBe('validated');
    expect(rec.body.recipes.length).toBeGreaterThan(0);
    expect(rec.body.disclaimer).toMatch(/의학적 진단/);
  });

  it('알레르기 차단 — 땅콩 알레르기 등록 후에도 mock recipe는 땅콩 미포함', async () => {
    // mock 어댑터는 두부/계란/양파만 반환 → 결과는 validated여야 함
    await request(app).put('/api/me/profile/health').set('Authorization', `Bearer ${access}`).send({ allergies: ['땅콩'], diseases: [], goal: 'maintain' });
    const rec = await request(app)
      .post('/api/recommendations')
      .set('Authorization', `Bearer ${access}`);
    expect(rec.status).toBe(201);
    expect(rec.body.status).toBe('validated');
    const allIngredients = rec.body.recipes.flatMap((r: { ingredients: { name: string }[] }) => r.ingredients.map((i) => i.name));
    expect(allIngredients.some((n: string) => n.includes('땅콩'))).toBe(false);
  });
});
