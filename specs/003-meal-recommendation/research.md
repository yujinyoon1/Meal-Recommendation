# Phase 0 Research: AI 기반 스마트 식단 추천 플랫폼 (통합)

**Feature**: `003-meal-recommendation`
**Plan**: [plan.md](./plan.md)
**Created**: 2026-06-11

001(단기)·002(중기)에서 결정·검증된 연구 결과를 통합한다. NEEDS CLARIFICATION 0건.

---

## R-1. 개인화 학습 방식

- **Decision**: 통계 가중치·규칙 기반 개인화(가중 평균, 최신성·빈도 가중, half-life 감쇠). 별도 ML 학습 파이프라인·벡터 저장소 미도입.
- **Rationale**: 데이터 규모·비용·운영 단순성. 추천당 추가 LLM 호출 0으로 P95 ≤ 30s 유지. 결정적이라 디버깅·회귀 테스트 용이.
- **Alternatives**: (a) 임베딩 기반 협업필터 — 데이터/인프라 과대, (b) 온라인 ML — 운영 복잡·콜드스타트 취약. 모두 본 단계 보류.

## R-2. 유통기한 임박 판정

- **Decision**: 식품군별 차등 임계를 `food_group_expiry_thresholds` 설정 테이블로 시드(채소2/과일3/육류3/수산물2/유제품5/가공냉동7/기타3), `ingredient_items.expires_at` 기준 SQL `DATEDIFF` 결정 계산.
- **Rationale**: 식품군마다 부패 속도 상이. 설정 테이블화로 임계 조정이 코드 변경 없이 가능. 임박은 저장하지 않고 질의 시점 파생 계산 → 일관성.
- **Alternatives**: 단일 고정 임계 — 식품 특성 무시. 임박 상태 컬럼 캐시 — 시점 불일치 위험.

## R-3. 피드백·추천 수정 수집

- **Decision**: `feedbacks`(만족도·코멘트) + `recommendation_edits`(action/target_type/target_ref로 교체·제외·대체 구조화) → 가중치 입력 이벤트.
- **Rationale**: 명시 피드백 외 "수정 행동"이 강한 선호 신호. 구조화 수집으로 학습 입력 일관.

## R-4. 건강 리포트

- **Decision**: 수동 입력 `health_logs`(체중·지표, 일자 UNIQUE, `metrics_enc` 암호화) + 기간 집계(주/월 평균, 부족/과잉). 기존 `nutrition_analyses` 재사용. 외부 연동 없음.
- **Rationale**: 외부 기기/헬스 API 가용성·개인정보 부담. 핵심 경로는 수동 데이터로 완결, 외부는 FR-040 선택 후속.

## R-5. 임박 알림 전달

- **Decision**: 인앱 폴링 조회(`GET /api/inventory/expiring`) + 대시보드 배지. 큐/푸시/이메일 인프라 미도입.
- **Rationale**: 1인 가구 사용 패턴상 앱 진입 시 통지로 충분. 외부 채널은 비용·동의 부담.

## R-6. 영양 계산·매칭

- **Decision**: 공공 영양 DB 시드(`foods`, 100g당 칼로리·탄단지·식이섬유·나트륨) + `foodLookup`(ingredient_alias 직접 매칭 → name_ko FULLTEXT BOOLEAN → 실패 시 confidence='low').
- **Rationale**: 키리스 환경에서 결정적 계산. 미매칭 재료는 029 시드로 보강(매칭률 ~95%).

## R-7. 추천 다양성·안전

- **Decision**: DiversityGuard(최근 N건 유사도 비교 후 변형) + AllergyValidator를 가중치 적용 **이후** 최종 게이트로 고정.
- **Rationale**: 학습이 안전을 무력화하지 못하도록 순서 강제(FR-005/055). 다양성으로 학습 고착 방지(EC-7).

---

→ **결론**: 신규 외부 의존성·추가 LLM 호출 없이 전 기능 달성. NEEDS CLARIFICATION 0건 → Phase 1 진행.
