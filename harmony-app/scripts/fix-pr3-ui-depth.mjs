// scripts/fix-pr3-ui-depth.mjs
//
// PR-3 fixup pass:
//
// (A) ui/ depth fixup:
//     Files moved from components/X.ets (depth 1) to ui/primitives/X.ets (depth 2)
//     have outbound imports like '../core/theme/...' that resolved correctly at
//     depth 1 but now need an extra '../' from depth 2. Files moved from
//     components/responsive/Y.ets (depth 2) to ui/responsive/Y.ets (depth 2)
//     keep the same depth, so they already use '../../core/...' correctly.
//     Same for components/optimized/LazyImage.ets → ui/lazy/LazyImage.ets.
//     The script only touches paths that begin with EXACTLY ONE `../<target>/`
//     and skips already-correct paths, making it idempotent.
//
// (B) api/ outbound path fixup:
//     Files moved from service/api/Foo.ets (depth 2) to api/<domain>/Foo.ets
//     (depth 2) keep depth but changed parent path. Imports like
//     '../HttpClient' (= service/HttpClient.ets) now need to become
//     '../../service/HttpClient'. Same for '../SseClient' and '../cache/...'.
//     StudyPlanApi imports './AiApi' (sibling in old service/api/) which now
//     lives at api/ai/AiApi.ets, so the path needs to become '../ai/AiApi'.
//
// We split the two cases by directory (ui/ vs api/) so we don't accidentally
// rewrite '../HttpClient' inside still-in-place service/* files.

import { readFileSync, writeFileSync } from 'node:fs';
import { glob } from 'node:fs/promises';

// (A) Targets that ui/ files (moved from depth-1 components/) reference.
// At depth-1 they used '../<target>/'; at depth-2 they need '../../<target>/'.
const UI_TARGETS = [
  'core', 'model', 'store', 'service', 'pages', 'abilities', 'entryability',
  'api', 'features', 'utils',
];

// (B) For api/ files, the moved-but-changed-parent imports to fix.
// Only single '../' literals — patterns will not match already-correct
// '../../...' paths, so the script is idempotent.
const API_REPLACEMENTS = [
  { pattern: /(['"])\.\.\/HttpClient(['"\/])/g,  replace: '$1../../service/HttpClient$2' },
  { pattern: /(['"])\.\.\/SseClient(['"\/])/g,   replace: '$1../../service/SseClient$2' },
  { pattern: /(['"])\.\.\/cache\//g,             replace: '$1../../service/cache/' },
];

// Sibling './AiApi' inside api/study/ (StudyPlanApi) now points to api/ai/AiApi.
// Restricted to files NOT in api/ai/ so WordAnalysisApi (which IS in api/ai/
// and still siblings with AiApi) stays intact.
const SIBLING_AI_RE = /(['"])\.\/AiApi(['"\/])/g;

const ETS_ROOT = 'harmony-app/entry/src/main/ets';

function countMatches(str, regex) {
  const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  return (str.match(re) || []).length;
}

async function fixUiFiles() {
  let filesChanged = 0;
  let importsChanged = 0;
  const altPattern = UI_TARGETS.join('|');
  const re = new RegExp(`(['"])\\.\\.\\/(${altPattern})\\/`, 'g');

  for await (const filepath of glob(`${ETS_ROOT}/ui/primitives/*.ets`)) {
    const original = readFileSync(filepath, 'utf8');
    let count = 0;
    const fixed = original.replace(re, (_match, quote, target) => {
      count++;
      return `${quote}../../${target}/`;
    });
    if (count > 0) {
      writeFileSync(filepath, fixed);
      filesChanged++;
      importsChanged += count;
      console.log(`[ui depth] Fixed ${count} imports in ${filepath}`);
    }
  }
  return { filesChanged, importsChanged };
}

async function fixApiFiles() {
  let filesChanged = 0;
  let importsChanged = 0;

  for await (const filepath of glob(`${ETS_ROOT}/api/**/*.ets`)) {
    const original = readFileSync(filepath, 'utf8');
    let out = original;
    let count = 0;

    for (const r of API_REPLACEMENTS) {
      const matches = countMatches(out, r.pattern);
      if (matches > 0) {
        out = out.replace(r.pattern, r.replace);
        count += matches;
      }
    }

    // Sibling AiApi fix — only for files NOT in api/ai/
    if (!filepath.includes('/api/ai/')) {
      const matches = countMatches(out, SIBLING_AI_RE);
      if (matches > 0) {
        out = out.replace(SIBLING_AI_RE, '$1../ai/AiApi$2');
        count += matches;
      }
    }

    if (out !== original) {
      writeFileSync(filepath, out);
      filesChanged++;
      importsChanged += count;
      console.log(`[api outbound] Fixed ${count} imports in ${filepath}`);
    }
  }
  return { filesChanged, importsChanged };
}

async function main() {
  console.log('=== (A) ui/ depth fixup ===');
  const ui = await fixUiFiles();
  console.log('=== (B) api/ outbound fixup ===');
  const api = await fixApiFiles();
  console.log('---');
  console.log(`UI:  ${ui.filesChanged} files / ${ui.importsChanged} imports`);
  console.log(`API: ${api.filesChanged} files / ${api.importsChanged} imports`);
  console.log(`TOTAL: ${ui.filesChanged + api.filesChanged} files / ${ui.importsChanged + api.importsChanged} imports`);
}

main().catch(err => { console.error(err); process.exit(1); });
