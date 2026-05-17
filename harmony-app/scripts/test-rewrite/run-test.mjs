// scripts/test-rewrite/run-test.mjs
import { spawnSync } from 'node:child_process';
import { readFileSync, copyFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = mkdtempSync(path.join(tmpdir(), 'codemod-test-'));
try {
  const inside = path.join(dir, 'entry', 'src', 'main', 'ets');
  mkdirSync(inside, { recursive: true });
  copyFileSync(path.join(__dirname, 'fixture.ets'), path.join(inside, 'fixture.ets'));

  const mapPath = path.join(__dirname, 'test-map.json');
  const rewriter = path.join(__dirname, '..', 'rewrite-imports.mjs');
  const r = spawnSync('node', [rewriter, mapPath, inside], { stdio: 'inherit' });
  if (r.status !== 0) { console.error('rewriter failed'); process.exit(1); }

  const actual = readFileSync(path.join(inside, 'fixture.ets'), 'utf8');
  const expected = readFileSync(path.join(__dirname, 'expected.ets'), 'utf8');
  if (actual.trim() !== expected.trim()) {
    console.error('FAIL');
    console.error('--- Expected ---'); console.error(expected);
    console.error('--- Actual ---');   console.error(actual);
    process.exit(1);
  }
  console.log('OK');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
