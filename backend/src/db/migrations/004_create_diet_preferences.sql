-- FR-004 (data-model §3.4)
CREATE TABLE diet_preferences (
  id                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id                  BIGINT UNSIGNED NOT NULL,
  meals_per_day            TINYINT UNSIGNED NULL,
  dining_out_per_week      TINYINT UNSIGNED NULL,
  delivery_per_week        TINYINT UNSIGNED NULL,
  avoid_ingredients_json   JSON NULL,
  prefer_categories_json   JSON NULL,
  cooking_time_max_min     SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  valid_from               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valid_to                 TIMESTAMP NULL,
  created_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_dp_user_valid (user_id, valid_from DESC),
  CONSTRAINT fk_dp_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
