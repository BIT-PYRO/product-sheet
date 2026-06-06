'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, ChevronDown, ChevronUp, History, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

const ACTION_COLORS = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  upload: 'bg-purple-100 text-purple-700',
  login: 'bg-gray-100 text-gray-700',
};

/**
 * DeletionHistoryDrawer
 *
 * An icon-only floating button that opens a side panel with two tabs:
 *   1. Deletion History — lists deleted records for the given model
 *   2. Activity Logs   — lists all recent activity for the given sheet
 *
 * Props:
 *   appLabel   {string}  Django app label  e.g. "inventory"
 *   modelName  {string}  Django model name e.g. "toolitem"
 *   sheet      {string}  ActivityLog sheet key e.g. "inventory"
 *   objectId   {string|number}  Optional — filter activity logs to a single record
 *   title      {string}  Optional — unused, kept for backward compat
 */
export default function DeletionHistoryDrawer({ appLabel, modelName, sheet, objectId, title }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('deletion');
  const [isSuperuser, setIsSuperuser] = useState(false);

  // Deletion history state
  const [delLogs, setDelLogs] = useState([]);
  const [delLoading, setDelLoading] = useState(false);
  const [delError, setDelError] = useState('');
  const [delExpandedId, setDelExpandedId] = useState(null);

  // Activity logs state
  const [actLogs, setActLogs] = useState([]);
  const [actLoading, setActLoading] = useState(false);
  const [actError, setActError] = useState('');
  const [actExpandedId, setActExpandedId] = useState(null);

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

  const fetchDeletionLogs = useCallback(async () => {
    if (!appLabel || !modelName) return;
    setDelLoading(true);
    setDelError('');
    try {
      const res = await fetch(
        `/api/deletion-logs?app_label=${encodeURIComponent(appLabel)}&model_name=${encodeURIComponent(modelName)}&page_size=200`,
        { cache: 'no-store' },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setDelError(json?.message || 'Failed to load deletion history.');
        setDelLogs([]);
        return;
      }
      const results =
        json?.data?.results ??
        (Array.isArray(json?.data) ? json.data : null) ??
        json?.results ??
        [];
      setDelLogs(Array.isArray(results) ? results : []);
    } catch (e) {
      setDelError(e.message || 'Network error.');
      setDelLogs([]);
    } finally {
      setDelLoading(false);
    }
  }, [appLabel, modelName]);

  const fetchActivityLogs = useCallback(async () => {
    if (!sheet) return;
    setActLoading(true);
    setActError('');
    try {
      const objectIdParam = objectId ? `&object_id=${encodeURIComponent(objectId)}` : '';
      const res = await fetch(
        `/api/activity-logs?sheet=${encodeURIComponent(sheet)}&page_size=50&ordering=-timestamp${objectIdParam}`,
        { cache: 'no-store' },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setActError(json?.message || 'Failed to load activity logs.');
        setActLogs([]);
        return;
      }
      const results =
        json?.data?.results ??
        (Array.isArray(json?.data) ? json.data : null) ??
        json?.results ??
        [];
      setActLogs(Array.isArray(results) ? results : []);
    } catch (e) {
      setActError(e.message || 'Network error.');
      setActLogs([]);
    } finally {
      setActLoading(false);
    }
  }, [sheet]);

  useEffect(() => {
    if (open) {
      if (activeTab === 'deletion') fetchDeletionLogs();
      else fetchActivityLogs();
    }
  }, [open, activeTab, fetchDeletionLogs, fetchActivityLogs]);

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  function toggleDelExpand(id) {
    setDelExpandedId((prev) => (prev === id ? null : id));
  }

  function toggleActExpand(id) {
    setActExpandedId((prev) => (prev === id ? null : id));
  }

  const handleRefresh = () => {
    if (activeTab === 'deletion') fetchDeletionLogs();
    else fetchActivityLogs();
  };

  // Only render for superusers
  if (!isSuperuser) return null;

  return (
    <>
      {/* Icon-only trigger button — fixed above the bottom footer bar, bottom-right corner */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="View logs"
        className="fixed bottom-14 right-6 z-[70] flex items-center justify-center rounded-full bg-midnight-ink p-3 text-white shadow-lg hover:bg-midnight-ink/90 transition-colors"
      >
        <History className="h-5 w-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 !top-[60px] !h-[calc(100vh-60px)]">
          {/* Header */}
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-soft-border">
            <div className="flex items-center justify-between gap-3">
              <SheetTitle className="text-lg font-semibold text-midnight-ink">
                Logs
              </SheetTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={delLoading || actLoading}
                className="shrink-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${(delLoading || actLoading) ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            <SheetDescription className="sr-only">
              View deletion history and activity logs for this sheet.
            </SheetDescription>
            {/* Tabs */}
            <div className="flex gap-1 mt-3 border border-soft-border rounded-lg p-1 w-fit bg-cloud-gray">
              <button
                type="button"
                onClick={() => setActiveTab('deletion')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'deletion'
                    ? 'bg-white text-midnight-ink shadow-sm'
                    : 'text-cool-gray hover:text-midnight-ink'
                }`}
              >
                <History className="h-3.5 w-3.5" />
                Deletion History
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('activity')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'activity'
                    ? 'bg-white text-midnight-ink shadow-sm'
                    : 'text-cool-gray hover:text-midnight-ink'
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
                Activity Logs
              </button>
            </div>
          </SheetHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4">

            {/* ── Deletion History Tab ── */}
            {activeTab === 'deletion' && (
              <>
                {delLoading && (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-7 h-7 border-4 border-trust-blue border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {!delLoading && delError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {delError}
                  </div>
                )}
                {!delLoading && !delError && delLogs.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <History className="h-10 w-10 text-cool-gray mb-3 opacity-40" />
                    <p className="text-sm font-medium text-midnight-ink">No deletions recorded yet</p>
                    <p className="text-xs text-cool-gray mt-1">
                      When records on this page are deleted, they will appear here.
                    </p>
                  </div>
                )}
                {!delLoading && !delError && delLogs.length > 0 && (
                  <div className="space-y-3">
                    {delLogs.map((log) => {
                      const isExpanded = delExpandedId === log.id;
                      return (
                        <div
                          key={log.id}
                          className="rounded-lg border border-soft-border bg-white overflow-hidden"
                        >
                          <button
                            type="button"
                            className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-cloud-gray/60 transition-colors"
                            onClick={() => toggleDelExpand(log.id)}
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
                                  {log.deleted_by_username || log.deleted_by_name || 'Unknown'}
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
              </>
            )}

            {/* ── Activity Logs Tab ── */}
            {activeTab === 'activity' && (
              <>
                {actLoading && (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-7 h-7 border-4 border-trust-blue border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {!actLoading && actError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {actError}
                  </div>
                )}
                {!actLoading && !actError && actLogs.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Activity className="h-10 w-10 text-cool-gray mb-3 opacity-40" />
                    <p className="text-sm font-medium text-midnight-ink">No activity recorded yet</p>
                    <p className="text-xs text-cool-gray mt-1">
                      Actions taken on this sheet will appear here.
                    </p>
                  </div>
                )}
                {!actLoading && !actError && actLogs.length > 0 && (
                  <div className="space-y-3">
                    {actLogs.map((log) => {
                      const isExpanded = actExpandedId === log.id;
                      const actionColorClass = ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700';
                      const changesEntries = log.changes ? Object.entries(log.changes) : [];
                      return (
                        <div
                          key={log.id}
                          className="rounded-lg border border-soft-border bg-white overflow-hidden"
                        >
                          <button
                            type="button"
                            className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-cloud-gray/60 transition-colors"
                            onClick={() => changesEntries.length > 0 && toggleActExpand(log.id)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-midnight-ink truncate max-w-[200px]">
                                  {log.object_repr || `ID #${log.object_id}`}
                                </span>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${actionColorClass}`}>
                                  {log.action}
                                </span>
                                {changesEntries.length > 0 && (
                                  <span className="text-xs text-cool-gray shrink-0">
                                    {changesEntries.length} field{changesEntries.length !== 1 ? 's' : ''} changed
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex items-center gap-3 flex-wrap text-xs text-cool-gray">
                                <span>
                                  <span className="font-medium">By:</span>{' '}
                                  {log.user_display || log.user_name || 'Unknown'}
                                </span>
                                <span>
                                  <span className="font-medium">At:</span>{' '}
                                  {formatDate(log.timestamp)}
                                </span>
                              </div>
                            </div>
                            {changesEntries.length > 0 && (
                              isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-cool-gray shrink-0 mt-0.5" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-cool-gray shrink-0 mt-0.5" />
                              )
                            )}
                          </button>
                          {isExpanded && changesEntries.length > 0 && (
                            <div className="border-t border-soft-border bg-cloud-gray/50 px-4 py-3">
                              <p className="text-xs font-semibold text-cool-gray uppercase tracking-wider mb-2">
                                Changes
                              </p>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-cool-gray">
                                      <th className="pb-1.5 pr-4 font-medium">Field</th>
                                      <th className="pb-1.5 pr-4 font-medium">Before</th>
                                      <th className="pb-1.5 font-medium">After</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {changesEntries.map(([field, diff]) => (
                                      <tr key={field} className="border-t border-soft-border/50">
                                        <td className="py-1 pr-4 font-medium text-midnight-ink capitalize whitespace-nowrap">
                                          {field.replace(/_/g, ' ')}
                                        </td>
                                        <td className="py-1 pr-4 text-red-600 break-all">
                                          {diff?.old === null || diff?.old === undefined ? '—' : String(diff.old)}
                                        </td>
                                        <td className="py-1 text-green-700 break-all">
                                          {diff?.new === null || diff?.new === undefined ? '—' : String(diff.new)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer count */}
          {activeTab === 'deletion' && delLogs.length > 0 && !delLoading && (
            <div className="px-6 py-3 border-t border-soft-border text-xs text-cool-gray shrink-0">
              {delLogs.length} deletion{delLogs.length !== 1 ? 's' : ''} recorded
            </div>
          )}
          {activeTab === 'activity' && actLogs.length > 0 && !actLoading && (
            <div className="px-6 py-3 border-t border-soft-border text-xs text-cool-gray shrink-0">
              Showing {actLogs.length} most recent activities
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
