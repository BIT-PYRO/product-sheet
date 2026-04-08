const fs = require('fs');
const p = 'C:\\Users\\Apoorva Dixit\\Product_sheet\\product-sheet\\frontend\\app\\frontend\\inventory\\stone-inventory\\page.jsx';
let t = fs.readFileSync(p, 'utf8');

// Normalize to LF for easier manipulation, will restore CRLF at end
const hasCRLF = t.includes('\r\n');
if (hasCRLF) t = t.replace(/\r\n/g, '\n');

// ────────────────────────────────────────────────────────────────────────────
// 1. Wrap the two price-by radio <td>s and the price <td> with {canAmount && (...)}
// ────────────────────────────────────────────────────────────────────────────
const pcsBlock = `                      {/* price by pcs radio */}
                      <td className="border border-soft-border px-2 py-1 text-center">
                        <input
                          type="radio"
                          name={\`price_by_\${row.stoneId}\`}
                          checked={row.price_by === 'pcs'}
                          onChange={() => updateStockRow(row.stoneId, 'price_by', 'pcs')}
                          className="h-4 w-4 cursor-pointer accent-trust-blue"
                        />
                      </td>

                      {/* price by weight radio */}
                      <td className="border border-soft-border px-2 py-1 text-center">
                        <input
                          type="radio"
                          name={\`price_by_\${row.stoneId}\`}
                          checked={row.price_by === 'weight'}
                          onChange={() => updateStockRow(row.stoneId, 'price_by', 'weight')}
                          className="h-4 w-4 cursor-pointer accent-trust-blue"
                        />
                      </td>

                      {/* price */}
                      <td className="border border-soft-border px-2 py-1">
                        <CellInput
                          type="number"
                          value={row.price}
                          placeholder="0.00"
                          onChange={(v) => updateStockRow(row.stoneId, 'price', v)}
                        />
                      </td>`;

const pcsBlockNew = `                      {/* price by pcs radio */}
                      {canAmount && (
                        <td className="border border-soft-border px-2 py-1 text-center">
                          <input
                            type="radio"
                            name={\`price_by_\${row.stoneId}\`}
                            checked={row.price_by === 'pcs'}
                            onChange={() => updateStockRow(row.stoneId, 'price_by', 'pcs')}
                            className="h-4 w-4 cursor-pointer accent-trust-blue"
                          />
                        </td>
                      )}

                      {/* price by weight radio */}
                      {canAmount && (
                        <td className="border border-soft-border px-2 py-1 text-center">
                          <input
                            type="radio"
                            name={\`price_by_\${row.stoneId}\`}
                            checked={row.price_by === 'weight'}
                            onChange={() => updateStockRow(row.stoneId, 'price_by', 'weight')}
                            className="h-4 w-4 cursor-pointer accent-trust-blue"
                          />
                        </td>
                      )}

                      {/* price */}
                      {canAmount && (
                        <td className="border border-soft-border px-2 py-1">
                          <CellInput
                            type="number"
                            value={row.price}
                            placeholder="0.00"
                            onChange={(v) => updateStockRow(row.stoneId, 'price', v)}
                          />
                        </td>
                      )}`;

if (t.includes(pcsBlock)) {
  t = t.replace(pcsBlock, pcsBlockNew);
  console.log('✓ Replaced price-by / price block');
} else {
  console.error('✗ Could not find price-by / price block');
  process.exit(1);
}

// ────────────────────────────────────────────────────────────────────────────
// 2. Find the amount cell line and wrap it
// ────────────────────────────────────────────────────────────────────────────
// The amount cell contains the em-dash character encoded as multi-byte — find by surrounding text
const amountMarker = '{/* amount (auto-calculated, read-only) */}';
const amountIdx = t.indexOf(amountMarker);
if (amountIdx === -1) {
  console.error('✗ Could not find amount marker');
  process.exit(1);
}

// Find the <td ...> opening after the marker
const tdStart = t.indexOf('<td', amountIdx);
// Find the </td> closing
const tdEnd = t.indexOf('</td>', tdStart) + '</td>'.length;

const amountTd = t.substring(tdStart, tdEnd);
const amountFull = t.substring(amountIdx, tdEnd);

const newAmountFull = `{/* amount (auto-calculated, read-only) */}
                      {canAmount && (
                        ${amountTd.split('\n').join('\n                        ')}
                      )}`;

t = t.substring(0, amountIdx) + newAmountFull + t.substring(tdEnd);
console.log('✓ Replaced amount cell block');

// ────────────────────────────────────────────────────────────────────────────
// 3. Header row 1 – wrap "Price by (check one)" and "Price" and "Amount" th
// ────────────────────────────────────────────────────────────────────────────
// Already handled by multi_replace_string_in_file (which succeeded for headers)
// Check if headers were already replaced
if (t.includes('{canAmount && (') && t.includes('Price by (check one)')) {
  console.log('Info: headers already gated');
} else {
  console.log('Info: headers not yet gated (handled by prior tool call)');
}

// ────────────────────────────────────────────────────────────────────────────
// Write back
// ────────────────────────────────────────────────────────────────────────────
if (hasCRLF) t = t.replace(/\n/g, '\r\n');
fs.writeFileSync(p, t, 'utf8');
console.log('✓ File saved');
