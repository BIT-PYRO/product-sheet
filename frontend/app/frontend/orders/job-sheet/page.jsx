'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { RefreshCw, ChevronRight, ArrowLeft, Upload, Trash2, CloudDownload, FileDown } from 'lucide-react';
import { useSheetPermissions } from '@/hooks/use-sheet-permissions';

const fmt = (n) => `₹${Number(n).toFixed(2)}`;

const PSD_PICKLISTS_KEY = 'psd_picklists';

export function OrderSheetView({ embedded = false }) {
  const { canExport } = useSheetPermissions('orders');
  const picklistFileInputRef = useRef(null);
  const [isUploadingPicklist, setIsUploadingPicklist] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [productsBySku, setProductsBySku] = useState({});
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState(null);
  const [showProductDetails, setShowProductDetails] = useState(true);
  const [selectedPicklistNum, setSelectedPicklistNum] = useState(null);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [editingCell, setEditingCell] = useState(null); // { orderId, field }
  const [editingValue, setEditingValue] = useState('');
  const [savingCell, setSavingCell] = useState(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [customerDetailsUnlocked, setCustomerDetailsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // External sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null); // { tone, message }
  const [externalSyncConfigured, setExternalSyncConfigured] = useState(false);

  // Delete picklist state
  const [showDeletePicklistDialog, setShowDeletePicklistDialog] = useState(false);
  const [availablePicklists, setAvailablePicklists] = useState([]);
  const [deletePicklistLoading, setDeletePicklistLoading] = useState(false);
  const [deletePicklistFetching, setDeletePicklistFetching] = useState(false);
  const [deletePicklistError, setDeletePicklistError] = useState('');
  const [selectedDeletePicklistIds, setSelectedDeletePicklistIds] = useState(new Set());

  // Export picklist state
  const [showExportPicklistDialog, setShowExportPicklistDialog] = useState(false);
  const [exportPicklistNum, setExportPicklistNum] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const CUSTOMER_DETAILS_PASSCODE = process.env.NEXT_PUBLIC_CUSTOMER_PASSCODE || '1234';

  const normalizeSku = (value) => String(value || '').trim().toLowerCase();

  const buildProductMap = (products) => {
    const map = {};
    products.forEach((product) => {
      const key = normalizeSku(product?.master_sku || product?.masterSku || product?.sku);
      if (!key) {
        return;
      }
      map[key] = {
        sku: product?.master_sku || product?.masterSku || product?.sku || '',
        listingName: product?.name || product?.listingName || '',
        material: product?.material || '',
        weight: product?.weight || '',
        category: product?.category || '',
        collection: product?.collection || '',
        settingType: product?.settingType || product?.setting_type || '',
        enamelType: product?.enamelType || product?.enamel_type || '',
        activeChannels: product?.activeChannels || product?.active_channels || '',
        shopifyStatus: product?.shopifyStatus || product?.shopify_status || (product?.is_active === true ? 'Active' : product?.is_active === false ? 'Inactive' : ''),
        dieNumberFindings: product?.dieNumberFindings || product?.die_number_findings || '',
        masterSku: product?.masterSku || product?.master_sku || product?.sku || '',
        color: product?.color || '',
        enamel: product?.enamel || '',
        stoneName: product?.stoneName || product?.stone_name || '',
        stoneCut: product?.stoneCut || product?.stone_cut || '',
        stoneColor: product?.stoneColor || product?.stone_color || '',
        stoneSize: product?.stoneSize || product?.stone_size || '',
        stoneQuantity: product?.stoneQuantity || product?.stone_quantity || '',
        platingType: product?.platingType || product?.plating_type || '',
        platingColor: product?.platingColor || product?.plating_color || '',
        notes: product?.notes || '',
        images: product?.images || '',
      };
    });
    return map;
  };

  const loadOrdersAndProducts = async () => {
    try {
      setLoading(true);
      setProductsLoading(true);
      setError(null);
      setProductsError(null);

      const [ordersResponse, productsResponse] = await Promise.all([
        fetch('/frontend/api/orders', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }),
        fetch('/frontend/api/products', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }),
      ]);

      if (!ordersResponse.ok) {
        console.warn(`Orders request failed (${ordersResponse.status})`);
        setError('Failed to fetch orders');
        setLoading(false);
        setProductsLoading(false);
        return;
      }

      const ordersData = await ordersResponse.json();
      const ordersList = Array.isArray(ordersData?.results)
        ? ordersData.results
        : Array.isArray(ordersData)
          ? ordersData
          : [];
      setOrders(ordersList);
      if (selectedOrder) {
        const updatedSelected = ordersList.find((order) => order.id === selectedOrder.id) || null;
        setSelectedOrder(updatedSelected);
      }

      if (!productsResponse.ok) {
        setProductsError('Failed to fetch product details');
      } else {
        const productsData = await productsResponse.json();
        const productsList = Array.isArray(productsData?.data)
          ? productsData.data
          : Array.isArray(productsData?.results)
            ? productsData.results
            : Array.isArray(productsData)
              ? productsData
              : [];
        setProductsBySku(buildProductMap(productsList));
      }
    } catch (err) {
      setError(err.message || 'Error loading orders');
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
      setProductsLoading(false);
    }
  };

  // Load orders and product details from API
  useEffect(() => {
    loadOrdersAndProducts();
  }, []);

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => { if (data?.user?.id) setCurrentUsername(data.user.id); })
      .catch(() => {});
  }, []);

  // Check if external sync is configured (to show/hide Sync button)
  useEffect(() => {
    fetch('/frontend/api/picklist-sync', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.configured) {
          setExternalSyncConfigured(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleExternalSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const response = await fetch('/frontend/api/picklist-sync', { method: 'POST' });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        setSyncStatus({ tone: 'error', message: result?.message || 'Sync failed.' });
        return;
      }

      if (result.skipped) {
        setSyncStatus({ tone: 'info', message: 'Already up to date.' });
        return;
      }

      setSyncStatus({ tone: 'success', message: result.message || 'Synced successfully.' });

      // Refresh local state the same way the manual upload does
      try {
        const freshRes = await fetch('/frontend/api/picklist-groups', { cache: 'no-store' }).catch(() => null);
        const freshData = freshRes?.ok ? await freshRes.json().catch(() => null) : null;
        const freshList = Array.isArray(freshData?.data) ? freshData.data : [];
        localStorage.setItem(PSD_PICKLISTS_KEY, JSON.stringify(freshList));
      } catch {
        // ignore localStorage write failures
      }

      window.dispatchEvent(
        new CustomEvent('inventory_sheet_sync', { detail: { updatedAt: Date.now().toString() } })
      );

      await loadOrdersAndProducts();
    } catch (err) {
      setSyncStatus({ tone: 'error', message: err.message || 'Sync failed.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePicklistUploadClick = () => {
    picklistFileInputRef.current?.click();
  };

  const handlePicklistFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsUploadingPicklist(true);

    try {
      const syncTimestamp = Date.now().toString();
      const uploadedAt = new Date();

      let plannedPicklistNumber = 1;
      try {
        const existingPicklists = JSON.parse(localStorage.getItem(PSD_PICKLISTS_KEY) || '[]');
        plannedPicklistNumber =
          existingPicklists.length > 0
            ? Math.max(...existingPicklists.map((p) => p.number || 0)) + 1
            : 1;
      } catch {
        plannedPicklistNumber = 1;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('picklistGroupId', `picklist-${syncTimestamp}`);
      formData.append('picklistNumber', String(plannedPicklistNumber));
      formData.append('uploadedBy', currentUsername || '');
      formData.append('uploadedAt', uploadedAt.toISOString());
      formData.append('picklistName', file.name);

      const response = await fetch('/api/picklist-upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || 'Failed to upload picklist');
      }

      localStorage.setItem('inventory_sheet_updated_at', syncTimestamp);

      // Write only the newly-uploaded group to localStorage (no stale merge).
      // master_inventory_sheet will overwrite the full list from backend on reload.
      try {
        const parsedItems = Array.isArray(result.picklistItems) ? result.picklistItems : [];
        const backendGroup = result?.picklistGroup || {};
        const newPicklist = {
          id: backendGroup.id || `picklist-${syncTimestamp}`,
          number: backendGroup.number || plannedPicklistNumber,
          name: backendGroup.name || file.name,
          date: backendGroup.date || uploadedAt.toISOString(),
          dateFormatted: backendGroup.dateFormatted || uploadedAt.toLocaleString(),
          uploadedBy: backendGroup.uploadedBy || currentUsername || 'Unknown',
          items: parsedItems,
        };
        // Replace localStorage entirely with the fresh backend list + new entry
        // so deleted picklists can never sneak back in.
        const freshRes = await fetch('/api/picklist-groups', { cache: 'no-store' }).catch(() => null);
        const freshData = freshRes?.ok ? await freshRes.json().catch(() => null) : null;
        const freshList = Array.isArray(freshData?.data) ? freshData.data : [newPicklist];
        localStorage.setItem(PSD_PICKLISTS_KEY, JSON.stringify(freshList));
      } catch {
        // ignore localStorage write failures
      }

      window.dispatchEvent(
        new CustomEvent('inventory_sheet_sync', { detail: { updatedAt: syncTimestamp } })
      );

      await loadOrdersAndProducts();
    } catch (uploadError) {
      setError(`Upload failed: ${uploadError.message}`);
    } finally {
      setIsUploadingPicklist(false);
    }
  };

  const handleVerifyPassword = () => {
    setPasswordError('');
    if (passwordInput === CUSTOMER_DETAILS_PASSCODE) {
      setCustomerDetailsUnlocked(true);
      setShowPasswordDialog(false);
      setPasswordInput('');
    } else {
      setPasswordError('Incorrect passcode. Please try again.');
      setPasswordInput('');
    }
  };

  const handleOpenPasswordDialog = () => {
    setPasswordInput('');
    setPasswordError('');
    setShowPasswordDialog(true);
  };

  const handleRefresh = async () => {
    await loadOrdersAndProducts();
  };

  const handleOpenExportPicklistDialog = () => {
    const nums = [
      ...new Set(
        orders
          .filter((o) => o.order_source === 'picklist' && o.picklist_number != null)
          .map((o) => o.picklist_number)
      ),
    ].sort((a, b) => b - a);
    setExportPicklistNum(nums[0] ?? null);
    setShowExportPicklistDialog(true);
  };

  const handleExportPicklist = () => {
    if (exportPicklistNum == null) return;
    setIsExporting(true);

    // Gather all items for this picklist from matching orders
    const picklistOrders = orders.filter(
      (o) => o.order_source === 'picklist' && o.picklist_number === exportPicklistNum
    );

    // Group by master SKU, tracking each variation SKU and its qty separately.
    // Order items store the variation SKU (e.g. AJE116/G); strip the last /suffix
    // to recover the master SKU (e.g. AJE116).
    // masterMap: masterSku → { productName, totalQty, variations: Map<variationSku, qty> }
    const masterMap = new Map();
    picklistOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const variationSku = String(item.sku || '').trim().toUpperCase();
        if (!variationSku) return;
        const masterSku = variationSku.includes('/')
          ? variationSku.substring(0, variationSku.lastIndexOf('/'))
          : variationSku;
        const qty = Number(item.quantity) || 0;
        const productName = String(item.name || '').trim();

        if (!masterMap.has(masterSku)) {
          masterMap.set(masterSku, { productName, totalQty: 0, variations: new Map() });
        }
        const entry = masterMap.get(masterSku);
        entry.totalQty += qty;
        // Use the item name as product name if not set yet
        if (!entry.productName && productName) entry.productName = productName;
        // Aggregate per variation SKU
        entry.variations.set(variationSku, (entry.variations.get(variationSku) || 0) + qty);
      });
    });

    const rows = Array.from(masterMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([masterSku, entry]) => ({ masterSku, ...entry }));

    // Build printable HTML
    const picklistName = `PICKLIST-${exportPicklistNum}`;
    const exportDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const totalPiecesAll = rows.reduce((s, r) => s + r.totalQty, 0);

    const rowsHtml = rows.map((item) => {
      const normalized = item.masterSku.toLowerCase();
      const product = productsBySku[normalized] || null;
      const imageList = Array.isArray(product?.images) ? product.images : [];
      const firstImage = imageList[0] || null;
      const displayName = item.productName || product?.listing_name || product?.name || '';

      const imgHtml = firstImage
        ? `<img src="${firstImage}" alt="${item.masterSku}" style="width:100px;height:100px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;" />`
        : `<div style="width:100px;height:100px;border-radius:8px;border:1px solid #e5e7eb;background:#f9fafb;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:11px;">No image</div>`;

      // Variation rows (only shown if there are multiple variations or variation ≠ master)
      const variationEntries = Array.from(item.variations.entries());
      const showVariations = variationEntries.length > 0 && !(variationEntries.length === 1 && variationEntries[0][0] === item.masterSku);
      const variationsHtml = showVariations
        ? `<div style="margin-top:6px;display:flex;flex-direction:column;gap:3px;">
            ${variationEntries.map(([vSku, vQty]) => `
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:11px;color:#6b7280;background:#f3f4f6;padding:1px 6px;border-radius:4px;font-family:monospace;">${vSku}</span>
                <span style="font-size:11px;font-weight:600;color:#374151;">×${vQty}</span>
              </div>`).join('')}
          </div>`
        : '';

      return `
        <tr>
          <td style="padding:10px 14px;vertical-align:middle;border-bottom:1px solid #f3f4f6;">${imgHtml}</td>
          <td style="padding:10px 14px;vertical-align:top;border-bottom:1px solid #f3f4f6;">
            <div style="font-weight:700;font-size:13px;color:#111827;">${item.masterSku}</div>
            ${displayName ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">${displayName}</div>` : ''}
            ${variationsHtml}
          </td>
          <td style="padding:10px 14px;vertical-align:middle;border-bottom:1px solid #f3f4f6;font-weight:700;font-size:15px;color:#2563eb;text-align:center;">${item.totalQty}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${picklistName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #fff; color: #111827; padding: 24px; }
    h1 { font-size: 18px; font-weight: 800; color: #111827; }
    .meta { font-size: 12px; color: #6b7280; margin-top: 4px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    thead th { background: #f3f4f6; padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
    thead th:last-child { text-align: center; }
    tbody tr:hover { background: #f9fafb; }
    @media print {
      body { padding: 12px; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
    <div>
      <h1>${picklistName}</h1>
      <p class="meta">Exported on ${exportDate} &nbsp;·&nbsp; ${rows.length} SKU${rows.length !== 1 ? 's' : ''} &nbsp;·&nbsp; ${totalPiecesAll} pieces total</p>
    </div>
    <button onclick="window.print()" style="padding:8px 18px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">Print / Save PDF</button>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:124px;">Image</th>
        <th>Master SKU &amp; Product Name</th>
        <th style="width:100px;">Qty Needed</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }

    setShowExportPicklistDialog(false);
    setIsExporting(false);
  };

  const handleOpenDeletePicklistDialog = async () => {
    setDeletePicklistError('');
    setSelectedDeletePicklistIds(new Set());
    setAvailablePicklists([]);
    setShowDeletePicklistDialog(true);
    setDeletePicklistFetching(true);
    try {
      const res = await fetch('/api/picklist-groups', { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      const backendList = res.ok
        ? (Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.results)
              ? data.results
              : Array.isArray(data?.picklists)
                ? data.picklists
                : Array.isArray(data)
                  ? data
                  : [])
        : null; // null = request failed, distinct from empty list

      if (backendList !== null && backendList.length > 0) {
        // Backend has groups — use them
        setAvailablePicklists(backendList);
      } else if (backendList !== null) {
        // Backend responded ok with empty list — groups are gone.
        // Synthesise orphan entries from any picklist orders still in state.
        const picklistNums = [
          ...new Set(
            orders
              .filter((o) => o.order_source === 'picklist' && o.picklist_number != null)
              .map((o) => o.picklist_number)
          ),
        ].sort((a, b) => a - b);

        const synthesized = picklistNums.map((num) => {
          const sample = orders.find(
            (o) => o.order_source === 'picklist' && o.picklist_number === num
          );
          return {
            id: `__orphan__${num}`,
            group_id: `__orphan__${num}`,
            number: num,
            name: `PICKLIST-${num}`,
            uploadedBy: sample?.order_type || '',
            dateFormatted: sample
              ? new Date(sample.created_at).toLocaleString()
              : '',
            _orphan: true,
          };
        });
        setAvailablePicklists(synthesized);
      } else {
        // Backend request failed — show error so user knows to retry
        setDeletePicklistError('Could not reach the server. Please try again.');
      }
    } catch {
      setDeletePicklistError('Failed to load picklists.');
    } finally {
      setDeletePicklistFetching(false);
    }
  };

  const handleConfirmDeletePicklist = async () => {
    if (selectedDeletePicklistIds.size === 0) {
      setDeletePicklistError('Please select at least one picklist to delete.');
      return;
    }
    setDeletePicklistLoading(true);
    setDeletePicklistError('');
    const errors = [];
    try {
      // Resolve full picklist objects for selected ids so we have the number too
      const toDelete = availablePicklists.filter((pl) =>
        selectedDeletePicklistIds.has(String(pl.id || pl.group_id))
      );

      for (const pl of toDelete) {
        const plId = String(pl.id || pl.group_id);
        const plNumber = pl.number;
        const isOrphan = pl._orphan === true || plId.startsWith('__orphan__');

        // 1. Delete PicklistGroup from backend (cascades PicklistItems in DB)
        // Skip for synthesised orphan entries — the group no longer exists.
        if (!isOrphan) {
          try {
            const res = await fetch(`/api/picklist-groups?groupId=${encodeURIComponent(plId)}`, {
              method: 'DELETE',
            });
            // 404 is fine — already gone
            if (!res.ok && res.status !== 204 && res.status !== 404) {
              const data = await res.json().catch(() => null);
              errors.push(`#${plNumber}: ${data?.message || `server error ${res.status}`}`);
              continue;
            }
          } catch (err) {
            errors.push(`#${plNumber}: ${err.message}`);
            continue;
          }
        }

        // 2. Delete associated orders from backend
        try {
          const ordersRes = await fetch(
            `/frontend/api/orders?order_source=picklist&picklist_number=${plNumber}`,
            { cache: 'no-store' }
          );
          if (ordersRes.ok) {
            const ordersData = await ordersRes.json().catch(() => null);
            const ordersList = Array.isArray(ordersData?.results)
              ? ordersData.results
              : Array.isArray(ordersData)
                ? ordersData
                : [];
            await Promise.all(
              ordersList.map((o) =>
                fetch(`/frontend/api/orders/${o.id}`, { method: 'DELETE' }).catch(() => {})
              )
            );
          }
        } catch { /* best-effort */ }

        // 3. Remove from localStorage — match by number (always reliable)
        // and by id for non-orphan entries
        try {
          const raw = localStorage.getItem(PSD_PICKLISTS_KEY);
          if (raw) {
            const existing = JSON.parse(raw);
            const updated = existing.filter((p) => {
              if (plNumber != null && p.number === plNumber) return false;
              if (!isOrphan && String(p.id || '') === plId) return false;
              return true;
            });
            localStorage.setItem(PSD_PICKLISTS_KEY, JSON.stringify(updated));
          }
        } catch { /* ignore */ }
      }

      if (errors.length > 0) {
        setDeletePicklistError(`Some deletions failed:\n${errors.join('\n')}`);
      } else {
        setShowDeletePicklistDialog(false);
        setSelectedDeletePicklistIds(new Set());
      }
      // Notify Master Inventory Sheet (same tab and other tabs) to reload
      const syncTs = Date.now().toString();
      try {
        localStorage.setItem('inventory_sheet_updated_at', syncTs);
      } catch { /* ignore */ }
      window.dispatchEvent(
        new CustomEvent('inventory_sheet_sync', { detail: { updatedAt: syncTs } })
      );
      await loadOrdersAndProducts();
    } catch (err) {
      setDeletePicklistError(err.message || 'Failed to delete picklist.');
    } finally {
      setDeletePicklistLoading(false);
    }
  };

  // ── Inline-cell editing ──────────────────────────────────────────────────
  const startEdit = (e, orderId, field, currentValue) => {
    e.stopPropagation();
    setEditingCell({ orderId, field });
    setEditingValue(currentValue);
  };

  const cancelEdit = (e) => {
    e?.stopPropagation();
    setEditingCell(null);
    setEditingValue('');
  };

  const commitEdit = async (e, orderId) => {
    e?.stopPropagation();
    if (!editingCell) return;
    const { field } = editingCell;
    const trimmed = editingValue.trim();
    setSavingCell({ orderId, field });
    try {
      const res = await fetch(`/frontend/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: trimmed || (field === 'order_type' ? 'JANKI' : 'Pieces') }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o)));
        if (selectedOrder?.id === orderId) setSelectedOrder((prev) => ({ ...prev, ...updated }));
      }
    } catch {/* ignore */} finally {
      setSavingCell(null);
      setEditingCell(null);
      setEditingValue('');
    }
  };

  const handleCellKeyDown = (e, orderId) => {
    if (e.key === 'Enter') commitEdit(e, orderId);
    if (e.key === 'Escape') cancelEdit(e);
  };

  // Filter orders by the selected picklist.
  // Picklist items use Final Stock / variation SKUs (e.g. AJE55/G).
  // Order items may store just the base master SKU (e.g. AJE55) OR the full variation SKU.
  // We match both cases: exact match OR the order item SKU is the base part of a picklist variation.
  // Distinct picklist numbers derived from picklist-sourced orders (sorted ascending)
  const picklistNumbers = useMemo(() => {
    return [
      ...new Set(
        orders
          .filter((o) => o.order_source === 'picklist' && o.picklist_number != null)
          .map((o) => o.picklist_number)
      ),
    ].sort((a, b) => a - b);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (sourceFilter === 'custom') {
      return orders.filter((order) => order.order_source === 'custom');
    }

    if (sourceFilter === 'picklist') {
      const picklistOrders = orders.filter((order) => order.order_source === 'picklist');

      if (selectedPicklistNum != null) {
        return picklistOrders.filter((order) => order.picklist_number === selectedPicklistNum);
      }

      // No specific picklist — sort by total item quantity descending
      return [...picklistOrders].sort((a, b) => {
        const totalA = (a.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
        const totalB = (b.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
        return totalB - totalA;
      });
    }

    // 'all'
    return orders;
  }, [orders, selectedPicklistNum, sourceFilter]);

  // Group order items by their base master SKU for hierarchical display.
  // Order item sku may be a full variation SKU (AJE55/G) or a plain master SKU (AJE55).
  // Strip the /suffix to get the display master SKU, and keep the full SKU as the variation.
  const groupedItems = useMemo(() => {
    if (!selectedOrder?.items) return [];
    // Map: masterSku → { productName, items[] }
    const groups = new Map();
    selectedOrder.items.forEach((item) => {
      const fullSku = item.sku || '—';
      const masterSkuDisplay = fullSku.includes('/')
        ? fullSku.substring(0, fullSku.lastIndexOf('/'))
        : fullSku;
      if (!groups.has(masterSkuDisplay)) {
        groups.set(masterSkuDisplay, { productName: '', items: [] });
      }
      const entry = groups.get(masterSkuDisplay);
      // Use first non-empty name encountered as productName
      if (!entry.productName && item.name) entry.productName = String(item.name).trim();
      entry.items.push({
        variationSku: fullSku,
        quantity: item.quantity ?? '—',
      });
    });
    return Array.from(groups.entries()).map(([masterSku, { productName, items }]) => ({ masterSku, productName, items }));
  }, [selectedOrder]);

  return (
    <main className={embedded ? '' : 'h-screen bg-cloud-gray overflow-hidden'}>
      {/* Header */}
      {!embedded && (
      <div className="bg-white border-b border-soft-border shadow-sm">
        <div className="max-w-7xl mx-auto px-5 py-3">
          <div className="flex items-center gap-1.5 text-xs text-cool-gray mb-2">
            <Link href="/orders" className="hover:text-midnight-ink">Orders</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-midnight-ink font-medium">Order Sheet</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-midnight-ink">Order Sheet</h1>
              <p className="text-xs text-cool-gray mt-0.5">View all confirmed orders</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePicklistUploadClick}
                disabled={isUploadingPicklist}
                className="gap-2 text-xs px-3 py-1.5 rounded-md border border-soft-border bg-white hover:bg-cloud-gray text-midnight-ink font-medium transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="h-4 w-4" />
                {isUploadingPicklist ? 'Uploading...' : 'Bulk Upload'}
              </button>
              {externalSyncConfigured && (
                <button
                  onClick={handleExternalSync}
                  disabled={isSyncing}
                  title="Pull latest picklist from external software"
                  className="gap-2 text-xs px-3 py-1.5 rounded-md border border-trust-blue/40 bg-white hover:bg-trust-blue/5 text-trust-blue font-medium transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CloudDownload className="h-4 w-4" />
                  {isSyncing ? 'Syncing...' : 'Sync Picklist'}
                </button>
              )}
              {canExport && (
              <button
                onClick={handleOpenExportPicklistDialog}
                className="gap-2 text-xs px-3 py-1.5 rounded-md border border-soft-border bg-white hover:bg-cloud-gray text-midnight-ink font-medium transition-colors flex items-center"
              >
                <FileDown className="h-4 w-4" />
                Export Picklist
              </button>
              )}
              <button
                onClick={handleRefresh}
                className="gap-2 text-xs px-3 py-1.5 rounded-md border border-soft-border bg-white hover:bg-cloud-gray text-midnight-ink font-medium transition-colors flex items-center"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Hidden file input — always mounted so the ref is valid in both embedded and standalone mode */}
      <input
        ref={picklistFileInputRef}
        type="file"
        accept="*/*"
        onChange={handlePicklistFileChange}
        className="hidden"
      />

      {/* Main content */}
      <div className={`${embedded ? 'w-full h-full px-0 py-2' : 'h-[calc(100vh-90px)] max-w-7xl mx-auto px-5 py-4'} min-h-0`}>
        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-danger-soft border border-danger text-danger-dark text-xs">
            {error}
          </div>
        )}

        {/* External sync status */}
        {syncStatus && (
          <div
            className={`mb-3 px-3 py-2 rounded-lg text-xs font-medium border ${
              syncStatus.tone === 'error'
                ? 'bg-danger-soft border-danger text-danger-dark'
                : syncStatus.tone === 'info'
                ? 'bg-cloud-gray border-soft-border text-cool-gray'
                : 'bg-green-50 border-green-300 text-green-800'
            }`}
          >
            {syncStatus.message}
          </div>
        )}

        {/* Vertical split layout: top list, bottom details */}
        <div className="flex flex-col gap-3 h-full min-h-0">
          {/* Top area - Orders table */}
          <div className="w-full h-[52vh] min-h-[360px] max-h-[56vh] shrink-0 bg-white rounded-2xl border border-soft-border shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-soft-border bg-cloud-gray space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wide text-midnight-ink">Orders</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePicklistUploadClick}
                    disabled={isUploadingPicklist}
                    className="gap-1.5 text-xs px-3 py-1 rounded-md border border-soft-border bg-white hover:bg-white/80 text-midnight-ink font-medium transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {isUploadingPicklist ? 'Uploading...' : 'Bulk Upload'}
                  </button>
                  {externalSyncConfigured && (
                    <button
                      onClick={handleExternalSync}
                      disabled={isSyncing}
                      title="Pull latest picklist from external software"
                      className="gap-1.5 text-xs px-3 py-1 rounded-md border border-trust-blue/40 bg-white hover:bg-trust-blue/5 text-trust-blue font-medium transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CloudDownload className="h-3.5 w-3.5" />
                      {isSyncing ? 'Syncing...' : 'Sync Picklist'}
                    </button>
                  )}
                  <button
                    onClick={handleOpenDeletePicklistDialog}
                    className="gap-1.5 text-xs px-3 py-1 rounded-md border border-danger/40 bg-white hover:bg-danger-soft text-danger-dark font-medium transition-colors flex items-center"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Picklist
                  </button>
                  {canExport && (
                  <button
                    onClick={handleOpenExportPicklistDialog}
                    className="gap-1.5 text-xs px-3 py-1 rounded-md border border-soft-border bg-white hover:bg-cloud-gray text-midnight-ink font-medium transition-colors flex items-center"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    Export Picklist
                  </button>
                  )}
                  <span className="text-[11px] font-semibold text-cool-gray">{filteredOrders.length} total</span>
                </div>
              </div>
              {/* Source type tabs */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-cool-gray font-medium shrink-0">Source:</span>
                {[
                  { value: 'all', label: 'All' },
                  { value: 'custom', label: 'Custom Orders' },
                  { value: 'picklist', label: 'Picklist' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => {
                      setSourceFilter(value);
                      setSelectedPicklistNum(null);
                    }}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors ${
                      sourceFilter === value
                        ? 'bg-trust-blue text-white border-trust-blue'
                        : 'bg-white text-cool-gray border-soft-border hover:border-trust-blue hover:text-trust-blue'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {/* Picklist sub-selector — only shown when Picklist tab is active */}
              {sourceFilter === 'picklist' && picklistNumbers.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-cool-gray font-medium shrink-0">Picklist:</span>
                  <button
                    onClick={() => setSelectedPicklistNum(null)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors ${
                      selectedPicklistNum === null
                        ? 'bg-trust-blue/20 text-trust-blue border-trust-blue'
                        : 'bg-white text-cool-gray border-soft-border hover:border-trust-blue hover:text-trust-blue'
                    }`}
                  >
                    All Picklists
                  </button>
                  {picklistNumbers.map((num) => (
                    <button
                      key={num}
                      onClick={() => setSelectedPicklistNum(num)}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors ${
                        selectedPicklistNum === num
                          ? 'bg-trust-blue/20 text-trust-blue border-trust-blue'
                          : 'bg-white text-cool-gray border-soft-border hover:border-trust-blue hover:text-trust-blue'
                      }`}
                    >
                      #{num}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {loading ? (
              <div className="flex items-center justify-center min-h-[220px] text-xs text-cool-gray">
                Loading orders…
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[220px] text-xs text-cool-gray gap-2">
                <p>
                  {sourceFilter === 'picklist' && selectedPicklistNum
                    ? `No orders found for picklist #${selectedPicklistNum}`
                    : sourceFilter === 'picklist'
                      ? 'No picklist orders found. Upload a picklist in the Master Inventory Sheet.'
                      : sourceFilter === 'custom'
                        ? 'No custom orders yet'
                        : 'No orders found'}
                </p>
                {sourceFilter === 'custom' && (
                  <Link href="/orders/create-job" className="text-sky-info hover:text-trust-blue hover:underline font-medium">
                    Create an order
                  </Link>
                )}
                {sourceFilter === 'all' && (
                  <Link href="/orders/create-job" className="text-sky-info hover:text-trust-blue hover:underline font-medium">
                    Create an order
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-y-auto overflow-x-hidden max-h-[360px] min-h-[220px]">
                <table className="w-full table-fixed border-collapse text-sm">
                  <thead className="bg-cloud-gray border-b border-soft-border sticky top-0 z-10">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-bold text-cool-gray uppercase tracking-wide w-[12%]">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-cool-gray uppercase tracking-wide w-[10%]">Time</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-cool-gray uppercase tracking-wide w-[12%]">Order Type</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-cool-gray uppercase tracking-wide w-[14%]">Order Reference</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-cool-gray uppercase tracking-wide w-[14%]">Order Name</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-cool-gray uppercase tracking-wide w-[8%]">Order No</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-cool-gray uppercase tracking-wide w-[10%]">Total Items</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-cool-gray uppercase tracking-wide w-[10%]">Total Pieces</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-cool-gray uppercase tracking-wide w-[10%]">Units</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-soft-border">
                    {filteredOrders.map((order) => {
                      const orderRef = order.order_source === 'picklist' ? 'PICKLIST' : 'CUSTOM';
                      const orderName = order.order_source === 'picklist'
                        ? `PICKLIST-${order.picklist_number ?? order.id}`
                        : `CUSTOM-${order.id}`;
                      const totalPieces = (order.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
                      const totalItems = order.total_items ?? (order.items || []).length;
                      const isEditingType = editingCell?.orderId === order.id && editingCell?.field === 'order_type';
                      const isEditingUnits = editingCell?.orderId === order.id && editingCell?.field === 'units';
                      const isSavingType = savingCell?.orderId === order.id && savingCell?.field === 'order_type';
                      const isSavingUnits = savingCell?.orderId === order.id && savingCell?.field === 'units';
                      return (
                      <tr
                        key={order.id}
                        onClick={() => {
                          if (editingCell) return;
                          if (selectedOrder?.id === order.id) {
                            setSelectedOrder(null);
                            setCustomerDetailsUnlocked(false);
                            return;
                          }
                          setSelectedOrder(order);
                          setCustomerDetailsUnlocked(false);
                        }}
                        className={`hover:bg-cloud-gray transition-colors cursor-pointer group border-l-4 ${
                          selectedOrder?.id === order.id
                            ? 'bg-cloud-gray border-l-trust-blue'
                            : 'border-l-transparent even:bg-white'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span className="text-midnight-ink text-xs">
                            {new Date(order.created_at).toLocaleDateString('en-GB')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-midnight-ink text-xs">
                            {new Date(order.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        {/* Order Type — editable */}
                        <td className="px-4 py-3">
                          {isEditingType ? (
                            <div className="flex items-center gap-1">
                              <input
                                autoFocus
                                className="w-full text-xs border border-trust-blue rounded px-1.5 py-0.5 focus:outline-none"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={(e) => handleCellKeyDown(e, order.id)}
                              />
                              <button onClick={(e) => commitEdit(e, order.id)} className="text-trust-blue hover:text-deep-blue shrink-0" title="Save">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                              </button>
                              <button onClick={cancelEdit} className="text-cool-gray hover:text-midnight-ink shrink-0" title="Cancel">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 group/cell">
                              <span className="text-midnight-ink text-xs font-medium">{isSavingType ? '…' : (order.order_type || 'JANKI')}</span>
                              <button
                                onClick={(e) => startEdit(e, order.id, 'order_type', order.order_type || 'JANKI')}
                                className="opacity-0 group-hover/cell:opacity-100 transition-opacity text-cool-gray hover:text-trust-blue"
                                title="Edit order type"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6.536-6.536a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 14H9v-3z" /></svg>
                              </button>
                            </div>
                          )}
                        </td>
                        {/* Order Reference — computed */}
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                            orderRef === 'PICKLIST'
                              ? 'bg-trust-blue/10 text-trust-blue'
                              : 'bg-cloud-gray text-cool-gray'
                          }`}>{orderRef}</span>
                        </td>
                        {/* Order Name — computed */}
                        <td className="px-4 py-3">
                          <span className="text-midnight-ink text-xs font-semibold">{orderName}</span>
                        </td>
                        {/* Order No */}
                        <td className="px-4 py-3">
                          <span className="font-bold text-trust-blue group-hover:text-deep-blue transition-colors text-xs">
                            {order.order_no || order.id}
                          </span>
                        </td>
                        {/* Total Items — distinct SKU rows */}
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-midnight-ink text-xs">
                            {totalItems > 0 ? totalItems : '—'}
                          </span>
                        </td>
                        {/* Total Pieces — computed */}
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-midnight-ink text-xs">
                            {totalPieces > 0 ? totalPieces : '—'}
                          </span>
                        </td>
                        {/* Units — editable */}
                        <td className="px-4 py-3 text-right">
                          {isEditingUnits ? (
                            <div className="flex items-center gap-1 justify-end">
                              <input
                                autoFocus
                                className="w-20 text-xs border border-trust-blue rounded px-1.5 py-0.5 focus:outline-none text-right"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={(e) => handleCellKeyDown(e, order.id)}
                              />
                              <button onClick={(e) => commitEdit(e, order.id)} className="text-trust-blue hover:text-deep-blue shrink-0" title="Save">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                              </button>
                              <button onClick={cancelEdit} className="text-cool-gray hover:text-midnight-ink shrink-0" title="Cancel">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 justify-end group/cell">
                              <button
                                onClick={(e) => startEdit(e, order.id, 'units', order.units || 'Pieces')}
                                className="opacity-0 group-hover/cell:opacity-100 transition-opacity text-cool-gray hover:text-trust-blue"
                                title="Edit units"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6.536-6.536a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 14H9v-3z" /></svg>
                              </button>
                              <span className="font-semibold text-midnight-ink text-xs">{isSavingUnits ? '…' : (order.units || 'Pieces')}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bottom area - Order details (shown only after selecting an order) */}
          <div className="w-full flex-1 min-h-0 bg-white rounded-2xl border border-soft-border shadow-sm overflow-hidden flex flex-col">
            {selectedOrder ? (
              <div className="flex-1 overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-trust-blue border-b border-soft-border p-2 z-20 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-white">
                        Order #{selectedOrder.order_no || selectedOrder.id}
                      </h2>
                      <p className="text-xs text-white/80 mt-0.5 leading-tight">
                        {(() => {
                          const src = selectedOrder.order_source;
                          if (src === 'shopify' || src === 'Shopify') return 'Shopify';
                          if (src === 'sample' || src === 'Sample') return 'Sample';
                          return 'Custom';
                        })()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-3 space-y-3 min-h-0 flex flex-col">
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-white rounded-lg border border-soft-border">
                      <p className="text-xs text-cool-gray mb-0.5">Created</p>
                      <p className="font-bold text-midnight-ink text-xs leading-tight">
                        {new Date(selectedOrder.created_at).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-soft-border">
                      <p className="text-xs text-cool-gray mb-0.5">Total</p>
                      <p className="font-bold text-midnight-ink text-xs leading-tight">
                        {fmt(selectedOrder.total)}
                      </p>
                    </div>
                  </div>

                  {/* Customer details section */}
                  {!customerDetailsUnlocked ? (
                    <div
                      onClick={handleOpenPasswordDialog}
                      className="p-3 rounded-lg border border-soft-border bg-cloud-gray hover:bg-white cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-trust-blue group-hover:bg-deep-blue transition-colors">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 1C6.48 1 2 5.48 2 11v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V11c0-5.52-4.48-10-10-10zm-2 15h4v2h-4v-2zm6-9H8V6h8v1z"/>
                          </svg>
                        </div>
                        <div>
                          <p className="font-bold text-midnight-ink text-xs uppercase tracking-wide">Customer Details</p>
                          <p className="text-xs text-cool-gray leading-tight">Enter passcode to unlock</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-white border border-soft-border shadow-sm animate-fade-in">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-midnight-ink text-xs uppercase tracking-wide">Customer Details</h3>
                        <button
                          onClick={() => setCustomerDetailsUnlocked(false)}
                          className="text-xs text-cool-gray hover:text-midnight-ink transition-colors underline"
                        >
                          Lock
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { label: 'Name', value: selectedOrder.customer_name },
                          { label: 'Email', value: selectedOrder.customer_email },
                          { label: 'Phone', value: selectedOrder.customer_phone },
                          { label: 'Address', value: selectedOrder.customer_address },
                          { label: 'City', value: selectedOrder.customer_city },
                          { label: 'State', value: selectedOrder.customer_state },
                          { label: 'Zip', value: selectedOrder.customer_zip },
                        ].map((detail, idx) => (
                          <div key={idx} className="text-xs">
                            <p className="text-cool-gray font-medium mb-0.5 leading-tight">{detail.label}</p>
                            <p className="text-midnight-ink font-semibold text-xs leading-tight">{detail.value || '—'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Product details - grouped by Master SKU */}
                  {selectedOrder.items && selectedOrder.items.length > 0 && (
                    <div className={`mt-1 rounded-xl border border-soft-border bg-white shadow-sm overflow-hidden flex flex-col min-h-0 ${showProductDetails ? 'flex-1' : ''}`}>
                      <div className="px-3 py-2.5 border-b border-soft-border flex items-center justify-between gap-2 bg-cloud-gray">
                        <span className="text-xs font-bold text-midnight-ink uppercase tracking-wide">
                          Product Details
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowProductDetails((prev) => !prev)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-sky-info hover:text-trust-blue transition-colors"
                        >
                          {showProductDetails ? 'Show less' : 'Show more'}
                          <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-300 ${showProductDetails ? 'rotate-90' : 'rotate-0'}`} />
                        </button>
                      </div>

                      <div className={`transition-all duration-300 ease-out overflow-hidden ${showProductDetails ? 'max-h-[42vh] opacity-100' : 'max-h-0 opacity-0'}`}>
                        {productsLoading ? (
                          <div className="p-3 text-xs text-cool-gray">Loading product details…</div>
                        ) : (
                          <div className="overflow-x-auto max-h-[40vh] overflow-y-auto">
                            <table className="min-w-full text-xs border-collapse">
                              <thead className="bg-cloud-gray border-b border-soft-border sticky top-0">
                                <tr>
                                  <th className="text-left px-3 py-2 font-bold text-midnight-ink whitespace-nowrap border-r border-soft-border">Master SKU</th>
                                  <th className="text-left px-3 py-2 font-bold text-midnight-ink whitespace-nowrap border-r border-soft-border">Product Name</th>
                                  <th className="text-left px-3 py-2 font-bold text-midnight-ink whitespace-nowrap">SKU (Variation)</th>
                                  <th className="text-left px-3 py-2 font-bold text-midnight-ink whitespace-nowrap">Quantity</th>
                                </tr>
                              </thead>
                              <tbody>
                                {groupedItems.map((group) =>
                                  group.items.map((item, idx) => (
                                    <tr
                                      key={`${group.masterSku}-${idx}`}
                                      className={`hover:bg-cloud-gray transition-colors ${idx < group.items.length - 1 ? 'border-b border-dashed border-soft-border' : 'border-b border-soft-border'}`}
                                    >
                                      {idx === 0 && (
                                        <td
                                          rowSpan={group.items.length}
                                          className="px-3 py-2 font-semibold text-midnight-ink align-middle border-r border-soft-border bg-cloud-gray/40 whitespace-nowrap"
                                        >
                                          {group.masterSku}
                                        </td>
                                      )}
                                      {idx === 0 && (
                                        <td
                                          rowSpan={group.items.length}
                                          className="px-3 py-2 text-cool-gray align-middle border-r border-soft-border whitespace-nowrap"
                                        >
                                          {group.productName || '—'}
                                        </td>
                                      )}
                                      <td className="px-3 py-2 text-midnight-ink whitespace-nowrap">{item.variationSku}</td>
                                      <td className="px-3 py-2 text-midnight-ink font-semibold">{item.quantity}</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedOrder.notes && (
                    <div className="bg-white rounded-lg p-3 border border-soft-border shadow-sm shrink-0">
                      <h3 className="font-bold text-midnight-ink text-xs mb-1 uppercase tracking-wide">Notes</h3>
                      <p className="text-xs text-cool-gray leading-tight line-clamp-2">{selectedOrder.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center flex-1 text-center">
                <div className="text-cool-gray">
                  <p className="text-xs">Select an order from the list to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export Picklist Dialog */}
      {showExportPicklistDialog && (() => {
        const nums = [
          ...new Set(
            orders
              .filter((o) => o.order_source === 'picklist' && o.picklist_number != null)
              .map((o) => o.picklist_number)
          ),
        ].sort((a, b) => b - a);

        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full border border-soft-border">
              <div className="p-6">
                <div className="flex justify-center mb-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-trust-blue/10 border border-trust-blue/30">
                    <FileDown className="w-6 h-6 text-trust-blue" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-center text-midnight-ink mb-1">Export Picklist</h3>
                <p className="text-center text-xs text-cool-gray mb-4">
                  Choose a picklist to export. The export includes Master SKU, Quantity Needed, and product images.
                </p>

                {nums.length === 0 ? (
                  <div className="text-center py-6 text-xs text-cool-gray">No picklists found.</div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto mb-4 pr-1">
                    {nums.map((num) => {
                      const picklistOrder = orders.find(
                        (o) => o.order_source === 'picklist' && o.picklist_number === num
                      );
                      const itemCount = (() => {
                        const m = new Map();
                        orders
                          .filter((o) => o.order_source === 'picklist' && o.picklist_number === num)
                          .forEach((o) => (o.items || []).forEach((i) => {
                            const v = String(i.sku || '').toUpperCase();
                            const s = v.includes('/') ? v.substring(0, v.lastIndexOf('/')) : v;
                            if (s) m.set(s, (m.get(s) || 0) + (Number(i.quantity) || 0));
                          }));
                        return { skus: m.size, pieces: Array.from(m.values()).reduce((a, b) => a + b, 0) };
                      })();
                      const isSelected = exportPicklistNum === num;
                      return (
                        <label
                          key={num}
                          className={`flex items-start gap-3 w-full px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-trust-blue bg-trust-blue/5'
                              : 'border-soft-border bg-cloud-gray hover:border-trust-blue/50 hover:bg-trust-blue/5'
                          }`}
                        >
                          <input
                            type="radio"
                            name="export-picklist"
                            checked={isSelected}
                            onChange={() => setExportPicklistNum(num)}
                            className="mt-0.5 w-4 h-4 accent-trust-blue cursor-pointer shrink-0"
                          />
                          <div className="min-w-0">
                            <p className={`text-xs font-bold ${isSelected ? 'text-trust-blue' : 'text-midnight-ink'}`}>
                              PICKLIST-{num}
                            </p>
                            <p className="text-[11px] text-cool-gray mt-0.5">
                              {itemCount.skus} SKU{itemCount.skus !== 1 ? 's' : ''} &nbsp;·&nbsp; {itemCount.pieces} pieces
                              {picklistOrder ? ` · ${new Date(picklistOrder.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowExportPicklistDialog(false)}
                    className="flex-1 py-2 rounded-lg border border-soft-border hover:bg-cloud-gray text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExportPicklist}
                    disabled={exportPicklistNum == null || isExporting || nums.length === 0}
                    className="flex-1 py-2 rounded-lg bg-trust-blue hover:bg-deep-blue text-white font-medium transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    <FileDown className="w-4 h-4" />
                    {isExporting ? 'Exporting…' : 'Export'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete Picklist Dialog */}
      {showDeletePicklistDialog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full border border-soft-border">
            <div className="p-6">
              <div className="flex justify-center mb-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-danger-soft border border-danger/30">
                  <Trash2 className="w-6 h-6 text-danger-dark" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-center text-midnight-ink mb-1">Delete Picklist</h3>
              <p className="text-center text-xs text-cool-gray mb-4">
                Select one or more picklists to permanently delete them and all associated orders.
              </p>

              {deletePicklistFetching ? (
                <div className="text-center py-6 text-xs text-cool-gray">Loading picklists…</div>
              ) : availablePicklists.length === 0 ? (
                <div className="text-center py-6 text-xs text-cool-gray">No picklists found.</div>
              ) : (
                <>
                  {/* Select all toggle */}
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <input
                      type="checkbox"
                      id="select-all-picklists"
                      checked={selectedDeletePicklistIds.size === availablePicklists.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDeletePicklistIds(
                            new Set(availablePicklists.map((pl) => String(pl.id || pl.group_id)))
                          );
                        } else {
                          setSelectedDeletePicklistIds(new Set());
                        }
                      }}
                      className="w-4 h-4 accent-danger cursor-pointer"
                    />
                    <label htmlFor="select-all-picklists" className="text-xs text-cool-gray cursor-pointer select-none">
                      Select all ({availablePicklists.length})
                    </label>
                    {selectedDeletePicklistIds.size > 0 && (
                      <span className="ml-auto text-[11px] font-semibold text-danger-dark">
                        {selectedDeletePicklistIds.size} selected
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto mb-4 pr-1">
                    {availablePicklists.map((pl) => {
                      const plId = String(pl.id || pl.group_id);
                      const isSelected = selectedDeletePicklistIds.has(plId);
                      return (
                        <label
                          key={plId}
                          className={`flex items-start gap-3 w-full px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-danger bg-danger-soft'
                              : 'border-soft-border bg-cloud-gray hover:border-danger/50 hover:bg-danger-soft/40'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedDeletePicklistIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(plId)) next.delete(plId);
                                else next.add(plId);
                                return next;
                              });
                            }}
                            className="mt-0.5 w-4 h-4 accent-danger cursor-pointer shrink-0"
                          />
                          <div className="min-w-0">
                            <p className={`text-xs font-bold ${isSelected ? 'text-danger-dark' : 'text-midnight-ink'}`}>
                              #{pl.number} — {pl.name}
                            </p>
                            <p className="text-[11px] text-cool-gray mt-0.5">
                              {pl.dateFormatted || pl.date || ''}{pl.uploadedBy ? ` · ${pl.uploadedBy}` : ''}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}

              {deletePicklistError && (
                <div className="mb-3 p-2 bg-danger-soft border border-danger rounded-lg">
                  <p className="text-xs text-danger-dark text-center font-medium whitespace-pre-line">{deletePicklistError}</p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setShowDeletePicklistDialog(false);
                    setSelectedDeletePicklistIds(new Set());
                    setDeletePicklistError('');
                  }}
                  disabled={deletePicklistLoading}
                  className="flex-1 py-2 rounded-lg border border-soft-border hover:bg-cloud-gray text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeletePicklist}
                  disabled={deletePicklistLoading || selectedDeletePicklistIds.size === 0 || deletePicklistFetching}
                  className="flex-1 py-2 rounded-lg bg-danger hover:bg-danger-dark text-white font-medium transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletePicklistLoading
                    ? 'Deleting…'
                    : selectedDeletePicklistIds.size > 1
                      ? `Delete ${selectedDeletePicklistIds.size} Picklists`
                      : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Dialog */}
      {showPasswordDialog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full transform transition-all border border-soft-border">
            <div className="p-6">
              <div className="flex justify-center mb-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-trust-blue">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1C6.48 1 2 5.48 2 11v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V11c0-5.52-4.48-10-10-10zm-2 15h4v2h-4v-2zm6-9H8V6h8v1z"/>
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-bold text-center text-midnight-ink mb-1">Enter Passcode</h3>
              <p className="text-center text-xs text-cool-gray mb-4">Protected customer information</p>
              
              <input
                type="password"
                placeholder="••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                className="w-full px-3 py-2 border border-soft-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-trust-blue mb-3 text-center text-lg tracking-[0.3em] font-semibold transition-all"
                autoFocus
              />
              
              {passwordError && (
                <div className="mb-3 p-2 bg-danger-soft border border-danger rounded-lg">
                  <p className="text-xs text-danger-dark text-center font-medium">{passwordError}</p>
                </div>
              )}
              
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setShowPasswordDialog(false);
                    setPasswordInput('');
                    setPasswordError('');
                  }}
                  className="flex-1 rounded-lg border border-soft-border hover:bg-cloud-gray text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerifyPassword}
                  className="flex-1 rounded-lg bg-trust-blue hover:bg-deep-blue text-white font-medium transition-all text-sm"
                >
                  Unlock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function JobSheetPage() {
  return <OrderSheetView />;
}

