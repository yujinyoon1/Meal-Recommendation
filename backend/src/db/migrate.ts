/**
 * Umzug 기반 SQL 마이그레이션 러너.
 * 명령: tsx src/db/migrate.ts (up|down|status)
 *
 * migrations/ 디렉터리의 *.sql 파일을 알파벳 순으로 실행.
 * 메타 테이블: _migrations (name PK, executed_at)
 */
import 'dotenv/config';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Umzug } from 'umzug';
import { pool } from './pool.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(here, 'migrations');

async function ensureMetaTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name VARCHAR(255) NOT NULL PRIMARY KEY,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB CHARSET=utf8mb4
  `);
}

function splitStatements(sql: string): string[] {
  // 줄 단위로 `-- 주석` 라인을 제거한 뒤 세미콜론으로 분리.
  // (트리거/PROCEDURE 미사용 전제 — 본 마이그레이션에는 해당 없음)
  const stripped = sql
    .split(/\r?\n/)
    .filter((line) => !/^\s*--/.test(line))
    .join('\n');
  return stripped
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function loadMigrations() {
  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort();
  return files.map((f) => ({
    name: f,
    up: async () => {
      const sql = await readFile(path.join(migrationsDir, f), 'utf-8');
      const stmts = splitStatements(sql);
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        for (const s of stmts) await conn.query(s);
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
    },
    down: async () => {
      throw new Error(`down() not implemented for ${f} — write reverse SQL manually`);
    },
  }));
}

async function main() {
  await ensureMetaTable();
  const migrations = await loadMigrations();
  const umzug = new Umzug({
    migrations,
    storage: {
      async logMigration({ name }) {
        await pool.query('INSERT INTO _migrations (name) VALUES (?)', [name]);
      },
      async unlogMigration({ name }) {
        await pool.query('DELETE FROM _migrations WHERE name = ?', [name]);
      },
      async executed() {
        const [rows] = await pool.query('SELECT name FROM _migrations ORDER BY name');
        return (rows as { name: string }[]).map((r) => r.name);
      },
    },
    logger: console,
  });

  const cmd = process.argv[2] ?? 'up';
  switch (cmd) {
    case 'up':
      await umzug.up();
      break;
    case 'down':
      await umzug.down();
      break;
    case 'status': {
      const executed = await umzug.executed();
      const pending = await umzug.pending();
      // eslint-disable-next-line no-console
      console.log('executed:', executed.map((m) => m.name));
      // eslint-disable-next-line no-console
      console.log('pending :', pending.map((m) => m.name));
      break;
    }
    default:
      // eslint-disable-next-line no-console
      console.error(`unknown command: ${cmd} (use: up | down | status)`);
      process.exit(1);
  }
  await pool.end();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('[migrate] failed:', e);
  process.exit(1);
});
