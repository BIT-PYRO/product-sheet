'use client';

import { useCallback, useEffect, useState } from 'react';
import { History, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

/**
 * DeletionHistoryDrawer
 *
 * A floating "History" button that opens a side panel listing all deletion
 * log entries for a given model. Only visible to superusers.
 *
 * Props:
 *   appLabel   {string}  Django app label  e.g. "inventory"
 *   modelName  {string}  Django model name e.g. "toolitem"
 *   title      {string}  Optional display title shown in the drawer header
 */
export default function DeletionHistoryDrawer({ appLabel, modelName, title }) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [isSuperuser, setIsSuperuser] = useState(false);

  // Check superuser status once on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.user?.is_superuser) setIsSuperuser(true);
      } catch {
        // not a superuser or network error — stay hidden
      }
    })();
  }, []);

  const fetchLogs = useCallback(async () => {
    if (!appLabel || !modelName) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/deletion-logs?app_label=${encodeURIComponent(appLabel)}&model_name=${encodeURIComponent(modelName)}&page_size=200`,
        { cache: 'no-store' },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.message || 'Failed to load deletion history.');
        setLogs([]);
        return;
      }
      // Handle both standardized { success, data: { results } } and raw { results } formats
      const results =
        json?.data?.results ??
        (Array.isArray(json?.data) ? json.data : null) ??
        json?.results ??
        [];
      setLogs(Array.isArray(results) ? results : []);
    } catch (e) {
      setError(e.message || 'Network error.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [appLabel, modelName]);

  useEffect(() => {
    if (open) fetchLogs();
  }, [open, fetchLogs]);

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  const displayTitle = title || `${modelName} deletion history`;

  // Only render for superusers
  if (!isSuperuser) return null;

  return (
    <>
      {/* Trigger button — fixed above the bottom footer bar, bottom-right corner */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="View deletion history"
        className="fixed bottom-14 right-6 z-[70] flex items-center gap-2 rounded-full bg-midnight-ink px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-midnight-ink/90 transition-colors"
      >
        <History className="h-4 w-4" />
        <span>Deletion History</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 !top-[60px] !h-[calc(100vh-60px)]">
          {/* Header */}
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-soft-border">
            <div className="flex items-center justify-between gap-3">
              <div>
                <SheetTitle className="text-lg font-semibold text-midnight-ink capitalize">
                  {displayTitle}
                </SheetTitle>
                <SheetDescription className="text-sm text-cool-gray mt-0.5">
                  Records deleted via the API are listed here. Each entry shows what was removed and who removed it.
                </SheetDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLogs}
                disabled={loading}
                className="shrink-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </SheetHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="w-7 h-7 border-4 border-trust-blue border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loading && error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {!loading && !error && logs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <History className="h-10 w-10 text-cool-gray mb-3 opacity-40" />
                <p className="text-sm font-medium text-midnight-ink">No deletions recorded yet</p>
                <p className="text-xs text-cool-gray mt-1">
                  When records on this page are deleted, they will appear here.
                </p>
              </div>
            )}

            {!loading && !error && logs.length > 0 && (
              <div className="space-y-3">
                {logs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  return (
                    <div
                      key={log.id}
                      className="rounded-lg border border-soft-border bg-white overflow-hidden"
                    >
                      {/* Row summary */}
                      <button
                        type="button"
                        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-cloud-gray/60 transition-colors"
                        onClick={() => toggleExpand(log.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-midnight-ink truncate max-w-xs">
                              {log.object_repr || `ID #${log.object_id}`}
                            </span>
                            <span className="text-xs bg-red-100 text-red-700 font-medium px-2 py-0.5 rounded-full shrink-0">
                              deleted
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-3 flex-wrap text-xs text-cool-gray">
                            <span>
                              <span className="font-medium">ID:</span> {log.object_id}
                            </span>
                            <span>
                              <span className="font-medium">By:</span>{' '}
                              {log.deleted_by_username || 'Unknown'}
                            </span>
                            <span>
                              <span className="font-medium">At:</span>{' '}
                              {formatDate(log.deleted_at)}
                            </span>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-cool-gray shrink-0 mt-0.5" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-cool-gray shrink-0 mt-0.5" />
                        )}
                      </button>

                      {/* Expanded data */}
                      {isExpanded && (
                        <div className="border-t border-soft-border bg-cloud-gray/50 px-4 py-3">
                          <p className="text-xs font-semibold text-cool-gray uppercase tracking-wider mb-2">
                            Data at time of deletion
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                            {Object.entries(log.serialized_data || {}).map(([key, value]) => (
                              <div key={key} className="flex gap-1 text-xs">
                                <span className="font-medium text-midnight-ink shrink-0 capitalize">
                                  {key.replace(/_/g, ' ')}:
                                </span>
                                <span className="text-cool-gray break-all">
                                  {value === null || value === undefined
                                    ? '—'
                                    : typeof value === 'boolean'
                                    ? value ? 'Yes' : 'No'
                                    : Array.isArray(value)
                                    ? value.join(', ') || '—'
                                    : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer count */}
          {logs.length > 0 && !loading && (
            <div className="px-6 py-3 border-t border-soft-border text-xs text-cool-gray shrink-0">
              {logs.length} deletion{logs.length !== 1 ? 's' : ''} recorded
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
