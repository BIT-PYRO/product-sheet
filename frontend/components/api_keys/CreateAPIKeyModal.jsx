'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Check, ChevronDown } from 'lucide-react';
import APIKeyCopyOnce from './APIKeyCopyOnce';

const ALL_SCOPES = [
  { key: 'master_inventory', label: 'Master Inventory Sheet' },
  { key: 'master_products', label: 'Master Product Sheet' },
  { key: 'master_jobs', label: 'Master Job Sheet' },
  { key: 'master_workforce', label: 'Master Workforce Sheet' },
  { key: 'master_kyc', label: 'Master KYC Sheet' },
  { key: 'master_customers', label: 'Master Customer Sheet' },
  { key: 'master_designers', label: 'Master Designer Sheet' },
  { key: 'orders', label: 'Orders' },
  { key: 'drafts', label: 'Drafts' },
  { key: 'findings', label: 'Finding Sheet' },
  { key: 'product_inventory', label: 'Product Inventory' },
  { key: 'accounting', label: 'Accounting' },
  { key: 'hr', label: 'HR Section' },
];

export default function CreateAPIKeyModal({ open, onOpenChange, onCreated }) {
  const [name, setName] = useState('');
  const [givenToId, setGivenToId] = useState(null);
  const [givenToName, setGivenToName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedScopes, setSelectedScopes] = useState([]);
  const [canRead, setCanRead] = useState(true);
  const [canWrite, setCanWrite] = useState(false);
  const [canComment, setCanComment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [rawKey, setRawKey] = useState(null);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [createdScopes, setCreatedScopes] = useState([]);

  // Workforce dropdown state
  const [comboOpen, setComboOpen] = useState(false);
  const [workforceOptions, setWorkforceOptions] = useState([]);
  const [workforceLoading, setWorkforceLoading] = useState(false);

  // Fetch tech-dept workforce members when modal opens
  useEffect(() => {
    if (!open) return;
    setWorkforceLoading(true);
    fetch('/frontend/api/workforce?department__icontains=tech&active=true', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.data?.results)
          ? data.data.results
          : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
          ? data
          : [];
        setWorkforceOptions(list);
      })
      .catch(() => setWorkforceOptions([]))
      .finally(() => setWorkforceLoading(false));
  }, [open]);

  function reset() {
    setName(''); setGivenToId(null); setGivenToName(''); setDescription('');
    setSelectedScopes([]); setCanRead(true); setCanWrite(false); setCanComment(false);
    setSaving(false); setError(''); setRawKey(null); setApiBaseUrl(''); setCreatedScopes([]);
    setComboOpen(false);
  }

  function handleClose() {
    reset();
    onOpenChange(false);
    if (rawKey) onCreated?.();
  }

  function toggleScope(key) {
    setSelectedScopes((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  }

  function selectAllScopes() {
    setSelectedScopes(ALL_SCOPES.map((s) => s.key));
  }

  function clearAllScopes() {
    setSelectedScopes([]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Name is required.'); return; }
    if (selectedScopes.length === 0) { setError('Select at least one page scope.'); return; }
    if (!canRead && !canWrite && !canComment) {
      setError('At least one permission (Read, Write, or Comment) must be enabled.'); return;
    }

    setSaving(true);
    try {
      const res = await fetch('/frontend/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          given_to: givenToName,
          given_to_workforce_id: givenToId,
          description: description.trim(),
          page_scopes: selectedScopes,
          can_read: canRead,
          can_write: canWrite,
          can_comment: canComment,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setError(result.message || JSON.stringify(result.errors) || 'Failed to create API key.');
        return;
      }
      setRawKey(result.data.raw_key);
      setApiBaseUrl(result.data.api_base_url || '');
      setCreatedScopes(selectedScopes);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
        </DialogHeader>

        {rawKey ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-cool-gray">
              API key <strong className="text-midnight-ink">{name}</strong> created successfully.
            </p>
            <APIKeyCopyOnce
              rawKey={rawKey}
              apiBaseUrl={apiBaseUrl}
              pageScopes={createdScopes}
              keyName={name}
            />
            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 py-2">
            {/* Name & Given To */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-midnight-ink">Key Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. ERP Integration Key"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-midnight-ink">Given To</label>
                <Popover open={comboOpen} onOpenChange={setComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={comboOpen}
                      className="w-full justify-between font-normal text-left"
                    >
                      <span className={givenToName ? 'text-midnight-ink' : 'text-cool-gray'}>
                        {givenToName || (workforceLoading ? 'Loading…' : 'Select tech team member…')}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search by name or designation…" />
                      <CommandEmpty>
                        {workforceLoading ? 'Loading…' : 'No tech team members found.'}
                      </CommandEmpty>
                      <CommandGroup className="max-h-56 overflow-y-auto">
                        {workforceOptions.map((m) => (
                          <CommandItem
                            key={m.id}
                            value={`${m.full_name} ${m.designation || ''}`}
                            onSelect={() => {
                              setGivenToId(m.id);
                              setGivenToName(m.full_name);
                              setComboOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 shrink-0 ${
                                givenToId === m.id ? 'opacity-100' : 'opacity-0'
                              }`}
                            />
                            <span className="font-medium">{m.full_name}</span>
                            {m.designation && (
                              <span className="ml-1.5 text-xs text-cool-gray truncate">
                                · {m.designation}
                              </span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-midnight-ink">Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional notes about this key's purpose"
              />
            </div>

            {/* Page Scopes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-midnight-ink">Page Scopes *</label>
                <div className="flex gap-2 text-xs">
                  <button type="button" onClick={selectAllScopes} className="text-trust-blue hover:underline">
                    Select all
                  </button>
                  <span className="text-cool-gray">·</span>
                  <button type="button" onClick={clearAllScopes} className="text-cool-gray hover:underline">
                    Clear
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border border-soft-border rounded-lg p-3 bg-cloud-gray/40">
                {ALL_SCOPES.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer text-sm text-midnight-ink">
                    <Checkbox
                      checked={selectedScopes.includes(key)}
                      onCheckedChange={() => toggleScope(key)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-midnight-ink">Permissions *</label>
              <div className="flex flex-wrap gap-4 border border-soft-border rounded-lg p-3 bg-cloud-gray/40">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox checked={canRead} onCheckedChange={setCanRead} />
                  <span className="font-medium text-trust-blue">Read</span>
                  <span className="text-cool-gray text-xs">(GET)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox checked={canWrite} onCheckedChange={setCanWrite} />
                  <span className="font-medium text-success-dark">Write</span>
                  <span className="text-cool-gray text-xs">(POST, PUT, DELETE)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox checked={canComment} onCheckedChange={setCanComment} />
                  <span className="font-medium text-amber-700">Comment / Suggest</span>
                  <span className="text-cool-gray text-xs">(PATCH only)</span>
                </label>
              </div>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Creating…' : 'Create Key'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
