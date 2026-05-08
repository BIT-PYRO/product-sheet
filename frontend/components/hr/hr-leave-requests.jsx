'use client';
import { useState, useEffect, useCallback } from 'react';
import { getLeaveRequests, actionLeaveRequest } from '@/lib/hr-api';

const STATUS_COLOR = { pending:'bg-yellow-100 text-yellow-700', approved:'bg-green-100 text-green-700', rejected:'bg-red-100 text-red-700' };

export default function HRLeaveRequests() {
  const today = new Date();
  const pad = n => String(n).padStart(2,'0');
  const [month, setMonth] = useState(today.getMonth()+1);
  const [year, setYear] = useState(today.getFullYear());
  const monthToken = `${year}-${pad(month)}`;
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [rejectDialog, setRejectDialog] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing] = useState(null);

  const loadLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const params = { month: monthToken };
      if (statusFilter) params.status = statusFilter;
      const d = await getLeaveRequests(params);
      setLeaves(d?.rows || []);
    } catch {} finally { setLoading(false); }
  }, [monthToken, statusFilter]);

  useEffect(() => { loadLeaves(); }, [loadLeaves]);

  const approve = async (id) => {
    setActing(id);
    try { await actionLeaveRequest(id, { action: 'approve' }); await loadLeaves(); } finally { setActing(null); }
  };

  const thCls = 'px-3 py-2 text-left text-xs font-semibold text-cool-gray bg-cloud-gray border-b border-soft-border uppercase tracking-wide';
  const tdCls = 'px-3 py-2 text-sm border-b border-soft-border';

  return (
    <div className="bg-white rounded-xl border border-soft-border overflow-hidden">
      <div className="px-4 py-3 border-b border-soft-border flex flex-wrap gap-3 items-center justify-between">
        <h3 className="font-semibold text-midnight-ink">Leave Requests</h3>
        <div className="flex gap-2 flex-wrap">
          <select value={month} onChange={e=>setMonth(Number(e.target.value))} className="h-9 px-3 text-sm border border-soft-border rounded-lg focus:ring-2 focus:ring-trust-blue outline-none">
            {Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{new Date(2000,i,1).toLocaleString(undefined,{month:'short'})}</option>)}
          </select>
          <select value={year} onChange={e=>setYear(Number(e.target.value))} className="h-9 px-3 text-sm border border-soft-border rounded-lg focus:ring-2 focus:ring-trust-blue outline-none">
            {[today.getFullYear()-1,today.getFullYear(),today.getFullYear()+1].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="h-9 px-3 text-sm border border-soft-border rounded-lg focus:ring-2 focus:ring-trust-blue outline-none">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button onClick={loadLeaves} className="px-3 py-1.5 border border-soft-border text-sm text-midnight-ink rounded-lg hover:bg-cloud-gray transition">Refresh</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        {loading ? <div className="px-4 py-10 text-center text-cool-gray text-sm">Loading…</div> :
        <table className="w-full">
          <thead><tr>{['Employee','Type','From','To','Days','Reason','Status','Action'].map(h=><th key={h} className={thCls}>{h}</th>)}</tr></thead>
          <tbody>
            {leaves.map(lr => {
              const days = Math.max(1, Math.round((new Date(lr.end_date+'T00:00:00') - new Date(lr.start_date+'T00:00:00')) / 86400000) + 1);
              return <tr key={lr.id} className="hover:bg-cloud-gray/50">
                <td className={`${tdCls} font-medium`}>{lr.requested_by_name}</td>
                <td className={tdCls}><span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">{lr.leave_type?.replace(/_/g,' ')}</span></td>
                <td className={tdCls}>{lr.start_date}</td>
                <td className={tdCls}>{lr.end_date}</td>
                <td className={`${tdCls} text-center font-medium`}>{days}</td>
                <td className={`${tdCls} max-w-[180px]`}><span className="text-xs text-cool-gray truncate block" title={lr.reason}>{lr.reason||'—'}</span></td>
                <td className={tdCls}><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[lr.status]||'bg-gray-100 text-gray-600'}`}>{lr.status}</span></td>
                <td className={tdCls}>
                  {lr.status==='pending' && <div className="flex gap-1">
                    <button onClick={()=>approve(lr.id)} disabled={acting===lr.id} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50 transition">Approve</button>
                    <button onClick={()=>{setRejectDialog(lr);setRejectReason('');}} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition">Reject</button>
                  </div>}
                  {lr.status==='rejected' && lr.decline_reason && <span className="text-xs text-cool-gray" title={lr.decline_reason}>ℹ️ {lr.decline_reason.slice(0,30)}</span>}
                </td>
              </tr>;
            })}
            {leaves.length===0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-cool-gray text-sm">No leave requests found</td></tr>}
          </tbody>
        </table>}
      </div>

      {rejectDialog && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-midnight-ink mb-1">Reject Leave Request</h3>
            <p className="text-sm text-cool-gray mb-4">{rejectDialog.requested_by_name} — {rejectDialog.leave_type}</p>
            <label className="text-xs font-medium text-cool-gray mb-1 block">Reason for rejection</label>
            <textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)} rows={3} className="w-full border border-soft-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-trust-blue outline-none resize-none mb-4" placeholder="Enter reason…" />
            <div className="flex gap-2">
              <button onClick={()=>setRejectDialog(null)} className="flex-1 py-2 border border-soft-border rounded-lg text-sm text-cool-gray hover:bg-cloud-gray transition">Cancel</button>
              <button onClick={async()=>{setActing(rejectDialog.id);await actionLeaveRequest(rejectDialog.id,{action:'reject',decline_reason:rejectReason});setRejectDialog(null);setActing(null);loadLeaves();}} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
