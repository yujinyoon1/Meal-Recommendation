import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env.js';
import { RegisterRequest, LoginRequest } from './schema.js';
import * as service from './service.js';

const REFRESH_COOKIE = 'mis_refresh';

function setRefreshCookie(res: Response, token: string, remember = true) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    // 자동 로그인: 영속 쿠키(7일). 해제 시 세션 쿠키(브라우저 종료 시 삭제).
    ...(remember ? { maxAge: 7 * 24 * 60 * 60 * 1000 } : {}),
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
}

export async function postRegister(req: Request, res: Response, next: NextFunction) {
  try {
    const input = RegisterRequest.parse(req.body);
    const out = await service.register(input, req.ip);
    setRefreshCookie(res, out.refreshToken, out.remember);
    res.status(201).json({ user: out.user, accessToken: out.accessToken });
  } catch (e) {
    next(e);
  }
}

export async function postLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const input = LoginRequest.parse(req.body);
    const out = await service.login(input);
    setRefreshCookie(res, out.refreshToken, out.remember);
    res.json({ user: out.user, accessToken: out.accessToken });
  } catch (e) {
    next(e);
  }
}

export async function postRefresh(req: Request, res: Response, next: NextFunction) {
  try {
    const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    if (!token) return res.status(401).json({ code: 'NO_REFRESH', message: 'No refresh cookie' });
    const out = await service.refresh(token);
    setRefreshCookie(res, out.refreshToken, out.remember);
    res.json({ user: out.user, accessToken: out.accessToken });
  } catch (e) {
    next(e);
  }
}

export async function postLogout(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user) await service.logout(req.user.id);
    clearRefreshCookie(res);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}
