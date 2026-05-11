'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Download, ThumbsUp, X, ExternalLink, Menu, Plus, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORY_OPTIONS = [
  { value: 'travel', label: 'Travel & Transport' },
  { value: 'food', label: 'Meals & Entertainment' },
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'software', label: 'Software & Subscriptions' },
  { value: 'equipment', label: 'Equipment & Hardware' },
  { value: 'marketing', label: 'Marketing & Advertising' },
  { value: 'training', label: 'Training & Development' },
  { value: 'courier', label: 'Courier & Shipping' },
  { value: 'misc', label: 'Miscellaneous' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'neft', label: 'NEFT' },
  { value: 'other', label: 'Other' },
];

export default function HRExpensesTracker() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Overview Filters
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [sortBy, setSortBy] = useState('Date: Newest');

  // Detail View State
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberDetail, setMemberDetail] = useState(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberCategory, setMemberCategory] = useState('all');
  const [memberStatus, setMemberStatus] = useState('all');

  // Add Expense Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    category: 'misc', amount: '', spent_on: '', department: '',
    notes: '', payment_method: 'cash', transaction_type: 'expense',
  });
  const [addFile, setAddFile] = useState(null);
  const [addSaving, setAddSaving] = useState(false);
  const [addTargetUserId, setAddTargetUserId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/hr/expenses/tracker/', window.location.origin);
      if (departmentFilter !== 'All Departments') {
        url.searchParams.set('department', departmentFilter);
      }
      const res = await fetch(url.toString());
      if (res.ok) {
        setData(await res.json());
      } else {
        toast.error('Failed to load expense tracker data');
      }
    } catch (err) {
      toast.error('Network error loading expenses');
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberDetail = async (userId) => {
    setMemberLoading(true);
    try {
      const url = new URL(`/api/hr/expenses/tracker/member/${userId}/`, window.location.origin);
      if (memberCategory !== 'all') url.searchParams.set('category', memberCategory);
      if (memberStatus !== 'all') url.searchParams.set('status', memberStatus);
      const res = await fetch(url.toString());
      if (res.ok) {
        setMemberDetail(await res.json());
      } else {
        toast.error('Failed to load member details');
      }
    } catch (err) {
      toast.error('Network error loading member details');
    } finally {
      setMemberLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [departmentFilter]);

  useEffect(() => {
    if (selectedMember) {
      fetchMemberDetail(selectedMember);
    }
  }, [selectedMember, memberCategory, memberStatus]);

  const handleApproval = async (expenseId, action) => {
    const statusMap = { approve: 'approved', reject: 'rejected' };
    try {
      const res = await fetch(`/api/hr/expenses/tracker/${expenseId}/approval/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusMap[action] || action })
      });
      if (res.ok) {
        toast.success(`Expense ${action === 'approve' ? 'approved' : 'rejected'}`);
        if (selectedMember) fetchMemberDetail(selectedMember);
        else fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData?.detail || `Failed to ${action} expense`);
      }
    } catch (err) {
      toast.error('Network error during approval');
    }
  };

  const openAddExpense = (userId = null) => {
    setAddTargetUserId(userId);
    setAddForm({
      category: 'misc', amount: '', spent_on: new Date().toISOString().split('T')[0],
      department: '', notes: '', payment_method: 'cash', transaction_type: 'expense',
    });
    setAddFile(null);
    setShowAddModal(true);
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!addForm.amount || !addForm.spent_on) {
      toast.error('Amount and date are required');
      return;
    }
    setAddSaving(true);
    try {
      const fd = new FormData();
      Object.entries(addForm).forEach(([k, v]) => fd.append(k, v));
      if (addFile) fd.append('receipt', addFile);
      const targetId = addTargetUserId || (selectedMember);
      const url = targetId
        ? `/api/hr/expenses/tracker/member/${targetId}/add/`
        : '/api/mydesk/expenses/';
      const res = await fetch(url, { method: 'POST', body: fd, credentials: 'include' });
      if (res.ok) {
        toast.success('Expense added successfully');
        setShowAddModal(false);
        if (selectedMember) fetchMemberDetail(selectedMember);
        else fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.detail || 'Failed to add expense');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setAddSaving(false);
    }
  };

  const handleRequestApproval = async () => {
    if (!selectedMember) return;
    try {
      const res = await fetch(`/api/hr/expenses/tracker/member/${selectedMember}/request-approval/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (res.ok) {
        toast.success('Drafts submitted for approval');
        fetchMemberDetail(selectedMember);
      } else {
        toast.error('Failed to submit drafts');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const summary = data?.summary || {
    total_submitted_amount: 0, pending_approval_amount: 0, 
    approved_amount: 0, rejected_amount: 0,
    total_entries: 0, pending_entries: 0, 
    approved_entries: 0, rejected_entries: 0
  };

  const members = data?.members || [];
  let recentSubmissions = data?.recent_submissions || [];
  
  if (statusFilter !== 'All Statuses') {
    recentSubmissions = recentSubmissions.filter(s => s.status.toLowerCase() === statusFilter.toLowerCase());
  }
  if (categoryFilter !== 'All Categories') {
    recentSubmissions = recentSubmissions.filter(s => s.category.toLowerCase() === categoryFilter.toLowerCase());
  }
  
  if (sortBy === 'Date: Newest') {
    recentSubmissions.sort((a, b) => new Date(b.spent_on) - new Date(a.spent_on));
  } else if (sortBy === 'Date: Oldest') {
    recentSubmissions.sort((a, b) => new Date(a.spent_on) - new Date(b.spent_on));
  } else if (sortBy === 'Amount: High to Low') {
    recentSubmissions.sort((a, b) => b.amount - a.amount);
  } else if (sortBy === 'Amount: Low to High') {
    recentSubmissions.sort((a, b) => a.amount - b.amount);
  }

  const departments = data?.departments?.map(d => d.label) || ['All Departments'];
  const statuses = ['All Statuses', 'submitted', 'approved', 'rejected'];
  const categories = ['All Categories', 'travel', 'food', 'equipment', 'misc'];

  // ADD EXPENSE MODAL
  const AddExpenseModal = () => (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-base">Add Expense {addTargetUserId ? 'on Behalf' : ''}</h2>
          <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleAddExpense} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Category</label>
              <select value={addForm.category} onChange={e => setAddForm(f => ({...f, category: e.target.value}))}
                className="w-full h-9 px-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none bg-white">
                {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Transaction Type</label>
              <select value={addForm.transaction_type} onChange={e => setAddForm(f => ({...f, transaction_type: e.target.value}))}
                className="w-full h-9 px-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none bg-white">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Amount (₹) *</label>
              <input type="number" step="0.01" required value={addForm.amount}
                onChange={e => setAddForm(f => ({...f, amount: e.target.value}))}
                className="w-full h-9 px-3 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none"
                placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Date *</label>
              <input type="date" required value={addForm.spent_on}
                onChange={e => setAddForm(f => ({...f, spent_on: e.target.value}))}
                className="w-full h-9 px-3 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Department</label>
              <input type="text" value={addForm.department}
                onChange={e => setAddForm(f => ({...f, department: e.target.value}))}
                className="w-full h-9 px-3 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none"
                placeholder="e.g. Sales" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Payment Method</label>
              <select value={addForm.payment_method} onChange={e => setAddForm(f => ({...f, payment_method: e.target.value}))}
                className="w-full h-9 px-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none bg-white">
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notes</label>
            <textarea value={addForm.notes} onChange={e => setAddForm(f => ({...f, notes: e.target.value}))}
              rows={2} className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none resize-none"
              placeholder="Optional notes..." />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Receipt / Bill</label>
            <input type="file" accept="image/*,.pdf" onChange={e => setAddFile(e.target.files[0])}
              className="w-full text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:border file:border-gray-300 file:rounded file:text-xs file:font-medium file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowAddModal(false)}
              className="flex-1 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={addSaving}
              className="flex-1 py-2 bg-[#3B82F6] text-white text-sm font-bold rounded hover:bg-blue-600 transition-colors disabled:opacity-50">
              {addSaving ? 'Saving...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // RENDERING DETAIL VIEW
  if (selectedMember) {
    return (
      <div className="space-y-4 pb-20 relative min-h-screen">
        {showAddModal && <AddExpenseModal />}
        <div className="flex justify-between items-center mb-4">
          <button 
            onClick={() => {
              setSelectedMember(null);
              setMemberDetail(null);
              setMemberCategory('all');
              setMemberStatus('all');
              fetchData();
            }} 
            className="text-[#3B82F6] font-medium text-sm flex items-center gap-1 hover:underline uppercase"
          >
            ← BACK TO OVERVIEW
          </button>
          <div className="flex items-center gap-3">
            <button onClick={() => openAddExpense(selectedMember)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3B82F6] text-white text-[11px] font-bold rounded hover:bg-blue-600 transition-colors uppercase">
              <Plus className="w-3 h-3" /> ADD EXPENSE
            </button>
            <div className="text-gray-400 text-xs uppercase tracking-wider">Member Expense Tracker</div>
          </div>
        </div>

        {memberLoading && !memberDetail ? (
           <div className="flex items-center justify-center p-20 text-gray-500 text-sm">Loading member details...</div>
        ) : memberDetail && (
           <div className="flex flex-col lg:flex-row gap-5">
             {/* LEFT PANEL */}
             <div className="w-full lg:w-[320px] shrink-0 space-y-5">
               <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                 <h2 className="text-lg font-bold text-gray-900 mb-1">{memberDetail.profile.employee_name}</h2>
                 <div className="text-xs text-gray-500 mb-4">{memberDetail.profile.designation}</div>
                 
                 <div className="space-y-2 text-[13px]">
                   <div className="flex justify-between"><span className="text-gray-500">Employee ID:</span> <span className="font-medium text-gray-800">{memberDetail.profile.employee_id || '-'}</span></div>
                   <div className="flex justify-between"><span className="text-gray-500">Email:</span> <span className="font-medium text-gray-800 truncate ml-4" title={memberDetail.profile.email}>{memberDetail.profile.email || '-'}</span></div>
                   <div className="flex justify-between"><span className="text-gray-500">Phone:</span> <span className="font-medium text-gray-800">{memberDetail.profile.phone || '-'}</span></div>
                   <div className="flex justify-between"><span className="text-gray-500">Joining Date:</span> <span className="font-medium text-gray-800">{memberDetail.profile.joining_date || '-'}</span></div>
                   <div className="flex justify-between"><span className="text-gray-500">Manager:</span> <span className="font-medium text-gray-800">{memberDetail.profile.manager || '-'}</span></div>
                   <div className="flex justify-between"><span className="text-gray-500">Department:</span> <span className="font-medium text-gray-800">{memberDetail.profile.department || '-'}</span></div>
                 </div>

                 <div className="flex flex-wrap gap-2 mt-5 mb-4">
                   <span className="px-2 py-0.5 rounded-full border border-[#3B82F6] text-[#3B82F6] text-[11px] font-semibold">Total ₹{Number(memberDetail.quick_stats.total_amount).toLocaleString()}</span>
                   <span className="px-2 py-0.5 rounded-full border border-gray-300 text-gray-600 text-[11px] font-semibold">Entries {memberDetail.quick_stats.entries}</span>
                   <span className="px-2 py-0.5 rounded-full border border-[#10B981] text-[#10B981] text-[11px] font-semibold">Approved {memberDetail.quick_stats.approved}</span>
                   {memberDetail.quick_stats.pending > 0 && (
                     <span className="px-2 py-0.5 rounded-full border border-[#F97316] text-[#F97316] text-[11px] font-semibold">Pending {memberDetail.quick_stats.pending}</span>
                   )}
                 </div>

                 <button onClick={handleRequestApproval} className="w-full py-2 border border-[#3B82F6] text-[#3B82F6] text-[11px] font-bold rounded hover:bg-blue-50 transition-colors uppercase">
                   SUBMIT DRAFTS FOR APPROVAL
                 </button>
               </div>

               <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                 <h3 className="font-bold text-gray-900 text-sm mb-4">Category Breakdown</h3>
                 <div className="space-y-4">
                   {memberDetail.category_breakdown.map(c => (
                     <div key={c.category}>
                       <div className="flex justify-between text-xs mb-1">
                         <span className="font-medium text-gray-700">{c.label}</span>
                         <span className="font-bold text-gray-900">₹{Number(c.amount).toLocaleString()}</span>
                       </div>
                       <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                         <div className="h-full bg-[#3B82F6]" style={{ width: `${c.percentage}%` }}></div>
                       </div>
                     </div>
                   ))}
                   {memberDetail.category_breakdown.length === 0 && (
                     <div className="text-xs text-gray-500">No data available</div>
                   )}
                 </div>
               </div>
             </div>

             {/* RIGHT PANEL - EXPENSES */}
             <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
               <div className="p-4 border-b border-gray-200 flex flex-wrap justify-between items-center gap-4">
                 <h3 className="font-bold text-gray-800 text-[15px]">Expense Entries</h3>
                 <div className="flex gap-2 items-center">
                   <div className="text-[10px] text-gray-500">Status</div>
                   <select 
                     value={memberStatus}
                     onChange={e => setMemberStatus(e.target.value)}
                     className="h-8 px-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none bg-white text-gray-700 capitalize"
                   >
                     {memberDetail.status_options.map(s => (
                       <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</option>
                     ))}
                   </select>
                   <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#3B82F6] text-[#3B82F6] text-[10px] font-bold rounded hover:bg-blue-50 transition-colors uppercase ml-2">
                     <Download className="w-3 h-3" /> EXPORT PDF
                   </button>
                 </div>
               </div>

               <div className="px-4 py-3 border-b border-gray-100 flex gap-2 flex-wrap bg-gray-50/50">
                 {memberDetail.available_categories.map(c => (
                   <button 
                     key={c}
                     onClick={() => setMemberCategory(c)}
                     className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors capitalize
                       ${memberCategory === c 
                         ? 'bg-[#3B82F6] border-[#3B82F6] text-white' 
                         : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                       }
                     `}
                   >
                     {c === 'all' ? 'All Categories' : c}
                   </button>
                 ))}
               </div>

               <div className="overflow-x-auto flex-1">
                 <table className="w-full text-sm text-left">
                   <thead className="text-[11px] text-gray-500 bg-white border-b border-gray-200 uppercase tracking-wider">
                     <tr>
                       <th className="px-4 py-3 font-semibold">Date</th>
                       <th className="px-4 py-3 font-semibold">Category / Dept</th>
                       <th className="px-4 py-3 font-semibold">Amount</th>
                       <th className="px-4 py-3 font-semibold text-center">Status & Trail</th>
                       <th className="px-4 py-3 font-semibold">Notes / GL</th>
                       <th className="px-4 py-3 font-semibold text-center">Receipt</th>
                       <th className="px-4 py-3 font-semibold">Actions</th>
                     </tr>
                   </thead>
                   <tbody>
                     {memberDetail.expenses.map(r => (
                       <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 bg-white group">
                         <td className="px-4 py-4 text-xs font-medium text-gray-900">{r.spent_on}</td>
                         <td className="px-4 py-4">
                           <div className="font-semibold text-gray-800 text-xs capitalize">{r.category}</div>
                           <div className="text-[10px] text-gray-500 mt-0.5">{r.department || '-'}</div>
                         </td>
                         <td className="px-4 py-4 font-bold text-gray-900 text-[13px]">₹{Number(r.amount).toLocaleString()}</td>
                         <td className="px-4 py-4">
                           <div className="flex flex-col items-center justify-center">
                             {r.status === 'Submitted' ? (
                               <span className="w-full max-w-[150px] text-center inline-block px-3 py-1 rounded-full border border-[#3B82F6] text-[#3B82F6] text-[10px] font-bold bg-blue-50/50 uppercase tracking-wide">
                                 {r.status}
                               </span>
                             ) : r.status === 'Approved' || r.status === 'Dept Head Approved' || r.status === 'Paid' ? (
                               <span className="w-full max-w-[150px] text-center inline-block px-3 py-1 rounded-full border border-[#10B981] text-[#10B981] text-[10px] font-bold bg-green-50/50 uppercase tracking-wide">
                                 {r.status}
                               </span>
                             ) : r.status === 'Finance Reviewed' ? (
                               <span className="w-full max-w-[150px] text-center inline-block px-3 py-1 rounded-full border border-[#E879F9] text-[#C026D3] text-[10px] font-bold bg-[#FDF4FF] uppercase tracking-wide">
                                 {r.status}
                               </span>
                             ) : r.status === 'Draft' ? (
                               <span className="w-full max-w-[150px] text-center inline-block px-3 py-1 rounded-full border border-gray-300 text-gray-500 text-[10px] font-bold bg-gray-50 uppercase tracking-wide">
                                 {r.status}
                               </span>
                             ) : (
                               <span className="w-full max-w-[150px] text-center inline-block px-3 py-1 rounded-full border border-red-300 text-red-500 text-[10px] font-bold bg-red-50/50 uppercase tracking-wide">
                                 {r.status}
                               </span>
                             )}
                             
                             {r.status !== 'Draft' && r.status !== 'Submitted' && (r.dept_approved_by || r.finance_reviewed_by || r.paid_by) && (
                               <div className="text-[9px] text-gray-500 mt-1.5 flex items-center gap-1 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded w-full max-w-[170px]">
                                 <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></div>
                                 <span className="truncate">by {r.finance_reviewed_by || r.dept_approved_by || r.paid_by} - {r.finance_reviewed_at || r.dept_approved_at || r.paid_at}</span>
                               </div>
                             )}
                           </div>
                         </td>
                         <td className="px-4 py-4">
                           <div className="text-xs text-gray-700 max-w-[120px] truncate" title={r.notes}>{r.notes || '-'}</div>
                           {r.finance_status && r.finance_status !== 'draft' && (
                             <div className="text-[9px] text-gray-400 mt-0.5 capitalize">{r.finance_status}</div>
                           )}
                         </td>
                         <td className="px-4 py-4 text-center">
                           {r.receipt_url ? (
                             <a href={r.receipt_url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-[#3B82F6] transition-colors p-1 inline-block">
                               <ExternalLink className="w-3.5 h-3.5" />
                             </a>
                           ) : (
                             <span className="text-gray-300 text-xs">-</span>
                           )}
                         </td>
                         <td className="px-4 py-4">
                           {r.status === 'Submitted' ? (
                             <div className="flex gap-2">
                               <button onClick={() => handleApproval(r.id, 'approve')} className="flex items-center gap-1.5 px-2.5 py-1 border border-[#10B981] text-[#10B981] text-[10px] font-bold rounded hover:bg-green-50 transition-colors uppercase">
                                 <ThumbsUp className="w-3 h-3" /> DEPT APPROVE
                               </button>
                               <button onClick={() => handleApproval(r.id, 'reject')} className="flex items-center gap-1.5 px-2.5 py-1 border border-red-300 text-red-500 text-[10px] font-bold rounded hover:bg-red-50 transition-colors uppercase">
                                 <X className="w-3 h-3" /> REJECT
                               </button>
                             </div>
                           ) : r.status === 'Dept Head Approved' ? (
                             <button onClick={() => handleApproval(r.id, 'reject')} className="flex items-center gap-1.5 px-2.5 py-1 border border-red-300 text-red-500 text-[10px] font-bold rounded hover:bg-red-50 transition-colors uppercase">
                               <X className="w-3 h-3" /> REJECT
                             </button>
                           ) : (
                             <span className="text-gray-400 text-[10px] font-medium">{r.status}</span>
                           )}
                         </td>
                       </tr>
                     ))}
                     {memberDetail.expenses.length === 0 && !memberLoading && (
                       <tr>
                         <td colSpan="7" className="px-4 py-8 text-center text-gray-500 text-sm">No expenses found for this selection.</td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
             </div>
           </div>
        )}
      </div>
    );
  }

  // RENDERING OVERVIEW
  return (
    <div className="space-y-5 pb-20 relative min-h-screen">
      {showAddModal && <AddExpenseModal />}
      
      {/* Top Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-wrap gap-4 items-end">
        <div className="flex gap-2">
          <button onClick={fetchData} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 border border-[#3B82F6] text-[#3B82F6] text-xs font-bold rounded hover:bg-blue-50 transition-colors uppercase disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> REFRESH
          </button>
          <button onClick={() => openAddExpense(null)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#3B82F6] text-white text-xs font-bold rounded hover:bg-blue-600 transition-colors uppercase">
            <Plus className="w-3.5 h-3.5" /> ADD EXPENSE
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 border border-[#3B82F6] text-[#3B82F6] text-xs font-bold rounded hover:bg-blue-50 transition-colors uppercase">
            <Download className="w-3.5 h-3.5" /> EXPORT PDF
          </button>
        </div>
        
        <div className="flex-1 flex flex-wrap gap-3">
          <div className="flex-1 min-w-[140px]">
            <div className="text-[11px] text-gray-500 mb-1 px-1">Department</div>
            <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)} className="w-full h-9 px-3 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none bg-white text-gray-700">
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <div className="text-[11px] text-gray-500 mb-1 px-1">Status</div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full h-9 px-3 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none bg-white text-gray-700 capitalize">
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <div className="text-[11px] text-gray-500 mb-1 px-1">Category</div>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full h-9 px-3 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none bg-white text-gray-700 capitalize">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <div className="text-[11px] text-gray-500 mb-1 px-1">Sort By</div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full h-9 px-3 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none bg-white text-gray-700">
              <option>Date: Newest</option>
              <option>Date: Oldest</option>
              <option>Amount: High to Low</option>
              <option>Amount: Low to High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#3B82F6]"></div>
          <div className="text-xs font-bold text-gray-500 mb-1 uppercase">TOTAL SUBMITTED</div>
          <div className="text-2xl font-bold text-[#3B82F6]">₹{Number(summary.total_submitted_amount).toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">{summary.total_entries} total entries</div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#F59E0B]"></div>
          <div className="text-xs font-bold text-gray-500 mb-1 uppercase">PENDING APPROVAL</div>
          <div className="text-2xl font-bold text-[#F59E0B]">₹{Number(summary.pending_approval_amount).toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">{summary.pending_entries} entries awaiting</div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#10B981]"></div>
          <div className="text-xs font-bold text-gray-500 mb-1 uppercase">APPROVED / PAID</div>
          <div className="text-2xl font-bold text-[#10B981]">₹{Number(summary.approved_amount).toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">{summary.approved_entries} entries cleared</div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#EF4444]"></div>
          <div className="text-xs font-bold text-gray-500 mb-1 uppercase">REJECTED</div>
          <div className="text-2xl font-bold text-[#EF4444]">₹{Number(summary.rejected_amount).toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">{summary.rejected_entries} entries declined</div>
        </div>
      </div>

      {/* Team Members Grid */}
      {members.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden p-4">
          <div className="flex justify-between items-center mb-3 px-1">
            <div className="text-sm font-medium text-gray-500">Team Members</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {members.map((m) => (
              <div 
                key={m.user_id} 
                onClick={() => setSelectedMember(m.user_id)}
                className={`border rounded-lg p-3 cursor-pointer transition-all border-gray-200 hover:border-[#3B82F6] hover:shadow-md bg-white group`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold text-[13px] text-gray-800 group-hover:text-[#3B82F6] transition-colors">{m.member_name}</div>
                  {m.pending_count > 0 && (
                    <span className="px-2 py-0.5 bg-[#F97316] text-white text-[10px] font-bold rounded-full">{m.pending_count} pending</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mb-2">{m.department || 'No department'}</div>
                <div className="text-lg font-bold text-gray-900 mb-3">₹{Number(m.amount_spent).toLocaleString()}</div>
                <div className="flex gap-2 text-[11px] font-semibold">
                  <span className="px-2 py-0.5 rounded-full border border-[#10B981] text-[#10B981]">Approved {m.approved_count}</span>
                  <span className="px-2 py-0.5 rounded-full border border-gray-300 text-gray-600">Entries {m.entries_count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Submissions Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-white">
          <h3 className="font-bold text-gray-800 text-[15px]">Recent Submissions</h3>
          <span className="text-xs text-gray-500 font-medium">{recentSubmissions.length} rows</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[13px] text-gray-800 bg-white border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 font-semibold">Member</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold text-center">Status</th>
                <th className="px-5 py-3 font-semibold">Actions</th>
                <th className="px-5 py-3 font-semibold text-center">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {recentSubmissions.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 bg-white group">
                  <td className="px-5 py-4 cursor-pointer hover:bg-gray-100" onClick={() => setSelectedMember(r.user_id)}>
                    <div className="font-bold text-[#3B82F6] hover:underline text-[13px]">{r.member_name}</div>
                    <div className="text-xs text-gray-500">{r.department || 'No department'}</div>
                  </td>
                  <td className="px-5 py-4 text-gray-700 capitalize">{r.category}</td>
                  <td className="px-5 py-4 font-bold text-gray-900">₹{Number(r.amount).toLocaleString()}</td>
                  <td className="px-5 py-4 text-gray-700">{r.spent_on}</td>
                  <td className="px-5 py-4 text-center">
                    {r.status === 'Submitted' ? (
                      <span className="w-full max-w-[130px] inline-block px-3 py-1 rounded-full border border-[#3B82F6] text-[#3B82F6] text-xs font-medium bg-blue-50/50">
                        {r.status}
                      </span>
                    ) : r.status === 'Approved' ? (
                      <span className="w-full max-w-[130px] inline-block px-3 py-1 rounded-full border border-[#10B981] text-[#10B981] text-xs font-medium bg-green-50/50">
                        {r.status}
                      </span>
                    ) : r.status === 'Finance Reviewed' ? (
                      <span className="w-full max-w-[130px] inline-block px-3 py-1 rounded-full border border-[#E879F9] text-[#C026D3] text-xs font-medium bg-[#FDF4FF]">
                        {r.status}
                      </span>
                    ) : (
                      <span className="w-full max-w-[130px] inline-block px-3 py-1 rounded-full border border-red-300 text-red-500 text-xs font-medium bg-red-50/50">
                        {r.status}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {r.status === 'Submitted' ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleApproval(r.id, 'approve')} className="flex items-center gap-1.5 px-3 py-1 border border-[#10B981] text-[#10B981] text-[11px] font-bold rounded hover:bg-green-50 transition-colors uppercase">
                          <ThumbsUp className="w-3.5 h-3.5" /> DEPT APPROVE
                        </button>
                        <button onClick={() => handleApproval(r.id, 'reject')} className="flex items-center gap-1.5 px-3 py-1 border border-red-300 text-red-500 text-[11px] font-bold rounded hover:bg-red-50 transition-colors uppercase">
                          <X className="w-3.5 h-3.5" /> REJECT
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs font-medium">{r.status}</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {r.receipt_url ? (
                      <a href={r.receipt_url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-[#3B82F6] transition-colors p-1 inline-block">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {recentSubmissions.length === 0 && !loading && (
                <tr>
                  <td colSpan="7" className="px-5 py-8 text-center text-gray-500 text-sm">
                    No expense entries found matching the criteria.
                  </td>
                </tr>
              )}
              {loading && recentSubmissions.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-5 py-8 text-center text-gray-500 text-sm">
                    Loading expenses...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Action Button */}
      <button className="fixed bottom-6 right-6 w-12 h-12 bg-[#3B82F6] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600 transition-colors z-40">
        <Menu className="w-5 h-5" />
      </button>

    </div>
  );
}

