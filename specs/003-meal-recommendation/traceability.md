# FR ↔ 코드 추적성 매트릭스 (T006)

**Feature**: `003-meal-recommendation`
**Created**: 2026-06-11
**근거**: `backend/src/app.ts`(라우터 등록), 모듈/도메인 소스, 마이그레이션 001~029, `orchestrator.ts` 단계.

모든 라우터는 `app.ts`에서 `/api` 하위에 등록됨(auth, profile×4, consent, inventory, recommendation, feedback, history, bookmarks, **preferences, mealplans, health**, shopping, cart, consumption, privacy export/withdraw).

---

## 기반 (단기 MVP, 001)

| FR | 모듈/도메인 | 테이블 | 엔드포인트 |
|---|---|---|---|
| FR-050 (회원/인증) | `modules/auth` | 001 `users`, 018 timestamps | `/api/auth/register`, `/api/auth/login` |
| FR-051 (건강·알러지 프로필) | `modules/users/healthProfile`·`basicProfile`·`dietPreference` | 002~004 | `/api/profile/*` |
| FR-052 (식재료 입력) | `modules/inventory` | 009 `ingredient_items` | `/api/inventory/items` |
| FR-053 (AI 기본 추천) | `modules/recommendation/orchestrator` | 010 `recommendation_requests`, 011 `recipes` | `POST /api/recommendations` |
| FR-054 (영양 계산) | `domain/nutrition/calculator`, `adapters/nutrition/foodLookup` | 006 `foods`, 013 `nutrition_analyses` | (추천 응답 `nutrition`) |
| FR-055 (결정적 안전 검증) | `domain/validator/allergy` (`detectAllergyViolations`) | 008 `allergy_disease_masters` | orchestrator 최종 게이트 |
| FR-056 (면책 고지) | recommendation/health 응답 | — | 응답 disclaimer |

## 적응형 학습 (중기 P1, 002) — orchestrator.ts 근거

| FR | 모듈/도메인 | 테이블 | 근거 |
|---|---|---|---|
| FR-001 (가중치 학습) | `domain/preferences/weightCalculator`, `modules/preferences/service.getWeights` | 022 `user_preference_weights` | orchestrator `getWeights`+`splitPreferences` |
| FR-002 (피드백/수정 수집) | `modules/feedback`, recommendation edits | 015 `feedbacks`, 023 `recommendation_edits` | `POST /api/recommendations/{id}/edits`, `/api/feedback` |
| FR-003 (학습 가시성) | orchestrator `rationale[]` | — | `RationaleItem{type:preference\|imminent\|cold_start}` |
| FR-004 (콜드스타트) | orchestrator cold_start 분기 | 022 | `rationale.push({type:'cold_start'})` |
| FR-005 (안전 우선) | allergy validator 위치 | 008 | 가중치 적용 **이후** `detectAllergyViolations` 최종 게이트 |
| FR-006 (다양성) | DiversityGuard | 016 cache | orchestrator |
| FR-007 (정확도 측정) | feedback/history 집계 | 015 | — |

## 유통기한 (중기 P1, 002)

| FR | 모듈/도메인 | 테이블 | 엔드포인트 |
|---|---|---|---|
| FR-010 (유통기한 관리) | `modules/inventory` | 020 `ingredient_items.food_group` | `PATCH /api/inventory/items/{id}/expiry` |
| FR-011 (임박 알림) | `domain/expiry/expiryEvaluator` | 021 `food_group_expiry_thresholds` | `GET /api/inventory/expiring` |
| FR-012 (소비 우선순위) | orchestrator `evaluateExpiry` | 021 | rationale `type:imminent` |
| FR-013 (소비 기록) | `modules/consumption` | 024 `consumption_records` | `/api/consumption` |
| FR-014 (만료 처리) | inventory/orchestrator | 020 | 만료 제외 |

## 식단 저장·재사용 / 건강 / 장보기 (002)

| FR | 모듈/도메인 | 테이블 | 엔드포인트 |
|---|---|---|---|
| FR-020/021 | `modules/mealplans` | 025 `saved_meal_plans` | `/api/meal-plans`, `/api/meal-plans/{id}/reuse` |
| FR-030/031/032 | `modules/health`, `domain/health/reportAggregator` | 026 `health_logs`(+`health_reports`) | `/api/health/logs`, `/api/health/report` |
| FR-033 (캘린더) | `modules/history` | 012 meal_plans | `/api/history/calendar` |
| FR-034 (면책) | health 응답 | — | disclaimer |
| FR-035/036 | `modules/shopping`, `domain/shopping/priorityRanker` | 014+027 `shopping_list_items.priority_score/reason` | `/api/shopping/list` |

## 데이터·거버넌스·연계

| FR | 근거 |
|---|---|
| FR-037 (관계 강화) | 전 테이블 FK (CASCADE/SET NULL/RESTRICT), data-model §6 |
| FR-038 (민감정보) | `health_logs.metrics_enc`, health_profiles 암호화(`utils/crypto`), 005 consent, 017 audit, `modules/privacy` export/withdraw |
| FR-039 (입력 검증) | zod 스키마 (각 모듈 routes/controller) |
| FR-040 (외부 연계) | **미구현 — 후속·선택** (US6/T020~T023). 어댑터 뒤 graceful degrade 전제 |

---

## 결론

- **FR-050~056, FR-001~039**: 코드·테이블·엔드포인트로 **전부 추적 가능 (구현 완료)**.
- **FR-040**: 의도적 미구현(P3 후속·선택). 핵심 경로는 내부 데이터로 완결되어 EC-8 충족.
