'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CreateAPIKeyModal from './CreateAPIKeyModal';
import EditAPIKeyModal from './EditAPIKeyModal';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function PermissionBadges({ canRead, canWrite, canComment }) {
  return (
    <div className="flex flex-wrap gap-1">
      {canRead && <Badge variant="secondary" className="text-trust-blue border border-trust-blue/30 bg-trust-blue/10 text-xs">Read</Badge>}
      {canWrite && <Badge variant="secondary" className="text-success-dark border border-success/30 bg-success/10 text-xs">Write</Badge>}
      {canComment && <Badge variant="secondary" className="text-amber-700 border border-amber-300 bg-amber-50 text-xs">Comment</Badge>}
      {!canRead && !canWrite && !canComment && <span className="text-xs text-cool-gray">None</span>}
    </div>
  );
}

export default function APIKeyList() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/frontend/api/api-keys');
      const result = await res.json();
      if (!res.ok || !result.success) {
        setError(result.message || 'Failed to load API keys.');
        return;
      }
      setKeys(result.data || []);
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  async function handleDelete(key) {
    if (!confirm(`Delete API key "${key.name}"? This cannot be undone.`)) return;
    setDeleting(key.id);
    try {
      const res = await fetch(`/frontend/api/api-keys/${key.id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok || !result.success) {
        alert(result.message || 'Failed to delete.');
        return;
      }
      setKeys((prev) => prev.filter((k) => k.id !== key.id));
    } catch {
      alert('Network error.');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-midnight-ink">API Keys</h2>
          <p className="text-xs text-cool-gray mt-0.5">
            Generate keys for external software integrators. Control which pages and actions they can access.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadKeys}
            disabled={loading}
            className="border-midnight-ink text-midnight-ink rounded-full h-8 px-3 text-xs"
          >
            <RefreshCw className={`h-3 w-3 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="rounded-full h-8 px-4 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Key
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-cloud-gray animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && keys.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center text-cool-gray border border-dashed border-soft-border rounded-xl">
          <p className="text-sm font-medium mb-1">No API keys yet</p>
          <p className="text-xs mb-4">Create your first key to share secure data access with integrators.</p>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="rounded-full">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Create API Key
          </Button>
        </div>
      )}

      {/* Table */}
      {!loading && keys.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-soft-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cloud-gray border-b border-soft-border text-xs text-cool-gray uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-semibold">Name / Given To</th>
                <th className="text-left px-4 py-3 font-semibold">Key Prefix</th>
                <th className="text-left px-4 py-3 font-semibold">Scopes</th>
                <th className="text-left px-4 py-3 font-semibold">Permissions</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Last Used</th>
                <th className="text-left px-4 py-3 font-semibold">Created</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soft-border">
              {keys.map((k) => (
                <tr key={k.id} className="hover:bg-cloud-gray/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-midnight-ink">{k.name}</p>
                    {k.given_to && <p className="text-xs text-cool-gray mt-0.5">{k.given_to}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <code className="font-mono text-xs text-cool-gray bg-cloud-gray px-2 py-0.5 rounded">
                      {k.key_prefix}…
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {(k.scope_labels || []).map((label) => (
                        <Badge key={label} variant="outline" className="text-xs text-midnight-ink border-soft-border">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <PermissionBadges canRead={k.can_read} canWrite={k.can_write} canComment={k.can_comment} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${k.is_active ? 'bg-success/10 text-success-dark' : 'bg-danger/10 text-danger-dark'}`}>
                      {k.is_active ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-cool-gray">{formatDate(k.last_used_at)}</td>
                  <td className="px-4 py-3 text-xs text-cool-gray">{formatDate(k.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditTarget(k)}
                        className="p-1.5 rounded hover:bg-cloud-gray text-cool-gray hover:text-midnight-ink transition"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(k)}
                        disabled={deleting === k.id}
                        className="p-1.5 rounded hover:bg-danger/10 text-cool-gray hover:text-danger transition disabled:opacity-40"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <CreateAPIKeyModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={loadKeys}
      />
      <EditAPIKeyModal
        open={!!editTarget}
        onOpenChange={(v) => { if (!v) setEditTarget(null); }}
        apiKey={editTarget}
        onSaved={loadKeys}
      />
    </div>
  );
}
