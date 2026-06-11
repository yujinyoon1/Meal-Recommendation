# Implementation Plan: AI 기반 스마트 식단 추천 플랫폼 (통합 종합)

**Feature**: `003-meal-recommendation`
**Spec**: [spec.md](./spec.md)
**Source Intent**: [Intent-Specify.md](./Intent-Specify.md)
**Consolidates**: [001 plan](../001-meal-recommendation/plan.md) (단기 MVP 완료) + [002 plan](../002-adaptive-meal-recommendation/plan.md) (중기 고도화 구현 완료)
**Created**: 2026-06-11
**Status**: Draft (Phase 0~1 완료, Phase 2 task 생성은 `/speckit.tasks`로 위임)

---

## 1. Technical Context

001·002에서 확정·구현된 스택과 구조를 그대로 계승한다. **신규 외부 의존성·런타임 패키지 없음.** 본 통합 단계는 새 기능 구현보다 **전 기능의 일관성·추적성 확인과 후속(장기) 확장 지점 정리**가 목적이다.

### 1.1 Tech Stack (확정, 변경 없음)

| 레이어 | 선택 | 비고 |
|---|---|---|
| Frontend | Vue 3.4 + TS5 + Vite5 + Pinia2 + Vue Router4 + Axios + Chart.js | 건강 리포트/캘린더 시각화 Chart.js |
| Backend | Node 20 + Express4 + TS5 + mysql2 + zod + pino + helmet | 신규 런타임 의존성 없음 |
| DB | MariaDB 10.6+ (외부 호스트, KST +09:00), 원시 SQL + 마이그레이션 | 마이그레이션 001~029 적용 완료 |
| AI | LLM 어댑터(Mock + OpenAI 호환) — 추천 시 선호 가중치/임박도를 **결정적으로** 주입 | 어댑터 인터페이스 뒤에서만 호출 |
| Auth | 이메일+비밀번호 + JWT(Access 15m / Refresh 7d httpOnly) + bcrypt(12) | 001 체계 |

### 1.2 Clarify 반영 결정 (spec §Clarifications)

| 항목 | 결정 | 구현 영향 |
|---|---|---|
| '학습' 방식 | 통계 가중치·규칙 기반 (ML 미도입) | `user_preference_weights` 집계 + 이벤트 재계산 |
| 유통기한 임박 | 식품군별 차등 임계 | `ingredient_items.food_group` + `food_group_expiry_thresholds`, SQL 결정 계산 |
| 알림 채널 | 인앱(대시보드)만 | 폴링형 조회 + 대시보드 배지 |
| 건강 데이터 | 사용자 수동 기록만 | `health_logs` 입력, 외부 연동 없음(후속 graceful) |

### 1.3 외부 의존성

- MariaDB 외부 호스트, LLM API(Mock 가능), 식약처/공공 영양 DB 시드. **신규 외부 의존성 없음** — FR-040(외부 상품/헬스케어)은 선택·후속이며 핵심 경로는 내부 데이터로 완결.

### 1.4 비기능 요구

- 추천 응답 P95 ≤ 30s (가중치/임박 계산은 추가 LLM 호출 없이 DB 집계).
- 민감정보(건강·체중·알러지·질환) 앱 레벨 AES-256-GCM 암호화 (`utils/crypto`).
- `/api/recommendations` rate limit: 사용자당 5/hour, 20/day.

### 1.5 NEEDS CLARIFICATION

없음 — 002 `/speckit.clarify` Session 2026-06-05에서 고임팩트 결정 모두 해소, 본 통합 명세에 승계.

---

## 2. Constitution Check

> 별도 `.specify/memory/constitution.md` 미설치 → 001/002와 동일하게 일반 모범 원칙 + spec 정책(`CLAUDE.md` 핵심 규칙)을 가드레일로 적용.

| 원칙 | 적용 | 평가 |
|---|---|---|
| **Spec-first** | spec FR-050~056·FR-001~040 ↔ 모듈/테이블/엔드포인트 1:1 추적 | PASS |
| **안전 검증 우선** | 학습 가중치는 결정적 알레르기/기피 차단(FR-005/055)을 절대 무력화하지 않음. 검증이 가중치 적용 **이후** 최종 게이트 | PASS |
| **Test-first 가능성** | 가중치 산출·임박 판정·리포트 집계·영양 계산은 순수 도메인 함수로 분리 | PASS |
| **Security by default** | 건강/체중/알러지/질환 민감 컬럼 암호화, 동의 기반(FR-038) | PASS |
| **Cost guardrails** | 학습/리포트/임박은 LLM 비호출(DB 집계), 추천 캐시·재사용 활용 | PASS |
| **Vendor lock-in 최소화** | 신규 외부 의존성 없음, 외부 연동은 어댑터 뒤 선택 | PASS |
| **No silent scope creep** | 외부 푸시/ML/기기연동을 명시적 범위 외 처리 | PASS |

→ **Gate 결과: 통과** (위반 없음).

---

## 3. Project Structure (현행 — 구현 완료 상태)

```
backend/src/
├── modules/
│   ├── auth/ users/ inventory/ recommendation/ feedback/      [001]
│   ├── shopping/ history/ privacy/ bookmarks/ cart/ consumption/ [001/002]
│   ├── preferences/   [002] 선호 가중치 산출/조회 (통계 기반)
│   ├── health/        [002] 건강 기록 + 분석 리포트 집계
│   └── mealplans/     [002] 식단 저장/재사용
├── domain/
│   ├── prompt/ validator/ nutrition/   [001] 영양 계산·검증·프롬프트
│   ├── preferences/   [002] weightCalculator (피드백·재사용·소비 → 가중치)
│   ├── expiry/        [002] expiryEvaluator (식품군별 임박 판정)
│   ├── health/        [002] reportAggregator (기간 집계·부족/과잉)
│   └── shopping/      [002] priorityRanker (부족도·임박 대체 정렬)
├── adapters/
│   ├── llm/           [001] Mock + OpenAI 호환 어댑터
│   └── nutrition/     [001] foodLookup (alias + FULLTEXT 매칭)
└── db/migrations/     001~029 적용 완료, seeds(foods, food-group-thresholds)

frontend/src/
├── pages/ (auth, inventory, recommendation, history, health, dashboard, settings, shopping)
├── components/ (ui, feedback, inventory, health, shopping, recipe)
└── stores/ (auth, inventory, recommendation, preferences, health)
```

---

## 4. High-Level Architecture

Nginx(TLS) → Vue SPA(:9514) / Express API(:9534) → MariaDB(외부) + LLM 어댑터. 핵심은 **추천 오케스트레이터의 결정적 강화 단계**.

### 4.1 강화된 추천 요청 시퀀스 (FR-001/005/012/053/055)

```
User ─▶ POST /api/recommendations { ingredients_text }
  ├─ Auth + Inventory 정규화
  ├─ RecommendationOrchestrator:
  │   1) ProfileLoader
  │   2) PreferenceLoader   — user_preference_weights 로드 (없으면 콜드스타트=중립)
  │   3) ExpiryEvaluator    — 식품군별 임박 재료 산출 → 우선소비 후보
  │   4) PromptBuilder      — 선호 상위/임박 우선 힌트를 결정적으로 주입
  │   5) LLMAdapter.complete → Recipe JSON
  │   6) AllergyValidator   [최종 게이트] 가중치와 무관 차단 (FR-005/055)
  │   7) NutritionService   — 칼로리·탄단지 계산 (FR-054)
  │   8) DiversityGuard     — 최근 추천 과유사 시 변형 (FR-006)
  │   9) Persistence + ShoppingPriorityRanker
  └─◀ 200 { recipes[], nutrition{}, shopping_list[], rationale[] }
```

### 4.2 학습 루프 (이벤트 기반, LLM 비호출)

```
피드백 / 추천 수정 / 식단 재사용 / 소비 기록 ─(이벤트)─▶
  PreferenceWeightCalculator (순수 도메인, 통계 집계, 최신성·빈도 가중)
  ─▶ user_preference_weights UPSERT ─▶ 다음 추천 반영
```

### 4.3 임박 알림 (인앱 폴링, FR-011)

```
대시보드 진입 ─▶ GET /api/inventory/expiring
  → expiryEvaluator: 보유 재료 × food_group_expiry_thresholds
  → { imminent[], expired[] } → 대시보드 배지/목록
```

---

## 5. Phase 0: Research

상세 [research.md](./research.md). 요약:
- 선호 가중치 = 통계 집계(가중 평균·최신성·빈도). ML/벡터 저장소 없음. 추천당 추가 LLM 호출 0.
- 임박 판정 = 식품군 차등 임계 설정 테이블 시드 + SQL `DATEDIFF` 결정 계산.
- 추천 수정 이력 = `recommendation_edits`로 구조화 수집 → 가중치 입력.
- 건강 리포트 = 수동 입력 `health_logs` + 기간 집계. 외부 연동 없음.
- 영양 계산 = 공공 영양 DB 시드(`foods`) + foodLookup 매칭(alias→FULLTEXT).

→ NEEDS CLARIFICATION 0건.

---

## 6. Phase 1: Design Artifacts

| 산출물 | 경로 | 설명 |
|---|---|---|
| 데이터 모델 | [data-model.md](./data-model.md) | 테이블 001~029 통합 + 관계 추적표 |
| API 계약 | [contracts/openapi.yaml](./contracts/openapi.yaml) | 인증·프로필·인벤토리·추천·피드백·선호·건강·식단저장·장보기 |
| 시작 가이드 | [quickstart.md](./quickstart.md) | 마이그레이션·시드·기동·검증 절차 |
| Agent 컨텍스트 | [/Users/pioneer14/mis2601/CLAUDE.md](../../CLAUDE.md) | 전 모듈 반영 |

---

## 7. Constitution Check (Post-Design)

| 항목 | 결과 |
|---|---|
| spec FR ↔ data-model 추적성 | 모든 FR이 1개 이상 테이블/컬럼과 연결 |
| spec FR ↔ API 계약 추적성 | 모든 FR이 1개 이상 endpoint로 표현 |
| 안전 검증 우선 | AllergyValidator가 가중치 적용 이후 최종 게이트 (§4.1) |
| 비용 가드 | 학습/리포트/임박 모두 LLM 비호출 |
| 민감정보 | health_logs/프로필 암호화 + 분리 동의, 비밀값 .env |

→ **Post-Design Gate: 통과**

---

## 8. Risks & Mitigations (구현 관점)

| 위험 | 영향 | 완화 |
|---|---|---|
| 가중치가 알레르기 차단 약화 | 건강 위해 | 검증을 가중치 이후 최종 게이트로 강제 + 회귀 테스트 (FR-005) |
| 콜드스타트/희소 데이터 | 추천 품질 저하 | 임계 미만 시 중립 폴백(FR-004) |
| 상충 피드백 진동 | 추천 불안정 | 최신성·빈도 가중 + 신뢰도 임계 중립화 (EC-2) |
| 건강 데이터 희소 | 리포트 빈약 | 기록 1~2건 시 "데이터 누적 안내" (EC-5) |
| 외부 API 미연동 | 선택 기능 불가 | 내부 데이터만으로 완결 + graceful degrade (EC-8) |

---

## 9. Next Step

`/speckit.tasks` — 본 plan을 입력으로 의존성 기반 작업 목록(`tasks.md`) 생성. (단기·중기 구현은 001/002에서 완료되어 있으므로 003 tasks는 통합·검증·후속 확장 중심.)
