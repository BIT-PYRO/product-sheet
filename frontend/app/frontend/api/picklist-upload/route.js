import { read, utils } from 'xlsx';

// -- Header normalizer ----------------------------------------------------------

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// -- Number utilities -----------------------------------------------------------

function toInt(value) {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number.parseInt(String(value).replace(/[^0-9.-]/g, ''), 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

// -- CSV / TSV parser -----------------------------------------------------------

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

  const [headerRow, ...dataRows] = matrix;
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

// -- Excel parser --------------------------------------------------------------

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

// -- File parser dispatcher ----------------------------------------------------

async function parsePicklistFile(file) {
  const fileName = String(file?.name || '').trim();
  const extension = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';

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
    'Unable to parse the uploaded file. Provide tabular data with headers (SKU, Product, Needed, etc.).'
  );
}

// -- Picklist row mapper -------------------------------------------------------

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
 * Maps a raw parsed row to a picklist item.
 * Expected picklist columns: SKU, Product, Needed, Available
 * Returns null when the row has no valid SKU.
 */
function asPicklistItem(row) {
  const sku = firstValue(row, ['sku', 'mastersku', 'productsku', 'itemcode', 'code']);
  if (!sku) return null;

  const listingName = firstValue(
    row,
    ['product', 'productname', 'listingname', 'name', 'title', 'itemname'],
    sku
  );

  const neededRaw = firstValue(row, ['needed', 'required', 'demand', 'qty', 'quantity']);
  const needed = toInt(neededRaw);

  return { sku, listingName, needed };
}

// -- Backend helpers -----------------------------------------------------------

async function fetchJson(request, path, init = {}) {
  const origin = request.nextUrl.origin;
  const headers = new Headers(init.headers || {});
  if (!headers.has('cookie')) {
    headers.set('cookie', request.headers.get('cookie') || '');
  }
  const response = await fetch(`${origin}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

async function resolveProductBySku(request, sku) {
  const encoded = encodeURIComponent(sku);
  const { response, payload } = await fetchJson(request, `/api/products?search=${encoded}`);
  if (!response.ok || !payload?.success) return null;

  const rows = Array.isArray(payload.data)
    ? payload.data
    : Array.isArray(payload.data?.results)
    ? payload.data.results
    : [];

  return (
    rows.find(
      (item) => String(item?.sku || '').trim().toLowerCase() === sku.toLowerCase()
    ) || null
  );
}

async function upsertProduct(request, sku, listingName) {
  const existing = await resolveProductBySku(request, sku);

  if (existing) {
    const { response, payload } = await fetchJson(request, `/api/products/${existing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: listingName || sku }),
    });
    if (response.ok && payload?.success) {
      return payload.data || existing;
    }
    return existing;
  }

  const { response, payload } = await fetchJson(request, '/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sku,
      name: listingName || sku,
      selling_price: 0,
      cost_price: 0,
      is_active: true,
    }),
  });

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || `Failed to create product with SKU "${sku}"`);
  }

  return payload.data;
}

async function replaceDemandTransactions(request, productId, neededQty) {
  // Remove all existing demand transactions for this product.
  const { response, payload } = await fetchJson(
    request,
    `/api/inventory?product=${encodeURIComponent(productId)}&txn_type=demand`
  );

  if (response.ok && payload?.success) {
    const existing = Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.data?.results)
      ? payload.data.results
      : [];

    for (const txn of existing) {
      if (txn?.id) {
        await fetchJson(request, `/api/inventory/${txn.id}`, { method: 'DELETE' });
      }
    }
  }

  // Create fresh demand transaction only when needed qty > 0.
  if (neededQty <= 0) return;

  await fetchJson(request, '/api/inventory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product: productId,
      txn_type: 'demand',
      quantity: neededQty,
      remark: 'picklist',
    }),
  });
}

// -- Route handler -------------------------------------------------------------

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

    const parsedRows = await parsePicklistFile(file);
    const items = parsedRows.map(asPicklistItem).filter(Boolean);

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

    const failures = [];
    let savedCount = 0;
    const savedItems = [];

    for (const item of items) {
      try {
        const product = await upsertProduct(request, item.sku, item.listingName);

        if (!product?.id) {
          throw new Error('Product ID not returned after upsert');
        }

        await replaceDemandTransactions(request, product.id, item.needed);

        savedCount += 1;
        savedItems.push({ sku: item.sku, name: item.listingName, needed: item.needed });
      } catch (error) {
        failures.push({ sku: item.sku, message: error.message || 'Failed to process row' });
      }
    }

    return Response.json({
      success: failures.length === 0,
      message:
        failures.length === 0
          ? `Picklist uploaded successfully. Registered ${savedCount} products.`
          : `Uploaded with partial success. Saved ${savedCount} of ${items.length} rows.`,
      fileName: file.name,
      parsedRows: parsedRows.length,
      validRows: items.length,
      savedCount,
      failedCount: failures.length,
      failures,
      // Returned so the frontend stores this picklist in localStorage.
      picklistItems: savedItems,
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
