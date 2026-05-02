'use client';

import { useState } from 'react';
import { RefreshCw, Download, ThumbsUp, X, ExternalLink, Menu } from 'lucide-react';

export default function HRExpensesTracker() {
  const [selectedMember, setSelectedMember] = useState('Kartik Sharma');

  const teamMembers = [
    { name: 'Deepak Vishwakarma', pending: 12, dept: 'No department', amount: '₹3,954', approved: 0, entries: 12 },
    { name: 'Jatin', pending: 6, dept: 'No department', amount: '₹4,039', approved: 0, entries: 6 },
    { name: 'Kartik Sharma', pending: 4, dept: 'No department', amount: '₹10,050', approved: 3, entries: 7 },
    { name: 'Vishnu Gayethula', pending: 1, dept: 'No department', amount: '₹2,599', approved: 3, entries: 4 },
    { name: 'Aniruddh Janki', pending: 0, dept: 'No department', amount: '₹1,450', approved: 0, entries: 1 },
    { name: 'Chaitanya Aggarwal', pending: 0, dept: 'No department', amount: '₹767', approved: 2, entries: 2 },
    { name: 'Thorfinn', pending: 0, dept: 'No department', amount: '₹0', approved: 0, entries: 0 },
    { name: 'Nishanth Shahi', pending: 0, dept: 'No department', amount: '₹0', approved: 0, entries: 0 },
    { name: 'Mohit', pending: 0, dept: 'No department', amount: '₹0', approved: 0, entries: 0 },
    { name: 'Apoorva Dixit', pending: 0, dept: 'No department', amount: '₹0', approved: 0, entries: 0 },
    { name: 'Abhishek Rana', pending: 0, dept: 'No department', amount: '₹0', approved: 0, entries: 0 },
  ];

  const recentSubmissions = [
    { member: 'Aniruddh Janki', category: 'misc', amount: '₹1,450', date: 'May 01, 2026', status: 'Rejected' },
    { member: 'Deepak Vishwakarma', category: 'food', amount: '₹210', date: 'Apr 29, 2026', status: 'Submitted' },
    { member: 'Kartik Sharma', category: 'misc', amount: '₹3,000', date: 'Apr 29, 2026', status: 'Submitted' },
    { member: 'Kartik Sharma', category: 'misc', amount: '₹3,650', date: 'Apr 28, 2026', status: 'Submitted' },
    { member: 'Kartik Sharma', category: 'food', amount: '₹250', date: 'Apr 28, 2026', status: 'Submitted' },
    { member: 'Kartik Sharma', category: 'food', amount: '₹650', date: 'Apr 27, 2026', status: 'Submitted' },
    { member: 'Deepak Vishwakarma', category: 'food', amount: '₹160', date: 'Apr 25, 2026', status: 'Submitted' },
    { member: 'Deepak Vishwakarma', category: 'food', amount: '₹150', date: 'Apr 24, 2026', status: 'Submitted' },
  ];

  return (
    <div className="space-y-5 pb-20 relative min-h-screen">
      
      {/* Top Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-wrap gap-4 items-end">
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-4 py-2 border border-[#3B82F6] text-[#3B82F6] text-xs font-bold rounded hover:bg-blue-50 transition-colors uppercase">
            <RefreshCw className="w-3.5 h-3.5" /> REFRESH
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 border border-[#3B82F6] text-[#3B82F6] text-xs font-bold rounded hover:bg-blue-50 transition-colors uppercase">
            <Download className="w-3.5 h-3.5" /> EXPORT PDF
          </button>
        </div>
        
        <div className="flex-1 flex flex-wrap gap-3">
          {[
            ['Department', 'All Departments'],
            ['Status', 'All Statuses'],
            ['Category', 'All Categories'],
            ['Timeline', 'All Time'],
            ['Sort By', 'Date: Newest'],
          ].map(([label, val]) => (
            <div key={label} className="flex-1 min-w-[140px]">
              <div className="text-[11px] text-gray-500 mb-1 px-1">{label}</div>
              <select className="w-full h-9 px-3 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none bg-white text-gray-700">
                <option>{val}</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#3B82F6]"></div>
          <div className="text-xs font-bold text-gray-500 mb-1 uppercase">TOTAL SUBMITTED</div>
          <div className="text-2xl font-bold text-[#3B82F6]">₹22,859</div>
          <div className="text-xs text-gray-500 mt-1">32 total entries</div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#F59E0B]"></div>
          <div className="text-xs font-bold text-gray-500 mb-1 uppercase">PENDING APPROVAL</div>
          <div className="text-2xl font-bold text-[#F59E0B]">₹16,843</div>
          <div className="text-xs text-gray-500 mt-1">23 entries awaiting</div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#10B981]"></div>
          <div className="text-xs font-bold text-gray-500 mb-1 uppercase">APPROVED / PAID</div>
          <div className="text-2xl font-bold text-[#10B981]">₹4,566</div>
          <div className="text-xs text-gray-500 mt-1">8 entries cleared</div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#EF4444]"></div>
          <div className="text-xs font-bold text-gray-500 mb-1 uppercase">REJECTED</div>
          <div className="text-2xl font-bold text-[#EF4444]">₹1,450</div>
          <div className="text-xs text-gray-500 mt-1">1 entries declined</div>
        </div>
      </div>

      {/* Team Members Grid */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden p-4">
        <div className="text-sm font-medium text-gray-500 mb-3 px-1">Team Members</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {teamMembers.map((m, i) => (
            <div 
              key={i} 
              onClick={() => setSelectedMember(m.name)}
              className={`border rounded-lg p-3 cursor-pointer transition-all
                ${selectedMember === m.name 
                  ? 'border-[#3B82F6] shadow-[0_0_0_1px_rgba(59,130,246,1)]' 
                  : 'border-gray-200 hover:border-gray-300 shadow-sm'
                }
              `}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="font-semibold text-[13px] text-gray-800">{m.name}</div>
                {m.pending > 0 && (
                  <span className="px-2 py-0.5 bg-[#F97316] text-white text-[10px] font-bold rounded-full">{m.pending} pending</span>
                )}
              </div>
              <div className="text-xs text-gray-500 mb-2">{m.dept}</div>
              <div className="text-lg font-bold text-gray-900 mb-3">{m.amount}</div>
              <div className="flex gap-2 text-[11px] font-semibold">
                <span className="px-2 py-0.5 rounded-full border border-[#10B981] text-[#10B981]">Approved {m.approved}</span>
                <span className="px-2 py-0.5 rounded-full border border-gray-300 text-gray-600">Entries {m.entries}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Submissions Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-white">
          <h3 className="font-bold text-gray-800 text-[15px]">Recent Submissions</h3>
          <span className="text-xs text-gray-500 font-medium">32 rows</span>
        </div>
        
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
              {recentSubmissions.map((r, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 bg-white group">
                  <td className="px-5 py-4">
                    <div className="font-bold text-gray-800 text-[13px]">{r.member}</div>
                    <div className="text-xs text-gray-500">No department</div>
                  </td>
                  <td className="px-5 py-4 text-gray-700">{r.category}</td>
                  <td className="px-5 py-4 font-bold text-gray-900">{r.amount}</td>
                  <td className="px-5 py-4 text-gray-700">{r.date}</td>
                  <td className="px-5 py-4">
                    {r.status === 'Submitted' ? (
                      <span className="inline-flex px-3 py-1 rounded-full border border-[#3B82F6] text-[#3B82F6] text-xs font-medium bg-blue-50/50">
                        {r.status}
                      </span>
                    ) : (
                      <span className="inline-flex px-3 py-1 rounded-full border border-red-300 text-red-500 text-xs font-medium bg-red-50/50">
                        {r.status}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {r.status === 'Submitted' ? (
                      <div className="flex gap-2">
                        <button className="flex items-center gap-1.5 px-3 py-1 border border-[#10B981] text-[#10B981] text-[11px] font-bold rounded hover:bg-green-50 transition-colors uppercase">
                          <ThumbsUp className="w-3.5 h-3.5" /> DEPT APPROVE
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-1 border border-red-300 text-red-500 text-[11px] font-bold rounded hover:bg-red-50 transition-colors uppercase">
                          <X className="w-3.5 h-3.5" /> REJECT
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">Rejected</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button className="text-gray-400 hover:text-[#3B82F6] transition-colors p-1">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
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
