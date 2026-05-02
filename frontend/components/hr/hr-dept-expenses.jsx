'use client';

import { useState } from 'react';
import { Building2, RefreshCw, Plus, Filter, Receipt, Menu, Calendar, Paperclip, FileText, Send } from 'lucide-react';

export default function HRDeptExpenses() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeStatus, setActiveStatus] = useState('All');

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
          <button className="text-gray-500 hover:text-gray-800 transition-colors">
            <RefreshCw className="w-5 h-5" />
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
          <div className="text-xl font-bold text-[#3B82F6]">₹0.00</div>
        </div>
        
        <div className="bg-[#FFF8F0] rounded-lg border border-orange-100 p-4 shadow-sm">
          <div className="text-xs font-semibold text-gray-600 mb-1">Pending Approval</div>
          <div className="text-xl font-bold text-[#F59E0B]">₹0.00</div>
        </div>
        
        <div className="bg-[#F0FDF4] rounded-lg border border-green-100 p-4 shadow-sm">
          <div className="text-xs font-semibold text-gray-600 mb-1">Approved</div>
          <div className="text-xl font-bold text-[#10B981]">₹0.00</div>
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
        <div className="text-xs text-gray-500 font-medium">0 records</div>
      </div>

      {/* Empty State */}
      <div className="py-20 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 bg-gray-100 text-gray-400 flex items-center justify-center rounded-lg mb-3">
          <Receipt className="w-6 h-6" />
        </div>
        <div className="text-sm text-gray-500 mb-4">No expenses found.</div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-[#3B82F6] text-sm font-medium rounded hover:bg-gray-50 transition-colors bg-white"
        >
          <Plus className="w-4 h-4" /> Add First Expense
        </button>
      </div>

      {/* Floating Action Button */}
      <button className="fixed bottom-6 right-6 w-12 h-12 bg-[#3B82F6] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600 transition-colors z-40">
        <Menu className="w-5 h-5" />
      </button>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            
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
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Date</label>
                  <div className="relative">
                    <input type="text" defaultValue="02-05-2026" className="w-full h-10 px-3 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none" />
                    <Calendar className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500 text-sm">₹</span>
                    <input type="text" className="w-full h-10 pl-7 pr-3 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Category *</label>
                <select className="w-full h-10 px-3 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none bg-white">
                  <option></option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Description</label>
                <input type="text" className="w-full h-10 px-3 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none" />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Payment Account</label>
                <select className="w-full h-10 px-3 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none bg-white">
                  <option></option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Receipt / Supporting Document (optional)</label>
                <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-[#3B82F6] text-xs font-semibold rounded bg-white hover:bg-gray-50 transition-colors">
                  <Paperclip className="w-3.5 h-3.5" /> Attach File
                </button>
              </div>

              <div className="bg-[#FFF8F0] border border-orange-100 rounded-lg p-3 mt-4 text-[11px] text-orange-800">
                This expense will be submitted to Finance for approval. It will appear in your department's expense register once reviewed.
              </div>

            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
              <button 
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => setShowAddModal(false)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#3B82F6] text-white text-sm font-semibold rounded hover:bg-blue-600 transition-colors"
              >
                <Send className="w-4 h-4" /> Submit to Finance
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
