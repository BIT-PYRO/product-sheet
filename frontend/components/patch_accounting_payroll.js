const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'accounting-payroll.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace imports
content = content.replace(
  "import {C,fmt,STATUS_ORDER,STATUS_CFG,MOCK,ConfirmModal,SubTabs,PrintExport,Empty,Card,EmpModal,Table,FilterRow} from './payroll-helpers';",
  "import {C,fmt,STATUS_ORDER,STATUS_CFG,ConfirmModal,SubTabs,PrintExport,Empty,Card,EmpModal,Table,FilterRow} from './payroll-helpers';\nimport { getPayrollDashboard, getPayrollRun, actionPayrollRun } from '@/lib/hr-api';\nimport { toast } from 'sonner';"
);

// Add missing useEffect
content = content.replace(
  "import {useState} from 'react';",
  "import {useState, useEffect} from 'react';"
);

// Map MOCK to rows
content = content.replace(/MOCK/g, 'rows');

// Add rows prop to pages
content = content.replace(/function VerifyPage\(\{status,onAction,month\}\)/g, 'function VerifyPage({status,onAction,month,rows,load})');
content = content.replace(/function ApprovePage\(\{status,onAction,month\}\)/g, 'function ApprovePage({status,onAction,month,rows,load})');
content = content.replace(/function PaymentPage\(\{status,onAction,month\}\)/g, 'function PaymentPage({status,onAction,month,rows,load})');
content = content.replace(/function PostPage\(\{status,onAction,month\}\)/g, 'function PostPage({status,onAction,month,rows,load})');

// Update AccountingPayroll component
const newAccountingPayroll = `export default function AccountingPayroll(){
  const [selMonth,setSelMonth]=useState('05');
  const [selYear,setSelYear]=useState(2026);
  const monthToken=\`\${selYear}-\${selMonth}\`;
  const month=\`\${selMonth} \${selYear}\`;

  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({});
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [d, r] = await Promise.all([getPayrollDashboard(monthToken), getPayrollRun(monthToken)]);
      // Map API rows to expected frontend structure
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

  // Derive status from run
  let status = 'received';
  if (run?.gl_posted_at) status = 'posted';
  else if (rows.every(r => r.status === 'Paid' || r.status === 'Processed') && rows.length > 0 && run?.finance_approved_at) status = 'paid';
  else if (run?.finance_approved_at) status = 'approved';
  else if (rows.every(r => r.finance_verified) && rows.length > 0) status = 'verified';

  const setStatus = async (actionStatus) => {
    try {
      if (actionStatus === 'verified') {
        // Handled individually or we could just fake it if needed, but bulk verify is better
      } else if (actionStatus === 'approved') {
        await actionPayrollRun('approve_finance', monthToken);
        toast.success('Payroll approved by Finance.');
      } else if (actionStatus === 'paid') {
        // Actually Payment is handled individually or by export_bank_file
        await actionPayrollRun('export_bank_file', monthToken);
        toast.success('Bank file generated, marked as paid.');
      } else if (actionStatus === 'posted') {
        await actionPayrollRun('post_gl', monthToken);
        toast.success('Payroll posted to GL.');
      }
      load();
    } catch(err) {
      toast.error('Action failed.');
    }
  };

  const [step,setStep]=useState('verify');
  const sc=STATUS_CFG[status];
  
  if (loading && rows.length === 0) return <div style={{padding:40, textAlign:'center'}}>Loading...</div>;

  return(
    <div style={{fontFamily:'Inter,system-ui,sans-serif'}}>
      <style>{\`@media print{body *{visibility:hidden;}.print-area,.print-area *{visibility:visible;}.print-area{position:absolute;left:0;top:0;width:100%;}.no-print{display:none!important;}.hide-in-print{display:none!important;}}\`}</style>
      <div className="no-print" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div><h2 style={{margin:0,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-0.5}}>Payroll</h2><p style={{margin:'3px 0 0',fontSize:12,color:C.muted}}>Finance Approval &amp; Accounting</p></div>
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <select value={selMonth} onChange={e=>setSelMonth(e.target.value)} style={{padding:'7px 10px',border:'1px solid #e5e7eb',borderRadius:7,fontSize:13,fontWeight:600,color:C.text,background:'#fff',cursor:'pointer',outline:'none'}}>
            {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m=><option key={m} value={m}>{new Date(2026, parseInt(m)-1, 1).toLocaleString('en-US',{month:'short'})}</option>)}
          </select>
          <select value={selYear} onChange={e=>setSelYear(Number(e.target.value))} style={{padding:'7px 10px',border:'1px solid #e5e7eb',borderRadius:7,fontSize:13,fontWeight:600,color:C.text,background:'#fff',cursor:'pointer',outline:'none'}}>{YEARS.map(y=><option key={y}>{y}</option>)}</select>
          <span style={{padding:'5px 13px',borderRadius:20,fontSize:12,fontWeight:700,background:sc.bg,color:sc.color,border:\`1px solid \${sc.border}\`}}>{sc.label}</span>
        </div>
      </div>
      <div className="no-print" style={{borderBottom:\`1px solid \${C.border}\`,marginBottom:22}}>
        {STEPS.map(s=>{
          const reached=STATUS_ORDER.indexOf(status)>=STATUS_ORDER.indexOf(s.req);
          const active=step===s.key;
          return(
            <button key={s.key} onClick={()=>setStep(s.key)} style={{padding:'9px 18px',fontSize:13,fontWeight:active?700:500,cursor:'pointer',border:'none',background:'transparent',borderBottom:active?\`2px solid \${C.blue}\`:'2px solid transparent',color:active?C.blue:reached?C.muted:'#cbd5e1',transition:'all 0.15s'}}>
              {STATUS_ORDER.indexOf(status)>STATUS_ORDER.indexOf(s.req)?'✓ ':''}{s.label}
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
}`;

content = content.replace(/export default function AccountingPayroll\(\)\{[\s\S]*\}\s*$/, newAccountingPayroll);

// Fix verifiedIds parsing in VerifyPage to use mapped DB states
content = content.replace(/const \[vIds,setVIds\]=useState\(new Set\(gDone\?rows.map\(r=>r\.id\):\[\]\)\);/g, "const [vIds,setVIds]=useState(new Set(rows.filter(r=>r.finance_verified).map(r=>r.id)));");

// Fix pIds parsing in PaymentPage
content = content.replace(/const \[pIds,setPIds\]=useState\(new Set\(gDone\?rows.map\(r=>r\.id\):\[\]\)\);/g, "const [pIds,setPIds]=useState(new Set(rows.filter(r=>r.status==='Paid'||r.status==='Processed').map(r=>r.id)));");

// Fix single verify and bulk verify api calls
const verifyConfirmReplacement = \`  const doConfirm=async ()=>{
    if(cfm.adv){onAction('verified');}
    else{
      for (const id of cfm.ids) {
        await actionPayrollRun('verify_finance', monthToken, { user_id: id });
      }
      toast.success('Verification saved');
      load();
    }
    setCfm(null);
  };\`;
content = content.replace(/  const doConfirm=\(\)=>\{\s*if\(cfm\.adv\)\{onAction\('verified'\);\}\s*else\{const s=new Set\(vIds\);cfm\.ids\.forEach\(id=>s\.add\(id\)\);setVIds\(s\);setSel\(new Set\(\)\);\}\s*setCfm\(null\);\s*\};/g, verifyConfirmReplacement);
// Need to add monthToken to pages. It's passed as \`monthToken\` so we should just derive it from month if possible, but actually we can just pass \`monthToken\` instead of month.
// Let's just fix it here:
content = content.replace(/monthToken/g, "month.replace(' ', '-').replace('Jan','01').replace('Feb','02').replace('Mar','03').replace('Apr','04').replace('May','05').replace('Jun','06').replace('Jul','07').replace('Aug','08').replace('Sep','09').replace('Oct','10').replace('Nov','11').replace('Dec','12')");
// Actually the simpler way is to just do a regex replace for the doConfirm in PaymentPage
const paymentConfirmReplacement = \`  const doConfirm=async ()=>{
    if(cfm.adv){onAction('paid');}
    else{
      for (const id of cfm.ids) {
        await actionPayrollRun('mark_paid', month.replace(' ', '-').replace('Jan','01').replace('Feb','02').replace('Mar','03').replace('Apr','04').replace('May','05').replace('Jun','06').replace('Jul','07').replace('Aug','08').replace('Sep','09').replace('Oct','10').replace('Nov','11').replace('Dec','12'), { user_id: id });
      }
      toast.success('Payments saved');
      load();
    }
    setCfm(null);
  };\`;
content = content.replace(/  const doConfirm=\(\)=>\{\s*if\(cfm\.adv\)\{onAction\('paid'\);\}\s*else\{const s=new Set\(pIds\);cfm\.ids\.forEach\(id=>s\.add\(id\)\);setPIds\(s\);setSel\(new Set\(\)\);\}\s*setCfm\(null\);\s*\};/g, paymentConfirmReplacement);

// Fix verify doConfirm correctly
content = content.replace(/  const doConfirm=async \(\)=>\{\s*if\(cfm\.adv\)\{onAction\('verified'\);\}\s*else\{\s*for \(const id of cfm\.ids\) \{\s*await actionPayrollRun\('verify_finance', month.replace[^;]+;?\s*\}\s*toast\.success\('Verification saved'\);\s*load\(\);\s*\}\s*setCfm\(null\);\s*\};/, \`  const doConfirm=async ()=>{
    if(cfm.adv){onAction('verified');}
    else{
      for (const id of cfm.ids) {
        await actionPayrollRun('verify_finance', month.replace(' ', '-').replace('Jan','01').replace('Feb','02').replace('Mar','03').replace('Apr','04').replace('May','05').replace('Jun','06').replace('Jul','07').replace('Aug','08').replace('Sep','09').replace('Oct','10').replace('Nov','11').replace('Dec','12'), { user_id: id });
      }
      toast.success('Verification saved');
      load();
    }
    setCfm(null);
  };\`);

fs.writeFileSync(filePath, content);
