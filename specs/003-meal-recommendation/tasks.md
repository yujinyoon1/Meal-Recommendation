# Tasks: AI 기반 스마트 식단 추천 플랫폼 (통합 종합)

**Feature**: `003-meal-recommendation`
**Inputs**: [spec.md](./spec.md), [plan.md](./plan.md), [data-model.md](./data-model.md), [contracts/openapi.yaml](./contracts/openapi.yaml), [research.md](./research.md), [quickstart.md](./quickstart.md)
**Created**: 2026-06-11
**Base**: 001(단기 MVP)·002(중기 고도화) **구현 완료** (마이그레이션 001~029, 모듈 auth/users/inventory/recommendation/feedback/preferences/health/mealplans/shopping/history/privacy/bookmarks/consumption/cart).

---

## 표기 규칙

- `[X]` 완료 · `[ ]` 미완료 · `[P]` 병렬 가능 · `[USx]` 사용자 스토리 라벨
- 003은 신규 기능 증분이 아니라 **통합 명세 정합·검증 + 장기(후속) 확장 정리**가 목적이다. 기 구현(001/002) 태스크는 완료로 승계 표기.
- **불변 규칙**: 학습 가중치는 결정적 알레르기/기피 차단(FR-005/055)을 절대 무력화하지 않는다.

## 사용자 스토리 우선순위

| ID | 제목 | 우선순위 | 상태 |
|---|---|---|---|
| **US0** | 기반 — 회원/프로필/식재료/기본 추천/영양 검증 (단기) | P0 | 완료 (001) |
| **US1** | 적응형 개인화 — 피드백·수정·소비 학습 | P1 | 완료 (002) |
| **US2** | 식재료 유통기한 관리 — 식품군별 임박 알림 | P1 | 완료 (002) |
| **US3** | 식단 저장·재사용 | P1 | 완료 (002) |
| **US4** | 건강 분석 리포트·시각화 | P2 | 완료 (002) |
| **US5** | 자동 장보기 우선순위 | P2 | 완료 (002) |
| **US6** | 외부 연계 확장 (공공 영양/상품/헬스케어) | P3 | 후속·선택 (FR-040) |

---

## Phase 1 — 통합 명세 정합 검증

- **T001** [X] 마이그레이션 001~029 적용·검증 (`npm run migrate:status` → pending []).
- **T002** [X] 백엔드 빌드·단위 테스트 그린 (`tsc` + vitest 38 pass: weightCalculator/expiryEvaluator/reportAggregator/priorityRanker/nutrition/allergy).
- **T003** [X] 프론트 빌드 그린 (`vue-tsc` + vite).
- **T004** [X] 신규/핵심 엔드포인트 라우팅·인증 확인 (preferences/weights, inventory/expiring, meal-plans, health/report → 401 정상).
- **T005** [X] 서비스 기동·헬스체크 (`check_project.sh status`, `/health/ready` db:ok/llm:ok).
- **T006** [X] `[P]` spec FR ↔ 코드 추적성 매트릭스 → [traceability.md](./traceability.md) 생성. FR-050~056·FR-001~039 전부 모듈/테이블/엔드포인트로 추적 가능, FR-040만 의도적 미구현(US6).
- **T007** [~] `[P]` 공개 도메인 스모크: 핵심 엔드포인트 라우팅·인증(401) + `/health/ready`(db:ok/llm:ok) 확인 완료. **8단계 골든패스 수동 검증은 일회용 계정 필요(원격 DB 쓰기) → 사용자 확인 후 진행 권장.**

## Phase 2 — US0~US5 구현 (001/002에서 완료 승계)

- **T010** [X] `[US0]` 회원/인증/프로필/식재료/기본 추천/영양 계산/결정적 안전 검증 (001 T001~T057).
- **T011** [X] `[US1]` 선호 가중치 학습 루프 + 추천 근거 + 알레르기 안전 회귀 (002 T014~T027).
- **T012** [X] `[US2]` 식품군별 임박 판정·알림·우선 소비·소비 기록 (002 T028~T036).
- **T013** [X] `[US3]` 식단 저장·재사용·재사용 학습 반영 (002 T037~T040).
- **T014** [X] `[US4]` 건강 기록·리포트·시각화·면책 (002 T041~T046).
- **T015** [X] `[US5]` 장보기 우선순위·사유 (002 T047~T050).
- **T016** [X] 개인정보 삭제권 정합(export/hard-delete CASCADE) 신규 테이블 포함 (002 T051).

## Phase 3 — US6 외부 연계 확장 (P3, 후속·선택) `[US6]`

> FR-040: 미연동 시에도 핵심 기능이 정상 동작해야 한다(EC-8). 어댑터 뒤 선택 구현.

- **T020** [ ] `[P][US6]` 공공 영양 데이터 API 어댑터 설계 — 현 `foods` 시드를 외부 API 동기화로 대체 가능한 어댑터 인터페이스 정의(키 확보 시).
- **T021** [ ] `[P][US6]` 식품 상품/마트 상품 정보 어댑터 — 장보기 항목에 상품·가격 메타 결합(FR-036 정확도 향상).
- **T022** [ ] `[P][US6]` 헬스케어 기관 데이터 연동 가능 구조 — `health_logs` 외 외부 소스 매핑 스키마 초안(영양 그래프 신뢰도, FR-032).
- **T023** [ ] `[US6]` 외부 연동 장애 시 graceful degrade 회귀 테스트 (EC-8).

## Phase 4 — Polish

- **T030** [X] `[P]` `CLAUDE.md` 상태 동기화: 001/002 "완료", 003 "통합 명세" 및 잔여 태스크 반영 완료.
- **T031** [ ] `[P]` 성능 측정 리포트: 추천 P95 ≤ 30s 확인 (SC-009).
- **T032** [X] `[P]` 통합 테스트(라이브 DB) 활성화·구동 완료 → **13 passed / 2 failed**. 통과: 001 recommendation.flow(2), 002 recommendation.adaptive(3) + 외 8. 실패 2건은 **001-스코프 테스트 측 이슈**(002 구현 버그 아님):
  - `feedback.spec > 부정 피드백 2건이면 aggregateHints 재료 반환`: 동일 추천 1건에 부정 피드백 2회 → `aggregateHints`의 빈도 임계(`≥2`, 서로 다른 추천 기준) 경계 미충족. 로직/테스트 정렬 필요.
  - `privacy.spec > audit_logs health_profile.read 기록`: read 감사 코드는 존재(`healthProfile.service.ts:71`)하나 privacy 테스트 플로우가 GET 프로필을 호출하지 않아 기록 안 됨 → 테스트 플로우 보강 필요.
  - ⚠️ 통합테스트는 원격 MariaDB에 쓰기 발생 → 제품 코드 임의 수정 보류, 사용자 결정 대기.

---

## 의존성 그래프

```
US0(완료) → US1·US2·US3(완료, P1) → US4·US5(완료, P2)
                                          │
                                          ▼
              Phase1 정합검증(T006/T007) ──▶ US6 외부연계(후속) ──▶ Polish
```

## 요약

- **기 구현(완료)**: US0~US5 전체 — 001(57 태스크) + 002(55 태스크). 빌드·테스트·기동 검증 완료.
- **남은 작업(003 고유)**: 추적성 문서화(T006), E2E 스모크(T007), 외부 연계 후속(US6: T020~T023), Polish(T030~T032).
- **다음**: `/speckit.implement` (남은 미완료 태스크) 또는 후속 단계로 US6 착수 결정.
