'use client';

import { useState, useEffect, useRef } from 'react';
import { Building2, RefreshCw, Plus, Filter, Receipt, Menu, Calendar, Paperclip, FileText, Send, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  { id: 'travel', label: 'Travel & Transport' },
  { id: 'food', label: 'Meals & Entertainment' },
  { id: 'office_supplies', label: 'Office Supplies' },
  { id: 'software', label: 'Software & Subscriptions' },
  { id: 'equipment', label: 'Equipment & Hardware' },
  { id: 'marketing', label: 'Marketing & Advertising' },
  { id: 'training', label: 'Training & Development' },
  { id: 'courier', label: 'Courier & Shipping' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'maintenance', label: 'Repairs & Maintenance' },
  { id: 'vendor', label: 'Vendor Payments' },
  { id: 'misc', label: 'Miscellaneous' },
];

export default function HRDeptExpenses() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeStatus, setActiveStatus] = useState('All');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    category: '',
    description: '',
    paymentAccount: ''
  });
  const fileInputRef = useRef(null);
  const [selectedFileName, setSelectedFileName] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/hr/dept-expenses', window.location.origin);
      if (activeStatus !== 'All') {
        url.searchParams.set('status', activeStatus);
      }
      const res = await fetch(url.toString());
      if (res.ok) {
        setData(await res.json());
      } else {
        toast.error('Failed to load department expenses');
      }
    } catch (err) {
      toast.error('Network error loading expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.category) {
      toast.error('Please fill in required fields (Amount, Category)');
      return;
    }

    const payload = new FormData();
    payload.append('spent_on', formData.date);
    payload.append('amount', formData.amount);
    payload.append('category', formData.category);
    payload.append('notes', formData.description);
    payload.append('payment_method', formData.paymentAccount);
    
    if (fileInputRef.current && fileInputRef.current.files[0]) {
      payload.append('receipt', fileInputRef.current.files[0]);
    }

    try {
      const res = await fetch('/api/hr/dept-expenses', {
        method: 'POST',
        body: payload
      });
      if (res.ok) {
        toast.success('✅ Sent to Finance — visible on Department Dashboard');
        setShowAddModal(false);
        setFormData({
          date: new Date().toISOString().split('T')[0],
          amount: '',
          category: '',
          description: '',
          paymentAccount: ''
        });
        setSelectedFileName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchData();
      } else {
        let errMsg = 'Failed to submit expense';
        try {
          const error = await res.json();
          errMsg = error?.detail || error?.error?.message || error?.message || JSON.stringify(error);
        } catch (_) {}
        toast.error(errMsg);
      }
    } catch (err) {
      toast.error('Network error: ' + (err?.message || ''));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFileName(e.target.files[0].name);
    }
  };

  const summary = data?.summary || { total_submitted: 0, pending_approval: 0, approved: 0 };
  const expenses = data?.expenses || [];

  return (
    <div className="space-y-6 pb-20 relative min-h-screen bg-white p-6 rounded-lg border border-gray-200">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-3">
          <div className="mt-1 w-8 h-8 bg-blue-100 text-blue-600 flex items-center justify-center rounded">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Human Resources</h1>
            <p className="text-sm text-gray-500">Department Expenses</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={fetchData} disabled={loading} className="text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#3B82F6] text-white text-sm font-semibold rounded hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#F0F7FF] rounded-lg border border-blue-100 p-4 shadow-sm">
          <div className="text-xs font-semibold text-gray-600 mb-1">Total Submitted</div>
          <div className="text-xl font-bold text-[#3B82F6]">₹{Number(summary.total_submitted).toLocaleString()}</div>
        </div>
        
        <div className="bg-[#FFF8F0] rounded-lg border border-orange-100 p-4 shadow-sm">
          <div className="text-xs font-semibold text-gray-600 mb-1">Pending Approval</div>
          <div className="text-xl font-bold text-[#F59E0B]">₹{Number(summary.pending_approval).toLocaleString()}</div>
        </div>
        
        <div className="bg-[#F0FDF4] rounded-lg border border-green-100 p-4 shadow-sm">
          <div className="text-xs font-semibold text-gray-600 mb-1">Approved & Paid</div>
          <div className="text-xl font-bold text-[#10B981]">₹{Number(summary.approved).toLocaleString()}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between border-y border-gray-200 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm font-semibold">
            <Filter className="w-4 h-4" /> STATUS:
          </div>
          <div className="flex gap-2 text-sm font-medium">
            {['All', 'Pending', 'Approved', 'Rejected'].map(status => (
              <button 
                key={status}
                onClick={() => setActiveStatus(status)}
                className={`px-3 py-1 rounded-full border transition-colors ${
                  activeStatus === status 
                    ? 'bg-[#3B82F6] text-white border-[#3B82F6]' 
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
        <div className="text-xs text-gray-500 font-medium">{expenses.length} records</div>
      </div>

      {/* Expenses Table or Empty State */}
      {expenses.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm text-left">
            <thead className="text-[13px] text-gray-500 bg-gray-50 border-b border-gray-200 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Notes</th>
                <th className="px-5 py-3 font-semibold text-center">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-4 font-medium text-gray-900">{r.spent_on}</td>
                  <td className="px-5 py-4 text-gray-700 capitalize">{r.category}</td>
                  <td className="px-5 py-4 font-bold text-gray-900">₹{Number(r.amount).toLocaleString()}</td>
                  <td className="px-5 py-4">
                    {r.status === 'Submitted' || r.status === 'Draft' ? (
                      <span className="inline-block px-3 py-1 rounded-full border border-[#3B82F6] text-[#3B82F6] text-[10px] font-bold bg-blue-50/50 uppercase">
                        {r.status}
                      </span>
                    ) : r.status === 'Approved' || r.status === 'Dept Head Approved' || r.status === 'Paid' ? (
                      <span className="inline-block px-3 py-1 rounded-full border border-[#10B981] text-[#10B981] text-[10px] font-bold bg-green-50/50 uppercase">
                        {r.status}
                      </span>
                    ) : r.status === 'Finance Reviewed' ? (
                      <span className="inline-block px-3 py-1 rounded-full border border-[#E879F9] text-[#C026D3] text-[10px] font-bold bg-[#FDF4FF] uppercase">
                        {r.status}
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 rounded-full border border-red-300 text-red-500 text-[10px] font-bold bg-red-50/50 uppercase">
                        {r.status}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-600 max-w-xs truncate" title={r.notes}>{r.notes || '-'}</td>
                  <td className="px-5 py-4 text-center">
                    {r.receipt_url ? (
                      <a href={r.receipt_url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-[#3B82F6] transition-colors inline-block">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : (
                      <span className="text-gray-300 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-gray-100 text-gray-400 flex items-center justify-center rounded-lg mb-3">
            <Receipt className="w-6 h-6" />
          </div>
          <div className="text-sm text-gray-500 mb-4">{loading ? 'Loading...' : 'No expenses found.'}</div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-[#3B82F6] text-sm font-medium rounded hover:bg-gray-50 transition-colors bg-white"
          >
            <Plus className="w-4 h-4" /> Add First Expense
          </button>
        </div>
      )}

      {/* Floating Action Button */}
      <button className="fixed bottom-6 right-6 w-12 h-12 bg-[#3B82F6] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600 transition-colors z-40">
        <Menu className="w-5 h-5" />
      </button>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            
            <form onSubmit={handleSubmit}>
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-5 h-5 text-[#3B82F6]" />
                  <h2 className="text-lg font-bold text-gray-900">New Department Expense</h2>
                </div>
                <p className="text-xs text-gray-500">Human Resources</p>
              </div>
              
              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-4">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">Date *</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        required
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        className="w-full h-10 px-3 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">Amount (₹) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500 text-sm">₹</span>
                      <input 
                        type="number"
                        required
                        min="1"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        className="w-full h-10 pl-7 pr-3 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none" 
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Category *</label>
                  <select 
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full h-10 px-3 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none bg-white"
                  >
                    <option value="" disabled>Select a category</option>
                    {CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Description / Notes</label>
                  <input 
                    type="text" 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="E.g. Team lunch at XYZ"
                    className="w-full h-10 px-3 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Payment Method</label>
                  <select 
                    value={formData.paymentAccount}
                    onChange={(e) => setFormData({...formData, paymentAccount: e.target.value})}
                    className="w-full h-10 px-3 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none bg-white"
                  >
                    <option value="">(Not Specified)</option>
                    <option value="corporate_card">Corporate Credit Card</option>
                    <option value="bank_transfer">Bank Transfer / UPI</option>
                    <option value="cash">Petty Cash</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Receipt / Supporting Document (optional)</label>
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-[#3B82F6] text-xs font-semibold rounded bg-white hover:bg-gray-50 transition-colors"
                    >
                      <Paperclip className="w-3.5 h-3.5" /> Attach File
                    </button>
                    {selectedFileName && (
                      <span className="text-xs text-gray-600 truncate max-w-[200px]">{selectedFileName}</span>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange}
                      className="hidden" 
                      accept="image/*,.pdf"
                    />
                  </div>
                </div>

                <div className="bg-[#FFF8F0] border border-orange-100 rounded-lg p-3 mt-4 text-[11px] text-orange-800">
                  This expense will be submitted to Finance for approval. It will appear in your department's expense register once reviewed.
                </div>

              </div>
              
              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#3B82F6] text-white text-sm font-semibold rounded hover:bg-blue-600 transition-colors"
                >
                  <Send className="w-4 h-4" /> Submit to Finance
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
