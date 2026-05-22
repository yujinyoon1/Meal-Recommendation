# Quickstart — AI 1인 가구 맞춤형 식단 추천 서비스

**Feature**: `001-meal-recommendation`
**Audience**: 개발자가 처음 로컬에서 서비스를 띄울 때 따라가는 가이드

---

## 1. 사전 요구사항

| 도구 | 버전 |
|---|---|
| Node.js | 20 LTS |
| npm | 10+ |
| Docker / Docker Desktop | 최신 |
| MariaDB 클라이언트 (선택) | 10.6+ |

> ⚠️ Intent-Plan.md 주의 사항: **Homebrew mysql 바이너리 사용 금지**. DB 접속은 Docker 컨테이너 또는 mysql2 드라이버로 수행.

---

## 2. 저장소 초기 설정

```bash
# 의존성 설치
cd frontend && npm install
cd ../backend && npm install
```

### 2.1 환경변수 설정 (`backend/.env`)

```env
# 서버
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# DB (Intent-Plan.md 제공값을 그대로 .env에 보관, 저장소에는 커밋 금지)
DB_HOST=mis.iptime.org
DB_PORT=13306
DB_USER=__FROM_INTENT_PLAN__
DB_PASSWORD=__FROM_INTENT_PLAN__
DB_NAME=__FROM_INTENT_PLAN__
DB_POOL_LIMIT=10

# JWT
JWT_ACCESS_SECRET=replace_me_32+_chars
JWT_REFRESH_SECRET=replace_me_32+_chars
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# 민감 컬럼 암호화
APP_ENCRYPTION_KEY=base64_32bytes

# LLM
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=sk-...
LLM_TIMEOUT_MS=25000

# Rate Limit (recommendation)
REC_RATE_PER_HOUR=5
REC_RATE_PER_DAY=20
```

### 2.2 환경변수 설정 (`frontend/.env.development`)

```env
VITE_API_BASE=http://localhost:3000/api
```

---

## 3. 데이터베이스 준비

```bash
# 1) 마이그레이션 실행 (모든 테이블 생성)
cd backend
npm run migrate

# 2) 식약처 영양 DB 시드 (CSV → foods 테이블)
npm run seed:foods

# 3) 알레르기/질병 마스터 시드
npm run seed:masters
```

> 외부 MariaDB 호스트 사용이 어려운 환경이라면 `infra/docker-compose.yml`의 로컬 MariaDB 프로파일을 활성화한다.
> ```bash
> docker compose --profile local-db up -d
> ```

---

## 4. 개발 서버 실행

터미널 2개:

```bash
# 1) 백엔드 (http://localhost:3000)
cd backend && npm run dev

# 2) 프론트엔드 (http://localhost:5173)
cd frontend && npm run dev
```

브라우저에서 http://localhost:5173 접속 → 회원가입 → 온보딩 진행.

---

## 5. 핵심 유스케이스 검증 (수동)

| 시나리오 | 동작 | 기대 결과 |
|---|---|---|
| 1. 회원가입 → 프로필 | `/onboarding`에서 기본/건강/식습관 입력 | 메인 대시보드 진입 |
| 2. 보유 식재료 입력 | "계란 2개, 양파 1개, 두부 반 모" 입력 | 정규화된 식재료 카드 표시 |
| 3. 추천 받기 | "추천받기" 클릭 | 30초 이내 1식 레시피 + 영양 차트 + 장보기 리스트 |
| 4. 알레르기 차단 | 건강 프로필에 "땅콩" 추가 후 견과 포함 재료로 재추천 | 견과 미포함 레시피만 표시 |
| 5. 피드백 | 별점 4 + 코멘트 등록 | 이력 화면에서 별점 확인 |
| 6. 데이터 내보내기 | 설정 > 내 데이터 다운로드 | JSON 파일 다운로드 |
| 7. 탈퇴 | 설정 > 회원 탈퇴 | 30일 grace 안내 |

---

## 6. 자동 테스트

```bash
# 백엔드
cd backend
npm run test            # Vitest 유닛
npm run test:integration  # supertest + Mock LLM 어댑터

# 프론트엔드
cd frontend
npm run test            # Vitest + Vue Testing Library
npm run e2e             # Playwright (백엔드/프론트 둘 다 실행 중이어야 함)
```

### 6.1 E2E 핵심 회귀 5종

1. 회원가입 → 프로필 → 추천 골든 패스
2. 알레르기 차단 회귀
3. 유통기한 임박 재료 우선 사용
4. 피드백 반영 후 추천 변화
5. 데이터 내보내기/탈퇴

---

## 7. Docker로 전체 실행 (프로덕션 시뮬레이션)

```bash
# 빌드 + 기동
cd infra
docker compose -f docker-compose.prod.yml up --build -d

# Nginx 진입점
open https://localhost
```

컴포지션:
- `frontend` (정적 자산)
- `backend` (Express)
- `nginx` (TLS 종단 + /api 프록시)

> DB는 외부 호스트(`mis.iptime.org`) 사용. 로컬 전용 DB가 필요하면 `--profile local-db`.

---

## 8. 흔한 문제

| 증상 | 원인 / 해결 |
|---|---|
| `ECONNREFUSED mis.iptime.org:13306` | 네트워크 또는 DB 점검 — backend의 `/health/ready`로 확인 |
| LLM 500 / 타임아웃 | `LLM_API_KEY` 확인, Mock 어댑터로 격리 (`LLM_PROVIDER=mock`) |
| 한글 깨짐 | DB 문자셋 `utf8mb4` / 연결 옵션 `charset=utf8mb4` 확인 |
| 회원가입 시 동의 누락 오류 | `terms`와 `privacy` 동의는 필수 (FR-024) |
| 추천이 비어 있음 | 식재료가 너무 적거나 알레르기 충돌 — 응답의 `warnings` 확인 |

---

## 9. 다음 작업

- `/speckit.tasks` 로 dependency-ordered task 목록 생성
- `/speckit.implement` 로 단계별 구현 진입

