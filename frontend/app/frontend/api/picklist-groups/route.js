import { NextResponse } from 'next/server';

function asArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function parsePicklistRemark(remark) {
  const text = String(remark || '').trim();
  if (!text.startsWith('picklist::')) {
    return null;
  }

  const parts = text.split('::');
  if (parts.length < 5) {
    return null;
  }

  const number = Number.parseInt(parts[2] || '', 10);
  const uploadedAt = String(parts[4] || '').trim();

  return {
    id: String(parts[1] || '').trim(),
    number: Number.isFinite(number) && number > 0 ? number : null,
    uploadedBy: String(parts[3] || '').trim() || 'Unknown',
    date: uploadedAt || new Date().toISOString(),
    name: String(parts[5] || '').trim() || 'Picklist',
  };
}

export async function GET(request) {
  const origin = request.nextUrl.origin;
  const cookie = request.headers.get('cookie') || '';

  const [productsResponse, inventoryResponse] = await Promise.all([
    fetch(`${origin}/api/products`, {
      method: 'GET',
      headers: { cookie },
      cache: 'no-store',
    }),
    fetch(`${origin}/api/inventory`, {
      method: 'GET',
      headers: { cookie },
      cache: 'no-store',
    }),
  ]);

  const productsPayload = await productsResponse.json().catch(() => null);
  const inventoryPayload = await inventoryResponse.json().catch(() => null);

  if (!productsResponse.ok || productsPayload?.success === false) {
    return NextResponse.json(
      { success: false, message: productsPayload?.message || 'Failed to fetch products.' },
      { status: productsResponse.status || 500 }
    );
  }

  if (!inventoryResponse.ok || inventoryPayload?.success === false) {
    return NextResponse.json(
      { success: false, message: inventoryPayload?.message || 'Failed to fetch inventory.' },
      { status: inventoryResponse.status || 500 }
    );
  }

  const products = asArray(productsPayload?.data);
  const transactions = asArray(inventoryPayload?.data);

  const productById = new Map();
  products.forEach((product) => {
    productById.set(product?.id, product || {});
  });

  const groupMap = new Map();

  transactions.forEach((txn) => {
    const txnType = String(txn?.txn_type || '').trim().toLowerCase();
    if (txnType !== 'demand') {
      return;
    }

    const meta = parsePicklistRemark(txn?.remark);
    if (!meta?.id) {
      return;
    }

    const product = productById.get(txn?.product);
    const sku = String(product?.sku || '').trim();
    if (!sku) {
      return;
    }

    if (!groupMap.has(meta.id)) {
      groupMap.set(meta.id, {
        id: meta.id,
        number: meta.number,
        name: meta.name,
        uploadedBy: meta.uploadedBy,
        date: meta.date,
        dateFormatted: new Date(meta.date).toLocaleString(),
        itemMap: new Map(),
      });
    }

    const group = groupMap.get(meta.id);
    const qty = Math.max(0, Number.parseInt(String(txn?.quantity || '0'), 10) || 0);
    const existing = group.itemMap.get(sku);

    if (existing) {
      existing.needed += qty;
      return;
    }

    group.itemMap.set(sku, {
      sku,
      listingName: String(product?.name || sku).trim(),
      needed: qty,
    });
  });

  const picklists = Array.from(groupMap.values())
    .map((group) => ({
      id: group.id,
      number: group.number,
      name: group.name,
      uploadedBy: group.uploadedBy,
      date: group.date,
      dateFormatted: group.dateFormatted,
      items: Array.from(group.itemMap.values()),
    }))
    .sort((a, b) => {
      const byNumber = (b.number || 0) - (a.number || 0);
      if (byNumber !== 0) return byNumber;
      return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
    });

  return NextResponse.json({
    success: true,
    picklists,
  });
}
