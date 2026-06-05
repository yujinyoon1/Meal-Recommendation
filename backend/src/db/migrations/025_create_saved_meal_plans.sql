-- 002 FR-020/021 (data-model §2.5) — 식단 저장/재사용.
CREATE TABLE saved_meal_plans (
  id                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id                  BIGINT UNSIGNED NOT NULL,
  source_recommendation_id BIGINT UNSIGNED NULL,
  name                     VARCHAR(100) NOT NULL,
  memo                     VARCHAR(500) NULL,
  reuse_count              INT UNSIGNED NOT NULL DEFAULT 0,
  last_used_at             TIMESTAMP NULL,
  created_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_smp_user_created (user_id, created_at),
  CONSTRAINT fk_smp_user FOREIGN KEY (user_id)                  REFERENCES users (id)                   ON DELETE CASCADE,
  CONSTRAINT fk_smp_rec  FOREIGN KEY (source_recommendation_id) REFERENCES recommendation_requests (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
