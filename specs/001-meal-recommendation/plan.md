# Implementation Plan: AI 기반 1인 가구 맞춤형 식단 추천 서비스

**Feature**: `001-meal-recommendation`
**Spec**: [spec.md](./spec.md)
**Intent**: [Intent-Plan.md](./Intent-Plan.md)
**Created**: 2026-05-15
**Status**: Draft (Phase 0~1 완료, Phase 2 task generation은 `/speckit.tasks` 단계로 위임)

---

## 1. Technical Context

### 1.1 Tech Stack (Intent-Plan.md 기반 확정)

| 레이어 | 선택 | 버전 |
|---|---|---|
| Frontend Framework | Vue.js | 3.4+ (Composition API) |
| Frontend Lang | TypeScript | 5.x |
| Build Tool | Vite | 5.x |
| State Mgmt | Pinia | 2.x |
| Router | Vue Router | 4.x |
| HTTP Client | Axios | 1.x |
| Charts (영양 시각화) | Chart.js + vue-chartjs | 4.x / 5.x |
| Backend Runtime | Node.js | 20 LTS |
| Backend Framework | Express.js | 4.x |
| Backend Lang | TypeScript | 5.x |
| DB Driver | mysql2 (Promise) | 3.x |
| Database | MariaDB (MySQL 호환) | 10.6+ |
| Container | Docker | latest |
| Reverse Proxy | Nginx | 1.25+ |
| CI/CD | GitLab CI/CD | - |

### 1.2 미명시 항목 결정 (Phase 0에서 확정 — 상세는 research.md)

| 항목 | 결정 | 근거 |
|---|---|---|
| AI/LLM 제공자 | OpenAI-호환 SDK (1차: OpenAI GPT-4o-mini, 어댑터로 교체 가능) | 비용/품질 균형, 한국어 지원 양호 |
| 인증 방식 | 이메일+비밀번호 + JWT(Access 15m / Refresh 7d, httpOnly cookie) | MVP 단순성, 보안 모범 |
| 비밀번호 해시 | bcrypt (cost 12) | 표준, Node.js 생태계 안정 |
| 입력 검증 | zod | TS 친화, 런타임 + 컴파일타임 |
| ORM/Query | 원시 SQL + mysql2 (필요 시 Kysely 도입 검토) | Intent-Plan 명시: "SQL 쿼리 기반" |
| 마이그레이션 | `node-pg-migrate` 대안 — `umzug` + 순수 SQL 파일 | 가벼움, GitLab CI 친화 |
| 백엔드 테스트 | Vitest + supertest | 빠름, Vite 생태계와 통일 |
| 프론트 테스트 | Vitest + @testing-library/vue + Playwright(E2E) | 표준 |
| 로깅 | pino (JSON) | 성능/표준 |
| 보안 헤더 | helmet | 표준 |
| CORS | 환경별 화이트리스트 | 보안 |
| Rate Limit | express-rate-limit (LLM 호출 endpoint 강화) | 비용 보호 |
| 환경변수 관리 | dotenv + 검증(zod) | 표준 |
| 공공 영양 DB | 식약처 식품영양성분 DB CSV → 로컬 테이블 ingest | 외부 API 의존도↓ |
| 캐싱 (1차) | DB 내 결과 캐시 테이블 (Redis는 후속) | MVP 단순성 |
| 컨테이너 구성 | frontend / backend / nginx 3 컨테이너, mariadb는 외부 호스트 사용 (Intent-Plan의 mis.iptime.org) | Intent 명세 준수 |

### 1.3 외부 의존성

- **MariaDB** — 외부 호스트 `mis.iptime.org:13306` (DB명/계정은 `.env`로 주입; 본 문서에는 비밀값 미포함)
- **LLM API** — OpenAI(또는 호환) endpoint, API key는 `.env`로 주입
- **공공 영양 DB** — 식약처/농림부 공개 데이터셋(CSV)을 빌드 시점에 시드

### 1.4 비기능 요구 (Spec §3.8 → 구현 목표치)

- P95 첫 추천 응답 ≤ 30s (LLM 호출 24s + 영양검증 1s + 네트워크 5s 마진)
- 월 가용성 ≥ 99% (영업시간 기준)
- 민감정보 저장 시 컬럼 단위 암호화(AES-256-GCM) — 알레르기·질병이력 등
- 감사 로그 보존 1년 이상

---

## 2. Constitution Check

> 본 프로젝트에는 별도 `.specify/memory/constitution.md`가 없으므로, 일반 소프트웨어 개발 모범 원칙과 본 spec의 정책 섹션(§3.7 개인정보, §9 리스크 매핑)을 준헌법적 가드레일로 적용한다.

| 원칙 | 적용 방식 | 평가 |
|---|---|---|
| **Spec-first** | spec.md의 FR-001~029가 본 plan의 모든 모듈 설계와 1:1 추적 가능 | PASS |
| **Test-first 가능성** | 모든 도메인 모듈은 단위 테스트 가능한 인터페이스(서비스 계층 분리)로 설계 | PASS |
| **Security by default** | 비밀번호 해시, JWT httpOnly, helmet, CORS, rate limit, 민감 컬럼 암호화 명시 | PASS |
| **Least privilege data** | 회원 가입 시 최소 필수 필드만 강제, 건강 데이터는 선택형 + 분리 동의 | PASS |
| **Observability** | 구조화 로그(pino) + 감사 로그 테이블 + 외부 의존성(LLM/DB) 상태 헬스 endpoint | PASS |
| **Vendor lock-in 최소화** | LLM은 어댑터 인터페이스 뒤에 격리, DB는 표준 SQL 우선 | PASS |
| **Cost guardrails** | LLM 호출 rate limit + 결과 캐시(동일 사용자 동일 인벤토리 N분 캐시) | PASS |

→ **Gate 결과: 통과**. 위반 없음.

---

## 3. Project Structure

```
mis2601/
├── frontend/                 # Vue 3 + Vite + TS
│   ├── public/
│   ├── src/
│   │   ├── api/              # axios 클라이언트 + 엔드포인트별 모듈
│   │   ├── assets/
│   │   ├── components/       # 재사용 UI 컴포넌트
│   │   ├── composables/      # Composition API 훅
│   │   ├── layouts/
│   │   ├── pages/            # 라우트 단위 페이지
│   │   │   ├── auth/         # 로그인/회원가입
│   │   │   ├── onboarding/   # 프로필 입력
│   │   │   ├── dashboard/
│   │   │   ├── inventory/    # 식재료 입력/관리
│   │   │   ├── recommendation/ # 추천 결과, 영양 차트
│   │   │   ├── feedback/
│   │   │   ├── history/
│   │   │   └── settings/     # 개인정보/동의/내보내기/탈퇴
│   │   ├── router/
│   │   ├── stores/           # Pinia 스토어
│   │   ├── styles/
│   │   ├── types/            # 공통 타입(백엔드 contracts 미러)
│   │   ├── utils/
│   │   ├── App.vue
│   │   └── main.ts
│   ├── tests/
│   │   ├── unit/
│   │   └── e2e/              # Playwright
│   ├── Dockerfile
│   ├── nginx.conf            # 정적 서빙용
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/                  # Node + Express + TS
│   ├── src/
│   │   ├── config/           # env 로딩, zod 스키마
│   │   ├── db/
│   │   │   ├── pool.ts       # mysql2 pool
│   │   │   ├── migrations/   # *.sql 파일
│   │   │   └── seeds/        # 식약처 영양 DB 시드
│   │   ├── middleware/       # auth, errorHandler, requestId, audit
│   │   ├── modules/
│   │   │   ├── auth/         # 회원가입/로그인/JWT
│   │   │   ├── users/        # 프로필 (basic/health/diet)
│   │   │   ├── consent/      # 분리 동의 관리
│   │   │   ├── inventory/    # 식재료 입력/정규화
│   │   │   ├── recommendation/  # AI 추천 오케스트레이션
│   │   │   ├── nutrition/    # 영양 DB 조회/검증
│   │   │   ├── feedback/
│   │   │   ├── shopping/     # 장보기 리스트
│   │   │   ├── history/
│   │   │   └── privacy/      # export, 삭제
│   │   ├── adapters/
│   │   │   ├── llm/          # OpenAI / Claude / Mock 구현
│   │   │   └── nutrition/    # 공공 DB 어댑터
│   │   ├── domain/           # 순수 도메인 로직(테스트 용이)
│   │   │   ├── prompt/       # 프롬프트 빌더
│   │   │   ├── validator/    # 알레르기/금기 검증
│   │   │   └── nutrition/    # 영양 계산기
│   │   ├── routes/           # express 라우터 모음
│   │   ├── utils/            # logger, crypto, errors
│   │   ├── app.ts
│   │   └── server.ts
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/      # supertest
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── infra/
│   ├── docker-compose.yml    # 로컬 개발용
│   ├── docker-compose.prod.yml
│   ├── nginx/                # 리버스 프록시 설정
│   │   ├── nginx.conf
│   │   └── tls/              # 인증서 마운트 위치
│   └── gitlab-ci/
│       └── .gitlab-ci.yml
│
├── specs/
│   └── 001-meal-recommendation/   # 본 디렉터리
│       ├── spec.md
│       ├── plan.md                # ← 이 파일
│       ├── research.md
│       ├── data-model.md
│       ├── quickstart.md
│       ├── contracts/
│       │   └── openapi.yaml
│       └── checklists/
│           └── requirements.md
│
├── .env.example
├── .gitignore
├── README.md
└── CLAUDE.md                 # AI 에이전트 컨텍스트
```

---

## 4. High-Level Architecture

```
        ┌──────────────────────────────────────────────────┐
        │                  Browser (User)                  │
        └──────────────────────┬───────────────────────────┘
                               │ HTTPS
                       ┌───────▼────────┐
                       │     Nginx      │  TLS 종단 / 정적 자산 / /api 프록시
                       └─┬────────────┬─┘
                static    │            │ /api/*
            (Vue build)   │            │
                 ┌────────▼────┐ ┌─────▼─────────┐
                 │  Frontend   │ │   Backend     │
                 │  (Vue 3)    │ │ (Express/TS)  │
                 └─────────────┘ └─┬───┬───┬─────┘
                                   │   │   │
              ┌────────────────────┘   │   └─────────────────┐
              │                        │                     │
        ┌─────▼──────┐           ┌─────▼──────┐       ┌──────▼─────┐
        │  MariaDB   │           │ LLM Adapter│       │ Nutrition  │
        │ (외부 호스트)│          │  → OpenAI  │       │   DB (시드)│
        └────────────┘           └────────────┘       └────────────┘
```

### 4.1 추천 요청 시퀀스 (핵심 유스케이스)

```
User
  └─▶ POST /api/recommendations { ingredients_text }
        ├─ AuthMiddleware: JWT 검증
        ├─ InventoryModule: 텍스트 → IngredientItem[] 정규화
        ├─ RecommendationOrchestrator:
        │     1) ProfileLoader: User + BasicProfile + HealthProfile + DietPreference 로드
        │     2) PromptBuilder: 1인 가구 조건 + 프로필 + 인벤토리 → 시스템/유저 프롬프트
        │     3) LLMAdapter.complete(prompt) → Recipe JSON
        │     4) AllergyValidator: 알레르기/기피 항목 차단 (위반 시 재시도 1회)
        │     5) NutritionService: 식약처 DB로 칼로리/탄단지/식이섬유/Na 계산
        │     6) Persistence: RecommendationRequest + Recipe + MealPlan + NutritionAnalysis 저장
        │     7) ShoppingListService: 부족 영양소 → 식재료 매핑
        └─◀ 200 { recommendation_id, recipes[], nutrition{}, shopping_list[] }
```

### 4.2 데이터 흐름 정책

- **민감 컬럼 암호화**: `health_profiles.diseases`, `health_profiles.allergies`는 애플리케이션 레벨 AES-256-GCM 암호화
- **이용 동의 분리**: 가입 동의 ≠ 마케팅 ≠ 건강정보 처리 (`consent_records`로 분리 저장)
- **삭제권**: 사용자 삭제 시 `users.deleted_at`만 마킹 후 30일 grace, 이후 cron으로 hard-delete + audit log

---

## 5. Phase 0: Research

상세 내용은 [research.md](./research.md). 요약:

- LLM 어댑터 추상화 후 1차는 OpenAI Chat Completions
- 인증은 JWT + Refresh Cookie
- 공공 영양 DB는 빌드 시 CSV → 테이블 시드
- 마이그레이션은 SQL 파일 기반 (`umzug` 러너)
- 캐싱은 DB 테이블 1차, Redis는 후속

→ **모든 NEEDS CLARIFICATION 해소 완료** (해소되지 않은 비즈니스 결정은 spec.md §10 그대로 남기되, plan 단계에서는 합리적 기본값을 적용).

---

## 6. Phase 1: Design Artifacts

| 산출물 | 경로 | 설명 |
|---|---|---|
| 데이터 모델 | [data-model.md](./data-model.md) | 18개 테이블, FK, 인덱스, 암호화 정책 |
| API 계약 | [contracts/openapi.yaml](./contracts/openapi.yaml) | OpenAPI 3.0 — 25개 엔드포인트 |
| 시작 가이드 | [quickstart.md](./quickstart.md) | 로컬 개발/실행 절차 |
| Agent 컨텍스트 | [/Users/pioneer14/mis2601/CLAUDE.md](../../CLAUDE.md) | AI 코딩 에이전트용 요약 |

---

## 7. Constitution Check (Post-Design)

설계 산출물 작성 후 재평가:

| 항목 | 결과 |
|---|---|
| spec.md FR ↔ data-model 추적성 | 모든 FR이 1개 이상의 테이블/제약과 연결 |
| spec.md FR ↔ API 계약 추적성 | 모든 FR이 1개 이상의 endpoint로 표현 |
| 외부 의존성 격리 | LLM/공공DB 모두 `adapters/` 하위로 격리 |
| 비용 가드 | 추천 endpoint에 rate limit + 캐시 키 정의 |
| 비밀값 노출 | DB 자격증명/LLM 키 모두 `.env`로 주입, 본 문서에는 미포함 |

→ **Post-Design Gate: 통과**

---

## 8. Risks & Mitigations (구현 관점)

| 위험 | 영향 | 완화 |
|---|---|---|
| LLM 응답 지연/실패 | 사용자 이탈 | timeout 25s + 1회 재시도 + 폴백 캐시 |
| LLM 비용 폭증 | 운영비 | 사용자별 일일 quota + 동일 입력 캐시 |
| MariaDB 외부 호스트 단일 장애점 | 서비스 중단 | 헬스체크 + 사용자 친화적 503 메시지 + 백오프 |
| 식약처 DB 라이선스 변경 | 영양검증 정확도 | 어댑터 분리 + 정기 갱신 스크립트 |
| 개인정보 유출 | 법적/평판 | 컬럼 암호화 + 감사 로그 + 최소 수집 + 분리 동의 |
| 알레르기 노출 누락 | 사용자 건강 위해 | 결정적 검증 단계(LLM 외부) + 위반 시 재생성 + E2E 테스트 회귀 |

---

## 9. Next Step

`/speckit.tasks` — 본 plan을 입력으로 의존성 기반 작업 목록(`tasks.md`) 생성.

