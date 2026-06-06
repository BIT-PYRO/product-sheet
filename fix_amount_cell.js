const fs = require('fs');
const p = 'C:\\Users\\Apoorva Dixit\\Product_sheet\\product-sheet\\frontend\\app\\frontend\\inventory\\stone-inventory\\page.jsx';
const t = fs.readFileSync(p, 'utf8');

const MARKER = '{/* amount (auto-calculated, read-only) */}';
const idx = t.indexOf(MARKER);
if (idx === -1) { console.error('marker not found'); process.exit(1); }

// Find the td opening tag
const tdOpen = t.indexOf('<td', idx);
// Find the matching </td>
const tdClose = t.indexOf('</td>', tdOpen) + 5;

const original = t.substring(idx, tdClose);
const tdContent = t.substring(tdOpen, tdClose);

// Indent each line of the td by 2 more spaces
const indented = tdContent.split('\n').map(l => '  ' + l).join('\n');

const replacement = MARKER + '\n' +
  '                      {canAmount && (\n' +
  indented + '\n' +
  '                      )}';

const result = t.substring(0, idx) + replacement + t.substring(tdClose);
fs.writeFileSync(p, result, 'utf8');
console.log('Done. Replaced:', JSON.stringify(original.substring(0, 80)));
