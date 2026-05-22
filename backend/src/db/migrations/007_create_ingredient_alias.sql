-- FR-007 (data-model §3.8) — 사용자 입력 정규화 사전
CREATE TABLE ingredient_alias (
  id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  alias     VARCHAR(120) NOT NULL,
  food_id   BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_alias (alias),
  KEY idx_alias_food (food_id),
  CONSTRAINT fk_alias_food FOREIGN KEY (food_id) REFERENCES foods (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
