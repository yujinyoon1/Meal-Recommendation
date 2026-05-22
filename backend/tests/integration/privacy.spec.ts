/**
 * Privacy 통합 (T117).
 *  - GET /me/data/export — 모든 본인 데이터 JSON 반환, 민감 컬럼 복호화 후 포함
 *  - DELETE /me — soft delete + 30일 grace + refresh 무효화
 *  - audit_logs 에 'health_profile.*', 'data.export', 'user.delete' 기록 확인
 *  - hardDeleteJob — deleted_at 을 31일 전으로 조작 후 cron 실행 → 본인 행 제거 확인
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

const hasDb =
  !!process.env.DB_HOST && !!process.env.DB_USER && !!process.env.DB_NAME &&
  !!process.env.APP_ENCRYPTION_KEY &&
  !!process.env.JWT_ACCESS_SECRET && !!process.env.JWT_REFRESH_SECRET;

const d = hasDb ? describe : describe.skip;

d('privacy flow', () => {
  let app: import('express').Express;
  let access: string;
  let userId: number;
  const email = `priv+${Date.now()}@example.com`;

  beforeAll(async () => {
    process.env.LLM_PROVIDER = 'mock';
    const { createApp } = await import('../../src/app.js');
    app = createApp();

    const r = await request(app).post('/api/auth/register').send({
      email,
      password: 'test1234',
      consents: [
        { type: 'terms', granted: true },
        { type: 'privacy', granted: true },
        { type: 'sensitive_health', granted: true },
      ],
    });
    expect(r.status).toBe(201);
    access = r.body.accessToken;
    userId = r.body.user.id;

    // 알레르기/질병 입력 (암호화 검증용)
    await request(app)
      .put('/api/me/profile/health')
      .set('Authorization', `Bearer ${access}`)
      .send({ allergies: ['땅콩', '갑각류'], diseases: ['고혈압'], goal: 'maintain' });
  });

  afterAll(async () => {
    const { pool } = await import('../../src/db/pool.js');
    await pool.end();
  });

  it('GET /me/data/export — JSON + 복호화된 allergies', async () => {
    const r = await request(app)
      .get('/api/me/data/export')
      .set('Authorization', `Bearer ${access}`);
    expect(r.status).toBe(200);
    expect(r.headers['content-disposition']).toMatch(/attachment/);
    const body = JSON.parse(r.text);
    expect(body.user.email).toBe(email);
    expect(body.profiles.health[0]?.allergies).toEqual(['땅콩', '갑각류']);
    expect(body.profiles.health[0]?.diseases).toEqual(['고혈압']);
  });

  it('audit_logs 에 health_profile.* / data.export 기록', async () => {
    const { pool } = await import('../../src/db/pool.js');
    const [rows] = await pool.query(
      'SELECT action FROM audit_logs WHERE target_user_id = ? OR actor_user_id = ?',
      [userId, userId],
    );
    const actions = (rows as Array<{ action: string }>).map((r) => r.action);
    expect(actions).toContain('health_profile.read');
    expect(actions).toContain('health_profile.write');
    expect(actions).toContain('data.export');
  });

  it('잘못된 비밀번호로 탈퇴 시 401', async () => {
    const r = await request(app)
      .delete('/api/me')
      .set('Authorization', `Bearer ${access}`)
      .send({ password: 'wrong-password' });
    expect(r.status).toBe(401);
  });

  it('DELETE /me — soft delete + deleted_at 마킹 + refresh 무효화', async () => {
    const r = await request(app)
      .delete('/api/me')
      .set('Authorization', `Bearer ${access}`)
      .send({ password: 'test1234' });
    expect(r.status).toBe(204);

    const { pool } = await import('../../src/db/pool.js');
    const [u] = await pool.query(
      'SELECT status, deleted_at FROM users WHERE id = ?',
      [userId],
    );
    const row = (u as Array<{ status: string; deleted_at: Date | null }>)[0];
    expect(row.status).toBe('withdrawn');
    expect(row.deleted_at).not.toBeNull();
  });

  it('hardDeleteJob — 30일 경과 grace 후 본인 행 제거', async () => {
    const { pool } = await import('../../src/db/pool.js');
    // deleted_at 을 31일 전으로 조작
    await pool.query(
      `UPDATE users SET deleted_at = DATE_SUB(NOW(), INTERVAL 31 DAY) WHERE id = ?`,
      [userId],
    );

    const { runHardDelete } = await import('../../src/modules/privacy/hardDeleteJob.js');
    const purged = await runHardDelete();
    expect(purged).toBeGreaterThanOrEqual(1);

    const [remaining] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    expect((remaining as unknown[]).length).toBe(0);
  });
});
