import { proxyAuthenticatedRequest } from '@/app/frontend/api/_lib/backend-auth';
import {
  mergePicklistItems,
  savePicklistGroup,
  savePicklistOrder,
  sanitizeLabel,
  parsePositiveInt,
} from '../picklist-upload/route';

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
  // Default 7 days: if auto-sync misses a day, we still catch recent batches.
  // Unify filters by batch printing date (not order creation date), so a wider
  // window never double-counts — dedup by batch ID handles re-syncing.
  const daysBack = Math.max(0, parseInt(process.env.PICKLIST_SYNC_DAYS_BACK || '7', 10));
  const now = new Date();

  // Work in UTC so the window is never clipped by the server's local timezone
  // (e.g. UTC+5:30 would otherwise cut today's late-IST orders with a local 23:59:59 ceiling).
  const fromUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysBack, 0, 0, 0));
  const toUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0) - 1);
  // toUtc = 23:59:59.999 UTC today — covers every timezone up to UTC+14

  return { from: toIsoZ(fromUtc), to: toIsoZ(toUtc) };
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
  'total_quantity', 'totalQuantity',        // Unify summary field
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
  // ── Unify-specific shape: one picklist per dispatch batch ──────────────────
  // { shop_id, period,
  //   summary: [ { sku, title, total_quantity } ],   ← aggregate across all batches (ignored)
  //   orders:  [ { id, created_at, batch_numbers: [{id, name}], items: [...] } ] }
  //
  // We group orders by batch_numbers so each dispatch batch becomes its own
  // picklist. The flat `summary` is intentionally ignored because it merges
  // all batches into one, which is exactly what we want to avoid.
  // Orders with no batch go into a shared "Unbatched" group.
  if (Array.isArray(payload?.orders) && payload.orders.length > 0) {
    const NO_BATCH_KEY = '__no_batch__';
    const batchMap = new Map(); // batchKey → { externalId, name, date, rawItems[] }

    for (const order of payload.orders) {
      const batches =
        Array.isArray(order.batch_numbers) && order.batch_numbers.length > 0
          ? order.batch_numbers
          : [{ id: NO_BATCH_KEY, name: null }];

      for (const batch of batches) {
        const batchKey = String(batch.id ?? NO_BATCH_KEY);
        if (!batchMap.has(batchKey)) {
          batchMap.set(batchKey, {
            externalId: batchKey !== NO_BATCH_KEY ? batchKey : null,
            name: batch.name || null,
            date: order.created_at || null,
            rawItems: [],
            nullSkuOrders: [], // orders whose items had no valid SKU
          });
        }
        const entry = batchMap.get(batchKey);
        // Track the latest order date within this batch
        if (order.created_at && (!entry.date || order.created_at > entry.date)) {
          entry.date = order.created_at;
        }
        const orderItems = Array.isArray(order.items) ? order.items : [];
        let hasValidSku = false;
        for (const item of orderItems) {
          entry.rawItems.push(item);
          if (item.sku) hasValidSku = true;
        }
        // Track orders where ALL items have no SKU (e.g. "box chain" with sku: null)
        if (!hasValidSku && orderItems.length > 0) {
          entry.nullSkuOrders.push({
            order_number: order.order_number,
            items: orderItems.map((i) => i.title || 'Unknown item'),
          });
        }
      }
    }

    if (batchMap.size > 0) {
      const groups = [];
      for (const [, entry] of batchMap) {
        const items = entry.rawItems.map(extractItem).filter(Boolean);
        if (items.length) {
          groups.push({
            externalId: entry.externalId,
            name: entry.name,
            date: entry.date,
            items,
            nullSkuOrders: entry.nullSkuOrders || [],
          });
        }
      }
      if (groups.length) return groups;
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

async function getExistingPicklistGroups(request) {
  try {
    const response = await proxyAuthenticatedRequest(request, '/api/v1/inventory/picklist-groups/');
    const data = await response.json().catch(() => null);
    return Array.isArray(data?.data) ? data.data
         : Array.isArray(data?.results) ? data.results
         : [];
  } catch {
    return [];
  }
}

function buildBackendFingerprint(group) {
  // Build the same fingerprint format used for incoming groups, but from stored backend items.
  const items = Array.isArray(group?.items) ? group.items : [];
  return items
    .map((i) => `${String(i.sku || '').toUpperCase()}:${i.needed ?? 0}`)
    .sort()
    .join('|');
}

function buildIncomingFingerprint(merged) {
  return merged
    .map((i) => `${String(i.sku || '').toUpperCase()}:${i.needed ?? 0}`)
    .sort()
    .join('|');
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

  // ── 2. Call external API (with retry for sleeping Render free-tier services) ─
  const fetchHeaders = { Accept: 'application/json' };
  if (apiKey) fetchHeaders[apiKeyHeader] = apiKey;

  const MAX_RETRIES = 2;
  const RETRY_DELAY_MS = 5000; // 5 s pause then let the 35 s timeout cover Render's boot

  let externalResponse;
  let lastFetchError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    lastFetchError = null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35_000);
      externalResponse = await fetch(apiUrl, {
        headers: fetchHeaders,
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (err) {
      lastFetchError = err;
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }
      return Response.json(
        { success: false, message: `Could not reach external API after ${MAX_RETRIES} attempt(s): ${err.message}` },
        { status: 502 }
      );
    }

    // Retry on 502/503 — Render free-tier returns these while waking up
    if ((externalResponse.status === 502 || externalResponse.status === 503) && attempt < MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      continue;
    }

    break; // success or a definitive error — stop retrying
  }

  if (!externalResponse.ok) {
    const errBody = await externalResponse.text().catch(() => '');
    const hint =
      externalResponse.status === 401
        ? ' — API key is missing or invalid. Ensure EXTERNAL_PICKLIST_API_KEY is set and the server has been restarted.'
        : externalResponse.status === 404
        ? ' — URL not found. Check EXTERNAL_PICKLIST_API_URL.'
        : externalResponse.status === 502 || externalResponse.status === 503
        ? ' — External service may be starting up (Render free-tier). Retried 3 times. Try again shortly.'
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

  // ── 5. Deduplication — compare against items already stored in the backend ──
  // (replaces the previous in-memory _lastSyncFingerprint which reset on every
  //  process restart, causing duplicate saves after Render cold starts)
  const existingGroups = await getExistingPicklistGroups(request);
  const existingFingerprints = new Set(existingGroups.map(buildBackendFingerprint));
  // Also track stored group IDs so we can skip a batch that was already saved
  // even if its item fingerprint changed (e.g. duplicate SKUs merged differently).
  const existingIds = new Set(existingGroups.map((g) => String(g?.id || '')).filter(Boolean));

  const nextNumber = existingGroups.length > 0
    ? Math.max(...existingGroups.map((g) => parsePositiveInt(g?.number ?? g?.id, 0))) + 1
    : 1;

  // ── 6. Save each group (only if its data isn't already stored) ────────────
  let picklistNumber = nextNumber;
  const savedGroups = [];
  const skippedGroups = [];

  for (const group of groups) {
    const merged = mergePicklistItems(group.items);
    if (!merged.length) continue;

    const incomingFingerprint = buildIncomingFingerprint(merged);
    // Compute the group ID early so we can check it against already-saved IDs
    const shortHash = incomingFingerprint.length.toString(36) +
      Math.abs(incomingFingerprint.split('').reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0)).toString(36);
    const groupId = sanitizeLabel(group.externalId ? `ext-${group.externalId}` : `sync-${shortHash}`);

    // Skip if this batch ID was already saved, or if identical content exists
    if (existingIds.has(groupId) || existingFingerprints.has(incomingFingerprint)) {
      skippedGroups.push(group);
      continue;
    }

    const uploadedAt = group.date
      ? new Date(group.date).toISOString()
      : new Date().toISOString();

    // Format batch name: "printed_AWB_batch_20260417_050512" → "Batch #118 · 17 Apr 2026"
    let groupName;
    if (group.name) {
      const dateMatch = group.name.match(/(\d{8})/);
      if (dateMatch) {
        const raw = dateMatch[1];
        const d = new Date(`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`);
        const formatted = !isNaN(d)
          ? d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
          : raw;
        groupName = group.externalId ? `Batch #${group.externalId} · ${formatted}` : `Batch ${formatted}`;
      } else {
        groupName = sanitizeLabel(group.name);
      }
    } else {
      groupName = `Auto-sync ${new Date(uploadedAt).toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })}`;
    }

    const groupMeta = {
      id: groupId,
      number: picklistNumber,
      uploadedBy: 'auto-sync',
      date: uploadedAt,
      dateFormatted: new Date(uploadedAt).toLocaleString(),
      name: groupName,
    };

    let savedGroup;
    try {
      savedGroup = await savePicklistGroup(request, groupMeta, merged);
      await savePicklistOrder(request, savedGroup);
      savedGroups.push({ ...savedGroup, nullSkuOrders: group.nullSkuOrders || [] });
      picklistNumber += 1;
    } catch (err) {
      return Response.json(
        { success: false, message: err.message || 'Failed to save picklist.' },
        { status: 500 }
      );
    }
  }

  if (savedGroups.length === 0) {
    return Response.json({
      success: true,
      skipped: true,
      message: 'Picklist unchanged since last sync — nothing new to upload.',
    });
  }

  const totalItems = savedGroups.reduce((sum, g) => sum + g.items.length, 0);
  // Collect all null-SKU orders across all saved groups so the caller can surface them
  const allNullSkuOrders = savedGroups.flatMap((g) => g.nullSkuOrders || []);

  return Response.json({
    success: true,
    skipped: false,
    message: `Synced ${savedGroups.length} picklist(s) · ${totalItems} item(s) total.`
      + (allNullSkuOrders.length
        ? ` ⚠ ${allNullSkuOrders.length} order(s) had no valid SKU and were not added to the picklist.`
        : ''),
    syncedPicklists: savedGroups.length,
    totalItems,
    nullSkuOrders: allNullSkuOrders,
    picklistGroups: savedGroups.map((g) => ({
      id: g.id,
      number: g.number,
      name: g.name,
      date: g.date,
      itemCount: g.items.length,
      skippedOrders: g.nullSkuOrders?.length || 0,
    })),
  });
}
