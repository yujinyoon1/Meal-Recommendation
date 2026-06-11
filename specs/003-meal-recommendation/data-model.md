# Data Model: AI 기반 스마트 식단 추천 플랫폼 (통합)

**Feature**: `003-meal-recommendation`
**Spec**: [spec.md](./spec.md)
**Created**: 2026-06-11

001(테이블 001~019)·002(020~027) + 운영 후속(028~029)을 통합 기술한다. 모든 테이블 `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`. 적용 마이그레이션 **001~029 (pending 0)**.

---

## 1. 기반 — 회원 · 프로필 · 영양 마스터 (001)

| # | 테이블 | 핵심 컬럼 | FR |
|---|---|---|---|
| 001 | `users` | email(UNIQUE), password_hash, login timestamps(018) | FR-050 |
| 002 | `basic_profiles` | user_id, 닉네임/기본정보 | FR-051 |
| 003 | `health_profiles` | 키/체중/목표, **알러지·질환 암호화** | FR-051/038 |
| 004 | `diet_preferences` | 선호/기피 식이 | FR-051 |
| 005 | `consent_records` | 동의 항목·시점 | FR-038 |
| 006 | `foods` | code, name_ko, category, kcal/탄단지/섬유/나트륨, FULLTEXT(name_ko) | FR-054 |
| 007 | `ingredient_alias` | 별칭 → 표준 식재료 매핑 | FR-054 |
| 008 | `allergy_disease_masters` | 알러지·질환 마스터 | FR-055 |
| 009 | `ingredient_items` | user_id, name, quantity, **expires_at**, consumed | FR-052 |

## 2. 추천 · 영양 · 피드백 (001)

| # | 테이블 | 핵심 컬럼 | FR |
|---|---|---|---|
| 010 | `recommendation_requests` | user_id, ingredients, status | FR-053 |
| 011 | `recipes` | recommendation_id, 메뉴/조리 | FR-053 |
| 012 | `meal_plans` (+join) | 식단 구성 | FR-053 |
| 013 | `nutrition_analyses` | total_kcal/탄단지/섬유/나트륨, rda_ratio_json, confidence | FR-054 |
| 014 | `shopping_list_items` | 부족 식재료·수량 | FR-035 |
| 015 | `feedbacks` | 만족도·코멘트 | FR-002 |
| 016 | `recommendation_cache` | 캐시(비용 가드) | 비기능 |
| 017 | `audit_logs` | 감사 로그 | FR-038 |
| 019 | `recipe_bookmarks` | 즐겨찾기 | (부가) |

## 3. 적응형 고도화 — 학습 · 유통기한 · 건강 (002)

| # | 테이블/변경 | 핵심 컬럼 | FR |
|---|---|---|---|
| 020 | `[~] ingredient_items` | `food_group VARCHAR(30)` + `idx_ii_user_group_exp(user_id,food_group,expires_at)` | FR-010/012 |
| 021 | `[+] food_group_expiry_thresholds` | PK `food_group`, `imminent_days TINYINT` | FR-010/011 |
| 022 | `[+] user_preference_weights` | PK `(user_id,dimension,key_ref)`, weight, confidence, sample_count | FR-001/003/004 |
| 023 | `[+] recommendation_edits` | FK→recommendation_requests, action/target_type/target_ref | FR-002 |
| 024 | `[+] consumption_records` | FK→users(CASCADE), food/item/recommendation(SET NULL) | FR-013 |
| 025 | `[+] saved_meal_plans` | FK→users, source_recommendation(SET NULL), reuse_count, last_used_at, memo | FR-020/021 |
| 026 | `[+] health_logs` | UNIQUE(user_id,logged_at), `metrics_enc VARBINARY` (+선택 `health_reports`) | FR-030/031/038 |
| 027 | `[~] shopping_list_items` | `priority_score SMALLINT`, `reason VARCHAR(100)` | FR-035/036 |

## 4. 운영 후속 (028~029)

| # | 테이블/시드 | 내용 |
|---|---|---|
| 028 | `[+] shopping_cart_items` | 장바구니 항목 |
| 029 | seed | mock 레시피 미등록 재료 ~58종 영양값 시드(매칭률 43%→~95%), source='seed-029' |

시드: `seed-foods`(006), `seed-food-group-thresholds`(021).

---

## 5. 상태 · 생애주기

- `ingredient_items`: consumed 상태 유지 + 임박은 파생 계산(저장 X) — `expires_at` × `food_group_expiry_thresholds` 질의 시점 판정.
- `user_preference_weights`: 이벤트(피드백/수정/재사용/소비) 시 UPSERT, 사용자 삭제 시 CASCADE.
- `health_logs`: 일자별 UNIQUE, 갱신 UPSERT, 삭제 시 CASCADE(개인정보 삭제권 일치).

## 6. FR ↔ 데이터 추적표

| FR | 테이블/컬럼 |
|---|---|
| FR-050~052 | `users`, `basic_profiles`, `health_profiles`, `diet_preferences`, `ingredient_items` |
| FR-053/054 | `recommendation_requests`, `recipes`, `nutrition_analyses`, `foods`, `ingredient_alias` |
| FR-055 | `allergy_disease_masters`, `health_profiles`(알러지) — 결정적 검증 입력 |
| FR-001/003/004 | `user_preference_weights` |
| FR-002 | `recommendation_edits`, `feedbacks` |
| FR-010/011/012 | `ingredient_items.food_group`, `food_group_expiry_thresholds`, `ingredient_items.expires_at` |
| FR-013 | `consumption_records` |
| FR-020/021 | `saved_meal_plans` |
| FR-030/031/032 | `health_logs`, `health_reports`, `nutrition_analyses` |
| FR-035/036 | `shopping_list_items.priority_score/reason`, `shopping_cart_items` |
| FR-037 | 전 테이블 FK 관계 |
| FR-038 | `health_logs.metrics_enc`, `health_profiles`(암호화), `consent_records`, `audit_logs` |
