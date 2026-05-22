# Phase 1 — Data Model

**Feature**: `001-meal-recommendation`
**DB**: MariaDB 10.6+ (utf8mb4, InnoDB)
**Created**: 2026-05-15

---

## 1. 명명/표기 규칙

- 테이블: 복수형 snake_case (예: `users`, `health_profiles`)
- 컬럼: snake_case
- PK: `id BIGINT UNSIGNED AUTO_INCREMENT`
- 모든 테이블: `created_at`, `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
- 소프트 삭제 필요 시: `deleted_at TIMESTAMP NULL`
- 외래키: `RESTRICT` 기본, 사용자 삭제 경로는 별도 정리 작업 사용
- 문자셋: `utf8mb4` / `utf8mb4_unicode_ci`

---

## 2. ER 개요

```
users 1───* basic_profiles               (1:1 effective via latest)
      1───* health_profiles              (변경 이력 보존)
      1───* diet_preferences             (변경 이력 보존)
      1───* consent_records
      1───* ingredient_items             (현재 인벤토리)
      1───* recommendation_requests
                   │
                   ├─1───* meal_plans
                   │              └───* meal_plan_recipes ───* recipes
                   ├─1───1 nutrition_analyses
                   ├─1───* shopping_list_items
                   └─1───* feedbacks
users 1───* audit_logs
foods (식약처 시드 마스터, 비-user)
allergy_master (마스터)
disease_master (마스터)
ingredient_alias (정규화 사전)
recommendation_cache
```

---

## 3. 테이블 정의

### 3.1 `users` *(FR-001, FR-025)*

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| email | VARCHAR(255) | UNIQUE, NOT NULL | |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt |
| display_name | VARCHAR(100) | NULL | |
| status | ENUM('active','suspended','withdrawn') | NOT NULL DEFAULT 'active' | |
| deleted_at | TIMESTAMP | NULL | 30일 grace |
| created_at / updated_at | TIMESTAMP | | |

Indexes: `UNIQUE(email)`, `INDEX(status, deleted_at)`

---

### 3.2 `basic_profiles` *(FR-002)*

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | BIGINT UNSIGNED | PK |
| user_id | BIGINT UNSIGNED | FK→users.id, NOT NULL |
| age | TINYINT UNSIGNED | NULL, CHECK BETWEEN 10 AND 120 |
| gender | ENUM('male','female','other','prefer_not_say') | NULL |
| height_cm | DECIMAL(5,2) | NULL, CHECK BETWEEN 80 AND 250 |
| weight_kg | DECIMAL(5,2) | NULL, CHECK BETWEEN 20 AND 300 |
| bmi | DECIMAL(5,2) GENERATED ALWAYS AS (weight_kg / POWER(height_cm/100,2)) STORED | |
| valid_from | TIMESTAMP | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| valid_to | TIMESTAMP | NULL |

Indexes: `INDEX(user_id, valid_from DESC)`. 최신 레코드는 `valid_to IS NULL`.

---

### 3.3 `health_profiles` *(FR-003, FR-023 — 민감정보)*

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | BIGINT UNSIGNED | PK |
| user_id | BIGINT UNSIGNED | FK |
| allergies_enc | VARBINARY(2048) | **AES-256-GCM 암호화 JSON** (예: `["peanut","shellfish"]`) |
| diseases_enc | VARBINARY(2048) | 암호화 JSON |
| goal | ENUM('lose_weight','maintain','gain_muscle') | NULL |
| target_calories_kcal | SMALLINT UNSIGNED | NULL |
| valid_from / valid_to | TIMESTAMP | 이력 보존 |

Indexes: `INDEX(user_id, valid_from DESC)`

> 📌 **암호화 키 관리**: 마스터키는 환경변수, 컬럼별 DEK는 KEK로 래핑 후 별도 테이블에 저장 가능. MVP에서는 단일 마스터키로 시작.

---

### 3.4 `diet_preferences` *(FR-004)*

| 컬럼 | 타입 |
|---|---|
| id | BIGINT UNSIGNED PK |
| user_id | BIGINT UNSIGNED FK |
| meals_per_day | TINYINT UNSIGNED |
| dining_out_per_week | TINYINT UNSIGNED |
| delivery_per_week | TINYINT UNSIGNED |
| avoid_ingredients_json | JSON |
| prefer_categories_json | JSON |
| cooking_time_max_min | SMALLINT UNSIGNED DEFAULT 30 |
| valid_from / valid_to | TIMESTAMP |

---

### 3.5 `consent_records` *(FR-024, FR-025)*

| 컬럼 | 타입 |
|---|---|
| id | BIGINT UNSIGNED PK |
| user_id | BIGINT UNSIGNED FK |
| consent_type | ENUM('terms','privacy','sensitive_health','marketing','third_party_share') |
| granted | BOOLEAN |
| version | VARCHAR(20) |
| granted_at / revoked_at | TIMESTAMP |
| evidence_ip | VARBINARY(16) |

Indexes: `INDEX(user_id, consent_type, granted_at DESC)`

---

### 3.6 `ingredient_items` *(FR-006~009)*

| 컬럼 | 타입 |
|---|---|
| id | BIGINT UNSIGNED PK |
| user_id | BIGINT UNSIGNED FK |
| raw_text | VARCHAR(255) | 사용자가 입력한 원문 |
| food_id | BIGINT UNSIGNED FK→foods.id NULL | 정규화 매핑 (실패 시 NULL) |
| quantity | DECIMAL(8,2) NULL |
| unit | VARCHAR(20) NULL |
| expires_at | DATE NULL |
| consumed | BOOLEAN DEFAULT FALSE |
| consumed_at | TIMESTAMP NULL |

Indexes: `INDEX(user_id, consumed, expires_at)`

---

### 3.7 `foods` *(공공 영양 DB 시드, FR-016)*

| 컬럼 | 타입 |
|---|---|
| id | BIGINT UNSIGNED PK |
| code | VARCHAR(40) UNIQUE | 식약처 코드 |
| name_ko | VARCHAR(200) NOT NULL |
| category | VARCHAR(80) |
| kcal_per_100g | DECIMAL(7,2) |
| carb_g | DECIMAL(7,2) |
| protein_g | DECIMAL(7,2) |
| fat_g | DECIMAL(7,2) |
| fiber_g | DECIMAL(7,2) |
| sodium_mg | DECIMAL(8,2) |
| source | VARCHAR(80) | 데이터 출처 |
| version | VARCHAR(20) | 시드 버전 |

Indexes: `FULLTEXT(name_ko)`, `INDEX(category)`

---

### 3.8 `ingredient_alias` *(FR-007)*

| 컬럼 | 타입 |
|---|---|
| id | BIGINT UNSIGNED PK |
| alias | VARCHAR(120) UNIQUE |
| food_id | BIGINT UNSIGNED FK→foods.id |

예: `"피넛" → 땅콩`, `"양파 1개" → 양파`

---

### 3.9 `allergy_master`, `disease_master`

| 컬럼 | 타입 |
|---|---|
| id | INT UNSIGNED PK |
| code | VARCHAR(40) UNIQUE |
| name_ko | VARCHAR(100) |
| name_en | VARCHAR(100) |
| description | VARCHAR(500) |

---

### 3.10 `recommendation_requests` *(FR-010~014)*

| 컬럼 | 타입 |
|---|---|
| id | BIGINT UNSIGNED PK |
| user_id | BIGINT UNSIGNED FK |
| request_at | TIMESTAMP |
| profile_snapshot_json | JSON | 요청 시점 프로필 캡처 |
| inventory_snapshot_json | JSON | 요청 시점 인벤토리 캡처 |
| prompt_version | VARCHAR(20) |
| llm_provider | VARCHAR(40) |
| llm_model | VARCHAR(80) |
| llm_latency_ms | INT UNSIGNED |
| status | ENUM('pending','generated','validated','rejected','failed') |
| failure_reason | VARCHAR(255) NULL |

Indexes: `INDEX(user_id, request_at DESC)`

---

### 3.11 `meal_plans`

| 컬럼 | 타입 |
|---|---|
| id | BIGINT UNSIGNED PK |
| recommendation_id | BIGINT UNSIGNED FK→recommendation_requests.id |
| label | VARCHAR(60) | 예: "1식", "1일" |
| sequence | TINYINT UNSIGNED |

---

### 3.12 `recipes`

| 컬럼 | 타입 |
|---|---|
| id | BIGINT UNSIGNED PK |
| name | VARCHAR(200) NOT NULL |
| description | TEXT |
| ingredients_json | JSON | [{food_id, name, quantity, unit, substitute?}] |
| steps_json | JSON | string[] |
| est_cooking_min | SMALLINT UNSIGNED |
| difficulty | ENUM('easy','medium','hard') DEFAULT 'easy' |
| created_at | TIMESTAMP |

---

### 3.13 `meal_plan_recipes` *(N:M)*

| 컬럼 | 타입 |
|---|---|
| meal_plan_id | BIGINT UNSIGNED FK, PK |
| recipe_id | BIGINT UNSIGNED FK, PK |
| serving_count | DECIMAL(4,2) DEFAULT 1.00 |

---

### 3.14 `nutrition_analyses` *(FR-016)*

| 컬럼 | 타입 |
|---|---|
| id | BIGINT UNSIGNED PK |
| recommendation_id | BIGINT UNSIGNED FK UNIQUE |
| total_kcal | DECIMAL(7,2) |
| carb_g / protein_g / fat_g / fiber_g | DECIMAL(7,2) |
| sodium_mg | DECIMAL(8,2) |
| rda_ratio_json | JSON | 권장량 대비 비율 |
| confidence | ENUM('high','medium','low') | 매칭 성공률 기반 |

---

### 3.15 `shopping_list_items` *(FR-021, FR-022)*

| 컬럼 | 타입 |
|---|---|
| id | BIGINT UNSIGNED PK |
| recommendation_id | BIGINT UNSIGNED FK |
| food_id | BIGINT UNSIGNED FK→foods.id NULL |
| name | VARCHAR(200) |
| category | VARCHAR(80) |
| reason | VARCHAR(255) | 예: "단백질 부족 보충" |
| suggested_qty | VARCHAR(60) | 정성 표현 가능 |

---

### 3.16 `feedbacks` *(FR-018, FR-019)*

| 컬럼 | 타입 |
|---|---|
| id | BIGINT UNSIGNED PK |
| recommendation_id | BIGINT UNSIGNED FK |
| user_id | BIGINT UNSIGNED FK |
| rating | TINYINT UNSIGNED CHECK BETWEEN 1 AND 5 |
| comment | VARCHAR(1000) |
| created_at | TIMESTAMP |

Indexes: `INDEX(user_id, created_at DESC)`, `INDEX(recommendation_id)`

---

### 3.17 `recommendation_cache` *(R-7)*

| 컬럼 | 타입 |
|---|---|
| cache_key | CHAR(64) PK | SHA-256(user_id + normalized_inventory + profile_version) |
| recommendation_id | BIGINT UNSIGNED FK |
| expires_at | TIMESTAMP |

Indexes: `INDEX(expires_at)`

---

### 3.18 `audit_logs` *(FR-026)*

| 컬럼 | 타입 |
|---|---|
| id | BIGINT UNSIGNED PK |
| actor_user_id | BIGINT UNSIGNED FK NULL | 시스템 작업은 NULL |
| action | VARCHAR(80) | 예: `health_profile.read`, `data.export`, `user.delete` |
| target_user_id | BIGINT UNSIGNED FK NULL |
| target_table | VARCHAR(80) NULL |
| target_id | BIGINT UNSIGNED NULL |
| metadata_json | JSON |
| ip | VARBINARY(16) |
| created_at | TIMESTAMP |

Indexes: `INDEX(target_user_id, created_at DESC)`, `INDEX(action, created_at DESC)`

---

## 4. 상태 전이

### 4.1 `users.status`
```
active ──(suspend)──▶ suspended ──(reactivate)──▶ active
active ──(withdraw)──▶ withdrawn (deleted_at set) ──(30d cron)──▶ HARD DELETE
```

### 4.2 `recommendation_requests.status`
```
pending → generated → validated → (saved)
        ↘         ↘ rejected (allergy violation persists) → end
        ↘ failed (LLM error / timeout) → end
```

---

## 5. 인덱싱·성능 가이드

- 핵심 조회 패턴
  - 사용자 추천 히스토리: `recommendation_requests(user_id, request_at DESC)` 커버
  - 만료 임박 인벤토리: `ingredient_items(user_id, consumed, expires_at)`
  - 식품명 검색: `foods FULLTEXT(name_ko)` + `ingredient_alias(alias)`
- 캐시 만료 청소: cron으로 `recommendation_cache WHERE expires_at < NOW()` 일 1회 삭제
- 감사 로그 파티셔닝: 1년 후 도입 검토 (월 단위 RANGE)

---

## 6. 데이터 보존/삭제 정책 매핑

| 데이터 | 처리 |
|---|---|
| `users` 본인 데이터 | 탈퇴 시 `deleted_at` 마킹, 30일 후 cron이 본인 보유 행(`basic_profiles`, `health_profiles`, `diet_preferences`, `ingredient_items`, `recommendation_*`, `feedbacks`)을 hard delete |
| `audit_logs` | 1년 보존 후 archive 또는 삭제 |
| `consent_records` | 법적 입증 목적상 5년 보관 후 삭제 |
| `foods` / `*_master` | 사용자 비종속, 무기한 |

---

## 7. FR ↔ Table 추적 매트릭스 (요약)

| FR | Table(s) |
|---|---|
| FR-001 / 025 | users, audit_logs |
| FR-002 | basic_profiles |
| FR-003 | health_profiles (암호화) |
| FR-004 | diet_preferences |
| FR-005 | 모든 프로필 테이블 `valid_from/valid_to` |
| FR-006~009 | ingredient_items, ingredient_alias, foods |
| FR-010~014 | recommendation_requests, recipes, meal_plans, meal_plan_recipes |
| FR-015 | recipes.ingredients_json + health_profiles.allergies_enc (앱 레벨) |
| FR-016 | nutrition_analyses + foods |
| FR-017 | (앱 응답 텍스트, DB 미적용) |
| FR-018~020 | feedbacks, recommendation_requests |
| FR-021~022 | shopping_list_items |
| FR-023~026 | 암호화 컬럼, consent_records, audit_logs |
| FR-027~029 | (운영 — DB 외 모니터링) |

