/**
 * 식약처 CSV → foods 테이블 일괄 시드.
 * - 경로: <repo>/data/foods.csv
 * - CSV 헤더(예상): code,name_ko,category,kcal_per_100g,carb_g,protein_g,fat_g,fiber_g,sodium_mg,source,version
 * - 배치 1k, ON DUPLICATE KEY UPDATE
 *
 * TODO(외부 의존): 실제 식약처 CSV 미제공 상태 — README.md 참조.
 *                 파일이 없으면 "no input — skipping" 으로 종료(에러 아님).
 */
import 'dotenv/config';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../pool.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.resolve(here, '..', '..', '..', '..', 'data', 'foods.csv');
const BATCH = 1000;

interface Row {
  code: string;
  name_ko: string;
  category: string | null;
  kcal_per_100g: number | null;
  carb_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sodium_mg: number | null;
  source: string | null;
  version: string | null;
}

function num(s: string | undefined): number | null {
  if (s === undefined || s === '' || s === 'NA') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].split(',').map((s) => s.trim());
  const idx = (k: string) => header.indexOf(k);
  const out: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const code = (cols[idx('code')] ?? '').trim();
    const name_ko = (cols[idx('name_ko')] ?? '').trim();
    if (!code || !name_ko) continue;
    out.push({
      code,
      name_ko,
      category: (cols[idx('category')] ?? '').trim() || null,
      kcal_per_100g: num(cols[idx('kcal_per_100g')]),
      carb_g: num(cols[idx('carb_g')]),
      protein_g: num(cols[idx('protein_g')]),
      fat_g: num(cols[idx('fat_g')]),
      fiber_g: num(cols[idx('fiber_g')]),
      sodium_mg: num(cols[idx('sodium_mg')]),
      source: (cols[idx('source')] ?? '').trim() || null,
      version: (cols[idx('version')] ?? '').trim() || null,
    });
  }
  return out;
}

async function insertBatch(batch: Row[]) {
  if (batch.length === 0) return;
  const sql = `
    INSERT INTO foods
      (code, name_ko, category, kcal_per_100g, carb_g, protein_g, fat_g, fiber_g, sodium_mg, source, version)
    VALUES ?
    ON DUPLICATE KEY UPDATE
      name_ko       = VALUES(name_ko),
      category      = VALUES(category),
      kcal_per_100g = VALUES(kcal_per_100g),
      carb_g        = VALUES(carb_g),
      protein_g     = VALUES(protein_g),
      fat_g         = VALUES(fat_g),
      fiber_g       = VALUES(fiber_g),
      sodium_mg     = VALUES(sodium_mg),
      source        = VALUES(source),
      version       = VALUES(version)
  `;
  const values = batch.map((r) => [
    r.code,
    r.name_ko,
    r.category,
    r.kcal_per_100g,
    r.carb_g,
    r.protein_g,
    r.fat_g,
    r.fiber_g,
    r.sodium_mg,
    r.source,
    r.version,
  ]);
  await pool.query(sql, [values]);
}

async function main() {
  if (!existsSync(csvPath)) {
    // eslint-disable-next-line no-console
    console.warn(`[seed-foods] no input CSV at ${csvPath} — skipping. (see src/db/seeds/README.md)`);
    await pool.end();
    return;
  }
  const text = readFileSync(csvPath, 'utf-8');
  const rows = parseCsv(text);
  // eslint-disable-next-line no-console
  console.log(`[seed-foods] parsed ${rows.length} rows`);
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    await insertBatch(slice);
    // eslint-disable-next-line no-console
    console.log(`[seed-foods] inserted ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  await pool.end();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('[seed-foods] failed:', e);
  process.exit(1);
});
