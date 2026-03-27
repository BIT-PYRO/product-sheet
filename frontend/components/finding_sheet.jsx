'use client';

import React, { Suspense } from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Trash2, Download, Upload, Search, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import DateTimeStamp from '@/components/date-time-stamp';

const STONE_DEFAULT_ROWS = () => [
  { id: 1, name: '', cut: '', color: '', size: '', material: '', weight: '', quantity: '' },
  { id: 2, name: '', cut: '', color: '', size: '', material: '', weight: '', quantity: '' },
  { id: 3, name: '', cut: '', color: '', size: '', material: '', weight: '', quantity: '' },
];

const PLATING_DEFAULT_ROWS = () => [
  { id: 1, type: '', color: '' },
  { id: 2, type: '', color: '' },
  { id: 3, type: '', color: '' },
];

const EMPTY_FINDING = () => ({
  findingCode: '',
  image1: '',
  image2: '',
  image3: '',
  dieNumber: '',
  size: '',
  quantity: '',
  weight: '',
  material: '',
  category: '',
  notes: '',
  mechanism: '',
  stoneRows: STONE_DEFAULT_ROWS(),
  platingRows: PLATING_DEFAULT_ROWS(),
});

function FindingSheetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const findingCodeParam = (searchParams.get('finding_code') || '').trim();

  const imageRef1 = useRef(null);
  const imageRef2 = useRef(null);
  const imageRef3 = useRef(null);
  const bulkUploadRef = useRef(null);
  const notesMediaRef = useRef(null);

  const [searchInput, setSearchInput] = useState(findingCodeParam);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [findingRecordId, setFindingRecordId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [backendMode, setBackendMode] = useState('');

  const [finding, setFinding] = useState(EMPTY_FINDING());
  const [notesMedia, setNotesMedia] = useState([]);

  useEffect(() => {
    fetch('/api/backend-info', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (d?.backendMode) setBackendMode(String(d.backendMode)); })
      .catch(() => {});
  }, []);

  const populateFromRecord = (record) => {
    setFindingRecordId(record.id);
    setFinding({
      findingCode: record.finding_code || record.code || '',
      image1: record.image || record.photo || '',
      image2: record.image2 || record.reference_photo || '',
      image3: record.image3 || '',
      dieNumber: record.die_number || '',
      size: record.size || '',
      quantity: String(record.quantity || ''),
      weight: String(record.weight || ''),
      material: record.material || '',
      category: record.category || '',
      notes: record.notes || '',
      mechanism: record.mechanism || '',
      stoneRows:
        Array.isArray(record.stone_entries) && record.stone_entries.length > 0
          ? record.stone_entries.map((r, i) => ({ id: i + 1, name: r.name || '', cut: r.cut || '', color: r.color || '', size: r.size || '', material: r.material || '', weight: r.weight || '', quantity: r.quantity || '' }))
          : STONE_DEFAULT_ROWS(),
      platingRows:
        Array.isArray(record.plating_entries) && record.plating_entries.length > 0
          ? record.plating_entries.map((r, i) => ({ id: i + 1, type: r.type || '', color: r.color || '' }))
          : PLATING_DEFAULT_ROWS(),
    });
  };

  const loadFindingByCode = useCallback(async (query) => {
    if (!query) return;
    setIsSearching(true);
    setSearchError('');
    try {
      const res = await fetch(`/api/findings?search=${encodeURIComponent(query)}`, { cache: 'no-store' });
      const json = await res.json();
      const rows = Array.isArray(json.data) ? json.data : Array.isArray(json.data?.results) ? json.data.results : [];
      const lq = query.toLowerCase();
      const record =
        rows.find((d) => String(d.finding_code || '').trim().toLowerCase() === lq) ||
        rows[0];
      if (record) {
        populateFromRecord(record);
      } else {
        setFindingRecordId(null);
        setFinding(EMPTY_FINDING());
        setSearchError(`No finding found for "${query}". Fill in the details and save to create a new one.`);
      }
    } catch {
      setSearchError('Failed to load finding data.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (findingCodeParam) {
      setSearchInput(findingCodeParam);
      loadFindingByCode(findingCodeParam);
    }
  }, [findingCodeParam, loadFindingByCode]);

  const handleSearch = (e) => {
    e.preventDefault();
    const s = searchInput.trim();
    if (!s) return;
    router.replace(`/frontend/finding-sheet?finding_code=${encodeURIComponent(s)}`);
    loadFindingByCode(s);
  };

  const handleClear = () => {
    setSearchInput('');
    setFindingRecordId(null);
    setFinding(EMPTY_FINDING());
    setSearchError('');
    router.replace('/frontend/finding-sheet');
  };

  const handleImageUpload = (slot) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setFinding((prev) => ({ ...prev, [slot]: ev.target?.result || '' }));
    reader.readAsDataURL(file);
  };

  const handleImageDownload = (slot, label) => {
    const data = finding[slot];
    if (!data) return;
    const a = document.createElement('a');
    a.href = data;
    a.download = `${label.replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
  };

  const addStoneRow = () => {
    const newId = Math.max(...finding.stoneRows.map((r) => r.id), 0) + 1;
    setFinding((prev) => ({ ...prev, stoneRows: [...prev.stoneRows, { id: newId, name: '', cut: '', color: '', size: '', material: '', weight: '', quantity: '' }] }));
  };
  const updateStoneRow = (id, field, value) => {
    setFinding((prev) => ({ ...prev, stoneRows: prev.stoneRows.map((r) => (r.id === id ? { ...r, [field]: value } : r)) }));
  };
  const deleteStoneRow = (id) => {
    setFinding((prev) => ({ ...prev, stoneRows: prev.stoneRows.filter((r) => r.id !== id) }));
  };

  const addPlatingRow = () => {
    const newId = Math.max(...finding.platingRows.map((r) => r.id), 0) + 1;
    setFinding((prev) => ({ ...prev, platingRows: [...prev.platingRows, { id: newId, type: '', color: '' }] }));
  };
  const updatePlatingRow = (id, field, value) => {
    setFinding((prev) => ({ ...prev, platingRows: prev.platingRows.map((r) => (r.id === id ? { ...r, [field]: value } : r)) }));
  };
  const deletePlatingRow = (id) => {
    setFinding((prev) => ({ ...prev, platingRows: prev.platingRows.filter((r) => r.id !== id) }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const payload = {
        finding_code: finding.findingCode,
        image: finding.image1,
        image2: finding.image2,
        image3: finding.image3,
        die_number: finding.dieNumber,
        size: finding.size,
        quantity: finding.quantity,
        weight: finding.weight,
        material: finding.material,
        category: finding.category,
        notes: finding.notes,
        mechanism: finding.mechanism,
        stone_entries: finding.stoneRows.map(({ name, cut, color, size, material, weight, quantity }) => ({ name, cut, color, size, material, weight, quantity })),
        plating_entries: finding.platingRows.map(({ type, color }) => ({ type, color })),
      };
      const isUpdate = !!findingRecordId;
      const url = isUpdate ? `/api/findings/${findingRecordId}` : '/api/findings';
      const method = isUpdate ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || 'Failed to save');
      const savedId = result.data?.id || findingRecordId;
      if (savedId) setFindingRecordId(savedId);
      setSaveStatus({ success: true, message: isUpdate ? 'Finding updated' : 'Finding record created' });
    } catch (err) {
      setSaveStatus({ success: false, message: err.message });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 4000);
    }
  };

  const handleDelete = async () => {
    if (!findingRecordId) {
      setSaveStatus({ success: false, message: 'No record to delete' });
      setTimeout(() => setSaveStatus(null), 4000);
      return;
    }
    if (!window.confirm('Delete this finding record?')) return;
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch(`/api/findings/${findingRecordId}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const result = await res.json().catch(() => ({}));
        throw new Error(result.message || 'Failed to delete');
      }
      setFindingRecordId(null);
      setFinding(EMPTY_FINDING());
      setSaveStatus({ success: true, message: 'Finding record deleted' });
    } catch (err) {
      setSaveStatus({ success: false, message: err.message });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 4000);
    }
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sheetType', 'findings');
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch('/api/bulk-upload', { method: 'POST', body: formData });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.success) throw new Error(result?.message || 'Bulk upload failed');
      setSaveStatus({ success: true, message: result.message });
    } catch (err) {
      setSaveStatus({ success: false, message: err.message });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 6000);
    }
  };

  const imageSlots = [
    { slot: 'image1', ref: imageRef1, label: 'Primary Photo' },
    { slot: 'image2', ref: imageRef2, label: 'Reference Photo' },
    { slot: 'image3', ref: imageRef3, label: 'Other Photo' },
  ];

  const isLoaded = !!findingRecordId;

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-30 bg-white border-b border-soft-border shadow-sm px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MasterNavigationDrawer inHeader />
          <span className="text-sm font-bold text-midnight-ink tracking-wide">MASTER FINDING SHEET</span>
          {backendMode ? (
            <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-trust-blue/10 text-deep-blue border border-trust-blue/30">
              Backend: {backendMode.toUpperCase()}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <DateTimeStamp />
          <Link href="/finding-entry" className="px-3 py-1.5 text-xs bg-trust-blue text-white font-semibold rounded-full hover:bg-deep-blue flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            Finding Entry
          </Link>
        </div>
      </div>

      <div className="px-2 py-2">
        <div className="bg-cloud-gray p-3 rounded-xl mb-4 border border-soft-border shadow-sm">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <label className="text-xs font-semibold text-midnight-ink whitespace-nowrap">Search by Finding Code</label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter finding code..."
              className="flex-1 border border-soft-border rounded px-3 py-1.5 text-sm outline-none focus:border-trust-blue bg-white"
            />
            <button type="submit" disabled={isSearching} className="px-4 py-1.5 text-xs bg-trust-blue text-white font-semibold rounded-full hover:bg-deep-blue disabled:opacity-50 flex items-center gap-1">
              <Search className="h-3.5 w-3.5" />
              {isSearching ? 'Loading...' : 'Load'}
            </button>
            {(isLoaded || searchError) && (
              <button type="button" onClick={handleClear} className="px-3 py-1.5 text-xs bg-soft-border text-midnight-ink font-semibold rounded-full hover:bg-cool-gray/30 flex items-center gap-1">
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </form>
          {searchError && (
            <p className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">{searchError}</p>
          )}
          {isLoaded && (
            <p className="mt-2 text-xs text-success-dark bg-success/10 border border-success/20 rounded px-2 py-1">
              Loaded record{finding.findingCode ? ` — Code: ${finding.findingCode}` : ''}
            </p>
          )}
        </div>

        <div className="bg-cloud-gray p-3 rounded-xl border border-soft-border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-trust-blue">FINDING</h2>
              {isLoaded && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success-dark border border-success/20 font-semibold">
                  {finding.findingCode}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {saveStatus && (
                <span className={`text-xs px-2 py-0.5 rounded ${saveStatus.success ? 'bg-success/10 text-success-dark' : 'bg-danger/10 text-danger-dark'}`}>
                  {saveStatus.message}
                </span>
              )}
              <button type="button" onClick={handleSave} disabled={isSaving} className="px-2.5 py-1 text-xs bg-success text-white font-semibold rounded-full hover:bg-success/90 disabled:opacity-50">
                {isSaving ? 'Saving...' : 'SAVE'}
              </button>
              <button type="button" onClick={handleDelete} disabled={isSaving || !findingRecordId} className="px-2.5 py-1 text-xs bg-danger text-white font-semibold rounded-full hover:bg-danger/90 disabled:opacity-50">
                DELETE
              </button>
              <button type="button" onClick={() => bulkUploadRef.current?.click()} disabled={isSaving} className="px-2.5 py-1 text-xs bg-trust-blue text-white font-semibold rounded-full hover:bg-deep-blue disabled:opacity-50 flex items-center gap-1">
                <Upload className="h-3 w-3" />
                UPLOAD
              </button>
              <input ref={bulkUploadRef} type="file" accept=".csv,.xlsx,.xls,.json" onChange={handleBulkUpload} className="hidden" />
            </div>
          </div>

          <div className="mb-3">
            <label className="text-xs font-semibold text-midnight-ink mb-1 block">
              Finding Code <span className="font-normal text-cool-gray">(primary identifier)</span>
            </label>
            <input
              type="text"
              value={finding.findingCode}
              onChange={(e) => setFinding((prev) => ({ ...prev, findingCode: e.target.value }))}
              placeholder="e.g. FC-001"
              className="w-full border border-soft-border rounded px-3 py-1.5 text-sm outline-none focus:border-trust-blue bg-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            {imageSlots.map(({ slot, ref, label }) => (
              <div key={slot} className="flex flex-col gap-1">
                <input ref={ref} type="file" accept="image/*" onChange={handleImageUpload(slot)} className="hidden" />
                <div className="text-center text-xs font-semibold text-trust-blue py-0.5 bg-trust-blue/10 rounded-t-lg border border-soft-border border-b-0">{label}</div>
                <div
                  className="bg-white border border-soft-border rounded-b-xl overflow-hidden flex items-center justify-center cursor-pointer hover:bg-cloud-gray"
                  style={{ minHeight: '12rem' }}
                  onClick={() => ref.current?.click()}
                >
                  {finding[slot] ? (
                    <img src={finding[slot]} alt={label} className="w-full h-full object-cover rounded-b-xl" />
                  ) : (
                    <span className="text-xs text-cool-gray text-center px-2">Click to upload image</span>
                  )}
                </div>
                <button type="button" onClick={() => handleImageDownload(slot, label)} disabled={!finding[slot]} className="w-full px-1 py-0.5 text-xs bg-midnight-ink text-white rounded font-semibold hover:bg-midnight-ink/80 disabled:opacity-40 flex items-center justify-center gap-1">
                  <Download className="h-3 w-3" />
                  Download
                </button>
              </div>
            ))}
          </div>

          <div className="mb-3 grid grid-cols-2 gap-3">
            <div className="bg-white border border-soft-border rounded-xl overflow-hidden">
              <div className="text-xs font-bold text-midnight-ink px-3 py-2 bg-[#dce8f5] border-b border-soft-border">STONE INFO</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-cloud-gray">
                      {['NAME','CUT','COLOR','SIZE','MATERIAL','WEIGHT','QUANTITY'].map((h) => (
                        <th key={h} className="border border-soft-border px-2 py-1.5 font-semibold text-midnight-ink text-left whitespace-nowrap">{h}</th>
                      ))}
                      <th className="border border-soft-border px-1 py-1.5 w-6"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {finding.stoneRows.map((row) => (
                      <tr key={row.id} className="hover:bg-cloud-gray/40">
                        {['name','cut','color','size','material','weight','quantity'].map((f) => (
                          <td key={f} className="border border-soft-border p-0">
                            <input type="text" value={row[f]} onChange={(e) => updateStoneRow(row.id, f, e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 min-w-[70px] text-xs" />
                          </td>
                        ))}
                        <td className="border border-soft-border p-0 text-center">
                          <button type="button" onClick={() => deleteStoneRow(row.id)} className="px-1 py-1 text-danger hover:text-danger-dark"><Trash2 className="h-3 w-3" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={addStoneRow} className="w-full text-left px-3 py-1.5 text-xs text-trust-blue font-semibold hover:bg-cloud-gray border-t border-soft-border">+ ADD ROW</button>
            </div>

            <div className="bg-white border border-soft-border rounded-xl overflow-hidden">
              <div className="text-xs font-bold text-midnight-ink px-3 py-2 bg-[#dce8f5] border-b border-soft-border">PLATING INFO</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-cloud-gray">
                      <th className="border border-soft-border px-2 py-1.5 font-semibold text-midnight-ink text-left w-1/2">PLATING TYPE</th>
                      <th className="border border-soft-border px-2 py-1.5 font-semibold text-midnight-ink text-left w-1/2">PLATING COLOR</th>
                      <th className="border border-soft-border px-1 py-1.5 w-6"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {finding.platingRows.map((row) => (
                      <tr key={row.id} className="hover:bg-cloud-gray/40">
                        <td className="border border-soft-border p-0">
                          <input type="text" value={row.type} onChange={(e) => updatePlatingRow(row.id, 'type', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 text-xs" />
                        </td>
                        <td className="border border-soft-border p-0">
                          <input type="text" value={row.color} onChange={(e) => updatePlatingRow(row.id, 'color', e.target.value)} className="w-full bg-transparent outline-none px-2 py-1 text-xs" />
                        </td>
                        <td className="border border-soft-border p-0 text-center">
                          <button type="button" onClick={() => deletePlatingRow(row.id)} className="px-1 py-1 text-danger hover:text-danger-dark"><Trash2 className="h-3 w-3" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={addPlatingRow} className="w-full text-left px-3 py-1.5 text-xs text-trust-blue font-semibold hover:bg-cloud-gray border-t border-soft-border">+ ADD ROW</button>
            </div>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-3">
            <div className="bg-white border border-soft-border rounded-xl p-3">
              <div className="text-xs font-semibold text-midnight-ink mb-2">MATERIAL</div>
              <div className="flex flex-wrap gap-2">
                {['GOLD', 'SILVER', 'BRASS', 'ALLOY', 'OTHER'].map((opt) => (
                  <button key={opt} type="button"
                    onClick={() => setFinding((prev) => ({ ...prev, material: prev.material === opt ? '' : opt }))}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${finding.material === opt ? 'bg-midnight-ink text-white border-midnight-ink shadow-sm' : 'bg-white text-midnight-ink border-soft-border hover:bg-cloud-gray'}`}
                  >{opt}</button>
                ))}
              </div>
            </div>
            <div className="bg-white border border-soft-border rounded-xl p-3">
              <div className="text-xs font-semibold text-midnight-ink mb-2">CATEGORY</div>
              <div className="flex flex-wrap gap-2">
                {['CLASP', 'RING FINDING', 'EARRING', 'CONNECTOR', 'PIN', 'OTHER'].map((opt) => (
                  <button key={opt} type="button"
                    onClick={() => setFinding((prev) => ({ ...prev, category: prev.category === opt ? '' : opt }))}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${finding.category === opt ? 'bg-trust-blue text-white border-trust-blue shadow-sm' : 'bg-white text-midnight-ink border-soft-border hover:bg-cloud-gray'}`}
                  >{opt}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-3">
              <div className="bg-white border border-soft-border rounded-xl p-3">
                <label className="text-xs font-semibold text-midnight-ink mb-1 block">Size</label>
                <input type="text" value={finding.size} onChange={(e) => setFinding((prev) => ({ ...prev, size: e.target.value }))} placeholder="e.g. 10mm" className="w-full border border-soft-border rounded px-2 py-1.5 text-sm outline-none focus:border-trust-blue bg-transparent" />
              </div>
              <div className="bg-white border border-soft-border rounded-xl p-3">
                <label className="text-xs font-semibold text-midnight-ink mb-1 block">Quantity</label>
                <input type="text" value={finding.quantity} onChange={(e) => setFinding((prev) => ({ ...prev, quantity: e.target.value }))} placeholder="e.g. 100" className="w-full border border-soft-border rounded px-2 py-1.5 text-sm outline-none focus:border-trust-blue bg-transparent" />
              </div>
              <div className="flex-1 bg-white border border-soft-border rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-midnight-ink">Notes</label>
                  <button type="button" onClick={() => notesMediaRef.current?.click()} className="flex items-center gap-1 text-[11px] text-trust-blue hover:text-deep-blue font-semibold">
                    <Upload className="h-3 w-3" />
                    Attach Photo / Video
                  </button>
                  <input ref={notesMediaRef} type="file" accept="image/*,video/*" multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      files.filter((f) => f.size <= 5 * 1024 * 1024).forEach((file) => {
                        const reader = new FileReader();
                        reader.onload = (ev) => setNotesMedia((prev) => [...prev, { name: file.name, type: file.type, dataUrl: ev.target.result }]);
                        reader.readAsDataURL(file);
                      });
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </div>
                <textarea value={finding.notes} onChange={(e) => setFinding((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Add notes about this finding..." rows={4} className="w-full border border-soft-border rounded px-2 py-1.5 text-sm outline-none focus:border-trust-blue bg-transparent resize-none" />
                {notesMedia.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {notesMedia.map((m, i) => (
                      <div key={i} className="relative group">
                        {m.type.startsWith('image/') ? (
                          <img src={m.dataUrl} alt={m.name} className="h-16 w-16 object-cover rounded border border-soft-border" />
                        ) : (
                          <video src={m.dataUrl} className="h-16 w-16 object-cover rounded border border-soft-border" />
                        )}
                        <button type="button" onClick={() => setNotesMedia((prev) => prev.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 bg-danger text-white rounded-full h-4 w-4 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">x</button>
                        <div className="text-[9px] text-cool-gray truncate max-w-[64px]">{m.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="bg-white border border-soft-border rounded-xl p-3">
                <div className="text-xs font-semibold text-midnight-ink mb-2">Die Number &amp; Weight</div>
                <div className="flex flex-col gap-2">
                  <div>
                    <label className="text-[11px] text-cool-gray block mb-0.5">Die Number</label>
                    <input type="text" value={finding.dieNumber} onChange={(e) => setFinding((prev) => ({ ...prev, dieNumber: e.target.value }))} placeholder="Die Number" className="w-full border border-soft-border rounded px-2 py-1 text-sm outline-none focus:border-trust-blue bg-transparent" />
                  </div>
                  <div>
                    <label className="text-[11px] text-cool-gray block mb-0.5">Weight (g)</label>
                    <input type="text" value={finding.weight} onChange={(e) => setFinding((prev) => ({ ...prev, weight: e.target.value }))} placeholder="Weight in grams" className="w-full border border-soft-border rounded px-2 py-1 text-sm outline-none focus:border-trust-blue bg-transparent" />
                  </div>
                </div>
              </div>
              <div className="flex-1 bg-white border border-soft-border rounded-xl p-3 flex flex-col">
                <label className="text-xs font-semibold text-midnight-ink mb-1 block">Mechanism / Description</label>
                <textarea value={finding.mechanism} onChange={(e) => setFinding((prev) => ({ ...prev, mechanism: e.target.value }))} placeholder="Describe the mechanism or usage of this finding" rows={5} className="flex-1 w-full border border-soft-border rounded px-2 py-1.5 text-sm outline-none focus:border-trust-blue bg-transparent resize-none" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FindingSheet() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-cool-gray text-sm">Loading...</div>}>
      <FindingSheetContent />
    </Suspense>
  );
}