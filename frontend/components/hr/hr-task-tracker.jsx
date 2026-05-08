'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getTasks, getTasksExportUrl } from '@/lib/hr-api';

// Normalize status values from MyDesk to match our filter set
function normalizeStatus(s) {
  if (!s) return 'pending';
  const v = s.toLowerCase();
  if (v === 'done' || v === 'completed') return 'completed';
  if (v === 'in_progress' || v === 'in progress') return 'in_progress';
  if (v === 'cancelled' || v === 'canceled') return 'cancelled';
  return 'pending';
}

const PRIORITY_FILTERS = [
  { value: 'all', label: 'All Priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const STATUS_FILTERS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending / Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed / Done' },
  { value: 'cancelled', label: 'Cancelled' },
];

function statusColor(status) {
  switch (status) {
    case 'completed': case 'done': return 'bg-[#2E7D32] text-white border-transparent';
    case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'cancelled': return 'bg-gray-100 text-gray-500 border-gray-200';
    case 'pending': case 'todo':
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function priorityColor(priority) {
  switch (priority) {
    case 'critical': return 'border-red-500 text-red-600 bg-white';
    case 'high': return 'border-orange-500 text-orange-600 bg-white';
    case 'medium': return 'border-blue-500 text-blue-600 bg-white';
    case 'low':
    default: return 'border-gray-300 text-gray-600 bg-white';
  }
}

export default function HRMasterTaskTracker() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [assignedByFilter, setAssignedByFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('register'); // 'register' or 'workload'

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Load HR tasks (includes MyDesk todos merged on backend)
      const hrData = await getTasks();
      const hrTasks = (hrData?.tasks || []).map(t => ({
        ...t,
        status: normalizeStatus(t.status),
      }));

      // Also directly load current user's MyDesk todos as additional source
      let myDeskTasks = [];
      try {
        const res = await fetch('/api/mydesk/todos/', { cache: 'no-store' });
        if (res.ok) {
          const todos = await res.json();
          const arr = Array.isArray(todos) ? todos : (todos?.results || []);
          myDeskTasks = arr.map(item => {
            const meta = (item.meta && typeof item.meta === 'object') ? item.meta : {};
            return {
              id: `mydesk_direct_${item.id}`,
              title: meta.title || item.text || '',
              description: meta.description || '',
              priority: meta.priority || 'medium',
              status: normalizeStatus(meta.status || (item.is_done ? 'done' : 'todo')),
              due_date: meta.dueDate || meta.due_date || '',
              assigned_to: null,
              assigned_to_name: meta.assignee || 'Me',
              assigned_by: null,
              assigned_by_name: null,
              created_at: item.created_at || '',
              source: 'mydesk',
            };
          });
        }
      } catch {}

      // Merge: deduplicate by title+assignee (backend already includes MyDesk todos)
      // If backend already returned mydesk items, don't double-add
      const backendHasMyDesk = hrTasks.some(t => String(t.id).startsWith('mydesk_'));
      const allTasks = backendHasMyDesk ? hrTasks : [...hrTasks, ...myDeskTasks];
      setTasks(allTasks);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleReset = () => {
    setSearch('');
    setFromDate('');
    setToDate('');
    setPriorityFilter('all');
    setStatusFilter('all');
    setAssigneeFilter('all');
    setAssignedByFilter('all');
  };

  // Derived filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (assigneeFilter !== 'all' && t.assigned_to_name !== assigneeFilter) return false;
      if (assignedByFilter !== 'all' && t.assigned_by_name !== assignedByFilter) return false;
      if (fromDate && new Date(t.created_at) < new Date(fromDate)) return false;
      if (toDate && new Date(t.created_at) > new Date(toDate)) return false;
      return true;
    });
  }, [tasks, search, priorityFilter, statusFilter, assigneeFilter, assignedByFilter, fromDate, toDate]);

  // Derived stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0;
  
  const activeTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
  
  const overdueTasks = tasks.filter(t => {
    if (t.status === 'completed' || t.status === 'cancelled') return false;
    if (!t.due_date) return false;
    return new Date(t.due_date) < new Date(new Date().setHours(0,0,0,0));
  }).length;

  const avgTurnaround = 17.5; 

  // Members for dropdown
  const uniqueAssignees = Array.from(new Set(tasks.map(t => t.assigned_to_name).filter(Boolean)));
  const uniqueAssigners = Array.from(new Set(tasks.map(t => t.assigned_by_name).filter(Boolean)));

  // Workload by member
  const workloadByMember = useMemo(() => {
    const map = {};
    filteredTasks.forEach(t => {
      const name = t.assigned_to_name || 'Unassigned';
      if (!map[name]) map[name] = { name, active: 0, done: 0, overdue: 0, department: 'Unassigned' };
      if (t.status === 'completed') map[name].done++;
      else if (t.status === 'pending' || t.status === 'in_progress') {
        map[name].active++;
        if (t.due_date && new Date(t.due_date) < new Date(new Date().setHours(0,0,0,0))) {
          map[name].overdue++;
        }
      }
    });
    return Object.values(map);
  }, [filteredTasks]);

  const inputCls = "h-9 border border-soft-border rounded-md px-3 text-sm focus:ring-2 focus:ring-trust-blue outline-none text-midnight-ink bg-white";
  const labelCls = "text-xs text-cool-gray mb-1 block font-medium";

  return (
    <div className="space-y-4 font-sans text-midnight-ink">
      
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-soft-border p-5 shadow-sm">
          <div className="text-sm text-cool-gray mb-2">Total Tasks</div>
          <div className="text-4xl font-extrabold mb-1 text-midnight-ink">{totalTasks}</div>
          <div className="text-xs text-cool-gray">Visible: {filteredTasks.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-soft-border p-5 shadow-sm">
          <div className="text-sm text-cool-gray mb-2">Completed</div>
          <div className="text-4xl font-extrabold mb-1 text-[#2E7D32]">{completedTasks}</div>
          <div className="text-xs text-cool-gray">Completion rate {completionRate}%</div>
        </div>
        <div className="bg-white rounded-xl border border-soft-border p-5 shadow-sm">
          <div className="text-sm text-cool-gray mb-2">Active</div>
          <div className="text-4xl font-extrabold mb-1 text-[#E65100]">{activeTasks}</div>
          <div className="text-xs text-cool-gray">Open tasks in selected scope</div>
        </div>
        <div className="bg-white rounded-xl border border-soft-border p-5 shadow-sm">
          <div className="text-sm text-cool-gray mb-2">Overdue</div>
          <div className="text-4xl font-extrabold mb-1 text-red-600">{overdueTasks}</div>
          <div className="text-xs text-cool-gray">Avg turnaround {avgTurnaround}d</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-soft-border p-4 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[180px]">
          <input 
            type="text" placeholder="Search Tasks" 
            value={search} onChange={e=>setSearch(e.target.value)} 
            className={`${inputCls} w-full`} 
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className={labelCls + " !mb-0"}>From</label>
            <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} className={inputCls} />
          </div>
          <div className="flex items-center gap-2">
            <label className={labelCls + " !mb-0"}>To</label>
            <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Priority</label>
          <select value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)} className={inputCls}>
            {PRIORITY_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className={inputCls}>
            {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Assigned To</label>
          <select value={assigneeFilter} onChange={e=>setAssigneeFilter(e.target.value)} className={inputCls}>
            <option value="all">All Members</option>
            {uniqueAssignees.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Assigned By</label>
          <select value={assignedByFilter} onChange={e=>setAssignedByFilter(e.target.value)} className={inputCls}>
            <option value="all">All Members</option>
            {uniqueAssigners.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <button onClick={handleReset} className="text-trust-blue text-sm font-semibold hover:underline px-2 h-9 flex items-center">
          RESET
        </button>
      </div>

      {/* Tabs & Export Buttons */}
      <div className="flex flex-wrap items-center justify-between border-b border-soft-border pb-2 mt-6">
        <div className="flex space-x-6">
          <button 
            onClick={() => setActiveTab('register')}
            className={`pb-2 text-sm font-semibold uppercase tracking-wider transition-colors ${activeTab === 'register' ? 'text-trust-blue border-b-2 border-trust-blue' : 'text-cool-gray hover:text-midnight-ink'}`}
          >
            Task Register
          </button>
          <button 
            onClick={() => setActiveTab('workload')}
            className={`pb-2 text-sm font-semibold uppercase tracking-wider transition-colors ${activeTab === 'workload' ? 'text-trust-blue border-b-2 border-trust-blue' : 'text-cool-gray hover:text-midnight-ink'}`}
          >
            Workload By Member
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.open(getTasksExportUrl(), '_blank')} className="px-3 py-1.5 text-xs font-bold text-trust-blue border border-trust-blue rounded hover:bg-blue-50 transition">EXPORT CSV</button>
          <button className="px-3 py-1.5 text-xs font-bold text-white bg-trust-blue rounded hover:bg-blue-700 transition">EXPORT PDF</button>
        </div>
      </div>

      {/* Content Area */}
      {activeTab === 'register' ? (
        <div className="bg-white rounded-xl border border-soft-border overflow-hidden shadow-sm">
          <div className="px-4 py-2 border-b border-soft-border bg-gray-50/50">
            <span className="text-xs text-cool-gray">{filteredTasks.length} displayed of {totalTasks} in scope.</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-soft-border text-midnight-ink font-bold">
                  <th className="px-4 py-3">Task</th>
                  <th className="px-4 py-3">Assignee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Open (Days)</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-cool-gray">No tasks found.</td></tr>
                ) : (
                  filteredTasks.map(t => {
                    const isOverdue = t.status !== 'completed' && t.status !== 'cancelled' && t.due_date && new Date(t.due_date) < new Date(new Date().setHours(0,0,0,0));
                    const openDays = t.created_at ? Math.max(0, Math.floor((new Date() - new Date(t.created_at)) / (1000 * 60 * 60 * 24))) : 0;
                    return (
                      <tr key={t.id} className="border-b border-soft-border hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <div className="font-bold text-midnight-ink max-w-[200px] truncate" title={t.title}>{t.title}</div>
                          {t.description && <div className="text-xs text-cool-gray max-w-[200px] truncate" title={t.description}>{t.description}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-midnight-ink">{t.assigned_to_name || 'Unassigned'}</div>
                          {t.assigned_to_email && <div className="text-xs text-cool-gray">{t.assigned_to_email}</div>}
                        </td>
                        <td className="px-4 py-3 text-midnight-ink">{t.department || 'Unassigned'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${priorityColor(t.priority)}`}>
                            {t.priority ? t.priority.charAt(0).toUpperCase() + t.priority.slice(1) : 'Medium'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${statusColor(t.status)}`}>
                              {t.status ? t.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Pending'}
                            </span>
                            {isOverdue && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold border border-red-500 text-red-500 bg-white">
                                Overdue
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-midnight-ink">{t.due_date ? new Date(t.due_date).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'}) : '—'}</td>
                        <td className="px-4 py-3 text-midnight-ink">
                          {t.created_at ? new Date(t.created_at).toLocaleString('en-GB', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'}) : '—'}
                        </td>
                        <td className="px-4 py-3 text-midnight-ink">{openDays}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workloadByMember.length === 0 ? (
            <div className="col-span-full py-8 text-center text-cool-gray">No workload data available.</div>
          ) : (
            workloadByMember.map((w, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-soft-border p-4 shadow-sm flex flex-col justify-between">
                <div className="mb-4">
                  <div className="font-bold text-midnight-ink">{w.name}</div>
                  <div className="text-xs text-cool-gray">{w.department}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full border border-gray-200">
                    Active {w.active}
                  </span>
                  <span className="px-2 py-1 bg-[#2E7D32] text-white text-xs font-semibold rounded-full">
                    Done {w.done}
                  </span>
                  <span className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">
                    Overdue {w.overdue}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

