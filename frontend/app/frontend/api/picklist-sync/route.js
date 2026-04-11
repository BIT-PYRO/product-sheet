import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';
import {
  mergePicklistItems,
  savePicklistGroup,
  savePicklistOrder,
  sanitizeLabel,
  parsePositiveInt,
} from '../picklist-upload/route';

// ---------------------------------------------------------------------------
// Deduplication fingerprint — skip re-upload when data hasn't changed.
// ---------------------------------------------------------------------------
let _lastSyncFingerprint = '';

function buildFingerprint(groups) {
  return groups
    .flatMap((g) =>
      g.items.map((i) => `${g.externalId ?? g.name}:${String(i.sku || '').toUpperCase()}:${i.needed ?? 0}`)
    )
    .sort()
    .join('|');
}

// ---------------------------------------------------------------------------
// Date-range helpers
//
// The external API uses:
//   ?from_date=2026-04-01T00:00:00Z&to_date=2026-04-10T23:59:59Z
//
// We automatically compute the window: today going back PICKLIST_SYNC_DAYS_BACK
// days (default 1 = today only). Store the base URL in env WITHOUT date params —
// we append fresh values on every sync call.
// ---------------------------------------------------------------------------

function toIsoZ(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function buildDateRange() {
  const daysBack = Math.max(0, parseInt(process.env.PICKLIST_SYNC_DAYS_BACK || '1', 10));
  const now = new Date();

  const from = new Date(now);
  from.setDate(from.getDate() - daysBack);
  from.setHours(0, 0, 0, 0);

  const to = new Date(now);
  to.setHours(23, 59, 59, 0);

  return { from: toIsoZ(from), to: toIsoZ(to) };
}

function appendDateParams(baseUrl) {
  const { from, to } = buildDateRange();
  const url = new URL(baseUrl);
  // Respect hard-coded dates already in the URL, otherwise inject the current range
  if (!url.searchParams.has('from_date')) url.searchParams.set('from_date', from);
  if (!url.searchParams.has('to_date')) url.searchParams.set('to_date', to);
  return url.toString();
}

// ---------------------------------------------------------------------------
// Dynamic JSON extractor
//
// Handles every shape the external API might return:
//
//   Shape A — envelope:  { "data": [ <picklist>, ... ] }
//                        { "results": [ ... ] }
//                        { "picklists": [ ... ] }
//   Shape B — bare array of picklist objects: [ { "items": [...] }, ... ]
//   Shape C — single picklist object:         { "id": ..., "items": [...] }
//   Shape D — flat item rows:                 [ { "sku": "AJB11/G", "needed_quantity": 5 }, ... ]
//
// For each item, every common field-name variant for SKU and quantity is tried.
// ---------------------------------------------------------------------------

function normalizeKey(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Case- and separator-insensitive value lookup. */
function firstVal(obj, candidates, fallback = '') {
  for (const key of candidates) {
    const val = obj[key];
    if (val !== null && val !== undefined && String(val).trim() !== '') return String(val).trim();
  }
  const normMap = {};
  for (const k of Object.keys(obj || {})) normMap[normalizeKey(k)] = obj[k];
  for (const key of candidates) {
    const val = normMap[normalizeKey(key)];
    if (val !== null && val !== undefined && String(val).trim() !== '') return String(val).trim();
  }
  return fallback;
}

const SKU_KEYS = [
  'sku', 'SKU',
  'master_sku', 'masterSku',
  'product_sku', 'productSku',
  'item_code', 'itemCode',
  'code', 'product_code',
  'stock_sku', 'stockSku',
];

const QTY_KEYS = [
  'needed_quantity', 'neededQuantity',
  'needed', 'need',
  'required_quantity', 'requiredQuantity', 'required',
  'quantity', 'qty',
  'pick_quantity', 'pickQuantity', 'pick_qty',
  'demand', 'demand_qty', 'demandQty',
  'order_quantity', 'orderQuantity',
];

const NAME_KEYS = [
  'product_name', 'productName',
  'listing_name', 'listingName',
  'name', 'title',
  'item_name', 'itemName',
  'description',
];

// SKUs look like: AJB11/G  AJB3/S  AJC1/G
const SKU_RE = /^[A-Z][A-Z0-9]{1,24}(\/[A-Z0-9]{1,6})*$/i;

const ITEM_ARRAY_KEYS = ['items', 'products', 'picklist_items', 'picklistItems', 'entries', 'lines'];
const PICKLIST_ID_KEYS = ['id', 'picklist_id', 'picklistId', 'external_id', 'externalId', 'reference_id'];
const PICKLIST_NAME_KEYS = ['name', 'title', 'picklist_name', 'picklistName', 'display_name', 'reference'];
const PICKLIST_DATE_KEYS = ['date', 'created_at', 'createdAt', 'generated_at', 'generatedAt', 'timestamp', 'created_date'];

function extractItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const sku = firstVal(raw, SKU_KEYS);
  if (!sku || !SKU_RE.test(sku.trim())) return null;
  const listingName = firstVal(raw, NAME_KEYS, sku);
  const neededRaw = firstVal(raw, QTY_KEYS, '0');
  const needed = Math.max(0, parseInt(String(neededRaw).replace(/[^0-9.-]/g, ''), 10) || 0);
  return { sku: sku.trim().toUpperCase(), listingName: listingName.trim(), needed };
}

function findItemsArray(obj) {
  for (const key of ITEM_ARRAY_KEYS) {
    if (Array.isArray(obj[key])) return obj[key];
    const normKey = normalizeKey(key);
    const match = Object.keys(obj).find((k) => normalizeKey(k) === normKey);
    if (match && Array.isArray(obj[match])) return obj[match];
  }
  return null;
}

function extractGroupFromObject(pl) {
  const rawItems = findItemsArray(pl);
  if (!rawItems) return null;
  const items = rawItems.map(extractItem).filter(Boolean);
  if (!items.length) return null;
  return {
    externalId: firstVal(pl, PICKLIST_ID_KEYS, null) || null,
    name: firstVal(pl, PICKLIST_NAME_KEYS, null) || null,
    date: firstVal(pl, PICKLIST_DATE_KEYS, null) || null,
    items,
  };
}

/**
 * Given the raw JSON payload from the external API, return an array of
 * normalised picklist groups: [{ externalId, name, date, items: [...] }]
 */
function extractPicklistGroups(payload) {
  // ── Unify-specific shape ──────────────────────────────────────────────────
  // { shop_id, period, orders: [ { id, created_at, status, items: [{sku, title, quantity}] } ] }
  // Merge all orders' items into a single combined picklist group.
  if (Array.isArray(payload?.orders)) {
    const allItems = payload.orders
      .flatMap((order) => (Array.isArray(order?.items) ? order.items : []))
      .map(extractItem)
      .filter(Boolean);
    if (allItems.length) {
      const latestDate = payload.orders
        .map((o) => o?.created_at)
        .filter(Boolean)
        .sort()
        .pop() || null;
      return [{ externalId: null, name: null, date: latestDate, items: allItems }];
    }
  }

  // ── Generic shapes ────────────────────────────────────────────────────────
  const candidates = [
    payload?.data,
    payload?.results,
    payload?.picklists,
    payload?.picklist_data,
    payload,
  ].filter((v) => v !== undefined && v !== null);

  for (const root of candidates) {
    // Array root — could be picklist objects or flat item rows
    if (Array.isArray(root) && root.length > 0) {
      const first = root[0];
      const hasNestedItems = !!findItemsArray(first || {});

      if (hasNestedItems) {
        // Shape B: array of picklist objects each containing items
        const groups = root.map(extractGroupFromObject).filter(Boolean);
        if (groups.length) return groups;
      } else {
        // Shape D: flat array of item rows
        const items = root.map(extractItem).filter(Boolean);
        if (items.length) return [{ externalId: null, name: null, date: null, items }];
      }
    }

    // Single picklist object (Shape C)
    if (root && typeof root === 'object' && !Array.isArray(root)) {
      const group = extractGroupFromObject(root);
      if (group) return [group];
    }
  }

  return [];
}

// ---------------------------------------------------------------------------
// Backend helpers
// ---------------------------------------------------------------------------

async function getNextPicklistNumber(request) {
  try {
    const response = await proxyAuthenticatedRequest(request, '/api/v1/inventory/picklist-groups/');
    const data = await response.json().catch(() => null);
    const groups = data?.data || data?.results || [];
    if (Array.isArray(groups) && groups.length > 0) {
      const max = Math.max(...groups.map((g) => parsePositiveInt(g?.number ?? g?.id, 0)));
      return max + 1;
    }
  } catch {
    // fall back to 1
  }
  return 1;
}

// ---------------------------------------------------------------------------
// GET — UI queries this to know whether external sync is configured
// ---------------------------------------------------------------------------
export async function GET() {
  const configured = Boolean(process.env.EXTERNAL_PICKLIST_API_URL);
  return Response.json({
    configured,
    autoSyncIntervalMs: Number(process.env.NEXT_PUBLIC_PICKLIST_SYNC_INTERVAL_MS) || 300_000,
  });
}

// ---------------------------------------------------------------------------
// POST — pull latest picklist(s) from external software and save them
// ---------------------------------------------------------------------------
export async function POST(request) {
  const baseUrl = process.env.EXTERNAL_PICKLIST_API_URL;
  const apiKey = process.env.EXTERNAL_PICKLIST_API_KEY;
  const apiKeyHeader = process.env.EXTERNAL_PICKLIST_API_KEY_HEADER || 'X-API-Key';

  if (!baseUrl) {
    return Response.json(
      {
        success: false,
        message:
          'External picklist API is not configured. ' +
          'Set EXTERNAL_PICKLIST_API_URL in your .env file. ' +
          'Example: https://unify-8ba1.onrender.com/api/external/shops/janki-jewels/picklists/',
      },
      { status: 400 }
    );
  }

  // ── 1. Build URL with fresh date range ───────────────────────────────────
  let apiUrl;
  try {
    apiUrl = appendDateParams(baseUrl);
  } catch {
    apiUrl = baseUrl;
  }

  // ── 2. Call external API ─────────────────────────────────────────────────
  const fetchHeaders = { Accept: 'application/json' };
  if (apiKey) fetchHeaders[apiKeyHeader] = apiKey;

  let externalResponse;
  try {
    externalResponse = await fetch(apiUrl, { headers: fetchHeaders, cache: 'no-store' });
  } catch (err) {
    return Response.json(
      { success: false, message: `Could not reach external API: ${err.message}` },
      { status: 502 }
    );
  }

  if (!externalResponse.ok) {
    const errBody = await externalResponse.text().catch(() => '');
    const hint =
      externalResponse.status === 401
        ? ' — API key is missing or invalid. Ensure EXTERNAL_PICKLIST_API_KEY is set and the server has been restarted.'
        : externalResponse.status === 404
        ? ' — URL not found. Check EXTERNAL_PICKLIST_API_URL.'
        : '';
    return Response.json(
      {
        success: false,
        message: `External API returned HTTP ${externalResponse.status}${hint}`,
        calledUrl: apiUrl,
        externalBody: errBody.slice(0, 300) || undefined,
      },
      { status: 502 }
    );
  }

  // ── 3. Parse JSON ────────────────────────────────────────────────────────
  let payload;
  try {
    payload = await externalResponse.json();
  } catch (err) {
    return Response.json(
      { success: false, message: `External API did not return valid JSON: ${err.message}` },
      { status: 422 }
    );
  }

  // ── 4. Extract picklist groups from whatever JSON shape came back ─────────
  const groups = extractPicklistGroups(payload);

  if (!groups.length) {
    return Response.json(
      {
        success: false,
        message:
          'No picklists found for the selected date range. ' +
          'Try increasing PICKLIST_SYNC_DAYS_BACK or wait for Unify to generate a picklist.',
        rawKeys: Object.keys(payload || {}),
      },
      { status: 422 }
    );
  }

  // ── 5. Deduplication — skip when identical to last sync ──────────────────
  const fingerprint = buildFingerprint(groups);
  if (fingerprint === _lastSyncFingerprint) {
    return Response.json({
      success: true,
      skipped: true,
      message: 'Picklist unchanged since last sync — nothing new to upload.',
    });
  }

  // ── 6. Save each group ────────────────────────────────────────────────────
  let nextNumber = await getNextPicklistNumber(request);
  const savedGroups = [];

  for (const group of groups) {
    const merged = mergePicklistItems(group.items);
    if (!merged.length) continue;

    const uploadedAt = group.date
      ? new Date(group.date).toISOString()
      : new Date().toISOString();

    const groupName = group.name
      ? sanitizeLabel(group.name)
      : `Auto-sync ${new Date(uploadedAt).toLocaleDateString(undefined, {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}`;

    const groupMeta = {
      id: sanitizeLabel(group.externalId ? `ext-${group.externalId}` : `picklist-${Date.now()}`),
      number: nextNumber,
      uploadedBy: 'auto-sync',
      date: uploadedAt,
      dateFormatted: new Date(uploadedAt).toLocaleString(),
      name: groupName,
    };

    let savedGroup;
    try {
      savedGroup = await savePicklistGroup(request, groupMeta, merged);
      await savePicklistOrder(request, savedGroup);
      savedGroups.push(savedGroup);
      nextNumber += 1;
    } catch (err) {
      return Response.json(
        { success: false, message: err.message || 'Failed to save picklist.' },
        { status: 500 }
      );
    }
  }

  _lastSyncFingerprint = fingerprint;

  const totalItems = savedGroups.reduce((sum, g) => sum + g.items.length, 0);

  return Response.json({
    success: true,
    skipped: false,
    message: `Synced ${savedGroups.length} picklist(s) · ${totalItems} item(s) total.`,
    syncedPicklists: savedGroups.length,
    totalItems,
    picklistGroups: savedGroups.map((g) => ({
      id: g.id,
      number: g.number,
      name: g.name,
      date: g.date,
      itemCount: g.items.length,
    })),
  });
}
