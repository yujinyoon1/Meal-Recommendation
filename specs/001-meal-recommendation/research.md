# Phase 0 — Research & Decisions

**Feature**: `001-meal-recommendation`
**Created**: 2026-05-15

> 본 문서는 plan.md의 Technical Context에서 도출된 의사결정과 그 근거를 모은다. 각 항목은 `Decision / Rationale / Alternatives` 형식을 따른다.

---

## R-1. LLM 제공자 및 추상화

- **Decision**: 백엔드 내 `adapters/llm/` 인터페이스를 정의하고 1차 구현체로 **OpenAI Chat Completions (GPT-4o-mini)** 를 사용한다. Mock 구현체를 테스트용으로 함께 제공한다.
- **Rationale**:
  - 한국어 품질·비용·SDK 안정성 균형
  - Chat Completions 스펙은 다수 호환 모델(예: 자체 호스팅 vLLM, OpenRouter)이 따르므로 추후 교체 부담↓
  - Mock 어댑터로 LLM 비용 없이 단위·통합 테스트 수행 가능
- **Alternatives considered**:
  - Anthropic Claude — 품질 우수하나 한국 결제/계약 절차가 OpenAI 대비 복잡 (학습용 프로젝트 기준)
  - 로컬 LLM(Llama.cpp) — 비용 0이지만 응답 품질·인프라 요구 부담
  - 직접 OpenAI API 호출(어댑터 미사용) — 단기간 빠르지만 벤더 락인

---

## R-2. 인증 방식

- **Decision**: 이메일+비밀번호 회원가입 + **JWT 듀얼 토큰**
  - Access Token: 15분, `Authorization: Bearer` 헤더
  - Refresh Token: 7일, **httpOnly + Secure + SameSite=Lax 쿠키**
  - 비밀번호 해시: bcrypt cost 12
- **Rationale**:
  - SPA(Vue) ↔ Express 표준 패턴
  - Refresh를 쿠키로 격리하여 XSS 토큰 탈취 노출 축소
  - bcrypt는 Node 생태계 최다 검증, cost 12는 2026 시점 적정 상한
- **Alternatives considered**:
  - 세션(express-session) — 수평 확장 시 세션 스토어 필요(현 단계 과잉)
  - 소셜 로그인(Google/Kakao) — spec.md §10 Q-1로 후속 결정. MVP는 이메일만 (확장 포인트는 `auth/providers/`로 분리)
  - argon2 — 보안적으로 우수하나 빌드 의존성 부담

---

## R-3. 데이터 접근 계층

- **Decision**: **원시 SQL + mysql2/promise**. 필요 시 경량 쿼리 빌더 `Kysely` 도입 검토(보류).
- **Rationale**:
  - Intent-Plan.md가 "SQL 쿼리 기반 데이터 조작" 명시
  - ORM 도입 시 학습용 프로젝트의 진단/디버깅 난이도가 오히려 증가
  - 트랜잭션·복합 join은 SQL 직접 작성이 명확
- **Alternatives considered**:
  - Sequelize / TypeORM — 추상화 비용, 마이그레이션 종속
  - Prisma — DX는 우수하나 MariaDB 일부 기능 한정 + 별도 생성기 도입 부담

---

## R-4. 마이그레이션 도구

- **Decision**: `umzug` + `db/migrations/*.sql` (up/down SQL 파일)
- **Rationale**: 순수 SQL 가시성 + 코드 의존성 최소 + GitLab CI에서 단순 실행
- **Alternatives**: `db-migrate`(JSON 정의 부담), `knex`(쿼리빌더 종속)

---

## R-5. 입력 검증

- **Decision**: 백엔드/프론트엔드 **공유 zod 스키마**. 백엔드는 라우트 핸들러 진입 시 검증, 프론트는 폼 제출 전 검증.
- **Rationale**: TS 친화, 단일 진실 원천(SSOT) 확보
- **Alternatives**: Joi(JS only), class-validator(데코레이터 부담)

---

## R-6. 공공 영양 데이터 적재 전략

- **Decision**: 식약처 식품영양성분 DB CSV를 **빌드/배포 시점에 시드 스크립트로 적재**(`db/seeds/`). 주기 갱신은 분기 단위 수동.
- **Rationale**:
  - 외부 API 호출 실패가 추천 결과에 영향 주지 않도록 격리
  - 영양 검증은 read-heavy → 로컬 테이블 인덱스가 최적
- **Alternatives**:
  - 실시간 API 호출 — 응답시간/장애전파 부담
  - 매일 자동 갱신 cron — MVP 단계 과잉

---

## R-7. 캐싱

- **Decision**: 1차는 **DB 테이블 기반 결과 캐시**(`recommendation_cache` 테이블, 키 = `user_id + normalized_inventory_hash`, TTL 30분). Redis 도입은 후속.
- **Rationale**: 동일 사용자가 짧은 시간에 재요청하는 패턴 보호, 초기 인프라 부담 최소
- **Alternatives**: Redis(인프라 추가), 메모리 캐시(수평 확장 시 무효)

---

## R-8. Rate Limiting

- **Decision**: `express-rate-limit`
  - 일반 endpoint: IP 기준 60 req/min
  - `/api/recommendations` (LLM 호출): 사용자 기준 **20 req/day, 5 req/hour**
- **Rationale**: LLM 비용 가드 + 남용 방지
- **Alternatives**: API Gateway(과잉), Redis 기반 분산 카운터(현 단계 불요)

---

## R-9. 알레르기/금기 검증

- **Decision**: **결정적(deterministic) 검증을 LLM 외부에서 수행**.
  - 사용자 알레르기/기피 식재료 리스트와 레시피의 정규화 재료 목록을 토큰 매칭 + 동의어 사전(예: "땅콩" ≡ "피넛")으로 대조
  - 위반 시 **자동 재생성(최대 1회)**, 재시도도 위반이면 결과 차단 + 대체 제안
- **Rationale**: LLM의 환각/누락 가능성을 결정적 코드가 백스톱
- **Alternatives**: LLM 자체 검증(신뢰 불충분), 영양사 수동 검수(범위 외)

---

## R-10. 영양 계산

- **Decision**: 레시피 각 재료를 식약처 DB와 매칭 → 합산. 매칭 실패 시 "추정치(낮은 신뢰도)" 플래그.
- **Rationale**: 사용자에게 정확도 등급을 노출하여 추천 신뢰성 관리
- **Alternatives**: LLM이 직접 영양 추정(편차 큼)

---

## R-11. 프론트 상태관리

- **Decision**: Pinia 스토어를 도메인별로 분리(`auth`, `profile`, `inventory`, `recommendation`, `history`). Composition API + `<script setup>`.
- **Rationale**: 도메인 응집도 + 코드 분할 용이
- **Alternatives**: Vuex 4(레거시), 단일 거대 스토어(테스트 곤란)

---

## R-12. 테스트 전략

- **Decision**:
  - 백엔드: **Vitest**(유닛) + **supertest**(통합) + **mock LLM 어댑터**
  - 프론트: **Vitest** + `@testing-library/vue`(유닛/컴포넌트), **Playwright**(E2E 핵심 경로 5개)
  - 회귀: 알레르기 차단/유통기한 우선/만족도 반영 시나리오는 E2E 필수
- **Rationale**: 빠른 피드백 루프 + 명세상 안전성 요구 충족
- **Alternatives**: Jest(Vite 통합 부담), Cypress(설치/속도 차이)

---

## R-13. 로깅 / 관측성

- **Decision**: `pino` JSON 로그 + `requestId` 미들웨어 + 외부 호출(LLM/DB) latency 메트릭 수집. APM 도구 도입은 후속.
- **Rationale**: 컨테이너 환경 친화 + 운영 시 grep/jq 즉시 활용

---

## R-14. 비밀값 관리

- **Decision**: 모든 비밀값(DB 비밀번호, JWT 시크릿, LLM API 키)은 `.env`에 보관, **저장소에는 `.env.example`만 커밋**. 프로덕션은 GitLab CI 변수.
- **Rationale**: 노출 위험 차단
- **Alternatives**: HashiCorp Vault(과잉), `.env`을 그대로 커밋(금지)

---

## R-15. 배포

- **Decision**: 3개 컨테이너(frontend / backend / nginx) + 외부 MariaDB. GitLab CI 파이프라인: `lint → test → build → docker push → deploy`.
- **Rationale**: Intent-Plan.md 그대로 반영. MariaDB는 외부 호스트 사용으로 컨테이너 책임 축소.

---

## R-16. 비즈니스 Open Questions에 대한 임시 결정

> spec.md §10의 Q-1~Q-3은 정식 `/speckit.clarify`로 확정 전까지 다음 기본값을 적용한다.

| 질문 | 임시 결정 | 비고 |
|---|---|---|
| Q-1 소셜 로그인 | MVP는 이메일만, `auth/providers/`로 확장점 확보 | 소셜 추가 시 마이그레이션 영향 최소 |
| Q-2 장보기 가격 연동 | MVP는 식재료명/카테고리만 — 가격/링크 없음 | 후속 단계 별도 어댑터 |
| Q-3 데이터 보관 기간 | 탈퇴 후 30일 grace, 이후 hard-delete. 감사 로그는 1년 보관 | 국내 일반 가이드 기준 |

---

**Phase 0 결과**: 모든 NEEDS CLARIFICATION 해소 → Phase 1 진입 가능.
