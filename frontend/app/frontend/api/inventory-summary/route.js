import { NextResponse } from 'next/server';
import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

function asArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

/** Split legacy combined values like "bhang bhosda[5][chehere pr]" into separate fields. */
function parseDieLegacyValue(item) {
  if (!item || typeof item !== 'object') return item;
  if (String(item.quantity || '').trim() || String(item.location || '').trim()) return item;
  const value = String(item.value || '').trim();
  const m3 = value.match(/^(.+?)\[([^\]]+)\]\[([^\]]*)\]$/);
  if (m3) return { ...item, value: m3[1].trim(), quantity: m3[2].trim(), location: m3[3].trim() };
  const m2 = value.match(/^(.+?)\[([^\]]+)\]$/);
  if (m2) return { ...item, value: m2[1].trim(), quantity: m2[2].trim() };
  return item;
}

async function readJsonSafe(response) {
  if (!response) return null;
  if (response.status === 204 || response.status === 205) return null;
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    await response.text().catch(() => '');
    return null;
  }
  return response.json().catch(() => null);
}

/**
 * Parses variation SKUs from the product's color/enamel fields.
 * Format stored in DB: "GOLD[KARTIK/G]\nSILVER[KARTIK/S]"
 * Returns an array of variation SKUs e.g. ["KARTIK/G", "KARTIK/S"].
 */
function parseVariationSkus(colorStr, enamelStr) {
  const result = [];
  const parse = (str) => {
    if (!str) return;
    String(str).split('\n').forEach((line) => {
      const m = line.trim().match(/\[([^\]]+)\]/);
      if (m) result.push(m[1].trim());
    });
  };
  parse(colorStr);
  parse(enamelStr);
  return result;
}

// Maps voucher dept_to key → inventory stage key
const DEPT_TO_STAGE = {
  'wax-pieces':   'wax_piece',
  'wax-setting':  'wax_setting',
  'casting':      'casting',
  'filing':       'filling',
  'pre-polish':   'pre_polish',
  'hand-setting': 'setting',
  'polishing':    'final_polish',
  'plating':      'ready_for_plating',
  'final-stock':  'final_stock',
};

function buildProductStockMap(products, transactions, wipBySkuAndStage = new Map()) {
  // stockByProductKey: productId -> Map<`${stage}__${stock_type}`, running_qty>
  // stock_type is one of: 'current', 'min'  (wip now sourced from active jobs)
  const stockByProductKey = new Map();
  // locationByProductStage: productId -> Map<stage, latest_location_string>
  const locationByProductStage = new Map();

  transactions.forEach((txn) => {
    const productId = txn?.product;
    if (!productId) return;

    const qty = Number(txn?.quantity || 0);
    const stage = String(txn?.stage || '').trim().toLowerCase() || 'default';
    const stockType = String(txn?.stock_type || 'current').trim().toLowerCase() || 'current';

    // Skip demand-type transactions; demand is now sourced from picklist items.
    if (String(txn?.txn_type || '').trim().toLowerCase() === 'demand') return;
    // Skip legacy WIP transactions — WIP now computed live from active jobs.
    if (stockType === 'wip') return;

    if (!stockByProductKey.has(productId)) stockByProductKey.set(productId, new Map());
    const keyMap = stockByProductKey.get(productId);
    // Only accumulate qty for non-zero transactions (location-only syncs have qty=0)
    if (qty !== 0) {
      const key = `${stage}__${stockType}`;
      const prev = keyMap.get(key) || 0;
      const delta = txn?.txn_type === 'out' ? -qty : qty;
      keyMap.set(key, prev + delta);
    }

    // Track the latest non-empty location set for this product+stage.
    // Transactions are returned newest-first (-created_at), so only store
    // the first-seen value per stage to ensure the most recent location wins.
    const loc = String(txn?.location || '').trim();
    if (loc) {
      if (!locationByProductStage.has(productId)) locationByProductStage.set(productId, new Map());
      const locMap = locationByProductStage.get(productId);
      if (!locMap.has(stage)) locMap.set(stage, loc);
    }
  });

  return products.map((product) => {
    const keyMap = stockByProductKey.get(product.id) || new Map();
    const masterSkuKey = String(product.master_sku || '').trim().toUpperCase();
    // per-stage WIP from active jobs: Map<stageKey, qty>
    const jobWipByStage = wipBySkuAndStage.get(masterSkuKey) || new Map();
    // per-stage location from transactions
    const locationByStage = locationByProductStage.get(product.id) || new Map();
    // totalInDemand is driven by picklist selection in the UI — leave it as 0 here
    const totalInDemand = 0;

    // Get value for a given stage + stock_type combination
    const val = (stage, type) => {
      const v = keyMap.get(`${stage}__${type}`);
      return v != null ? String(v) : '';
    };

    // Helper that returns {min, current, wip, location} for a stage
    // WIP comes from active jobs (not transactions)
    const stageVals = (stage) => ({
      min:      val(stage, 'min'),
      current:  val(stage, 'current'),
      wip:      jobWipByStage.has(stage) ? String(jobWipByStage.get(stage)) : '',
      location: locationByStage.get(stage) || '',
    });

    // Default bucket (old transactions that have no stage set) — treated as current
    const defaultCurrent = val('default', 'current');

    return {
      id: product.id,
      sku: product.master_sku || '',
      masterSku: product.master_sku || '',
      designerSku: product.designer_sku || '',
      listingName: product.name || '',
      material: product.material || '',
      weight: product.weight || '',
      category: product.category || '',
      collection: product.collection || '',
      settingType: product.setting_type || '',
      enamelType: product.enamel_type || '',
      activeChannels: product.active_channels || '',
      shopifyStatus: product.is_active ? 'active' : 'inactive',
      dieNumberFindings: [
        ...(Array.isArray(product?.die_numbers) ? product.die_numbers.map((item) => parseDieLegacyValue({ ...item, type: 'die_number' })) : []),
        ...(Array.isArray(product?.findings) ? product.findings.map((item) => parseDieLegacyValue({ ...item, type: 'findings' })) : []),
      ],
      color: product.color || '',
      enamel: product.enamel || '',
      ...(() => {
        const sRows = Array.isArray(product.stone_entries) ? product.stone_entries : [];
        const j = (key) => sRows.map((r) => String(r[key] || '')).filter(Boolean).join(' / ');
        return {
          stone_entries: sRows,
          stoneType: j('type'),
          stoneSpecies: j('species'),
          stoneVariety: j('variety'),
          stoneColor: j('color'),
          stoneCut: j('cut'),
          stoneShape: j('shape'),
          stoneLength: j('length'),
          stoneWidth: j('width'),
          stoneHeight: j('height'),
          stoneQty: j('qty'),
        };
      })(),
      platingType: product.plating_type || '',
      platingColor: product.plating_color || '',
      platingEntries: Array.isArray(product.plating_entries) && product.plating_entries.length > 0
        ? product.plating_entries
        : (product.plating_type ? [{ type: product.plating_type, color: product.plating_color || '' }] : []),
      notes: product.notes || '',
      invoicePrice: product.invoice_price || '0',
      images: Array.isArray(product.images) ? product.images : [],
      liveStock: {
        rawMaterial:     { ...stageVals('wax_piece'),         current: val('wax_piece', 'current') || defaultCurrent },
        rawSetting:      stageVals('wax_setting'),
        wipLiquidCasting:stageVals('casting'),
        filing:          stageVals('filling'),
        packing:         stageVals('pre_polish'),
        setting:         stageVals('setting'),
        finalPolish:     stageVals('final_polish'),
        readyForPlacing: stageVals('ready_for_plating'),
      },
      finalStock: (() => {
        const variationSkus = parseVariationSkus(product.color, product.enamel);
        if (variationSkus.length > 0) {
          return variationSkus.map((varSku) => ({
            sku: varSku,
            // Stage keys are lowercased in buildProductStockMap — match that casing here
            value: val(`final_stock__${varSku.toLowerCase()}`, 'current') || '',
            unit: 'pcs',
            location: locationByStage.get(`final_stock__${varSku.toLowerCase()}`) || '',
          }));
        }
        // No variations — fall back to master SKU with aggregate final_stock value
        return [{
          sku: product.master_sku || '',
          value: val('final_stock', 'current') || defaultCurrent,
          unit: 'pcs',
          location: locationByStage.get('final_stock') || '',
        }];
      })(),
      totalInDemand,
    };
  });
}

export async function GET(request) {
  try {
    const [productsResponse, inventoryResponse, groupsResponse, wipResponse] = await Promise.all([
      proxyAuthenticatedRequest(request, '/api/v1/products/'),
      proxyAuthenticatedRequest(request, '/api/v1/inventory/'),
      proxyAuthenticatedRequest(request, '/api/v1/inventory/picklist-groups/'),
      proxyAuthenticatedRequest(request, '/api/v1/jobs/wip-summary/'),
    ]);

    const productsPayload = await readJsonSafe(productsResponse);
    const inventoryPayload = await readJsonSafe(inventoryResponse);
    const groupsPayload = await readJsonSafe(groupsResponse);
    const wipPayload = await readJsonSafe(wipResponse);

    if (!productsResponse.ok || !productsPayload?.success) {
      return NextResponse.json(
        { success: false, message: productsPayload?.message || 'Failed to fetch products.' },
        { status: productsResponse.status || 500 }
      );
    }

    if (!inventoryResponse.ok || !inventoryPayload?.success) {
      return NextResponse.json(
        { success: false, message: inventoryPayload?.message || 'Failed to fetch inventory.' },
        { status: inventoryResponse.status || 500 }
      );
    }

    const products = asArray(productsPayload.data);
    const transactions = asArray(inventoryPayload.data);

    // Build WIP map from active jobs: upperSku -> Map<stageKey, qty>
    // rawWip shape: { "SKU": { "dept_to_key": qty, ... }, ... }
    const wipBySkuAndStage = new Map();
    const rawWip = (wipResponse?.ok && wipPayload?.success && typeof wipPayload.data === 'object')
      ? wipPayload.data : {};
    Object.entries(rawWip).forEach(([sku, deptMap]) => {
      if (!sku || typeof deptMap !== 'object') return;
      const upperSku = String(sku).trim().toUpperCase();
      const stageMap = new Map();
      Object.entries(deptMap).forEach(([deptTo, qty]) => {
        const stageKey = DEPT_TO_STAGE[deptTo];
        if (stageKey && qty > 0) {
          stageMap.set(stageKey, (stageMap.get(stageKey) || 0) + qty);
        }
      });
      if (stageMap.size > 0) wipBySkuAndStage.set(upperSku, stageMap);
    });

    return NextResponse.json({
      success: true,
      products: buildProductStockMap(products, transactions, wipBySkuAndStage),
    });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Backend request failed while loading inventory summary.' },
      { status: 502 }
    );
  }
}
