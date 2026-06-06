'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getMeetings, createMeeting, getCalendarMeetings, getCalendarStatus } from '@/lib/hr-api';
import { RefreshCcw, ChevronLeft, ChevronRight, Video, ExternalLink } from 'lucide-react';

const EVENT_TYPES = ['event', 'birthday', 'holiday', 'big_sale', 'annual_event'];

// Format ISO date string to YYYY-MM-DD in local time
function toLocalDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function HRMeetingManager() {
  const [events, setEvents] = useState([]);               // company events
  const [calendarMeetings, setCalendarMeetings] = useState([]); // Google Calendar meetings
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Date state — default to today
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Form state
  const [form, setForm] = useState({
    title: '',
    event_type: 'event',
    start_date: toLocalDateStr(new Date()),
    end_date: '',
    description: '',
  });

  // Filter state
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const loadCompanyEvents = useCallback(async () => {
    try {
      const d = await getMeetings();
      setEvents(d?.events || []);
    } catch {}
  }, []);

  const loadCalendarMeetings = useCallback(async () => {
    try {
      const today = new Date();
      const start = toLocalDateStr(new Date(today.getFullYear(), today.getMonth() - 1, 1));
      const end = toLocalDateStr(new Date(today.getFullYear(), today.getMonth() + 3, 0));
      const meetings = await getCalendarMeetings(start, end);
      setCalendarMeetings(meetings);
    } catch {}
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes] = await Promise.allSettled([
        getCalendarStatus(),
      ]);
      if (statusRes.status === 'fulfilled') {
        setCalendarConnected(statusRes.value?.connected ?? false);
      }
      await Promise.allSettled([loadCompanyEvents(), loadCalendarMeetings()]);
    } finally {
      setLoading(false);
    }
  }, [loadCompanyEvents, loadCalendarMeetings]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createMeeting(form);
      setForm({ title: '', event_type: 'event', start_date: toLocalDateStr(selectedDate), end_date: '', description: '' });
      await loadCompanyEvents();
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
  const targetDateStr = toLocalDateStr(selectedDate);

  const dayEvents = filteredEvents.filter(e => e.start_date === targetDateStr);

  // Google Calendar meetings for the selected day
  const dayMeetings = calendarMeetings.filter(m => {
    if (!m.start) return false;
    const mDate = m.start.substring(0, 10);
    return mDate === targetDateStr;
  });

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
      <div className="bg-white rounded-xl border border-soft-border p-3 shadow-sm flex items-center gap-2 flex-wrap">
        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full border border-gray-200">
          My Calendar: {calendarConnected ? '✓ Connected' : '✗ Not connected'}
        </span>
        <span className="px-3 py-1 bg-trust-blue text-white text-xs font-semibold rounded-full">
          Meetings: {calendarMeetings.length}
        </span>
        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full border border-gray-200">
          Company Events: {events.length}
        </span>
        <button onClick={load} disabled={loading} className="ml-2 text-cool-gray hover:text-midnight-ink transition p-1 disabled:opacity-50">
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
        {!calendarConnected && (
          <a href="/frontend/my-desk" className="ml-auto text-xs text-trust-blue underline font-medium hover:text-blue-700">
            Connect Google Calendar in MyDesk →
          </a>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-soft-border p-3 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <input 
            type="text" placeholder="Search company events or meetings"
            value={search} onChange={e=>setSearch(e.target.value)} 
            className={inputCls} 
          />
        </div>
        <div className="flex items-center border border-soft-border rounded-md bg-white">
            <span className="text-[11px] font-medium uppercase text-cool-gray px-3 border-r border-soft-border">Event Type</span>
            <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} className="h-9 px-2 text-sm focus:outline-none bg-transparent">
              <option value="all">All Events</option>
              {EVENT_TYPES.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')}</option>)}
            </select>
        </div>
        <button onClick={()=>{setSearch('');setTypeFilter('all');}} className="text-trust-blue text-sm font-semibold hover:underline px-2">
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
                const dStr = toLocalDateStr(d);
                const hasMeeting = calendarMeetings.some(m => m.start && m.start.substring(0, 10) === dStr);
                const hasEvent = filteredEvents.some(e => e.start_date === dStr);
                
                return (
                  <button
                    key={dateNum}
                    onClick={() => {
                        setSelectedDate(d);
                        setForm(prev => ({...prev, start_date: toLocalDateStr(d)}));
                    }}
                    className={`
                      w-8 h-8 mx-auto rounded-md flex flex-col items-center justify-center transition text-[13px] relative
                      ${isSelected ? 'bg-blue-100 text-blue-700 font-bold border border-blue-200 shadow-sm' : 'hover:bg-gray-100'}
                      ${isToday && !isSelected ? 'text-trust-blue font-bold underline decoration-2 underline-offset-4' : ''}
                    `}
                  >
                    {dateNum}
                    {(hasMeeting || hasEvent) && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {hasMeeting && <span className="w-1 h-1 rounded-full bg-trust-blue" />}
                        {hasEvent && <span className="w-1 h-1 rounded-full bg-pink-500" />}
                      </span>
                    )}
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
                {dayMeetings.length} meetings
              </span>
            </div>
            {dayMeetings.length === 0 ? (
              <div className="p-4 text-[13px] text-cool-gray">
                No Google Calendar meetings found for this day.
              </div>
            ) : (
              <div className="divide-y divide-soft-border">
                {dayMeetings.map((m, idx) => {
                  const startTime = m.start ? new Date(m.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
                  const endTime = m.end ? new Date(m.end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
                  return (
                    <div key={m.id || idx} className="p-4 hover:bg-gray-50 transition">
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-bold text-[15px] text-midnight-ink">{m.title}</div>
                        {startTime && (
                          <span className="text-[11px] text-cool-gray font-medium whitespace-nowrap ml-2">
                            {startTime}{endTime ? ` – ${endTime}` : ''}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-cool-gray mb-2">
                        {m.calendar_owner && <>Calendar: {m.calendar_owner} &bull; </>}
                        {m.location && <>{m.location} &bull; </>}
                        Google Meet
                      </div>
                      {m.description && (
                        <div className="text-[13px] text-midnight-ink bg-gray-50 p-2 rounded border border-gray-100 mb-2">{m.description}</div>
                      )}
                      {m.meet_link && (
                        <a href={m.meet_link} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-trust-blue hover:underline">
                          Join Meeting
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
