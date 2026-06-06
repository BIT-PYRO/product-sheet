'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Menu, X, Clock, Calendar as CalendarIcon, FileText } from 'lucide-react';
import { listHrDiaryLogbooks } from '../mydesk/mydeskService';

export default function HRDiaryTracker() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ 
    summary: { 
      total_logged_hours: 0, 
      active_members: 0, 
      total_entries: 0, 
      avg_hours_per_entry: 0 
    }, 
    members: [] 
  });
  const [selectedMember, setSelectedMember] = useState(null);
  const [filters, setFilters] = useState({
    start_date: '2026-04-25',
    end_date: '2026-05-10',
    member: 'All Members',
    entry_type: 'All Types',
    sort_by: 'Date: Newest'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await listHrDiaryLogbooks({
        start_date: filters.start_date,
        end_date: filters.end_date
      });
      if (res.success) {
        setData({ summary: res.summary, members: res.members });
      }
    } catch (err) {
      console.error('Failed to fetch diary dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters.start_date, filters.end_date]);

  const teamMembers = data.members.map(m => ({
    ...m,
    initials: m.name.split(' ').map(n => n[0]).join('').toUpperCase(),
    color: 'bg-[#3B82F6]'
  }));

  const allRecentEntries = teamMembers
    .flatMap(m => m.recent_entries.map(e => ({ ...e, memberName: m.name })))
    .sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date));

  return (
    <div className="space-y-5 pb-20 relative min-h-screen">
      
      {/* Top Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-wrap gap-4 items-end">
        <div className="flex gap-2">
          <button 
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 border border-[#3B82F6] text-[#3B82F6] text-xs font-bold rounded hover:bg-blue-50 transition-colors uppercase disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> REFRESH
          </button>
        </div>
        
        <div className="flex-1 flex flex-wrap gap-3">
          <div className="flex-1 min-w-[120px]">
            <div className="text-[11px] text-gray-500 mb-1 px-1">Start Date</div>
            <input 
              type="date" 
              value={filters.start_date} 
              onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
              className="w-full h-9 px-3 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none bg-white text-gray-700" 
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <div className="text-[11px] text-gray-500 mb-1 px-1">End Date</div>
            <input 
              type="date" 
              value={filters.end_date} 
              onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
              className="w-full h-9 px-3 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#3B82F6] outline-none bg-white text-gray-700" 
            />
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
          <div className="text-2xl font-bold text-[#3B82F6] mb-2">{data.summary.total_logged_hours.toFixed(1)}h</div>
          <div className="text-xs text-gray-500">{data.summary.total_entries} total entries</div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#10B981]"></div>
          <div className="text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wide">ACTIVE MEMBERS</div>
          <div className="text-2xl font-bold text-[#10B981] mb-2">{data.summary.active_members}</div>
          <div className="text-xs text-gray-500">with log entries</div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#F97316]"></div>
          <div className="text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wide">TOTAL ENTRIES</div>
          <div className="text-2xl font-bold text-[#F97316] mb-2">{data.summary.total_entries}</div>
          <div className="text-xs text-gray-500">across all members</div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#8B5CF6]"></div>
          <div className="text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wide">AVG HOURS / ENTRY</div>
          <div className="text-2xl font-bold text-[#8B5CF6] mb-2">{data.summary.avg_hours_per_entry.toFixed(1)}h</div>
          <div className="text-xs text-gray-500">per log entry</div>
        </div>
      </div>

      {/* Team Members Grid */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden p-4">
        <div className="text-[13px] font-medium text-gray-500 mb-4 px-1">Team Members</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {teamMembers.map((m, i) => (
            <div 
              key={i} 
              onClick={() => setSelectedMember(m)}
              className="border border-gray-200 rounded-lg p-3 hover:border-[#3B82F6] hover:shadow-md cursor-pointer shadow-sm transition-all bg-white"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-full ${m.color} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                  {m.initials}
                </div>
                <div className="overflow-hidden">
                  <div className="font-bold text-[13px] text-gray-800 truncate">{m.name}</div>
                  <div className="text-[11px] text-gray-500 truncate">{m.email}</div>
                </div>
              </div>
              <div className="text-lg font-bold text-gray-900 mb-2">{m.total_hours.toFixed(1)}h</div>
              <div className="inline-flex px-2 py-0.5 rounded-full border border-gray-300 text-gray-600 text-[11px] font-medium">
                Entries {m.entry_count}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Log Entries Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mt-4">
        <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-white">
          <h3 className="font-bold text-gray-800 text-[15px]">Recent Log Entries</h3>
          <span className="text-xs text-gray-500 font-medium">{allRecentEntries.length} rows</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[13px] text-gray-800 bg-white border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 font-semibold">Member</th>
                <th className="px-5 py-3 font-semibold">Title</th>
                <th className="px-5 py-3 font-semibold">Hours</th>
                <th className="px-5 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {allRecentEntries.length > 0 ? (
                allRecentEntries.map((e, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium text-gray-900">{e.memberName}</td>
                    <td className="px-5 py-3 text-gray-600">{e.title}</td>
                    <td className="px-5 py-3 text-gray-600">{e.hours}h</td>
                    <td className="px-5 py-3 text-gray-600">{e.entry_date}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-500 text-sm">
                    No diary entries found for the selected filters.
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

      {/* Member Full Review Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full ${selectedMember.color} text-white flex items-center justify-center text-lg font-bold shadow-sm`}>
                  {selectedMember.initials}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedMember.name}</h2>
                  <p className="text-xs text-gray-500 font-medium">{selectedMember.email} • Full Review</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMember(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
              <div className="grid grid-cols-3 gap-4 mb-6">
                 <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center items-center">
                    <Clock className="w-6 h-6 text-blue-500 mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{selectedMember.total_hours.toFixed(1)}h</div>
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Logged</div>
                 </div>
                 <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center items-center">
                    <FileText className="w-6 h-6 text-orange-500 mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{selectedMember.entry_count}</div>
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Entries</div>
                 </div>
                 <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center items-center">
                    <CalendarIcon className="w-6 h-6 text-emerald-500 mb-2" />
                    <div className="text-lg font-bold text-gray-900">
                      {selectedMember.recent_entries[0]?.entry_date || '-'}
                    </div>
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Last Active</div>
                 </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                  <h3 className="font-bold text-sm text-gray-700">Detailed Logs</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {selectedMember.recent_entries.length > 0 ? (
                    selectedMember.recent_entries.map((entry, idx) => (
                      <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between mb-1">
                          <h4 className="font-bold text-gray-800 text-sm">{entry.title}</h4>
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{entry.hours}h</span>
                        </div>
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{entry.note}</p>
                        <div className="text-[10px] text-gray-400 font-medium">{entry.entry_date}</div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-400 text-sm italic">
                      No logs available for the selected period.
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3">
              <button 
                onClick={() => setSelectedMember(null)}
                className="px-5 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
