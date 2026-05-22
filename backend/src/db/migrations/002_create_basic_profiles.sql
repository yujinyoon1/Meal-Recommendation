-- FR-002 (data-model §3.2)
CREATE TABLE basic_profiles (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      BIGINT UNSIGNED NOT NULL,
  age          TINYINT UNSIGNED NULL,
  gender       ENUM('male','female','other','prefer_not_say') NULL,
  height_cm    DECIMAL(5,2) NULL,
  weight_kg    DECIMAL(5,2) NULL,
  bmi          DECIMAL(5,2) GENERATED ALWAYS AS (weight_kg / POWER(height_cm/100, 2)) STORED,
  valid_from   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valid_to     TIMESTAMP NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_basic_age    CHECK (age IS NULL OR (age BETWEEN 10 AND 120)),
  CONSTRAINT chk_basic_height CHECK (height_cm IS NULL OR (height_cm BETWEEN 80 AND 250)),
  CONSTRAINT chk_basic_weight CHECK (weight_kg IS NULL OR (weight_kg BETWEEN 20 AND 300)),
  KEY idx_bp_user_valid (user_id, valid_from DESC),
  CONSTRAINT fk_bp_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
