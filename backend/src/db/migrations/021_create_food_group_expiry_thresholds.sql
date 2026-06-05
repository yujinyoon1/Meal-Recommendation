-- 002 FR-010/011 (data-model §2.1) — 식품군별 임박 판정 임계(일). 설정값(시드).
CREATE TABLE food_group_expiry_thresholds (
  food_group    VARCHAR(30) NOT NULL,
  imminent_days TINYINT UNSIGNED NOT NULL,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (food_group)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
