-- FR-016 (data-model §3.7) — 공공 영양 DB 시드 마스터
CREATE TABLE foods (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code            VARCHAR(40)  NOT NULL,
  name_ko         VARCHAR(200) NOT NULL,
  category        VARCHAR(80)  NULL,
  kcal_per_100g   DECIMAL(7,2) NULL,
  carb_g          DECIMAL(7,2) NULL,
  protein_g       DECIMAL(7,2) NULL,
  fat_g           DECIMAL(7,2) NULL,
  fiber_g         DECIMAL(7,2) NULL,
  sodium_mg       DECIMAL(8,2) NULL,
  source          VARCHAR(80)  NULL,
  version         VARCHAR(20)  NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_foods_code (code),
  KEY idx_foods_category (category),
  FULLTEXT KEY ft_foods_name (name_ko)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
