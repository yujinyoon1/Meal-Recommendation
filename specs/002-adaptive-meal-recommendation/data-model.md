# Data Model: 적응형 식단 추천 고도화 (002)

**Plan**: [plan.md](./plan.md) · **Spec**: [spec.md](./spec.md)
**Base**: [001 data-model](../001-meal-recommendation/data-model.md) (테이블 001~019 존재). 본 문서는 **델타**만 기술한다.

표기: `[+]` 신규 테이블, `[~]` 기존 테이블 확장. 모든 신규 테이블은 `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.

---

## 1. 확장 테이블

### 1.1 `[~] ingredient_items` — 식품군 추가 *(FR-010, FR-012)*

기존 `expires_at / consumed / consumed_at` 재사용. 임박 차등 판정을 위해 식품군 분류 추가.

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `food_group` | `VARCHAR(30) NULL` | 채소/과일/육류/수산물/유제품/가공·냉동/기타. `foods` 매핑 또는 입력 시 분류 |

- 마이그레이션: `020_add_ingredient_food_group.sql` (`ALTER TABLE ... ADD COLUMN`, 인덱스 `KEY idx_ii_user_group_exp (user_id, food_group, expires_at)`).

### 1.2 `[~] shopping_list_items` — 우선순위 *(FR-035, FR-036)*

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `priority_score` | `SMALLINT NOT NULL DEFAULT 0` | 높을수록 우선. 영양 부족도·임박 대체 필요성으로 산정 |
| `reason` | `VARCHAR(100) NULL` | "단백질 부족" 등 사용자 표기 사유 |

- 마이그레이션: `027_alter_shopping_list_items_priority.sql`.

---

## 2. 신규 테이블

### 2.1 `[+] food_group_expiry_thresholds` *(FR-010, FR-011)*

식품군별 임박 판정 임계(일). 설정값(시드).

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `food_group` | `VARCHAR(30)` | PK |
| `imminent_days` | `TINYINT UNSIGNED NOT NULL` | 임박 임계(예: 채소 2, 유제품 5) |
| `updated_at` | `TIMESTAMP` | ON UPDATE CURRENT_TIMESTAMP |

- PK `(food_group)`. 마이그레이션 `021`, 시드 `seed-food-group-thresholds.ts`.

### 2.2 `[+] user_preference_weights` *(FR-001, FR-003, FR-004)*

사용자별 선호 가중치(통계 집계 결과). 이벤트 시 UPSERT.

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `user_id` | `BIGINT UNSIGNED` | PK 일부, FK→users |
| `dimension` | `VARCHAR(20)` | 'category' / 'ingredient' / 'cuisine' / 'spiciness' 등 |
| `key_ref` | `VARCHAR(80)` | 차원 내 키(예: 'seafood', 'spicy') |
| `weight` | `DECIMAL(6,3) NOT NULL DEFAULT 0` | 음수=기피, 양수=선호 |
| `confidence` | `DECIMAL(5,3) NOT NULL DEFAULT 0` | 0~1, 샘플 수 기반. 임계 미만이면 추천 적용 시 중립 처리 |
| `sample_count` | `INT UNSIGNED NOT NULL DEFAULT 0` | 기여 이벤트 수 |
| `updated_at` | `TIMESTAMP` | ON UPDATE CURRENT_TIMESTAMP |

- PK `(user_id, dimension, key_ref)`. FK `fk_upw_user → users(id) ON DELETE CASCADE`. KEY `(user_id, dimension)`.

### 2.3 `[+] recommendation_edits` *(FR-002)*

추천 수정 이력(구조화). 가중치 입력 신호.

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | `BIGINT UNSIGNED AI` | PK |
| `recommendation_id` | `BIGINT UNSIGNED` | FK→recommendation_requests ON DELETE CASCADE |
| `user_id` | `BIGINT UNSIGNED` | FK→users ON DELETE RESTRICT |
| `action` | `ENUM('replace','exclude','substitute')` | 교체/제외/대체 |
| `target_type` | `VARCHAR(20)` | 'recipe' / 'ingredient' / 'menu' |
| `target_ref` | `VARCHAR(120)` | 대상 식별(재료명/레시피id 등) |
| `replacement_ref` | `VARCHAR(120) NULL` | 대체 시 대상 |
| `created_at` | `TIMESTAMP` | |

- KEY `(user_id, created_at)`, `(recommendation_id)`. 마이그레이션 `023`.

### 2.4 `[+] consumption_records` *(FR-013)*

소비 패턴 이력(이벤트 적재).

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | `BIGINT UNSIGNED AI` | PK |
| `user_id` | `BIGINT UNSIGNED` | FK→users ON DELETE CASCADE |
| `food_id` | `BIGINT UNSIGNED NULL` | FK→foods ON DELETE SET NULL |
| `ingredient_item_id` | `BIGINT UNSIGNED NULL` | FK→ingredient_items ON DELETE SET NULL |
| `recommendation_id` | `BIGINT UNSIGNED NULL` | FK→recommendation_requests ON DELETE SET NULL |
| `quantity` | `DECIMAL(8,2) NULL` | |
| `consumed_at` | `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP` | |

- KEY `(user_id, consumed_at)`, `(user_id, food_id)`. 마이그레이션 `024`.

### 2.5 `[+] saved_meal_plans` *(FR-020, FR-021)*

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | `BIGINT UNSIGNED AI` | PK |
| `user_id` | `BIGINT UNSIGNED` | FK→users ON DELETE CASCADE |
| `source_recommendation_id` | `BIGINT UNSIGNED NULL` | FK→recommendation_requests ON DELETE SET NULL |
| `name` | `VARCHAR(100) NOT NULL` | |
| `memo` | `VARCHAR(500) NULL` | |
| `reuse_count` | `INT UNSIGNED NOT NULL DEFAULT 0` | 재사용 횟수(학습 신호) |
| `last_used_at` | `TIMESTAMP NULL` | |
| `created_at` | `TIMESTAMP` | |

- KEY `(user_id, created_at)`. 마이그레이션 `025`.

### 2.6 `[+] health_logs` *(FR-030, FR-031, FR-038 — 민감정보)*

사용자 수동 입력 건강 기록. 민감 지표 앱 레벨 암호화(001 `utils/crypto` 재사용).

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | `BIGINT UNSIGNED AI` | PK |
| `user_id` | `BIGINT UNSIGNED` | FK→users ON DELETE CASCADE |
| `logged_at` | `DATE NOT NULL` | 기록 기준일 |
| `weight_kg` | `DECIMAL(5,2) NULL` | |
| `metrics_enc` | `VARBINARY(2048) NULL` | 혈압/혈당 등 추가 지표(암호화 JSON) |
| `note` | `VARCHAR(300) NULL` | |
| `created_at` | `TIMESTAMP` | |

- UNIQUE `(user_id, logged_at)` (일자별 1건, 갱신은 UPSERT). KEY `(user_id, logged_at)`. 마이그레이션 `026`.

### 2.7 `[+] health_reports` *(FR-032 — 선택적 캐시)*

기간 집계 리포트 캐시(없어도 조회 시 계산 가능). 성능 위해 선택 도입.

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | `BIGINT UNSIGNED AI` | PK |
| `user_id` | `BIGINT UNSIGNED` | FK→users ON DELETE CASCADE |
| `period_type` | `ENUM('week','month')` | |
| `period_start` | `DATE` | |
| `summary_json` | `JSON` | 평균 영양 균형·부족/과잉·체중 변화 |
| `generated_at` | `TIMESTAMP` | |

- UNIQUE `(user_id, period_type, period_start)`. 마이그레이션 `026`에 동봉 또는 별도.

---

## 3. 상태/생애주기

- `ingredient_items`: 기존 상태(consumed) 유지 + 임박은 파생 계산(저장 X) — `expires_at`와 `food_group_expiry_thresholds`로 질의 시점 판정.
- `user_preference_weights`: 이벤트 시 UPSERT, 사용자 삭제 시 CASCADE.
- `health_logs`: 일자별 UNIQUE, 갱신 UPSERT, 삭제 시 CASCADE(개인정보 삭제권 일치).

---

## 4. FR ↔ 데이터 추적표

| FR | 테이블/컬럼 |
|---|---|
| FR-001/003/004 | `user_preference_weights` |
| FR-002 | `recommendation_edits`, `feedbacks`(기존) |
| FR-010/011/012 | `ingredient_items.food_group`, `food_group_expiry_thresholds`, `ingredient_items.expires_at`(기존) |
| FR-013 | `consumption_records` |
| FR-014 | `ingredient_items`(만료 질의), 추천 제외 로직 |
| FR-020/021 | `saved_meal_plans` |
| FR-030/031 | `health_logs` |
| FR-032/033 | `health_reports`, `meal_plans`(기존, 캘린더 조회) |
| FR-035/036 | `shopping_list_items.priority_score/reason` |
| FR-037 | 전 테이블 FK 관계 |
| FR-038 | `health_logs.metrics_enc`(암호화) |

> 마이그레이션 번호는 020~027(+시드)로 001의 019에 이어 부여. 컬럼 타입·제약은 001 컨벤션(BIGINT UNSIGNED PK, utf8mb4, FK 명명 `fk_<약어>_<참조>`) 준수.
