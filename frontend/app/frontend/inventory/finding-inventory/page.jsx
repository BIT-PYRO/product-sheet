'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, RefreshCw, Search, X } from 'lucide-react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const MATERIAL_OPTIONS = ['Gold', 'Silver', 'Brass', 'Alloy', 'Platinum'];
const STAGE_OPTIONS = ['Raw', 'Wax', 'Casting', 'Filing', 'Polish', 'Setting', 'Ready', 'Finished'];

function emptyFinding() {
  return {
    finding_code: '',
    die_number: '',
    size: '',
    material: '',
    finding_stage: '',
    mechanism: '',
    quantity: '',
    weight: '',
    dead_weight: '',
    mold_qty_per_die: '',
    polish: '',
    total_measurements: '',
    design_material: '',
    notes: '',
  };
}

function Field({ label, value, onChange, textarea = false, type = 'text', children }) {
  const base = 'w-full rounded-md border border-soft-border px-3 py-1.5 text-sm text-midnight-ink placeholder:text-cool-gray focus:outline-none focus:ring-1 focus:ring-trust-blue bg-white';
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-cool-gray uppercase tracking-wide">{label}</label>
      {children ? children : textarea ? (
        <textarea className={`${base} resize-none`} rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={base} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

export default function FindingInventoryPage() {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [search, setSearch] = useState('');
  const [filterMaterial, setFilterMaterial] = useState('');
  const [filterStage, setFilterStage] = useState('');

  // Add New Finding dialog
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyFinding());
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const fetchFindings = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await fetch('/api/findings?is_active=true&page_size=500');
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const results = data?.data?.results ?? data?.results ?? data?.data ?? [];
      setFindings(Array.isArray(results) ? results : []);
    } catch (err) {
      setFetchError(err.message || 'Failed to load findings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFindings();
  }, []);

  const filtered = useMemo(() => {
    return findings.filter((f) => {
      const matchSearch =
        !search ||
        (f.finding_code || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.die_number || '').toLowerCase().includes(search.toLowerCase());
      const matchMaterial = !filterMaterial || (f.material || '') === filterMaterial;
      const matchStage = !filterStage || (f.finding_stage || '') === filterStage;
      return matchSearch && matchMaterial && matchStage;
    });
  }, [findings, search, filterMaterial, filterStage]);

  const clearFilters = () => {
    setSearch('');
    setFilterMaterial('');
    setFilterStage('');
  };

  const hasActiveFilters = search || filterMaterial || filterStage;

  function ff(key) {
    return (val) => setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSaveFinding() {
    if (!form.finding_code.trim()) {
      setStatusMsg('Finding Code is required.');
      return;
    }
    setSaving(true);
    setStatusMsg('');
    try {
      const res = await fetch('/api/findings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(JSON.stringify(err));
      }
      setStatusMsg('Finding added successfully.');
      setAddOpen(false);
      setForm(emptyFinding());
      fetchFindings();
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-cloud-gray">
      {/* Header */}
      <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-xl font-bold tracking-tight text-midnight-ink">FINDING INVENTORY</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchFindings}
              className="inline-flex items-center gap-1.5 rounded-lg border border-soft-border bg-white px-3 py-1.5 text-sm font-medium text-midnight-ink hover:border-trust-blue transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => { setForm(emptyFinding()); setStatusMsg(''); setAddOpen(true); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-trust-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Add New Finding
            </button>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-6 pt-20 pb-8">
        {/* Status message */}
        {statusMsg && (
          <div className="fixed top-16 right-4 z-50 flex items-center justify-between gap-3 rounded-lg border border-soft-border bg-white px-4 py-2 text-sm text-midnight-ink shadow-md">
            <span>{statusMsg}</span>
            <button onClick={() => setStatusMsg('')}><X className="h-3.5 w-3.5 text-cool-gray hover:text-midnight-ink" /></button>
          </div>
        )}

        {/* Back + summary row */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/inventory"
              className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:border-trust-blue transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Inventory
            </Link>
            <span className="text-sm text-cool-gray">
              {loading ? 'Loading…' : `${filtered.length} finding${filtered.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>

        {/* Filters */}
        <section className="mb-4 rounded-xl border border-soft-border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            {/* Search */}
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-cool-gray" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search finding code or die no."
                className="h-9 w-full rounded-lg border border-soft-border pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
              />
            </div>

            {/* Material filter */}
            <select
              value={filterMaterial}
              onChange={(e) => setFilterMaterial(e.target.value)}
              className="h-9 rounded-lg border border-soft-border bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
            >
              <option value="">All Materials</option>
              {MATERIAL_OPTIONS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Stage filter */}
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="h-9 rounded-lg border border-soft-border bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-trust-blue"
            >
              <option value="">All Stages</option>
              {STAGE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-cool-gray hover:border-danger hover:text-danger transition"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>
        </section>

        {/* Error */}
        {fetchError && (
          <div className="mb-4 rounded-lg border border-danger-soft bg-danger-soft px-4 py-3 text-sm text-danger">
            {fetchError}
          </div>
        )}

        {/* Table */}
        <section className="rounded-xl border border-soft-border bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="bg-cloud-gray border-b border-soft-border">
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-cool-gray w-12">#</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Finding Code</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Die No.</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Size</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Material</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Stage</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-cool-gray">Mechanism</th>
                  <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-cool-gray">Quantity</th>
                  <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-cool-gray">Weight</th>
                  <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-cool-gray">Dead Wt.</th>
                  <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-cool-gray">Mold Qty/Die</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-sm text-cool-gray">
                      Loading findings…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-sm text-cool-gray">
                      {hasActiveFilters ? 'No findings match your filters.' : 'No findings found.'}
                    </td>
                  </tr>
                )}
                {!loading &&
                  filtered.map((f, index) => (
                    <tr
                      key={f.id}
                      className="border-b border-soft-border/70 last:border-b-0 hover:bg-cloud-gray/50 transition-colors"
                    >
                      <td className="px-3 py-2.5 text-cool-gray">{index + 1}</td>
                      <td className="px-3 py-2.5 font-medium">
                        <Link
                          href={`/finding-entry?code=${encodeURIComponent(f.finding_code)}`}
                          className="text-trust-blue hover:underline"
                        >
                          {f.finding_code || '—'}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-midnight-ink">{f.die_number || '—'}</td>
                      <td className="px-3 py-2.5 text-midnight-ink">{f.size || '—'}</td>
                      <td className="px-3 py-2.5">
                        {f.material ? (
                          <span className="inline-block rounded-full bg-cloud-gray px-2.5 py-0.5 text-xs font-medium text-slate-text">
                            {f.material}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        {f.finding_stage ? (
                          <span className="inline-block rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                            {f.finding_stage}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-midnight-ink">{f.mechanism || '—'}</td>
                      <td className="px-3 py-2.5 text-right text-midnight-ink font-medium">
                        {f.quantity || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-midnight-ink">{f.weight || '—'}</td>
                      <td className="px-3 py-2.5 text-right text-midnight-ink">{f.dead_weight || '—'}</td>
                      <td className="px-3 py-2.5 text-right text-midnight-ink">{f.mold_qty_per_die || '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Footer summary */}
          {!loading && filtered.length > 0 && (
            <div className="border-t border-soft-border px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-cool-gray">
                Showing {filtered.length} of {findings.length} findings
              </span>
              <Link
                href="/finding-entry"
                className="inline-flex items-center gap-1.5 rounded-lg border border-trust-blue bg-trust-blue px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 transition"
              >
                + Add Finding
              </Link>
            </div>
          )}
        </section>
      </div>

      {/* ── Add New Finding dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-midnight-ink">Add New Finding</DialogTitle>
          </DialogHeader>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Finding Code *" value={form.finding_code} onChange={ff('finding_code')} />
            <Field label="Die Number" value={form.die_number} onChange={ff('die_number')} />
            <Field label="Size" value={form.size} onChange={ff('size')} />

            <Field label="Material">
              <select
                value={form.material}
                onChange={(e) => ff('material')(e.target.value)}
                className="w-full rounded-md border border-soft-border bg-white px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              >
                <option value="">Select material</option>
                {MATERIAL_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>

            <Field label="Stage">
              <select
                value={form.finding_stage}
                onChange={(e) => ff('finding_stage')(e.target.value)}
                className="w-full rounded-md border border-soft-border bg-white px-3 py-1.5 text-sm text-midnight-ink focus:outline-none focus:ring-1 focus:ring-trust-blue"
              >
                <option value="">Select stage</option>
                {STAGE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>

            <Field label="Mechanism" value={form.mechanism} onChange={ff('mechanism')} />
            <Field label="Quantity" value={form.quantity} onChange={ff('quantity')} />
            <Field label="Weight" value={form.weight} onChange={ff('weight')} />
            <Field label="Dead Weight" value={form.dead_weight} onChange={ff('dead_weight')} />
            <Field label="Mold Qty / Die" value={form.mold_qty_per_die} onChange={ff('mold_qty_per_die')} />
            <Field label="Polish" value={form.polish} onChange={ff('polish')} />
            <Field label="Total Measurements" value={form.total_measurements} onChange={ff('total_measurements')} />
            <Field label="Design Material" value={form.design_material} onChange={ff('design_material')} />
            <div className="sm:col-span-2 md:col-span-3">
              <Field label="Notes" value={form.notes} onChange={ff('notes')} textarea />
            </div>
          </div>

          {statusMsg && !addOpen && null}

          <div className="mt-5 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveFinding} disabled={saving}>
              {saving ? 'Saving...' : 'Save Finding'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
