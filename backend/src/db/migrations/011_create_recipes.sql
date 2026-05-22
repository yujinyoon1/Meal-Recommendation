-- data-model §3.12
CREATE TABLE recipes (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name              VARCHAR(200) NOT NULL,
  description       TEXT NULL,
  ingredients_json  JSON NOT NULL,
  steps_json        JSON NOT NULL,
  est_cooking_min   SMALLINT UNSIGNED NULL,
  difficulty        ENUM('easy','medium','hard') NOT NULL DEFAULT 'easy',
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
