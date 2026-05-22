/**
 * Feedback 통합 (T097).
 *  - 별점/코멘트 등록
 *  - 이력 목록 조회
 *  - 부정 피드백 후 재추천 시 preferenceHints가 프롬프트에 반영되는지 검증
 *
 * Mock LLM 어댑터는 결정적 출력이므로 "재료가 바뀐다"는 직접 검증은 불가능.
 * 대신, aggregateHints() 가 dislike_ingredients 를 반환하는지 도메인 수준에서 검증.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

const hasDb =
  !!process.env.DB_HOST && !!process.env.DB_USER && !!process.env.DB_NAME &&
  !!process.env.APP_ENCRYPTION_KEY &&
  !!process.env.JWT_ACCESS_SECRET && !!process.env.JWT_REFRESH_SECRET;

const d = hasDb ? describe : describe.skip;

d('feedback flow', () => {
  let app: import('express').Express;
  let access: string;
  let userId: number;
  let recommendationId: number;

  beforeAll(async () => {
    process.env.LLM_PROVIDER = 'mock';
    const { createApp } = await import('../../src/app.js');
    app = createApp();

    const email = `fb+${Date.now()}@example.com`;
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
    userId = r.body.user.id;

    await request(app).put('/api/me/profile/basic').set('Authorization', `Bearer ${access}`).send({ age: 28 });
    await request(app).put('/api/me/profile/health').set('Authorization', `Bearer ${access}`).send({ allergies: [], diseases: [] });
    await request(app).put('/api/me/profile/diet').set('Authorization', `Bearer ${access}`).send({ cooking_time_max_min: 30 });
    await request(app).post('/api/inventory/items').set('Authorization', `Bearer ${access}`).send({ text: '계란 2개, 두부 반 모' });

    const rec = await request(app).post('/api/recommendations').set('Authorization', `Bearer ${access}`);
    expect(rec.status).toBe(201);
    recommendationId = rec.body.recommendation_id;
  });

  afterAll(async () => {
    const { pool } = await import('../../src/db/pool.js');
    await pool.end();
  });

  it('별점 등록 → 201', async () => {
    const r = await request(app)
      .post(`/api/recommendations/${recommendationId}/feedback`)
      .set('Authorization', `Bearer ${access}`)
      .send({ rating: 2, comment: '두부 별로였어요' });
    expect(r.status).toBe(201);
    expect(r.body.rating).toBe(2);
  });

  it('GET /recommendations 이력에 별점이 노출됨', async () => {
    const r = await request(app)
      .get('/api/recommendations?limit=10')
      .set('Authorization', `Bearer ${access}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.items)).toBe(true);
    const found = r.body.items.find((x: { id: number }) => x.id === recommendationId);
    expect(found?.rating).toBe(2);
  });

  it('GET /recommendations/:id/full 에 feedbacks 포함', async () => {
    const r = await request(app)
      .get(`/api/recommendations/${recommendationId}/full`)
      .set('Authorization', `Bearer ${access}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.feedbacks)).toBe(true);
    expect(r.body.feedbacks.length).toBeGreaterThan(0);
  });

  it('부정 피드백이 2건 이상이면 aggregateHints가 재료를 반환', async () => {
    // 동일 추천에 한 번 더 부정 피드백
    await request(app)
      .post(`/api/recommendations/${recommendationId}/feedback`)
      .set('Authorization', `Bearer ${access}`)
      .send({ rating: 1, comment: '맛없음' });

    const { aggregateHints } = await import('../../src/domain/prompt/preferenceHints.js');
    const hints = await aggregateHints(userId);
    // mock recipe 의 재료 중 일부가 반환되어야 함
    expect(hints.dislike_ingredients.length).toBeGreaterThan(0);
  });

  it('다른 사용자의 추천에는 피드백 불가 → 403/404', async () => {
    // 두 번째 사용자 생성
    const r2 = await request(app).post('/api/auth/register').send({
      email: `fb2+${Date.now()}@example.com`,
      password: 'test1234',
      consents: [
        { type: 'terms', granted: true },
        { type: 'privacy', granted: true },
      ],
    });
    const access2 = r2.body.accessToken;
    const bad = await request(app)
      .post(`/api/recommendations/${recommendationId}/feedback`)
      .set('Authorization', `Bearer ${access2}`)
      .send({ rating: 5 });
    expect([403, 404]).toContain(bad.status);
  });
});
