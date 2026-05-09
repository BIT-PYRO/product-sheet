'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Download, Eye, Plus, Trash2, Info, Menu, X, Edit2, Save } from 'lucide-react';
import { getPayrollDashboard, getPayrollRun, actionPayrollRun, getPayrollEmployeeDetail, savePayrollRecord, saveEmployeeSalaryStructure } from '@/lib/hr-api';
import { toast } from 'sonner';

const fmt = n => `₹${Number(n||0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function HRPayrollDashboard() {
  const today = new Date();
  const pad = n => String(n).padStart(2,'0');
  const [month, setMonth] = useState(today.getMonth()+1);
  const [year, setYear] = useState(today.getFullYear());
  const monthToken = `${year}-${pad(month)}`;
  
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ gross: 0, deductions: 0, net: 0 });
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState('');
  const [search, setSearch] = useState('');

  // Modals state
  const [selectedEmp, setSelectedEmp] = useState(null); // Details Modal
  const [showEditEarnings, setShowEditEarnings] = useState(false);
  const [showDefineStructure, setShowDefineStructure] = useState(false);
  const [showExceptions, setShowExceptions] = useState(false);

  // Form states
  const [editEarnings, setEditEarnings] = useState([]);
  const [editDeductions, setEditDeductions] = useState([]);
  const [structureRows, setStructureRows] = useState([]);

  const openDetails = async (row) => {
    setActing('details');
    try {
      const res = await getPayrollEmployeeDetail(row.user_id, monthToken);
      setSelectedEmp({ ...res, _user_id: row.user_id });
    } catch (err) {
      toast.error('Failed to load employee details');
    } finally {
      setActing('');
    }
  };

  const handleSaveEarnings = async () => {
    try {
      setActing('save');
      const res = await savePayrollRecord(selectedEmp._user_id, monthToken, {
        earnings: editEarnings,
        deductions: editDeductions
      });
      setSelectedEmp({ ...res, _user_id: selectedEmp._user_id });
      setShowEditEarnings(false);
      toast.success('Earnings & Deductions saved');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setActing('');
    }
  };

  const openEditEarnings = () => {
    setEditEarnings(selectedEmp?.earnings?.length ? [...selectedEmp.earnings] : [{ component: 'Basic Pay', amount: 0 }]);
    setEditDeductions(selectedEmp?.deductions_breakup?.length ? [...selectedEmp.deductions_breakup] : []);
    setShowEditEarnings(true);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, r] = await Promise.all([getPayrollDashboard(monthToken), getPayrollRun(monthToken)]);
      setRows(d?.rows || []);
      if (d?.totals) setTotals(d.totals);
      setRun(r || d?.run || null);
    } catch {} finally { setLoading(false); }
  }, [monthToken]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (action) => {
    setActing(action);
    try { 
        const r = await actionPayrollRun(action, monthToken); 
        if(r?.id) setRun(r); 
        // Reload rows after any action that changes record status
        if(['run_calculation','hr_approve','send_to_finance','lock'].includes(action)) load();
    } catch (e) {
        toast.error(e.message || 'Action failed');
    } finally { setActing(''); }
  };

  const filteredRows = rows.filter(r => (r.employee_name || '').toLowerCase().includes(search.toLowerCase()));

  const displayRows = filteredRows;

  const BtnWorkflow = ({ label, active, onClick }) => (
    <button 
      onClick={onClick}
      disabled={!active || !!acting}
      className={`px-3 py-1.5 text-[11px] font-semibold tracking-wider rounded uppercase transition-colors whitespace-nowrap
        ${active 
          ? 'border border-[#3B82F6] text-[#3B82F6] hover:bg-blue-50 bg-white' 
          : 'border border-gray-200 text-gray-300 bg-white cursor-not-allowed'
        } ${label === 'LOCK PAYROLL' && !active ? 'bg-gray-100 border-gray-200 text-gray-400' : ''}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4 pb-20 relative min-h-screen">
      
      {/* Top Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 border border-gray-300 bg-white rounded shadow-sm px-2 py-1">
          <span className="text-gray-400 text-xs px-2">Month</span>
          <select value={month} onChange={e=>setMonth(Number(e.target.value))} className="text-sm font-medium outline-none bg-transparent">
            {Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{new Date(2000,i,1).toLocaleString('en-US',{month:'long'})} {year}</option>)}
          </select>
        </div>
        
        <div className="flex-1 max-w-sm relative">
          <input 
            type="text" 
            placeholder="Search Employee" 
            value={search}
            onChange={e=>setSearch(e.target.value)}
            className="w-full pl-3 pr-10 py-1.5 border border-gray-300 rounded shadow-sm text-sm outline-none focus:border-[#3B82F6]"
          />
        </div>
      </div>

      {/* Payroll Run Workflow Card */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-[15px] font-bold text-gray-800">Payroll Run Workflow</h2>
              {run?.is_locked ? (
                <span className="px-2 py-0.5 border border-green-400 text-green-600 text-[11px] rounded-full bg-green-50">Locked</span>
              ) : run?.sent_to_finance_at ? (
                <span className="px-2 py-0.5 border border-purple-400 text-purple-600 text-[11px] rounded-full bg-purple-50">Sent to Finance</span>
              ) : run?.hr_approved_at ? (
                <span className="px-2 py-0.5 border border-blue-400 text-blue-600 text-[11px] rounded-full bg-blue-50">HR Approved</span>
              ) : run?.calculation_run_at ? (
                <span className="px-2 py-0.5 border border-yellow-400 text-yellow-600 text-[11px] rounded-full bg-yellow-50">Calculated</span>
              ) : run?.attendance_locked_at ? (
                <span className="px-2 py-0.5 border border-orange-400 text-orange-600 text-[11px] rounded-full bg-orange-50">Attendance Locked</span>
              ) : (
                <span className="px-2 py-0.5 border border-gray-200 text-gray-500 text-[11px] rounded-full">Draft</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 border border-gray-200 text-gray-600 text-xs rounded-full">Employees: {rows.length}</span>
              <span className="px-2.5 py-1 border border-[#10B981] text-[#10B981] font-medium text-xs rounded-full bg-green-50/30">Net Payout: {fmt(totals.net)}</span>
              {run?.exception_count > 0 ? (
                <button onClick={() => setShowExceptions(true)} className="px-2.5 py-1 border border-orange-500 text-orange-600 font-medium text-xs rounded-full bg-orange-50 hover:bg-orange-100 transition flex items-center gap-1">
                  <Info className="w-3.5 h-3.5"/> Exceptions: {run.exception_count}
                </button>
              ) : (
                <span className="px-2.5 py-1 border border-gray-200 text-gray-600 text-xs rounded-full">Exceptions: 0</span>
              )}
            </div>
          </div>
          <div className="text-xs text-gray-400 text-right max-w-xs">
            {new Date(year, month-1).toLocaleString('en-US',{month:'long'})} {year} run controls for attendance lock, calculation, approvals, payout export, and month lock.
          </div>
        </div>
        
        <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap gap-2 items-center bg-gray-50/50 rounded-b-lg">
          <BtnWorkflow label="LOCK ATTENDANCE" active={!run?.attendance_locked_at && !run?.is_locked} onClick={()=>doAction('lock_attendance')} />
          <BtnWorkflow label="RUN CALCULATION" active={!!run?.attendance_locked_at && !run?.is_locked} onClick={()=>doAction('run_calculation')} />
          <BtnWorkflow label="APPROVE HR" active={!!run?.calculation_run_at && !run?.hr_approved_at && !run?.is_locked} onClick={()=>doAction('hr_approve')} />
          <BtnWorkflow label="SEND TO FINANCE" active={!!run?.hr_approved_at && !run?.sent_to_finance_at && !run?.is_locked} onClick={()=>doAction('send_to_finance')} />
          <BtnWorkflow label="LOCK PAYROLL" active={!!run?.sent_to_finance_at && !run?.is_locked} onClick={()=>doAction('lock')} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          ['Employees In Payroll', rows.length, 'border-gray-200 text-gray-800'],
          ['Total Gross', fmt(totals.gross), 'border-gray-200 text-gray-800'],
          ['Total Deductions', fmt(totals.deductions), 'border-gray-200 text-red-500'],
          ['Total Net Payout', fmt(totals.net), 'border-[#10B981] text-[#10B981] bg-green-50/20']
        ].map(([label, val, cls], i) => (
          <div key={i} className={`bg-white rounded-lg border p-4 shadow-sm ${cls}`}>
            <div className="text-xs text-gray-500 mb-2">{label}</div>
            <div className={`text-2xl font-bold ${cls.includes('text-red') ? 'text-red-500' : cls.includes('text-[#10B981]') ? 'text-[#10B981]' : 'text-gray-900'}`}>{val}</div>
          </div>
        ))}
      </div>

      {/* Payroll Register Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-white">
          <h3 className="font-bold text-gray-800">{new Date(year, month-1).toLocaleString('en-US',{month:'long'})} {year} Payroll Register</h3>
          <button className="flex items-center gap-2 px-3 py-1.5 border border-[#3B82F6] text-[#3B82F6] text-xs font-semibold rounded hover:bg-blue-50 transition-colors uppercase">
            <Download className="w-3.5 h-3.5" /> EXPORT REGISTER
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Employee</th>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">PAN</th>
                <th className="px-4 py-3 font-semibold">UAN</th>
                <th className="px-4 py-3 font-semibold">Bank</th>
                <th className="px-4 py-3 font-semibold text-center">Working</th>
                <th className="px-4 py-3 font-semibold text-center">Present</th>
                <th className="px-4 py-3 font-semibold text-center text-red-500">LOP</th>
                <th className="px-4 py-3 font-semibold">Gross</th>
                <th className="px-4 py-3 font-semibold">Deductions</th>
                <th className="px-4 py-3 font-semibold">Net Paid</th>
                <th className="px-4 py-3 font-semibold">UTR</th>
                <th className="px-4 py-3 font-semibold">Paid On</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((r, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 bg-white">
                  <td className="px-4 py-3 font-medium text-[#3B82F6]">{r.employee_name}</td>
                  <td className="px-4 py-3 text-gray-500">{r.employee_id || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{r.pan_masked || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{r.uan || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{r.bank_account_display || '-'}</td>
                  <td className="px-4 py-3 text-center">{r.working_days}</td>
                  <td className="px-4 py-3 text-center">{r.present_days}</td>
                  <td className="px-4 py-3 text-center text-red-500 font-medium">{r.lop_days}</td>
                  <td className="px-4 py-3 text-gray-500">{r.gross_amount != null ? fmt(r.gross_amount) : '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{r.total_deductions != null ? fmt(r.total_deductions) : '-'}</td>
                  <td className="px-4 py-3 font-bold text-gray-800">{r.net_amount != null ? fmt(r.net_amount) : '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{r.utr_reference || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{r.payment_date || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold
                      ${ r.status === 'Paid' ? 'border-green-300 bg-green-50 text-green-700'
                        : r.status === 'HR Approved' ? 'border-blue-300 bg-blue-50 text-blue-700'
                        : r.status === 'Sent to Finance' ? 'border-purple-300 bg-purple-50 text-purple-700'
                        : r.status === 'Processed' ? 'border-yellow-300 bg-yellow-50 text-yellow-700'
                        : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                      {r.status || 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button 
                      onClick={() => openDetails(r)}
                      disabled={!!acting}
                      className="inline-flex items-center gap-1.5 px-3 py-1 border border-[#3B82F6] text-[#3B82F6] text-[11px] font-bold rounded hover:bg-blue-50 transition-colors uppercase disabled:opacity-50"
                    >
                      <Eye className="w-3.5 h-3.5" /> DETAILS
                    </button>
                  </td>
                </tr>
              ))}
              {displayRows.length === 0 && (
                <tr>
                  <td colSpan="15" className="px-4 py-8 text-center text-gray-500">
                    No employees found in payroll for this month.
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

      {/* --- MODALS --- */}

      {/* DETAILS MODAL */}
      {selectedEmp && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-800">{selectedEmp.employee?.employee_name || 'Employee'} • {new Date(year, month-1).toLocaleString('en-US',{month:'long'})} {year}</h2>
              <button onClick={() => setSelectedEmp(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-white">
              {/* Info Banner */}
              {!selectedEmp.has_record && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-3 text-sm text-[#3B82F6]">
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <p>Payroll record is not generated for this employee in the selected month yet. Values remain pending until calculation creates a record.</p>
              </div>
              )}

              {/* ID Grid */}
              <div className="grid grid-cols-4 gap-4 pb-2 border-b border-gray-100">
                {[
                  ['Employee ID', selectedEmp.employee?.employee_id || '-'],
                  ['PAN', selectedEmp.employee?.pan_masked || '-'],
                  ['UAN', selectedEmp.employee?.uan || '-'],
                  ['Bank', selectedEmp.employee?.bank_account_display || '-']
                ].map(([lbl, val]) => (
                  <div key={lbl}>
                    <div className="text-[11px] text-gray-500 mb-1">{lbl}</div>
                    <div className="font-semibold text-gray-800">{val}</div>
                  </div>
                ))}
              </div>

              {/* Earnings & Deductions Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200 bg-gray-50/50">
                    <h3 className="font-bold text-gray-800 text-sm">Earnings</h3>
                    <button onClick={openEditEarnings} className="flex items-center gap-1 text-[#3B82F6] text-xs font-bold hover:underline"><Edit2 className="w-3 h-3" /> EDIT</button>
                  </div>
                  <div className="p-4 flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-800">Total Earnings</span>
                    <span className="text-sm font-bold text-gray-800">{fmt(selectedEmp.gross)}</span>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200 bg-gray-50/50">
                    <h3 className="font-bold text-gray-800 text-sm">Deductions</h3>
                    <button onClick={openEditEarnings} className="flex items-center gap-1 text-[#3B82F6] text-xs font-bold hover:underline"><Edit2 className="w-3 h-3" /> EDIT</button>
                  </div>
                  <div className="p-4 flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-800">Total Deductions</span>
                    <span className="text-sm font-bold text-gray-800">{fmt(selectedEmp.deductions)}</span>
                  </div>
                </div>
              </div>

              {/* Salary Structure Card */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200 bg-gray-50/50">
                  <h3 className="font-bold text-gray-800 text-sm">Salary Structure</h3>
                  <button onClick={() => setShowDefineStructure(true)} className="flex items-center gap-1 text-[#3B82F6] text-xs font-bold hover:underline"><Edit2 className="w-3 h-3" /> EDIT</button>
                </div>
                <div className="p-4 text-sm text-gray-500">
                  <div className="grid grid-cols-4 gap-4 mb-3 text-xs text-gray-800 font-medium">
                    <div className="col-span-2">Component</div>
                    <div>Monthly</div>
                    <div>Annual</div>
                    <div>Taxability</div>
                  </div>
                  <p>Salary structure is not defined yet.</p>
                </div>
              </div>

              {/* Status Box */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-xs text-[#10B981] font-semibold mb-1">Net Pay</div>
                <div className="text-xl font-bold text-[#10B981] mb-1">-</div>
                <div className="text-xs text-[#10B981] font-medium">UTR - • Paid on -</div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 items-center">
              <button 
                onClick={openEditEarnings}
                className="flex items-center gap-1.5 px-4 py-2 border border-[#3B82F6] text-[#3B82F6] text-xs font-bold rounded bg-white hover:bg-blue-50 transition-colors uppercase"
              >
                <Edit2 className="w-3.5 h-3.5" /> EDIT EARNINGS & DEDUCTIONS
              </button>
              <button 
                onClick={() => setShowDefineStructure(true)}
                className="flex items-center gap-1.5 px-4 py-2 border border-[#3B82F6] text-[#3B82F6] text-xs font-bold rounded bg-white hover:bg-blue-50 transition-colors uppercase"
              >
                <Edit2 className="w-3.5 h-3.5" /> DEFINE SALARY STRUCTURE
              </button>
              <button 
                onClick={() => setSelectedEmp(null)}
                className="px-4 py-2 text-gray-500 text-xs font-bold rounded hover:bg-gray-100 transition-colors uppercase"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT EARNINGS MODAL */}
      {showEditEarnings && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Edit Earnings & Deductions • {selectedEmp?.employee?.employee_name}</h2>
              <button onClick={() => setShowEditEarnings(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 grid grid-cols-2 gap-6 bg-gray-50/30">
              {/* Earnings Editor */}
              <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800 text-sm">Earnings</h3>
                  <button onClick={() => setEditEarnings([...editEarnings, { component: '', amount: 0 }])} className="flex items-center gap-1 text-[#3B82F6] text-xs font-bold hover:underline"><Plus className="w-3 h-3" /> ADD</button>
                </div>
                <div className="p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b border-gray-100">
                        <th className="pb-2 text-left font-medium">Component</th>
                        <th className="pb-2 text-left font-medium">Amount</th>
                        <th className="pb-2 text-right font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editEarnings.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2"><input type="text" value={item.component} onChange={e => { const n = [...editEarnings]; n[idx].component = e.target.value; setEditEarnings(n); }} placeholder="Basic Pay" className="w-full p-1.5 border border-gray-300 rounded text-sm" /></td>
                          <td className="py-2 px-2"><input type="number" value={item.amount} onChange={e => { const n = [...editEarnings]; n[idx].amount = Number(e.target.value); setEditEarnings(n); }} placeholder="0" className="w-full p-1.5 border border-gray-300 rounded text-sm" /></td>
                          <td className="py-2 text-right"><button onClick={() => setEditEarnings(editEarnings.filter((_, i) => i !== idx))} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Deductions Editor */}
              <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800 text-sm">Deductions</h3>
                  <button onClick={() => setEditDeductions([...editDeductions, { component: '', amount: 0 }])} className="flex items-center gap-1 text-[#3B82F6] text-xs font-bold hover:underline"><Plus className="w-3 h-3" /> ADD</button>
                </div>
                <div className="p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b border-gray-100">
                        <th className="pb-2 text-left font-medium">Component</th>
                        <th className="pb-2 text-left font-medium">Amount</th>
                        <th className="pb-2 text-right font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editDeductions.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2"><input type="text" value={item.component} onChange={e => { const n = [...editDeductions]; n[idx].component = e.target.value; setEditDeductions(n); }} placeholder="Provident Fund" className="w-full p-1.5 border border-gray-300 rounded text-sm" /></td>
                          <td className="py-2 px-2"><input type="number" value={item.amount} onChange={e => { const n = [...editDeductions]; n[idx].amount = Number(e.target.value); setEditDeductions(n); }} placeholder="0" className="w-full p-1.5 border border-gray-300 rounded text-sm" /></td>
                          <td className="py-2 text-right"><button onClick={() => setEditDeductions(editDeductions.filter((_, i) => i !== idx))} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
              <button 
                onClick={() => setShowEditEarnings(false)}
                className="px-4 py-2 text-[#3B82F6] text-xs font-bold rounded hover:bg-blue-50 transition-colors uppercase"
              >
                CANCEL
              </button>
              <button 
                onClick={handleSaveEarnings}
                disabled={acting === 'save'}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#3B82F6] text-white text-xs font-bold rounded hover:bg-blue-600 transition-colors uppercase shadow-sm disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" /> SAVE EARNINGS & DEDUCTIONS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEFINE SALARY STRUCTURE MODAL */}
      {showDefineStructure && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Define Salary Structure • {selectedEmp?.employee?.employee_name || 'Employee'}</h2>
              <button onClick={() => setShowDefineStructure(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 bg-gray-50/30">
              <div className="bg-white border border-gray-200 rounded-lg p-1">
                <div className="flex justify-end p-2 border-b border-gray-100">
                  <button className="flex items-center gap-1 text-[#3B82F6] text-xs font-bold hover:underline px-2 py-1 rounded hover:bg-blue-50">
                    <Plus className="w-3.5 h-3.5" /> ADD COMPONENT
                  </button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-800 font-semibold border-b border-gray-100">
                      <th className="p-3 text-left">Component</th>
                      <th className="p-3 text-left">Monthly Amount</th>
                      <th className="p-3 text-left">Annual Amount</th>
                      <th className="p-3 text-left">Taxability</th>
                      <th className="p-3 text-left">Remarks</th>
                      <th className="p-3 text-center w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-50 last:border-0">
                      <td className="p-2"><input type="text" placeholder="Basic Salary" className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-[#3B82F6]" /></td>
                      <td className="p-2"><input type="text" placeholder="" className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-[#3B82F6]" /></td>
                      <td className="p-2"><input type="text" placeholder="" className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-[#3B82F6]" /></td>
                      <td className="p-2">
                        <select className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-[#3B82F6] bg-white">
                          <option>Taxable</option>
                          <option>Non-Taxable</option>
                        </select>
                      </td>
                      <td className="p-2"><input type="text" placeholder="Optional remarks" className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-[#3B82F6]" /></td>
                      <td className="p-2 text-center"><button className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
              <button 
                onClick={() => setShowDefineStructure(false)}
                className="px-4 py-2 text-[#3B82F6] text-xs font-bold rounded hover:bg-blue-50 transition-colors uppercase"
              >
                CANCEL
              </button>
              <button 
                onClick={() => setShowDefineStructure(false)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#3B82F6] text-white text-xs font-bold rounded hover:bg-blue-600 transition-colors uppercase shadow-sm"
              >
                <Save className="w-3.5 h-3.5" /> SAVE STRUCTURE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXCEPTIONS MODAL */}
      {showExceptions && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-orange-50">
              <h2 className="text-lg font-bold text-orange-800 flex items-center gap-2"><Info className="w-5 h-5"/> Payroll Exceptions Report</h2>
              <button onClick={() => setShowExceptions(false)} className="text-orange-500 hover:text-orange-700"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {run?.exception_report?.length > 0 ? (
                <div className="space-y-4">
                  {run.exception_report.map((ex, i) => (
                    <div key={i} className="flex gap-4 p-4 border border-orange-200 bg-orange-50/50 rounded-lg">
                      <div className="bg-orange-100 text-orange-600 p-2 rounded-full h-fit">
                        <Info className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800 text-sm">{ex.name} <span className="text-xs font-normal text-gray-500 ml-2">ID: {ex.user_id}</span></h4>
                        <p className="text-sm font-semibold text-orange-600 mt-0.5">{ex.type}</p>
                        <p className="text-sm text-gray-600 mt-1">{ex.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500">No exceptions found for this payroll run.</div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
