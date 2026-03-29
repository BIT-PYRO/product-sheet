import { NextResponse } from 'next/server';
import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';

function asArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
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

function buildProductStockMap(products, transactions) {
  // stockByProductKey: productId -> Map<`${stage}__${stock_type}`, running_qty>
  // stock_type is one of: 'current', 'min', 'wip'  (default 'current' for old txns)
  const stockByProductKey = new Map();
  const demandByProduct = new Map();

  transactions.forEach((txn) => {
    const productId = txn?.product;
    if (!productId) return;

    const qty = Number(txn?.quantity || 0);
    const stage = String(txn?.stage || '').trim().toLowerCase() || 'default';
    const stockType = String(txn?.stock_type || 'current').trim().toLowerCase() || 'current';

    if (String(txn?.txn_type || '').trim().toLowerCase() === 'demand') {
      demandByProduct.set(productId, (demandByProduct.get(productId) || 0) + qty);
      return;
    }

    if (!stockByProductKey.has(productId)) stockByProductKey.set(productId, new Map());
    const keyMap = stockByProductKey.get(productId);
    const key = `${stage}__${stockType}`;
    const prev = keyMap.get(key) || 0;
    const delta = txn?.txn_type === 'out' ? -qty : qty;
    keyMap.set(key, prev + delta);
  });

  return products.map((product) => {
    const keyMap = stockByProductKey.get(product.id) || new Map();
    const totalInDemand = demandByProduct.get(product.id) || 0;

    // Get value for a given stage + stock_type combination
    const val = (stage, type) => {
      const v = keyMap.get(`${stage}__${type}`);
      return v != null ? String(v) : '';
    };

    // Helper that returns {min, current, wip, location} for a stage
    const stageVals = (stage) => ({
      min:      val(stage, 'min'),
      current:  val(stage, 'current'),
      wip:      val(stage, 'wip'),
      location: '',
    });

    // Default bucket (old transactions that have no stage set) — treated as current
    const defaultCurrent = val('default', 'current');

    return {
      id: product.id,
      sku: product.master_sku || '',
      masterSku: product.master_sku || '',
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
        ...(Array.isArray(product?.die_numbers) ? product.die_numbers.map((item) => ({ ...item, type: 'die_number' })) : []),
        ...(Array.isArray(product?.findings) ? product.findings.map((item) => ({ ...item, type: 'findings' })) : []),
      ],
      color: product.color || '',
      enamel: product.enamel || '',
      stoneName: product.stone_name || '',
      stoneCut: product.stone_cut || '',
      stoneColor: product.stone_color || '',
      stoneSize: product.stone_size || '',
      stoneQuantity: product.stone_quantity || '',
      platingType: product.plating_type || '',
      platingColor: product.plating_color || '',
      notes: product.notes || '',
      images: product.images || '',
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
      finalStock: [
        {
          sku: product.master_sku || '',
          value: val('final_stock', 'current') || defaultCurrent,
          unit: 'pcs',
        },
      ],
      totalInDemand,
    };
  });
}

export async function GET(request) {
  try {
    const [productsResponse, inventoryResponse] = await Promise.all([
      proxyAuthenticatedRequest(request, '/api/v1/products/'),
      proxyAuthenticatedRequest(request, '/api/v1/inventory/'),
    ]);

    const productsPayload = await readJsonSafe(productsResponse);
    const inventoryPayload = await readJsonSafe(inventoryResponse);

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

    return NextResponse.json({
      success: true,
      products: buildProductStockMap(products, transactions),
    });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Backend request failed while loading inventory summary.' },
      { status: 502 }
    );
  }
}
