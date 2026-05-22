-- FR-006~009 (data-model §3.6) — 사용자별 현재 인벤토리
CREATE TABLE ingredient_items (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      BIGINT UNSIGNED NOT NULL,
  raw_text     VARCHAR(255) NOT NULL,
  food_id      BIGINT UNSIGNED NULL,
  quantity     DECIMAL(8,2) NULL,
  unit         VARCHAR(20)  NULL,
  expires_at   DATE NULL,
  consumed     BOOLEAN NOT NULL DEFAULT FALSE,
  consumed_at  TIMESTAMP NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ii_user_consumed_exp (user_id, consumed, expires_at),
  CONSTRAINT fk_ii_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_ii_food FOREIGN KEY (food_id) REFERENCES foods (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
