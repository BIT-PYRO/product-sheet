'use client';
import {useState, useEffect} from 'react';
import {C,fmt,STATUS_ORDER,STATUS_CFG,ConfirmModal,SubTabs,PrintExport,Empty,Card,EmpModal,Table,FilterRow} from './payroll-helpers';
import { getPayrollDashboard, getPayrollRun, actionPayrollRun } from '@/lib/hr-api';
import { toast } from 'sonner';

const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const YEARS=Array.from({length:10},(_,i)=>2022+i);
const STEPS=[
  {key:'verify',label:'1. Verify',req:'received'},
  {key:'approve',label:'2. Approve',req:'verified'},
  {key:'payment',label:'3. Payment',req:'approved'},
  {key:'post',label:'4. Post to Accounting',req:'paid'},
];

function VerifyPage({status,onAction,month,rows,load}){
  const gDone=STATUS_ORDER.indexOf(status)>STATUS_ORDER.indexOf('received');
  const [vIds,setVIds]=useState(new Set(rows.filter(r=>r.finance_verified).map(r=>r.id)));
  const [sel,setSel]=useState(new Set());
  const [ve,setVe]=useState(null);
  const [cfm,setCfm]=useState(null);
  const [sub,setSub]=useState('pending');
  const [q,setQ]=useState('');
  const [dept,setDept]=useState('');
  const filt=r=>(r.name.toLowerCase().includes(q.toLowerCase())||r.dept.toLowerCase().includes(q.toLowerCase()))&&(!dept||r.dept===dept);
  const allPending=rows.filter(r=>!vIds.has(r.id));
  const allDone=rows.filter(r=>vIds.has(r.id));
  const pending=allPending.filter(filt);
  const done=allDone.filter(filt);
  const uSel=[...sel].filter(id=>!vIds.has(id));
  const togSel=id=>{const s=new Set(sel);s.has(id)?s.delete(id):s.add(id);setSel(s);};
  const togAll=()=>setSel(sel.size===pending.length?new Set():new Set(pending.map(r=>r.id)));
  const ask=ids=>setCfm({ids,adv:false});
  const doConfirm=async ()=>{
    if(cfm.adv){onAction('verified');}
    else{
      const monthToken = month.replace(' ', '-').replace('Jan','01').replace('Feb','02').replace('Mar','03').replace('Apr','04').replace('May','05').replace('Jun','06').replace('Jul','07').replace('Aug','08').replace('Sep','09').replace('Oct','10').replace('Nov','11').replace('Dec','12');
      for (const id of cfm.ids) {
        await actionPayrollRun('verify_finance', monthToken, { user_id: id });
      }
      toast.success('Verification saved');
      load();
    }
    setCfm(null);
  };
  const names=cfm?cfm.ids.map(id=>rows.find(r=>r.id===id)?.name).filter(Boolean):[];
  return(
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <EmpModal emp={ve} onClose={()=>setVe(null)}/>
      {cfm&&<ConfirmModal title={cfm.adv?'Send to Approval':'Confirm Verification'} desc={cfm.adv?'Verified employees will be sent for approval:':'The following employees will be marked as verified:'} names={names} nextLabel={cfm.adv?'Send to Approval':'\u2713 Verify'} onConfirm={doConfirm} onCancel={()=>setCfm(null)}/>}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <div><p style={{margin:'0 0 2px',fontSize:13,fontWeight:700,color:C.text}}>Payroll Verification &mdash; {month}</p><p style={{margin:0,fontSize:12,color:C.muted}}>Verify individually or in bulk. All must be verified to proceed.</p></div>
        <PrintExport rows={rows} file="payroll_verify" month={month}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))',gap:12}}>
        <Card label="Employees" value={rows.length} icon="&#128101;" note={`${rows.length} records this month`}/>
        <Card label="Total Gross" value={fmt(rows.reduce((s,r)=>s+r.gross,0))} color={C.blue} icon="&#128202;" note="Before deductions"/>
        <Card label="Deductions" value={fmt(rows.reduce((s,r)=>s+r.ded,0))} color={C.red} icon="&#10134;" note="PF + TDS + PT"/>
        <Card label="Net Payout" value={fmt(rows.reduce((s,r)=>s+r.net,0))} color={C.green} icon="&#128184;" note="To be disbursed"/>
      </div>
      <FilterRow rows={rows} q={q} setQ={setQ} dept={dept} setDept={setDept}/>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <SubTabs tab={sub} setTab={setSub} pCount={allPending.length} dCount={allDone.length} dLabel="Verified"/>
        {!gDone&&uSel.length>=2&&<button onClick={()=>ask(uSel)} style={{padding:'7px 16px',background:C.blue,color:'#fff',border:'none',borderRadius:7,fontSize:13,fontWeight:700,cursor:'pointer'}}>&#9889; Bulk Verify ({uSel.length})</button>}
      </div>
      {sub==='pending'&&(pending.length===0?<Empty msg={q||dept?'No matching employees':'All employees verified'}/>:<Table rows={pending} onView={setVe} verifiedIds={vIds} selected={sel} onToggleSel={togSel} onToggleAll={togAll} onVerifyOne={gDone?null:(id=>ask([id]))} actionLabel="Verify" doneLabel="\u2713 Verified"/>)}
      {sub==='done'&&(done.length===0?<Empty msg={q||dept?'No matching employees':'No employees verified yet'}/>:<Table rows={done} onView={setVe} verifiedIds={new Set(done.map(r=>r.id))} selected={new Set()} onToggleSel={()=>{}} onToggleAll={()=>{}}/>)}
      {gDone?<div style={{padding:'12px 16px',background:C.blueBg,border:'1px solid #bfdbfe',borderRadius:10,fontSize:13,fontWeight:600,color:C.blue}}>\u2713 Payroll verified for {month}.</div>
        :vIds.size===rows.length&&rows.length>0?<button onClick={()=>setCfm({ids:rows.map(r=>r.id),adv:true})} style={{padding:'12px 24px',background:C.blue,color:'#fff',border:'none',borderRadius:9,fontSize:14,fontWeight:700,cursor:'pointer',alignSelf:'flex-start'}}>\u2192 Send to Approval</button>
        :<span style={{fontSize:13,color:C.muted,fontWeight:600}}>\u2713 {vIds.size}/{rows.length} verified &mdash; verify all to proceed</span>}
    </div>
  );
}

function ApprovePage({status,onAction,month,rows,load}){
  const canAct=status==='verified';
  const gDone=STATUS_ORDER.indexOf(status)>STATUS_ORDER.indexOf('verified');
  const [aIds,setAIds]=useState(new Set(gDone?rows.map(r=>r.id):[]));
  const [sel,setSel]=useState(new Set());
  const [ve,setVe]=useState(null);
  const [cfm,setCfm]=useState(null);
  const [sub,setSub]=useState('pending');
  const [q,setQ]=useState('');
  const [dept,setDept]=useState('');
  const filt=r=>(r.name.toLowerCase().includes(q.toLowerCase())||r.dept.toLowerCase().includes(q.toLowerCase()))&&(!dept||r.dept===dept);
  const allPending=rows.filter(r=>!aIds.has(r.id));
  const allDone=rows.filter(r=>aIds.has(r.id));
  const pending=allPending.filter(filt);
  const done=allDone.filter(filt);
  const uSel=[...sel].filter(id=>!aIds.has(id));
  const togSel=id=>{const s=new Set(sel);s.has(id)?s.delete(id):s.add(id);setSel(s);};
  const togAll=()=>setSel(sel.size===pending.length?new Set():new Set(pending.map(r=>r.id)));
  const ask=ids=>setCfm({ids,adv:false});
  const doConfirm=async ()=>{
    if(cfm.adv){
      const monthToken = month.replace(' ', '-').replace('Jan','01').replace('Feb','02').replace('Mar','03').replace('Apr','04').replace('May','05').replace('Jun','06').replace('Jul','07').replace('Aug','08').replace('Sep','09').replace('Oct','10').replace('Nov','11').replace('Dec','12');
      await actionPayrollRun('approve_finance', monthToken);
      toast.success('Payroll approved by Finance.');
      load();
    }
    else{const s=new Set(aIds);cfm.ids.forEach(id=>s.add(id));setAIds(s);setSel(new Set());}
    setCfm(null);
  };
  const names=cfm?cfm.ids.map(id=>rows.find(r=>r.id===id)?.name).filter(Boolean):[];
  return(
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <EmpModal emp={ve} onClose={()=>setVe(null)}/>
      {cfm&&<ConfirmModal title={cfm.adv?'Send to Payment':'Confirm Approval'} desc={cfm.adv?'Approved payroll will be sent for payment processing:':'The following employees will be marked as approved:'} names={names} nextLabel={cfm.adv?'Send to Payment':'\u2713 Approve'} onConfirm={doConfirm} onCancel={()=>setCfm(null)}/>}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <div><p style={{margin:'0 0 2px',fontSize:13,fontWeight:700,color:C.text}}>Payroll Approval &mdash; {month}</p><p style={{margin:0,fontSize:12,color:C.muted}}>Approve individually or in bulk. All must be approved to proceed.</p></div>
        <PrintExport rows={rows} file="payroll_approve" month={month}/>
      </div>
      <FilterRow rows={rows} q={q} setQ={setQ} dept={dept} setDept={setDept}/>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <SubTabs tab={sub} setTab={setSub} pCount={allPending.length} dCount={allDone.length} dLabel="Approved"/>
        {uSel.length>=2&&<button onClick={canAct&&!gDone?()=>ask(uSel):undefined} disabled={!canAct||gDone} style={{padding:'7px 16px',background:canAct&&!gDone?C.blue:'#e5e7eb',color:canAct&&!gDone?'#fff':'#9ca3af',border:'none',borderRadius:7,fontSize:13,fontWeight:700,cursor:canAct&&!gDone?'pointer':'not-allowed',opacity:canAct&&!gDone?1:0.65}}>&#9889; Bulk Approve ({uSel.length})</button>}
      </div>
      {!canAct&&!gDone&&<div style={{padding:'10px 14px',background:C.amberBg,border:'1px solid #fcd34d',borderRadius:9,fontSize:12,color:C.amber,fontWeight:600}}>&#9888; Complete verification first to enable approvals.</div>}
      {sub==='pending'&&(pending.length===0?<Empty msg={q||dept?'No matching employees':'All employees approved'}/>:<Table rows={pending} onView={setVe} verifiedIds={aIds} selected={sel} onToggleSel={togSel} onToggleAll={togAll} showActionCol={true} onVerifyOne={(!canAct||gDone)?null:(id=>ask([id]))} actionLabel="Approve" doneLabel="✓ Approved"/>)}
      {sub==='done'&&(done.length===0?<Empty msg={q||dept?'No matching employees':'No employees approved yet'}/>:<Table rows={done} onView={setVe} verifiedIds={new Set(done.map(r=>r.id))} selected={new Set()} onToggleSel={()=>{}} onToggleAll={()=>{}} showActionCol={true} actionLabel="Approve" doneLabel="✓ Approved"/>)}
      {gDone?<div style={{padding:'12px 16px',background:C.blueBg,border:'1px solid #bfdbfe',borderRadius:10,fontSize:13,fontWeight:600,color:C.blue}}>\u2713 Payroll approved for {month}.</div>
        :canAct&&aIds.size===rows.length&&rows.length>0?<button onClick={()=>setCfm({ids:rows.map(r=>r.id),adv:true})} style={{padding:'12px 24px',background:C.blue,color:'#fff',border:'none',borderRadius:9,fontSize:14,fontWeight:700,cursor:'pointer',alignSelf:'flex-start'}}>\u2192 Send to Payment</button>
        :canAct?<span style={{fontSize:13,color:C.muted,fontWeight:600}}>\u2713 {aIds.size}/{rows.length} approved &mdash; approve all to proceed</span>:null}
    </div>
  );
}

function PaymentPage({status,onAction,month,rows,load}){
  const canAct=status==='approved';
  const gDone=STATUS_ORDER.indexOf(status)>STATUS_ORDER.indexOf('approved');
  const [pIds,setPIds]=useState(new Set(rows.filter(r=>r.status==='Paid'||r.status==='Processed').map(r=>r.id)));
  const [sel,setSel]=useState(new Set());
  const [ve,setVe]=useState(null);
  const [cfm,setCfm]=useState(null);
  const [sub,setSub]=useState('pending');
  const [q,setQ]=useState('');
  const [dept,setDept]=useState('');
  const filt=r=>(r.name.toLowerCase().includes(q.toLowerCase())||r.dept.toLowerCase().includes(q.toLowerCase()))&&(!dept||r.dept===dept);
  const allPending=rows.filter(r=>!pIds.has(r.id));
  const allDone=rows.filter(r=>pIds.has(r.id));
  const pending=allPending.filter(filt);
  const done=allDone.filter(filt);
  const uSel=[...sel].filter(id=>!pIds.has(id));
  const togSel=id=>{const s=new Set(sel);s.has(id)?s.delete(id):s.add(id);setSel(s);};
  const togAll=()=>setSel(sel.size===pending.length?new Set():new Set(pending.map(r=>r.id)));
  const askSingle=id=>setCfm({ids:[id],adv:false});
  const askBulk=()=>setCfm({ids:uSel,adv:false});
  const doConfirm=async ()=>{
    if(cfm.adv){
      const monthToken = month.replace(' ', '-').replace('Jan','01').replace('Feb','02').replace('Mar','03').replace('Apr','04').replace('May','05').replace('Jun','06').replace('Jul','07').replace('Aug','08').replace('Sep','09').replace('Oct','10').replace('Nov','11').replace('Dec','12');
      await actionPayrollRun('export_bank_file', monthToken);
      toast.success('Bank file generated, marked as paid.');
      load();
    }
    else{
      const monthToken = month.replace(' ', '-').replace('Jan','01').replace('Feb','02').replace('Mar','03').replace('Apr','04').replace('May','05').replace('Jun','06').replace('Jul','07').replace('Aug','08').replace('Sep','09').replace('Oct','10').replace('Nov','11').replace('Dec','12');
      for (const id of cfm.ids) {
        await actionPayrollRun('mark_paid', monthToken, { user_id: id });
      }
      toast.success('Payments saved');
      load();
    }
    setCfm(null);
  };
  const cfmNames=cfm?cfm.ids.map(id=>rows.find(r=>r.id===id)?.name).filter(Boolean):[];
  return(
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <EmpModal emp={ve} onClose={()=>setVe(null)}/>
      {cfm&&<ConfirmModal title={cfm.adv?'Mark Payroll as Paid':'Mark Salary Transferred'} desc={cfm.adv?'All salaries transferred. This will mark payroll as fully paid:':'The following salary transfers will be marked as complete:'} names={cfm.adv?rows.map(r=>r.name):cfmNames} nextLabel={cfm.adv?'Mark as Paid':'Mark Transferred'} onConfirm={doConfirm} onCancel={()=>setCfm(null)}/>}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <div><p style={{margin:'0 0 2px',fontSize:13,fontWeight:700,color:C.text}}>Salary Disbursement &mdash; {month}</p><p style={{margin:0,fontSize:12,color:C.muted}}>Mark individual or bulk salary transfers. All must be transferred to proceed.</p></div>
        <PrintExport rows={rows} file="payroll_payment" month={month}/>
      </div>
      <FilterRow rows={rows} q={q} setQ={setQ} dept={dept} setDept={setDept}/>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <SubTabs tab={sub} setTab={setSub} pCount={allPending.length} dCount={allDone.length} dLabel="Transferred"/>
        {uSel.length>=2&&<button onClick={canAct&&!gDone?askBulk:undefined} disabled={!canAct||gDone} style={{padding:'7px 16px',background:canAct&&!gDone?C.green:'#e5e7eb',color:canAct&&!gDone?'#fff':'#9ca3af',border:'none',borderRadius:7,fontSize:13,fontWeight:700,cursor:canAct&&!gDone?'pointer':'not-allowed',opacity:canAct&&!gDone?1:0.65}}>&#9889; Bulk Transfer ({uSel.length})</button>}
      </div>
      {!canAct&&!gDone&&<div style={{padding:'10px 14px',background:C.amberBg,border:'1px solid #fcd34d',borderRadius:9,fontSize:12,color:C.amber,fontWeight:600}}>&#9888; Complete approval first to enable payments.</div>}
      {sub==='pending'&&(pending.length===0?<Empty msg={q||dept?'No matching employees':'All salaries transferred'}/>:<Table rows={pending} onView={setVe} verifiedIds={pIds} selected={sel} onToggleSel={togSel} onToggleAll={togAll} showPaid={true} paidIds={pIds} onTogglePaid={canAct?askSingle:null} paidLabel="Mark Transferred"/>)}
      {sub==='done'&&(done.length===0?<Empty msg={q||dept?'No matching employees':'No salaries transferred yet'}/>:<Table rows={done} onView={setVe} verifiedIds={new Set(done.map(r=>r.id))} selected={new Set()} onToggleSel={()=>{}} onToggleAll={()=>{}}/>)}
      {gDone?<div style={{padding:'12px 16px',background:C.greenBg,border:'1px solid #a7f3d0',borderRadius:10,fontSize:13,fontWeight:600,color:C.green}}>\u2713 Salaries disbursed for {month}.</div>
        :canAct&&pIds.size===rows.length&&rows.length>0?<button onClick={()=>setCfm({ids:[],adv:true})} style={{padding:'12px 24px',background:C.green,color:'#fff',border:'none',borderRadius:9,fontSize:14,fontWeight:700,cursor:'pointer',alignSelf:'flex-start'}}>\u2192 Mark All as Paid</button>
        :canAct?<span style={{fontSize:13,color:C.muted,fontWeight:600}}>{pIds.size}/{rows.length} transferred &mdash; transfer all to proceed</span>:null}
    </div>
  );
}

function PostPage({status,onAction,month,rows,load}){
  const canAct=status==='paid';
  const done=status==='posted';
  const [cfm,setCfm]=useState(false);
  const [sub,setSub]=useState('pending');
  const entries=rows.map(r=>[
    {ledger:'Salary Expense',type:'Dr',amount:r.gross},
    {ledger:'PF Payable',type:'Cr',amount:r.deductions?.pf||0},
    {ledger:'TDS Payable',type:'Cr',amount:r.deductions?.tds||0},
    {ledger:'Bank Account',type:'Cr',amount:r.net},
  ]);
  const JournalCards=({rows})=>(
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {rows.map((r,i)=>(
        <div key={r.id} style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:12,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
          <div style={{padding:'10px 16px',background:'#f9fafb',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between'}}><span style={{fontSize:13,fontWeight:700,color:C.text}}>{r.name}</span><span style={{fontSize:12,color:C.muted}}>{r.dept}</span></div>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr>{['Ledger','Dr/Cr','Amount'].map(h=><th key={h} style={{padding:'8px 14px',fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',borderBottom:`1px solid #f3f4f6`,textAlign:h==='Amount'?'right':'left'}}>{h}</th>)}</tr></thead>
            <tbody>{entries[i].map((e,j)=>(
              <tr key={j} style={{borderBottom:j<entries[i].length-1?'1px solid #f3f4f6':'none'}}>
                <td style={{padding:'8px 14px',fontSize:13,color:C.text}}>{e.ledger}</td>
                <td style={{padding:'8px 14px'}}><span style={{padding:'2px 8px',borderRadius:6,fontSize:11,fontWeight:700,background:e.type==='Dr'?C.redBg:C.greenBg,color:e.type==='Dr'?C.red:C.green}}>{e.type}</span></td>
                <td style={{padding:'8px 14px',textAlign:'right',fontSize:13,fontWeight:700,color:e.type==='Dr'?C.red:C.green}}>{fmt(e.amount)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ))}
    </div>
  );
  return(
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {cfm&&<ConfirmModal title="Post to Accounting" desc="The following journal entries will be posted to the accounting ledger:" names={rows.map(r=>r.name)} nextLabel="Post Journal Entries" onConfirm={async ()=>{
        const monthToken = month.replace(' ', '-').replace('Jan','01').replace('Feb','02').replace('Mar','03').replace('Apr','04').replace('May','05').replace('Jun','06').replace('Jul','07').replace('Aug','08').replace('Sep','09').replace('Oct','10').replace('Nov','11').replace('Dec','12');
        await actionPayrollRun('post_gl', monthToken);
        toast.success('Payroll posted to GL.');
        load();
        setCfm(false);
      }} onCancel={()=>setCfm(false)}/>}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <div><p style={{margin:'0 0 2px',fontSize:13,fontWeight:700,color:C.text}}>Post to Accounting &mdash; {month}</p><p style={{margin:0,fontSize:12,color:C.muted}}>Double-entry journal entries for all salary transactions.</p></div>
        <PrintExport rows={rows} file="payroll_post" month={month}/>
      </div>
      <SubTabs tab={sub} setTab={setSub} pCount={done?0:rows.length} dCount={done?rows.length:0} dLabel="Posted"/>
      {!canAct&&!done&&<div style={{padding:'10px 14px',background:C.amberBg,border:'1px solid #fcd34d',borderRadius:9,fontSize:12,color:C.amber,fontWeight:600}}>&#9888; Complete payment first to enable posting.</div>}
      {sub==='pending'&&(done?<Empty msg="All entries posted &mdash; see Posted tab"/>:<JournalCards rows={rows}/>)}
      {sub==='done'&&(done?<JournalCards rows={rows}/>:<Empty msg="No entries posted yet"/>)}
      {done?<div style={{padding:'16px 18px',background:'#064e3b',border:'1px solid #065f46',borderRadius:10,fontSize:13,fontWeight:700,color:'#ecfdf5'}}>&#9989; Payroll for {month} posted to accounting. All journal entries created.</div>
        :<button onClick={()=>canAct&&setCfm(true)} disabled={!canAct} style={{padding:'12px 24px',background:canAct?'#064e3b':'#e5e7eb',color:canAct?'#fff':C.muted,border:'none',borderRadius:9,fontSize:14,fontWeight:700,cursor:canAct?'pointer':'not-allowed',alignSelf:'flex-start'}}>&#128218; Post to Accounting</button>}
    </div>
  );
}

export default function AccountingPayroll(){
  const [selMonth,setSelMonth]=useState('05');
  const [selYear,setSelYear]=useState(2026);
  const monthToken=`${selYear}-${selMonth}`;
  const month=`${selMonth} ${selYear}`;

  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({});
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [d, r] = await Promise.all([getPayrollDashboard(monthToken), getPayrollRun(monthToken)]);
      const mappedRows = (d?.rows || []).map(r => ({
        id: r.user_id,
        name: r.employee_name,
        dept: r.department,
        gross: Number(r.gross || 0),
        ded: Number(r.deductions || 0),
        net: Number(r.net || 0),
        bank: r.bank_account_display?.split('-')[0] || 'Bank',
        acc: r.bank_account_display || '-',
        ifsc: '-',
        earnings: { basic: 0, hra: 0, allowance: 0, reimb: 0 },
        deductions: { pf: 0, tds: 0, pt: 0 },
        finance_verified: r.finance_verified,
        status: r.status,
      }));
      setRows(mappedRows);
      setTotals(d?.totals || {});
      setRun(r || d?.run || null);
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [monthToken]);

  let status = 'received';
  if (run?.gl_posted_at) status = 'posted';
  else if (rows.every(r => r.status === 'Paid' || r.status === 'Processed') && rows.length > 0 && run?.finance_approved_at) status = 'paid';
  else if (run?.finance_approved_at) status = 'approved';
  else if (rows.every(r => r.finance_verified) && rows.length > 0) status = 'verified';

  const setStatus = () => {};

  const [step,setStep]=useState('verify');
  const sc=STATUS_CFG[status];
  
  if (loading && rows.length === 0) return <div style={{padding:40, textAlign:'center'}}>Loading...</div>;

  return(
    <div style={{fontFamily:'Inter,system-ui,sans-serif'}}>
      <style>{`@media print{body *{visibility:hidden;}.print-area,.print-area *{visibility:visible;}.print-area{position:absolute;left:0;top:0;width:100%;}.no-print{display:none!important;}.hide-in-print{display:none!important;}}`}</style>
      <div className="no-print" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div><h2 style={{margin:0,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-0.5}}>Payroll</h2><p style={{margin:'3px 0 0',fontSize:12,color:C.muted}}>Finance Approval &amp; Accounting</p></div>
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <select value={selMonth} onChange={e=>setSelMonth(e.target.value)} style={{padding:'7px 10px',border:'1px solid #e5e7eb',borderRadius:7,fontSize:13,fontWeight:600,color:C.text,background:'#fff',cursor:'pointer',outline:'none'}}>
            {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m=><option key={m} value={m}>{new Date(2026, parseInt(m)-1, 1).toLocaleString('en-US',{month:'short'})}</option>)}
          </select>
          <select value={selYear} onChange={e=>setSelYear(Number(e.target.value))} style={{padding:'7px 10px',border:'1px solid #e5e7eb',borderRadius:7,fontSize:13,fontWeight:600,color:C.text,background:'#fff',cursor:'pointer',outline:'none'}}>{YEARS.map(y=><option key={y}>{y}</option>)}</select>
          <span style={{padding:'5px 13px',borderRadius:20,fontSize:12,fontWeight:700,background:sc.bg,color:sc.color,border:`1px solid ${sc.border}`}}>{sc.label}</span>
        </div>
      </div>
      <div className="no-print" style={{borderBottom:`1px solid ${C.border}`,marginBottom:22}}>
        {STEPS.map(s=>{
          const reached=STATUS_ORDER.indexOf(status)>=STATUS_ORDER.indexOf(s.req);
          const active=step===s.key;
          return(
            <button key={s.key} onClick={()=>setStep(s.key)} style={{padding:'9px 18px',fontSize:13,fontWeight:active?700:500,cursor:'pointer',border:'none',background:'transparent',borderBottom:active?`2px solid ${C.blue}`:'2px solid transparent',color:active?C.blue:reached?C.muted:'#cbd5e1',transition:'all 0.15s'}}>
              {STATUS_ORDER.indexOf(status)>STATUS_ORDER.indexOf(s.req)?'\u2713 ':''}{s.label}
            </button>
          );
        })}
      </div>
      {step==='verify'&&<VerifyPage status={status} onAction={setStatus} month={month} rows={rows} load={load}/>}
      {step==='approve'&&<ApprovePage status={status} onAction={setStatus} month={month} rows={rows} load={load}/>}
      {step==='payment'&&<PaymentPage status={status} onAction={setStatus} month={month} rows={rows} load={load}/>}
      {step==='post'&&<PostPage status={status} onAction={setStatus} month={month} rows={rows} load={load}/>}
    </div>
  );
}
