'use client';

import { useEffect, useRef, useState } from 'react';

const DEFAULT_DEPARTMENTS = [
  'Marketing',
  'Customer Relation Management',
  'Operations',
  'Design',
  'Logistics',
  'Purchase',
  'Sales / Business Development',
  'Finance',
  'Information Technology',
  'Human Resource',
  'Production',
  'Services',
  'House Keeping',
  'Other',
];

function fmt(amount) {
  const n = Number(amount);
  if (isNaN(n)) return '—';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AccountingBankImport() {
  // ── Step: 'upload' | 'preview' | 'done'
  const [step, setStep] = useState('upload');

  // ── Upload step state
  const [ledgers, setLedgers] = useState([]);
  const [bankAccountId, setBankAccountId] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [fileType, setFileType] = useState('csv');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const FILE_TYPES = [
    { key: 'csv',  label: 'CSV',   accept: '.csv,text/csv',                                   hint: 'Columns: Date, Description, Debit, Credit (or Amount)' },
    { key: 'txt',  label: 'TXT',   accept: '.txt,text/plain',                                  hint: 'Tab, comma, or pipe-separated: Date, Description, Debit, Credit' },
    { key: 'xlsx', label: 'Excel', accept: '.xls,.xlsx',                                       hint: 'Excel sheet with columns: Date, Description, Debit, Credit' },
    { key: 'pdf',  label: 'PDF',   accept: '.pdf,application/pdf',                            hint: 'PDF bank statements with a transaction table (Date, Description, Debit/Credit)' },
  ];

  const activeFileType = FILE_TYPES.find((t) => t.key === fileType) || FILE_TYPES[0];

  // ── Preview step state
  const [rows, setRows] = useState([]);           // preview rows from API
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  // ── Done step state
  const [result, setResult] = useState(null);

  // Load ledgers on mount
  useEffect(() => {
    fetch('/frontend/api/accounting/ledgers/')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.data)) {
          setLedgers(data.data);
        }
      })
      .catch(() => {});
  }, []);

  // ── Upload & get preview ───────────────────────────────────────
  async function handleUpload(e) {
    e.preventDefault();
    setUploadError('');

    if (!csvFile) { setUploadError('Please choose a file.'); return; }
    if (!bankAccountId) { setUploadError('Please select a bank account ledger.'); return; }

    const formData = new FormData();
    formData.append('file', csvFile);
    formData.append('bank_account_id', bankAccountId);
    formData.append('file_type', fileType);

    setUploading(true);
    try {
      const res = await fetch('/frontend/api/accounting/bank-import/preview/', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!data?.success) {
        setUploadError(data?.message || 'Preview failed.');
        return;
      }
      // Merge API-returned ledgers with what we already have
      const mergedLedgers = data.data?.ledgers?.length ? data.data.ledgers : ledgers;
      setLedgers(mergedLedgers);

      // Initialise editable rows — skip duplicates by default
      const preview = (data.data?.rows || []).map((row, idx) => ({
        ...row,
        _idx: idx,
        ledger_id: row.suggested_ledger_id ? String(row.suggested_ledger_id) : '',
        department: '',
        _remove: row.is_duplicate,   // pre-remove duplicates
      }));
      setRows(preview);
      setStep('preview');
    } catch {
      setUploadError('Network error. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  // ── Row mutations ─────────────────────────────────────────────
  function updateRow(idx, field, value) {
    setRows((prev) => prev.map((r) => r._idx === idx ? { ...r, [field]: value } : r));
  }

  function removeRow(idx) {
    setRows((prev) => prev.map((r) => r._idx === idx ? { ...r, _remove: true } : r));
  }

  function restoreRow(idx) {
    setRows((prev) => prev.map((r) => r._idx === idx ? { ...r, _remove: false } : r));
  }

  // ── Confirm import ────────────────────────────────────────────
  async function handleConfirm() {
    setConfirmError('');

    const toImport = rows.filter((r) => !r._remove);

    if (toImport.length === 0) {
      setConfirmError('No rows selected for import.');
      return;
    }

    // Validate
    const missing = toImport.filter((r) => !r.ledger_id);
    if (missing.length > 0) {
      setConfirmError(`${missing.length} row(s) have no ledger assigned. Please select a ledger for each row.`);
      return;
    }

    const payload = {
      bank_account_id: Number(bankAccountId),
      transactions: toImport.map((r) => ({
        date: r.date,
        description: r.description,
        amount: r.amount,
        ledger_id: Number(r.ledger_id),
        department: r.department || '',
        import_hash: r.import_hash || '',
      })),
    };

    setConfirming(true);
    try {
      const res = await fetch('/frontend/api/accounting/bank-import/confirm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data?.success) {
        setConfirmError(data?.message || 'Import failed.');
        return;
      }
      setResult(data.data);
      setStep('done');
    } catch {
      setConfirmError('Network error. Please try again.');
    } finally {
      setConfirming(false);
    }
  }

  function handleReset() {
    setStep('upload');
    setCsvFile(null);
    setFileType('csv');
    setBankAccountId('');
    setRows([]);
    setResult(null);
    setUploadError('');
    setConfirmError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const activeRows = rows.filter((r) => !r._remove);
  const removedRows = rows.filter((r) => r._remove);

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Step: Upload -------------------------------------------------- */}
      {step === 'upload' && (
        <div className="bg-white border border-soft-border rounded-xl p-6 max-w-lg">
          <h2 className="text-base font-semibold text-midnight-ink mb-4">Import Bank Statement</h2>
          <form onSubmit={handleUpload} className="space-y-4">

            {/* Bank account selector */}
            <div>
              <label className="block text-sm font-medium text-midnight-ink mb-1">
                Bank Account Ledger <span className="text-red-500">*</span>
              </label>
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className="w-full border border-soft-border rounded-lg px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue"
              >
                <option value="">Select bank account…</option>
                {ledgers.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            {/* File type selector */}
            <div>
              <label className="block text-sm font-medium text-midnight-ink mb-2">
                File Type <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {FILE_TYPES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      setFileType(t.key);
                      setCsvFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                      setUploadError('');
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      fileType === t.key
                        ? 'bg-trust-blue text-white border-trust-blue'
                        : 'bg-white text-cool-gray border-soft-border hover:border-trust-blue hover:text-midnight-ink'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* File input */}
            <div>
              <label className="block text-sm font-medium text-midnight-ink mb-1">
                {activeFileType.label} File <span className="text-red-500">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept={activeFileType.accept}
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-cool-gray file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-soft-border file:text-xs file:font-medium file:bg-cloud-gray file:text-midnight-ink hover:file:bg-gray-100"
              />
              <p className="mt-1 text-xs text-cool-gray">
                {activeFileType.hint}
              </p>
            </div>

            {uploadError && (
              <p className="text-sm text-red-500">{uploadError}</p>
            )}

            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-trust-blue text-white text-sm font-medium rounded-lg py-2 hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {uploading ? 'Parsing\u2026' : 'Upload & Preview'}
            </button>
          </form>
        </div>
      )}

      {/* Step: Preview ------------------------------------------------- */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base font-semibold text-midnight-ink">
                Preview — {activeRows.length} row{activeRows.length !== 1 ? 's' : ''} to import
                {removedRows.length > 0 && (
                  <span className="ml-2 text-xs text-cool-gray font-normal">
                    ({removedRows.length} removed / duplicate)
                  </span>
                )}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-cool-gray hover:text-midnight-ink underline"
            >
              ← Back
            </button>
          </div>

          {/* Active rows table */}
          {activeRows.length > 0 && (
            <div className="overflow-x-auto border border-soft-border rounded-xl bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-cloud-gray border-b border-soft-border">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-cool-gray w-28">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-cool-gray">Description</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-cool-gray w-40">Ledger</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-cool-gray w-36">Department</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-cool-gray w-28">Amount</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-cool-gray w-20">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRows.map((row) => (
                    <tr key={row._idx} className="border-b border-soft-border last:border-0 hover:bg-cloud-gray/40">
                      <td className="px-3 py-2 text-midnight-ink font-mono text-xs">{row.date}</td>
                      <td className="px-3 py-2 text-midnight-ink max-w-xs">
                        <span className="block truncate" title={row.description}>{row.description}</span>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={row.ledger_id}
                          onChange={(e) => updateRow(row._idx, 'ledger_id', e.target.value)}
                          className={`w-full border rounded px-2 py-1 text-xs text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue ${
                            !row.ledger_id ? 'border-red-300 bg-red-50' : 'border-soft-border'
                          }`}
                        >
                          <option value="">Select ledger…</option>
                          {ledgers.map((l) => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={row.department}
                          onChange={(e) => updateRow(row._idx, 'department', e.target.value)}
                          className="w-full border border-soft-border rounded px-2 py-1 text-xs text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
                        >
                          <option value="">No department</option>
                          {DEFAULT_DEPARTMENTS.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </td>
                      <td className={`px-3 py-2 text-right font-medium font-mono ${
                        row.amount < 0 ? 'text-red-500' : 'text-green-600'
                      }`}>
                        {row.amount < 0 ? '-' : '+'}₹{fmt(Math.abs(row.amount))}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(row._idx)}
                          className="text-xs text-red-400 hover:text-red-600"
                          title="Remove this row"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Removed / duplicate rows (collapsed) */}
          {removedRows.length > 0 && (
            <details className="border border-soft-border rounded-xl bg-white">
              <summary className="px-4 py-2 text-sm text-cool-gray cursor-pointer select-none">
                {removedRows.length} removed row{removedRows.length !== 1 ? 's' : ''} (click to expand)
              </summary>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <tbody>
                    {removedRows.map((row) => (
                      <tr key={row._idx} className="border-t border-soft-border opacity-50">
                        <td className="px-3 py-1.5 text-xs font-mono w-28">{row.date}</td>
                        <td className="px-3 py-1.5 text-xs max-w-xs">
                          <span className="block truncate" title={row.description}>{row.description}</span>
                          {row.is_duplicate && <span className="text-orange-500 font-medium"> (duplicate)</span>}
                        </td>
                        <td className="px-3 py-1.5 text-xs text-right font-mono w-28">
                          {row.amount < 0 ? '-' : '+'}₹{fmt(Math.abs(row.amount))}
                        </td>
                        <td className="px-3 py-1.5 text-center w-20">
                          <button
                            type="button"
                            onClick={() => restoreRow(row._idx)}
                            className="text-xs text-trust-blue hover:underline"
                          >
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          {confirmError && (
            <p className="text-sm text-red-500">{confirmError}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirming || activeRows.length === 0}
              className="bg-trust-blue text-white text-sm font-medium rounded-lg px-6 py-2 hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {confirming ? 'Importing…' : `Confirm & Import ${activeRows.length} row${activeRows.length !== 1 ? 's' : ''}`}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="border border-soft-border text-sm text-cool-gray rounded-lg px-4 py-2 hover:bg-cloud-gray transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Step: Done ---------------------------------------------------- */}
      {step === 'done' && result && (
        <div className="bg-white border border-soft-border rounded-xl p-6 max-w-lg space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <h2 className="text-base font-semibold text-midnight-ink">Import Complete</h2>
              <p className="text-sm text-cool-gray mt-0.5">
                {result.created} journal entr{result.created !== 1 ? 'ies' : 'y'} created
                {result.skipped_duplicates > 0 && `, ${result.skipped_duplicates} duplicate${result.skipped_duplicates !== 1 ? 's' : ''} skipped`}.
              </p>
            </div>
          </div>

          {result.errors?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600 space-y-1">
              <p className="font-medium">Some rows had errors:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {result.errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={handleReset}
            className="w-full border border-soft-border text-sm text-midnight-ink rounded-lg py-2 hover:bg-cloud-gray transition-colors"
          >
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}
