const DEFAULT_LIVE_STOCK = {
  rawMaterial: { min: '', current: '', wip: '', location: '' },
  rawSetting: { min: '', current: '', wip: '', location: '' },
  tyre: { min: '', current: '', wip: '', location: '' },
  wipLiquidCasting: { min: '', current: '', wip: '', location: '' },
  filing: { min: '', current: '', wip: '', location: '' },
  packing: { min: '', current: '', wip: '', location: '' },
  setting: { min: '', current: '', wip: '', location: '' },
  finalPolish: { min: '', current: '', wip: '', location: '' },
  readyForPlacing: { min: '', current: '', wip: '', location: '' },
};

function normalizeLiveStockKeys(rawStock = {}) {
  const normalized = {
    ...DEFAULT_LIVE_STOCK,
    ...rawStock,
  };

  const aliases = [
    ['filing', ['filling']],
    ['packing', ['prePolish']],
    ['wipLiquidCasting', ['casting', 'tyre', 'postCasting', 'finalCasting', 'dustunuing']],
    ['readyForPlacing', ['readyForPlating']],
  ];

  aliases.forEach(([targetKey, sourceKeys]) => {
    const targetValue = normalized[targetKey];
    const hasTargetData =
      targetValue &&
      Object.values(targetValue).some((value) => String(value || '').trim() !== '');

    if (hasTargetData) {
      return;
    }

    const match = sourceKeys
      .map((key) => normalized[key])
      .find((value) => value && typeof value === 'object');

    if (match) {
      normalized[targetKey] = {
        ...DEFAULT_LIVE_STOCK[targetKey],
        ...match,
      };
    }
  });

  delete normalized.postCasting;
  delete normalized.finalCasting;
  delete normalized.dustunuing;

  return normalized;
}

function asArray(payloadData) {
  if (Array.isArray(payloadData)) return payloadData;
  if (Array.isArray(payloadData?.results)) return payloadData.results;
  return [];
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number.parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseWeightToNumber(weightValue, weightUnit) {
  const baseValue = toNumber(weightValue);
  if (!baseValue) return 0;

  const normalizedUnit = String(weightUnit || '').trim().toLowerCase();
  if (normalizedUnit === 'kg' || normalizedUnit === 'kgs') {
    return baseValue * 1000;
  }

  return baseValue;
}

function normalizeDieFindings(dieNumbers = []) {
  const die_numbers = [];
  const findings = [];

  (Array.isArray(dieNumbers) ? dieNumbers : []).forEach((row) => {
    const item = {
      value: String(row?.value || row?.dieNumber || '').trim(),
      quantity: String(row?.quantity || '').trim(),
      location: String(row?.location || '').trim(),
    };
    if (String(row?.type || '').toLowerCase() === 'findings') {
      findings.push(item);
    } else {
      die_numbers.push(item);
    }
  });

  return { die_numbers, findings };
}

function mapIncomingToProductPayload(data) {
  const listingName = String(data?.listingName || '').trim();
  const masterSku = String(data?.sku || '').trim();
  const weightAsPrice = parseWeightToNumber(data?.weightValue, data?.weightUnit);
  const { die_numbers, findings } = normalizeDieFindings(data?.manufacturing?.dieNumbers);

  return {
    master_sku: masterSku,
    designer_sku: Array.isArray(data?.designerSkus) && data.designerSkus.length
      ? String(data.designerSkus[0] || '').trim()
      : String(data?.designerSku || '').trim(),
    designer_skus: Array.isArray(data?.designerSkus)
      ? data.designerSkus.map(s => String(s || '').trim()).filter(Boolean)
      : data?.designerSku ? [String(data.designerSku).trim()] : [],
    name: listingName || masterSku,
    category: String(data?.dropdown2 || data?.category || '').trim(),
    selling_price: weightAsPrice,
    cost_price: weightAsPrice,
    is_active: String(data?.shopifyStatus || '').toLowerCase() !== 'inactive',
    die_numbers,
    findings,
    material: String(data?.material || data?.dropdown1 || '').trim(),
    weight: String(data?.weight || data?.weightValue || '').trim(),
    weight_unit: String(data?.weightUnit || '').trim() || 'cts',
    collection: String(data?.collection || data?.dropdown3 || '').trim(),
    setting_type: String(data?.settingType || '').trim(),
    enamel_type: String(data?.enamelType || '').trim(),
    active_channels: String(data?.activeChannels || '').trim(),
    color: (() => { const vars = Array.isArray(data?.variations) ? data.variations : []; const vals = vars.filter(v => String(v?.label || '').toUpperCase() === 'COLOR').map(v => { const c1 = String(v?.col1 || '').trim(); const c2 = String(v?.col2 || '').trim(); return c1 ? (c2 ? `${c1}[${c2}]` : c1) : ''; }).filter(Boolean); return vals.length ? vals.join('\n') : String(data?.color || '').trim(); })(),
    enamel: (() => { const vars = Array.isArray(data?.variations) ? data.variations : []; const vals = vars.filter(v => String(v?.label || '').toUpperCase() === 'ENAMEL').map(v => { const c1 = String(v?.col1 || '').trim(); const c2 = String(v?.col2 || '').trim(); return c1 ? (c2 ? `${c1}[${c2}]` : c1) : ''; }).filter(Boolean); return vals.length ? vals.join('\n') : String(data?.enamel || '').trim(); })(),
    stone_entries: Array.isArray(data?.stoneInfo) ? data.stoneInfo.map(({ type, species, variety, color, cut, shape, length, width, height, qty }) => ({ type: type || '', species: species || '', variety: variety || '', color: color || '', cut: cut || '', shape: shape || '', length: length || '', width: width || '', height: height || '', qty: qty || '' })) : (Array.isArray(data?.stoneEntries) ? data.stoneEntries : []),
    plating_entries: Array.isArray(data?.platingType) ? data.platingType.filter(r => String(r?.col1 || '').trim() || String(r?.col2 || '').trim()).map(r => ({ type: String(r?.col1 || '').trim(), color: String(r?.col2 || '').trim() })) : [],
    plating_type: String(Array.isArray(data?.platingType) ? (data.platingType.find(r => r?.col1)?.col1 || '') : (data?.platingType || '')).trim(),
    plating_color: String(Array.isArray(data?.platingType) ? (data.platingType.find(r => r?.col2)?.col2 || '') : (data?.platingColor || '')).trim(),
    notes: String(data?.notes || data?.manufacturing?.notes || '').trim(),
    // Only persist already-uploaded URLs; base64 blobs are uploaded separately after save
    images: Array.isArray(data?.productImages)
      ? data.productImages.filter((img) => Boolean(img) && !String(img).startsWith('data:'))
      : [],
  };
}

function mapProductSummaryRows(products = [], inventorySummaryRows = []) {
  const bySku = new Map(
    inventorySummaryRows
      .filter((row) => row && row.sku)
      .map((row) => [String(row.sku).trim(), row])
  );

  return products.map((product, index) => {
    const sku = String(product?.master_sku || '').trim();
    const summary = bySku.get(sku) || null;

    return {
      id: product?.id ?? index,
      lastUpdated: product?.updated_at || product?.created_at || '',
      sku,
      listingName: product?.name || '',
      material: product?.material || '',
      weight: product?.weight || '',
      weightUnit: product?.weight_unit || 'cts',
      category: product?.category || '',
      collection: product?.collection || '',
      settingType: product?.setting_type || '',
      enamelType: product?.enamel_type || '',
      activeChannels: product?.active_channels || '',
      shopifyStatus: product?.is_active ? 'active' : 'inactive',
      dieNumberFindings: [
        ...(Array.isArray(product?.die_numbers) ? product.die_numbers.map((item) => ({ ...item, type: 'die_number' })) : []),
        ...(Array.isArray(product?.findings) ? product.findings.map((item) => ({ ...item, type: 'findings' })) : []),
      ],
      dieNumbers: [
        ...(Array.isArray(product?.die_numbers) ? product.die_numbers.map((item, i) => ({ id: i + 1, type: 'die_number', ...item })) : []),
        ...(Array.isArray(product?.findings) ? product.findings.map((item, i) => ({ id: (product?.die_numbers?.length || 0) + i + 1, type: 'findings', ...item })) : []),
      ],
      masterSku: sku,
      color: product?.color || '',
      enamel: product?.enamel || '',
      stone_entries: Array.isArray(product?.stone_entries) ? product.stone_entries : [],
      platingEntries: Array.isArray(product?.plating_entries) && product.plating_entries.length > 0
        ? product.plating_entries
        : (product?.plating_type ? [{ type: product.plating_type, color: product?.plating_color || '' }] : []),
      platingType: product?.plating_type || '',
      platingColor: product?.plating_color || '',
      notes: product?.notes || '',
      images: Array.isArray(product?.images) ? product.images : [],
      liveStock: normalizeLiveStockKeys(summary?.liveStock || DEFAULT_LIVE_STOCK),
      finalStock: Array.isArray(summary?.finalStock)
        ? summary.finalStock
        : [{ sku, value: '0', unit: 'pcs' }],
      totalInDemand: '',
    };
  });
}

const DEFAULT_BACKEND_URL = 'https://product-sheet.onrender.com';
const ACCESS_COOKIE = 'psd-access-token';
const REFRESH_COOKIE = 'psd-refresh-token';

function backendBaseUrl() {
  return (process.env.BACKEND_BASE_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');
}

// Map internal /api/<resource>[/<id>][?query] → Django /api/v1/<resource>[/<id>/][?query]
function toBackendPath(internalPath) {
  // Strip leading /api/ and resolve to /api/v1/
  const withoutPrefix = internalPath.replace(/^\/api\//, '');
  // Split off query string
  const qIdx = withoutPrefix.indexOf('?');
  const qs = qIdx >= 0 ? withoutPrefix.slice(qIdx) : '';
  const resource = qIdx >= 0 ? withoutPrefix.slice(0, qIdx) : withoutPrefix;
  // Ensure trailing slash on the path part (Django requires it)
  const resourceWithSlash = resource.endsWith('/') ? resource : `${resource}/`;
  return `/api/v1/${resourceWithSlash}${qs}`;
}

async function refreshAccessToken(refreshToken) {
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${backendBaseUrl()}/api/v1/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
      cache: 'no-store',
    });
    const payload = await res.json().catch(() => null);
    return payload?.data?.access || null;
  } catch {
    return null;
  }
}

async function fetchJsonWithSession(request, path, init = {}) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value || '';
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value || '';
  const backendPath = toBackendPath(path);
  const url = `${backendBaseUrl()}${backendPath}`;

  const doFetch = async (token) => {
    const headers = new Headers(init.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');
    return fetch(url, { ...init, headers, cache: 'no-store' });
  };

  let response = await doFetch(accessToken);

  // Retry once with a refreshed token on 401
  if (response.status === 401 && refreshToken) {
    const newToken = await refreshAccessToken(refreshToken);
    if (newToken) {
      response = await doFetch(newToken);
    }
  }

  const payload = await response.json().catch(() => null);
  return { response, payload };
}

async function resolveProductBySku(request, sku) {
  const encoded = encodeURIComponent(sku);

  // First try an exact master_sku filter (most reliable)
  const filterResult = await fetchJsonWithSession(request, `/api/products?master_sku=${encoded}`);
  if (filterResult.response.ok && filterResult.payload?.success) {
    const filterRows = asArray(filterResult.payload.data);
    const exactFilter = filterRows.find(
      (item) => String(item?.master_sku || '').trim().toLowerCase() === sku.toLowerCase()
    );
    if (exactFilter) return exactFilter;
  }

  // Fallback to search (handles partial matches coming from master_product_sheet)
  const { response, payload } = await fetchJsonWithSession(request, `/api/products?search=${encoded}`);

  if (!response.ok || !payload?.success) {
    const message = payload?.message || 'Failed to search product.';
    throw new Error(message);
  }

  const rows = asArray(payload.data);
    return rows.find((item) => String(item?.master_sku || '').trim().toLowerCase() === sku.toLowerCase()) || null;
}

// Maps frontend liveStock key → Django stage key stored in InventoryTransaction.stage
const LIVE_STOCK_STAGE_MAP = {
  rawMaterial:      'wax_piece',
  rawSetting:       'wax_setting',
  wipLiquidCasting: 'casting',
  filing:           'filling',
  packing:          'pre_polish',
  setting:          'setting',
  finalPolish:      'final_polish',
  readyForPlacing:  'ready_for_plating',
};

const STOCK_TYPES = ['min', 'current', 'wip'];

/**
 * Syncs all liveStock stage values + per-variation final stock values to the
 * backend as InventoryTransactions.  Each call computes deltas against the
 * existing running total for the same stage+stock_type, then POSTs an
 * "adjust" transaction only when the desired value differs.
 */
async function syncAllInventoryStages(request, productId, sku, liveStock, finalStock) {
  const { response, payload } = await fetchJsonWithSession(
    request,
    `/api/inventory?product=${encodeURIComponent(productId)}`
  );

  const transactions = response.ok && payload?.success ? asArray(payload.data) : [];

  // Build running-total map: `${stage}__${stock_type}` → running quantity
  // Also track latest location per stage
  const currentByKey = new Map();
  const currentLocationByStage = new Map();
  transactions.forEach((txn) => {
    if (String(txn?.txn_type || '').toLowerCase() === 'demand') return;
    const stage = String(txn?.stage || '').trim() || 'default';
    const stockType = String(txn?.stock_type || 'current').trim() || 'current';
    const qty = toNumber(txn?.quantity);
    // Only accumulate non-zero qty (location-only syncs have qty=0)
    if (qty !== 0) {
      const key = `${stage}__${stockType}`;
      const delta = String(txn?.txn_type || '').toLowerCase() === 'out' ? -qty : qty;
      currentByKey.set(key, (currentByKey.get(key) || 0) + delta);
    }
    // track latest non-empty location per stage
    const loc = String(txn?.location || '').trim();
    if (loc) currentLocationByStage.set(stage, loc);
  });

  const calls = [];

  // 1. Sync per-stage live stock values (min, current, wip) and location
  const normalizedLiveStock = normalizeLiveStockKeys(liveStock || {});
  for (const [frontendKey, stageKey] of Object.entries(LIVE_STOCK_STAGE_MAP)) {
    const stageData = normalizedLiveStock[frontendKey] || {};

    // Sync numeric stock types
    for (const stockType of STOCK_TYPES) {
      const desiredRaw = String(stageData[stockType] || '').trim();
      if (desiredRaw === '') continue;
      const desired = Math.round(toNumber(desiredRaw));
      const mapKey = `${stageKey}__${stockType}`;
      const current = Math.round(currentByKey.get(mapKey) || 0);
      const delta = desired - current;
      if (delta === 0) continue;
      calls.push(fetchJsonWithSession(request, '/api/inventory', {
        method: 'POST',
        body: JSON.stringify({
          product: productId,
          txn_type: 'adjust',
          quantity: delta,
          stage: stageKey,
          stock_type: stockType,
          location: String(stageData.location || '').trim(),
          remark: `Product sheet sync — ${stageKey} (${stockType})`,
        }),
      }));
    }

    // Sync location independently (even if no qty change)
    const newLocation = String(stageData.location || '').trim();
    const existingLocation = currentLocationByStage.get(stageKey) || '';
    if (newLocation && newLocation !== existingLocation) {
      calls.push(fetchJsonWithSession(request, '/api/inventory', {
        method: 'POST',
        body: JSON.stringify({
          product: productId,
          txn_type: 'adjust',
          quantity: 0,
          stage: stageKey,
          stock_type: 'current',
          location: newLocation,
          remark: `Product sheet sync — ${stageKey} location`,
        }),
      }));
    }
  }

  // 2. Sync per-variation final stock values and location
  const validFinalStock = (Array.isArray(finalStock) ? finalStock : []).filter(
    (row) => String(row?.sku || '').trim()
  );
  for (const row of validFinalStock) {
    const varSku = String(row.sku || '').trim();
    if (!varSku) continue;
    // Use lowercase so it matches how buildProductStockMap reads stage names
    const varStageKey = `final_stock__${varSku.toLowerCase()}`;

    // Sync quantity
    const desiredRaw = String(row?.value || '').trim();
    if (desiredRaw !== '') {
      const desired = Math.round(toNumber(desiredRaw));
      const mapKey = `${varStageKey}__current`;
      const current = Math.round(currentByKey.get(mapKey) || 0);
      const delta = desired - current;
      if (delta !== 0) {
        calls.push(fetchJsonWithSession(request, '/api/inventory', {
          method: 'POST',
          body: JSON.stringify({
            product: productId,
            txn_type: 'adjust',
            quantity: delta,
            stage: varStageKey,
            stock_type: 'current',
            location: String(row?.location || '').trim(),
            remark: `Product sheet sync — final stock ${varSku}`,
          }),
        }));
      }
    }

    // Sync location independently (even if no qty change)
    const newLocation = String(row?.location || '').trim();
    const existingLocation = currentLocationByStage.get(varStageKey) || '';
    if (newLocation && newLocation !== existingLocation) {
      calls.push(fetchJsonWithSession(request, '/api/inventory', {
        method: 'POST',
        body: JSON.stringify({
          product: productId,
          txn_type: 'adjust',
          quantity: 0,
          stage: varStageKey,
          stock_type: 'current',
          location: newLocation,
          remark: `Product sheet sync — final stock ${varSku} location`,
        }),
      }));
    }
  }

  if (calls.length > 0) {
    await Promise.all(calls);
  }
}

export async function GET(request) {
  try {
    const [productsResult, inventoryResult, wipResult] = await Promise.all([
      fetchJsonWithSession(request, '/api/products'),
      fetchJsonWithSession(request, '/api/inventory?page_size=10000'),
      fetchJsonWithSession(request, '/api/jobs/wip-summary'),
    ]);

    if (!productsResult.response.ok || !productsResult.payload?.success) {
      return Response.json(
        {
          success: false,
          message: productsResult.payload?.message || 'Failed to fetch products.',
        },
        { status: productsResult.response.status || 500 }
      );
    }

    const products = asArray(productsResult.payload.data);
    const transactions =
      inventoryResult.response.ok && inventoryResult.payload?.success
        ? asArray(inventoryResult.payload.data)
        : [];
    // WIP data: { "SKU_UPPER": { "dept_to_key": qty } } — computed live from active jobs
    const wipBySku =
      wipResult.response.ok && wipResult.payload?.success
        ? (wipResult.payload.data || {})
        : {};

    // Maps InventoryTransaction.stage → frontend liveStock key (for current/min reading)
    const STAGE_TO_LS_KEY = {
      wax_piece:        'rawMaterial',
      wax_setting:      'rawSetting',
      casting:          'wipLiquidCasting',
      filling:          'filing',
      pre_polish:       'packing',
      setting:          'setting',
      final_polish:     'finalPolish',
      ready_for_plating: 'readyForPlacing',
    };

    // Maps voucher dept_to key → frontend liveStock key (for WIP display)
    const DEPT_TO_LS_KEY = {
      'wax-pieces':   'rawMaterial',
      'wax-setting':  'rawSetting',
      'casting':      'wipLiquidCasting',
      'filing':       'filing',
      'pre-polish':   'packing',
      'hand-setting': 'setting',
      'polishing':    'finalPolish',
      'plating':      'readyForPlacing',
    };

    // Build per-product, per-stage current/min totals from inventory transactions.
    // WIP transactions are intentionally skipped — WIP is computed live from active jobs.
    const stockByProduct = new Map(); // productId → Map(stage__stockType → total)
    const locationByProduct = new Map(); // productId → Map(stage → latest location string)
    transactions.forEach((txn) => {
      const pid = txn?.product;
      if (!pid) return;
      if (String(txn?.txn_type || '').toLowerCase() === 'demand') return;
      const stage = String(txn?.stage || 'default').trim();
      const stockType = String(txn?.stock_type || 'current').trim();
      if (stockType === 'wip') return; // skip — WIP sourced from jobs, not transactions
      const qty = Number(txn?.quantity || 0);
      // Only accumulate non-zero qty (location-only syncs have qty=0)
      if (qty !== 0) {
        const delta = txn?.txn_type === 'out' ? -qty : qty;
        if (!stockByProduct.has(pid)) stockByProduct.set(pid, new Map());
        const inner = stockByProduct.get(pid);
        const k = `${stage}__${stockType}`;
        inner.set(k, (inner.get(k) || 0) + delta);
      }
      // Track latest non-empty location per stage
      const loc = String(txn?.location || '').trim();
      if (loc) {
        if (!locationByProduct.has(pid)) locationByProduct.set(pid, new Map());
        locationByProduct.get(pid).set(stage, loc);
      }
    });

    const EMPTY_STAGE = { min: '', current: '', wip: '', location: '' };

    const summaryRows = products.map((p) => {
      const inner = stockByProduct.get(p.id) || new Map();
      const locationByStage = locationByProduct.get(p.id) || new Map();
      const masterSku = (p.master_sku || '').toUpperCase();
      const wipForProduct = wipBySku[masterSku] || {};

      const liveStock = {
        rawMaterial:      { ...EMPTY_STAGE },
        rawSetting:       { ...EMPTY_STAGE },
        wipLiquidCasting: { ...EMPTY_STAGE },
        filing:           { ...EMPTY_STAGE },
        packing:          { ...EMPTY_STAGE },
        setting:          { ...EMPTY_STAGE },
        finalPolish:      { ...EMPTY_STAGE },
        readyForPlacing:  { ...EMPTY_STAGE },
      };

      // Populate current / min from inventory transactions (per stage)
      for (const [stageKey, lsKey] of Object.entries(STAGE_TO_LS_KEY)) {
        const current = inner.get(`${stageKey}__current`) || 0;
        const min = inner.get(`${stageKey}__min`) || 0;
        if (current) liveStock[lsKey].current = String(current);
        if (min) liveStock[lsKey].min = String(min);
        const loc = locationByStage.get(stageKey) || '';
        if (loc) liveStock[lsKey].location = loc;
      }

      // Populate WIP from active jobs — keyed by dept_to (i.e. destination column)
      for (const [deptTo, lsKey] of Object.entries(DEPT_TO_LS_KEY)) {
        const wip = wipForProduct[deptTo] || 0;
        if (wip) liveStock[lsKey].wip = String(wip);
      }

      // Build finalStock per variation from stage keys: 'final_stock__<varsku>'
      const finalStockMap = new Map();
      for (const [k, total] of inner.entries()) {
        if (k.startsWith('final_stock__') && k.endsWith('__current')) {
          const varSku = k.slice('final_stock__'.length, k.length - '__current'.length);
          if (varSku) {
            const upper = varSku.toUpperCase();
            finalStockMap.set(upper, (finalStockMap.get(upper) || 0) + total);
          }
        }
      }

      let finalStock;
      if (finalStockMap.size > 0) {
        finalStock = Array.from(finalStockMap.entries()).map(([sku, value]) => ({
          sku,
          value: String(value),
          unit: 'pcs',
          location: locationByStage.get(`final_stock__${sku.toLowerCase()}`) || '',
        }));
      } else {
        const legacyTotal = inner.get('final_stock__current') || 0;
        finalStock = [{ sku: p.master_sku || '', value: String(legacyTotal), unit: 'pcs', location: locationByStage.get('final_stock') || '' }];
      }

      return { sku: p.master_sku || '', liveStock, finalStock };
    });

    return Response.json({
      success: true,
      products: mapProductSummaryRows(products, summaryRows),
      customerData: [],
      kycData: [],
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: 'Failed to fetch products.',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const sku = String(data?.sku || '').trim();

    if (!sku) {
      return Response.json(
        {
          success: false,
          message: 'SKU is required',
        },
        { status: 400 }
      );
    }

    const productPayload = mapIncomingToProductPayload(data);

    // If the client already knows the product ID (loaded via Edit dialog), skip the search.
    let existingId = data?.existingProductId ? Number(data.existingProductId) : null;
    if (!existingId) {
      const found = await resolveProductBySku(request, sku).catch(() => null);
      existingId = found?.id ?? null;
    }

    let savedProduct = null;
    let isUpdate = false;

    if (existingId) {
      const patchResult = await fetchJsonWithSession(request, `/api/products/${existingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productPayload),
      });

      if (!patchResult.response.ok || !patchResult.payload?.success) {
        return Response.json(
          {
            success: false,
            message: patchResult.payload?.message || patchResult.payload?.detail || 'Failed to update product.',
          },
          { status: patchResult.response.status || 500 }
        );
      }

      savedProduct = patchResult.payload?.data || { id: existingId };
      isUpdate = true;
    } else {
      const createResult = await fetchJsonWithSession(request, '/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productPayload),
      });

      if (!createResult.response.ok || !createResult.payload?.success) {
        return Response.json(
          {
            success: false,
            message: createResult.payload?.message || 'Failed to create product.',
          },
          { status: createResult.response.status || 500 }
        );
      }

      savedProduct = createResult.payload?.data;
      isUpdate = false;
    }

    if (savedProduct?.id) {
      try {
        await syncAllInventoryStages(request, savedProduct.id, sku, data?.liveStock, data?.finalStock);
      } catch {
        // Inventory sync is best-effort; do not fail the whole save.
      }

      // Upload any new base64 images to disk via the upload-image endpoint
      const base64Images = Array.isArray(data?.productImages)
        ? data.productImages.filter((img) => Boolean(img) && String(img).startsWith('data:'))
        : [];

      if (base64Images.length > 0) {
        const uploadedUrls = [];
        const accessToken = request.cookies.get(ACCESS_COOKIE)?.value || '';
        const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value || '';

        for (const dataUrl of base64Images) {
          try {
            // Convert data URL to a Blob/File
            const [header, base64Data] = dataUrl.split(',');
            const mimeMatch = header.match(/data:([^;]+)/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
            const ext = mimeType.split('/')[1] || 'png';
            const binaryStr = Buffer.from(base64Data, 'base64');
            const uploadForm = new FormData();
            uploadForm.append(
              'image',
              new Blob([binaryStr], { type: mimeType }),
              `pasted-image-${Date.now()}.${ext}`
            );

            const doUpload = async (token) => fetch(
              `${backendBaseUrl()}/api/v1/products/${savedProduct.id}/upload-image/`,
              {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: uploadForm,
              }
            );

            let upRes = await doUpload(accessToken);
            if (upRes.status === 401 && refreshToken) {
              const newToken = await refreshAccessToken(refreshToken);
              if (newToken) upRes = await doUpload(newToken);
            }

            const upPayload = await upRes.json().catch(() => null);
            if (upPayload?.data?.url) {
              uploadedUrls.push(upPayload.data.url);
            }
          } catch {
            // Best-effort: skip failed image uploads
          }
        }

        // If any images were uploaded, the backend already appended them to product.images.
        // No additional PATCH is needed — the upload endpoint handles persistence.
      }
    }

    return Response.json({
      success: true,
      message: isUpdate ? 'Product updated successfully.' : 'Product added successfully.',
      isUpdate,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: error.message || 'Failed to save product.',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  let normalizedSku = '';

  try {
    const body = await request.json();
    normalizedSku = String(body?.sku || '').trim();
  } catch {
    return Response.json(
      {
        success: false,
        message: 'SKU is required',
      },
      { status: 400 }
    );
  }

  if (!normalizedSku) {
    return Response.json(
      {
        success: false,
        message: 'SKU is required',
      },
      { status: 400 }
    );
  }

  let existing = null;
  try {
    existing = await resolveProductBySku(request, normalizedSku);
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: error.message || 'Failed to delete product.',
      },
      { status: 500 }
    );
  }

  if (!existing?.id) {
    return Response.json(
      {
        success: false,
        message: `Product with SKU "${normalizedSku}" not found`,
      },
      { status: 404 }
    );
  }

  try {
    const relatedInventory = await fetchJsonWithSession(
      request,
      `/api/inventory?product=${encodeURIComponent(existing.id)}`
    );

    if (relatedInventory.response.ok && relatedInventory.payload?.success) {
      const transactions = asArray(relatedInventory.payload.data);
      for (const txn of transactions) {
        const txnId = txn?.id;
        if (!txnId) continue;
        try {
          await fetchJsonWithSession(request, `/api/inventory/${txnId}`, {
            method: 'DELETE',
          });
        } catch {
          // Best effort cleanup before product delete.
        }
      }
    }
  } catch {
    // Continue and let final existence check determine result.
  }

  try {
    await fetchJsonWithSession(request, `/api/products/${existing.id}`, {
      method: 'DELETE',
    });
  } catch {
    // Ignore and verify with a follow-up lookup.
  }

  try {
    const stillExists = await resolveProductBySku(request, normalizedSku);
    if (!stillExists) {
      return Response.json({
        success: true,
        message: `Product with SKU "${normalizedSku}" deleted successfully`,
      });
    }
  } catch {
    // Fall through to generic failure response below.
  }

  return Response.json(
    {
      success: false,
      message: 'Failed to delete product.',
    },
    { status: 500 }
  );
}
