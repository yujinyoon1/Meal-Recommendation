-- data-model §3.9 — 알레르기/질병 마스터 (두 테이블)
CREATE TABLE allergy_master (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code        VARCHAR(40)  NOT NULL,
  name_ko     VARCHAR(100) NOT NULL,
  name_en     VARCHAR(100) NULL,
  description VARCHAR(500) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_allergy_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE disease_master (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code        VARCHAR(40)  NOT NULL,
  name_ko     VARCHAR(100) NOT NULL,
  name_en     VARCHAR(100) NULL,
  description VARCHAR(500) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_disease_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
