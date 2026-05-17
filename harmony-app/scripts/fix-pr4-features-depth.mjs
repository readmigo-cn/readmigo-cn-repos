// scripts/fix-pr4-features-depth.mjs
// Files moved into features/<feat>/pages or features/<feat>/components are now at depth 3.
// Their previous depth was 1 (pages/ or components/). Outbound imports to non-moved
// targets (core, ui, api, store, model, service, abilities, entryability) need +2 ../.
// Files moved into features/audiobook/service from service/tts were at depth 2, now depth 3 — need +1 ../.
import { readFileSync, writeFileSync } from 'node:fs';
import { glob } from 'node:fs/promises';

const TARGETS = ['core', 'ui', 'api', 'store', 'model', 'service', 'abilities', 'entryability', 'features'];
const ETS_ROOT = 'harmony-app/entry/src/main/ets';

async function main() {
  let filesChanged = 0;
  let importsChanged = 0;
  const alt = TARGETS.join('|');

  for await (const filepath of glob(`${ETS_ROOT}/features/**/*.ets`)) {
    const original = readFileSync(filepath, 'utf8');
    let modified = original;
    let count = 0;

    // Determine how many extra ../ this file needs based on its OLD depth before move.
    // Files in features/<feat>/pages or features/<feat>/components were at depth 1 → now 3 → need +2.
    // Files in features/audiobook/service (from service/tts) were at depth 2 → now 3 → need +1.
    const isFromServiceTts = filepath.includes('/features/audiobook/service/');
    const extraDots = isFromServiceTts ? 1 : 2;
    const prefix = '../'.repeat(extraDots);

    // Match single '../<target>/' that needs to become (extraDots+1) '../'s
    // BUT only when the existing prefix is exactly '../' (1 segment).
    // For deeper consumers we might have '../../<target>/' originally — but if file is now at depth 3, the original path had fewer ../ than needed.
    // Simplest: detect imports of the form ../<target>/ (exactly 1 ../) and prepend extra ../.

    const re = new RegExp(`(['"])\\.\\.\\/(${alt})\\/`, 'g');
    const fixed1 = modified.replace(re, (match, quote, target) => {
      count++;
      return `${quote}${prefix}../${target}/`;
    });

    // Also handle '../../<target>/' for service/tts-originated files (depth 2 → 3, need +1)
    // These already have 2 ../ in source. They now need 3 ../. For files from service/tts only:
    if (isFromServiceTts) {
      const re2 = new RegExp(`(['"])\\.\\.\\/\\.\\.\\/(${alt})\\/`, 'g');
      const fixed2 = fixed1.replace(re2, (match, quote, target) => {
        count++;
        return `${quote}../../../${target}/`;
      });
      modified = fixed2;
    } else {
      modified = fixed1;
    }

    if (modified !== original) {
      writeFileSync(filepath, modified);
      filesChanged++;
      importsChanged += count;
      console.log(`Fixed ${count} imports in ${filepath}`);
    }
  }

  console.log(`---\nTotal: ${filesChanged} files / ${importsChanged} imports`);
}

main().catch(err => { console.error(err); process.exit(1); });
