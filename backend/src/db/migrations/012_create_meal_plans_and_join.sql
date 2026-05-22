-- data-model §3.11, §3.13
CREATE TABLE meal_plans (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  recommendation_id  BIGINT UNSIGNED NOT NULL,
  label              VARCHAR(60) NOT NULL,
  sequence           TINYINT UNSIGNED NOT NULL DEFAULT 1,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_mp_rec (recommendation_id),
  CONSTRAINT fk_mp_rec FOREIGN KEY (recommendation_id) REFERENCES recommendation_requests (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE meal_plan_recipes (
  meal_plan_id   BIGINT UNSIGNED NOT NULL,
  recipe_id      BIGINT UNSIGNED NOT NULL,
  serving_count  DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  PRIMARY KEY (meal_plan_id, recipe_id),
  CONSTRAINT fk_mpr_plan   FOREIGN KEY (meal_plan_id) REFERENCES meal_plans (id) ON DELETE CASCADE,
  CONSTRAINT fk_mpr_recipe FOREIGN KEY (recipe_id)    REFERENCES recipes (id)    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
