# mis2601 — AI 1인 가구 맞춤형 식단 추천

> 1인 가구의 식재료 낭비와 불규칙한 식습관을 데이터로 푸는 서비스.
> 회원가입 → 프로필 → 보유 식재료 → 30초 안에 알레르기 안전 + 영양 분석된 1식 추천.

- **공개 도메인**: `https://p14.sumzip.com` (Nginx TLS 종단)
- **Frontend dev**: `:9514`  ·  **Backend dev**: `:9534`
- **명세 / 설계**: [`specs/001-meal-recommendation/`](./specs/001-meal-recommendation/)

## 빠른 시작

```bash
# 1) 의존성
cd backend && npm install && cd ../frontend && npm install && cd ..

# 2) env (backend/.env)
cp .env.example backend/.env
# DB_*, JWT_*, APP_ENCRYPTION_KEY 채우기
#   - APP_ENCRYPTION_KEY: openssl rand -base64 32
#   - JWT_*_SECRET:      openssl rand -hex 32

# 3) DB 준비
cd backend
npm run migrate
npm run seed:masters
# (선택) data/foods.csv 준비 후
# npm run seed:foods

# 4) dev 서버
npm run dev          # backend :9534
cd ../frontend && npm run dev   # frontend :9514

# 5) 브라우저
open http://localhost:9514
```

> Mock LLM (기본). 실제 OpenAI 호출을 원하면 `backend/.env` 에서
> `LLM_PROVIDER=openai` + `LLM_API_KEY=sk-…` 설정.

## 디렉터리 구조

```
backend/             Node + Express + TypeScript
  src/
    config/          env 검증 (zod)
    db/              mysql2 pool, SQL migrations, seeds
    middleware/      auth/security/audit/requestId/errorHandler/rate-limit
    modules/         도메인별 (auth, users, consent, inventory, recommendation,
                              feedback, history, shopping, privacy)
    adapters/        llm/ (openai|mock), nutrition/foodLookup
    domain/          순수 도메인 (prompt builder, allergy validator,
                                  nutrition calculator, inventory normalizer,
                                  preferenceHints)
    routes/          /health
    observability/   /metrics (Prometheus text)
    security/        auditChecklist.md
  scripts/           openapi → TS 타입 생성
  tests/             unit (Vitest), integration (supertest)

frontend/            Vue 3 + Vite + TypeScript
  src/
    api/             axios 클라이언트 (자동 refresh)
    components/      ui/, recommendation/, shopping/, inventory/, feedback/
    layouts/         AppLayout (다크 캔버스)
    pages/           auth/, onboarding/, dashboard/, inventory/,
                     recommendation/, history/, settings/
    router/          가드 + 라우트
    stores/          Pinia (auth, recommendation)
    styles/          BMW M-derived tokens.css
  tests/e2e/         Playwright

infra/
  docker-compose.yml         로컬 dev (FE 9514 / BE 9534 / Nginx 80,443)
  nginx/nginx.conf           p14.sumzip.com TLS + /api → backend
  gitlab-ci/.gitlab-ci.yml   lint / test / build / docker / deploy

specs/001-meal-recommendation/   현재 작업 중인 feature
  spec.md plan.md tasks.md research.md data-model.md
  contracts/openapi.yaml  quickstart.md  checklists/
```

## 기술 스택 요약

| 레이어 | 기술 |
|---|---|
| Frontend | Vue 3.4 (Composition API) · Vite 5 · Pinia 2 · Vue Router 4 · Axios · Chart.js |
| Backend  | Node 20 LTS · Express 4 · TypeScript 5 · mysql2 · zod · pino · helmet · express-rate-limit · umzug · bcrypt · jsonwebtoken |
| DB       | MariaDB 10.6+ (utf8mb4 InnoDB, 외부 호스트 `mis.iptime.org:13306`) |
| AI       | 어댑터 패턴 — OpenAI GPT-4o-mini (1차) / Mock (테스트) |
| Auth     | 이메일+비밀번호 · JWT (Access 15m / Refresh 7d httpOnly cookie) · bcrypt cost 12 |
| Crypto   | 민감 컬럼 AES-256-GCM (`health_profiles.allergies/diseases`) |
| Test     | Vitest + supertest (backend) · Vitest + Vue Testing Library + Playwright (frontend) |
| Infra    | Docker · Nginx · GitLab CI/CD |

## 핵심 규칙

1. **SQL 직접 작성** — ORM 없음. mysql2 + Promise.
2. **민감 컬럼은 앱 레벨 AES-256-GCM 암호화** (allergies, diseases).
3. **LLM은 어댑터 인터페이스 뒤에서만 호출** — 직접 SDK 호출 금지.
4. **알레르기/기피 검증은 결정적 코드로 LLM 외부에서 수행** (FR-015).
5. **비밀값은 `.env`에만** — 저장소에 커밋 금지. `.env.example`만 커밋.
6. **rate limit**: `/api/recommendations`는 사용자당 5/hour, 20/day.
7. **추천 응답 P95 ≤ 30s** (LLM timeout 25s + 1회 재시도).
8. **응답에 "의학적 진단/처방 아님" 면책 포함** (FR-017).

## 테스트

```bash
# 백엔드 단위 (Vitest)
cd backend && npm test

# 백엔드 통합 — DB + .env 필요 (없으면 자동 skip)
cd backend && npm run test:integration

# 프론트엔드 E2E (Playwright) — backend + frontend 기동 필요
cd frontend && npm run e2e

# 성능 — P95 30s 측정 (Mock LLM)
cd frontend && npx playwright test tests/e2e/perf.spec.ts
```

## 운영 / 보안

- 보안 라우트별 매트릭스: [`backend/src/security/auditChecklist.md`](./backend/src/security/auditChecklist.md)
- 30일 grace hard-delete cron: `npm run cron:hard-delete` (운영에서는 일 1회 OS cron)
- 메트릭: `GET /metrics` (Prometheus text)
- 헬스체크: `GET /health/live`, `GET /health/ready`

## 디자인 시스템

- 가이드: [`frontend/DESIGN.md`](./frontend/DESIGN.md) (BMW M-inspired, dark canvas)
- 토큰: `frontend/src/styles/tokens.css` — radius 0 / UPPERCASE 1.5px 트래킹 / heavy(700) + light(300) 페어
- 기초 UI: `frontend/src/components/ui/` (AppButton, AppInput, AppCard, AppBadge, AppToast, EmptyState)
- 시각화: Chart.js — `frontend/src/components/recommendation/NutritionChart.vue`

## 명세 추적성

각 커밋/PR은 spec FR 번호(예: `FR-010`) 또는 SC 번호를 참조하세요. 작업 현황은 [`specs/001-meal-recommendation/tasks.md`](./specs/001-meal-recommendation/tasks.md) 에서 `[X]` 체크 상태로 추적됩니다.

## 라이선스 / 출처

- 식약처 식품영양성분 DB — `seeds/seed-foods.ts` 시드 시 `source` 컬럼에 출처 명시.
- BMW M 디자인 시스템은 외부 브랜드 — 토큰 가이드는 색·여백·타이포 비례 학습 참조용이며, 운영 시 자체 브랜드로 치환 권장.
