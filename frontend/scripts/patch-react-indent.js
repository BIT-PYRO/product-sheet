/**
 * Postinstall patch: fixes the `.repeat(indent)` crash that occurs when
 * indent = -1 in React 19 / Next.js 16 Turbopack builds.
 * Replaces `.repeat(indent)` → `.repeat(Math.max(0, indent))` in the
 * affected compiled files.
 */

const fs = require('fs');
const path = require('path');

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
