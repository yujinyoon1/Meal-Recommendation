# Quickstart: 적응형 식단 추천 고도화 (002)

**Plan**: [plan.md](./plan.md) · **Data Model**: [data-model.md](./data-model.md)

001 환경이 이미 구동 중이라는 전제(서비스는 `check_project.sh`로 관리: frontend:9514 / backend:9534, 공개 `https://p14.sumzip.com`).

## 1. 사전 조건

- 001 마이그레이션(001~019) 적용 완료, `backend/.env` 실값 존재.
- DB: 외부 호스트(`.env`의 DB_*). LLM: 어댑터(mock 또는 실 제공자).

## 2. 마이그레이션 & 시드 (002 델타)

```bash
cd backend
npm run migrate            # 020~027 적용 (ingredient food_group, thresholds, weights, edits,
                           #               consumption, saved_meal_plans, health_logs, shopping priority)
npm run migrate:status     # pending [] 확인
npx tsx src/db/seeds/seed-food-group-thresholds.ts   # 식품군별 임박 임계 시드
```

## 3. 로컬 검증 절차 (수용 시나리오 매핑)

```bash
# 서비스 기동
./check_project.sh restart && ./check_project.sh status   # db/llm ready 확인
```

| 검증 | 방법 | 기대 (spec) |
|---|---|---|
| 임박 조회 | `GET /api/inventory/expiring` | 식품군 임계 기준 imminent/expired 분리 (AS-2, AS-3) |
| 유통기한 수정 | `PATCH /api/inventory/items/{id}/expiry` | food_group/expires_at 반영 |
| 선호 가중치 | 피드백/수정 N건 후 `GET /api/preferences/weights` | cold_start=false, 가중치 반영 (AS-1) |
| 추천 근거 | `POST /api/recommendations` | 응답 rationale[]에 "선호 반영/임박 우선" 표기 (FR-003) |
| 안전 우선 | 알레르기 등록 후 추천 | 가중치와 무관하게 차단 (AS 안전, FR-005) |
| 추천 수정 | `POST /api/recommendations/{id}/edits` | 201, 이후 추천에 반영 (AS-4) |
| 식단 저장/재사용 | `POST /api/meal-plans`, `POST /api/meal-plans/{id}/reuse` | reuse_count 증가 (AS-5) |
| 건강 기록/리포트 | `POST /api/health/logs` × N → `GET /api/health/report` | 체중 추이·영양 균형 그래프, 면책 포함 (AS-6, FR-034) |
| 장보기 우선순위 | `GET /api/shopping/list` | priority_score 정렬·reason 표기 (AS-7) |

## 4. 테스트

```bash
# backend
cd backend && npm test           # 도메인 단위: weightCalculator, expiryEvaluator, reportAggregator, priorityRanker
                                 # 통합(supertest): expiring/edits/meal-plans/health
# frontend
cd frontend && npm run test:run  # health 차트/캘린더 컴포넌트 (추가 시)
```

핵심 단위 테스트 대상(순수 도메인):
- `domain/preferences/weightCalculator` — 최신성·빈도 가중, 상충 중립화(EC-2), 콜드스타트(EC-4)
- `domain/expiry/expiryEvaluator` — 식품군 차등 임계 경계값
- `domain/health/reportAggregator` — 기간 집계·부족/과잉, 데이터 희소(EC-5)
- `domain/shopping/priorityRanker` — 부족도·임박 대체 우선순위

## 5. 롤백

```bash
cd backend && npm run migrate:down   # 027 → ... 역순. 신규 테이블은 데이터 손실 주의(건강 기록 포함)
```

## 6. 다음 단계

`/speckit.tasks` 로 의존성 기반 작업 목록 생성 → 구현.
