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

export default function EditAPIKeyModal({ open, onOpenChange, apiKey, onSaved }) {
  const [name, setName] = useState('');
  const [givenTo, setGivenTo] = useState('');
  const [description, setDescription] = useState('');
  const [selectedScopes, setSelectedScopes] = useState([]);
  const [canRead, setCanRead] = useState(true);
  const [canWrite, setCanWrite] = useState(false);
  const [canComment, setCanComment] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');
  const [newRawKey, setNewRawKey] = useState(null);

  useEffect(() => {
    if (apiKey) {
      setName(apiKey.name || '');
      setGivenTo(apiKey.given_to || '');
      setDescription(apiKey.description || '');
      setSelectedScopes(apiKey.page_scopes || []);
      setCanRead(apiKey.can_read ?? true);
      setCanWrite(apiKey.can_write ?? false);
      setCanComment(apiKey.can_comment ?? false);
      setIsActive(apiKey.is_active ?? true);
      setNewRawKey(null);
      setError('');
    }
  }, [apiKey]);

  function toggleScope(key) {
    setSelectedScopes((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Name is required.'); return; }
    if (selectedScopes.length === 0) { setError('Select at least one page scope.'); return; }
    if (!canRead && !canWrite && !canComment) {
      setError('At least one permission must be enabled.'); return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/frontend/api/api-keys/${apiKey.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          given_to: givenTo.trim(),
          description: description.trim(),
          page_scopes: selectedScopes,
          can_read: canRead,
          can_write: canWrite,
          can_comment: canComment,
          is_active: isActive,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setError(result.message || JSON.stringify(result.errors) || 'Failed to update API key.');
        return;
      }
      onSaved?.();
      onOpenChange(false);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerate() {
    if (!confirm('This will invalidate the current key immediately. Continue?')) return;
    setRegenerating(true);
    setError('');
    try {
      const res = await fetch(`/frontend/api/api-keys/${apiKey.id}/regenerate`, {
        method: 'POST',
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setError(result.message || 'Failed to regenerate key.');
        return;
      }
      setNewRawKey(result.data.raw_key);
      onSaved?.();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit API Key</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-5 py-2">
          {/* Key info header */}
          <div className="flex items-center gap-3 p-3 bg-cloud-gray rounded-lg border border-soft-border text-sm">
            <span className="font-mono text-cool-gray">{apiKey?.key_prefix}…</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isActive ? 'bg-success/10 text-success-dark' : 'bg-danger/10 text-danger-dark'}`}>
              {isActive ? 'Active' : 'Revoked'}
            </span>
          </div>

          {/* Regenerated key display */}
          {newRawKey && (
            <APIKeyCopyOnce rawKey={newRawKey} onDismiss={() => setNewRawKey(null)} />
          )}

          {/* Name & Given To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-midnight-ink">Key Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-midnight-ink">Given To</label>
              <Input value={givenTo} onChange={(e) => setGivenTo(e.target.value)} />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-midnight-ink">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {/* Page Scopes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-midnight-ink">Page Scopes *</label>
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

          {/* Revoke toggle */}
          <div className="flex items-center gap-3 p-3 border border-soft-border rounded-lg">
            <Checkbox
              checked={isActive}
              onCheckedChange={setIsActive}
              id="is-active-toggle"
            />
            <label htmlFor="is-active-toggle" className="text-sm cursor-pointer">
              <span className="font-medium text-midnight-ink">Key is active</span>
              <span className="block text-xs text-cool-gray">Uncheck to revoke access without deleting the key.</span>
            </label>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-amber-400 text-amber-700 hover:bg-amber-50 sm:mr-auto"
              onClick={handleRegenerate}
              disabled={regenerating || saving}
            >
              {regenerating ? 'Regenerating…' : 'Regenerate Key'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || regenerating}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
