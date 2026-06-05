# Implementation Plan: 적응형 식단 추천 고도화 (002)

**Feature**: `002-adaptive-meal-recommendation`
**Spec**: [spec.md](./spec.md)
**Source Intent**: [Intent-Specify.md](../../Intent-Specify.md)
**Builds on**: [001-meal-recommendation](../001-meal-recommendation/plan.md) (MVP 완료)
**Created**: 2026-06-05
**Status**: Draft (Phase 0~1 완료, Phase 2 task 생성은 `/speckit.tasks`로 위임)

---

## 1. Technical Context

001 단계의 스택·구조를 그대로 계승한다(신규 기술 도입 최소화). 본 단계는 **기존 모듈 확장 + 소수 신규 모듈**로 구현한다.

### 1.1 Tech Stack (001 계승, 변경 없음)

| 레이어 | 선택 | 비고 |
|---|---|---|
| Frontend | Vue 3.4 + TS5 + Vite5 + Pinia2 + Vue Router4 + Axios + Chart.js | 건강 리포트/캘린더 시각화에 Chart.js 재사용 |
| Backend | Node 20 + Express4 + TS5 + mysql2 + zod + pino + helmet | 신규 런타임 의존성 없음 |
| DB | MariaDB 10.6+ (외부 호스트), 원시 SQL + 마이그레이션 파일 | 020~ 신규 마이그레이션 추가 |
| AI | LLM 어댑터(기존) — 추천 호출 시 선호 가중치/임박도를 **결정적으로** 주입 | 어댑터 인터페이스 변경 없음 |

### 1.2 Clarify 반영 결정 (spec §Clarifications, 2026-06-05)

| 항목 | 결정 | 구현 영향 |
|---|---|---|
| '학습' 방식 | **통계 가중치·규칙 기반** (ML 파이프라인 미도입) | `user_preference_weights` 집계 테이블 + 이벤트 기반 재계산. 별도 학습 인프라 불필요 |
| 유통기한 임박 | **식품군별 차등 임계** | `ingredient_items.food_group` 추가 + `food_group_expiry_thresholds` 설정 테이블. 임박 판정은 SQL로 결정적 계산 |
| 알림 채널 | **인앱(대시보드)만** | 폴링형 조회 엔드포인트 + 대시보드 배지. 외부 푸시/이메일/큐 인프라 없음 |
| 건강 데이터 | **사용자 수동 기록만** | `health_logs` 입력 테이블. 외부 기기/헬스 API 연동 없음(graceful 후속) |

### 1.3 외부 의존성

- 001과 동일(MariaDB 외부 호스트, LLM API, 식약처 영양 DB 시드). **본 단계 신규 외부 의존성 없음** — FR-040(외부 상품/헬스케어 연동)은 선택·후속이며 핵심 경로는 내부 데이터로 완결.

### 1.4 비기능 요구 (spec §6 Assumptions → 구현 목표치)

- 추천 응답 P95 ≤ 30s 유지 (선호 가중치/임박도 계산은 추가 LLM 호출 없이 DB 집계로 수행).
- 민감정보(건강·체중) 앱 레벨 AES-256-GCM 암호화 — 001의 `utils/crypto` 재사용.
- 임박 알림 적시성: 만료 이전(식품군 임계 기준) 노출 (SC-007).

### 1.5 NEEDS CLARIFICATION

없음 — `/speckit.clarify` Session 2026-06-05에서 4개 고임팩트 결정 모두 해소.

---

## 2. Constitution Check

> 별도 `.specify/memory/constitution.md` 없음 → 001과 동일하게 일반 모범 원칙 + spec 정책을 가드레일로 적용.

| 원칙 | 적용 | 평가 |
|---|---|---|
| **Spec-first** | spec FR-001~040 ↔ 본 plan의 모듈/테이블/엔드포인트 1:1 추적 | PASS |
| **안전 검증 우선** | 학습 가중치는 결정적 알레르기/기피 차단(001 FR-015)을 절대 무력화하지 않음 (spec FR-005). 검증 단계가 가중치 적용 **이후** 최종 게이트 | PASS |
| **Test-first 가능성** | 가중치 산출·임박 판정·리포트 집계는 순수 도메인 함수로 분리(단위 테스트 용이) | PASS |
| **Security by default** | 건강/체중 민감 컬럼 암호화, 동의 기반 수집(FR-038) | PASS |
| **Least privilege data** | 건강 기록은 선택형 + 분리 동의, 최소 수집 | PASS |
| **Cost guardrails** | 학습/리포트는 LLM 비호출(DB 집계) → 추가 토큰 비용 0. 추천 캐시·재사용 활용(spec 위험표) | PASS |
| **Vendor lock-in 최소화** | 신규 외부 의존성 없음, 외부 연동은 어댑터 뒤 선택 | PASS |
| **No silent scope creep** | 외부 푸시/ML/기기연동을 명시적으로 범위 외 처리 | PASS |

→ **Gate 결과: 통과** (위반 없음).

---

## 3. Project Structure (델타)

001 구조를 유지하며 아래만 추가/확장한다. `[+]` 신규, `[~]` 확장.

```
backend/src/
├── modules/
│   ├── inventory/         [~] 유통기한/식품군/임박 조회 추가
│   ├── recommendation/    [~] 오케스트레이터에 선호 가중치·임박 부스트 주입
│   ├── feedback/          [~] 추천 수정 이력 수집
│   ├── shopping/          [~] 우선순위 산정 추가
│   ├── preferences/       [+] 선호 가중치 산출/조회 (통계 기반)
│   ├── health/            [+] 건강 기록(체중/지표) + 분석 리포트 집계
│   └── mealplans/         [+] 식단 저장/재사용 (saved meal plans)
├── domain/
│   ├── preferences/       [+] weightCalculator.ts (피드백·재사용·소비 → 가중치)
│   ├── expiry/            [+] expiryEvaluator.ts (식품군별 임박 판정)
│   ├── health/            [+] reportAggregator.ts (기간 집계·부족/과잉 산출)
│   └── shopping/          [~] priorityRanker.ts (부족도·임박 대체 기준 정렬)
├── db/migrations/
│   ├── 020_add_ingredient_food_group.sql              [+]
│   ├── 021_create_food_group_expiry_thresholds.sql    [+]
│   ├── 022_create_user_preference_weights.sql         [+]
│   ├── 023_create_recommendation_edits.sql            [+]
│   ├── 024_create_consumption_records.sql             [+]
│   ├── 025_create_saved_meal_plans.sql                [+]
│   ├── 026_create_health_logs.sql                     [+]
│   └── 027_alter_shopping_list_items_priority.sql     [+]
│   └── seeds/seed-food-group-thresholds.ts            [+]

frontend/src/
├── pages/
│   ├── inventory/         [~] 유통기한 입력·임박 관리 섹션
│   ├── health/            [+] HealthReportPage (체중 추이/영양 균형/캘린더)
│   ├── recommendation/    [~] "왜 이 추천인지" 근거 표시
│   └── shopping/          [~] 우선순위 표기
├── stores/
│   ├── health.ts          [+]
│   ├── preferences.ts     [+] (선택, 학습 적용 상태 표시)
│   └── inventory.ts       [~] 임박 알림 상태
└── components/
    ├── health/            [+] WeightTrendChart, NutritionBalanceChart, MealCalendar
    └── inventory/         [~] ExpiryBadge 확장(식품군 임계 반영)
```

---

## 4. High-Level Architecture

001 토폴로지(Nginx → Vue/Express → MariaDB/LLM)를 유지. 핵심은 **추천 오케스트레이터의 결정적 강화 단계** 추가.

### 4.1 강화된 추천 요청 시퀀스 (FR-001, FR-005, FR-012)

```
User ─▶ POST /api/recommendations { ingredients_text }
  ├─ Auth + Inventory 정규화 (기존)
  ├─ RecommendationOrchestrator:
  │   1) ProfileLoader (기존)
  │   2) PreferenceLoader      [+] user_preference_weights 로드 (없으면 콜드스타트=중립)
  │   3) ExpiryEvaluator       [+] 식품군별 임박 재료 산출 → 우선소비 후보
  │   4) PromptBuilder         [~] 선호 상위/임박 우선 힌트를 프롬프트에 결정적으로 주입
  │   5) LLMAdapter.complete → Recipe JSON (기존)
  │   6) AllergyValidator      [최종 게이트] 가중치와 무관하게 차단 (FR-005)
  │   7) NutritionService (기존)
  │   8) DiversityGuard        [+] 최근 추천과 과유사 시 변형 유도 (FR-006)
  │   9) Persistence + ShoppingPriorityRanker [~]
  └─◀ 200 { recipes[], nutrition{}, shopping_list[], rationale[] }  // rationale = 추천 근거(FR-003)
```

### 4.2 학습 루프 (이벤트 기반, LLM 비호출)

```
피드백 제출 / 추천 수정 / 식단 재사용 / 소비 기록
        │ (이벤트)
        ▼
PreferenceWeightCalculator (순수 도메인, 통계 집계)
   - 최신성·빈도 가중, 상충 시 신뢰도 임계 이하 중립화 (EC-2)
        │
        ▼
user_preference_weights UPSERT  ──▶ 다음 추천에 반영
```

### 4.3 임박 알림 (인앱 폴링, FR-011)

```
대시보드 진입 ─▶ GET /api/inventory/expiring
   → expiryEvaluator: 보유 재료 × food_group_expiry_thresholds 비교
   → { imminent[], expired[] } → 대시보드 배지/목록
```

---

## 5. Phase 0: Research

상세 [research.md](./research.md). 요약:

- **선호 가중치**: 통계 집계(가중 평균, 최신성·빈도). 별도 ML/벡터 저장소 없음. 추천당 추가 LLM 호출 0.
- **임박 판정**: 식품군 차등 임계를 설정 테이블로 시드, SQL `DATEDIFF` 기반 결정적 계산. `ingredient_items.expires_at`(기존) 재사용.
- **추천 수정 이력**: `recommendation_edits`로 교체/제외/대체 액션 구조화 수집 → 가중치 입력.
- **건강 리포트**: 수동 입력 `health_logs` + 기간 집계(주/월 평균, 부족/과잉). 외부 연동 없음.
- **알림**: 인앱 폴링 조회. 큐/푸시 인프라 미도입.
- **다양성 보장**: 최근 N건 추천과 메뉴 유사도 규칙 비교.

→ NEEDS CLARIFICATION 0건 (clarify에서 해소).

---

## 6. Phase 1: Design Artifacts

| 산출물 | 경로 | 설명 |
|---|---|---|
| 데이터 모델 | [data-model.md](./data-model.md) | 신규 7테이블 + 2 확장(ingredient_items, shopping_list_items) |
| API 계약 | [contracts/openapi.yaml](./contracts/openapi.yaml) | 신규/확장 엔드포인트(선호·임박·건강·식단저장·장보기) |
| 시작 가이드 | [quickstart.md](./quickstart.md) | 마이그레이션·시드·검증 절차 |
| Agent 컨텍스트 | [/Users/pioneer14/mis2601/CLAUDE.md](../../CLAUDE.md) | 002 모듈 추가 반영 |

---

## 7. Constitution Check (Post-Design)

| 항목 | 결과 |
|---|---|
| spec FR ↔ data-model 추적성 | 모든 신규 FR이 1개 이상 테이블/컬럼과 연결 (data-model §추적표) |
| spec FR ↔ API 계약 추적성 | 모든 신규 FR이 1개 이상 endpoint로 표현 |
| 안전 검증 우선 | AllergyValidator가 가중치 적용 이후 최종 게이트로 배치됨 (§4.1) |
| 비용 가드 | 학습/리포트/임박 모두 LLM 비호출, 추천 캐시 유지 |
| 민감정보 | health_logs 암호화 + 분리 동의, 비밀값 .env 주입 |

→ **Post-Design Gate: 통과**

---

## 8. Risks & Mitigations (구현 관점)

| 위험 | 영향 | 완화 |
|---|---|---|
| 가중치가 알레르기 차단을 약화 | 건강 위해 | 검증을 가중치 이후 최종 게이트로 강제 + E2E 회귀 (FR-005) |
| 콜드스타트/희소 데이터 | 추천 품질 저하 | 임계 미만 시 중립 폴백(FR-004), 기본 프로필 추천 |
| 상충 피드백으로 가중치 진동 | 추천 불안정 | 최신성·빈도 가중 + 신뢰도 임계 중립화 (EC-2) |
| 임박만으로 균형 불가 | 식단 품질 | 임박 우선 + 부족분 장보기 병행 (EC-4) |
| 건강 데이터 희소 | 리포트 빈약 | 기록 1~2건 시 "데이터 누적 안내" (EC-5) |
| 추천 다양성 고착 | 사용자 권태 | DiversityGuard 주기적 변형 (FR-006, EC-7) |

---

## 9. Next Step

`/speckit.tasks` — 본 plan을 입력으로 의존성 기반 작업 목록(`tasks.md`) 생성.
