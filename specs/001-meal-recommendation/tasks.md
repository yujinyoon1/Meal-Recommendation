# Tasks: AI 기반 1인 가구 맞춤형 식단 추천 서비스

**Feature**: `001-meal-recommendation`
**Inputs**: [spec.md](./spec.md), [plan.md](./plan.md), [data-model.md](./data-model.md), [contracts/openapi.yaml](./contracts/openapi.yaml), [research.md](./research.md), [quickstart.md](./quickstart.md), [Intent-Tasks.md](./Intent-Tasks.md)
**Created**: 2026-05-15

---

## 표기 규칙

- `[P]` — 다른 파일을 다루므로 **병렬 실행 가능**한 작업
- `[USx]` — 해당 사용자 스토리 라벨
- 모든 경로는 저장소 루트 기준
- 테스트 태스크는 spec/plan에서 명시한 안전·회귀 시나리오(allergy, 유통기한, 피드백 반영, 내보내기/탈퇴 등)만 선별 포함

## 사용자 스토리 우선순위 (spec.md 기반 도출)

| ID | 제목 | 우선순위 | 핵심 시나리오 |
|---|---|---|---|
| **US1** | 골든 패스 — 회원가입부터 첫 추천까지 (알레르기 안전 포함) | **P1 (MVP)** | AS-1, AS-2, AS-3 + EC-1·2·6·7 |
| **US2** | 피드백 & 이력 — 사용할수록 가까워지는 추천 | P2 | AS-4, AS-7 |
| **US3** | 장보기 리스트 & 유통기한 우선 활용 | P3 | AS-5, AS-6 + EC-3 |
| **US4** | 개인정보·동의·탈퇴 (컴플라이언스 최소세트) | P3 (법적 필수) | FR-023~026, EC-없음 |

각 스토리는 **독립적으로 데모 가능**하도록 페이즈별 체크포인트를 둔다.

---

## Phase 1 — Setup (공통 인프라)

> 모든 후속 페이즈가 의존. 빠르게 끝낼 것.

- **T001** [X] `frontend/`에 Vue 3 + Vite + TS 스캐폴드 생성 (`npm create vue@latest` 옵션: TS, Router, Pinia, Vitest, ESLint, Prettier). 산출: `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json`.
- **T002** [X] `backend/`에 Node + Express + TS 스캐폴드 생성. `package.json`(scripts: dev/build/start/migrate/seed/test), `tsconfig.json`(`target: ES2022, module: NodeNext, strict: true`), `src/server.ts`/`src/app.ts` 골격, nodemon + ts-node-dev.
- **T003** [X] `[P]` `.gitignore` 작성 (`node_modules`, `dist`, `.env`, `coverage`, `playwright-report`).
- **T004** [X] `[P]` `.env.example` 작성 — plan.md/quickstart.md §2.1·2.2의 키 전체 포함, 실제 값은 미포함.
- **T005** [X] `[P]` `frontend/.eslintrc.cjs` + `frontend/.prettierrc` / `backend/.eslintrc.cjs` + `backend/.prettierrc` 통일 설정.
- **T006** [X] `[P]` `infra/docker-compose.yml`(개발용) 작성 — `backend`, `frontend`, `nginx` 3개 서비스, MariaDB는 외부 호스트 기본 + `local-db` 프로파일.
- **T007** [X] `[P]` `infra/nginx/nginx.conf` — `/` 정적, `/api/` 백엔드 프록시, gzip, security headers, HTTP→HTTPS 리다이렉트(prod).
- **T008** [X] `[P]` `infra/gitlab-ci/.gitlab-ci.yml` — `lint`, `test`, `build`, `docker`, `deploy` 5 스테이지 골격.
- **T009** [X] `[P]` `backend/scripts/gen-types-from-openapi.ts` — `specs/.../openapi.yaml`을 `frontend/src/types/api.ts` + `backend/src/types/api.ts`로 생성하는 파이프라인(`openapi-typescript` 사용).

**Checkpoint**: `npm run dev` 양쪽 정상 기동, `frontend`가 `http://localhost:5173`, `backend`가 `:3000`에서 `200 OK`를 응답.

---

## Phase 2 — Foundational (모든 스토리의 선행조건)

> US1~US4 어떤 것도 시작 불가. 이 페이즈가 완전히 끝나야 한다.

### 2.1 환경/공통 모듈
- **T010** [X] `backend/src/config/env.ts` — zod로 env 검증 + 타입화. 누락 시 부팅 실패.
- **T011** [X] `[P]` `backend/src/utils/logger.ts` — pino + `requestId` 자식 로거.
- **T012** [X] `[P]` `backend/src/middleware/requestId.ts` — `X-Request-Id` 입출력.
- **T013** [X] `[P]` `backend/src/middleware/errorHandler.ts` — 표준 에러 envelope(`{code,message,details}`) + 4xx/5xx 분기 + pino 로깅.
- **T014** [X] `[P]` `backend/src/utils/crypto.ts` — AES-256-GCM `encrypt/decrypt(json)` (마스터키는 env).
- **T015** [X] `[P]` `backend/src/utils/jwt.ts` — Access/Refresh 발급·검증 (15m/7d, 서명키 분리).
- **T016** [X] `[P]` `backend/src/utils/password.ts` — bcrypt cost 12 hash/verify.

### 2.2 DB
- **T017** [X] `backend/src/db/pool.ts` — mysql2 Promise 풀(`charset=utf8mb4`, `timezone=Z`, pool limit env).
- **T018** [X] `backend/src/db/migrate.ts` — umzug 기반 SQL 마이그레이션 러너(`up`, `down`, `status`).
- **T019** [X] `backend/src/db/migrations/001_create_users.sql` — data-model §3.1.
- **T020** [X] `[P]` `backend/src/db/migrations/002_create_basic_profiles.sql` — §3.2 (생성 컬럼 `bmi` 포함).
- **T021** [X] `[P]` `backend/src/db/migrations/003_create_health_profiles.sql` — §3.3 (`allergies_enc`, `diseases_enc` VARBINARY).
- **T022** [X] `[P]` `backend/src/db/migrations/004_create_diet_preferences.sql` — §3.4.
- **T023** [X] `[P]` `backend/src/db/migrations/005_create_consent_records.sql` — §3.5.
- **T024** [X] `[P]` `backend/src/db/migrations/006_create_foods.sql` — §3.7 (FULLTEXT 인덱스 포함).
- **T025** [X] `[P]` `backend/src/db/migrations/007_create_ingredient_alias.sql` — §3.8.
- **T026** [X] `[P]` `backend/src/db/migrations/008_create_allergy_disease_masters.sql` — §3.9 두 테이블.
- **T027** [X] `[P]` `backend/src/db/migrations/009_create_ingredient_items.sql` — §3.6.
- **T028** [X] `[P]` `backend/src/db/migrations/010_create_recommendation_requests.sql` — §3.10.
- **T029** [X] `[P]` `backend/src/db/migrations/011_create_recipes.sql` — §3.12.
- **T030** [X] `[P]` `backend/src/db/migrations/012_create_meal_plans_and_join.sql` — §3.11, §3.13.
- **T031** [X] `[P]` `backend/src/db/migrations/013_create_nutrition_analyses.sql` — §3.14.
- **T032** [X] `[P]` `backend/src/db/migrations/014_create_shopping_list_items.sql` — §3.15.
- **T033** [X] `[P]` `backend/src/db/migrations/015_create_feedbacks.sql` — §3.16.
- **T034** [X] `[P]` `backend/src/db/migrations/016_create_recommendation_cache.sql` — §3.17.
- **T035** [X] `[P]` `backend/src/db/migrations/017_create_audit_logs.sql` — §3.18.
- **T036** [X] `backend/src/db/seeds/seed-masters.ts` — `allergy_master`/`disease_master`/`ingredient_alias` 초기 데이터.
- **T037** [X] `backend/src/db/seeds/seed-foods.ts` — 식약처 CSV(`data/foods.csv`) → `foods` 일괄 입력 (배치 1k, ON DUPLICATE KEY UPDATE).
- **T038** [X] `backend/src/db/seeds/README.md` — CSV 다운로드 경로, 라이선스, 시드 주기 명시.

### 2.3 보안·운영 미들웨어
- **T039** [X] `[P]` `backend/src/middleware/security.ts` — helmet, CORS 화이트리스트, `express-rate-limit` 글로벌 60/min.
- **T040** [X] `[P]` `backend/src/middleware/auth.ts` — Bearer JWT 검증, `req.user` 주입.
- **T041** [X] `[P]` `backend/src/middleware/audit.ts` — 민감 라우트 데코레이터(`audit('health_profile.read')`)로 `audit_logs` 자동 기록.
- **T042** [X] `[P]` `backend/src/routes/health.ts` — `/health/live`, `/health/ready` (DB ping + LLM mock 호출).

### 2.4 외부 어댑터
- **T043** [X] `backend/src/adapters/llm/types.ts` — `LlmAdapter` 인터페이스(`complete(messages, opts): Promise<LlmResult>`), 표준 에러 타입.
- **T044** [X] `[P]` `backend/src/adapters/llm/openai.ts` — OpenAI Chat Completions 구현, timeout 25s, retries 1.
- **T045** [X] `[P]` `backend/src/adapters/llm/mock.ts` — 결정적 mock(테스트용).
- **T046** [X] `backend/src/adapters/llm/index.ts` — `LLM_PROVIDER` 환경변수로 어댑터 팩토리.
- **T047** [X] `[P]` `backend/src/adapters/nutrition/foodLookup.ts` — `foods` + `ingredient_alias` 조회 + 동의어 매칭 + 매칭 신뢰도 산출.

### 2.5 도메인 순수 모듈 (테스트 용이)
- **T048** [X] `[P]` `backend/src/domain/prompt/builder.ts` — `buildRecommendationPrompt(profile, inventory, options)` (1인분/간편/30분 이내 등 plan §1.2·spec FR-011 반영, 버전 문자열 반환).
- **T049** [X] `[P]` `backend/src/domain/validator/allergy.ts` — `detectAllergyViolations(recipe, userAllergies, aliasMap)` 결정적 검증 (research §R-9).
- **T050** [X] `[P]` `backend/src/domain/nutrition/calculator.ts` — 재료 합산 → 총 칼로리/탄단지/식이섬유/Na + RDA 비율(목표 칼로리 기반).
- **T051** [X] `[P]` `backend/src/domain/inventory/normalizer.ts` — 자유 텍스트(콤마/줄바꿈) → `{rawText, normalized?, quantity?, unit?, expiresAt?}[]`.

### 2.6 프론트엔드 공통
- **T052** [X] `[P]` `frontend/src/api/client.ts` — axios 인스턴스, `Authorization` 자동 부여, 401 시 refresh 흐름.
- **T053** [X] `[P]` `frontend/src/stores/auth.ts` — Pinia: `user`, `accessToken`, `login/register/logout/refresh` 액션.
- **T054** [X] `[P]` `frontend/src/router/index.ts` — 라우트 + `beforeEach` 인증 가드.
- **T055** [X] `[P]` `frontend/src/layouts/AppLayout.vue` — 상단 헤더(로고/유저메뉴) + 사이드 메뉴 + `<router-view>`.
- **T056** [X] `[P]` `frontend/src/styles/tokens.css` — 컬러/타이포/스페이싱 토큰 (디자인 시스템 기초).
- **T057** [X] `[P]` `frontend/src/components/ui/AppButton.vue`, `AppInput.vue`, `AppCard.vue`, `AppBadge.vue`, `AppToast.vue` — 5종 기초 컴포넌트.

> 💡 프론트 컴포넌트 작업은 Intent-Tasks.md에서 안내한 `/frontend-design` 스킬 활용 권장.

**Checkpoint (Phase 2 완료)**: 마이그레이션 성공 + 시드 완료 + `/health/ready` 200 + 모든 어댑터/도메인 유닛 테스트 1건 이상 통과.

---

## Phase 3 — User Story 1 (P1, MVP) : 골든 패스 추천

**Goal**: 신규 사용자가 회원가입 → 프로필 입력 → 식재료 입력 → AI 추천 결과(알레르기 안전 + 영양 분석) 확인까지 한 번에 완료.

**Independent test criteria**:
1. 신규 사용자가 30초 안에 회원가입 + 프로필 + 식재료 입력을 마칠 수 있다.
2. "추천받기" 클릭 후 P95 30초 이내 1~3개 레시피와 영양 차트가 표시된다.
3. 알레르기에 등록된 식재료가 결과에 절대 노출되지 않는다 (검증 단계 자동 차단).
4. 응답에 "의학적 진단/처방 아님" 면책 문구가 포함된다.

### 3.1 백엔드 — Auth
- **T058** [X] [US1] `backend/src/modules/auth/schema.ts` — zod: `RegisterRequest`/`LoginRequest`/`ConsentSet`.
- **T059** [X] [US1] `backend/src/modules/auth/service.ts` — `register(input)`(이메일 유일성 + bcrypt + 동의 기록 동시 저장 트랜잭션), `login(input)`, `refresh(token)`, `logout(userId)`.
- **T060** [X] [US1] `backend/src/modules/auth/controller.ts` + `routes.ts` — `POST /auth/register`, `/login`, `/refresh`, `/logout` (OpenAPI 정의 준수).

### 3.2 백엔드 — Profiles & Consents
- **T061** [X] [US1] `[P]` `backend/src/modules/users/basicProfile.service.ts` + 라우터 — GET/PUT `/me/profile/basic`.
- **T062** [X] [US1] `[P]` `backend/src/modules/users/healthProfile.service.ts` + 라우터 — GET/PUT `/me/profile/health` (저장 시 `crypto.encrypt`, 읽기 시 `decrypt`, `audit` 미들웨어 적용).
- **T063** [X] [US1] `[P]` `backend/src/modules/users/dietPreference.service.ts` + 라우터 — GET/PUT `/me/profile/diet`.
- **T064** [X] [US1] `[P]` `backend/src/modules/consent/service.ts` + 라우터 — `GET /me/consents`, `POST /me/consents`.

### 3.3 백엔드 — Inventory
- **T065** [X] [US1] `backend/src/modules/inventory/service.ts` — `bulkCreateFromText(userId, text)`(`domain/inventory/normalizer` + `adapters/nutrition/foodLookup`), `list(userId, opts)`, `patch(itemId, dto)`, `delete(itemId)`.
- **T066** [X] [US1] `backend/src/modules/inventory/controller.ts` + `routes.ts` — `GET/POST /inventory/items`, `PATCH/DELETE /inventory/items/:id`.

### 3.4 백엔드 — Recommendation 오케스트레이터 (핵심)
- **T067** [X] [US1] `backend/src/modules/recommendation/orchestrator.ts` —
  1) 프로필/인벤토리 스냅샷 로드 → 2) `prompt/builder` → 3) `llm.complete` (timeout 25s) → 4) `validator/allergy` 검증 (위반 시 재시도 1회, 재위반 시 `status=rejected` 저장 + 안전 메시지) → 5) `nutrition/calculator` 계산 → 6) `recommendation_requests`/`recipes`/`meal_plans`/`nutrition_analyses` 트랜잭션 저장 → 7) `disclaimer` 포함 응답.
- **T068** [X] [US1] `backend/src/modules/recommendation/controller.ts` + `routes.ts` — `POST /recommendations`, `GET /recommendations/:id`.
- **T069** [X] [US1] `backend/src/modules/recommendation/cache.ts` — SHA-256 캐시 키, `recommendation_cache` lookup/insert(TTL 30분).
- **T070** [X] [US1] `backend/src/middleware/recommendationRateLimit.ts` — 사용자당 5/hour, 20/day (research §R-8).

### 3.5 프론트엔드 — 인증 & 온보딩
- **T071** [X] [US1] `[P]` `frontend/src/pages/auth/RegisterPage.vue` — 이메일/비밀번호/표시명 + 분리 동의 체크박스 4종(필수: terms/privacy, 선택: sensitive_health/marketing).
- **T072** [X] [US1] `[P]` `frontend/src/pages/auth/LoginPage.vue`.
- **T073** [X] [US1] `[P]` `frontend/src/pages/onboarding/Step1Basic.vue` — 나이/성별/키/체중 (BMI 실시간 미리보기).
- **T074** [X] [US1] `[P]` `frontend/src/pages/onboarding/Step2Health.vue` — 알레르기 칩 입력, 질병 이력 선택, 목표(감량/유지/증량), 목표 칼로리 추정 표시.
- **T075** [X] [US1] `[P]` `frontend/src/pages/onboarding/Step3Diet.vue` — 식사 횟수, 외식·배달 빈도, 기피/선호 카테고리, 조리 시간 상한.
- **T076** [X] [US1] `frontend/src/pages/onboarding/OnboardingWizard.vue` — 3-step 진행도/이전·다음/완료 시 대시보드 리다이렉트.

### 3.6 프론트엔드 — 인벤토리 & 추천
- **T077** [X] [US1] `[P]` `frontend/src/pages/inventory/InventoryInputPage.vue` — `<textarea>` 일괄 입력 + "추천받기" CTA + 정규화 미해결 항목 경고.
- **T078** [X] [US1] `[P]` `frontend/src/pages/inventory/InventoryListSection.vue` — 카드 목록, 유통기한 임박 배지, 삭제/소모 표시.
- **T079** [X] [US1] `frontend/src/stores/recommendation.ts` — Pinia: `request`, `current`, `loading`, `error`.
- **T080** [X] [US1] `frontend/src/pages/recommendation/ResultPage.vue` — 레시피 카드 1~3개 + 단계 펼치기 + 영양 도넛(`Chart.js`) + 면책 배너 + 경고(알레르기 차단 발생 시).
- **T081** [X] [US1] `[P]` `frontend/src/components/recommendation/NutritionChart.vue` — 탄단지 도넛 + RDA 비율 막대.
- **T082** [X] [US1] `[P]` `frontend/src/components/recommendation/RecipeCard.vue` — 이름/재료/대체재료/단계/예상시간.
- **T083** [X] [US1] `frontend/src/pages/dashboard/DashboardPage.vue` — 인벤토리 진입 + 최근 추천 1건 카드(이력 미구현 시 placeholder).

### 3.7 테스트 — US1 회귀 (필수)
- **T084** [X] [US1] `backend/tests/unit/domain/allergy.spec.ts` — 알레르기 검증 진리표(직접 매칭/동의어/혼합).
- **T085** [X] [US1] `[P]` `backend/tests/unit/domain/nutrition.spec.ts` — 합산 + RDA 비율 + 매칭 실패 신뢰도.
- **T086** [X] [US1] `[P]` `backend/tests/integration/recommendation.flow.spec.ts` — Mock LLM으로 골든 패스 + 알레르기 차단 + 재시도 1회 검증.
- **T087** [X] [US1] `frontend/tests/e2e/golden-path.spec.ts` (Playwright) — 회원가입 → 프로필 → 추천 결과까지 30초 이내 완료.
- **T088** [X] [US1] `frontend/tests/e2e/allergy-block.spec.ts` — 알레르기 등록 후 동일 재료 입력 시 결과에 미노출 확인.

**Checkpoint US1 (MVP 데모 가능)**: T087/T088 통과. 사용자 1명으로 회원가입~추천까지 데모 시연이 가능하다.

---

## Phase 4 — User Story 2 (P2) : 피드백 & 이력

**Goal**: 추천 결과에 별점/코멘트 피드백을 남기고, 과거 추천을 이력 화면에서 확인하며, 다음 추천에 반영된다.

**Independent test criteria**:
1. 추천 결과 화면에서 별점(1~5) + 코멘트 입력 후 저장된다.
2. 이력 화면이 과거 추천을 시간순으로 보여주고 별점/총 칼로리가 표시된다.
3. 부정 피드백 카테고리는 다음 추천 프롬프트의 "비선호" 힌트로 반영된다.

### 4.1 백엔드
- **T089** [X] [US2] `backend/src/modules/feedback/service.ts` + `controller.ts` — `POST /recommendations/:id/feedback`.
- **T090** [X] [US2] `[P]` `backend/src/modules/history/service.ts` + `controller.ts` — `GET /recommendations`(커서 기반 목록), `GET /recommendations/:id` 강화(피드백 포함).
- **T091** [X] [US2] `backend/src/domain/prompt/preferenceHints.ts` — 최근 30일 피드백 집계 → 비선호 카테고리/재료 추출 → prompt builder에 주입.
- **T092** [X] [US2] `backend/src/domain/prompt/builder.ts` 갱신 — `preferenceHints` 옵션 추가.

### 4.2 프론트엔드
- **T093** [X] [US2] `[P]` `frontend/src/components/feedback/FeedbackForm.vue` — 별점 + 코멘트 + 제출.
- **T094** [X] [US2] `[P]` `frontend/src/pages/history/HistoryListPage.vue` — 무한 스크롤, 별점/총 칼로리/요청 시간.
- **T095** [X] [US2] `[P]` `frontend/src/pages/history/HistoryDetailPage.vue` — 단일 추천 재현(레시피 + 영양 + 피드백).
- **T096** [X] [US2] `frontend/src/pages/recommendation/ResultPage.vue` 확장 — FeedbackForm 통합.

### 4.3 테스트
- **T097** [X] [US2] `backend/tests/integration/feedback.spec.ts` — 등록 + 이력 조회 + 다음 추천에서 비선호 카테고리 프롬프트에 포함되는지 검증.
- **T098** [X] [US2] `frontend/tests/e2e/feedback-loop.spec.ts` — 피드백 등록 후 재추천 시 동일 카테고리 노출 빈도가 감소함을 통계적으로 점검.

**Checkpoint US2**: T098 통과.

---

## Phase 5 — User Story 3 (P3) : 장보기 리스트 & 유통기한 우선

**Goal**: 추천 결과로부터 부족 영양소를 채울 장보기 리스트가 카테고리별로 제공되고, 인벤토리의 유통기한 임박 재료가 우선 활용된다.

**Independent test criteria**:
1. 추천 결과 페이지에 "장보기 리스트"가 표시되고 식재료가 카테고리(채소/단백질/유제품 등)별로 정리된다.
2. 인벤토리에 유통기한 D-2 재료가 있으면 추천 레시피의 재료 목록 상위에 포함된다.
3. 유통기한 지난 재료는 입력 시 자동 제외되고 경고가 표시된다.

### 5.1 백엔드
- **T099** [X] [X] [US3] `backend/src/modules/shopping/gapCalculator.ts` — `NutritionAnalysis.rdaRatio` < 임계 → 부족 영양소 → 후보 식재료(상위 N개) 산출.
- **T100** [X] [US3] `backend/src/modules/shopping/service.ts` + `controller.ts` — `GET /recommendations/:id/shopping-list`.
- **T101** [X] [US3] `backend/src/domain/prompt/builder.ts` 갱신 — 유통기한 임박 재료에 `priority: 'high'` 힌트 부여.
- **T102** [X] [US3] `[P]` `backend/src/modules/inventory/service.ts` 강화 — 만료된 재료 자동 제외 + 경고 메타데이터.

### 5.2 프론트엔드
- **T103** [X] [US3] `[P]` `frontend/src/components/shopping/ShoppingListPanel.vue` — 카테고리 그룹, 사유 툴팁, 복사·공유 버튼.
- **T104** [X] [US3] `[P]` `frontend/src/components/inventory/ExpiryBadge.vue` — D-day 배지, 만료 시 빨강.
- **T105** [X] [US3] `frontend/src/pages/recommendation/ResultPage.vue` 확장 — ShoppingListPanel 통합.

### 5.3 테스트
- **T106** [X] [US3] `backend/tests/unit/shopping/gapCalculator.spec.ts` — 결정적 시나리오(단백질/식이섬유 부족 케이스).
- **T107** [X] [US3] `frontend/tests/e2e/expiry-priority.spec.ts` — D-2 재료 입력 후 추천 결과의 재료 목록 1행이 해당 재료를 포함하는지 점검.

**Checkpoint US3**: T107 통과.

---

## Phase 6 — User Story 4 (P3, 법적 필수) : 개인정보·동의·탈퇴

**Goal**: 사용자가 동의 상태를 토글하고, 본인 데이터를 JSON으로 내려받고, 30일 grace로 탈퇴할 수 있다. 민감 라우트 접근은 감사 로그에 남는다.

**Independent test criteria**:
1. `GET /me/data/export` 호출 시 본인 모든 데이터가 JSON 1개 파일로 반환된다.
2. `DELETE /me` 호출 시 `users.status='withdrawn'`, `deleted_at` 설정, 30일 후 cron이 hard-delete를 수행한다.
3. 건강 프로필 GET/PUT 호출은 `audit_logs`에 기록된다.

### 6.1 백엔드
- **T108** [X] [US4] `backend/src/modules/privacy/exportService.ts` + 라우트 — `GET /me/data/export`(모든 본인 행을 직렬화, 민감 컬럼은 복호화 후 포함).
- **T109** [X] [US4] `[P]` `backend/src/modules/privacy/withdrawService.ts` + 라우트 — `DELETE /me`(soft delete + 모든 세션/리프레시 무효화).
- **T110** [X] [US4] `backend/src/modules/privacy/hardDeleteJob.ts` — 일 1회 cron: `deleted_at < NOW() - INTERVAL 30 DAY`인 사용자의 본인 데이터 hard delete + 감사 로그 기록.
- **T111** [X] [US4] `[P]` `backend/src/modules/consent/withdraw.ts` — 마케팅·민감정보 동의 철회 시 즉시 효력(예: 마케팅 이메일 중단 플래그).
- **T112** [X] [US4] T041 적용 확인 — 모든 `health_profile.*`, `data.export`, `user.delete` 라우트에 audit 미들웨어 부착.

### 6.2 프론트엔드
- **T113** [X] [US4] `[P]` `frontend/src/pages/settings/SettingsPage.vue` — 탭(동의 / 내 데이터 / 탈퇴).
- **T114** [X] [US4] `[P]` `frontend/src/pages/settings/ConsentsTab.vue` — 4종 동의 토글, 변경 시 즉시 호출.
- **T115** [X] [US4] `[P]` `frontend/src/pages/settings/DataExportTab.vue` — JSON 다운로드.
- **T116** [X] [US4] `[P]` `frontend/src/pages/settings/WithdrawTab.vue` — 비밀번호 재확인 모달 + 30일 grace 안내.

### 6.3 테스트
- **T117** [X] [US4] `backend/tests/integration/privacy.spec.ts` — export 형식 + withdraw 흐름 + audit log 기록 검증.
- **T118** [X] [US4] `frontend/tests/e2e/privacy-export-withdraw.spec.ts` — 설정에서 내보내기 다운로드 후 탈퇴 완료 흐름.

**Checkpoint US4**: T118 통과 + 컴플라이언스 매트릭스(FR-023~026 ↔ 테스트) 충족.

---

## Phase 7 — Polish & Cross-Cutting

> 사용자 가시 기능에 영향이 적은 보강. US 종료 후 일괄 처리.

- **T119** [X] `[P]` `backend/src/modules/recommendation/cache.ts` 활성화 — orchestrator 진입 직후 캐시 hit/miss 분기, hit 시 LLM 미호출.
- **T120** [X] `[P]` `backend/src/observability/metrics.ts` — LLM latency, DB latency, request rate 측정 + `/metrics`(Prometheus 텍스트) 노출(옵션).
- **T121** [X] `[P]` `backend/src/security/auditChecklist.md` — 라우트별 보안 체크리스트(쿠키 플래그, CORS, rate limit 적용 매트릭스).
- **T122** [X] `[P]` `frontend/src/components/ui/EmptyState.vue` + 빈 상태/에러 화면 일관성 정비.
- **T123** [X] `[P]` `frontend/src/styles/` 다크모드 토큰 추가(옵션).
- **T124** [X] `README.md` 최상위 작성 — 프로젝트 개요, 빠른 시작, 디렉터리, 명세 위치(`specs/001-meal-recommendation/`).
- **T125** [X] `frontend/tests/e2e/perf.spec.ts` — 추천 응답 P95 30초 충족 측정(샘플 N=20, Mock LLM).
- **T126** [X] GitLab CI 파이프라인 그린화 — lint + unit + integration + 빌드 단계가 모두 PASS인지 최종 확인.

---

## Dependencies (의존 순서)

```
Phase 1 (T001~T009)
   │
   ▼
Phase 2 Foundational (T010~T057)
   │  - 마이그레이션(T019~T035)은 T017/T018 이후
   │  - 시드(T036/T037)는 마이그레이션 이후
   │  - 어댑터/도메인 모듈은 환경 모듈 이후
   │
   ▼
Phase 3 US1 ─────────────────┐
(T058~T088)                  │ (독립 데모 가능)
   │                         │
   ├──▶ Phase 4 US2 (T089~T098)   ─── US1 산출물(피드백 라우트가 추천 ID 필요)에 의존
   │
   ├──▶ Phase 5 US3 (T099~T107)   ─── US1 산출물(추천/영양/인벤토리)에 의존
   │
   └──▶ Phase 6 US4 (T108~T118)   ─── Auth/Consent(US1) 산출물에 의존
                                       │
                                       ▼
                                   Phase 7 Polish (T119~T126)
```

- **US2/US3/US4는 서로 독립** — 셋이 동시에(다른 개발자에 의해) 진행 가능.
- **US1 완료 = MVP**. 데모/사용자 검증 시작 가능.

---

## Parallel Execution Examples

### Phase 2 마이그레이션 다발 (서로 다른 파일)
```
$ git worktree add ../wt-foundation main
$ # 동시 작업 가능: T019, T020, T021, T022, T023, T024, T025, T026, T027, T028, T029, T030, T031, T032, T033, T034, T035
```

### Phase 3 프론트엔드 페이지 병렬 (서로 다른 파일)
```
$ # T071 RegisterPage, T072 LoginPage, T073 Step1, T074 Step2, T075 Step3, T077 InventoryInput, T078 InventoryList, T081 NutritionChart, T082 RecipeCard
```

### Phase 3 백엔드 프로파일 모듈 병렬
```
$ # T061 basic, T062 health, T063 diet, T064 consent — 서로 다른 service/controller 파일
```

---

## Implementation Strategy

### MVP First (P1 only)
1. Phase 1 + Phase 2 완료 — 인프라/마이그레이션/어댑터 안정화.
2. Phase 3 US1 완료 — 회원가입~추천까지 데모.
3. **여기서 일단 사용자 검증**(SC-1, SC-2, SC-3 측정).

### Incremental Delivery
1. US1 출시 → 1주 운영 데이터 수집.
2. US2(피드백/이력) 추가 — SC-3(만족도) 데이터화 가능.
3. US3(장보기/유통기한) 추가 — SC-8(폐기율) 측정 시작.
4. US4(개인정보) 정식 출시 전 반드시 완료 (법적 필수).
5. Phase 7 Polish — 캐시·관측성·문서화.

---

## 작업 요약

| 항목 | 수 |
|---|---|
| 총 태스크 | **126** |
| Phase 1 Setup | 9 (T001~T009) |
| Phase 2 Foundational | 48 (T010~T057) |
| Phase 3 US1 (MVP) | 31 (T058~T088) |
| Phase 4 US2 | 10 (T089~T098) |
| Phase 5 US3 | 9 (T099~T107) |
| Phase 6 US4 | 11 (T108~T118) |
| Phase 7 Polish | 8 (T119~T126) |
| `[P]` 병렬 가능 태스크 | 약 70개 |
| 회귀/안전 테스트 태스크 | 12 (Allergy/Nutrition/E2E 5종 + 통합 4종) |

**MVP 권장 범위**: Phase 1 + 2 + 3 (T001~T088, 88개 태스크). 이후 US2/US3/US4 + Polish는 점진 출시.

**다음 단계**: `/speckit.implement` — 본 tasks.md를 기반으로 구현 진입.
