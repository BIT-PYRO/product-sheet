import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const maxDuration = 60; // seconds – extend execution window on Vercel / Render

const ACCESS_COOKIE = 'psd-access-token';
const REFRESH_COOKIE = 'psd-refresh-token';
const DEFAULT_BACKEND_URL = process.env.NODE_ENV === 'production' ? 'https://product-sheet.onrender.com' : 'http://127.0.0.1:8000';
const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function backendBaseUrl() {
  const url = (process.env.BACKEND_BASE_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');
  if (process.env.NODE_ENV !== 'production') {
    const normalized = String(url).toLowerCase();
    const isLocal = normalized.includes('127.0.0.1') || normalized.includes('localhost') || normalized.includes('0.0.0.0');
    if (!isLocal) {
      throw new Error(`Unsafe BACKEND_BASE_URL in development: ${url}. Use a local backend URL only.`);
    }
  }
  return url;
}

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeRow(row) {
  return Object.entries(row || {}).reduce((accumulator, [key, value]) => {
    accumulator[normalizeKey(key)] = typeof value === 'string' ? value.trim() : value;
    return accumulator;
  }, {});
}

function pickValue(row, aliases, fallback = '') {
  for (const alias of aliases) {
    const value = row[normalizeKey(alias)];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return typeof value === 'string' ? value.trim() : value;
    }
  }
  return fallback;
}

function toNumber(value, fallback = 0) {
  const normalized = String(value ?? '')
    .replace(/,/g, '')
    .trim();

  if (!normalized) {
    return fallback;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value, fallback = true) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  if (['true', '1', 'yes', 'active', 'approved'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'inactive', 'rejected'].includes(normalized)) {
    return false;
  }
  return fallback;
}

function errorMessageFromPayload(payload, fallback) {
  if (!payload) {
    return fallback;
  }

  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message.trim();
  }

  if (typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error.trim();
  }

  if (Array.isArray(payload.error?.details) && payload.error.details.length > 0) {
    return payload.error.details.join(', ');
  }

  if (payload.error?.details && typeof payload.error.details === 'object') {
    const detailEntries = Object.entries(payload.error.details)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`);
    if (detailEntries.length > 0) {
      return detailEntries.join(' | ');
    }
  }

  return fallback;
}

async function requestTokenRefresh(refreshToken) {
  if (!refreshToken) {
    return null;
  }

  const response = await fetch(`${backendBaseUrl()}/api/v1/auth/refresh/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh: refreshToken }),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);
  const access = payload?.data?.access;

  if (!response.ok || !access) {
    return null;
  }

  return access;
}

function createBackendClient(request) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value || '';
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value || '';
  let activeToken = accessToken;

  const doFetch = async (path, options = {}) => {
    const headers = {
      ...(options.headers || {}),
    };

    if (activeToken) {
      headers.Authorization = `Bearer ${activeToken}`;
    }

    return fetch(`${backendBaseUrl()}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body,
      cache: 'no-store',
    });
  };

  return {
    async request(path, options = {}) {
      let response = await doFetch(path, options);

      if (response.status === 401 && refreshToken) {
        const refreshedToken = await requestTokenRefresh(refreshToken);
        if (refreshedToken) {
          activeToken = refreshedToken;
          response = await doFetch(path, options);
        }
      }

      const isNoContent = response.status === 204 || response.status === 205;
      const payload = isNoContent
        ? null
        : await response.json().catch(() => null);

      return { response, payload };
    },
  };
}

// ── Extract embedded images from an XLSX buffer using the raw ZIP structure ────
// SheetJS CE (v0.18.x) does NOT populate ws['!images'] — images must be read
// directly from xl/drawings/drawing1.xml + xl/drawings/_rels/drawing1.xml.rels
// + xl/media/* via the bundled CFB ZIP parser.
//
// Returns: Map where key = `${excelRow},${excelCol}` (0-based) and value = data URL.
function extractXlsxImages(rawBuffer) {
  try {
    const cfb = XLSX.CFB.read(rawBuffer, { type: 'buffer' });
    const paths = cfb.FullPaths || [];
    const getEntry = (p) => { const i = paths.indexOf(p); return i >= 0 ? cfb.FileIndex[i] : null; };

    const relsEntry = getEntry('Root Entry/xl/drawings/_rels/drawing1.xml.rels');
    const drawEntry = getEntry('Root Entry/xl/drawings/drawing1.xml');
    if (!relsEntry || !drawEntry) return new Map();

    const relsXml = Buffer.from(relsEntry.content).toString('utf8');
    const ridToFile = {};
    let m;
    const relPat = /Id="(rId\d+)"[^>]+Target="\.\.\/media\/([^"]+)"/g;
    while ((m = relPat.exec(relsXml)) !== null) ridToFile[m[1]] = m[2];

    const drawXml = Buffer.from(drawEntry.content).toString('utf8');
    // Handles both oneCellAnchor and twoCellAnchor: capture first <xdr:from> col+row
    const anchorPat = /<xdr:from>\s*<xdr:col>(\d+)<\/xdr:col>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>[\s\S]*?r:embed="(rId\d+)"/g;
    const result = new Map();
    while ((m = anchorPat.exec(drawXml)) !== null) {
      const col = parseInt(m[1]);
      const row = parseInt(m[2]);
      const rid = m[3];
      const mediaFile = ridToFile[rid];
      if (!mediaFile) continue;
      const mediaEntry = getEntry(`Root Entry/xl/media/${mediaFile}`);
      if (!mediaEntry || !mediaEntry.content) continue;
      const ext = mediaFile.split('.').pop().toLowerCase();
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'jpeg' : ext === 'png' ? 'png' : ext;
      const dataUrl = `data:image/${mime};base64,${Buffer.from(mediaEntry.content).toString('base64')}`;
      if (!result.has(`${row},${col}`)) result.set(`${row},${col}`, dataUrl);
    }
    return result;
  } catch {
    return new Map();
  }
}

async function parseUploadFile(file) {
  const fileName = String(file?.name || '').toLowerCase();

  if (fileName.endsWith('.json')) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error('JSON bulk uploads must contain an array of rows.');
    }
    return parsed.map((row) => normalizeRow(row));
  }

  // CSV / TSV — parse as text so we don't rely on the Excel binary reader.
  if (fileName.endsWith('.csv') || fileName.endsWith('.tsv')) {
    const text = await file.text();
    const delimiter = fileName.endsWith('.tsv') ? '\t' : ',';
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) throw new Error('The uploaded file does not contain any rows.');
    const headers = lines[0].split(delimiter).map((h) => h.replace(/^["']|["']$/g, '').trim());
    const rows = lines.slice(1).map((line) => {
      const cells = line.split(delimiter).map((c) => c.replace(/^["']|["']$/g, '').trim());
      const row = {};
      headers.forEach((h, i) => { row[h] = cells[i] ?? ''; });
      return normalizeRow(row);
    });
    if (rows.length === 0) throw new Error('The uploaded file does not contain any rows.');
    return rows;
  }

  // Excel — XLSX.read requires a Uint8Array for type:'array' (ArrayBuffer is NOT the same).
  // cellText/cellHTML disabled to reduce in-memory footprint.
  // Supports BOTH single-row headers AND two-row grouped headers (e.g. "Tracking Info" merged
  // across 9 columns in row 1 with "3DM", "STL", … sub-headers in row 2).
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellText: false, cellHTML: false, cellStyles: false });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error('The uploaded file does not contain any sheets.');
  }

  const sheet = workbook.Sheets[firstSheetName];

  // Read as raw arrays so we can inspect both header rows before building keys.
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  if (!rawRows.length) throw new Error('The uploaded file does not contain any rows.');

  const row0 = (rawRows[0] || []).map(c => String(c));
  const row1 = (rawRows[1] || []).map(c => String(c));

  // Detect two-row grouped header: row 1 has ≥ 2 cells where row 0 is empty but
  // row 1 contains short non-numeric text (i.e. sub-column names, not data values).
  const subHeaderCount = row1.filter((v, i) => {
    const r0 = row0[i].trim();
    const r1v = v.trim();
    return !r0 && r1v && isNaN(Number(r1v)) && r1v.length < 60 && !r1v.startsWith('http');
  }).length;
  const isTwoRowHeader = subHeaderCount >= 2;

  let effectiveHeaders;
  let dataStartIndex;

  if (isTwoRowHeader) {
    // Walk columns left-to-right.  Track the current group name (from row 0).
    // Rule:
    //   • row0 non-empty + row1 empty  → standalone column, key = normalizeKey(row0)
    //   • row0 non-empty + row1 non-empty  → first sub-column of this group,
    //                                        key = normalizeKey(row0) + normalizeKey(row1)
    //   • row0 empty     + row1 non-empty  → subsequent sub-column of previous group,
    //                                        key = groupKey + normalizeKey(row1)
    //   • both empty → unused column, key = ''
    const maxCols = Math.max(row0.length, row1.length);
    effectiveHeaders = [];
    let groupKey = '';
    for (let i = 0; i < maxCols; i++) {
      const r0 = row0[i].trim();
      const r1v = row1[i].trim();
      if (r0) groupKey = normalizeKey(r0);
      const sub = r1v ? normalizeKey(r1v) : '';

      if (r0 && !r1v)  effectiveHeaders.push(normalizeKey(r0));   // standalone
      else if (sub)    effectiveHeaders.push(groupKey + sub);       // grouped sub-column
      else             effectiveHeaders.push('');                    // empty
    }
    dataStartIndex = 2;   // skip both header rows
  } else {
    effectiveHeaders = row0.map(h => normalizeKey(h));
    dataStartIndex = 1;
  }

  const dataRowsIndexed = rawRows
    .slice(dataStartIndex)
    .map((r, i) => ({ row: r, excelRowIdx: i + dataStartIndex }))
    .filter(({ row }) => row.some(c => String(c).trim()));

  if (!dataRowsIndexed.length) throw new Error('The uploaded file does not contain any rows.');

  const rows = dataRowsIndexed.map(({ row }) =>
    effectiveHeaders.reduce((obj, key, i) => {
      if (key) obj[key] = typeof row[i] === 'string' ? row[i].trim() : (row[i] == null ? '' : String(row[i]));
      return obj;
    }, {})
  );

  // ── Extract embedded images via CFB (SheetJS CE does not support ws['!images']) ──
  const imagesByRowCol = extractXlsxImages(Buffer.from(arrayBuffer));
  if (imagesByRowCol.size > 0) {
    // Map column index → field key using effectiveHeaders.
    // For two-row headers the standalone image columns (Rendered Photo, Technical Drawing,
    // Other Photo) appear in row0 only — effectiveHeaders already normalises them correctly.
    const imgColToField = {};
    effectiveHeaders.forEach((h, col) => {
      if (h === 'renderedphoto')    imgColToField[col] = 'renderedphoto';
      else if (h === 'technicaldrawing') imgColToField[col] = 'technicaldrawing';
      else if (h === 'otherphoto')  imgColToField[col] = 'otherphoto';
    });

    dataRowsIndexed.forEach(({ excelRowIdx }, idx) => {
      Object.entries(imgColToField).forEach(([col, fieldKey]) => {
        const dataUrl = imagesByRowCol.get(`${excelRowIdx},${col}`);
        if (dataUrl && !rows[idx][fieldKey]) rows[idx][fieldKey] = dataUrl;
      });
    });
  }

  return rows;
}

function summarizeResult(sheetLabel, createdCount, updatedCount, skippedCount, failures) {
  const parts = [];

  if (createdCount > 0) {
    parts.push(`created ${createdCount}`);
  }
  if (updatedCount > 0) {
    parts.push(`updated ${updatedCount}`);
  }
  if (skippedCount > 0) {
    parts.push(`skipped ${skippedCount}`);
  }

  const failureCount = failures.length;
  if (failureCount > 0) {
    parts.push(`failed ${failureCount}`);
  }

  const base = parts.length > 0 ? parts.join(', ') : 'no rows processed';
  const sample = failureCount > 0 ? ` First error: ${failures[0]}` : '';
  return `${sheetLabel} bulk upload completed: ${base}.${sample}`;
}

function normalizeCustomerStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'inactive' ? 'inactive' : 'active';
}

function normalizeJobStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['assigned', 'in_progress', 'completed', 'cancelled', 'created'].includes(normalized)) {
    return normalized;
  }
  if (normalized === 'in progress') {
    return 'in_progress';
  }
  return 'created';
}

function normalizeKycStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['approved', 'rejected', 'pending'].includes(normalized)) {
    return normalized;
  }
  return 'pending';
}

async function fetchCollection(client, path) {
  const { response, payload } = await client.request(path);
  if (!response.ok) {
    throw new Error(errorMessageFromPayload(payload, `Failed to fetch ${path}`));
  }
  return Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.data?.results)
      ? payload.data.results
      : [];
}

async function uploadProducts(client, rows) {
  const existingProducts = await fetchCollection(client, '/api/v1/products/');
  const productBySku = new Map(
    existingProducts.map((product) => [String(product.master_sku || '').trim().toUpperCase(), product])
  );

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const failures = [];

  // Build per-row tasks first so we can run them in parallel batches
  const tasks = rows.map((row, index) => {
    const sku = String(pickValue(row, ['sku', 'mastersku', 'mastersku', 'productsku'])).trim();
    const name = String(pickValue(row, ['listingname', 'name', 'productname', 'title'], sku)).trim();
    return { row, index, sku, name };
  });

  const BATCH_SIZE = 5;

  for (let batchStart = 0; batchStart < tasks.length; batchStart += BATCH_SIZE) {
    const batch = tasks.slice(batchStart, batchStart + BATCH_SIZE);

    await Promise.all(batch.map(async ({ row, index, sku, name }) => {
      if (!sku) {
        skippedCount += 1;
        return;
      }

      const payload = {
        sku,
        name: name || sku,
        category: String(pickValue(row, ['category'])).trim(),
        selling_price: toNumber(pickValue(row, ['sellingprice', 'selling_price', 'price']), 0),
        cost_price: toNumber(pickValue(row, ['costprice', 'cost_price']), 0),
        is_active: toBoolean(pickValue(row, ['isactive', 'active', 'shopifystatus'], true), true),
        material: String(pickValue(row, ['material'])).trim(),
        weight: String(pickValue(row, ['weight'])).trim(),
        collection: String(pickValue(row, ['collection'])).trim(),
        setting_type: String(pickValue(row, ['settingtype', 'setting_type', 'setting'])).trim(),
        enamel_type: String(pickValue(row, ['enameltype', 'enamel_type', 'enamel'])).trim(),
        active_channels: String(pickValue(row, ['activechannels', 'active_channels', 'channels'])).trim(),
        master_sku: String(pickValue(row, ['mastersku', 'master_sku'])).trim(),
        color: String(pickValue(row, ['color'])).trim(),
        stone_name: String(pickValue(row, ['stonename', 'stone_name', 'stone'])).trim(),
        stone_cut: String(pickValue(row, ['stonecut', 'stone_cut'])).trim(),
        stone_color: String(pickValue(row, ['stonecolor', 'stone_color'])).trim(),
        stone_size: String(pickValue(row, ['stonesize', 'stone_size'])).trim(),
        stone_quantity: String(pickValue(row, ['stonequantity', 'stone_quantity'])).trim(),
        plating_type: String(pickValue(row, ['platingtype', 'plating_type', 'plating'])).trim(),
        plating_color: String(pickValue(row, ['platingcolor', 'plating_color'])).trim(),
        notes: String(pickValue(row, ['notes', 'note', 'remarks'])).trim(),
      };

      const existing = productBySku.get(sku.toUpperCase());
      const path = existing ? `/api/v1/products/${existing.id}/` : '/api/v1/products/';
      const method = existing ? 'PATCH' : 'POST';
      const { response, payload: result } = await client.request(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        failures.push(`Row ${index + 2}: ${errorMessageFromPayload(result, `Failed to save product ${sku}`)}`);
        return;
      }

      if (existing) {
        updatedCount += 1;
      } else {
        createdCount += 1;
        const saved = result?.data || {};
        productBySku.set(sku.toUpperCase(), saved);
      }
    }));
  }

  return { createdCount, updatedCount, skippedCount, failures, label: 'Product sheet' };
}

async function uploadWorkforce(client, rows) {
  const existingMembers = await fetchCollection(client, '/api/v1/workforce/');
  const membersByPhone = new Map();
  const membersByName = new Map();

  existingMembers.forEach((member) => {
    const phone = String(member.phone || '').trim();
    const fullName = String(member.full_name || '').trim().toLowerCase();
    if (phone) membersByPhone.set(phone, member);
    if (fullName) membersByName.set(fullName, member);
  });

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const failures = [];
  const BATCH_SIZE = 3;

  const tasks = rows.map((row, index) => {
    const firstName = String(pickValue(row, ['firstname', 'first_name'])).trim();
    const lastName = String(pickValue(row, ['lastname', 'last_name'])).trim();
    const fullName = String(
      pickValue(row, ['fullname', 'full_name', 'name'], `${firstName} ${lastName}`.trim())
    ).trim();
    const phone = String(pickValue(row, ['contactnumber', 'phone', 'mobile'])).trim();
    return { row, index, fullName, phone };
  });

  for (let batchStart = 0; batchStart < tasks.length; batchStart += BATCH_SIZE) {
    const batch = tasks.slice(batchStart, batchStart + BATCH_SIZE);
    await Promise.all(batch.map(async ({ row, index, fullName, phone }) => {
      if (!fullName) { skippedCount += 1; return; }

      const payload = {
        full_name: fullName,
        phone,
        active: toBoolean(pickValue(row, ['active', 'status', 'type'], true), true),
      };

      const existing = (phone && membersByPhone.get(phone)) || membersByName.get(fullName.toLowerCase());
      const path = existing ? `/api/v1/workforce/${existing.id}/` : '/api/v1/workforce/';
      const method = existing ? 'PATCH' : 'POST';
      const { response, payload: result } = await client.request(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        failures.push(`Row ${index + 2}: ${errorMessageFromPayload(result, `Failed to save workforce member ${fullName}`)}`);
        return;
      }

      if (existing) {
        updatedCount += 1;
      } else {
        createdCount += 1;
        const saved = result?.data || {};
        if (phone) membersByPhone.set(phone, saved);
        membersByName.set(fullName.toLowerCase(), saved);
      }
    }));
  }

  return { createdCount, updatedCount, skippedCount, failures, label: 'Workforce sheet' };
}

async function uploadCustomers(client, rows) {
  const existingCustomers = await fetchCollection(client, '/api/v1/customers/');
  const customersByGst = new Map();
  const customersByName = new Map();

  existingCustomers.forEach((customer) => {
    const gst = String(customer.gst_number || '').trim().toUpperCase();
    const companyName = String(customer.company_name || '').trim().toLowerCase();
    if (gst) {
      customersByGst.set(gst, customer);
    }
    if (companyName) {
      customersByName.set(companyName, customer);
    }
  });

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const failures = [];
  const BATCH_SIZE = 3;

  const tasks = rows.map((row, index) => {
    const companyName = String(pickValue(row, ['companyname', 'company_name', 'name'])).trim();
    const gstNumber = String(pickValue(row, ['gstnumber', 'gst_number'])).trim();
    return { row, index, companyName, gstNumber };
  });

  for (let batchStart = 0; batchStart < tasks.length; batchStart += BATCH_SIZE) {
    const batch = tasks.slice(batchStart, batchStart + BATCH_SIZE);
    await Promise.all(batch.map(async ({ row, index, companyName, gstNumber }) => {
      if (!companyName) { skippedCount += 1; return; }

      const payload = {
        company_name: companyName,
        business_type: String(pickValue(row, ['businesstype', 'business_type'])).trim(),
        gst_number: gstNumber,
        pan_number: String(pickValue(row, ['pannumber', 'pan_number'])).trim(),
        status: normalizeCustomerStatus(pickValue(row, ['status'])),
        address_line1: String(pickValue(row, ['addressline1', 'address_line1', 'address'])).trim(),
        address_line2: String(pickValue(row, ['addressline2', 'address_line2'])).trim(),
        city: String(pickValue(row, ['city'])).trim(),
        state: String(pickValue(row, ['state'])).trim(),
        pin_code: String(pickValue(row, ['pincode', 'pin_code'])).trim(),
        authorized_person_name: String(pickValue(row, ['authorizedpersonname', 'authorized_person_name', 'contactperson'])).trim(),
        designation: String(pickValue(row, ['designation'])).trim(),
        mobile: String(pickValue(row, ['mobile', 'phone'])).trim(),
        email: String(pickValue(row, ['email'])).trim(),
        account_name: String(pickValue(row, ['accountname', 'account_name'])).trim(),
        bank_name: String(pickValue(row, ['bankname', 'bank_name'])).trim(),
        account_number: String(pickValue(row, ['accountnumber', 'account_number'])).trim(),
        ifsc: String(pickValue(row, ['ifsc'])).trim(),
      };

      const existing = (gstNumber && customersByGst.get(gstNumber.toUpperCase())) || customersByName.get(companyName.toLowerCase());
      const path = existing ? `/api/v1/customers/${existing.id}/` : '/api/v1/customers/';
      const method = existing ? 'PATCH' : 'POST';
      const { response, payload: result } = await client.request(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        failures.push(`Row ${index + 2}: ${errorMessageFromPayload(result, `Failed to save customer ${companyName}`)}`);
        return;
      }

      if (existing) {
        updatedCount += 1;
      } else {
        createdCount += 1;
        const saved = result?.data || {};
        if (gstNumber) customersByGst.set(gstNumber.toUpperCase(), saved);
        customersByName.set(companyName.toLowerCase(), saved);
      }
    }));
  }

  return { createdCount, updatedCount, skippedCount, failures, label: 'Customer sheet' };
}

async function uploadJobs(client, rows) {
  const existingProducts = await fetchCollection(client, '/api/v1/products/');
  const productBySku = new Map(
    existingProducts.map((product) => [String(product.master_sku || '').trim().toUpperCase(), product])
  );

  let createdCount = 0;
  let skippedCount = 0;
  const failures = [];

  for (const [index, row] of rows.entries()) {
    const title = String(pickValue(row, ['title', 'jobtitle', 'category'])).trim();
    const productSku = String(pickValue(row, ['productsku', 'sku', 'mastersku', 'product'])).trim();
    const explicitProductId = toNumber(pickValue(row, ['productid', 'product_id']), 0);
    const assigneeId = toNumber(pickValue(row, ['assigneeid', 'assignee_id', 'userid', 'user_id']), 0);

    const resolvedProductId = explicitProductId || productBySku.get(productSku.toUpperCase())?.id;

    if (!title || !resolvedProductId) {
      skippedCount += 1;
      continue;
    }

    const payload = {
      title,
      product: resolvedProductId,
      status: normalizeJobStatus(pickValue(row, ['status'])),
    };

    if (assigneeId > 0) {
      payload.assignee = assigneeId;
    }

    const { response, payload: result } = await client.request('/api/v1/jobs/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      failures.push(`Row ${index + 2}: ${errorMessageFromPayload(result, `Failed to save job ${title}`)}`);
      continue;
    }

    createdCount += 1;
  }

  return { createdCount, updatedCount: 0, skippedCount, failures, label: 'Job sheet' };
}

async function uploadKyc(client, rows) {
  const existingMembers = await fetchCollection(client, '/api/v1/workforce/');
  const existingKycRecords = await fetchCollection(client, '/api/v1/kyc/');
  const membersByPhone = new Map();
  const membersByName = new Map();
  const kycByMemberId = new Map();

  existingMembers.forEach((member) => {
    const phone = String(member.phone || '').trim();
    const fullName = String(member.full_name || '').trim().toLowerCase();
    if (phone) {
      membersByPhone.set(phone, member);
    }
    if (fullName) {
      membersByName.set(fullName, member);
    }
  });

  existingKycRecords.forEach((record) => {
    if (record?.member) {
      kycByMemberId.set(Number(record.member), record);
    }
  });

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const failures = [];

  for (const [index, row] of rows.entries()) {
    const fullName = String(pickValue(row, ['membername', 'member_name', 'fullname', 'full_name', 'authorizedpersonname'])).trim();
    const phone = String(pickValue(row, ['mobile', 'phone', 'contactnumber'])).trim();
    const idNumber = String(pickValue(row, ['idnumber', 'id_number', 'gstnumber', 'pannumber'])).trim();

    if (!fullName) {
      skippedCount += 1;
      continue;
    }

    let member = (phone && membersByPhone.get(phone)) || membersByName.get(fullName.toLowerCase());

    if (!member) {
      const memberCreate = await client.request('/api/v1/workforce/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          active: true,
        }),
      });

      if (!memberCreate.response.ok) {
        failures.push(`Row ${index + 2}: ${errorMessageFromPayload(memberCreate.payload, `Failed to create workforce member ${fullName}`)}`);
        continue;
      }

      member = memberCreate.payload?.data;
      if (phone) {
        membersByPhone.set(phone, member);
      }
      membersByName.set(fullName.toLowerCase(), member);
    }

    const payload = {
      member: member.id,
      status: normalizeKycStatus(pickValue(row, ['status'])),
      id_number: idNumber,
    };

    const existing = kycByMemberId.get(Number(member.id));
    const path = existing ? `/api/v1/kyc/${existing.id}/` : '/api/v1/kyc/';
    const method = existing ? 'PATCH' : 'POST';
    const result = await client.request(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!result.response.ok) {
      failures.push(`Row ${index + 2}: ${errorMessageFromPayload(result.payload, `Failed to save KYC for ${fullName}`)}`);
      continue;
    }

    if (existing) {
      updatedCount += 1;
    } else {
      createdCount += 1;
      kycByMemberId.set(Number(member.id), result.payload?.data);
    }
  }

  return { createdCount, updatedCount, skippedCount, failures, label: 'KYC sheet' };
}

// ── Designer helpers ──────────────────────────────────────────────────────────

// Try to parse a JSON string column; return null if it can't be parsed.
function tryParseJson(value) {
  const s = String(value || '').trim();
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

// Build stone_entries from either a JSON column or flat per-stone columns.
// Each spreadsheet row maps to ONE designer record; sub-table entries come
// from semicolon-delimited values  (e.g. "Diamond;Ruby") or a JSON array.
function buildDesignerStoneEntries(row) {
  const jsonVal = pickValue(row, ['stoneentries', 'stone_entries', 'stones']);
  const parsed = tryParseJson(jsonVal);
  if (Array.isArray(parsed)) return parsed;

  // Accepts both plain flat columns AND two-row grouped headers
  // (e.g. "Stone Information" group → sub-headers "Type", "Species", …
  //  normalise to "stoneinformationtype", "stoneinformationspecies", …)
  const type     = String(pickValue(row, ['stoneinformationtype',    'stonetype',    'stone_type',    'gemtype'])).trim();
  const species  = String(pickValue(row, ['stoneinformationspecies', 'stonespecies', 'stone_species', 'species'])).trim();
  const variety  = String(pickValue(row, ['stoneinformationvariety', 'stonevariety', 'stone_variety', 'variety'])).trim();
  const color    = String(pickValue(row, ['stoneinformationcolor',   'stonecolor',   'stone_color',   'gemcolor', 'stonecolour'])).trim();
  const cut      = String(pickValue(row, ['stoneinformationcut',     'stonecut',     'stone_cut',     'cut'])).trim();
  const shape    = String(pickValue(row, ['stoneinformationshape',   'stoneshape',   'stone_shape',   'shape'])).trim();
  const length   = String(pickValue(row, ['stoneinformationlength',  'stonelength',  'stone_length'])).trim();
  const width    = String(pickValue(row, ['stoneinformationwidth',   'stonewidth',   'stone_width'])).trim();
  const height   = String(pickValue(row, ['stoneinformationheight',  'stoneheight',  'stone_height',  'stonedepth'])).trim();
  const qty      = String(pickValue(row, ['stoneinformationqty',     'stoneqty',     'stone_qty',     'stonecount', 'stonequantity'])).trim();

  if (type || species || variety) {
    return [{ type, species, variety, color, cut, shape, length, width, height, qty }];
  }
  return [];
}

function buildDesignerPlatingEntries(row) {
  const jsonVal = pickValue(row, ['platingentries', 'plating_entries', 'plating']);
  const parsed = tryParseJson(jsonVal);
  if (Array.isArray(parsed)) return parsed;

  // Two-row grouped header: "Plating Info" + "Plating Type" → "platinginfoplatingtype"
  const type  = String(pickValue(row, ['platinginfoplatingtype',  'platingtype',  'plating_type',  'plattype'])).trim();
  const color = String(pickValue(row, ['platinginfoplatingcolor', 'platingcolor', 'plating_color', 'platcolor', 'platcolour', 'platinginfoplatingcolour'])).trim();
  if (type || color) return [{ type, color }];
  return [];
}

function buildDesignerTrackingRows(row) {
  const jsonVal = pickValue(row, ['trackingrows', 'tracking_rows', 'tracking']);
  const parsed = tryParseJson(jsonVal);
  if (Array.isArray(parsed)) return parsed;

  // Accepts both plain flat columns AND two-row grouped headers
  // (e.g. "Tracking Info" group → "3DM" sub-header → normalised key "trackinginfo3dm")
  const tdm     = String(pickValue(row, ['trackinginfo3dm',         '3dm',      'tdm',     'tdmfile',   'tdm_file', '3dmlink'])).trim();
  const stl     = String(pickValue(row, ['trackinginfostl',         'stl',      'stlfile', 'stl_file',  'stllink'])).trim();
  const mCode   = String(pickValue(row, ['trackinginfomotivecode',  'motivecode',  'motive_code',   'mcode'])).trim();
  const mSku    = String(pickValue(row, ['trackinginfomotivesku',   'motivesku',   'motive_sku',    'mastersku', 'trackinginfomastersku'])).trim();
  const dieCode = String(pickValue(row, ['trackinginfodiecode',     'trackingdiecode', 'diecode',   'die_code'])).trim();
  const moldQty = String(pickValue(row, ['trackinginfomolddieqty', 'trackinginfomolddieqty', 'molddieqty', 'mold_die_qty', 'moldqtyperdie', 'moldqty'])).trim();
  const length  = String(pickValue(row, ['trackinginfolength',      'tracklength', 'trackingrowlength'])).trim();
  const width   = String(pickValue(row, ['trackinginfowidth',       'trackwidth',  'trackingrowwidth'])).trim();
  const height  = String(pickValue(row, ['trackinginfoheight',      'trackheight', 'trackingrowheight'])).trim();

  if (tdm || stl || mCode || mSku || dieCode) {
    return [{ id: 1, tdm, stl, motiveCode: mCode, motiveSku: mSku, dieCode, moldDieQty: moldQty, length, width, height }];
  }
  return [];
}

function buildDesignerFindingsEntries(row) {
  const jsonVal = pickValue(row, ['findingsentries', 'findings_entries', 'findings']);
  const parsed = tryParseJson(jsonVal);
  if (Array.isArray(parsed)) return parsed;

  // Two-row grouped header: "Findings" + "Code" → "findingscode", "Findings" + "Quantity" → "findingsquantity"
  const code     = String(pickValue(row, ['findingscode',     'findings_code',     'findingsref', 'partcode'])).trim();
  const quantity = String(pickValue(row, ['findingsquantity', 'findingsqty',        'findings_quantity', 'partqty'])).trim();
  if (code) return [{ code, quantity }];
  return [];
}

async function uploadDesigners(client, rows) {
  const existingDesigners = await fetchCollection(client, '/api/v1/designers/');
  const designerBySku = new Map(
    existingDesigners.map((d) => [String(d.sku || '').trim().toUpperCase(), d])
  );

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const failures = [];
  const BATCH_SIZE = 3;

  const tasks = rows.map((row, index) => {
    const sku = String(
      pickValue(row, ['sku', 'designersku', 'designer_sku', 'designsku', 'productsku'])
    ).trim();
    return { row, index, sku };
  });

  for (let batchStart = 0; batchStart < tasks.length; batchStart += BATCH_SIZE) {
    const batch = tasks.slice(batchStart, batchStart + BATCH_SIZE);
    await Promise.all(batch.map(async ({ row, index, sku }) => {
      if (!sku) { skippedCount += 1; return; }

      // ── Dimensions ─────────────────────────────────────────────────────────
      // "Total Design Measurements" group → sub-headers "Length"/"Width"/"Height"
      // normalise to "totaldesignmeasurementslength" etc. in two-row header files.
      const tdmLength = String(pickValue(row, ['totaldesignmeasurementslength', 'tdmlength', 'tdm_length', 'totallength', 'total_length', 'designlength'])).trim();
      const tdmWidth  = String(pickValue(row, ['totaldesignmeasurementswidth',  'tdmwidth',  'tdm_width',  'totalwidth',  'total_width',  'designwidth'])).trim();
      const tdmHeight = String(pickValue(row, ['totaldesignmeasurementsheight', 'tdmheight', 'tdm_height', 'totalheight', 'total_height', 'designheight'])).trim();

      // total_design_measurements lives as a JSON object; only set it when
      // individual dimension columns are present, or fall back to a JSON column.
      let totalDesignMeasurements;
      if (tdmLength || tdmWidth || tdmHeight) {
        totalDesignMeasurements = { length: tdmLength, width: tdmWidth, height: tdmHeight };
      } else {
        const jsonMeasurements = tryParseJson(
          pickValue(row, ['totaldesignmeasurements', 'total_design_measurements', 'tdmmeasurements'])
        );
        if (jsonMeasurements && typeof jsonMeasurements === 'object') {
          totalDesignMeasurements = jsonMeasurements;
        }
      }

      // ── Numeric scalars ────────────────────────────────────────────────────
      // "Total Die Code", "Total Mold Qty / Die", "Total CPX Dead Weight" are standalone
      // columns in two-row header files (their sub-header row cell is empty).
      // normalizeKey("Total Mold Qty / Die") → "totalmoldqtydie"
      const totalDieCodeRaw = String(pickValue(row, ['totaldiecode',       'total_die_code',            'totaldiecount'])).trim();
      const moldQtyRaw      = String(pickValue(row, ['totalmoldqtydie',    'totalmoldqtyperdie',         'total_mold_qty_per_die', 'moldqtyperdie', 'moldqty'])).trim();
      const cpxWeightRaw    = String(pickValue(row, ['totalcpxdeadweight', 'total_cpx_dead_weight',      'cpxdeadweight', 'deadweight', 'cpxwt'])).trim();

      const payload = {
        sku,
        // Images (URL or base64; column labels match both single-row and two-row headers)
        rendered_photo:    String(pickValue(row, ['renderedphoto',    'rendered_photo',    'image1', 'image'])).trim(),
        technical_drawing: String(pickValue(row, ['technicaldrawing', 'technical_drawing', 'image2'])).trim(),
        designer_image_3:  String(pickValue(row, ['otherphoto',       'other_photo',       'image3', 'designerimage3'])).trim(),

        // Design identity
        motive_code: String(pickValue(row, ['motivecode',     'motive_code',      'mcode'])).trim(),
        motive_sku:  String(pickValue(row, ['motivesku',      'motive_sku',       'mastersku'])).trim(),

        // Design properties (standalone column labels stay the same across header formats)
        design_stage:    String(pickValue(row, ['designstage',    'design_stage',    'stage',    'designstatus'])).trim(),
        setting_type:    String(pickValue(row, ['settingtype',    'setting_type',    'setting',  'stonesetting'])).trim(),
        enamel:          String(pickValue(row, ['enamel',         'enamelwork',      'enamelfinish'])).trim(),
        design_material: String(pickValue(row, ['designmaterial', 'design_material', 'material', 'metal', 'alloy'])).trim(),
        mechanism:       String(pickValue(row, ['mechanism',      'closure',         'clasp',    'closuretype'])).trim(),
        designer_notes:  String(pickValue(row, ['designernotes',  'designer_notes',  'notes',    'remarks', 'comments'])).trim(),

        // Numeric fields (null when blank)
        ...(totalDieCodeRaw   ? { total_die_code:        toNumber(totalDieCodeRaw, null) } : {}),
        ...(moldQtyRaw        ? { total_mold_qty_per_die: toNumber(moldQtyRaw, null)      } : {}),
        ...(cpxWeightRaw      ? { total_cpx_dead_weight:  toNumber(cpxWeightRaw, null)    } : {}),

        // Dimensions
        ...(totalDesignMeasurements ? { total_design_measurements: totalDesignMeasurements } : {}),

        // Sub-table JSON arrays
        stone_entries:    buildDesignerStoneEntries(row),
        plating_entries:  buildDesignerPlatingEntries(row),
        tracking_rows:    buildDesignerTrackingRows(row),
        findings_entries: buildDesignerFindingsEntries(row),

        is_active: toBoolean(pickValue(row, ['isactive', 'is_active', 'active'], true), true),

        // Legacy fields (kept so old exports still work)
        tdm_file:        String(pickValue(row, ['tdmfile', 'tdm_file', '3dmfile'])).trim(),
        stl_file:        String(pickValue(row, ['stlfile', 'stl_file'])).trim(),
        tdm_status:      String(pickValue(row, ['tdmstatus', 'tdm_status'])).trim(),
        stl_status:      String(pickValue(row, ['stlstatus', 'stl_status'])).trim(),
        render_status:   String(pickValue(row, ['renderstatus', 'render_status'])).trim(),
        print_3d_status: String(pickValue(row, ['print3dstatus', 'print_3d_status'])).trim(),
      };

      const existing = designerBySku.get(sku.toUpperCase());
      const path   = existing ? `/api/v1/designers/${existing.id}/` : '/api/v1/designers/';
      const method = existing ? 'PATCH' : 'POST';

      const { response, payload: result } = await client.request(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        failures.push(`Row ${index + 2}: ${errorMessageFromPayload(result, `Failed to save designer ${sku}`)}`);
        return;
      }

      if (existing) {
        updatedCount += 1;
      } else {
        createdCount += 1;
        designerBySku.set(sku.toUpperCase(), result?.data || {});
      }
    }));
  }

  return { createdCount, updatedCount, skippedCount, failures, label: 'Designer sheet' };
}

const UPLOAD_HANDLERS = {
  products: uploadProducts,
  workforce: uploadWorkforce,
  jobs: uploadJobs,
  kyc: uploadKyc,
  customers: uploadCustomers,
  designers: uploadDesigners,
};

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const sheetType = String(formData.get('sheetType') || '').trim().toLowerCase();

    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ success: false, message: 'Please upload a file.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, message: `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.` },
        { status: 413 }
      );
    }

    const handler = UPLOAD_HANDLERS[sheetType];
    if (!handler) {
      return NextResponse.json({ success: false, message: 'Unsupported bulk upload sheet type.' }, { status: 400 });
    }

    const client = createBackendClient(request);
    const rows = await parseUploadFile(file);
    const result = await handler(client, rows);
    const message = summarizeResult(
      result.label,
      result.createdCount,
      result.updatedCount,
      result.skippedCount,
      result.failures
    );

    return NextResponse.json({
      success: result.createdCount > 0 || result.updatedCount > 0,
      message,
      createdCount: result.createdCount,
      updatedCount: result.updatedCount,
      skippedCount: result.skippedCount,
      failures: result.failures,
    }, { status: result.failures.length > 0 && result.createdCount === 0 && result.updatedCount === 0 ? 400 : 200 });
  } catch (error) {
    const message = (typeof error?.message === 'string' && error.message.trim())
      ? error.message.trim()
      : (typeof error === 'string' && error.trim())
        ? error.trim()
        : 'Bulk upload failed. Check server logs for details.';
    console.error('[bulk-upload] Unhandled error:', error);
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}