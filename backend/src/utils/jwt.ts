import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface AccessPayload extends JwtPayload {
  sub: string; // user id
  type: 'access';
}
export interface RefreshPayload extends JwtPayload {
  sub: string;
  type: 'refresh';
  jti: string; // refresh token id (revocation)
  remember?: boolean; // 자동 로그인(영속 쿠키) 여부
}

export function signAccessToken(userId: string | number): string {
  const opts: SignOptions = { expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'] };
  return jwt.sign({ sub: String(userId), type: 'access' }, env.JWT_ACCESS_SECRET, opts);
}

export function signRefreshToken(userId: string | number, jti: string, remember = true): string {
  const opts: SignOptions = { expiresIn: env.JWT_REFRESH_TTL as SignOptions['expiresIn'] };
  return jwt.sign(
    { sub: String(userId), type: 'refresh', jti, remember },
    env.JWT_REFRESH_SECRET,
    opts,
  );
}

export function verifyAccessToken(token: string): AccessPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
  if (payload.type !== 'access') throw new Error('not an access token');
  return payload;
}

export function verifyRefreshToken(token: string): RefreshPayload {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload;
  if (payload.type !== 'refresh') throw new Error('not a refresh token');
  return payload;
}
