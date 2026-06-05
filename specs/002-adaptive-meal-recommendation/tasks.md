# Tasks: 적응형 식단 추천 고도화 (002)

**Feature**: `002-adaptive-meal-recommendation`
**Inputs**: [spec.md](./spec.md), [plan.md](./plan.md), [data-model.md](./data-model.md), [contracts/openapi.yaml](./contracts/openapi.yaml), [research.md](./research.md), [quickstart.md](./quickstart.md)
**Created**: 2026-06-05
**Base**: 001 MVP 완료(테이블 001~019, 모듈 auth/users/inventory/recommendation/feedback/shopping/history/privacy/bookmarks).

---

## 표기 규칙

- `[P]` — 다른 파일을 다루므로 **병렬 실행 가능**
- `[USx]` — 사용자 스토리 라벨
- 모든 경로는 저장소 루트 기준
- 테스트 태스크는 spec/plan의 안전·회귀 시나리오(알레르기 우선, 식품군 임박 경계, 가중치 반영, 콜드스타트, 데이터 희소)만 선별 포함
- **불변 규칙**: 선호 가중치는 결정적 알레르기/기피 차단(spec FR-005)을 절대 무력화하지 않는다 — 검증은 항상 최종 게이트.

## 사용자 스토리 우선순위 (spec.md §1.2 도출)

| ID | 제목 | 우선순위 | 핵심 (spec) |
|---|---|---|---|
| **US1** | 적응형 개인화 — 사용할수록 가까워지는 추천 (피드백·수정·소비 학습) | **P1 (MVP)** | FR-001~007, FR-002, FR-013 · AS-1, AS-4, AS-8 · EC-1,2,6,7 |
| **US2** | 식재료 유통기한 관리 — 식품군별 임박 알림·우선 소비 | **P1** | FR-010~014 · AS-2, AS-3 · EC-3,4 |
| **US3** | 식단 저장·재사용 | **P1** | FR-020~021 · AS-5 |
| **US4** | 건강 분석 리포트·시각화 (수동 기록) | P2 | FR-030~034 · AS-6 · EC-5 |
| **US5** | 자동 장보기 우선순위 고도화 | P2 | FR-035~036 · AS-7 |

각 스토리는 **독립 데모 가능**하도록 체크포인트를 둔다.

---

## Phase 1 — Setup

> 002는 신규 외부 의존성·런타임 패키지 없음(plan §1.1). 브랜치 `002-adaptive-meal-recommendation` 기 생성.

- **T001** `[P]` 신규 도메인 디렉터리 골격 생성: `backend/src/domain/{preferences,expiry,health,shopping}/`(빈 index 또는 placeholder). 신규 모듈 디렉터리 `backend/src/modules/{preferences,health,mealplans}/`.
- **T002** `[P]` 프론트 신규 디렉터리: `frontend/src/pages/health/`, `frontend/src/components/health/`, `frontend/src/stores/health.ts`(stub), `frontend/src/stores/preferences.ts`(stub).

---

## Phase 2 — Foundational (모든 스토리의 선행 차단 작업)

> 마이그레이션·시드·라우터 배선. **이 페이즈 완료 전 어떤 스토리도 시작 불가.**

- **T003** [X] `backend/src/db/migrations/020_add_ingredient_food_group.sql` — `ingredient_items`에 `food_group VARCHAR(30) NULL` 추가 + `KEY idx_ii_user_group_exp (user_id, food_group, expires_at)`. (data-model §1.1)
- **T004** [X] `[P]` `021_create_food_group_expiry_thresholds.sql` — PK `food_group`, `imminent_days TINYINT UNSIGNED`. (§2.1)
- **T005** [X] `[P]` `022_create_user_preference_weights.sql` — PK `(user_id,dimension,key_ref)`, FK→users CASCADE. (§2.2)
- **T006** [X] `[P]` `023_create_recommendation_edits.sql` — FK→recommendation_requests CASCADE, users RESTRICT. (§2.3)
- **T007** [X] `[P]` `024_create_consumption_records.sql` — FK→users CASCADE, foods/ingredient_items/recommendation SET NULL. (§2.4)
- **T008** [X] `[P]` `025_create_saved_meal_plans.sql` — FK→users CASCADE, source_recommendation SET NULL. (§2.5)
- **T009** [X] `[P]` `026_create_health_logs.sql` — UNIQUE `(user_id,logged_at)`, `metrics_enc VARBINARY`, (+선택) `health_reports`. (§2.6, §2.7)
- **T010** [X] `[P]` `027_alter_shopping_list_items_priority.sql` — `priority_score SMALLINT DEFAULT 0`, `reason VARCHAR(100) NULL`. (§1.2)
- **T011** [X] `backend/src/db/seeds/seed-food-group-thresholds.ts` — 식품군별 임계 시드(채소2/과일3/육류3/수산물2/유제품5/가공냉동7/기타3). `package.json`에 `seed:thresholds` 스크립트 추가. (research R-2)
- **T012** [X] 마이그레이션 적용·검증: `npm run migrate && npm run migrate:status`(pending []) + `seed:thresholds` 실행. (quickstart §2)
- **T013** [X] `backend/src/app.ts`에 신규 라우터 자리 배선: `preferencesRouter`, `healthRouter`, `mealPlansRouter`를 `/api` 하위에 등록(빈 라우터라도 마운트). 001 배선 패턴 준수.

**Checkpoint**: 스키마·시드·라우터 마운트 완료 → 스토리 구현 시작 가능.

---

## Phase 3 — US1: 적응형 개인화 (P1, MVP) `[US1]`

**Goal**: 피드백·추천 수정·소비 이력을 통계 가중치로 누적 반영해 추천 순위를 개인화하고, 추천 근거를 표시한다. 안전 검증은 최종 게이트 유지.
**Independent Test**: 피드백/수정 N건 누적 후 동일 인벤토리 추천 시 선호 카테고리 가중치가 상향 반영되고(AS-1), 알레르기 등록 항목은 가중치와 무관히 차단(FR-005), `cold_start` 사용자는 중립 폴백(EC-1/FR-004).

### 도메인 (순수 로직, 테스트 우선)
- **T014** [X] `[P][US1]` 테스트 `backend/tests/unit/preferences/weightCalculator.spec.ts` — 최신성·빈도 가중, 상충 신뢰도 임계 중립화(EC-2), 콜드스타트(EC-4).
- **T015** [X] `[US1]` `backend/src/domain/preferences/weightCalculator.ts` — 이벤트(피드백/수정/재사용/소비) → `{dimension,key_ref,weight,confidence,sample_count}` 산출(half-life 감쇠). T014 통과시킴.

### 데이터 접근/서비스
- **T016** [X] `[US1]` `backend/src/modules/preferences/service.ts` — `recomputeWeights(userId)`(UPSERT into `user_preference_weights`), `getWeights(userId)`(+cold_start 판정).
- **T017** [X] `[US1]` `backend/src/modules/feedback/service.ts` 확장 — 피드백 저장 시 `preferences.recomputeWeights` 트리거(이벤트). 기존 feedbacks 흐름 유지.
- **T018** [X] `[US1]` `backend/src/modules/feedback/` 확장 — `recommendation_edits` 기록 서비스/검증(zod): action/target_type/target_ref. (FR-002)

### 엔드포인트
- **T019** [X] `[P][US1]` `backend/src/modules/preferences/{controller,routes}.ts` — `GET /api/preferences/weights` (contracts). app.ts 배선 확정.
- **T020** [X] `[US1]` `backend/src/modules/recommendation/controller.ts`/`routes.ts` 확장 — `POST /api/recommendations/{id}/edits`. 기록 후 recompute 트리거.

### 추천 오케스트레이터 통합 (핵심)
- **T021** [X] `[US1]` `backend/src/modules/recommendation/orchestrator.ts` 확장 — `PreferenceLoader` 단계 추가(없으면 중립), 가중치를 후보 정렬/프롬프트 힌트로 결정적 반영. (FR-001)
- **T022** [X] `[US1]` `backend/src/domain/prompt/builder.ts` + `preferenceHints.ts` 확장 — 상위 선호/기피를 힌트로 주입(기존 preferenceHints 재사용·확장).
- **T023** [X] `[US1]` orchestrator에 **AllergyValidator 최종 게이트 위치 보장** + `DiversityGuard`(최근 N건 유사도 변형, FR-006). 응답에 `rationale[]`(FR-003) 포함.
- **T024** [X] `[P][US1]` 테스트 `backend/tests/integration/recommendation.adaptive.spec.ts` — (a) 가중치 반영 순위 변화, (b) **알레르기 항목이 가중치 상향에도 차단**(FR-005 회귀), (c) rationale 존재.

### 프론트
- **T025** [X] `[P][US1]` `frontend/src/pages/recommendation/` (RecipeCard/Result) — 추천 근거(rationale) 표시 UI.
- **T026** [X] `[P][US1]` `frontend/src/components/feedback/FeedbackForm.vue` 확장 — 추천 수정(재료 교체/제외/대체) 입력 → `/recommendations/{id}/edits` 호출. `frontend/src/api/client.ts` 엔드포인트 추가.
- **T027** [X] `[P][US1]` `frontend/src/stores/preferences.ts` — 가중치/콜드스타트 조회, "학습 적용 중" 표시.

**Checkpoint US1**: 피드백→가중치→추천 반영 루프 + 근거 표시 + 알레르기 안전 회귀 통과. **MVP 데모 가능.**

---

## Phase 4 — US2: 식재료 유통기한 관리 (P1) `[US2]`

**Goal**: 식품군별 차등 임계로 임박/만료를 판정해 인앱 알림과 우선 소비 추천을 제공한다.
**Independent Test**: 임박 재료 존재 시 `GET /api/inventory/expiring`가 식품군 임계 기준으로 imminent/expired 분리(AS-3), 추천 시 임박 재료 우선 + 사유 표기(AS-2), 만료 재료는 추천 제외(FR-014).

### 도메인
- **T028** [X] `[P][US2]` 테스트 `backend/tests/unit/expiry/expiryEvaluator.spec.ts` — 식품군 임계 경계값(=임계일, 임계-1, 만료), 임계 미설정 식품군 처리(EC-3).
- **T029** [X] `[US2]` `backend/src/domain/expiry/expiryEvaluator.ts` — 보유 재료 × thresholds → `{imminent[],expired[],days_left}`. T028 통과.

### 서비스/엔드포인트
- **T030** [X] `[US2]` `backend/src/modules/inventory/service.ts` 확장 — `getExpiring(userId)`(thresholds 조인), `updateExpiry(itemId,{expires_at,food_group})`.
- **T031** [X] `[P][US2]` `backend/src/modules/inventory/{controller,routes}.ts` 확장 — `GET /api/inventory/expiring`, `PATCH /api/inventory/items/{id}/expiry` (contracts).
- **T032** [X] `[US2]` orchestrator 확장 — `ExpiryEvaluator` 결과를 우선 소비 후보로 프롬프트/정렬 반영(FR-012), 만료 제외(FR-014). 임박 사유를 rationale에 추가.
- **T033** [X] `[US2]` `backend/src/modules/inventory/service.ts` — 추천 채택/식단 저장 시 `consumption_records` 적재 + `preferences.recomputeWeights` 트리거(FR-013). 식품군 분류는 `foods` 매핑 우선, 미상 시 입력값.

### 프론트
- **T034** [X] `[P][US2]` `frontend/src/components/inventory/ExpiryBadge.vue` 확장 — 식품군 임계 반영 임박 표시.
- **T035** `[P][US2]` `frontend/src/pages/inventory/InventoryInputPage.vue`/`InventoryListSection.vue` — 유통기한/식품군 입력·수정 UI.
- **T036** [X] `[P][US2]` `frontend/src/pages/dashboard/DashboardPage.vue` + `frontend/src/stores/inventory.ts` — 임박 알림 배지/목록(폴링 `expiring`). (FR-011)

**Checkpoint US2**: 임박 알림 + 우선 소비 추천 + 소비 기록 적재 동작.

---

## Phase 5 — US3: 식단 저장·재사용 (P1) `[US3]`

**Goal**: 추천 식단을 저장하고 재사용 기반 재추천을 제공하며 재사용 빈도를 학습에 반영한다.
**Independent Test**: 식단 저장 후 목록 조회, 재사용 시 `reuse_count` 증가 및 재추천 결과 반환(AS-5).

- **T037** `[US3]` `backend/src/modules/mealplans/service.ts` — `save()`, `list()`, `reuse(id)`(reuse_count++ , last_used_at, source 기반 재추천 호출).
- **T038** `[P][US3]` `backend/src/modules/mealplans/{controller,routes}.ts` — `GET/POST /api/meal-plans`, `POST /api/meal-plans/{id}/reuse` (contracts).
- **T039** `[US3]` `weightCalculator`/`recomputeWeights` 입력에 재사용 신호 연결(재사용 빈도 → 선호 가중). (FR-021)
- **T040** `[P][US3]` 프론트 — 추천 결과 "저장" + 저장 식단 목록/재사용 UI(`pages/history` 또는 신규 섹션), `api/client.ts` 추가, `stores/recommendation.ts` 확장.

**Checkpoint US3**: 저장·재사용 루프 동작, 재사용이 추천에 반영.

---

## Phase 6 — US4: 건강 분석 리포트 (P2) `[US4]`

**Goal**: 수동 입력 건강 기록으로 체중 추이·영양 균형·부족/과잉을 시각화한다(의학 면책 포함).
**Independent Test**: 건강 기록 N건 입력 후 리포트에 체중 추이·주간 영양 균형 표시(AS-6), 기록 희소 시 누적 안내(EC-5), 모든 리포트에 면책 문구(FR-034).

### 도메인/서비스
- **T041** `[P][US4]` 테스트 `backend/tests/unit/health/reportAggregator.spec.ts` — 기간 집계·부족/과잉, 데이터 1~2건 희소 처리(EC-5).
- **T042** `[US4]` `backend/src/domain/health/reportAggregator.ts` — 기간별 평균 영양 균형(기존 nutrition_analyses 활용)·체중 추이·부족 영양소 산출.
- **T043** `[US4]` `backend/src/modules/health/service.ts` — `upsertLog()`(일자 UNIQUE, `metrics_enc` 암호화 `utils/crypto` 재사용), `getLogs(range)`, `getReport(period)`(409 if 희소). 건강 데이터 동의 확인(FR-038).
- **T044** `[P][US4]` `backend/src/modules/health/{controller,routes}.ts` — `GET/POST /api/health/logs`, `GET /api/health/report`, `GET /api/history/calendar` (contracts). 모든 리포트 응답에 disclaimer.

### 프론트
- **T045** `[P][US4]` `frontend/src/components/health/WeightTrendChart.vue`, `NutritionBalanceChart.vue`, `MealCalendar.vue` (Chart.js 재사용).
- **T046** `[US4]` `frontend/src/pages/health/HealthReportPage.vue` + `stores/health.ts` + 라우트 등록(`router/index.ts`) — 입력 폼·리포트·캘린더. 면책 문구 표시.

**Checkpoint US4**: 건강 기록→리포트 시각화 동작, 면책 포함.

---

## Phase 7 — US5: 자동 장보기 우선순위 (P2) `[US5]`

**Goal**: 부족 식재료를 자동 정리하고 영양 부족도·임박 대체 필요성으로 우선순위를 매긴다.
**Independent Test**: 장보기 리스트가 priority_score로 정렬되고 사유(reason) 표기(AS-7).

- **T047** `[P][US5]` 테스트 `backend/tests/unit/shopping/priorityRanker.spec.ts` — 부족도·임박 대체 정렬 규칙.
- **T048** `[US5]` `backend/src/domain/shopping/priorityRanker.ts` — 항목 우선순위 점수·사유 산정.
- **T049** `[US5]` `backend/src/modules/shopping/service.ts` 확장 — 산출 결과에 priority_score/reason 부여·정렬. 기존 장보기 흐름 유지.
- **T050** `[P][US5]` `frontend/src/components/shopping/ShoppingListPanel.vue` 확장 — 우선순위 정렬·사유 표기.

**Checkpoint US5**: 장보기 우선순위·사유 동작.

---

## Phase 8 — Polish & Cross-Cutting

- **T051** `[P]` 개인정보 삭제권 정합: `privacy/exportService`·`withdrawService`에 신규 테이블(health_logs/preference_weights/saved_meal_plans/consumption_records/recommendation_edits) 포함(export 포함, hard-delete CASCADE 검증). (FR-038, 001 개인정보 체계)
- **T052** `[P]` CLAUDE.md/quickstart 최종 점검 + `data/` 식품군 매핑 보강(필요 시 `foods`에 food_group 매핑 시드).
- **T053** `[P]` CI 그린 확인: backend `tsc/lint/test`, frontend `vue-tsc/lint/test`, 양쪽 build. (CI 게이트)
- **T054** `[P]` 공개 도메인 E2E 스모크: `./check_project.sh restart` 후 `https://p14.sumzip.com`에서 임박 알림·추천 근거·건강 리포트 골든패스 수동 검증(quickstart §3).
- **T055** 성능 확인: 추천 P95 ≤ 30s 유지(가중치/임박 계산이 추가 LLM 호출 없이 DB 집계인지 확인).

---

## 의존성 그래프 (스토리 완료 순서)

```
Setup(P1) → Foundational(P2: T003~T013)
                 │
                 ├─▶ US1 (P1, MVP)  ← 추천 오케스트레이터 학습 통합의 기준
                 ├─▶ US2 (P1)        (US1의 orchestrator 확장 지점 공유 → T032는 US1 T021 이후)
                 ├─▶ US3 (P1)        (T039는 US1 weightCalculator 의존)
                 ├─▶ US4 (P2)        (독립 — nutrition_analyses 기존 활용)
                 └─▶ US5 (P2)        (독립 — 기존 shopping 확장)
                 │
                 ▼
              Polish(P8)
```

- **독립성**: US4·US5는 US1~US3와 거의 독립(병렬 팀 작업 가능). US2의 orchestrator 통합(T032)·US3의 가중치 연결(T039)은 US1 핵심(T021/T015) 이후.
- **공유 파일 직렬화**: `orchestrator.ts`(T021→T023→T032), `app.ts`(T013에서 일괄 배선), `weightCalculator.ts`(T015→T039 입력 확장)은 [P] 금지.

## 병렬 실행 예시

- Foundational: T004~T010(서로 다른 마이그레이션 파일) 동시 작성 후 T012 일괄 적용.
- US1 도메인+프론트: T014, T025, T026, T027 병렬.
- 스토리 간: US4(T041~T046)·US5(T047~T050)를 US1~US3와 병렬 진행.

## 구현 전략 (점진 인도)

1. **MVP = Foundational + US1** — 적응형 추천 루프 + 안전 회귀. 이것만으로 핵심 가치(개인화) 데모.
2. **+US2, +US3** (P1 완성) — 유통기한 관리·식단 재사용으로 폐기 절감·재사용 학습.
3. **+US4, +US5** (P2) — 건강 리포트·장보기 우선순위로 가치 가시화.
4. 각 스토리 Checkpoint에서 독립 데모·커밋.

---

## 요약

- **총 태스크: 55** (Setup 2 / Foundational 11 / US1 14 / US2 9 / US3 4 / US4 6 / US5 4 / Polish 5)
- **스토리별**: US1=14, US2=9, US3=4, US4=6, US5=4
- **테스트 태스크**: 6 (안전·경계·희소 회귀 선별 — weightCalculator, expiryEvaluator, reportAggregator, priorityRanker, 추천 적응 통합)
- **MVP 권장 범위**: Foundational + **US1** (T003~T027)
- **다음**: `/speckit.implement` 또는 수동 구현 → 스토리별 Checkpoint 커밋.
