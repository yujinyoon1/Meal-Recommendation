-- FR-003, FR-023 (data-model §3.3) — 민감 컬럼은 AES-256-GCM 암호화 후 VARBINARY 저장
CREATE TABLE health_profiles (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id             BIGINT UNSIGNED NOT NULL,
  allergies_enc       VARBINARY(2048) NULL,
  diseases_enc        VARBINARY(2048) NULL,
  goal                ENUM('lose_weight','maintain','gain_muscle') NULL,
  target_calories_kcal SMALLINT UNSIGNED NULL,
  valid_from          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valid_to            TIMESTAMP NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_hp_user_valid (user_id, valid_from DESC),
  CONSTRAINT fk_hp_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
