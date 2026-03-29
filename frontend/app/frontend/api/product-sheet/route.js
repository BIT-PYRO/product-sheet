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
    designer_sku: String(data?.designerSku || '').trim(),
    name: listingName || masterSku,
    category: String(data?.dropdown2 || data?.category || '').trim(),
    selling_price: weightAsPrice,
    cost_price: weightAsPrice,
    is_active: String(data?.shopifyStatus || '').toLowerCase() !== 'inactive',
    die_numbers,
    findings,
    material: String(data?.material || data?.dropdown1 || '').trim(),
    weight: String(data?.weight || data?.weightValue || '').trim(),
    collection: String(data?.collection || data?.dropdown3 || '').trim(),
    setting_type: String(data?.settingType || '').trim(),
    enamel_type: String(data?.enamelType || '').trim(),
    active_channels: String(data?.activeChannels || '').trim(),
    color: (() => { const vars = Array.isArray(data?.variations) ? data.variations : []; const vals = vars.filter(v => String(v?.label || '').toUpperCase() === 'COLOR').map(v => { const c1 = String(v?.col1 || '').trim(); const c2 = String(v?.col2 || '').trim(); return c1 ? (c2 ? `${c1}[${c2}]` : c1) : ''; }).filter(Boolean); return vals.length ? vals.join('\n') : String(data?.color || '').trim(); })(),
    enamel: (() => { const vars = Array.isArray(data?.variations) ? data.variations : []; const vals = vars.filter(v => String(v?.label || '').toUpperCase() === 'ENAMEL').map(v => { const c1 = String(v?.col1 || '').trim(); const c2 = String(v?.col2 || '').trim(); return c1 ? (c2 ? `${c1}[${c2}]` : c1) : ''; }).filter(Boolean); return vals.length ? vals.join('\n') : String(data?.enamel || '').trim(); })(),
    stone_entries: Array.isArray(data?.stoneInfo) ? data.stoneInfo.map(({ type, species, variety, color, cut, shape, length, width, height, qty }) => ({ type: type || '', species: species || '', variety: variety || '', color: color || '', cut: cut || '', shape: shape || '', length: length || '', width: width || '', height: height || '', qty: qty || '' })) : (Array.isArray(data?.stoneEntries) ? data.stoneEntries : []),
    plating_type: String(Array.isArray(data?.platingType) ? (data.platingType.find(r => r?.col1)?.col1 || '') : (data?.platingType || '')).trim(),
    plating_color: String(Array.isArray(data?.platingType) ? (data.platingType.find(r => r?.col2)?.col2 || '') : (data?.platingColor || '')).trim(),
    notes: String(data?.notes || data?.manufacturing?.notes || '').trim(),
    images: Array.isArray(data?.productImages) ? data.productImages.filter(Boolean) : [],
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
  const { response, payload } = await fetchJsonWithSession(request, `/api/products?search=${encoded}`);

  if (!response.ok || !payload?.success) {
    const message = payload?.message || 'Failed to search product.';
    throw new Error(message);
  }

  const rows = asArray(payload.data);
    return rows.find((item) => String(item?.master_sku || '').trim().toLowerCase() === sku.toLowerCase()) || null;
}

async function syncInventoryToFinalStock(request, productId, sku, finalStock) {
  const desiredQuantity = (Array.isArray(finalStock) ? finalStock : []).reduce(
    (sum, row) => sum + toNumber(row?.value),
    0
  );

  const { response, payload } = await fetchJsonWithSession(
    request,
    `/api/inventory?product=${encodeURIComponent(productId)}`
  );

  if (!response.ok || !payload?.success) {
    return;
  }

  const transactions = asArray(payload.data);
  const currentStock = transactions.reduce((sum, txn) => {
    const quantity = toNumber(txn?.quantity);
    if (String(txn?.txn_type || '').toLowerCase() === 'out') {
      return sum - quantity;
    }
    return sum + quantity;
  }, 0);

  const delta = Math.round(desiredQuantity - currentStock);
  if (delta === 0) {
    return;
  }

  await fetchJsonWithSession(request, '/api/inventory', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product: productId,
      txn_type: 'adjust',
      quantity: delta,
      remark: `Product sheet sync for ${sku}`,
    }),
  });
}

export async function GET(request) {
  try {
    const [productsResult, inventoryResult] = await Promise.all([
      fetchJsonWithSession(request, '/api/products'),
      fetchJsonWithSession(request, '/api/inventory'),
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

    // Build per-product stock summary inline (same logic as inventory-summary/route.js).
    // This avoids a loopback call to /api/inventory-summary which is a frontend-only route.
    const qtyByProduct = new Map();
    transactions.forEach((txn) => {
      const pid = txn?.product;
      if (!pid) return;
      const qty = Number(txn?.quantity || 0);
      if (String(txn?.txn_type || '').trim().toLowerCase() === 'demand') return;
      const cur = qtyByProduct.get(pid) || 0;
      qtyByProduct.set(pid, txn?.txn_type === 'out' ? cur - qty : cur + qty);
    });

    const summaryRows = products.map((p) => {
      const currentStock = qtyByProduct.get(p.id) || 0;
      return {
        sku: p.master_sku || '',
        liveStock: {
          rawMaterial: { min: '', current: String(currentStock), wip: '', location: '' },
          rawSetting: { min: '', current: '', wip: '', location: '' },
          wipLiquidCasting: { min: '', current: '', wip: '', location: '' },
          filing: { min: '', current: '', wip: '', location: '' },
          packing: { min: '', current: '', wip: '', location: '' },
          setting: { min: '', current: '', wip: '', location: '' },
          finalPolish: { min: '', current: '', wip: '', location: '' },
          readyForPlacing: { min: '', current: '', wip: '', location: '' },
        },
        finalStock: [{ sku: p.master_sku || '', value: String(currentStock), unit: 'pcs' }],
      };
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
        await syncInventoryToFinalStock(request, savedProduct.id, sku, data?.finalStock);
      } catch {
        // Inventory sync is best-effort; do not fail the whole save.
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
