// scripts/rewrite-imports.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { glob } from 'node:fs/promises';

// GOTCHA: When writing rewrite-map JSON, capture path prefixes with a
// NON-CAPTURING repeat: ((?:\\.\\.?/)+) — NOT (\\.\\.?/)+. The `+` quantifier
// only retains the LAST iteration in the capture group, dropping `../`s.
// Example correct mapping:
//   { "from": "(?<=['\"])((?:\\.\\.?/)+)theme/", "to": "$1core/theme/" }
// Example INCORRECT mapping (used in PR-2 — caused 64 broken imports):
//   { "from": "(?<=['\"])(\\.\\.?/)+theme/",     "to": "$1core/theme/" }

const NAPI_SKIP = /from\s+['"]lib[^'"]*\.so['"]/;

async function main() {
  const mapFile = process.argv[2];
  const root = process.argv[3] || 'entry/src/main/ets';
  if (!mapFile) {
    console.error('Usage: node rewrite-imports.mjs <map.json> [root]');
    process.exit(1);
  }
  const parsed = JSON.parse(readFileSync(mapFile, 'utf8'));
  const compiled = parsed.mappings.map(m => ({ re: new RegExp(m.from, 'g'), to: m.to }));

  let filesChanged = 0;
  let importsChanged = 0;
  const testRoot = root.replace('main/ets', 'ohosTest/ets');

  for (const r of [root, testRoot]) {
    for await (const filepath of glob(`${r}/**/*.ets`)) {
      const original = readFileSync(filepath, 'utf8');
      const lines = original.split('\n');
      let modified = false;
      const newLines = lines.map(line => {
        if (!/^\s*import\s/.test(line)) return line;
        if (NAPI_SKIP.test(line)) return line;
        let out = line;
        for (const m of compiled) {
          out = out.replace(m.re, m.to);
        }
        if (out !== line) {
          modified = true;
          importsChanged++;
        }
        return out;
      });
      if (modified) {
        writeFileSync(filepath, newLines.join('\n'));
        filesChanged++;
      }
    }
  }
  console.log(`Files changed: ${filesChanged}`);
  console.log(`Imports rewritten: ${importsChanged}`);
}

main().catch(err => { console.error(err); process.exit(1); });
