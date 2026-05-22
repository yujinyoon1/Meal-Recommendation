/**
 * OpenAPI → TS 타입 생성 파이프라인
 * Input:  specs/001-meal-recommendation/contracts/openapi.yaml
 * Output: backend/src/types/api.ts, frontend/src/types/api.ts
 */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const openapiPath = path.join(
  repoRoot,
  'specs',
  '001-meal-recommendation',
  'contracts',
  'openapi.yaml',
);

const targets = [
  path.join(repoRoot, 'backend', 'src', 'types', 'api.ts'),
  path.join(repoRoot, 'frontend', 'src', 'types', 'api.ts'),
];

for (const out of targets) {
  mkdirSync(path.dirname(out), { recursive: true });
  console.log(`[gen-types] ${openapiPath} → ${out}`);
  execSync(`npx openapi-typescript "${openapiPath}" -o "${out}"`, {
    stdio: 'inherit',
    cwd: repoRoot,
  });
}

console.log('[gen-types] done');
