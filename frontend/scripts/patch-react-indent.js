/**
 * Postinstall patch: fixes the `.repeat(indent)` crash that occurs when
 * indent = -1 in React 19 / Next.js 16 Turbopack builds.
 * Replaces `.repeat(indent)` → `.repeat(Math.max(0, indent))` in the
 * affected compiled files.
 */

const fs = require('fs');
const path = require('path');

// ── Patch 1: fix `.repeat(indent)` ──────────────────────────────────────────

const targets = [
  'node_modules/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js',
  'node_modules/react-dom/cjs/react-dom-client.development.js',
];

const FIND = /\.repeat\(indent\)/g;
const REPLACE = '.repeat(Math.max(0, indent))';

let patched = 0;
let skipped = 0;

for (const rel of targets) {
  const filePath = path.resolve(__dirname, '..', rel);

  if (!fs.existsSync(filePath)) {
    console.log(`[patch-react-indent] SKIP (not found): ${rel}`);
    skipped++;
    continue;
  }

  const original = fs.readFileSync(filePath, 'utf8');

  if (!FIND.test(original)) {
    // Reset lastIndex after test()
    FIND.lastIndex = 0;
    console.log(`[patch-react-indent] SKIP (already patched or not applicable): ${rel}`);
    skipped++;
    continue;
  }

  FIND.lastIndex = 0;
  const updated = original.replace(FIND, REPLACE);
  fs.writeFileSync(filePath, updated, 'utf8');
  const count = (original.match(FIND) || []).length;
  FIND.lastIndex = 0;
  console.log(`[patch-react-indent] PATCHED (${count} occurrences): ${rel}`);
  patched++;
}

console.log(`[patch-react-indent] Done — ${patched} file(s) patched, ${skipped} skipped.`);

// ── Patch 2: guard performance.clearMarks / performance.clearMeasures ────────
// Next.js 16 / Turbopack bundles the Pages Router client which calls
// performance.clearMarks(mark) without checking the method exists.
// In certain environments (partial performance shims, SSR polyfills) the
// method is absent, producing "mgt.clearMarks is not a function".

const CM_TARGETS = [
  'node_modules/next/dist/client/index.js',
];

// Matches:  performance.clearMarks(mark)
// Replaces: performance.clearMarks && performance.clearMarks(mark)
const CM_FIND    = /performance\.clearMarks\(([^)]+)\)/g;
const CM_REPLACE = 'performance.clearMarks && performance.clearMarks($1)';

// Also guard clearMeasures used just below
const CME_FIND    = /performance\.clearMeasures\(([^)]+)\)/g;
const CME_REPLACE = 'performance.clearMeasures && performance.clearMeasures($1)';

let cmPatched = 0;
let cmSkipped = 0;

for (const rel of CM_TARGETS) {
  const filePath = path.resolve(__dirname, '..', rel);

  if (!fs.existsSync(filePath)) {
    console.log(`[patch-clearmarks] SKIP (not found): ${rel}`);
    cmSkipped++;
    continue;
  }

  let src = fs.readFileSync(filePath, 'utf8');

  if (!CM_FIND.test(src)) {
    CM_FIND.lastIndex = 0;
    console.log(`[patch-clearmarks] SKIP (already patched or not applicable): ${rel}`);
    cmSkipped++;
    continue;
  }

  CM_FIND.lastIndex = 0;
  src = src.replace(CM_FIND, CM_REPLACE);
  src = src.replace(CME_FIND, CME_REPLACE);
  fs.writeFileSync(filePath, src, 'utf8');
  console.log(`[patch-clearmarks] PATCHED: ${rel}`);
  cmPatched++;
}

console.log(`[patch-clearmarks] Done — ${cmPatched} file(s) patched, ${cmSkipped} skipped.`);
