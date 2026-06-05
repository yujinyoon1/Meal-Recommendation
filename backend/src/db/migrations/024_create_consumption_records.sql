-- 002 FR-013 (data-model §2.4) — 소비 패턴 이력(이벤트 적재).
CREATE TABLE consumption_records (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id             BIGINT UNSIGNED NOT NULL,
  food_id             BIGINT UNSIGNED NULL,
  ingredient_item_id  BIGINT UNSIGNED NULL,
  recommendation_id   BIGINT UNSIGNED NULL,
  quantity            DECIMAL(8,2) NULL,
  consumed_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cr_user_ts (user_id, consumed_at),
  KEY idx_cr_user_food (user_id, food_id),
  CONSTRAINT fk_cr_user FOREIGN KEY (user_id)            REFERENCES users (id)                   ON DELETE CASCADE,
  CONSTRAINT fk_cr_food FOREIGN KEY (food_id)            REFERENCES foods (id)                   ON DELETE SET NULL,
  CONSTRAINT fk_cr_item FOREIGN KEY (ingredient_item_id) REFERENCES ingredient_items (id)        ON DELETE SET NULL,
  CONSTRAINT fk_cr_rec  FOREIGN KEY (recommendation_id)  REFERENCES recommendation_requests (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
