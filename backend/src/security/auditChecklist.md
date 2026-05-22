# Audit Checklist — 라우트별 보안 매트릭스

> 본 문서는 운영 점검 및 보안 리뷰 시 사용. 코드 변경과 함께 갱신해야 한다.
> 마지막 갱신: 2026-05-22 (Phase 7)

## 범례

| 표기 | 의미 |
|---|---|
| ✅ | 적용됨 |
| ⚠️ | 부분 적용 (TODO 명시) |
| ❌ | 미적용 (의도적 또는 추후) |
| n/a | 해당 없음 |

## 글로벌

| 항목 | 상태 | 비고 |
|---|---|---|
| `helmet` 보안 헤더 | ✅ | `middleware/security.ts` |
| CORS 화이트리스트 | ✅ | `env.CORS_ORIGIN` — `http://localhost:9514`, `https://p14.sumzip.com` |
| `express-rate-limit` 글로벌 60/min/IP | ✅ | |
| `x-powered-by` 제거 | ✅ | |
| `trust proxy = 1` (Nginx 뒤) | ✅ | |
| 요청 ID 주입 / 응답 헤더 | ✅ | `middleware/requestId.ts` |
| pino 구조화 로그 | ✅ | `utils/logger.ts` |
| Body JSON limit 256KB | ✅ | DOS 완화 |

## TLS / 도메인

| 항목 | 상태 | 비고 |
|---|---|---|
| HTTPS-only 프로덕션 (HSTS) | ✅ | `infra/nginx/nginx.conf` |
| HTTP→HTTPS 리다이렉트 | ✅ | |
| 인증서 마운트 경로 | ✅ | `infra/nginx/tls/` |

## 라우트별

| 라우트 | auth | rate-limit | audit | 검증 | 비고 |
|---|---|---|---|---|---|
| `POST /api/auth/register` | ❌ (public) | 20/15min/IP | n/a | zod | 분리 동의 트랜잭션 |
| `POST /api/auth/login` | ❌ (public) | 20/15min/IP | n/a | zod | 실패 시 401 |
| `POST /api/auth/refresh` | cookie | n/a | n/a | n/a | httpOnly cookie / TODO jti denylist |
| `POST /api/auth/logout` | 선택 | n/a | n/a | n/a | cookie clear |
| `GET/PUT /api/me/profile/basic` | ✅ | global | ❌ | zod | 비민감 |
| `GET/PUT /api/me/profile/health` | ✅ | global | ✅ `health_profile.read`/`.write` | zod | **AES-256-GCM** 컬럼 암호화 |
| `GET/PUT /api/me/profile/diet` | ✅ | global | ❌ | zod | |
| `GET/POST /api/me/consents` | ✅ | global | ❌ | zod | 변경 이력 보존 |
| `*  /api/inventory/items*` | ✅ | global | ❌ | zod | 본인 데이터 격리 |
| `POST /api/recommendations` | ✅ | **사용자당 5/h, 20/d** | ❌ | n/a | LLM 비용 가드 |
| `GET /api/recommendations/:id` | ✅ | global | ❌ | zod | 본인 확인 |
| `GET /api/recommendations` (목록) | ✅ | global | ❌ | zod | 커서 페이지네이션 |
| `GET /api/recommendations/:id/full` | ✅ | global | ❌ | zod | 본인 확인 + 피드백 포함 |
| `POST /api/recommendations/:id/feedback` | ✅ | global | ❌ | zod | 본인 확인 |
| `GET /api/recommendations/:id/shopping-list` | ✅ | global | ❌ | zod | 본인 확인 |
| `GET /api/me/data/export` | ✅ | global | ✅ `data.export` | n/a | 민감 컬럼 복호화 포함 |
| `DELETE /api/me` | ✅ | global | ✅ `user.delete` | zod | 비밀번호 재확인 |

## 민감 데이터 / 암호화

| 항목 | 상태 | 비고 |
|---|---|---|
| `health_profiles.allergies_enc` AES-256-GCM | ✅ | `utils/crypto.ts` (iv 12 / tag 16 / ct) |
| `health_profiles.diseases_enc`  AES-256-GCM | ✅ | 동일 |
| 마스터키 env (base64 32B) | ✅ | `APP_ENCRYPTION_KEY` |
| KEK/DEK 분리 | ❌ | MVP에서는 단일 마스터키 — 후속 KMS 도입 시 |
| 비밀번호 해시 | ✅ | bcrypt cost 12 |
| JWT 서명키 분리 | ✅ | Access/Refresh secret 분리 |
| 쿠키 플래그 | ✅ | `httpOnly`, `secure`(prod), `sameSite=lax` |

## 감사 로그

| 항목 | 상태 | 비고 |
|---|---|---|
| `health_profile.read` / `.write` | ✅ | |
| `data.export` | ✅ | |
| `user.delete` | ✅ | |
| `user.hard_delete` (cron 시스템 작업) | ✅ | actor NULL |
| IP 저장 (VARBINARY 16) | ✅ | |
| 1년 보존 정책 | ⚠️ | 보존 cron 미구현 — 추후 archive 테이블 |

## 외부 의존성

| 항목 | 상태 | 비고 |
|---|---|---|
| LLM 어댑터 격리 | ✅ | `adapters/llm/` 인터페이스 뒤 |
| LLM timeout 25s + 재시도 1회 | ✅ | |
| 결과 캐시 (SHA-256, 30분 TTL) | ✅ | `recommendation_cache` |
| DB pool 한도 | ✅ | `env.DB_POOL_LIMIT` |
| 헬스체크 (`/health/live`, `/health/ready`) | ✅ | DB ping + LLM mock 호출 |

## 후속 TODO

- [ ] Refresh JWT jti denylist (탈취 시 즉시 무효화)
- [ ] LLM 마스터키 KMS 위탁 (AWS KMS / Vault)
- [ ] audit_logs 1년 후 archive 파티셔닝
- [ ] CSP 헤더 세부 정책 (현재 helmet 기본)
- [ ] WAF / Fail2Ban (Nginx 단)
- [ ] 다중 인스턴스 환경에서 recommendation rate limit Redis 이전
