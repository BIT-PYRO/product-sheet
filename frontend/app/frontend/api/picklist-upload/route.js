import { read, utils } from 'xlsx';
import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

// -- Header normalizer ---------------------------------------------------------

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// -- Number utilities ----------------------------------------------------------

function toInt(value) {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number.parseInt(String(value).replace(/[^0-9.-]/g, ''), 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

// -- PDF parser ---------------------------------------------------------------
//
// SKUs in picklist PDFs look like: AJB11/G, AJB3/S, AJC1/G
// Pattern used here is intentionally strict so random UI text like "D"
// or "OneDesk" is never treated as a SKU.
const PDF_SKU_RE = /^(?=.*\d)(?=.*\/)[A-Z][A-Z0-9]{1,24}\/[A-Z0-9]{1,4}$/i;

// Full-row pattern: SKU  product-name  number  (columns sep by 2+ spaces).
const PDF_FULL_ROW_RE =
  /^((?=.*\d)(?=.*\/)[A-Z][A-Z0-9]{1,24}\/[A-Z0-9]{1,4})\s{2,}(.+?)\s{2,}(\d+)(?:\s+\d+)?(?:\s.*)?$/i;

function isPicklistSku(value) {
  return PDF_SKU_RE.test(String(value || '').trim().toUpperCase());
}

function isNoiseLine(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return true;

  return [
    'sku',
    'product',
    'needed',
    'available',
    'total',
    'sku picklist',
  ].includes(normalized);
}

function mergePicklistItems(items) {
  const bySku = new Map();

  items.forEach((item) => {
    const sku = String(item?.sku || '').trim().toUpperCase();
    if (!isPicklistSku(sku)) {
      return;
    }

    const current = bySku.get(sku);
    if (current) {
      current.needed += toInt(item?.needed);
      if (!current.listingName && item?.listingName) {
        current.listingName = String(item.listingName).trim();
      }
      return;
    }

    bySku.set(sku, {
      sku,
      listingName: String(item?.listingName || sku).trim(),
      needed: toInt(item?.needed),
    });
  });

  return Array.from(bySku.values());
}

function parsePdfPicklistText(rawText) {
  const allLines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const sectionStart = allLines.findIndex((line) => /sku\s+picklist/i.test(line));
  const lines = sectionStart >= 0 ? allLines.slice(sectionStart) : allLines;

  const items = [];

  // Strategy 1: every row on one line with 2+ spaces between columns.
  for (const line of lines) {
    const m = line.match(PDF_FULL_ROW_RE);
    if (m) {
      items.push({ sku: m[1], listingName: m[2].trim(), needed: toInt(m[3]) });
    }
  }

  if (items.length > 0) return mergePicklistItems(items);

  // Strategy 2: each PDF cell is on its own line (SKU / name / number).
  let i = 0;
  while (i < lines.length) {
    const skuMatch = lines[i].match(PDF_SKU_RE);
    if (skuMatch) {
      let name = '';
      let needed = 0;
      let j = i + 1;
      while (j < lines.length) {
        const next = lines[j];
        if (/^\d+$/.test(next)) {
          needed = toInt(next);
          j += 1;
          break;
        }
        if (next.match(PDF_SKU_RE)) break;
        if (!isNoiseLine(next)) {
          name = name ? `${name} ${next}` : next;
        }
        j += 1;
      }
      items.push({ sku: skuMatch[1], listingName: name || skuMatch[1], needed });
      i = j;
      continue;
    }
    i += 1;
  }

  return mergePicklistItems(items);
}

async function parsePdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let pdfParse;
  try {
    // Prefer the package entrypoint when the installed version exports it cleanly.
    pdfParse = (await import('pdf-parse')).default;
  } catch {
    // Fall back to the legacy internal path used by older pdf-parse releases.
    pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
  }
  const { text } = await pdfParse(buffer);

  const items = parsePdfPicklistText(text);

  if (items.length === 0) {
    throw new Error(
      'Could not extract any picklist rows from the PDF. ' +
        'Make sure the PDF has columns: SKU, Product, Needed. ' +
        'Alternatively export as CSV or XLSX.'
    );
  }

  // Return in the same normalised-row format used by the rest of the pipeline.
  return items.map((item) => ({
    _pdfRow: true,
    sku: item.sku,
    listingName: item.listingName,
    needed: item.needed,
  }));
}

// -- CSV / TSV parser ---------------------------------------------------------

function parseDelimited(text, delimiter) {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  if (current.length || row.length) {
    row.push(current);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => String(cell || '').trim() !== ''));
}

function rowsToObjects(matrix) {
  if (!Array.isArray(matrix) || matrix.length === 0) return [];

  const looksLikeSkuHeader = (header) =>
    [
      'sku',
      'mastersku',
      'productsku',
      'itemcode',
      'code',
      'itemsku',
      'stocksku',
      'finalstocksku',
    ].includes(header);

  const looksLikeNeededHeader = (header) =>
    [
      'needed',
      'need',
      'required',
      'requiredqty',
      'neededqty',
      'demand',
      'demandqty',
      'qty',
      'quantity',
      'pickqty',
    ].includes(header);

  // Some sheets have title rows before the real header. Find the best header row
  // in the first few lines instead of assuming row 1 is the header.
  let headerIndex = 0;
  let bestScore = -1;
  const scanLimit = Math.min(matrix.length, 12);
  for (let index = 0; index < scanLimit; index += 1) {
    const headers = (matrix[index] || []).map((value) => normalizeHeader(value));
    const skuHits = headers.filter(looksLikeSkuHeader).length;
    const neededHits = headers.filter(looksLikeNeededHeader).length;
    const score = skuHits * 3 + neededHits * 2;
    if (score > bestScore) {
      bestScore = score;
      headerIndex = index;
    }
  }

  const [headerRow, ...dataRows] = matrix.slice(headerIndex);
  const headers = headerRow.map((value) => normalizeHeader(value));

  return dataRows
    .map((cells) => {
      const row = {};
      headers.forEach((header, index) => {
        if (!header) return;
        row[header] = String(cells[index] ?? '').trim();
      });
      return row;
    })
    .filter((row) => Object.values(row).some((value) => String(value || '').trim() !== ''));
}

// -- Excel parser -------------------------------------------------------------

function parseExcelRows(arrayBuffer) {
  const workbook = read(Buffer.from(arrayBuffer), { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const matrix = utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
    raw: false,
  });

  return rowsToObjects(matrix);
}

// -- File parser dispatcher ---------------------------------------------------

async function parsePicklistFile(file) {
  const fileName = String(file?.name || '').trim();
  const extension = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';

  // PDF: use pdf-parse + custom text parser.
  if (extension === 'pdf') {
    return parsePdf(file);
  }

  // Excel.
  if (extension === 'xlsx' || extension === 'xls') {
    const arrayBuffer = await file.arrayBuffer();
    return parseExcelRows(arrayBuffer);
  }

  const text = await file.text();

  const normalizeObjects = (rows) =>
    rows.map((row) => {
      const normalized = {};
      Object.entries(row || {}).forEach(([key, value]) => {
        normalized[normalizeHeader(key)] = value;
      });
      return normalized;
    });

  // Try JSON first.
  try {
    const parsed = JSON.parse(text);
    const jsonRows = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.data)
      ? parsed.data
      : Array.isArray(parsed?.products)
      ? parsed.products
      : [];
    if (jsonRows.length > 0) {
      return normalizeObjects(jsonRows);
    }
  } catch {
    // Not JSON, continue with delimited parsing.
  }

  // Auto-detect CSV vs TSV.
  const delimiterCandidates = extension === 'tsv' ? ['\t', ','] : [',', '\t'];
  for (const delimiter of delimiterCandidates) {
    const rows = rowsToObjects(parseDelimited(text, delimiter));
    if (rows.length > 0) {
      return rows;
    }
  }

  throw new Error(
    'Unable to parse the uploaded file. Supported formats: PDF, XLSX, XLS, CSV, TSV, JSON.'
  );
}

// -- Picklist row mapper ------------------------------------------------------

function firstValue(row, keys, fallback = '') {
  for (const key of keys) {
    const value = row[key];
    if (String(value || '').trim() !== '') {
      return String(value).trim();
    }
  }
  return fallback;
}

/**
 * Maps a parsed row to a picklist item.
 * Handles both PDF rows (with pre-parsed fields) and CSV/Excel normalised rows.
 * Returns null when the row has no valid SKU.
 */
function asPicklistItem(row) {
  // PDF rows are already parsed into { sku, listingName, needed }.
  if (row._pdfRow) {
    const sku = String(row.sku || '').trim();
    if (!isPicklistSku(sku)) return null;
    return { sku, listingName: String(row.listingName || sku).trim(), needed: row.needed || 0 };
  }

  const sku = firstValue(row, [
    'sku',
    'mastersku',
    'productsku',
    'itemcode',
    'code',
    'itemsku',
    'stocksku',
    'finalstocksku',
  ]);
  if (!sku || !isPicklistSku(sku)) return null;

  const listingName = firstValue(
    row,
    ['product', 'productname', 'listingname', 'name', 'title', 'itemname', 'description'],
    sku
  );

  const neededRaw = firstValue(row, [
    'needed',
    'need',
    'required',
    'requiredqty',
    'neededqty',
    'demand',
    'demandqty',
    'qty',
    'quantity',
    'pickqty',
  ]);
  const needed = toInt(neededRaw);

  return { sku, listingName, needed };
}

// -- Backend helpers ----------------------------------------------------------

async function readResponseJsonSafe(response) {
  if (!response) return null;
  if (response.status === 204 || response.status === 205) return null;
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    await response.text().catch(() => '');
    return null;
  }
  return response.json().catch(() => null);
}

function errorMessageFromPayload(payload, fallback) {
  if (payload?.message) {
    return payload.message;
  }

  const details = payload?.error?.details;
  if (Array.isArray(details) && details.length > 0) {
    return details.join(' | ');
  }

  if (typeof details === 'string' && details.trim()) {
    return details.trim();
  }

  if (details && typeof details === 'object') {
    const parts = [];
    Object.entries(details).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        parts.push(`${key}: ${value.join(', ')}`);
      } else if (value !== null && value !== undefined && String(value).trim() !== '') {
        parts.push(`${key}: ${String(value)}`);
      }
    });
    if (parts.length > 0) {
      return parts.join(' | ');
    }
  }

  const errorMessage = payload?.error?.message;
  if (errorMessage) {
    return errorMessage;
  }

  return fallback;
}

function isOkResponse(response, payload) {
  // Some backend endpoints may return 2xx without explicit success flag.
  return Boolean(response?.ok) && payload?.success !== false;
}

function sanitizeLabel(value, fallback = '') {
  const normalized = String(value || '').trim().replace(/::/g, '-').replace(/\s+/g, ' ');
  return normalized || fallback;
}

function parsePositiveInt(value, fallback = 1) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function mapBackendPicklist(payloadData, fallbackMeta) {
  const entry = payloadData || {};
  const uploadedAt = entry?.date || fallbackMeta.date || new Date().toISOString();
  return {
    id: sanitizeLabel(entry?.id, fallbackMeta.id),
    number: parsePositiveInt(entry?.number, parsePositiveInt(fallbackMeta.number, 1)),
    name: sanitizeLabel(entry?.name, fallbackMeta.name),
    uploadedBy: sanitizeLabel(entry?.uploadedBy, fallbackMeta.uploadedBy || 'Unknown'),
    date: uploadedAt,
    dateFormatted: entry?.dateFormatted || new Date(uploadedAt).toLocaleString(),
    items: Array.isArray(entry?.items)
      ? entry.items.map((item) => ({
          sku: String(item?.sku || '').trim().toUpperCase(),
          listingName: String(item?.listingName || item?.sku || '').trim(),
          needed: toInt(item?.needed),
        }))
      : [],
  };
}

async function savePicklistGroup(request, groupMeta, items) {
  const payload = {
    id: groupMeta.id,
    number: parsePositiveInt(groupMeta.number, 1),
    name: groupMeta.name,
    uploadedBy: groupMeta.uploadedBy,
    date: groupMeta.date,
    items: items.map((item) => ({
      sku: String(item.sku || '').trim().toUpperCase(),
      listingName: String(item.listingName || item.sku || '').trim(),
      needed: toInt(item.needed),
    })),
  };

  const response = await proxyAuthenticatedRequest(request, '/api/v1/inventory/picklist-groups/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const backendPayload = await readResponseJsonSafe(response);

  if (!isOkResponse(response, backendPayload)) {
    throw new Error(errorMessageFromPayload(backendPayload, 'Failed to save picklist in backend.'));
  }

  return mapBackendPicklist(backendPayload?.data, groupMeta);
}

// -- Route handler ------------------------------------------------------------

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return Response.json(
        { success: false, message: 'Please upload a file.' },
        { status: 400 }
      );
    }

    const uploadedAt = sanitizeLabel(formData.get('uploadedAt'), new Date().toISOString());
    const groupMeta = {
      id: sanitizeLabel(formData.get('picklistGroupId'), `picklist-${Date.now()}`),
      number: parsePositiveInt(formData.get('picklistNumber'), 1),
      uploadedBy: sanitizeLabel(formData.get('uploadedBy'), 'Unknown'),
      date: uploadedAt,
      dateFormatted: new Date(uploadedAt).toLocaleString(),
      name: sanitizeLabel(formData.get('picklistName'), String(file?.name || 'Picklist')),
    };

    const parsedRows = await parsePicklistFile(file);
    const items = mergePicklistItems(parsedRows.map(asPicklistItem).filter(Boolean));

    if (!items.length) {
      return Response.json(
        {
          success: false,
          message:
            'No valid rows found. Ensure the file has SKU, Product, and Needed columns.',
        },
        { status: 400 }
      );
    }

    const savedGroup = await savePicklistGroup(request, groupMeta, items);

    return Response.json({
      success: true,
      message: `Picklist uploaded successfully. Saved ${items.length} rows to inventory picklist #${savedGroup.number}.`,
      fileName: file.name,
      parsedRows: parsedRows.length,
      validRows: items.length,
      savedCount: items.length,
      failedCount: 0,
      failures: [],
      picklistGroup: {
        id: savedGroup.id,
        number: savedGroup.number,
        name: savedGroup.name,
        uploadedBy: savedGroup.uploadedBy,
        date: savedGroup.date,
        dateFormatted: savedGroup.dateFormatted,
      },
      picklistItems: savedGroup.items,
      savedItems: savedGroup.items,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: error.message || 'Failed to upload picklist.',
      },
      { status: 500 }
    );
  }
}
