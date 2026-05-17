// scripts/fix-pr6-features-depth.mjs
// PR-6 depth fixup for files moved into features/support, features/admin,
// features/notification, features/multi-device, features/multi-platform,
// features/dev.
//
// Origin depth → new depth tracking (depth = number of intermediate dirs
// between main/ets/ and the file):
//   - pages/X.ets               (d=1) → features/support/pages/X.ets       (d=3) → +2 (d1to3)
//   - components/X.ets          (d=1) → features/multi-device/components/X (d=3) → +2 (d1to3)
//   - pages/admin/X.ets         (d=2) → features/admin/pages/X.ets         (d=3) → +1 (d2to3)
//   - service/admin/X.ets       (d=2) → features/admin/service/X.ets       (d=3) → +1 (d2to3)
//   - service/car/X.ets         (d=2) → features/multi-platform/service/X  (d=3) → +1 (d2to3)
//   - service/tv/X.ets          (d=2) → features/multi-platform/service/X  (d=3) → +1 (d2to3)
//   - service/notification/X    (d=2) → features/notification/service/notification/X (d=4) → +2 (d2to4)
//   - service/push/X            (d=2) → features/notification/service/push/X         (d=4) → +2 (d2to4)
//   - service/distributed/X     (d=2) → features/multi-device/service/distributed/X  (d=4) → +2 (d2to4)
//   - service/sync/X.ets        (d=2) → features/multi-device/service/sync/X.ets     (d=4) → +2 (d2to4)
//   - pages/{car,native,tablet,tv,watch}/X (d=2) → features/multi-platform/pages/<sub>/X (d=4) → +2 (d2to4)
//   - pages/atomic/X            (d=2) → features/multi-platform/pages/atomic/X       (d=4) → +2 (d2to4)
//   - pages/dev/X               (d=2) → features/dev/pages/dev/X                     (d=4) → +2 (d2to4)
//   - service/sync/syncers/X    (d=3) → features/multi-device/service/sync/syncers/X (d=5) → +2 (d3to5)
//
// Bare-file sibling refs (e.g. '../HttpClient' inside features/<f>/service/<sub>)
// must be patched manually because the target is a file, not a dir prefix.

import { readFileSync, writeFileSync } from 'node:fs';
import { glob } from 'node:fs/promises';

const TARGETS = ['core', 'ui', 'api', 'store', 'model', 'service', 'abilities', 'entryability', 'features', 'components', 'pages'];
const ETS_ROOT = 'harmony-app/entry/src/main/ets';

const PR6_FILES = {
  // origin depth 1 → now depth 3, need +2
  d1to3: new Set([
    'features/support/pages/Faq.ets',
    'features/support/pages/Feedback.ets',
    'features/support/pages/TicketList.ets',
    'features/support/pages/TicketDetail.ets',
    'features/support/pages/PrivacyPolicy.ets',
    'features/support/pages/UserAgreement.ets',
    'features/support/pages/About.ets',
    'features/support/pages/OssLicenses.ets',
    'features/notification/pages/NotificationCenter.ets',
    'features/multi-device/components/PasteFromOtherDeviceSheet.ets',
    'features/multi-device/components/DeviceSelectorSheet.ets',
  ]),
  // origin depth 2 → now depth 3, need +1
  d2to3: new Set([
    'features/admin/pages/MonitorDashboard.ets',
    'features/admin/service/MonitorApi.ets',
    'features/multi-platform/service/VoiceCommand.ets',
    'features/multi-platform/service/RemoteController.ets',
  ]),
  // origin depth 2 → now depth 4, need +2
  d2to4: new Set([
    'features/notification/service/notification/MultiDeviceNotifier.ets',
    'features/notification/service/notification/NotificationTemplates.ets',
    'features/notification/service/push/HmsPushService.ets',
    'features/notification/service/push/NotificationChannel.ets',
    'features/multi-device/service/distributed/DeviceManager.ets',
    'features/multi-device/service/distributed/DistributedBookshelfStore.ets',
    'features/multi-device/service/distributed/DistributedClipboard.ets',
    'features/multi-device/service/distributed/WatchSync.ets',
    'features/multi-device/service/sync/SyncEngine.ets',
    'features/multi-platform/pages/car/CarHome.ets',
    'features/multi-platform/pages/car/CarPlayer.ets',
    'features/multi-platform/pages/native/XComponentDemo.ets',
    'features/multi-platform/pages/tablet/DiscoverTabletLayout.ets',
    'features/multi-platform/pages/tablet/LibraryTabletLayout.ets',
    'features/multi-platform/pages/tablet/NotesTabletLayout.ets',
    'features/multi-platform/pages/tablet/ReaderTabletLayout.ets',
    'features/multi-platform/pages/tv/SmartScreenAudiobook.ets',
    'features/multi-platform/pages/tv/SmartScreenHome.ets',
    'features/multi-platform/pages/tv/SmartScreenReader.ets',
    'features/multi-platform/pages/watch/WatchHome.ets',
    'features/multi-platform/pages/watch/WatchStats.ets',
    'features/multi-platform/pages/watch/WatchVocab.ets',
    'features/multi-platform/pages/atomic/LookupPage.ets',
    'features/multi-platform/pages/atomic/ShareCardPage.ets',
    'features/dev/pages/dev/ComponentGallery.ets',
  ]),
  // origin depth 3 → now depth 5, need +2
  d3to5: new Set([
    'features/multi-device/service/sync/syncers/BookshelfItemSyncer.ets',
    'features/multi-device/service/sync/syncers/PersonalNoteSyncer.ets',
    'features/multi-device/service/sync/syncers/ReadingHighlightSyncer.ets',
    'features/multi-device/service/sync/syncers/ReadingProgressSyncer.ets',
    'features/multi-device/service/sync/syncers/VocabNoteSyncer.ets',
  ]),
};

function bucketFor(relpath) {
  if (PR6_FILES.d1to3.has(relpath)) return 'd1to3';
  if (PR6_FILES.d2to3.has(relpath)) return 'd2to3';
  if (PR6_FILES.d2to4.has(relpath)) return 'd2to4';
  if (PR6_FILES.d3to5.has(relpath)) return 'd3to5';
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
      // origin depth 1 used '../<target>/'. Now depth 3 needs '../../../<target>/'.
      const re1 = new RegExp(`(['"])\\.\\.\\/(${alt})\\/`, 'g');
      modified = modified.replace(re1, (_, q, t) => { count++; return `${q}../../../${t}/`; });
    } else if (bucket === 'd2to3') {
      // origin depth 2 used '../../<target>/'. Now depth 3 needs '../../../<target>/'.
      const re2 = new RegExp(`(['"])\\.\\.\\/\\.\\.\\/(${alt})\\/`, 'g');
      modified = modified.replace(re2, (_, q, t) => { count++; return `${q}../../../${t}/`; });
    } else if (bucket === 'd2to4') {
      // origin depth 2 used '../../<target>/'. Now depth 4 needs '../../../../<target>/'.
      const re2 = new RegExp(`(['"])\\.\\.\\/\\.\\.\\/(${alt})\\/`, 'g');
      modified = modified.replace(re2, (_, q, t) => { count++; return `${q}../../../../${t}/`; });
    } else if (bucket === 'd3to5') {
      // origin depth 3 used '../../../<target>/'. Now depth 5 needs '../../../../../<target>/'.
      const re3 = new RegExp(`(['"])\\.\\.\\/\\.\\.\\/\\.\\.\\/(${alt})\\/`, 'g');
      modified = modified.replace(re3, (_, q, t) => { count++; return `${q}../../../../../${t}/`; });
    }

    if (modified !== original) {
      writeFileSync(filepath, modified);
      filesChanged++;
      importsChanged += count;
      console.log(`Fixed ${count} imports in ${filepath} (${bucket})`);
    }
  }

  console.log(`---\nTotal: ${filesChanged} files / ${importsChanged} imports`);
}

main().catch(err => { console.error(err); process.exit(1); });
