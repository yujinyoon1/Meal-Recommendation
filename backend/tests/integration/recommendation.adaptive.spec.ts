/**
 * 002 US1 — 적응형 개인화 통합 테스트 (Mock LLM).
 *
 * 검증:
 *  - 추천 응답에 rationale[] 포함 (FR-003)
 *  - 추천 수정 이력 기록 → 선호 가중치 반영 (FR-001/002)
 *  - 학습 가중치가 알레르기 차단을 무력화하지 않음 (FR-005 안전 회귀)
 *
 * DB 환경이 없으면 자동 skip (기존 통합 테스트와 동일 패턴).
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

d('adaptive personalization (002 US1)', () => {
  let app: import('express').Express;
  let access: string;

  beforeAll(async () => {
    process.env.LLM_PROVIDER = 'mock';
    const { createApp } = await import('../../src/app.js');
    app = createApp();
    const email = `adaptive+${Date.now()}@example.com`;
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
    await request(app).post('/api/inventory/items').set('Authorization', `Bearer ${access}`).send({ text: '두부 1모, 계란 3개, 양파 1개' });
  });

  afterAll(async () => {
    const { pool } = await import('../../src/db/pool.js');
    await pool.end();
  });

  it('추천 응답에 rationale[] 포함 + 콜드스타트 표기 (FR-003/004)', async () => {
    const rec = await request(app).post('/api/recommendations').set('Authorization', `Bearer ${access}`);
    expect(rec.status).toBe(201);
    expect(Array.isArray(rec.body.rationale)).toBe(true);
    const pref = await request(app).get('/api/preferences/weights').set('Authorization', `Bearer ${access}`);
    expect(pref.status).toBe(200);
    expect(pref.body).toHaveProperty('cold_start');
  });

  it('추천 수정(exclude) 2회 → 해당 재료 음의 가중치 학습 (FR-001/002)', async () => {
    const rec = await request(app).post('/api/recommendations').set('Authorization', `Bearer ${access}`);
    const rid = rec.body.recommendation_id;
    const ed = await request(app)
      .post(`/api/recommendations/${rid}/edits`)
      .set('Authorization', `Bearer ${access}`)
      .send([
        { action: 'exclude', target_type: 'ingredient', target_ref: '가지' },
        { action: 'exclude', target_type: 'ingredient', target_ref: '가지' },
      ]);
    expect(ed.status).toBe(201);
    // recompute는 동기 트리거(서비스 내부) — 잠시 후 조회
    await new Promise((r) => setTimeout(r, 300));
    const pref = await request(app).get('/api/preferences/weights').set('Authorization', `Bearer ${access}`);
    const eggplant = pref.body.weights.find((w: { key_ref: string }) => w.key_ref === '가지');
    expect(eggplant).toBeDefined();
    expect(eggplant.weight).toBeLessThan(0);
  });

  it('안전 회귀 — 학습/가중치와 무관하게 알레르기 차단 유지 (FR-005)', async () => {
    await request(app).put('/api/me/profile/health').set('Authorization', `Bearer ${access}`).send({ allergies: ['땅콩'], diseases: [], goal: 'maintain' });
    const rec = await request(app).post('/api/recommendations').set('Authorization', `Bearer ${access}`);
    expect(rec.status).toBe(201);
    const names = rec.body.recipes.flatMap((r: { ingredients: { name: string }[] }) => r.ingredients.map((i) => i.name));
    expect(names.some((n: string) => n.includes('땅콩'))).toBe(false);
  });
});
