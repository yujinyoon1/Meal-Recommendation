/**
 * allergy_master / disease_master / ingredient_alias 초기 시드.
 * 안전 idempotent (ON DUPLICATE KEY UPDATE).
 */
import 'dotenv/config';
import { pool } from '../pool.js';

const ALLERGENS: Array<{ code: string; ko: string; en: string }> = [
  { code: 'PEANUT', ko: '땅콩', en: 'Peanut' },
  { code: 'TREE_NUT', ko: '견과류', en: 'Tree nut' },
  { code: 'EGG', ko: '계란', en: 'Egg' },
  { code: 'MILK', ko: '우유', en: 'Milk' },
  { code: 'SOY', ko: '대두', en: 'Soy' },
  { code: 'WHEAT', ko: '밀', en: 'Wheat' },
  { code: 'FISH', ko: '생선', en: 'Fish' },
  { code: 'SHELLFISH', ko: '갑각류', en: 'Shellfish' },
  { code: 'BUCKWHEAT', ko: '메밀', en: 'Buckwheat' },
  { code: 'TOMATO', ko: '토마토', en: 'Tomato' },
  { code: 'PEACH', ko: '복숭아', en: 'Peach' },
  { code: 'SULFITE', ko: '아황산', en: 'Sulfite' },
];

const DISEASES: Array<{ code: string; ko: string; en: string }> = [
  { code: 'HTN', ko: '고혈압', en: 'Hypertension' },
  { code: 'DM2', ko: '2형 당뇨', en: 'Type 2 Diabetes' },
  { code: 'DYSLIPIDEMIA', ko: '이상지질혈증', en: 'Dyslipidemia' },
  { code: 'CKD', ko: '만성 신장질환', en: 'Chronic Kidney Disease' },
  { code: 'GOUT', ko: '통풍', en: 'Gout' },
  { code: 'IBS', ko: '과민성 장 증후군', en: 'IBS' },
  { code: 'CELIAC', ko: '셀리악병', en: 'Celiac Disease' },
];

// 식약처 시드 전에는 alias가 의미 없으므로 샘플 5개만. seed-foods 이후 별도 갱신 권장.
const ALIASES: Array<{ alias: string; food_code: string }> = [
  { alias: '피넛', food_code: 'TEMP_PEANUT' },
  { alias: '양파 1개', food_code: 'TEMP_ONION' },
  { alias: '계란', food_code: 'TEMP_EGG' },
  { alias: '두부 한모', food_code: 'TEMP_TOFU' },
  { alias: '닭가슴살', food_code: 'TEMP_CHICKEN_BREAST' },
];

async function upsertMasters() {
  for (const a of ALLERGENS) {
    await pool.query(
      `INSERT INTO allergy_master (code, name_ko, name_en) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE name_ko = VALUES(name_ko), name_en = VALUES(name_en)`,
      [a.code, a.ko, a.en],
    );
  }
  for (const d of DISEASES) {
    await pool.query(
      `INSERT INTO disease_master (code, name_ko, name_en) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE name_ko = VALUES(name_ko), name_en = VALUES(name_en)`,
      [d.code, d.ko, d.en],
    );
  }
}

async function upsertAliases() {
  // alias는 foods.id가 필요 — seed-foods 이후에 매칭되는 alias만 활성화.
  // 여기서는 foods 시드와 별개로 동작하도록, food_code 가 실제 foods.code 와 매칭되는 경우만 insert.
  for (const al of ALIASES) {
    const [rows] = await pool.query<{ id: number }[] & { length: number }>(
      'SELECT id FROM foods WHERE code = ?',
      [al.food_code],
    );
    const list = rows as unknown as { id: number }[];
    if (!list || list.length === 0) {
      // eslint-disable-next-line no-console
      console.warn(`[seed-masters] skip alias "${al.alias}" — foods.code "${al.food_code}" not found`);
      continue;
    }
    await pool.query(
      `INSERT INTO ingredient_alias (alias, food_id) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE food_id = VALUES(food_id)`,
      [al.alias, list[0].id],
    );
  }
}

async function main() {
  await upsertMasters();
  await upsertAliases();
  // eslint-disable-next-line no-console
  console.log('[seed-masters] done');
  await pool.end();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('[seed-masters] failed:', e);
  process.exit(1);
});
