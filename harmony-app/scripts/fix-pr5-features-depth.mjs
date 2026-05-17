// scripts/fix-pr5-features-depth.mjs
// PR-5 depth fixup for files moved into features/ai-tools, features/account,
// features/study, features/discover, features/notes.
//
// Origin depth tracking:
//   - pages/X.ets        (depth 1) → features/<f>/pages/X.ets        (depth 3)  → +2
//   - components/X.ets   (depth 1) → features/<f>/components/X.ets   (depth 3)  → +2
//   - service/llm/X.ets       (d=2) → features/ai-tools/service/X    (d=3)      → +1
//   - service/translation/X   (d=2) → features/ai-tools/service/X    (d=3)      → +1
//   - service/payment/X       (d=2) → features/account/service/payment/X (d=4)  → +2
//   - service/subscription/X  (d=2) → features/account/service/subscription/X (d=4) → +2
//
// This script ONLY rewrites prefixes for known TARGETS dirs at root of ets/.
// Bare-file sibling refs (e.g. '../HttpClient' inside ai-tools/service)
// must be patched manually because the target is a file, not a dir prefix.
import { readFileSync, writeFileSync } from 'node:fs';
import { glob } from 'node:fs/promises';

const TARGETS = ['core', 'ui', 'api', 'store', 'model', 'service', 'abilities', 'entryability', 'features', 'components', 'pages'];
const ETS_ROOT = 'harmony-app/entry/src/main/ets';

// File-set buckets per origin depth.
const PR5_FILES = {
  // origin depth 1 → now depth 3, need +2
  d1to3: new Set([
    'features/ai-tools/pages/ReadingComprehension.ets',
    'features/ai-tools/pages/WeaknessAnalysis.ets',
    'features/ai-tools/components/AiContentBadge.ets',
    'features/ai-tools/components/ExplainCard.ets',
    'features/ai-tools/components/WordExplainSheet.ets',
    'features/account/pages/Login.ets',
    'features/account/pages/Onboarding.ets',
    'features/account/pages/Me.ets',
    'features/account/pages/Subscriptions.ets',
    'features/account/pages/RefundFlow.ets',
    'features/account/pages/Contact.ets',
    'features/account/pages/PasswordReset.ets',
    'features/account/components/PaywallSheet.ets',
    'features/study/pages/StudyPlan.ets',
    'features/discover/pages/Discover.ets',
    'features/notes/pages/Notes.ets',
  ]),
  // origin depth 2 → now depth 3, need +1 (ai-tools service: llm + translation)
  d2to3: new Set([
    'features/ai-tools/service/LlmAdapter.ets',
    'features/ai-tools/service/TranslateService.ets',
  ]),
  // origin depth 2 → now depth 4, need +2 (account service nested)
  d2to4: new Set([
    'features/account/service/payment/AlipayProvider.ets',
    'features/account/service/payment/HmsIapProvider.ets',
    'features/account/service/payment/PaymentManager.ets',
    'features/account/service/payment/PaymentProvider.ets',
    'features/account/service/payment/WechatProvider.ets',
    'features/account/service/subscription/PricingTable.ets',
    'features/account/service/subscription/SubscriptionState.ets',
  ]),
};

function bucketFor(relpath) {
  if (PR5_FILES.d1to3.has(relpath)) return 'd1to3';
  if (PR5_FILES.d2to3.has(relpath)) return 'd2to3';
  if (PR5_FILES.d2to4.has(relpath)) return 'd2to4';
  return null;
}

async function main() {
  let filesChanged = 0;
  let importsChanged = 0;
  const alt = TARGETS.join('|');

  for await (const filepath of glob(`${ETS_ROOT}/features/**/*.ets`)) {
    const relpath = filepath.replace(`${ETS_ROOT}/`, '');
    const bucket = bucketFor(relpath);
    if (!bucket) continue;

    const original = readFileSync(filepath, 'utf8');
    let modified = original;
    let count = 0;

    if (bucket === 'd1to3') {
      // Was depth 1, now depth 3, need +2.
      // Only single-segment '../<target>/' is meaningful for depth-1 originals.
      const re1 = new RegExp(`(['"])\\.\\.\\/(${alt})\\/`, 'g');
      modified = modified.replace(re1, (_, q, t) => { count++; return `${q}../../../${t}/`; });
    } else if (bucket === 'd2to3') {
      // Was depth 2, now depth 3, need +1.
      // Depth-2 origin used '../../<target>/' to reach root. Now needs '../../../<target>/'.
      const re2 = new RegExp(`(['"])\\.\\.\\/\\.\\.\\/(${alt})\\/`, 'g');
      modified = modified.replace(re2, (_, q, t) => { count++; return `${q}../../../${t}/`; });
    } else if (bucket === 'd2to4') {
      // Was depth 2, now depth 4, need +2.
      // Depth-2 origin used '../../<target>/' to reach root. Now needs '../../../../<target>/'.
      const re2 = new RegExp(`(['"])\\.\\.\\/\\.\\.\\/(${alt})\\/`, 'g');
      modified = modified.replace(re2, (_, q, t) => { count++; return `${q}../../../../${t}/`; });
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
