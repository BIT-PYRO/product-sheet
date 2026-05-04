'use client';
import { useState, useEffect, useCallback } from 'react';
import { getAttendanceToday, saveAttendanceToday, getMonthlyRegister, getEmployeeSummary, getRegularizationQueue, actionRegularization, overrideAttendance, getAttendanceRulebook, saveAttendanceRulebook, getAttendanceScores, getLeaveRequests, actionLeaveRequest } from '@/lib/hr-api';
import { Edit2 } from 'lucide-react';

const STATUS_OPTS = ['Absent','Present','Half Day','WFH','Leave','On Duty'];
const STATUS_OPTS_VAL = { 'Absent':'absent', 'Present':'present', 'Half Day':'half_day', 'WFH':'wfh', 'Leave':'leave', 'On Duty':'on_duty' };
const STATUS_COLOR = { present:'text-green-600 border-green-300', absent:'text-red-400 border-red-300', half_day:'text-yellow-500 border-yellow-300', wfh:'text-blue-500 border-blue-300', leave:'text-gray-500 border-gray-300', on_duty:'text-purple-500 border-purple-300' };
const STATUS_SHORT = { present:'P', absent:'A', half_day:'H', wfh:'W', on_duty:'OD', leave:'L' };

function Badge({ status }) {
  const map = { pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' };
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${map[status] || 'bg-gray-100 text-gray-500'}`}>{status || '—'}</span>;
}

function monthName(i) { return new Date(2000,i,1).toLocaleString(undefined,{month:'short'}); }
function monthFullName(i) { return new Date(2000,i,1).toLocaleString(undefined,{month:'long'}); }

export default function HRAttendanceDashboard() {
  const today = new Date(); 
  const pad = n => String(n).padStart(2,'0');
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
  const [tab, setTab] = useState(0);
  const [date, setDate] = useState(todayStr);
  const [month, setMonth] = useState(today.getMonth()+1);
  const [year, setYear] = useState(today.getFullYear());
  const monthToken = `${year}-${pad(month)}`;

  // Today
  const [todayData, setTodayData] = useState({rows:[]});
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Register
  const [register, setRegister] = useState({days:[],rows:[]});
  const [regLoading, setRegLoading] = useState(false);
  
  // Summary
  const [summary, setSummary] = useState([]);
  const [sumLoading, setSumLoading] = useState(false);
  
  // Regularizations
  const [regs, setRegs] = useState([]);
  const [regsLoading, setRegsLoading] = useState(false);
  const [regsFilter, setRegsFilter] = useState('pending');
  
  // Scores
  const [scores, setScores] = useState([]);
  const [scoresLoading, setScoresLoading] = useState(false);

  // Leave Requests
  const [leaves, setLeaves] = useState([]);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [leaveStatus, setLeaveStatus] = useState('pending');

  // Rulebook dialog
  const [rulebookUser, setRulebookUser] = useState(null);
  const [rulebookData, setRulebookData] = useState({});

  const [error, setError] = useState('');

  const loadToday = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await getAttendanceToday(date);
      const rows = data?.rows || [];
      const d = {};
      rows.forEach(r => { d[r.user_id] = { status: r.status||'absent', in_time: r.in_time||'09:30', out_time: r.out_time||'18:30', note: r.note||'', override: r.override_reason||'' }; });
      setTodayData({rows}); setDrafts(d);
    } catch(e) { setError(e.message||'Failed to load'); } finally { setLoading(false); }
  }, [date]);

  const loadRegister = useCallback(async () => {
    setRegLoading(true);
    try { setRegister(await getMonthlyRegister(monthToken) || {days:[],rows:[]}); } catch{} finally { setRegLoading(false); }
  }, [monthToken]);

  const loadSummary = useCallback(async () => {
    setSumLoading(true);
    try { const d = await getEmployeeSummary(monthToken); setSummary(d?.rows||[]); } catch{} finally { setSumLoading(false); }
  }, [monthToken]);

  const loadRegs = useCallback(async () => {
    setRegsLoading(true);
    try { const d = await getRegularizationQueue({approval_status:regsFilter,month:monthToken}); setRegs(d?.rows||[]); } catch{} finally { setRegsLoading(false); }
  }, [regsFilter, monthToken]);

  const loadScores = useCallback(async () => {
    setScoresLoading(true);
    try { const d = await getAttendanceScores(monthToken); setScores(d?.rows||[]); } catch{} finally { setScoresLoading(false); }
  }, [monthToken]);

  const loadLeaves = useCallback(async () => {
    setLeavesLoading(true);
    try { const d = await getLeaveRequests({status:leaveStatus,month:monthToken}); setLeaves(d?.rows||d||[]); } catch{} finally { setLeavesLoading(false); }
  }, [leaveStatus, monthToken]);

  useEffect(() => { if(tab===0) loadToday(); }, [tab, loadToday]);
  useEffect(() => { if(tab===1) loadRegister(); }, [tab, loadRegister]);
  useEffect(() => { if(tab===2) loadSummary(); }, [tab, loadSummary]);
  useEffect(() => { if(tab===3) loadRegs(); }, [tab, loadRegs]);
  useEffect(() => { if(tab===4) loadScores(); }, [tab, loadScores]);
  useEffect(() => { if(tab===5) loadLeaves(); }, [tab, loadLeaves]);

  const updateDraft = (uid, key, val) => setDrafts(p => ({...p, [uid]: {...(p[uid]||{}), [key]: val}}));

  const saveToday = async () => {
    setSaving(true);
    try {
      const rows = todayData.rows.map(r => {
        const d = drafts[r.user_id]||{};
        return { user_id: r.user_id, status: d.status, in_time: d.in_time, out_time: d.out_time, note: d.note, override_reason: d.override };
      });
      await saveAttendanceToday(date, rows); await loadToday();
    } finally { setSaving(false); }
  };

  const TABS = ['TODAY\'S MARKING','MONTHLY REGISTER','EMPLOYEE SUMMARY','REGULARIZATIONS','ATTENDANCE SCORES','LEAVE REQUESTS'];

  const thCls = 'px-4 py-3 text-left text-[13px] font-bold text-gray-800 bg-white border-b-2 border-gray-100';
  const tdCls = 'px-4 py-3 text-sm text-gray-800 border-b border-gray-100';

  return (
    <div className="bg-[#f4f6f8] min-h-[calc(100vh-64px)] flex flex-col">
      <div className="bg-white mx-4 mt-4 rounded-t-lg shadow-sm">
        {/* Controls Row */}
        <div className="flex gap-4 p-4 border-b border-gray-100">
          <div className="relative border border-gray-200 rounded px-3 py-1.5 flex items-center bg-white h-[42px] min-w-[160px] focus-within:border-blue-500 transition-colors">
            <label className="absolute -top-2.5 left-2 bg-white px-1 text-[11px] text-gray-500 font-medium">Date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="outline-none text-sm w-full bg-transparent text-gray-700" />
          </div>
          <div className="relative border border-gray-200 rounded px-3 py-1.5 flex items-center bg-white h-[42px] min-w-[120px] focus-within:border-blue-500 transition-colors">
            <label className="absolute -top-2.5 left-2 bg-white px-1 text-[11px] text-gray-500 font-medium">Month</label>
            <select value={month} onChange={e=>setMonth(Number(e.target.value))} className="outline-none text-sm w-full bg-transparent text-gray-700 appearance-none">
              {Array.from({length:12},(_,i) => <option key={i+1} value={i+1}>{monthFullName(i)}</option>)}
            </select>
            <div className="absolute right-3 pointer-events-none text-gray-400 text-xs">▼</div>
          </div>
          <div className="relative border border-gray-200 rounded px-3 py-1.5 flex items-center bg-white h-[42px] min-w-[100px] focus-within:border-blue-500 transition-colors">
            <label className="absolute -top-2.5 left-2 bg-white px-1 text-[11px] text-gray-500 font-medium">Year</label>
            <select value={year} onChange={e=>setYear(Number(e.target.value))} className="outline-none text-sm w-full bg-transparent text-gray-700 appearance-none">
              {[today.getFullYear()-1,today.getFullYear(),today.getFullYear()+1].map(y=><option key={y} value={y}>{y}</option>)}
            </select>
            <div className="absolute right-3 pointer-events-none text-gray-400 text-xs">▼</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-6 overflow-x-auto border-b border-gray-200">
          {TABS.map((t,i) => (
            <button key={i} onClick={()=>setTab(i)} className={`py-3 text-[13px] font-semibold tracking-wide border-b-2 transition-colors whitespace-nowrap ${tab===i?'border-[#1976d2] text-[#1976d2]':'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="mx-4 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>}

      {/* Content Area */}
      <div className="flex-1 px-4 py-4 overflow-hidden flex flex-col">
        {/* Today tab */}
        {tab===0 && (
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 shrink-0">
              <h2 className="text-[16px] font-bold text-gray-800">Today's Attendance ({monthFullName(new Date(date).getMonth())} {new Date(date).getDate().toString().padStart(2,'0')}, {new Date(date).getFullYear()})</h2>
              <button onClick={saveToday} disabled={loading||saving} className="bg-[#1976d2] text-white px-4 py-2 rounded text-[13px] font-semibold hover:bg-[#1565c0] transition disabled:opacity-50 tracking-wide shadow-sm">
                {saving ? 'SAVING...' : 'SAVE TODAY'}
              </button>
            </div>
            <div className="flex-1 overflow-auto border-t border-gray-100">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"><tr>{['Employee','Status','In','Out','Note','Override'].map(h=><th key={h} className={thCls}>{h}</th>)}</tr></thead>
                <tbody>
                  {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">Loading...</td></tr>}
                  {!loading && todayData.rows.length===0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">No employees found</td></tr>}
                  {todayData.rows.map(emp => {
                    const d = drafts[emp.user_id]||{};
                    return <tr key={emp.user_id} className="hover:bg-gray-50/50">
                      <td className={tdCls}>
                        <div className="font-semibold text-[14px] text-gray-900">{emp.employee_name}</div>
                        <div className="text-[12px] text-gray-400 mt-0.5">{emp.email}</div>
                      </td>
                      <td className={tdCls}>
                        <div className="relative">
                          <select value={d.status||'absent'} onChange={e=>updateDraft(emp.user_id,'status',e.target.value)} className="w-[120px] border border-gray-300 rounded px-3 py-2 text-[13px] text-gray-700 outline-none appearance-none bg-white hover:border-gray-400 focus:border-[#1976d2] transition-colors">
                            {STATUS_OPTS.map(s=><option key={s} value={STATUS_OPTS_VAL[s]}>{s}</option>)}
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 text-[10px]">▼</div>
                        </div>
                      </td>
                      <td className={tdCls}>
                        <div className="flex items-center gap-2 border border-gray-300 rounded px-2 py-1.5 w-[115px] bg-white hover:border-gray-400 focus-within:border-[#1976d2] transition-colors">
                          <input type="time" value={d.in_time||'09:30'} onChange={e=>updateDraft(emp.user_id,'in_time',e.target.value)} className="w-full text-[13px] text-gray-700 outline-none bg-transparent" />
                        </div>
                      </td>
                      <td className={tdCls}>
                        <div className="flex items-center gap-2 border border-gray-300 rounded px-2 py-1.5 w-[115px] bg-white hover:border-gray-400 focus-within:border-[#1976d2] transition-colors">
                          <input type="time" value={d.out_time||'18:30'} onChange={e=>updateDraft(emp.user_id,'out_time',e.target.value)} className="w-full text-[13px] text-gray-700 outline-none bg-transparent" />
                        </div>
                      </td>
                      <td className={tdCls}>
                        <input type="text" value={d.note||''} onChange={e=>updateDraft(emp.user_id,'note',e.target.value)} placeholder="Client visit / duty note" className="w-[180px] border border-gray-300 rounded px-3 py-2 text-[13px] text-gray-700 outline-none placeholder-gray-400 hover:border-gray-400 focus:border-[#1976d2] transition-colors" />
                      </td>
                      <td className={tdCls}>
                        <input type="text" value={d.override||''} onChange={e=>updateDraft(emp.user_id,'override',e.target.value)} placeholder="Optional note" className="w-[140px] border border-gray-300 rounded px-3 py-2 text-[13px] text-gray-700 outline-none placeholder-gray-400 hover:border-gray-400 focus:border-[#1976d2] transition-colors" />
                      </td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Monthly Register tab */}
        {tab===1 && (
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <h2 className="text-[16px] font-bold text-gray-800 p-4 shrink-0">Monthly Register ({monthFullName(month-1)} {year})</h2>
            <div className="flex-1 overflow-auto border-t border-gray-100">
              {regLoading ? <div className="px-4 py-8 text-center text-gray-500 text-sm">Loading...</div> :
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"><tr>
                  <th className={`${thCls} sticky left-0 z-20 min-w-[160px] shadow-[1px_0_0_#f3f4f6]`}>Employee</th>
                  {(register.days||[]).map(d=><th key={d} className={`${thCls} text-center px-1.5 text-gray-500 font-semibold`}>{new Date(d+'T00:00:00').getDate().toString().padStart(2,'0')}</th>)}
                  {['Present','Half','WFH','Leave','Absent','Payable'].map(h=><th key={h} className={`${thCls} text-center`}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {(register.rows||[]).map(row=><tr key={row.user_id} className="hover:bg-gray-50/50">
                    <td className={`${tdCls} sticky left-0 bg-white font-semibold text-[13px] z-10 shadow-[1px_0_0_#f3f4f6]`}>{row.employee_name}</td>
                    {(row.cells||[]).map(c=><td key={c.date} className={`${tdCls} text-center px-1.5`}>
                      {c.status ? <span className={`inline-flex items-center justify-center w-[22px] h-[22px] rounded-full border text-[10px] font-bold ${STATUS_COLOR[c.status]||'border-gray-300 text-gray-400'}`}>{STATUS_SHORT[c.status]||'?'}</span> : <span className="text-gray-300 text-[10px]">·</span>}
                    </td>)}
                    {[row.totals?.present,row.totals?.half_day,row.totals?.wfh,row.totals?.leave,row.totals?.absent,row.totals?.payable_days].map((v,i)=><td key={i} className={`${tdCls} text-center text-[13px] ${i===5?'font-bold text-gray-900':'text-gray-700'}`}>{v||0}</td>)}
                  </tr>)}
                  {(register.rows||[]).length===0 && <tr><td colSpan={99} className="px-4 py-8 text-center text-gray-500 text-sm">No data</td></tr>}
                </tbody>
              </table>}
            </div>
          </div>
        )}

        {/* Summary tab */}
        {tab===2 && (
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <h2 className="text-[16px] font-bold text-gray-800 p-4 shrink-0">Payroll Summary ({monthFullName(month-1)} {year})</h2>
            <div className="flex-1 overflow-auto border-t border-gray-100">
              {sumLoading ? <div className="px-4 py-8 text-center text-gray-500 text-sm">Loading...</div> :
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"><tr>{['Employee','Payable Days','Present','Half Day','WFH','Leave','Absent','Late Marks','Deduction Days'].map(h=><th key={h} className={thCls}>{h}</th>)}</tr></thead>
                <tbody>
                  {summary.map(r=><tr key={r.user_id} className="hover:bg-gray-50/50">
                    <td className={`${tdCls} font-semibold text-[13px]`}>{r.employee_name}</td>
                    <td className={`${tdCls} font-bold text-center text-gray-900`}>{r.payable_days}</td>
                    <td className={`${tdCls} text-center`}>{r.present_days}</td><td className={`${tdCls} text-center`}>{r.half_days}</td><td className={`${tdCls} text-center`}>{r.wfh_days}</td>
                    <td className={`${tdCls} text-center`}>{r.leave_days}</td><td className={`${tdCls} text-center`}>{r.absent_days}</td><td className={`${tdCls} text-center`}>{r.late_marks}</td>
                    <td className={`${tdCls} text-center`}>{parseFloat(r.deduction_days||0).toFixed(2)}</td>
                  </tr>)}
                  {summary.length===0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500 text-sm">No data</td></tr>}
                </tbody>
              </table>}
            </div>
          </div>
        )}

        {/* Regularizations tab */}
        {tab===3 && (
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 shrink-0">
              <h2 className="text-[16px] font-bold text-gray-800">Regularization Queue</h2>
              <div className="flex border border-gray-300 rounded overflow-hidden">
                {['pending','approved','rejected'].map(f=><button key={f} onClick={()=>setRegsFilter(f)} className={`px-4 py-1.5 text-[11px] font-bold tracking-wider uppercase transition ${regsFilter===f?'bg-blue-50 text-[#1976d2] border-b-2 border-[#1976d2]':'bg-white text-gray-500 hover:bg-gray-50 border-b-2 border-transparent'} ${f!=='pending'?'border-l border-gray-200':''}`}>{f}</button>)}
              </div>
            </div>
            <div className="flex-1 overflow-auto border-t border-gray-100">
              {regsLoading ? <div className="px-4 py-8 text-center text-gray-500 text-sm">Loading...</div> :
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"><tr>{['Employee','Date','In / Out','Auto Status','Reason','Status','Action'].map(h=><th key={h} className={thCls}>{h}</th>)}</tr></thead>
                <tbody>
                  {regs.map(r=><tr key={r.id} className="hover:bg-gray-50/50">
                    <td className={`${tdCls} font-semibold text-[13px]`}>{r.employee_name}</td>
                    <td className={tdCls}>{r.entry_date}</td>
                    <td className={tdCls}>{r.in_time||'—'} / {r.out_time||'—'}</td>
                    <td className={tdCls}><span className="text-gray-600 font-medium text-[13px]">{r.auto_status?.replace(/_/,' ')}</span></td>
                    <td className={`${tdCls} max-w-[250px] truncate text-gray-600 text-[13px]`} title={r.regularization_reason}>{r.regularization_reason||'—'}</td>
                    <td className={tdCls}><Badge status={r.approval_status} /></td>
                    <td className={tdCls}>{r.approval_status==='pending' ? <div className="flex gap-2">
                      <button onClick={async()=>{await actionRegularization(r.id,{action:'approve'});loadRegs();}} className="text-xs px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded font-semibold hover:bg-green-100 transition shadow-sm">Approve</button>
                      <button onClick={async()=>{await actionRegularization(r.id,{action:'reject',reason:'Rejected'});loadRegs();}} className="text-xs px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded font-semibold hover:bg-red-100 transition shadow-sm">Reject</button>
                    </div> : <span className="text-gray-400 text-xs">—</span>}</td>
                  </tr>)}
                  {regs.length===0 && <tr><td colSpan={7} className="px-5 py-6 text-gray-500 text-[13px]">No {regsFilter} regularizations found.</td></tr>}
                </tbody>
              </table>}
            </div>
          </div>
        )}

        {/* Scores tab */}
        {tab===4 && (
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <h2 className="text-[16px] font-bold text-gray-800 p-4 shrink-0">Attendance Scores — {monthFullName(month-1)} {year}</h2>
            <div className="flex-1 overflow-auto border-t border-gray-100">
              {scoresLoading ? <div className="px-4 py-8 text-center text-gray-500 text-sm">Loading...</div> :
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"><tr>{['Employee','Score','Absent Days','Late Marks','Rulebook'].map((h,i)=><th key={h} className={`${thCls} ${i===1||i===2||i===3?'text-center':''}`}>{h}</th>)}</tr></thead>
                <tbody>
                  {scores.map(r=>{
                    const color = r.score>=90?'bg-[#4caf50]':r.score>=75?'bg-[#ff9800]':'bg-[#f44336]';
                    const textColor = r.score>=90?'text-[#4caf50]':r.score>=75?'text-[#ff9800]':'text-[#f44336]';
                    return <tr key={r.user_id} className="hover:bg-gray-50/50">
                      <td className={`${tdCls} font-semibold text-[13px]`}>{r.employee_name}</td>
                      <td className={tdCls}>
                        <div className="flex items-center justify-center gap-3 w-[180px] mx-auto">
                          <div className="w-full bg-gray-200 rounded-full h-[6px]"><div className={`${color} h-[6px] rounded-full`} style={{width:`${r.score}%`}} /></div>
                          <span className={`text-[13px] font-bold w-8 text-right ${textColor}`}>{r.score}%</span>
                        </div>
                      </td>
                      <td className={`${tdCls} text-center`}>{r.absent_count}</td>
                      <td className={`${tdCls} text-center`}>{r.late_count}</td>
                      <td className={tdCls}><button onClick={async()=>{const rb=await getAttendanceRulebook(r.user_id).catch(()=>({}));setRulebookData(rb||{});setRulebookUser(r);}} className="text-[12px] font-bold px-3 py-1.5 border border-[#1976d2] text-[#1976d2] rounded flex items-center gap-1.5 hover:bg-blue-50 transition uppercase tracking-wide"><Edit2 className="w-3.5 h-3.5" /> Edit Rulebook</button></td>
                    </tr>;
                  })}
                  {scores.length===0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">No data</td></tr>}
                </tbody>
              </table>}
            </div>
          </div>
        )}

        {/* Leave Requests tab */}
        {tab===5 && (
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 shrink-0 border-b border-gray-100">
              <h2 className="text-[16px] font-bold text-gray-800">Leave Requests — {monthFullName(month-1)} {year}</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <select value={leaveStatus} onChange={e=>setLeaveStatus(e.target.value)} className="w-[140px] border border-gray-300 rounded px-3 py-1.5 text-[13px] text-gray-700 outline-none appearance-none bg-white focus:border-[#1976d2] transition-colors">
                    <option value="pending">Status (Pending)</option>
                    <option value="approved">Status (Approved)</option>
                    <option value="rejected">Status (Rejected)</option>
                    <option value="">Status (All)</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 text-[10px]">▼</div>
                </div>
                <button onClick={loadLeaves} className="border border-[#1976d2] text-[#1976d2] px-4 py-1.5 rounded text-[12px] font-bold hover:bg-blue-50 transition uppercase tracking-wide">
                  REFRESH
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {leavesLoading ? <div className="px-4 py-8 text-center text-gray-500 text-sm">Loading...</div> :
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"><tr>{['Employee','Type','From','To','Days','Reason','Status','Submitted','Actions'].map(h=><th key={h} className={thCls}>{h}</th>)}</tr></thead>
                <tbody>
                  {leaves.map(l=><tr key={l.id} className="hover:bg-gray-50/50">
                    <td className={`${tdCls} font-semibold text-[13px]`}>{l.employee_name}</td>
                    <td className={`${tdCls} text-[13px]`}>{l.leave_type?.replace(/_/g,' ').toUpperCase()}</td>
                    <td className={`${tdCls} text-[13px]`}>{l.start_date}</td>
                    <td className={`${tdCls} text-[13px]`}>{l.end_date}</td>
                    <td className={`${tdCls} text-[13px]`}>{l.leave_days}</td>
                    <td className={`${tdCls} text-[13px] max-w-[200px] truncate`} title={l.reason}>{l.reason}</td>
                    <td className={tdCls}><Badge status={l.status} /></td>
                    <td className={`${tdCls} text-[13px] text-gray-500`}>{new Date(l.created_at).toLocaleDateString()}</td>
                    <td className={tdCls}>{l.status==='pending' ? <div className="flex gap-2">
                      <button onClick={async()=>{await actionLeaveRequest(l.id,{action:'approve'});loadLeaves();}} className="text-xs px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded font-semibold hover:bg-green-100 transition shadow-sm">Approve</button>
                      <button onClick={async()=>{await actionLeaveRequest(l.id,{action:'reject',reject_reason:'Rejected'});loadLeaves();}} className="text-xs px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded font-semibold hover:bg-red-100 transition shadow-sm">Reject</button>
                    </div> : <span className="text-gray-400 text-xs">—</span>}</td>
                  </tr>)}
                  {leaves.length===0 && <tr><td colSpan={9} className="px-5 py-6 text-gray-500 text-[13px]">No leave requests found.</td></tr>}
                </tbody>
              </table>}
            </div>
          </div>
        )}

      </div>

      {/* Rulebook Dialog */}
      {rulebookUser && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 backdrop-blur-[1px]">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-[600px] p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 border-b border-gray-100 pb-4">Edit Attendance Rulebook — {rulebookUser.employee_name}</h3>
            
            <div className="grid grid-cols-2 gap-x-5 gap-y-6">
              <div className="relative border border-gray-300 rounded px-3 py-2 flex items-center bg-white h-[48px] focus-within:border-[#1976d2] focus-within:ring-1 focus-within:ring-[#1976d2] transition-all">
                <label className="absolute -top-2.5 left-2 bg-white px-1 text-[11px] text-gray-500 font-medium">Shift Start</label>
                <div className="flex items-center w-full">
                  <input type="time" value={rulebookData.shift_start||'09:30'} onChange={e=>setRulebookData(p=>({...p,shift_start:e.target.value}))} className="outline-none text-[14px] w-full bg-transparent text-gray-800" />
                </div>
              </div>

              <div className="relative border border-[#1976d2] rounded px-3 py-2 flex items-center bg-white h-[48px] ring-1 ring-[#1976d2] shadow-[0_0_0_2px_rgba(25,118,210,0.1)] transition-all">
                <label className="absolute -top-2.5 left-2 bg-white px-1 text-[11px] text-[#1976d2] font-semibold">Shift End</label>
                <div className="flex items-center w-full">
                  <input type="time" value={rulebookData.shift_end||'18:30'} onChange={e=>setRulebookData(p=>({...p,shift_end:e.target.value}))} className="outline-none text-[14px] w-full bg-transparent text-gray-800" />
                </div>
              </div>

              <div className="relative border border-gray-300 rounded px-3 py-2 flex items-center bg-white h-[48px] focus-within:border-[#1976d2] focus-within:ring-1 focus-within:ring-[#1976d2] transition-all">
                <label className="absolute -top-2.5 left-2 bg-white px-1 text-[11px] text-gray-500 font-medium">Grace Period (min)</label>
                <input type="number" value={rulebookData.grace_period_minutes||14} onChange={e=>setRulebookData(p=>({...p,grace_period_minutes:e.target.value}))} className="outline-none text-[14px] w-full bg-transparent text-gray-800" />
              </div>

              <div className="relative border border-gray-300 rounded px-3 py-2 flex items-center bg-white h-[48px] focus-within:border-[#1976d2] focus-within:ring-1 focus-within:ring-[#1976d2] transition-all">
                <label className="absolute -top-2.5 left-2 bg-white px-1 text-[11px] text-gray-500 font-medium">1hr Deduct Threshold (min)</label>
                <input type="number" value={rulebookData.late_deduction_threshold_minutes||15} onChange={e=>setRulebookData(p=>({...p,late_deduction_threshold_minutes:e.target.value}))} className="outline-none text-[14px] w-full bg-transparent text-gray-800" />
              </div>

              <div className="relative border border-gray-300 rounded px-3 py-2 flex items-center bg-white h-[48px] focus-within:border-[#1976d2] focus-within:ring-1 focus-within:ring-[#1976d2] transition-all">
                <label className="absolute -top-2.5 left-2 bg-white px-1 text-[11px] text-gray-500 font-medium">Half Day Late (min)</label>
                <input type="number" value={rulebookData.half_day_late_threshold_minutes||40} onChange={e=>setRulebookData(p=>({...p,half_day_late_threshold_minutes:e.target.value}))} className="outline-none text-[14px] w-full bg-transparent text-gray-800" />
              </div>

              <div className="relative border border-gray-300 rounded px-3 py-2 flex items-center bg-white h-[48px] focus-within:border-[#1976d2] focus-within:ring-1 focus-within:ring-[#1976d2] transition-all">
                <label className="absolute -top-2.5 left-2 bg-white px-1 text-[11px] text-gray-500 font-medium">Regularization Limit/Month</label>
                <input type="number" value={rulebookData.regularization_limit_per_month||3} onChange={e=>setRulebookData(p=>({...p,regularization_limit_per_month:e.target.value}))} className="outline-none text-[14px] w-full bg-transparent text-gray-800" />
              </div>

              <div className="relative border border-gray-300 rounded px-3 py-2 flex items-center bg-white h-[48px] focus-within:border-[#1976d2] focus-within:ring-1 focus-within:ring-[#1976d2] transition-all">
                <label className="absolute -top-2.5 left-2 bg-white px-1 text-[11px] text-gray-500 font-medium">Early Leave Deduct (min)</label>
                <input type="number" value={rulebookData.early_leave_deduction_minutes||10} onChange={e=>setRulebookData(p=>({...p,early_leave_deduction_minutes:e.target.value}))} className="outline-none text-[14px] w-full bg-transparent text-gray-800" />
              </div>

              <div className="relative border border-gray-300 rounded px-3 py-2 flex items-center bg-white h-[48px] focus-within:border-[#1976d2] focus-within:ring-1 focus-within:ring-[#1976d2] transition-all">
                <label className="absolute -top-2.5 left-2 bg-white px-1 text-[11px] text-gray-500 font-medium">Half Day Early Leave (min)</label>
                <input type="number" value={rulebookData.half_day_early_leave_minutes||40} onChange={e=>setRulebookData(p=>({...p,half_day_early_leave_minutes:e.target.value}))} className="outline-none text-[14px] w-full bg-transparent text-gray-800" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-5 mt-6">
              <div className="relative border border-gray-300 rounded px-3 py-2 flex items-center bg-white h-[48px] focus-within:border-[#1976d2] focus-within:ring-1 focus-within:ring-[#1976d2] transition-all">
                <label className="absolute -top-2.5 left-2 bg-white px-1 text-[11px] text-gray-500 font-medium">Employee Type</label>
                <select value={rulebookData.employee_type||'office'} onChange={e=>setRulebookData(p=>({...p,employee_type:e.target.value}))} className="outline-none text-[14px] w-full bg-transparent text-gray-800 appearance-none">
                  <option value="office">Office</option>
                  <option value="labour">Labour</option>
                  <option value="field">Field</option>
                </select>
                <div className="absolute right-3 pointer-events-none text-gray-500 text-[10px]">▼</div>
              </div>

              <div className="relative border border-gray-300 rounded px-3 py-2 flex items-center bg-white h-[48px] focus-within:border-[#1976d2] focus-within:ring-1 focus-within:ring-[#1976d2] transition-all">
                <label className="absolute -top-2.5 left-2 bg-white px-1 text-[11px] text-gray-500 font-medium">Weekly Off</label>
                <select value={rulebookData.weekly_off||'sunday'} onChange={e=>setRulebookData(p=>({...p,weekly_off:e.target.value}))} className="outline-none text-[14px] w-full bg-transparent text-gray-800 appearance-none">
                  <option value="sunday">Sunday</option>
                  <option value="saturday">Saturday</option>
                  <option value="none">None</option>
                </select>
                <div className="absolute right-3 pointer-events-none text-gray-500 text-[10px]">▼</div>
              </div>

              <div className="relative border border-gray-300 rounded px-3 py-2 flex items-center bg-white h-[48px] focus-within:border-[#1976d2] focus-within:ring-1 focus-within:ring-[#1976d2] transition-all">
                <label className="absolute -top-2.5 left-2 bg-white px-1 text-[11px] text-gray-500 font-medium">Saturday Policy</label>
                <select value={rulebookData.saturday_working||'yes'} onChange={e=>setRulebookData(p=>({...p,saturday_working:e.target.value}))} className="outline-none text-[14px] w-full bg-transparent text-gray-800 appearance-none">
                  <option value="yes">Working</option>
                  <option value="no">Off</option>
                  <option value="alternate">Alternate</option>
                </select>
                <div className="absolute right-3 pointer-events-none text-gray-500 text-[10px]">▼</div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button onClick={()=>setRulebookUser(null)} className="px-5 py-2.5 rounded text-[13px] text-[#1976d2] font-bold hover:bg-blue-50 transition uppercase tracking-wide">CANCEL</button>
              <button onClick={async()=>{await saveAttendanceRulebook(rulebookUser.user_id,rulebookData);setRulebookUser(null);}} className="px-5 py-2.5 bg-[#1976d2] text-white rounded text-[13px] font-bold hover:bg-[#1565c0] shadow-sm transition uppercase tracking-wide">SAVE RULEBOOK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
