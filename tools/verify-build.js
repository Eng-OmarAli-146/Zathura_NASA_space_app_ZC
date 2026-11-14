#!/usr/bin/env node
/* ============================================================================
   tools/verify-build.js
   Ensures the committed play/game1.html is exactly what src/ produces.

   The whole point of committing a build is that a judge (or a teacher with no
   Node installed) can open the game and it works. The point of this script is
   that the committed build never silently drifts from the source.

   Usage: node tools/verify-build.js
   Exit:  0 = identical · 1 = drift (diffs are printed)
   ========================================================================== */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const COMMITTED = path.join(ROOT, 'play', 'game1.html');

if (!fs.existsSync(COMMITTED)) {
  console.error('✖ play/game1.html not found — run: node build.js');
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zathura-verify-'));
let failed = false;

try {
  fs.cpSync(path.join(ROOT, 'src'), path.join(tmp, 'src'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'play'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'build.js'), path.join(tmp, 'build.js'));

  execFileSync(process.execPath, ['build.js'], { cwd: tmp, stdio: 'pipe' });

  const fresh = fs.readFileSync(path.join(tmp, 'play', 'game1.html'));
  const committed = fs.readFileSync(COMMITTED);

  if (fresh.equals(committed)) {
    const kb = (committed.length / 1024).toFixed(1);
    console.log(`✅ play/game1.html matches src/ (${kb} KB, QA hooks stripped, byte-for-byte)`);
  } else {
    failed = true;
    console.error('✖ play/game1.html does NOT match src/');
    console.error(`  committed: ${committed.length} bytes`);
    console.error(`  rebuilt:   ${fresh.length} bytes`);

    const a = committed.toString('utf8').split('\n');
    const b = fresh.toString('utf8').split('\n');
    let shown = 0;
    for (let i = 0; i < Math.max(a.length, b.length) && shown < 10; i++) {
      if (a[i] !== b[i]) {
        console.error(`  line ${i + 1}:`);
        console.error(`    committed: ${JSON.stringify((a[i] || '').slice(0, 120))}`);
        console.error(`    rebuilt:   ${JSON.stringify((b[i] || '').slice(0, 120))}`);
        shown++;
      }
    }
    console.error('  → run: node build.js && git add play/game1.html');
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

process.exit(failed ? 1 : 0);
