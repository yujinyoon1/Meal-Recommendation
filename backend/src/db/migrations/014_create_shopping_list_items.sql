-- FR-021, FR-022 (data-model §3.15)
CREATE TABLE shopping_list_items (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  recommendation_id BIGINT UNSIGNED NOT NULL,
  food_id           BIGINT UNSIGNED NULL,
  name              VARCHAR(200) NOT NULL,
  category          VARCHAR(80)  NULL,
  reason            VARCHAR(255) NULL,
  suggested_qty     VARCHAR(60)  NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sli_rec (recommendation_id),
  CONSTRAINT fk_sli_rec FOREIGN KEY (recommendation_id) REFERENCES recommendation_requests (id) ON DELETE CASCADE,
  CONSTRAINT fk_sli_food FOREIGN KEY (food_id) REFERENCES foods (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
