'use client';

import { useState } from 'react';
import { RefreshCw, Menu } from 'lucide-react';

export default function HRDiaryTracker() {
  const teamMembers = [
    { name: 'Vishnu Gayethula', email: 'vishu2k3.janki@gmail.com', initials: 'VG', color: 'bg-[#3B82F6]' },
    { name: 'Aniruddh Janki', email: 'aniruddh.janki@gmail.com', initials: 'AJ', color: 'bg-[#3B82F6]' },
    { name: 'Kartik Sharma', email: 'kartik15.janki@gmail.com', initials: 'KS', color: 'bg-[#3B82F6]' },
    { name: 'Abhishek Rana', email: 'abhi.janki0@gmail.com', initials: 'AR', color: 'bg-[#3B82F6]' },
    { name: 'Jatin', email: 'jatin15.janki@gmail.com', initials: 'J', color: 'bg-[#3B82F6]' },
    { name: 'Apoorva Dixit', email: 'apoorva.janki@gmail.com', initials: 'AD', color: 'bg-[#3B82F6]' },
    { name: 'Nishanth Shahi', email: 'shahinishu52@gmail.com', initials: 'NS', color: 'bg-[#3B82F6]' },
    { name: 'Mohit', email: 'mohits.janki@gmail.com', initials: 'M', color: 'bg-[#3B82F6]' },
    { name: 'Deepak Vishwakarma', email: 'vdeepak.janki@gmail.com', initials: 'DV', color: 'bg-[#3B82F6]' },
    { name: 'Thorfinn', email: 'thorfinnn.thors@gmail.com', initials: 'T', color: 'bg-[#3B82F6]' },
    { name: 'Chaitanya Aggarwal', email: 'chaitanyaaggarwal.janki@gmail.com', initials: 'CA', color: 'bg-[#3B82F6]' },
  ];

  return (
    <div className="space-y-5 pb-20 relative min-h-screen">
      
      {/* Top Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-wrap gap-4 items-end">
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-4 py-2 border border-[#3B82F6] text-[#3B82F6] text-xs font-bold rounded hover:bg-blue-50 transition-colors uppercase">
            <RefreshCw className="w-3.5 h-3.5" /> REFRESH
          </button>
        </div>
        
        <div className="flex-1 flex flex-wrap gap-3">
          <div className="flex-1 min-w-[120px]">
            <div className="text-[11px] text-gray-500 mb-1 px-1">Start Date</div>
            <input type="date" defaultValue="2026-04-25" className="w-full h-9 px-3 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none bg-white text-gray-700" />
          </div>
          <div className="flex-1 min-w-[120px]">
            <div className="text-[11px] text-gray-500 mb-1 px-1">End Date</div>
            <input type="date" defaultValue="2026-05-02" className="w-full h-9 px-3 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none bg-white text-gray-700" />
          </div>
          
          {[
            ['Member', 'All Members'],
            ['Entry Type', 'All Types'],
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
          <div className="text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wide">TOTAL LOGGED HOURS</div>
          <div className="text-2xl font-bold text-[#3B82F6] mb-2">0.0h</div>
          <div className="text-xs text-gray-500">0 total entries</div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#10B981]"></div>
          <div className="text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wide">ACTIVE MEMBERS</div>
          <div className="text-2xl font-bold text-[#10B981] mb-2">0</div>
          <div className="text-xs text-gray-500">with log entries</div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#F97316]"></div>
          <div className="text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wide">TOTAL ENTRIES</div>
          <div className="text-2xl font-bold text-[#F97316] mb-2">0</div>
          <div className="text-xs text-gray-500">across all members</div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#8B5CF6]"></div>
          <div className="text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wide">AVG HOURS / ENTRY</div>
          <div className="text-2xl font-bold text-[#8B5CF6] mb-2">0.0h</div>
          <div className="text-xs text-gray-500">per log entry</div>
        </div>
      </div>

      {/* Team Members Grid */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden p-4">
        <div className="text-[13px] font-medium text-gray-500 mb-4 px-1">Team Members</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {teamMembers.map((m, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 shadow-sm transition-all bg-white">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-full ${m.color} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                  {m.initials}
                </div>
                <div className="overflow-hidden">
                  <div className="font-bold text-[13px] text-gray-800 truncate">{m.name}</div>
                  <div className="text-[11px] text-gray-500 truncate">{m.email}</div>
                </div>
              </div>
              <div className="text-lg font-bold text-gray-900 mb-2">0.0h</div>
              <div className="inline-flex px-2 py-0.5 rounded-full border border-gray-300 text-gray-600 text-[11px] font-medium">
                Entries 0
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Log Entries Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mt-4">
        <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-white">
          <h3 className="font-bold text-gray-800 text-[15px]">Recent Log Entries</h3>
          <span className="text-xs text-gray-500 font-medium">0 rows</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[13px] text-gray-800 bg-white border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 font-semibold">Member</th>
                <th className="px-5 py-3 font-semibold">Title</th>
                <th className="px-5 py-3 font-semibold">Hours</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Type</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-gray-500 text-sm">
                  No diary entries found for the selected filters.
                </td>
              </tr>
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
