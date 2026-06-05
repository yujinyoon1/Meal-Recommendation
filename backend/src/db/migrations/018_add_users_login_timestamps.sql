-- 로그인 시각 추적: last_login_at(이번 로그인), previous_login_at(직전 로그인 — "지난 접속" 표시용)
ALTER TABLE users
  ADD COLUMN last_login_at     DATETIME NULL DEFAULT NULL AFTER updated_at,
  ADD COLUMN previous_login_at DATETIME NULL DEFAULT NULL AFTER last_login_at;
