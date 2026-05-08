'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Download, ThumbsUp, X, ExternalLink } from 'lucide-react';
import { getExpenses, getMemberExpenses, actionExpense } from '@/lib/hr-api';

const STATUS_COLOR = {
  Submitted: 'border-[#3B82F6] text-[#3B82F6] bg-blue-50/50',
  'Dept Head Approved': 'border-[#8B5CF6] text-[#8B5CF6] bg-purple-50/50',
  'Finance Reviewed': 'border-[#06B6D4] text-[#06B6D4] bg-cyan-50/50',
  Paid: 'border-[#10B981] text-[#10B981] bg-green-50/50',
  Rejected: 'border-red-300 text-red-500 bg-red-50/50',
  Draft: 'border-gray-300 text-gray-500 bg-gray-50/50',
};

const fmt = (amount) =>
  typeof amount === 'number'
    ? 'â‚¹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })
    : 'â‚¹0';

const fmtDate = (d) => {
  if (!d) return 'â€”';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function HRExpensesTracker() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(null);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [memberDetail, setMemberDetail] = useState(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState('');

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (deptFilter && deptFilter !== 'all') params.department = deptFilter;
      const data = await getExpenses(params);
      setOverview(data);
    } catch (e) {
      setError(e?.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [deptFilter]);

  const loadMemberDetail = useCallback(async (userId) => {
    if (!userId) return;
    setMemberLoading(true);
    try {
      const params = {};
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      const data = await getMemberExpenses(userId);
      setMemberDetail(data);
    } catch {
    } finally {
      setMemberLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  useEffect(() => {
    if (selectedMemberId) loadMemberDetail(selectedMemberId);
    else setMemberDetail(null);
  }, [selectedMemberId, loadMemberDetail]);

  const handleAction = async (expenseId, newStatus, rejectionReason = '') => {
    setActing(expenseId);
    try {
      const payload = { status: newStatus };
      if (rejectionReason) payload.rejection_reason = rejectionReason;
      await actionExpense(expenseId, payload);
      await loadOverview();
      if (selectedMemberId) await loadMemberDetail(selectedMemberId);
    } catch {
    } finally {
      setActing(null);
    }
  };

  const summary = overview?.summary || {};
  const members = overview?.members || [];
  const departments = overview?.departments || [{ value: 'all', label: 'All Departments' }];
  const recentSubmissions = overview?.recent_submissions || [];

  const visibleSubmissions = statusFilter === 'all'
    ? recentSubmissions
    : recentSubmissions.filter(r => r.status === statusFilter);

  return (
    <div className="space-y-5 pb-20 relative min-h-screen">
      {/* Top Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-wrap gap-4 items-end">
        <div className="flex gap-2">
          <button
            onClick={loadOverview}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 border border-[#3B82F6] text-[#3B82F6] text-xs font-bold rounded hover:bg-blue-50 transition-colors uppercase disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> REFRESH
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 border border-[#3B82F6] text-[#3B82F6] text-xs font-bold rounded hover:bg-blue-50 transition-colors uppercase">
            <Download className="w-3.5 h-3.5" /> EXPORT
          </button>
        </div>
        <div className="flex-1 flex flex-wrap gap-3">
          <div className="flex-1 min-w-[160px]">
            <div className="text-[11px] text-gray-500 mb-1 px-1">Department</div>
            <select
              value={deptFilter}
              onChange={e => { setDeptFilter(e.target.value); setSelectedMemberId(null); }}
              className="w-full h-9 px-3 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none bg-white text-gray-700"
            >
              {departments.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <div className="text-[11px] text-gray-500 mb-1 px-1">Status</div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none bg-white text-gray-700"
            >
              <option value="all">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Dept Head Approved">Dept Head Approved</option>
              <option value="Finance Reviewed">Finance Reviewed</option>
              <option value="Paid">Paid</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'TOTAL SUBMITTED', value: fmt(summary.total_submitted_amount), sub: `${summary.total_entries ?? 0} total entries`, color: '#3B82F6' },
          { label: 'PENDING APPROVAL', value: fmt(summary.pending_approval_amount), sub: `${summary.pending_entries ?? 0} entries awaiting`, color: '#F59E0B' },
          { label: 'APPROVED / PAID', value: fmt(summary.approved_amount), sub: `${summary.approved_entries ?? 0} entries cleared`, color: '#10B981' },
          { label: 'REJECTED', value: fmt(summary.rejected_amount), sub: `${summary.rejected_entries ?? 0} entries declined`, color: '#EF4444' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: card.color }} />
            <div className="text-xs font-bold text-gray-500 mb-1 uppercase">{card.label}</div>
            <div className="text-2xl font-bold" style={{ color: card.color }}>
              {loading ? <span className="text-gray-300">â€”</span> : card.value}
            </div>
            <div className="text-xs text-gray-500 mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Team Members Grid */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden p-4">
        <div className="text-sm font-medium text-gray-500 mb-3 px-1">
          Team Members {selectedMemberId && <button onClick={() => setSelectedMemberId(null)} className="ml-2 text-xs text-[#3B82F6] underline">Clear selection</button>}
        </div>
        {loading ? (
          <div className="py-8 text-center text-gray-400 text-sm">Loadingâ€¦</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {members.map(m => (
              <div
                key={m.user_id}
                onClick={() => setSelectedMemberId(m.user_id === selectedMemberId ? null : m.user_id)}
                className={`border rounded-lg p-3 cursor-pointer transition-all ${
                  selectedMemberId === m.user_id
                    ? 'border-[#3B82F6] shadow-[0_0_0_1px_rgba(59,130,246,1)]'
                    : 'border-gray-200 hover:border-gray-300 shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold text-[13px] text-gray-800 truncate pr-2">{m.member_name}</div>
                  {m.pending_count > 0 && (
                    <span className="px-2 py-0.5 bg-[#F97316] text-white text-[10px] font-bold rounded-full shrink-0">{m.pending_count} pending</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mb-2">{m.department || 'No department'}</div>
                <div className="text-lg font-bold text-gray-900 mb-3">{fmt(m.amount_spent)}</div>
                <div className="flex gap-2 text-[11px] font-semibold">
                  <span className="px-2 py-0.5 rounded-full border border-[#10B981] text-[#10B981]">Approved {m.approved_count}</span>
                  <span className="px-2 py-0.5 rounded-full border border-gray-300 text-gray-600">Entries {m.entries_count}</span>
                </div>
              </div>
            ))}
            {members.length === 0 && <div className="col-span-4 py-8 text-center text-gray-400 text-sm">No expense data found.</div>}
          </div>
        )}
      </div>

      {/* Recent Submissions / Member Detail Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-white">
          <h3 className="font-bold text-gray-800 text-[15px]">
            {selectedMemberId && memberDetail ? `${memberDetail.profile?.employee_name || 'Member'} â€” Expenses` : 'Recent Submissions'}
          </h3>
          <span className="text-xs text-gray-500 font-medium">
            {selectedMemberId && memberDetail
              ? `${memberDetail.expenses?.length ?? 0} entries`
              : `${visibleSubmissions.length} rows`}
          </span>
        </div>

        {(loading || memberLoading) ? (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">Loadingâ€¦</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[13px] text-gray-800 bg-white border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 font-semibold">Member</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                  <th className="px-5 py-3 font-semibold text-center">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {(selectedMemberId && memberDetail ? memberDetail.expenses || [] : visibleSubmissions).map(r => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 bg-white group">
                    <td className="px-5 py-4">
                      <div className="font-bold text-gray-800 text-[13px]">{r.member_name}</div>
                      <div className="text-xs text-gray-500">{r.department || 'No department'}</div>
                    </td>
                    <td className="px-5 py-4 text-gray-700 capitalize">{(r.category || '').replace(/_/g, ' ')}</td>
                    <td className="px-5 py-4 font-bold text-gray-900">{fmt(r.amount)}</td>
                    <td className="px-5 py-4 text-gray-700">{fmtDate(r.spent_on)}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full border text-xs font-medium ${STATUS_COLOR[r.status] || 'border-gray-200 text-gray-500 bg-gray-50'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {r.status === 'Submitted' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(r.id, 'dept_head_approved')}
                            disabled={acting === r.id}
                            className="flex items-center gap-1.5 px-3 py-1 border border-[#10B981] text-[#10B981] text-[11px] font-bold rounded hover:bg-green-50 transition-colors uppercase disabled:opacity-50"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" /> APPROVE
                          </button>
                          <button
                            onClick={() => handleAction(r.id, 'rejected', 'Rejected by HR')}
                            disabled={acting === r.id}
                            className="flex items-center gap-1.5 px-3 py-1 border border-red-300 text-red-500 text-[11px] font-bold rounded hover:bg-red-50 transition-colors uppercase disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" /> REJECT
                          </button>
                        </div>
                      ) : r.status === 'Dept Head Approved' ? (
                        <button
                          onClick={() => handleAction(r.id, 'finance_reviewed')}
                          disabled={acting === r.id}
                          className="flex items-center gap-1.5 px-3 py-1 border border-[#8B5CF6] text-[#8B5CF6] text-[11px] font-bold rounded hover:bg-purple-50 transition-colors uppercase disabled:opacity-50"
                        >
                          Finance Review
                        </button>
                      ) : r.status === 'Finance Reviewed' ? (
                        <button
                          onClick={() => handleAction(r.id, 'paid')}
                          disabled={acting === r.id}
                          className="flex items-center gap-1.5 px-3 py-1 border border-[#10B981] text-[#10B981] text-[11px] font-bold rounded hover:bg-green-50 transition-colors uppercase disabled:opacity-50"
                        >
                          Mark Paid
                        </button>
                      ) : r.status === 'Rejected' ? (
                        <span className="text-gray-400 text-xs" title={r.rejection_reason || ''}>{r.rejection_reason ? 'â„¹ï¸ ' + r.rejection_reason.slice(0, 25) : 'Rejected'}</span>
                      ) : (
                        <span className="text-gray-400 text-xs">â€”</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {r.receipt_url ? (
                        <a href={r.receipt_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#3B82F6] transition-colors p-1 inline-block">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="text-gray-300 p-1 inline-block"><ExternalLink className="w-4 h-4" /></span>
                      )}
                    </td>
                  </tr>
                ))}
                {((selectedMemberId && memberDetail ? memberDetail.expenses || [] : visibleSubmissions).length === 0) && (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">No expense entries found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
