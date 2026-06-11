# Phase 0 Research: 적응형 식단 추천 고도화 (002)

**Plan**: [plan.md](./plan.md) · **Spec**: [spec.md](./spec.md)

본 단계는 신규 기술 도입을 최소화하고 001 스택 위에서 결정적 알고리즘으로 구현한다. 아래는 각 결정의 근거.

---

## R-1. 개인화 '학습' 방식 — 통계 가중치·규칙 기반

- **Decision**: 사용자별 선호를 `user_preference_weights` 집계 테이블로 유지하고, 피드백/재사용/소비 이벤트 발생 시 순수 도메인 함수(`weightCalculator`)로 재계산(UPSERT)한다. 추천 시점에는 이 가중치를 로드해 프롬프트 힌트와 후보 정렬에 결정적으로 반영한다.
- **Rationale**: spec Clarify에서 ML 파이프라인 미도입 확정. 통계 방식은 (1) 추가 추론 비용 0, (2) 설명 가능(FR-003 근거 표시 용이), (3) 단위 테스트 용이, (4) 콜드스타트 처리 단순.
- **알고리즘 요지**: 카테고리/식재료별 점수 = Σ(피드백 만족도 정규화 × 최신성 가중 × 빈도). 최신성은 시간 감쇠(half-life), 상충 신호는 신뢰도(샘플 수) 임계 미만이면 중립(0)으로 둠(EC-2).
- **Alternatives**: (a) ML 협업필터링 — 데이터량/운영비 부적합, 범위 외. (b) LLM in-context 선호 주입 — 일관성·정확도 측정 어려움, 토큰 비용↑. 기각.

## R-2. 유통기한 임박 판정 — 식품군별 차등 임계

- **Decision**: `ingredient_items`에 `food_group` 컬럼 추가, `food_group_expiry_thresholds(food_group, imminent_days)` 설정 테이블을 시드. 임박 판정 = `DATEDIFF(expires_at, CURRENT_DATE) <= imminent_days`. 식품군은 `foods` 매핑 또는 입력 시 분류.
- **Rationale**: Clarify에서 식품군별 차등 확정. 설정 테이블로 두면 운영 중 임계 조정이 코드 변경 없이 가능. `expires_at`은 001 `ingredient_items`에 이미 존재 → 재사용.
- **기본 시드값(예시, 조정 가능)**: 채소 2, 과일 3, 육류 3, 수산물 2, 유제품 5, 가공/냉동 7, 기타 3.
- **Alternatives**: 단일 임계(3일) — 식품 특성 무시로 폐기 절감 효과↓. 사용자 수동 설정 — UX 부담, 후속 옵션으로 보류.

## R-3. 추천 수정 이력 — 구조화 수집

- **Decision**: `recommendation_edits(recommendation_id, action, target_ref, ...)`로 교체(replace)/제외(exclude)/대체(substitute) 액션을 구조화 저장. 가중치 계산의 음/양 신호 입력으로 사용.
- **Rationale**: 자유 텍스트가 아닌 구조화 수집이라야 학습 입력으로 결정적 사용 가능(FR-002). 기존 `feedbacks`(rating/comment)는 유지하고 별도 테이블로 분리.
- **Alternatives**: feedbacks에 JSON 컬럼 추가 — 질의·집계 불편. 기각.

## R-4. 건강 분석 리포트 — 수동 입력 + 기간 집계

- **Decision**: `health_logs(user_id, logged_at, weight, metrics…)` 수동 입력 테이블. 리포트는 기간 집계(주/월 평균 영양 균형, 체중 추이, 부족/과잉 영양소)를 조회 시 계산(필요 시 캐시). 민감 지표는 암호화.
- **Rationale**: Clarify에서 수동 기록만 확정. 외부 기기/헬스 API 가용성 의존 제거 → 핵심 경로 내부 완결(FR-030). 시각화는 기존 Chart.js 재사용.
- **Alternatives**: 외부 헬스케어 연동 — 범위 외(FR-040 선택 후속). 시계열 DB — 과도, 범위 외.

## R-5. 임박/만료 알림 채널 — 인앱 폴링

- **Decision**: `GET /api/inventory/expiring`로 임박/만료 목록을 조회, 대시보드 배지·목록으로 노출. 별도 푸시/이메일/스케줄러 미도입.
- **Rationale**: Clarify에서 인앱만 확정. 추가 인프라(큐·메일러·웹푸시 키) 불필요 → 범위·운영비 최소(SC-007 충족 가능).
- **Alternatives**: 웹푸시/이메일 — 범위 외. 서버 푸시(SSE) — 임박은 일 단위 변화라 폴링으로 충분.

## R-6. 식단 저장·재사용

- **Decision**: `saved_meal_plans(user_id, source_recommendation_id, name, memo, reuse_count, …)`. 재추천 시 저장 식단을 시드로 사용하고 `reuse_count` 증가 → 가중치 입력.
- **Rationale**: FR-020/021. 재사용 빈도는 강한 선호 신호.

## R-7. 자동 장보기 우선순위

- **Decision**: `shopping_list_items`에 `priority`(또는 priority_score) 추가. 순수 함수 `priorityRanker`가 영양 부족도·임박 대체 필요성으로 정렬.
- **Rationale**: FR-035/036. 기존 장보기 산출에 정렬 레이어만 추가.

## R-8. 소비 패턴 기록

- **Decision**: `consumption_records(user_id, food_id/ingredient_item_id, recommendation_id, consumed_at, …)`. 추천 채택/식단 저장 시 소비 이벤트 적재 → 소비 패턴·가중치 입력.
- **Rationale**: FR-013. 기존 `ingredient_items.consumed/consumed_at`는 현재 재고 상태용이라, 이력 축적은 별도 이벤트 테이블로 분리.

---

## 종합

- **신규 외부 의존성: 0**. 신규 런타임 패키지: 없음(가능하면). 모든 핵심 로직은 결정적 도메인 함수 + SQL 집계.
- **추가 LLM 비용: 0** (학습/임박/리포트/장보기 모두 비호출).
- **남은 NEEDS CLARIFICATION: 없음.**
