-- FR-016 (data-model §3.14)
CREATE TABLE nutrition_analyses (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  recommendation_id BIGINT UNSIGNED NOT NULL,
  total_kcal        DECIMAL(7,2) NULL,
  carb_g            DECIMAL(7,2) NULL,
  protein_g         DECIMAL(7,2) NULL,
  fat_g             DECIMAL(7,2) NULL,
  fiber_g           DECIMAL(7,2) NULL,
  sodium_mg         DECIMAL(8,2) NULL,
  rda_ratio_json    JSON NULL,
  confidence        ENUM('high','medium','low') NOT NULL DEFAULT 'medium',
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_na_rec (recommendation_id),
  CONSTRAINT fk_na_rec FOREIGN KEY (recommendation_id) REFERENCES recommendation_requests (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
