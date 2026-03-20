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
  const qtyByProduct = new Map();
  const demandByProduct = new Map();

  transactions.forEach((txn) => {
    const productId = txn?.product;
    if (!productId) return;

    const qty = Number(txn?.quantity || 0);

    // Demand transactions are tracked separately; they do not affect stock balance.
    if (String(txn?.txn_type || '').trim().toLowerCase() === 'demand') {
      demandByProduct.set(productId, (demandByProduct.get(productId) || 0) + qty);
      return;
    }

    const current = qtyByProduct.get(productId) || 0;

    if (txn?.txn_type === 'out') {
      qtyByProduct.set(productId, current - qty);
      return;
    }

    // Treat 'in' and 'adjust' as additive for dashboard summary.
    qtyByProduct.set(productId, current + qty);
  });

  return products.map((product) => {
    const currentStock = qtyByProduct.get(product.id) || 0;
    const totalInDemand = demandByProduct.get(product.id) || 0;
    return {
      id: product.id,
      sku: product.sku || '',
      masterSku: product.sku || '',
      listingName: product.name || '',
      material: '',
      weight: '',
      category: product.category || '',
      collection: '',
      settingType: '',
      enamelType: '',
      activeChannels: '',
      shopifyStatus: product.is_active ? 'active' : 'inactive',
      dieNumberFindings: '',
      color: '',
      enamel: '',
      stoneName: '',
      stoneCut: '',
      stoneColor: '',
      stoneSize: '',
      stoneQuantity: '',
      platingType: '',
      platingColor: '',
      notes: '',
      images: '',
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
      finalStock: [
        {
          sku: product.sku || '',
          value: String(currentStock),
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
