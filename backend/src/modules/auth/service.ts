import { randomUUID } from 'node:crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../../db/pool.js';
import { AppError } from '../../middleware/errorHandler.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt.js';
import type { RegisterInput, LoginInput } from './schema.js';

export interface AuthUser {
  id: number;
  email: string;
  displayName: string | null;
}

export interface AuthResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string;
  display_name: string | null;
  status: 'active' | 'suspended' | 'withdrawn';
  deleted_at: Date | null;
}

function ipBuf(ip: string | undefined): Buffer | null {
  return ip ? Buffer.from(ip.slice(0, 45)) : null;
}

export async function register(input: RegisterInput, ip?: string): Promise<AuthResult> {
  // FR-024: terms + privacy 동의 필수
  const required = new Set<'terms' | 'privacy'>(['terms', 'privacy']);
  const granted = new Set(input.consents.filter((c) => c.granted).map((c) => c.type));
  for (const r of required) {
    if (!granted.has(r)) {
      throw new AppError('CONSENT_REQUIRED', `Required consent missing: ${r}`, 400);
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query<UserRow[]>('SELECT id FROM users WHERE email = ?', [input.email]);
    if (existing.length > 0) {
      throw new AppError('EMAIL_TAKEN', 'Email already in use', 409);
    }

    const hash = await hashPassword(input.password);
    const [r] = await conn.query<ResultSetHeader>(
      'INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)',
      [input.email, hash, input.displayName ?? null],
    );
    const userId = r.insertId;

    for (const c of input.consents) {
      await conn.query(
        'INSERT INTO consent_records (user_id, consent_type, granted, evidence_ip) VALUES (?, ?, ?, ?)',
        [userId, c.type, c.granted, ipBuf(ip)],
      );
    }

    await conn.commit();

    const user: AuthUser = { id: userId, email: input.email, displayName: input.displayName ?? null };
    return issueTokens(user);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const [rows] = await pool.query<UserRow[]>(
    'SELECT id, email, password_hash, display_name, status, deleted_at FROM users WHERE email = ? LIMIT 1',
    [input.email],
  );
  const u = rows[0];
  if (!u || u.status !== 'active' || u.deleted_at) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }
  const ok = await verifyPassword(input.password, u.password_hash);
  if (!ok) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }
  return issueTokens({ id: u.id, email: u.email, displayName: u.display_name });
}

export async function refresh(refreshToken: string): Promise<AuthResult> {
  // MVP: JWT 서명 검증 + 사용자 active 확인.
  // TODO(보안): jti 기반 denylist 도입 (logout/탈취 시 즉시 무효화).
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('INVALID_REFRESH', 'Invalid or expired refresh token', 401);
  }

  const [rows] = await pool.query<UserRow[]>(
    'SELECT id, email, password_hash, display_name, status, deleted_at FROM users WHERE id = ? LIMIT 1',
    [Number(payload.sub)],
  );
  const u = rows[0];
  if (!u || u.status !== 'active' || u.deleted_at) {
    throw new AppError('INVALID_REFRESH', 'User no longer active', 401);
  }
  return issueTokens({ id: u.id, email: u.email, displayName: u.display_name });
}

export async function logout(_userId: number): Promise<void> {
  // MVP: refresh 쿠키 삭제는 controller 측에서. 서버 측 denylist는 추후.
  return;
}

function issueTokens(user: AuthUser): AuthResult {
  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id, randomUUID());
  return { user, accessToken, refreshToken };
}
