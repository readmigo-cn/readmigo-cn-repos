// scripts/fix-pr2-relative-paths.mjs
//
// Fixes a regex bug introduced by the PR-2 rewrite-map codemod. The original
// PR-2 map used a capture group like (\.\.?/)+ to capture the relative-path
// prefix, but JavaScript regex `+` quantifier inside a capture group only
// retains the LAST iteration. That dropped one `../` per match, leaving
// depth >= 2 source files pointing to `'../core/<sub>/'` when they should
// have `'../../core/<sub>/'` (or more).
//
// This script walks the ets/ tree, computes each file's depth from
// `entry/src/main/ets/`, and prepends the missing `../` segments to any
// import that starts with exactly one `../core/<core-subdir>/`.
//
// The regex `(['"])\.\.\/core\/(${subdirs})\/` specifically matches one `../`
// before `core/<sub>/`. It does NOT match already-correct paths like
// `'../../core/...'`, so the script is idempotent.

import { readFileSync, writeFileSync } from 'node:fs';
import { glob } from 'node:fs/promises';

const CORE_SUBDIRS = [
  'router', 'native', 'persistence', 'widget', 'theme', 'extensions',
  'cache', 'monitoring', 'performance', 'analytics', 'experiments',
  'moderation', 'dynamic', 'atomic', 'shell',
];

const ETS_ROOT = 'harmony-app/entry/src/main/ets';

function fileDepth(relPath) {
  // depth = number of slashes between ets root and the file
  // e.g., "pages/Foo.ets" -> 1, "pages/tablet/Bar.ets" -> 2
  return relPath.split('/').length - 1;
}

async function main() {
  let filesChanged = 0;
  let importsChanged = 0;

  const subdirAlt = CORE_SUBDIRS.join('|');
  // Match: '<quote>../core/<subdir>/' — exactly ONE `../` before `core/`
  const re = new RegExp(`(['"])\\.\\.\\/core\\/(${subdirAlt})\\/`, 'g');

  for await (const filepath of glob(`${ETS_ROOT}/**/*.ets`)) {
    const relFromEts = filepath.replace(ETS_ROOT + '/', '');

    // Skip files inside core/ — sibling-fix pass handled those with its own
    // depth logic.
    if (relFromEts.startsWith('core/')) continue;

    const D = fileDepth(relFromEts);
    // Depth-1 files (e.g., pages/Foo.ets) need exactly one `../` to reach
    // core/, which is what PR-2 already produced. Only depth >= 2 is broken.
    if (D < 2) continue;

    const original = readFileSync(filepath, 'utf8');
    let count = 0;
    const fixed = original.replace(re, (_match, quote, sub) => {
      count++;
      const prefix = '../'.repeat(D - 1); // additional ../ to prepend
      return `${quote}${prefix}../core/${sub}/`;
    });
    if (count > 0) {
      writeFileSync(filepath, fixed);
      filesChanged++;
      importsChanged += count;
      console.log(`Fixed ${count} imports in ${relFromEts} (depth=${D})`);
    }
  }

  console.log(`---\nTotal: ${filesChanged} files / ${importsChanged} imports`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
