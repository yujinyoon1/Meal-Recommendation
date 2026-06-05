# Agent Context — mis2601

> 이 파일은 AI 코딩 에이전트(Claude Code 등)가 본 저장소에서 작업할 때 빠르게 컨텍스트를 잡기 위한 요약입니다. 사람을 위한 상세 문서는 `specs/001-meal-recommendation/` 하위를 참고하세요.

## 프로젝트 개요

- **이름**: AI 기반 1인 가구 맞춤형 식단 추천 서비스
- **목적**: 1인 가구의 식재료 낭비와 불규칙한 식습관을 데이터 기반으로 해결
- **현재 단계**: Phase 1 + 2 구현 완료 (T001~T057) → Phase 3(US1 MVP) 대기
- **명세 위치**: `specs/001-meal-recommendation/spec.md`
- **구현 계획**: `specs/001-meal-recommendation/plan.md`
- **작업 목록**: `specs/001-meal-recommendation/tasks.md`

## 환경 정책 (필수 준수)

- **Frontend dev port**: `9514`
- **Backend dev port**: `9534`
- **공개 도메인**: `p14.sumzip.com` (Nginx TLS 종단 → `/api` → backend:9534, 그 외 → frontend:9514)
- 로컬 dev 환경에서도 위 포트를 그대로 사용. 변경 시 `.env`/`vite.config.ts`/`docker-compose.yml`/`nginx.conf` 4개 모두 동기화.

## 디자인 시스템

- `frontend/DESIGN.md` (Wise-inspired, `npx getdesign add wise` 산출물) 를 UI 작성 전 참조.
- 토큰은 `frontend/src/styles/tokens.css` —
  - **캔버스**: sage `#e8ebe6` (페이지), white `#ffffff` (카드 인테리어).
  - **시그니처 액센트**: lime green `#9fe870` (CTA 전용, 두 번째 액센트 금지).
  - **헤드라인**: Manrope 900 (Wise Sans 대체) + Inter 600 서브헤드/UI. 본문은 sentence case.
  - **둥근 모서리**: 카드/버튼 `--radius-xl` 24px가 캐논. sharp 사각 금지.
  - 레거시 BMW M 토큰명(`--color-m-red`, `--color-bmw-blue`, `.m-stripe`, `.label-uppercase`)은 Wise 팔레트로 alias 처리되어 점진적 교체 진행 중.
- 5종 기초 컴포넌트: `frontend/src/components/ui/` (AppButton, AppInput, AppCard, AppBadge, AppToast) + EmptyState.
- 데이터 시각화 가이드(Python 기반 참고용): `frontend/.agents/skills/data-visualization/SKILL.md` — 실제 차트는 Chart.js로 구현 (Wise 팔레트: lime/accent-cyan/accent-orange).

## 기술 스택 (확정)

- **Frontend**: Vue 3.4+ (Composition API) + TypeScript 5 + Vite 5 + Pinia 2 + Vue Router 4 + Axios + Chart.js
- **Backend**: Node.js 20 LTS + Express 4 + TypeScript 5 + mysql2 + zod + pino + helmet + express-rate-limit
- **DB**: MariaDB 10.6+ (외부 호스트, mysql2 Promise 드라이버)
- **AI**: 어댑터 패턴 — 1차 OpenAI Chat Completions (GPT-4o-mini), Mock 어댑터 별도
- **Auth**: 이메일+비밀번호 + JWT(Access 15m, Refresh 7d httpOnly cookie) + bcrypt(12)
- **Tests**: Vitest + supertest(backend), Vitest + Vue Testing Library + Playwright(frontend)
- **Infra**: Docker + Nginx + GitLab CI/CD

## 디렉터리 구조

```
frontend/        Vue 3 SPA
backend/         Express API
  src/modules/   도메인별 (auth, users, inventory, recommendation, ...)
  src/adapters/  외부 의존성 격리 (llm, nutrition)
  src/domain/    순수 도메인 로직 (prompt, validator, nutrition)
  src/db/        pool, migrations(SQL), seeds
infra/           docker-compose, nginx, GitLab CI
specs/001-meal-recommendation/   현재 작업 중인 feature
```

## 핵심 규칙

1. **SQL 직접 작성** — ORM 없음. mysql2 + Promise 사용.
2. **민감 컬럼은 앱 레벨 AES-256-GCM 암호화** (alergies, diseases).
3. **LLM은 어댑터 인터페이스 뒤에서만 호출** — 직접 SDK 호출 금지.
4. **알레르기/기피 검증은 결정적 코드로 LLM 외부에서 수행** (Spec FR-015).
5. **비밀값은 `.env`에만** — 저장소에 커밋 금지. `.env.example`만 커밋.
6. **rate limit**: `/api/recommendations`는 사용자당 5/hour, 20/day.
7. **추천 응답 P95 ≤ 30s** (LLM timeout 25s + 1회 재시도).
8. **응답에 "의학적 진단/처방 아님" 면책 포함** (FR-017).

## 명세 추적성

각 PR/커밋은 spec FR 번호(예: FR-010) 또는 SC 번호를 참조하세요.

## 다음 단계

- **현재 진행: `002-adaptive-meal-recommendation` (중기 단계)** — spec/plan/research/data-model/contracts 완료, `/speckit.tasks` 대기.
  - 핵심: 통계 기반 선호 가중치 학습(`user_preference_weights`), 식품군별 유통기한 임박 관리(`food_group` + `food_group_expiry_thresholds`), 추천 수정 이력(`recommendation_edits`), 소비 기록(`consumption_records`), 식단 저장/재사용(`saved_meal_plans`), 건강 리포트(`health_logs`, 수동 입력), 장보기 우선순위.
  - 신규 백엔드 모듈: `preferences`, `health`, `mealplans` (+ `inventory`/`recommendation`/`feedback`/`shopping` 확장). 도메인: `preferences`/`expiry`/`health`/`shopping`.
  - 결정(clarify 2026-06-05): 학습=통계 가중치(ML 미도입), 알림=인앱만, 건강데이터=수동만, 임박=식품군 차등. **신규 외부 의존성·추가 LLM 호출 없음**.
  - 규칙: 선호 가중치는 결정적 알레르기 차단(규칙 4)을 절대 무력화 금지 (spec FR-005). 마이그레이션 020~027.
- 운영: 서비스는 `./check_project.sh {start|stop|restart|status}` (pm2: p14-frontend:9514 / p14-backend:9534).
- 완료: 001 MVP(Auth/Profile/Inventory/Recommendation/Feedback/Shopping/History/Privacy/Bookmarks).
