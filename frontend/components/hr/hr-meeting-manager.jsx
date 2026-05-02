'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getMeetings, createMeeting } from '@/lib/hr-api';
import { RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react';

const EVENT_TYPES = ['event', 'birthday', 'holiday', 'big_sale', 'annual_event'];

export default function HRMeetingManager() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Date state
  const [selectedDate, setSelectedDate] = useState(new Date('2026-05-01'));
  const [currentMonth, setCurrentMonth] = useState(new Date('2026-05-01'));

  // Form state
  const [form, setForm] = useState({ title: '', event_type: 'event', start_date: '2026-05-01', end_date: '', description: '' });

  // Filter state
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [hostFilter, setHostFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try { 
      const d = await getMeetings(); 
      setEvents(d?.events || []); 
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createMeeting(form);
      setForm({ title: '', event_type: 'event', start_date: selectedDate.toISOString().split('T')[0], end_date: '', description: '' });
      await load();
    } finally { setSaving(false); }
  };

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== 'all' && e.event_type !== typeFilter) return false;
      return true;
    });
  }, [events, search, typeFilter]);

  // Filter events by selected date
  // Need to adjust date comparison to avoid timezone issues. We'll use simple string matching if possible.
  const selectedDateString = selectedDate.toLocaleDateString('en-CA'); // 'YYYY-MM-DD' in local time usually. Let's use custom formatting.
  const yearStr = selectedDate.getFullYear();
  const monthStr = String(selectedDate.getMonth() + 1).padStart(2, '0');
  const dayStr = String(selectedDate.getDate()).padStart(2, '0');
  const targetDateStr = `${yearStr}-${monthStr}-${dayStr}`;

  const dayEvents = filteredEvents.filter(e => e.start_date === targetDateStr);

  // Calendar generation
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  // Adjust so Monday is 0
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const todayMonth = () => {
    const d = new Date();
    setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setSelectedDate(d);
  };

  const inputCls = "h-9 border border-soft-border rounded-md px-3 text-sm focus:ring-2 focus:ring-trust-blue outline-none text-midnight-ink bg-white w-full";

  return (
    <div className="space-y-4 font-sans text-midnight-ink">
      
      {/* Top Stats */}
      <div className="bg-white rounded-xl border border-soft-border p-3 shadow-sm flex items-center gap-2">
        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full border border-gray-200">
          Team Members: 11
        </span>
        <span className="px-3 py-1 bg-trust-blue text-white text-xs font-semibold rounded-full">
          Connected Calendars: 10
        </span>
        <span className="px-3 py-1 bg-trust-blue text-white text-xs font-semibold rounded-full">
          Meetings: {events.length}
        </span>
        <button onClick={load} className="ml-2 text-cool-gray hover:text-midnight-ink transition p-1">
          <RefreshCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-soft-border p-3 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <input 
            type="text" placeholder="Search Meetings" 
            value={search} onChange={e=>setSearch(e.target.value)} 
            className={inputCls} 
          />
        </div>
        <div className="flex items-center border border-soft-border rounded-md bg-white">
            <span className="text-[11px] font-medium uppercase text-cool-gray px-3 border-r border-soft-border">Department</span>
            <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)} className="h-9 px-2 text-sm focus:outline-none bg-transparent">
              <option value="all">All Departments</option>
            </select>
        </div>
        <div className="flex items-center border border-soft-border rounded-md bg-white">
            <span className="text-[11px] font-medium uppercase text-cool-gray px-3 border-r border-soft-border">Host / Creator</span>
            <select value={hostFilter} onChange={e=>setHostFilter(e.target.value)} className="h-9 px-2 text-sm focus:outline-none bg-transparent">
              <option value="all">All Hosts</option>
            </select>
        </div>
        <div className="flex items-center border border-soft-border rounded-md bg-white">
            <span className="text-[11px] font-medium uppercase text-cool-gray px-3 border-r border-soft-border">Event Type</span>
            <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} className="h-9 px-2 text-sm focus:outline-none bg-transparent">
              <option value="all">All Events</option>
              {EVENT_TYPES.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')}</option>)}
            </select>
        </div>
        <button onClick={()=>{setSearch('');setDeptFilter('all');setHostFilter('all');setTypeFilter('all');}} className="text-trust-blue text-sm font-semibold hover:underline px-2">
          RESET
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 items-start">
        {/* Left Column */}
        <div className="space-y-4">
          
          {/* Calendar Widget */}
          <div className="bg-white rounded-xl border border-soft-border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-[15px]">
                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </div>
              <div className="flex items-center gap-1 text-cool-gray">
                <button onClick={prevMonth} className="hover:bg-gray-100 p-1.5 rounded-full transition"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={todayMonth} className="hover:bg-gray-100 p-1.5 rounded-full transition"><RefreshCcw className="w-3.5 h-3.5" /></button>
                <button onClick={nextMonth} className="hover:bg-gray-100 p-1.5 rounded-full transition"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 text-center text-xs font-semibold text-cool-gray mb-2">
              <div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div><div>S</div>
            </div>
            
            <div className="grid grid-cols-7 text-center text-sm gap-y-2">
              {Array.from({ length: startOffset }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dateNum = i + 1;
                const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dateNum);
                const isSelected = d.toDateString() === selectedDate.toDateString();
                const isToday = d.toDateString() === new Date().toDateString();
                
                return (
                  <button
                    key={dateNum}
                    onClick={() => {
                        setSelectedDate(d);
                        setForm(prev => ({...prev, start_date: d.toISOString().split('T')[0]}));
                    }}
                    className={`
                      w-8 h-8 mx-auto rounded-md flex items-center justify-center transition text-[13px]
                      ${isSelected ? 'bg-blue-100 text-blue-700 font-bold border border-blue-200 shadow-sm' : 'hover:bg-gray-100'}
                      ${isToday && !isSelected ? 'text-trust-blue font-bold underline decoration-2 underline-offset-4' : ''}
                    `}
                  >
                    {dateNum}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add Event Form */}
          <div className="bg-white rounded-xl border border-soft-border p-5 shadow-sm">
            <h3 className="font-bold text-midnight-ink mb-4 text-lg">Add Company Event</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input required placeholder="Event Title" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} className={inputCls} />
              </div>
              <div className="relative border border-soft-border rounded-md bg-white">
                <span className="absolute -top-2 left-2 bg-white px-1 text-[10px] text-cool-gray font-medium">Event Type</span>
                <select value={form.event_type} onChange={e=>setForm(p=>({...p,event_type:e.target.value}))} className="w-full h-10 px-3 text-sm focus:outline-none bg-transparent mt-0.5">
                  {EVENT_TYPES.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 relative border border-soft-border rounded-md bg-white min-w-0">
                  <span className="absolute -top-2 left-2 bg-white px-1 text-[10px] text-cool-gray font-medium whitespace-nowrap">Start Date</span>
                  <input type="date" required value={form.start_date} onChange={e=>setForm(p=>({...p,start_date:e.target.value}))} className="w-full h-10 px-1.5 text-[13px] focus:outline-none bg-transparent mt-0.5 text-midnight-ink" />
                </div>
                <div className="flex-1 relative border border-soft-border rounded-md bg-white min-w-0">
                  <span className="absolute -top-2 left-2 bg-white px-1 text-[10px] text-cool-gray font-medium whitespace-nowrap">End Date</span>
                  <input type="date" value={form.end_date} onChange={e=>setForm(p=>({...p,end_date:e.target.value}))} className="w-full h-10 px-1.5 text-[13px] focus:outline-none bg-transparent mt-0.5 text-midnight-ink" />
                </div>
              </div>
              <div>
                <textarea rows={3} placeholder="Description / Agenda" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} className={`${inputCls} resize-none h-auto py-2`} />
              </div>
              <button type="submit" disabled={saving} className="w-full py-2.5 bg-trust-blue text-white rounded-md text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition shadow-sm">
                {saving ? 'SAVING...' : 'ADD TO COMPANY CALENDAR'}
              </button>
            </form>
          </div>
          
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          
          {/* Meetings Section */}
          <div className="bg-white rounded-xl border border-soft-border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-soft-border">
              <h3 className="font-bold text-[17px] text-midnight-ink">Meetings On {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: '2-digit', year: 'numeric' })}</h3>
              <span className="px-2.5 py-0.5 bg-trust-blue text-white text-[11px] font-semibold rounded-full shadow-sm">
                0 meetings
              </span>
            </div>
            <div className="p-4 text-[13px] text-cool-gray">
              No meetings found for this day.
            </div>
          </div>

          {/* Events Section */}
          <div className="bg-white rounded-xl border border-soft-border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-soft-border">
              <h3 className="font-bold text-[17px] text-midnight-ink">Events On {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: '2-digit', year: 'numeric' })}</h3>
              <span className="px-2.5 py-0.5 bg-[#D81B60] text-white text-[11px] font-semibold rounded-full shadow-sm">
                {dayEvents.length} events
              </span>
            </div>
            <div className="p-0">
              {dayEvents.length === 0 ? (
                <div className="p-4 text-[13px] text-cool-gray">
                  No company-level events for this day.
                </div>
              ) : (
                <div className="divide-y divide-soft-border">
                  {dayEvents.map(evt => (
                    <div key={evt.id} className="p-4 hover:bg-gray-50 transition">
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-bold text-[15px] text-midnight-ink">{evt.title}</div>
                        <span className="text-[11px] uppercase tracking-wider font-bold text-trust-blue">
                          {evt.event_type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-cool-gray mb-3">
                        Created by {evt.created_by_name || 'System'}
                      </div>
                      {evt.description && (
                        <div className="text-[13px] text-midnight-ink bg-gray-50 p-3 rounded-lg border border-gray-100">
                          {evt.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
