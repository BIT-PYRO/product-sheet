import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const maxDuration = 60; // seconds – extend execution window on Vercel / Render

const ACCESS_COOKIE = 'psd-access-token';
const REFRESH_COOKIE = 'psd-refresh-token';
const DEFAULT_BACKEND_URL = 'https://product-sheet.onrender.com';
const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function backendBaseUrl() {
  return (process.env.BACKEND_BASE_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');
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
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellText: false, cellHTML: false, cellStyles: false });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error('The uploaded file does not contain any sheets.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('The uploaded file does not contain any rows.');
  }

  return rows.map((row) => normalizeRow(row));
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
    const sku = String(pickValue(row, ['sku', 'mastersku', 'productsku'])).trim();
    return { row, index, sku };
  });

  for (let batchStart = 0; batchStart < tasks.length; batchStart += BATCH_SIZE) {
    const batch = tasks.slice(batchStart, batchStart + BATCH_SIZE);
    await Promise.all(batch.map(async ({ row, index, sku }) => {
      if (!sku) { skippedCount += 1; return; }

      const payload = {
        sku,
        image: String(pickValue(row, ['image'])).trim(),
        tdm_file: String(pickValue(row, ['tdmfile', 'tdm_file', '3dmfile', '3dm_file', '3dm'])).trim(),
        stl_file: String(pickValue(row, ['stlfile', 'stl_file', 'stl'])).trim(),
        tdm_status: String(pickValue(row, ['tdmstatus', 'tdm_status', '3dmstatus'])).trim(),
        stl_status: String(pickValue(row, ['stlstatus', 'stl_status'])).trim(),
        render_status: String(pickValue(row, ['renderstatus', 'render_status', 'render'])).trim(),
        print_3d_status: String(pickValue(row, ['print3dstatus', 'print_3d_status', '3dprintstatus', '3dprint'])).trim(),
        is_active: toBoolean(pickValue(row, ['isactive', 'active'], true), true),
      };

      const dieRaw = String(pickValue(row, ['die', 'dieentries', 'die_entries'])).trim();
      if (dieRaw) {
        payload.die_entries = dieRaw.split(',').map((v) => ({ value: v.trim() })).filter((v) => v.value);
      }

      const existing = designerBySku.get(sku.toUpperCase());
      const path = existing ? `/api/v1/designers/${existing.id}/` : '/api/v1/designers/';
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
        const saved = result?.data || {};
        designerBySku.set(sku.toUpperCase(), saved);
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