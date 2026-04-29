'use client';
export const C={green:'#059669',greenBg:'#ecfdf5',red:'#dc2626',redBg:'#fef2f2',blue:'#2563eb',blueBg:'#eff6ff',amber:'#d97706',amberBg:'#fffbeb',slate:'#64748b',slateBg:'#f8fafc',text:'#0f172a',muted:'#64748b',border:'#e2e8f0',surface:'#ffffff'};
export const fmt=n=>`₹${Number(n).toLocaleString('en-IN',{minimumFractionDigits:2})}`;
export const STATUS_ORDER=['received','verified','approved','paid','posted'];
export const STATUS_CFG={
  received:{label:'Received',bg:'#f1f5f9',color:C.slate,border:C.border},
  verified:{label:'Verified',bg:C.blueBg,color:C.blue,border:'#bfdbfe'},
  approved:{label:'Approved',bg:'#f5f3ff',color:'#7c3aed',border:'#ddd6fe'},
  paid:{label:'Paid',bg:C.greenBg,color:C.green,border:'#a7f3d0'},
  posted:{label:'Posted',bg:'#064e3b',color:'#ecfdf5',border:'#065f46'},
};
export const MOCK=[
  {id:1,name:'Jatin Choudhary',dept:'Operations',gross:50000,ded:7200,net:42800,bank:'HDFC Bank',acc:'****1234',ifsc:'HDFC0001001',earnings:{basic:25000,hra:10000,allowance:10000,reimb:5000},deductions:{pf:3000,tds:4000,pt:200}},
  {id:2,name:'Apoorva',dept:'HR',gross:50000,ded:7200,net:42800,bank:'ICICI Bank',acc:'****5678',ifsc:'ICIC0002002',earnings:{basic:25000,hra:10000,allowance:10000,reimb:5000},deductions:{pf:3000,tds:4000,pt:200}},
  {id:3,name:'Kartik Sharma',dept:'Marketing',gross:50000,ded:7200,net:42800,bank:'SBI',acc:'****9012',ifsc:'SBIN0003003',earnings:{basic:25000,hra:10000,allowance:10000,reimb:5000},deductions:{pf:3000,tds:4000,pt:200}},
  {id:4,name:'Deepak Vishwakarma',dept:'Operations',gross:50000,ded:7200,net:42800,bank:'Axis Bank',acc:'****3456',ifsc:'UTIB0004004',earnings:{basic:25000,hra:10000,allowance:10000,reimb:5000},deductions:{pf:3000,tds:4000,pt:200}},
];
export function ConfirmModal({title,desc,names,nextLabel,onConfirm,onCancel}){
  return(
    <div onClick={onCancel} style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(15,23,42,0.5)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:420,boxShadow:'0 20px 60px rgba(0,0,0,0.25)',padding:'24px 24px 20px'}}>
        <h3 style={{margin:'0 0 6px',fontSize:15,fontWeight:800,color:C.text}}>{title}</h3>
        <p style={{margin:'0 0 12px',fontSize:12,color:C.muted}}>{desc||'The following employees will be affected:'}</p>
        <div style={{background:C.slateBg,borderRadius:10,padding:'10px 14px',marginBottom:18}}>
          {names.map((n,i)=><div key={i} style={{fontSize:13,fontWeight:600,color:C.text,padding:'3px 0'}}>• {n}</div>)}
        </div>
        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button onClick={onCancel} style={{padding:'8px 18px',background:'#fff',border:`1px solid ${C.border}`,borderRadius:7,fontSize:13,fontWeight:600,cursor:'pointer',color:C.text}}>Cancel</button>
          <button onClick={onConfirm} style={{padding:'8px 18px',background:C.blue,color:'#fff',border:'none',borderRadius:7,fontSize:13,fontWeight:700,cursor:'pointer'}}>{nextLabel}</button>
        </div>
      </div>
    </div>
  );
}
export function SubTabs({tab,setTab,pCount,dCount,dLabel}){
  const tabBtn=active=>({padding:'9px 18px',fontSize:13,fontWeight:active?700:500,cursor:'pointer',border:'none',background:'transparent',borderBottom:active?`2px solid ${C.blue}`:'2px solid transparent',color:active?C.blue:C.muted,transition:'all 0.15s'});
  return(
    <div style={{borderBottom:`1px solid ${C.border}`,marginBottom:4}}>
      <button onClick={()=>setTab('pending')} style={tabBtn(tab==='pending')}>Pending ({pCount})</button>
      <button onClick={()=>setTab('done')} style={tabBtn(tab==='done')}>{dLabel} ({dCount})</button>
    </div>
  );
}
export function PrintExport({rows,file,month}){
  const doCSV=()=>{
    const csv=[['Employee','Dept','Gross','Deductions','Net'],...rows.map(r=>[r.name,r.dept,r.gross,r.ded,r.net])].map(r=>r.join(',')).join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=`${file}_${month}.csv`;a.click();
  };
  const s={padding:'7px 14px',background:'#fff',border:'1px solid #e5e7eb',borderRadius:7,fontSize:13,fontWeight:600,color:'#374151',cursor:'pointer'};
  return <div style={{display:'flex',gap:8}}><button onClick={()=>window.print()} style={s}>Print</button><button onClick={doCSV} style={s}>Export CSV</button></div>;
}
export function Empty({msg}){
  return <div style={{padding:'28px',textAlign:'center',background:'#f9fafb',borderRadius:10,border:'1px solid #e5e7eb',fontSize:13,color:'#9ca3af'}}>{msg}</div>;
}
export function Card({label,value,color,icon,note}){
  return(
    <div style={{background:'#fff',borderRadius:12,border:`1px solid ${C.border}`,padding:'18px 20px',flex:1,minWidth:155,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
        <p style={{margin:0,fontSize:11,fontWeight:600,color:C.muted,textTransform:'uppercase',letterSpacing:0.8}}>{label}</p>
        {icon&&<span style={{fontSize:16,opacity:0.6}}>{icon}</span>}
      </div>
      <p style={{margin:0,fontSize:24,fontWeight:800,color:color||C.text,letterSpacing:-0.5,lineHeight:1}}>{value}</p>
      {note&&<p style={{margin:'6px 0 0',fontSize:11,color:C.muted}}>{note}</p>}
    </div>
  );
}
export function EmpModal({emp,onClose}){
  if(!emp) return null;
  const {name,dept,bank,acc,ifsc,gross,ded,net,earnings,deductions}=emp;
  const R=({l,v})=><div style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:`1px solid ${C.slateBg}`}}><span style={{fontSize:13,color:C.muted}}>{l}</span><span style={{fontSize:13,fontWeight:700,color:C.text}}>{fmt(v)}</span></div>;
  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(15,23,42,0.45)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:500,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{padding:'20px 24px 0',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div><h2 style={{margin:0,fontSize:17,fontWeight:800,color:C.text}}>{name}</h2>
            <div style={{display:'flex',gap:6,marginTop:6,flexWrap:'wrap'}}>
              {[dept,`${bank} · ${acc}`,`IFSC: ${ifsc}`].map(t=><span key={t} style={{padding:'2px 9px',background:C.slateBg,borderRadius:20,fontSize:11,fontWeight:600,color:C.slate}}>{t}</span>)}
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:20,color:C.muted,cursor:'pointer'}}>✕</button>
        </div>
        <div style={{padding:'16px 24px 24px',display:'flex',flexDirection:'column',gap:16}}>
          <div><p style={{margin:'0 0 8px',fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase'}}>Earnings</p><div style={{background:C.slateBg,borderRadius:10,padding:'2px 14px'}}><R l="Basic" v={earnings.basic}/><R l="HRA" v={earnings.hra}/><R l="Allowance" v={earnings.allowance}/><R l="Reimbursement" v={earnings.reimb}/></div><div style={{display:'flex',justifyContent:'space-between',padding:'6px 14px 0'}}><span style={{fontSize:12,fontWeight:700,color:C.muted}}>Total</span><span style={{fontSize:14,fontWeight:800,color:C.green}}>{fmt(gross)}</span></div></div>
          <div><p style={{margin:'0 0 8px',fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase'}}>Deductions</p><div style={{background:'#fef9f9',border:`1px solid #fee2e2`,borderRadius:10,padding:'2px 14px'}}><R l="PF" v={deductions.pf}/><R l="TDS" v={deductions.tds}/><R l="Prof. Tax" v={deductions.pt}/></div><div style={{display:'flex',justifyContent:'space-between',padding:'6px 14px 0'}}><span style={{fontSize:12,fontWeight:700,color:C.muted}}>Total</span><span style={{fontSize:14,fontWeight:800,color:C.red}}>{fmt(ded)}</span></div></div>
          <div style={{background:'linear-gradient(135deg,#f0fdf4,#ecfdf5)',border:`1px solid #a7f3d0`,borderRadius:12,padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><p style={{margin:0,fontSize:11,fontWeight:700,color:C.green,textTransform:'uppercase'}}>Net Pay</p><p style={{margin:'2px 0 0',fontSize:11,color:C.muted}}>Gross − Deductions</p></div><span style={{fontSize:24,fontWeight:900,color:C.green}}>{fmt(net)}</span></div>
          <button onClick={onClose} style={{padding:'10px',background:C.slateBg,border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',color:C.text}}>Close</button>
        </div>
      </div>
    </div>
  );
}
export function FilterRow({rows,q,setQ,dept,setDept}){
  const depts=[...new Set(rows.map(r=>r.dept))].sort();
  const s={padding:'7px 12px',background:'#fff',border:'1px solid #e5e7eb',borderRadius:7,fontSize:12,color:'#374151',outline:'none'};
  return(
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:4}}>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search employee or dept…" style={{...s,minWidth:200,flex:1}}/>
      <select value={dept} onChange={e=>setDept(e.target.value)} style={s}>
        <option value="">All Departments</option>
        {depts.map(d=><option key={d} value={d}>{d}</option>)}
      </select>
      {(q||dept)&&<button onClick={()=>{setQ('');setDept('');}} style={{...s,color:'#6b7280',cursor:'pointer'}}>✕ Clear</button>}
    </div>
  );
}
export function Table({rows,showPaid,paidIds,onTogglePaid,onView,verifiedIds,selected,onToggleSel,onToggleAll,onVerifyOne,showActionCol,actionLabel='Verify',doneLabel='✓ Verified',paidLabel='Process',csvFile='payroll',month=''}){
  const hasSel=!!selected;
  const right=['Gross','Deductions','Net Pay'];
  const selCount=selected?selected.size:0;
  const target=selCount>0?rows.filter(r=>selected.has(r.id)):rows;
  const btnS={padding:'7px 14px',background:'#fff',border:'1px solid #e5e7eb',borderRadius:7,fontSize:13,fontWeight:600,color:'#374151',cursor:'pointer'};
  const doCSV=()=>{
    const csv=[['Employee','Dept','Gross','Deductions','Net'],...target.map(r=>[r.name,r.dept,r.gross,r.ded,r.net])].map(r=>r.join(',')).join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=`${csvFile}_${month}.csv`;a.click();
  };
  return(
    <div>
      <div className="no-print" style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
        {selCount>0&&<span style={{fontSize:12,fontWeight:700,color:'#374151',background:'#eff6ff',border:'1px solid #bfdbfe',padding:'4px 10px',borderRadius:20}}>{selCount} row{selCount>1?'s':''} selected</span>}
        <div style={{marginLeft:'auto',display:'flex',gap:8}}>
          <button onClick={()=>window.print()} style={btnS}>Print{selCount>0?` (${selCount})`:' All'}</button>
          <button onClick={doCSV} style={btnS}>Export CSV{selCount>0?` (${selCount})`:''}</button>
        </div>
      </div>
      <div className="print-area" style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:12,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#f9fafb'}}>
            {hasSel&&<th className="no-print" style={{padding:'10px 14px',width:36,borderBottom:`1px solid ${C.border}`}}><input type="checkbox" checked={rows.length>0&&selected.size===rows.length} onChange={onToggleAll} style={{cursor:'pointer',accentColor:'#2563eb'}}/></th>}
            {['Employee','Dept','Gross','Deductions','Net Pay','Info'].map(h=><th key={h} style={{padding:'10px 14px',fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5,textAlign:right.includes(h)?'right':'left',borderBottom:`1px solid ${C.border}`}}>{h}</th>)}
            {(showActionCol||onVerifyOne)&&<th className="no-print" style={{padding:'10px 14px',fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5,borderBottom:`1px solid ${C.border}`}}>{actionLabel}</th>}
            {showPaid&&<th className="no-print" style={{padding:'10px 14px',fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5,borderBottom:`1px solid ${C.border}`}}>Payment</th>}
          </tr></thead>
          <tbody>{rows.map((r,i)=>{
            const isSel=hasSel&&selected.has(r.id);
            const isDone=verifiedIds&&verifiedIds.has(r.id);
            const hidePrint=selCount>0&&!isSel?'hide-in-print':'';
            return(
              <tr key={r.id} className={hidePrint} style={{borderBottom:i<rows.length-1?'1px solid #f3f4f6':'none',background:isSel?C.blueBg:'transparent',transition:'background 0.1s',cursor:hasSel?'pointer':'default'}}
                onClick={hasSel?()=>onToggleSel(r.id):undefined}
                onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background='#f9fafb';}}
                onMouseLeave={e=>{e.currentTarget.style.background=isSel?C.blueBg:'transparent';}}>
                {hasSel&&<td className="no-print" style={{padding:'12px 14px'}}><input type="checkbox" checked={isSel} onChange={()=>onToggleSel(r.id)} onClick={e=>e.stopPropagation()} style={{cursor:'pointer',accentColor:'#2563eb'}}/></td>}
                <td style={{padding:'12px 14px'}}><div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:30,height:30,borderRadius:8,background:`hsl(${r.id*60+210},70%,92%)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:`hsl(${r.id*60+210},60%,35%)`}}>{r.name[0]}</div><div><p style={{margin:0,fontSize:13,fontWeight:700,color:C.text}}>{r.name}</p><p style={{margin:0,fontSize:11,color:C.muted}}>{r.bank} · {r.acc}</p></div></div></td>
                <td style={{padding:'12px 14px'}}><span style={{display:'inline-block',padding:'2px 8px',background:'#f3f4f6',color:'#374151',borderRadius:20,fontSize:12,fontWeight:600}}>{r.dept}</span></td>
                <td style={{padding:'12px 14px',textAlign:'right',fontSize:13,fontWeight:700,color:C.blue}}>{fmt(r.gross)}</td>
                <td style={{padding:'12px 14px',textAlign:'right',fontSize:13,fontWeight:600,color:C.red}}>{fmt(r.ded)}</td>
                <td style={{padding:'12px 14px',textAlign:'right',fontSize:14,fontWeight:800,color:C.green}}>{fmt(r.net)}</td>
                <td className="no-print" style={{padding:'12px 14px'}}><button onClick={e=>{e.stopPropagation();onView&&onView(r);}} style={{padding:'4px 12px',background:C.blueBg,color:C.blue,border:'1px solid #bfdbfe',borderRadius:6,fontSize:12,fontWeight:700,cursor:'pointer'}}>View</button></td>
                {(showActionCol||onVerifyOne)&&<td className="no-print" style={{padding:'12px 14px'}}>{isDone?<span style={{fontSize:12,fontWeight:700,color:C.green}}>{doneLabel}</span>:<button onClick={e=>{e.stopPropagation();onVerifyOne&&onVerifyOne(r.id);}} disabled={!onVerifyOne} style={{padding:'5px 12px',background:onVerifyOne?C.blue:'#e5e7eb',color:onVerifyOne?'#fff':'#9ca3af',border:'none',borderRadius:6,fontSize:12,fontWeight:700,cursor:onVerifyOne?'pointer':'not-allowed',opacity:onVerifyOne?1:0.7}}>{actionLabel}</button>}</td>}
                {showPaid&&<td className="no-print" style={{padding:'12px 14px'}}>{(paidIds&&paidIds.has(r.id))?<span style={{fontSize:12,fontWeight:700,color:C.green}}>✓ Transferred</span>:<button onClick={e=>{e.stopPropagation();onTogglePaid&&onTogglePaid(r.id);}} disabled={!onTogglePaid} style={{padding:'5px 12px',background:onTogglePaid?C.blue:'#e5e7eb',color:onTogglePaid?'#fff':'#9ca3af',border:'none',borderRadius:6,fontSize:12,fontWeight:700,cursor:onTogglePaid?'pointer':'not-allowed',opacity:onTogglePaid?1:0.7}}>{paidLabel}</button>}</td>}
              </tr>
            );
          })}</tbody>
          <tfoot><tr style={{background:'#f9fafb',borderTop:`2px solid ${C.border}`}}>
            <td colSpan={hasSel?3:2} style={{padding:'10px 14px',fontSize:12,fontWeight:700,color:C.muted}}>TOTALS</td>
            <td style={{padding:'10px 14px',textAlign:'right',fontSize:13,fontWeight:800,color:C.blue}}>{fmt(rows.reduce((s,r)=>s+r.gross,0))}</td>
            <td style={{padding:'10px 14px',textAlign:'right',fontSize:13,fontWeight:800,color:C.red}}>{fmt(rows.reduce((s,r)=>s+r.ded,0))}</td>
            <td style={{padding:'10px 14px',textAlign:'right',fontSize:14,fontWeight:900,color:C.green}}>{fmt(rows.reduce((s,r)=>s+r.net,0))}</td>
            <td className="no-print"/>{onVerifyOne&&<td className="no-print"/>}{showPaid&&<td className="no-print"/>}
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}


