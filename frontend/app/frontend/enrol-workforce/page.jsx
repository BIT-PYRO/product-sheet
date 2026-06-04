'use client';
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from 'react-dom';
import { X, Check, ChevronDown, Camera, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDrafts, useDraftLoader } from "@/components/drafts-manager";
import { useSheetPermissions } from '@/hooks/use-sheet-permissions';

const PENDING_DRAFT_KEY = 'pending_enroll_workforce_draft';
const INPUT_CLS = 'w-full border border-soft-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent bg-cloud-gray text-midnight-ink placeholder-slate-400 transition disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-80';
const ERROR_CLS = 'text-xs text-red-500 mt-1';

const DESIGNATION_ORDER = [
  'Chairman','CEO','Director','General Manager','Department Head','Project Manager',
  'Manager','Supervisor','Associate','Developer','Intern','craftsMan','Worker',
  'Cook','Pantry Boy','Janitor','Messenger','Security','Electrician','Plumber',
  'CCTV','Carpenter','Ironsmith','Locksmith',
];
function normalizeRoleLabel(role) {
  const value = String(role || '').trim();
  if (!value) return '';
  if (/^labour$/i.test(value)) return 'craftsMan';
  if (/^craftsman$/i.test(value)) return 'craftsMan';
  if (/^craftsman\/artisan$/i.test(value)) return 'craftsMan';
  if (/^craftsman-artisan$/i.test(value)) return 'craftsMan';
  return value;
}

// Maps all department name variants to a single canonical name so the
// DEPT_DATA lookup (and role dropdown) always works correctly.
const DEPT_NAME_ALIASES = {
  'crm':                              'Customer Relation Management',
  'customer relation management':     'Customer Relation Management',
  'customer relation manage':         'Customer Relation Management',
  'customer relationship management': 'Customer Relation Management',
  'customer relation':                'Customer Relation Management',
  'sales / business development':     'Sales / Business Development',
  'sales/business development':       'Sales / Business Development',
  'sales & business development':     'Sales / Business Development',
  'information technology':           'Information Technology',
  'it':                               'Information Technology',
  'human resource':                   'Human Resource',
  'human resources':                  'Human Resource',
  'hr':                               'Human Resource',
};
function normalizeDeptLabel(dept) {
  const value = String(dept || '').trim();
  if (!value) return '';
  return DEPT_NAME_ALIASES[value.toLowerCase()] || value;
}
function getDesignationRank(desig) {
  if (!desig) return 999;
  const idx = DESIGNATION_ORDER.findIndex(d => d.toLowerCase() === desig.toLowerCase());
  return idx === -1 ? 998 : idx;
}

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir',
  'Ladakh','Lakshadweep','Puducherry',
];

const STATE_CITIES = {
  'Andhra Pradesh': ['Visakhapatnam','Vijayawada','Guntur','Nellore','Kurnool','Rajahmundry','Tirupati','Kakinada','Kadapa','Anantapur'],
  'Arunachal Pradesh': ['Itanagar','Naharlagun','Pasighat','Tawang','Ziro'],
  'Assam': ['Guwahati','Silchar','Dibrugarh','Jorhat','Nagaon','Tinsukia','Bongaigaon','Tezpur'],
  'Bihar': ['Patna','Gaya','Muzaffarpur','Bhagalpur','Darbhanga','Arrah','Begusarai','Purnia','Sasaram'],
  'Chhattisgarh': ['Raipur','Bhilai','Bilaspur','Korba','Durg','Rajnandgaon','Jagdalpur'],
  'Goa': ['Panaji','Margao','Vasco da Gama','Mapusa','Ponda','Calangute'],
  'Gujarat': ['Ahmedabad','Surat','Vadodara','Rajkot','Bhavnagar','Jamnagar','Gandhinagar','Junagadh','Anand','Navsari','Morbi'],
  'Haryana': ['Faridabad','Gurgaon','Panipat','Ambala','Yamunanagar','Rohtak','Hisar','Karnal','Sonipat','Panchkula'],
  'Himachal Pradesh': ['Shimla','Dharamsala','Solan','Mandi','Baddi','Nahan','Palampur','Kullu'],
  'Jharkhand': ['Ranchi','Jamshedpur','Dhanbad','Bokaro','Deoghar','Hazaribagh','Giridih','Ramgarh'],
  'Karnataka': ['Bangalore','Mysore','Hubli','Mangalore','Belgaum','Gulbarga','Davanagere','Bellary','Shimoga','Tumkur','Bijapur'],
  'Kerala': ['Thiruvananthapuram','Kochi','Kozhikode','Thrissur','Kannur','Kollam','Palakkad','Alappuzha','Malappuram','Kottayam'],
  'Madhya Pradesh': ['Bhopal','Indore','Jabalpur','Gwalior','Ujjain','Rewa','Satna','Ratlam','Dewas','Sagar'],
  'Maharashtra': ['Mumbai','Pune','Nagpur','Nashik','Aurangabad','Thane','Solapur','Kolhapur','Amravati','Navi Mumbai','Sangli','Jalgaon','Akola'],
  'Manipur': ['Imphal','Churachandpur','Thoubal','Bishnupur','Ukhrul'],
  'Meghalaya': ['Shillong','Tura','Jowai','Nongstoin','Williamnagar'],
  'Mizoram': ['Aizawl','Lunglei','Champhai','Serchhip','Kolasib'],
  'Nagaland': ['Kohima','Dimapur','Mokokchung','Tuensang','Wokha'],
  'Odisha': ['Bhubaneswar','Cuttack','Berhampur','Sambalpur','Rourkela','Balasore','Puri','Brahmapur'],
  'Punjab': ['Ludhiana','Amritsar','Jalandhar','Patiala','Bathinda','Mohali','Hoshiarpur','Gurdaspur'],
  'Rajasthan': ['Jaipur','Jodhpur','Udaipur','Kota','Ajmer','Bikaner','Alwar','Bharatpur','Sikar','Sri Ganganagar'],
  'Sikkim': ['Gangtok','Namchi','Gyalshing','Mangan','Rangpo'],
  'Tamil Nadu': ['Chennai','Coimbatore','Madurai','Tiruchirappalli','Salem','Tirunelveli','Vellore','Erode','Tiruppur','Thoothukudi','Nagercoil'],
  'Telangana': ['Hyderabad','Warangal','Nizamabad','Khammam','Karimnagar','Ramagundam','Mahbubnagar'],
  'Tripura': ['Agartala','Dharmanagar','Udaipur','Kailasahar','Belonia'],
  'Uttar Pradesh': ['Lucknow','Kanpur','Agra','Varanasi','Meerut','Allahabad','Ghaziabad','Noida','Mathura','Aligarh','Bareilly','Moradabad','Saharanpur','Gorakhpur','Firozabad'],
  'Uttarakhand': ['Dehradun','Haridwar','Roorkee','Nainital','Rishikesh','Haldwani','Rudrapur','Kashipur'],
  'West Bengal': ['Kolkata','Howrah','Durgapur','Asansol','Siliguri','Bardhaman','Malda','Kharagpur','Haldia'],
  'Andaman and Nicobar Islands': ['Port Blair','Car Nicobar','Mayabunder'],
  'Chandigarh': ['Chandigarh'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Silvassa','Daman','Diu'],
  'Delhi': ['New Delhi','Delhi','Dwarka','Rohini','Janakpuri','Saket','Laxmi Nagar','Pitampura'],
  'Jammu and Kashmir': ['Srinagar','Jammu','Anantnag','Sopore','Baramulla','Udhampur'],
  'Ladakh': ['Leh','Kargil'],
  'Lakshadweep': ['Kavaratti','Agatti','Minicoy'],
  'Puducherry': ['Puducherry','Karaikal','Mahe','Yanam'],
};

const CITY_PINCODE_HINT = {
  'Mumbai': '400001','Delhi': '110001','New Delhi': '110001','Bangalore': '560001','Hyderabad': '500001',
  'Chennai': '600001','Kolkata': '700001','Ahmedabad': '380001','Pune': '411001','Jaipur': '302001',
  'Surat': '395001','Lucknow': '226001','Kanpur': '208001','Nagpur': '440001','Patna': '800001',
  'Indore': '452001','Bhopal': '462001','Vadodara': '390001','Ludhiana': '141001','Agra': '282001',
  'Nashik': '422001','Faridabad': '121001','Meerut': '250001','Rajkot': '360001','Varanasi': '221001',
  'Thane': '400601','Ghaziabad': '201001','Aurangabad': '431001','Amritsar': '143001','Navi Mumbai': '400701',
  'Allahabad': '211001','Ranchi': '834001','Coimbatore': '641001','Jodhpur': '342001','Madurai': '625001',
  'Raipur': '492001','Kochi': '682001','Visakhapatnam': '530001','Chandigarh': '160001',
  'Dehradun': '248001','Gurgaon': '122001','Noida': '201301','Thiruvananthapuram': '695001',
};

const COUNTRIES = [
  'India','United States','United Kingdom','Canada','Australia','Germany',
  'France','Singapore','UAE','Saudi Arabia','Qatar','Kuwait','Bahrain',
  'New Zealand','Netherlands','Switzerland','Japan','China','Bangladesh',
  'Sri Lanka','Nepal','Pakistan',
];

const INDIAN_LANGUAGES = [
  'Assamese','Bengali','Bodo','Dogri','English','Gujarati','Hindi','Kannada','Kashmiri',
  'Konkani','Maithili','Malayalam','Manipuri','Marathi','Nepali','Odia',
  'Punjabi','Sanskrit','Santali','Sindhi','Tamil','Telugu','Urdu',
];

const WORKING_STYLES = ['On-site','Remote','Hybrid','Field Work','Part-time','Contractual'];

const DEPT_DATA = {
  'Marketing':                    { categories: ['Performance','Offline','International','Social Media'], roles: ['Chairman','CEO','Director','Department Head','Manager','Associate','Intern'] },
  'Customer Relation Management': { categories: ['Inbound Calls','Outbound Calls','Social Media','Emails','Offline'], roles: ['Department Head','Director','Manager','Associate','Intern'] },
  'Operations':                   { categories: [], roles: ['Chairman','CEO','Director','Department Head','Manager','Associate','Intern'] },
  'Design':                       { categories: ['Jewellery','Branding','Visuals','Photographer / Videographer'], roles: ['Chairman','CEO','Director','Department Head','Manager','Associate','Intern'] },
  'Logistics':                    { categories: [], roles: ['Chairman','CEO','Director','Department Head','Manager','Associate','Intern'] },
  'Purchase':                     { categories: ['Tools / Machinery','Metals','Gemstones'], roles: ['Chairman','CEO','Director','Department Head','Manager','Associate'] },
  'Sales / Business Development': { categories: ['Domestic','International'], roles: ['Chairman','CEO','Director','Department Head','Manager','Associate','Intern'] },
  'Finance':                      { categories: [], roles: ['Chairman','CEO','Director','Department Head','Manager','Associate','Intern'] },
  'Information Technology':       { categories: ['Shopify','Software'], roles: ['Chairman','CEO','Director','Department Head','General Manager','Project Manager','Developer','Associate','Intern'] },
  'Human Resource':               { categories: [], roles: ['Chairman','CEO','Director','Department Head','Manager','Associate','Intern'] },
  'Production':                   { categories: ['3D Printing','Die Cutting','Master Making','Wax','Wax Setting','Casting','Filing','Polish','Enamel','Hand Setting','Plating','Quality Check'], roles: ['Chairman','CEO','Director','Department Head','General Manager','Manager','Supervisor','craftsMan'] },
  'Services':                     { categories: [], roles: ['Security','Electrician','Plumber','CCTV','Carpenter','Ironsmith','Locksmith'] },
  'House Keeping':                { categories: [], roles: ['Cook','Pantry Boy','Janitor','Messenger'] },
};

const DEPARTMENTS = Object.keys(DEPT_DATA);

/* Multi-select dropdown with checkboxes */
function MultiCheckboxSelect({ label, options, selected, onChange, placeholder, disabled, extraInputValue, extraInputChange, extraInputPlaceholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  const displayValue = selected.filter(v => v !== 'Other').join(', ');
  const hasOther = selected.includes('Other');
  return (
    <div ref={ref} className="relative">
      <button type="button" disabled={disabled} onClick={() => !disabled && setOpen(o => !o)}
        className={INPUT_CLS + ' text-left flex items-center justify-between'}>
        <span className={displayValue || hasOther ? 'text-midnight-ink' : 'text-slate-400'}>
          {displayValue || (hasOther ? 'Other' : placeholder || 'Select...')}
        </span>
        <ChevronDown className={'h-4 w-4 text-cool-gray shrink-0 ml-2 transition-transform' + (open ? ' rotate-180' : '')} />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-soft-border rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {options.map(opt => (
            <label key={opt} className="flex items-center gap-2 px-3 py-2 hover:bg-cloud-gray cursor-pointer text-sm">
              <input type="checkbox" checked={selected.includes(opt)}
                onChange={() => { const n = selected.includes(opt) ? selected.filter(v=>v!==opt) : [...selected,opt]; onChange(n); }}
                className="w-4 h-4 accent-trust-blue" />
              <span>{opt}</span>
            </label>
          ))}
          <label className="flex items-center gap-2 px-3 py-2 hover:bg-cloud-gray cursor-pointer text-sm">
            <input type="checkbox" checked={hasOther}
              onChange={() => { const n = hasOther ? selected.filter(v=>v!=='Other') : [...selected,'Other']; onChange(n); }}
              className="w-4 h-4 accent-trust-blue" />
            <span className="italic text-cool-gray">Other...</span>
          </label>
        </div>
      )}
      {hasOther && (
        <input className={INPUT_CLS + ' mt-1'} placeholder={extraInputPlaceholder || 'Enter custom value'}
          value={extraInputValue || ''} onChange={e => extraInputChange && extraInputChange(e.target.value)} />
      )}
    </div>
  );
}

function defaultPermsByRole(designation, department) {
  const des  = (designation || '').trim();
  const dept = (department  || '').trim();
  const p  = (v,e,c,x,a) => ({ view:!!v, edit:!!e, create:!!c, export:!!x, amount:!!a });
  const N=p(0,0,0,0,0), V=p(1,0,0,0,0), VC=p(1,0,1,0,0), VEC=p(1,1,1,0,0), VECE=p(1,1,1,1,0), FULL=p(1,1,1,1,1);
  const ALL_KEYS = ['product-sheet','master-product-sheet','master-inventory-sheet','enrol-customer','master-customer-sheet','master-kyc-sheet','enrol-workforce','master-workforce-sheet','master-job-sheet','managers-dashboard','drafts','orders','my-desk','create-generic-job','master-designer-sheet','designer-sheet','finding-sheet','finding-entry','inventory','accountancy'];
  const allPerm=(lvl)=>Object.fromEntries(ALL_KEYS.map(k=>[k,lvl]));
  const baseBuild=()=>Object.fromEntries(ALL_KEYS.map(k=>[k,N]));
  if (['Chairman','CEO'].includes(des)) return { sheets: allPerm(FULL), manage_members: true };
  if (['Director','General Manager'].includes(des)) return { sheets: allPerm(FULL), manage_members: false };
  if (['Department Head','Project Manager'].includes(des)) {
    const s=allPerm(VECE); s['managers-dashboard']=V; s['my-desk']=FULL; s['drafts']=FULL;
    return { sheets: s, manage_members: false };
  }
  if (des === 'Manager') {
    const s=baseBuild(); s['my-desk']=VEC; s['drafts']=VEC; s['product-sheet']=V; s['orders']=V;
    switch (dept) {
      case 'Finance': s['master-product-sheet']=FULL; s['master-inventory-sheet']=FULL; s['master-customer-sheet']=V; s['master-kyc-sheet']=VECE; s['orders']=FULL; break;
      case 'Human Resource': s['enrol-workforce']=VECE; s['master-workforce-sheet']=VECE; s['master-kyc-sheet']=V; break;
      case 'Sales / Business Development': s['enrol-customer']=VECE; s['master-customer-sheet']=VECE; s['master-product-sheet']=V; s['orders']=VECE; break;
      case 'Customer Relation Management': s['enrol-customer']=VEC; s['master-customer-sheet']=VEC; s['orders']=V; break;
      case 'Purchase': s['master-inventory-sheet']=VECE; s['inventory']=VECE; s['finding-sheet']=V; s['finding-entry']=VECE; s['master-product-sheet']=V; break;
      case 'Production': s['master-job-sheet']=VEC; s['create-generic-job']=VEC; s['finding-sheet']=V; s['finding-entry']=VEC; s['orders']=V; break;
      case 'Design': s['master-designer-sheet']=VEC; s['designer-sheet']=VEC; s['finding-sheet']=V; break;
      case 'Marketing': s['master-customer-sheet']=V; break;
      case 'Logistics': s['orders']=VECE; s['master-product-sheet']=V; break;
      case 'Operations': s['master-job-sheet']=VEC; s['create-generic-job']=VEC; s['orders']=V; break;
      case 'Information Technology': s['master-product-sheet']=V; s['master-inventory-sheet']=V; s['master-job-sheet']=V; break;
    }
    return { sheets: s, manage_members: false };
  }
  if (['Associate','Developer','Supervisor'].includes(des)) {
    const s=baseBuild(); s['my-desk']=VEC; s['drafts']=VEC; s['product-sheet']=V;
    switch (dept) {
      case 'Finance': s['orders']=V; break;
      case 'Human Resource': s['enrol-workforce']=VC; s['master-workforce-sheet']=V; break;
      case 'Sales / Business Development': s['enrol-customer']=VC; s['master-customer-sheet']=V; s['orders']=V; break;
      case 'Customer Relation Management': s['enrol-customer']=VC; s['master-customer-sheet']=V; break;
      case 'Purchase': s['master-inventory-sheet']=V; s['inventory']=V; s['finding-entry']=VC; break;
      case 'Production': s['master-job-sheet']=V; s['finding-entry']=VC; s['create-generic-job']=VC; break;
      case 'Design': s['designer-sheet']=VEC; s['finding-sheet']=V; s['finding-entry']=VC; break;
      case 'Marketing': s['master-customer-sheet']=V; break;
      case 'Logistics': s['orders']=V; break;
      case 'Operations': s['orders']=V; s['master-job-sheet']=V; s['create-generic-job']=VC; break;
      case 'Information Technology': s['master-product-sheet']=V; s['master-inventory-sheet']=V; break;
    }
    return { sheets: s, manage_members: false };
  }
  if (['Intern','craftsMan','Worker'].includes(des)) {
    const s=baseBuild(); s['my-desk']=VEC; s['drafts']=VEC;
    if (dept==='Production') s['master-job-sheet']=V;
    if (des==='Intern') s['product-sheet']=V;
    return { sheets: s, manage_members: false };
  }
  const noAccessRoles=['Security','Electrician','Plumber','CCTV Operator','Carpenter','Ironsmith','Locksmith','Cook','Pantry Boy','Janitor','Messenger'];
  if (noAccessRoles.includes(des)) return { sheets: baseBuild(), manage_members: false };
  const s=baseBuild(); s['my-desk']=VEC; s['drafts']=VEC;
  return { sheets: s, manage_members: false };
}

const emptyAddress = () => ({ line1:'',line2:'',country:'',countryOther:'',state:'',stateOther:'',city:'',cityOther:'',pincode:'' });

function validateForm(form) {
  const errors = {};
  if (!String(form.fullName||'').trim()) errors.fullName = 'Full Name is required.';
  const contact = String(form.contact||'').trim();
  if (!contact) errors.contact = 'Contact Number is required.';
  else if (!/^\+?[\d\s\-]{7,15}$/.test(contact)) errors.contact = 'Enter a valid phone number.';
  const email = String(form.email||'').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
  if (!String(form.gender||'').trim()) errors.gender = 'Gender is required.';
  const ca = form.currentAddress;
  if (!ca.country) errors['currentAddress.country'] = 'Country is required.';
  if (!ca.line1) errors['currentAddress.line1'] = 'Address Line 1 is required.';
  if (ca.country==='India') {
    if (!ca.state) errors['currentAddress.state'] = 'State is required for India.';
    if (!ca.city) errors['currentAddress.city'] = 'City is required for India.';
    if (ca.pincode && !/^\d{6}$/.test(ca.pincode)) errors['currentAddress.pincode'] = 'Indian pincode must be 6 digits.';
  }
  if (!form.sameAsCurrent) {
    const pa = form.permanentAddress;
    if (!pa.country) errors['permanentAddress.country'] = 'Country is required.';
    if (!pa.line1) errors['permanentAddress.line1'] = 'Address Line 1 is required.';
    if (pa.country==='India') {
      if (!pa.state) errors['permanentAddress.state'] = 'State is required for India.';
      if (!pa.city) errors['permanentAddress.city'] = 'City is required for India.';
      if (pa.pincode && !/^\d{6}$/.test(pa.pincode)) errors['permanentAddress.pincode'] = 'Indian pincode must be 6 digits.';
    }
  }
  return errors;
}

function normalizeDateValue(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  // Accept already-correct HTML date value.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  // Accept dd-mm-yyyy from legacy values and convert.
  const m = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    return `${yyyy}-${mm}-${dd}`;
  }
  return value;
}

function extractApiErrorMessage(result) {
  if (!result) return 'Unable to enroll workforce member.';
  const detail = result?.error?.details;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const lines = detail.map(v => String(v || '').trim()).filter(Boolean);
    if (lines.length) return lines.join(', ');
  }
  if (detail && typeof detail === 'object') {
    const parts = [];
    Object.entries(detail).forEach(([key, val]) => {
      const values = Array.isArray(val) ? val : [val];
      values.forEach(v => {
        const msg = String(v || '').trim();
        if (msg) parts.push(key === 'non_field_errors' ? msg : `${key}: ${msg}`);
      });
    });
    if (parts.length) return parts.join(' | ');
  }
  return result?.error?.message || result?.message || 'Unable to enroll workforce member.';
}

function buildDocProxyUrl(url, mode = 'preview') {
  const clean = String(url || '').trim();
  if (!clean) return '';
  return `/api/workforce/document-file?mode=${encodeURIComponent(mode)}&url=${encodeURIComponent(clean)}`;
}

export function EnrolWorkforceForm({ onEnroll, onClose, open=true, draftData=null, editingId=null, readOnly=false, canEditOverride=false }) {
  const { canEdit: sheetCanEdit, canCreate } = useSheetPermissions('master-workforce-sheet');
  const canEdit = canEditOverride || sheetCanEdit;
  const { saveDraft } = useDrafts();
  const loadedDraft = useDraftLoader();
  const formScrollRef = React.useRef(null);

  const [form, setForm] = useState({
    fullName:'', dob:'', gender:'', email:'', contact:'', whatsapp:'',
    departments:[], departmentOther:'',
    designations:[], designationOther:'',
    workingStyle:'', workingStyleOther:'',
    categories:[], categoryOther:'',
    currentAddress: emptyAddress(),
    permanentAddress: emptyAddress(),
    sameAsCurrent: false,
    currentLocation:'', firstLang:'', firstLangOther:'', secondLang:'', secondLangOther:'',
    accountName:'', bankName:'', accountNumber:'', ifsc:'', notes:'',
    dateOfJoining:'',
  });

  const [profilePhoto, setProfilePhoto] = useState(null);
  const profilePhotoInputRef = useRef(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [documents, setDocuments] = useState({ aadhaar:null, pan:null });
  const [uploadedDocs, setUploadedDocs] = useState({ aadhaar:null, pan:null });
  const [docUploadStatus, setDocUploadStatus] = useState({ aadhaar:null, pan:null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isReadOnly, setIsReadOnly] = useState(readOnly);
  const savedFormRef = React.useRef(null);
  const originalEmailRef = React.useRef('');
  const [customRoles, setCustomRoles] = useState([]);
  const [customDepartments, setCustomDepartments] = useState([]);

  useEffect(() => {
    fetch('/api/workforce/meta',{cache:'no-store'}).then(r=>r.json()).catch(()=>null).then(meta=>{
      if (!meta?.success) return;
      const staticRoles = new Set(
        Object.values(DEPT_DATA)
          .flatMap(d=>d.roles)
          .map(r=>normalizeRoleLabel(r).toLowerCase())
      );
      const normalizedMetaRoles = (meta.data?.designations||[])
        .map(r=>normalizeRoleLabel(r))
        .filter(Boolean);
      const dedupedMetaRoles = [...new Map(normalizedMetaRoles.map(r=>[r.toLowerCase(), r])).values()];
      setCustomRoles(dedupedMetaRoles.filter(r=>!staticRoles.has(r.toLowerCase())));
      const staticDepts = new Set(Object.keys(DEPT_DATA).map(d=>d.toLowerCase()));
      setCustomDepartments((meta.data?.departments||[]).filter(d=>!staticDepts.has(d.toLowerCase())));
    });
  }, []);

  function normalizeDraft(d) {
    return {
      ...d,
      departments: Array.isArray(d.departments)?d.departments.map(normalizeDeptLabel):(d.department?[normalizeDeptLabel(d.department)]:[]),
      departmentOther: d.departmentOther||'',
      designations: (Array.isArray(d.designations)?d.designations:(d.designation?[d.designation]:[])).map(normalizeRoleLabel),
      designationOther: d.designationOther||'',
      categories: Array.isArray(d.categories)?d.categories:(d.category?[d.category]:[]),
      categoryOther: d.categoryOther||'',
    };
  }

  useEffect(() => { if (draftData) setForm(normalizeDraft(draftData)); }, [draftData]);
  useEffect(() => {
    const p = localStorage.getItem(PENDING_DRAFT_KEY);
    if (p) { try { setForm(normalizeDraft(JSON.parse(p))); localStorage.removeItem(PENDING_DRAFT_KEY); } catch {} }
  }, []);
  useEffect(() => {
    if (loadedDraft && loadedDraft.section==='Enroll Workforce') setForm(normalizeDraft(loadedDraft.data));
  }, [loadedDraft]);

  useEffect(() => {
    if (!editingId) return;
    fetch(`/api/workforce/${editingId}`,{cache:'no-store'}).then(r=>r.json()).then(result=>{
      const d = result?.data||result;
      if (!d?.full_name && !d?.id) return;
      setForm({
        fullName:d.full_name||'', dob:d.dob||'', gender:d.gender||'',
        email:d.email||'', contact:d.phone||'', whatsapp:d.whatsapp||'',
        departments:(d.department||'').split(',').map(s=>normalizeDeptLabel(s.trim())).filter(Boolean),
        departmentOther:'',
        designations:(d.designation||'').split(',').map(s=>normalizeRoleLabel(s)).filter(Boolean),
        designationOther:'',
        workingStyle:d.working_style||'', workingStyleOther:'',
        categories:(d.category||'').split(',').map(s=>s.trim()).filter(Boolean),
        categoryOther:'',
        currentAddress:{...emptyAddress(),...(d.current_address||{})},
        permanentAddress:{...emptyAddress(),...(d.permanent_address||{})},
        sameAsCurrent:false,
        currentLocation:d.current_location||'',
        firstLang:d.first_language||'', firstLangOther:'',
        secondLang:d.second_language||'', secondLangOther:'',
        accountName:d.account_name||'', bankName:d.bank_name||'',
        accountNumber:d.account_number||'', ifsc:d.ifsc||'', notes:d.notes||'',
        dateOfJoining:d.date_of_joining||'',
      });
      if (d.profile_photo_url) setProfilePhoto(d.profile_photo_url);
      if (d.aadhaar_url) setUploadedDocs(p=>({...p,aadhaar:d.aadhaar_url}));
      if (d.pan_url) setUploadedDocs(p=>({...p,pan:d.pan_url}));
      originalEmailRef.current = d.email || '';
    }).catch(()=>{});
  }, [editingId]);

  const [viewerMember, setViewerMember] = useState(null);
  const [viewerSession, setViewerSession] = useState(null);
  const [targetDesignation, setTargetDesignation] = useState(null);
  useEffect(() => {
    if (!editingId) return;
    (async()=>{
      try {
        const sessRes=await fetch('/api/auth/session',{cache:'no-store'});
        const sessJson=await sessRes.json();
        if (!sessRes.ok||!sessJson.success) return;
        setViewerSession(sessJson.user||null);
        const email=sessJson.user?.email||'';
        if (!email) return;
        const wfRes=await fetch('/api/workforce?page_size=200',{cache:'no-store'});
        const wfJson=await wfRes.json().catch(()=>null);
        const list=Array.isArray(wfJson?.data)?wfJson.data:Array.isArray(wfJson?.data?.results)?wfJson.data.results:Array.isArray(wfJson?.results)?wfJson.results:[];
        const viewer=list.find(m=>(m.email||'').toLowerCase()===email.toLowerCase());
        if (viewer) setViewerMember(viewer);
        const target=list.find(m=>m.id===editingId);
        if (target) setTargetDesignation(target.designation);
      } catch {}
    })();
  }, [editingId]);

  const viewerIsSuperUser=(()=>{
    if (!viewerSession) return false;
    if (viewerSession.role==='admin') return true;
    if (viewerSession.is_superuser) return true;
    const des=(viewerMember?.designation||'').toLowerCase().trim();
    return des==='chairman'||des==='ceo';
  })();

  const jobDetailsLocked=(()=>{
    if (!editingId) return false;
    if (viewerIsSuperUser) return false;
    if (!viewerMember) return true;
    if (!viewerMember.permissions?.manage_members) return true;
    if (viewerMember.id===editingId) return true;
    return getDesignationRank(viewerMember.designation)>=getDesignationRank(targetDesignation);
  })();

  const handleSameAsCurrent=(checked)=>setForm(prev=>({...prev,sameAsCurrent:checked,permanentAddress:checked?{...prev.currentAddress}:emptyAddress()}));

  function handleProfilePhotoChange(e) {
    const file=e.target.files?.[0];
    if (!file) return;
    if (file.size>5*1024*1024){alert('Photo must be under 5 MB.');return;}
    const reader=new FileReader();
    reader.onload=ev=>{setProfilePhoto(ev.target.result);setPhotoFile(file);};
    reader.readAsDataURL(file);
  }

  const handleFile=(e,docType)=>{
    const file=e.target.files?.[0];
    if (!file) return;
    if (file.size>5*1024*1024){alert('File must be under 5 MB.');return;}
    const allowed=['application/pdf','image/jpeg','image/jpg','image/png'];
    if (!allowed.includes(file.type)){alert('Only PDF, JPG, PNG files are allowed.');return;}
    setDocuments(prev=>({...prev,[docType]:file}));
    setDocUploadStatus(prev=>({...prev,[docType]:null}));
  };
  const handleUploadClick=(docType)=>{if(!isReadOnly) document.getElementById(`file-input-${docType}`).click();};

  async function uploadDocumentFile(memberId,docType,file) {
    if (!file||!memberId) return null;
    setDocUploadStatus(prev=>({...prev,[docType]:'uploading'}));
    try {
      const reader=new FileReader();
      const dataUrl=await new Promise((res,rej)=>{reader.onload=e=>res(e.target.result);reader.onerror=rej;reader.readAsDataURL(file);});
      const res=await fetch(`/api/workforce/${memberId}/upload-document`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({doc_type:docType,photo_data:dataUrl})});
      const result=await res.json().catch(()=>null);
      if (!res.ok||!result?.success) throw new Error(result?.message||'Upload failed');
      setUploadedDocs(prev=>({...prev,[docType]:result.data?.url||'uploaded'}));
      setDocUploadStatus(prev=>({...prev,[docType]:'done'}));
      return result.data?.url;
    } catch {
      setDocUploadStatus(prev=>({...prev,[docType]:'error'}));
      return null;
    }
  }

  async function deleteUploadedDocument(memberId, docType) {
    if (!docType) return false;
    if (!memberId) {
      setUploadedDocs(prev => ({ ...prev, [docType]: null }));
      setDocuments(prev => ({ ...prev, [docType]: null }));
      setDocUploadStatus(prev => ({ ...prev, [docType]: null }));
      return true;
    }

    setDocUploadStatus(prev => ({ ...prev, [docType]: 'deleting' }));
    try {
      const res = await fetch(`/api/workforce/${memberId}/delete-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_type: docType }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.success) throw new Error(result?.message || 'Delete failed');

      setUploadedDocs(prev => ({ ...prev, [docType]: null }));
      setDocuments(prev => ({ ...prev, [docType]: null }));
      setDocUploadStatus(prev => ({ ...prev, [docType]: null }));
      return true;
    } catch {
      setDocUploadStatus(prev => ({ ...prev, [docType]: 'error' }));
      return false;
    }
  }

  const doActualSubmit=async()=>{
    setIsSubmitting(true);
    setSubmitStatus(null);

    const resolveAddr=(addr)=>({
      line1:String(addr.line1||'').trim(),line2:String(addr.line2||'').trim(),
      country:addr.country==='Other'?(addr.countryOther||''):(addr.country||''),
      state:addr.state==='Other'?(addr.stateOther||''):(addr.state||''),
      city:addr.city==='Other'?(addr.cityOther||''):(addr.city||''),
      pincode:String(addr.pincode||'').trim(),
    });
    const resolveDept=()=>form.departments.map(v=>v==='Other'?(form.departmentOther||'').trim():v).filter(Boolean).join(', ');
    const resolveDesig=()=>form.designations.map(v=>v==='Other'?(form.designationOther||'').trim():normalizeRoleLabel(v)).filter(Boolean).join(', ');
    const resolveCat=()=>form.categories.map(v=>v==='Other'?(form.categoryOther||'').trim():v).filter(Boolean).join(', ');
    const primaryDept=form.departments.find(v=>v!=='Other')||(form.departmentOther||'');
    const primaryDesig=form.designations.find(v=>v!=='Other')||(form.designationOther||'');

    try {
      const url=editingId?`/api/workforce/${editingId}`:'/api/workforce';
      const method=editingId?'PATCH':'POST';
      const response=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify({
        full_name:String(form.fullName||'').trim(),
        phone:String(form.contact||'').trim(),whatsapp:String(form.whatsapp||'').trim(),
        email:String(form.email||'').trim(),dob:normalizeDateValue(form.dob),
        gender:String(form.gender||'').trim(),
        department:resolveDept(),designation:resolveDesig(),
        working_style:String(form.workingStyle==='Other'?(form.workingStyleOther||''):(form.workingStyle||'')).trim(),
        category:resolveCat(),
        current_address:resolveAddr(form.currentAddress),
        permanent_address:resolveAddr(form.sameAsCurrent?form.currentAddress:form.permanentAddress),
        current_location:String(form.currentLocation||'').trim(),
        first_language:String(form.firstLang==='Other'?(form.firstLangOther||''):(form.firstLang||'')).trim(),
        second_language:String(form.secondLang==='Other'?(form.secondLangOther||''):(form.secondLang||'')).trim(),
        account_name:String(form.accountName||'').trim(),bank_name:String(form.bankName||'').trim(),
        account_number:String(form.accountNumber||'').trim(),ifsc:String(form.ifsc||'').trim(),
        notes:String(form.notes||'').trim(),active:true,
        date_of_joining:normalizeDateValue(form.dateOfJoining),
        ...(!editingId&&{permissions:defaultPermsByRole(primaryDesig,primaryDept)}),
      })});
      const result=await response.json().catch(()=>null);
      if (!response.ok||!result?.success) {
        const msg=extractApiErrorMessage(result);
        setSubmitStatus({success:false,message:msg});
        formScrollRef.current?.scrollTo({top:0,behavior:'smooth'});
        return;
      }
      const memberId=result?.data?.id||editingId;
      if (photoFile&&memberId) {
        try {
          const reader=new FileReader();
          const dataUrl=await new Promise((res,rej)=>{reader.onload=e=>res(e.target.result);reader.onerror=rej;reader.readAsDataURL(photoFile);});
          await fetch(`/api/workforce/${memberId}/upload-photo`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({photo_data:dataUrl})});
          setPhotoFile(null);
        } catch {}
      }
      if (documents.aadhaar) await uploadDocumentFile(memberId,'aadhaar',documents.aadhaar);
      if (documents.pan) await uploadDocumentFile(memberId,'pan',documents.pan);
      const fullName=String(form.fullName||'').trim();
      setSubmitStatus({success:true,message:`${fullName} ${editingId?'updated':'enrolled'} successfully.`});
      formScrollRef.current?.scrollTo({top:0,behavior:'smooth'});
      if (form.departments.includes('Other')&&form.departmentOther) {
        fetch('/api/workforce/departments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:form.departmentOther})}).catch(()=>{});
      }
      if (typeof window!=='undefined') window.dispatchEvent(new CustomEvent('workforce-updated'));
      if (onEnroll) onEnroll(fullName);
      if (onClose) onClose();
    } catch {
      setSubmitStatus({success:false,message:'Unable to enroll workforce member. Please try again.'});
      formScrollRef.current?.scrollTo({top:0,behavior:'smooth'});
    } finally { setIsSubmitting(false); }
  };

  const handleSubmit=async()=>{
    const errors=validateForm(form);
    if (Object.keys(errors).length>0) {
      setFieldErrors(errors);
      setSubmitStatus({success:false,message:'Please fix the errors below before saving.'});
      formScrollRef.current?.scrollTo({top:0,behavior:'smooth'});
      return;
    }
    setFieldErrors({});

    await doActualSubmit();
  };

  const handleSaveDraft=()=>{
    saveDraft('Enroll Workforce',`draft_enroll_${Date.now()}`,{...form,title:form.fullName||'Enroll Workforce Draft'});
    if (typeof window!=='undefined') alert('Draft saved successfully!');
    handleClose();
  };

  const handleClose=()=>{if(onClose)onClose();};
  const handleDialogOpenChange=(nextOpen)=>{if(!nextOpen)handleClose();};

  const handleInput=(e,section,field)=>{
    const {name,value,type,checked}=e.target;
    if (section==='currentAddress'||section==='permanentAddress') {
      setForm(prev=>{
        const upd={...prev[section],[field]:value};
        if (field==='country'){upd.state='';upd.stateOther='';upd.city='';upd.cityOther='';upd.pincode='';}
        if (field==='state'){upd.city='';upd.cityOther='';upd.pincode='';}
        if (field==='city'){const hint=CITY_PINCODE_HINT[value];if(hint)upd.pincode=hint;}
        const next={...prev,[section]:upd};
        if (prev.sameAsCurrent&&section==='currentAddress') next.permanentAddress={...upd};
        return next;
      });
      setFieldErrors(prev=>{const n={...prev};delete n[`${section}.${field}`];return n;});
    } else if (name==='sameAsCurrent') {
      handleSameAsCurrent(checked);
    } else {
      setForm(prev=>({...prev,[name]:value}));
      setFieldErrors(prev=>{const n={...prev};delete n[name];return n;});
    }
  };

  const renderAddressSection=(section)=>{
    const addr=form[section];
    const isIndia=addr.country==='India';
    const stateCities=isIndia&&addr.state&&addr.state!=='Other'?(STATE_CITIES[addr.state]||[]):[];
    const fe=(key)=>fieldErrors[`${section}.${key}`];
    return (
      <div className="flex flex-col gap-2 mt-2">
        <div>
          <input className={INPUT_CLS+(fe('line1')?' border-red-400':'')} placeholder="Address Line 1 *" value={addr.line1} onChange={e=>handleInput(e,section,'line1')} />
          {fe('line1')&&<p className={ERROR_CLS}>{fe('line1')}</p>}
        </div>
        <input className={INPUT_CLS} placeholder="Address Line 2" value={addr.line2} onChange={e=>handleInput(e,section,'line2')} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <select className={INPUT_CLS+(fe('country')?' border-red-400':'')} value={addr.country} onChange={e=>handleInput(e,section,'country')}>
              <option value="">Select Country... *</option>
              {COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}
              <option value="Other">Other</option>
            </select>
            {fe('country')&&<p className={ERROR_CLS}>{fe('country')}</p>}
            {addr.country==='Other'&&<input className={INPUT_CLS+' mt-1'} placeholder="Enter country name" value={addr.countryOther} onChange={e=>handleInput(e,section,'countryOther')} />}
          </div>
          <div>
            {isIndia?(
              <>
                <select className={INPUT_CLS+(fe('state')?' border-red-400':'')} value={addr.state} onChange={e=>handleInput(e,section,'state')}>
                  <option value="">Select State... *</option>
                  {INDIAN_STATES.map(s=><option key={s} value={s}>{s}</option>)}
                  <option value="Other">Other</option>
                </select>
                {fe('state')&&<p className={ERROR_CLS}>{fe('state')}</p>}
                {addr.state==='Other'&&<input className={INPUT_CLS+' mt-1'} placeholder="Enter state name" value={addr.stateOther} onChange={e=>handleInput(e,section,'stateOther')} />}
              </>
            ):(
              <input className={INPUT_CLS} placeholder="State / Province" value={addr.state} onChange={e=>handleInput(e,section,'state')} />
            )}
          </div>
          <div>
            {isIndia?(
              <>
                <select className={INPUT_CLS+(fe('city')?' border-red-400':'')} value={addr.city} onChange={e=>handleInput(e,section,'city')}>
                  <option value="">{addr.state?'Select City... *':'Select a state first'}</option>
                  {stateCities.map(c=><option key={c} value={c}>{c}</option>)}
                  <option value="Other">Other</option>
                </select>
                {fe('city')&&<p className={ERROR_CLS}>{fe('city')}</p>}
                {addr.city==='Other'&&<input className={INPUT_CLS+' mt-1'} placeholder="Enter city name" value={addr.cityOther} onChange={e=>handleInput(e,section,'cityOther')} />}
              </>
            ):(
              <input className={INPUT_CLS} placeholder="City" value={addr.city} onChange={e=>handleInput(e,section,'city')} />
            )}
          </div>
          <div>
            <input className={INPUT_CLS+(fe('pincode')?' border-red-400':'')}
              placeholder={isIndia?'Pincode (6 digits) *':'Pincode / ZIP'}
              value={addr.pincode} onChange={e=>handleInput(e,section,'pincode')} maxLength={isIndia?6:20} />
            {fe('pincode')&&<p className={ERROR_CLS}>{fe('pincode')}</p>}
          </div>
        </div>
      </div>
    );
  };

  const availableCategories=React.useMemo(()=>{
    const cats=new Set();
    form.departments.filter(d=>d!=='Other'&&DEPT_DATA[d]).forEach(d=>DEPT_DATA[d].categories.forEach(c=>cats.add(c)));
    return [...cats];
  },[form.departments]);

  const availableRoles=React.useMemo(()=>{
    const roles=new Set();
    if (form.departments.length===0||form.departments.every(d=>d==='Other')){roles.add('Chairman');roles.add('CEO');}
    else form.departments.filter(d=>d!=='Other'&&DEPT_DATA[d]).forEach(d=>DEPT_DATA[d].roles.forEach(r=>roles.add(normalizeRoleLabel(r))));
    customRoles.forEach(r=>roles.add(normalizeRoleLabel(r)));
    return [...roles];
  },[form.departments,customRoles]);

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent ref={formScrollRef} className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-cloud-gray to-cloud-gray text-midnight-ink p-0 gap-0 [&>button]:hidden">
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-soft-border bg-trust-blue relative">
          <div className="flex items-center justify-center">
            <DialogTitle className="text-lg font-bold text-white">
              {isReadOnly?'VIEW WORKFORCE':editingId?'EDIT WORKFORCE':'ENROLL WORKFORCE'}
            </DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Use this dialog to enroll or edit workforce details.
          </DialogDescription>
          {isReadOnly&&canEdit&&(
            <button type="button" onClick={()=>{savedFormRef.current={...form};setIsReadOnly(false);}}
              className="absolute left-5 top-3.5 px-4 py-1 bg-white text-trust-blue font-bold text-sm rounded-full hover:bg-gray-100 transition shadow">Edit</button>
          )}
          <button onClick={handleClose} className="absolute right-5 top-4 text-cool-gray hover:text-white" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>

        {submitStatus&&(
          <div className="sticky top-0 z-10 px-5 pt-3 bg-cloud-gray/95 backdrop-blur-sm border-b border-soft-border">
            <div className={`rounded-md px-3 py-2 text-sm font-medium ${submitStatus.success?'bg-success/10 text-success-dark border border-success/30':'bg-danger/10 text-danger-dark border border-danger/30'}`}>
              {submitStatus.message}
            </div>
          </div>
        )}

        <div className="px-5 pb-5 flex flex-col gap-2">
          <form className="space-y-6 pt-4">
          <fieldset disabled={isReadOnly} className="space-y-6 border-0 p-0 m-0 min-w-0">

            {/* Profile Photo */}
            <div className="flex flex-col items-center gap-2 pt-2">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-trust-blue shadow-md bg-cloud-gray flex items-center justify-center">
                  {profilePhoto
                    ? <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                    : <span className="text-3xl font-bold text-cool-gray">{form.fullName?form.fullName.charAt(0).toUpperCase():'?'}</span>
                  }
                </div>
                {!isReadOnly&&(
                  <button type="button" onClick={()=>profilePhotoInputRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-trust-blue text-white rounded-full w-8 h-8 flex items-center justify-center shadow-md hover:bg-deep-blue transition">
                    <Camera className="h-4 w-4" />
                  </button>
                )}
                <input ref={profilePhotoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleProfilePhotoChange} />
              </div>
              {!isReadOnly&&<p className="text-xs text-cool-gray">Upload profile photo (JPG, PNG, WebP — Max 5MB)</p>}
              {photoFile&&<p className="text-xs text-green-600 flex items-center gap-1"><Check className="h-3 w-3" />Photo selected: {photoFile.name}</p>}
            </div>

            {/* Section 1: Personal Information */}
            <div>
              <h3 className="text-base font-bold text-midnight-ink mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-text" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Full Name *</label>
                  <input className={INPUT_CLS+(fieldErrors.fullName?' border-red-400':'')} name="fullName" value={form.fullName} onChange={handleInput} placeholder="Enter full name" />
                  {fieldErrors.fullName&&<p className={ERROR_CLS}>{fieldErrors.fullName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Date of Birth</label>
                  <input type="date" className={INPUT_CLS} name="dob" value={form.dob} onChange={handleInput} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Date of Joining</label>
                  <input type="date" className={INPUT_CLS} name="dateOfJoining" value={form.dateOfJoining} onChange={handleInput} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Gender *</label>
                  <select className={INPUT_CLS+(fieldErrors.gender?' border-red-400':'')} name="gender" value={form.gender} onChange={handleInput}>
                    <option value="">Select gender...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {fieldErrors.gender&&<p className={ERROR_CLS}>{fieldErrors.gender}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Email Address</label>
                  <input className={INPUT_CLS+(fieldErrors.email?' border-red-400':'')} name="email" value={form.email} onChange={handleInput} placeholder="e.g. name@example.com" type="email" />
                  {fieldErrors.email&&<p className={ERROR_CLS}>{fieldErrors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Contact Number *</label>
                  <input className={INPUT_CLS+(fieldErrors.contact?' border-red-400':'')} name="contact" value={form.contact} onChange={handleInput} placeholder="e.g. 9876543210" type="tel" />
                  {fieldErrors.contact&&<p className={ERROR_CLS}>{fieldErrors.contact}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">WhatsApp Number</label>
                  <input className={INPUT_CLS} name="whatsapp" value={form.whatsapp} onChange={handleInput} placeholder="e.g. 9876543210" type="tel" />
                </div>
              </div>
            </div>

            {/* Section 2: Job Details */}
            <fieldset disabled={isReadOnly||jobDetailsLocked} className="border-0 p-0 m-0 min-w-0">
            <div>
              <h3 className="text-base font-bold text-midnight-ink mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-text" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                Job Details
              </h3>
              {!isReadOnly&&jobDetailsLocked&&<p className="text-xs text-cool-gray mb-3">Job details can only be updated by a senior with manage access.</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Department</label>
                  <MultiCheckboxSelect label="Department" options={[...DEPARTMENTS,...customDepartments]}
                    selected={form.departments} onChange={vals=>setForm(prev=>({...prev,departments:vals,categories:[],designations:[]}))}
                    placeholder="Select department(s)..." disabled={isReadOnly||jobDetailsLocked}
                    extraInputValue={form.departmentOther} extraInputChange={v=>setForm(prev=>({...prev,departmentOther:v}))}
                    extraInputPlaceholder="Enter department name" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Category</label>
                  {form.departments.length===0||form.departments.every(d=>d==='Other')?(
                    <p className="text-sm text-cool-gray italic mt-1">Select a department first</p>
                  ):availableCategories.length>0?(
                    <MultiCheckboxSelect label="Category" options={availableCategories}
                      selected={form.categories} onChange={vals=>setForm(prev=>({...prev,categories:vals}))}
                      placeholder="Select category(s)..." disabled={isReadOnly||jobDetailsLocked}
                      extraInputValue={form.categoryOther} extraInputChange={v=>setForm(prev=>({...prev,categoryOther:v}))}
                      extraInputPlaceholder="Enter category" />
                  ):(
                    <p className="text-sm text-cool-gray italic mt-1">No sub-categories for selected departments</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Role / Designation</label>
                  <MultiCheckboxSelect label="Role" options={availableRoles}
                    selected={form.designations} onChange={vals=>setForm(prev=>({...prev,designations:vals}))}
                    placeholder="Select role(s)..." disabled={isReadOnly||jobDetailsLocked}
                    extraInputValue={form.designationOther} extraInputChange={v=>setForm(prev=>({...prev,designationOther:v}))}
                    extraInputPlaceholder="Enter role / designation" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Working Style</label>
                  <select className={INPUT_CLS} name="workingStyle" value={form.workingStyle} onChange={handleInput}>
                    <option value="">Select working style...</option>
                    {WORKING_STYLES.map(w=><option key={w} value={w}>{w}</option>)}
                    <option value="Other">Other</option>
                  </select>
                  {form.workingStyle==='Other'&&<input className={INPUT_CLS+' mt-2'} name="workingStyleOther" value={form.workingStyleOther} onChange={handleInput} placeholder="Enter working style" />}
                </div>
              </div>
            </div>
            </fieldset>

            {/* Section 3: Current Address */}
            <div>
              <h3 className="text-base font-bold text-midnight-ink mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-text" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Current Address *
              </h3>
              {renderAddressSection('currentAddress')}
            </div>

            {/* Section 4: Permanent Address */}
            <div>
              <h3 className="text-base font-bold text-midnight-ink mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-text" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                Permanent Address *
              </h3>
              <div className="flex items-center mb-3">
                <input type="checkbox" name="sameAsCurrent" checked={form.sameAsCurrent} onChange={handleInput} className="w-4 h-4 text-trust-blue border-soft-border rounded cursor-pointer" />
                <span className="text-sm text-slate-text font-medium ml-2">Same as current address</span>
              </div>
              {!form.sameAsCurrent&&renderAddressSection('permanentAddress')}
              {form.sameAsCurrent&&<p className="text-sm text-slate-text italic">Using current address as permanent address.</p>}
            </div>

            {/* Section 5: Languages */}
            <div>
              <h3 className="text-base font-bold text-midnight-ink mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-text" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
                Languages
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">First Language</label>
                  <select className={INPUT_CLS} name="firstLang" value={form.firstLang} onChange={handleInput}>
                    <option value="">Select language...</option>
                    {INDIAN_LANGUAGES.map(l=><option key={l} value={l}>{l}</option>)}
                    <option value="Other">Other</option>
                  </select>
                  {form.firstLang==='Other'&&<input className={INPUT_CLS+' mt-2'} name="firstLangOther" value={form.firstLangOther} onChange={handleInput} placeholder="Enter language name" />}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Second Language</label>
                  <select className={INPUT_CLS} name="secondLang" value={form.secondLang} onChange={handleInput}>
                    <option value="">Select language...</option>
                    {INDIAN_LANGUAGES.map(l=><option key={l} value={l}>{l}</option>)}
                    <option value="Other">Other</option>
                  </select>
                  {form.secondLang==='Other'&&<input className={INPUT_CLS+' mt-2'} name="secondLangOther" value={form.secondLangOther} onChange={handleInput} placeholder="Enter language name" />}
                </div>
              </div>
            </div>

            {/* Section 6: Banking Details */}
            <div>
              <h3 className="text-base font-bold text-midnight-ink mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-text" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                Banking Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-semibold text-slate-text mb-2">Account Name</label><input className={INPUT_CLS} name="accountName" value={form.accountName} onChange={handleInput} placeholder="Name on bank account" /></div>
                <div><label className="block text-sm font-semibold text-slate-text mb-2">Bank Name</label><input className={INPUT_CLS} name="bankName" value={form.bankName} onChange={handleInput} placeholder="e.g. HDFC Bank" /></div>
                <div><label className="block text-sm font-semibold text-slate-text mb-2">Account Number</label><input className={INPUT_CLS} name="accountNumber" value={form.accountNumber} onChange={handleInput} placeholder="Enter account number" /></div>
                <div><label className="block text-sm font-semibold text-slate-text mb-2">IFSC Code</label><input className={INPUT_CLS} name="ifsc" value={form.ifsc} onChange={handleInput} placeholder="e.g. HDFC0001234" /></div>
              </div>
            </div>

            {/* Section 7: Identity Documents */}
            <div>
              <h3 className="text-base font-bold text-midnight-ink mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-text" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Identity Documents
              </h3>
              <p className="text-cool-gray text-sm font-medium mb-1">Accepted formats: <strong>PDF, JPG, PNG</strong> — Max size: <strong>5 MB per file</strong></p>
              <p className="text-cool-gray text-xs mb-4">Documents are saved to the profile and visible in My Profile after enrollment.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className={`border-2 rounded-lg p-5 flex flex-col items-center justify-center cursor-pointer hover:border-trust-blue/50 transition ${(uploadedDocs.aadhaar||documents.aadhaar)?'border-green-400 bg-green-50':'border-dashed border-soft-border'}`} onClick={()=>handleUploadClick('aadhaar')}>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e=>handleFile(e,'aadhaar')} id="file-input-aadhaar" />
                    {(uploadedDocs.aadhaar||documents.aadhaar)?(
                      <>
                        <Check className="w-8 h-8 text-green-500 mb-1" />
                        <div className="font-semibold text-green-700 text-sm">Aadhaar Card</div>
                        <div className="text-xs text-green-600 text-center mt-1">
                          {docUploadStatus.aadhaar==='uploading'?'Uploading...':
                           docUploadStatus.aadhaar==='deleting'?'Removing...':
                           docUploadStatus.aadhaar==='done'?'? Uploaded successfully':
                           docUploadStatus.aadhaar==='error'?'? Upload failed — will retry on save':
                           uploadedDocs.aadhaar?'? Already uploaded':
                           documents.aadhaar?.name||'File selected'}
                        </div>
                        {uploadedDocs.aadhaar&&<a href={buildDocProxyUrl(uploadedDocs.aadhaar,'preview')} target="_blank" rel="noopener noreferrer" className="text-xs text-trust-blue underline mt-1" onClick={e=>e.stopPropagation()}>View document</a>}
                        {!isReadOnly && uploadedDocs.aadhaar && (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await deleteUploadedDocument(editingId, 'aadhaar');
                            }}
                            className="text-xs text-red-600 underline mt-1"
                          >
                            Delete old document
                          </button>
                        )}
                        {!isReadOnly && documents.aadhaar && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDocuments(prev => ({ ...prev, aadhaar: null }));
                              setDocUploadStatus(prev => ({ ...prev, aadhaar: null }));
                            }}
                            className="text-xs text-red-600 underline mt-1"
                          >
                            Remove selected file
                          </button>
                        )}
                      </>
                    ):(
                      <>
                        <svg className="w-8 h-8 text-cool-gray mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        <div className="font-semibold text-sm">Aadhaar Card</div>
                        <div className="text-xs text-cool-gray mt-1">Drag your file here, or <span className="text-trust-blue font-semibold">browse</span></div>
                        <div className="text-xs text-cool-gray">PDF, JPG, PNG (Max 5MB)</div>
                      </>
                    )}
                  </div>
                  {!isReadOnly&&documents.aadhaar&&!uploadedDocs.aadhaar&&<p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><Upload className="h-3 w-3" />Will be uploaded when you save/enroll.</p>}
                </div>
                <div>
                  <div className={`border-2 rounded-lg p-5 flex flex-col items-center justify-center cursor-pointer hover:border-trust-blue/50 transition ${(uploadedDocs.pan||documents.pan)?'border-green-400 bg-green-50':'border-dashed border-soft-border'}`} onClick={()=>handleUploadClick('pan')}>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e=>handleFile(e,'pan')} id="file-input-pan" />
                    {(uploadedDocs.pan||documents.pan)?(
                      <>
                        <Check className="w-8 h-8 text-green-500 mb-1" />
                        <div className="font-semibold text-green-700 text-sm">PAN Card</div>
                        <div className="text-xs text-green-600 text-center mt-1">
                          {docUploadStatus.pan==='uploading'?'Uploading...':
                           docUploadStatus.pan==='deleting'?'Removing...':
                           docUploadStatus.pan==='done'?'? Uploaded successfully':
                           docUploadStatus.pan==='error'?'? Upload failed — will retry on save':
                           uploadedDocs.pan?'? Already uploaded':
                           documents.pan?.name||'File selected'}
                        </div>
                        {uploadedDocs.pan&&<a href={buildDocProxyUrl(uploadedDocs.pan,'preview')} target="_blank" rel="noopener noreferrer" className="text-xs text-trust-blue underline mt-1" onClick={e=>e.stopPropagation()}>View document</a>}
                        {!isReadOnly && uploadedDocs.pan && (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await deleteUploadedDocument(editingId, 'pan');
                            }}
                            className="text-xs text-red-600 underline mt-1"
                          >
                            Delete old document
                          </button>
                        )}
                        {!isReadOnly && documents.pan && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDocuments(prev => ({ ...prev, pan: null }));
                              setDocUploadStatus(prev => ({ ...prev, pan: null }));
                            }}
                            className="text-xs text-red-600 underline mt-1"
                          >
                            Remove selected file
                          </button>
                        )}
                      </>
                    ):(
                      <>
                        <svg className="w-8 h-8 text-cool-gray mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4a1 1 0 011-1h8a1 1 0 011 1v12m-5 4h.01" /></svg>
                        <div className="font-semibold text-sm">PAN Card</div>
                        <div className="text-xs text-cool-gray mt-1">Drag your file here, or <span className="text-trust-blue font-semibold">browse</span></div>
                        <div className="text-xs text-cool-gray">PDF, JPG, PNG (Max 5MB)</div>
                      </>
                    )}
                  </div>
                  {!isReadOnly&&documents.pan&&!uploadedDocs.pan&&<p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><Upload className="h-3 w-3" />Will be uploaded when you save/enroll.</p>}
                </div>
              </div>
            </div>

            {/* Section 8: Notes */}
            <div>
              <h3 className="text-base font-bold text-midnight-ink mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-text" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Notes
              </h3>
              <p className="text-cool-gray text-sm font-medium mb-2">Add any additional notes or remarks</p>
              <textarea className={INPUT_CLS} name="notes" value={form.notes} onChange={handleInput} rows="5" placeholder="Enter your notes here..." />
            </div>

          </fieldset>

            {/* Action Buttons */}
            {isReadOnly?(
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={handleClose} className="flex-1 h-10 border border-soft-border text-midnight-ink hover:bg-cloud-gray font-bold text-sm rounded transition">Close</button>
              </div>
            ):(editingId?canEdit:canCreate)?(
              <div className="flex gap-2 mt-2">
                {editingId?(
                  <>
                    <button type="button" onClick={()=>{if(savedFormRef.current)setForm(savedFormRef.current);setIsReadOnly(true);setSubmitStatus(null);setFieldErrors({});}}
                      className="flex-1 h-10 border border-soft-border text-midnight-ink hover:bg-cloud-gray font-bold text-sm rounded transition">Cancel</button>
                    <button type="button" onClick={handleSubmit} disabled={isSubmitting}
                      className="flex-1 h-10 bg-gradient-to-r from-midnight-ink to-midnight-ink/90 hover:from-midnight-ink hover:to-midnight-ink text-white font-bold text-sm rounded transition shadow-md disabled:opacity-60">
                      {isSubmitting?'SAVING...':'SAVE CHANGES'}
                    </button>
                  </>
                ):(
                  <>
                    <button type="button" onClick={handleSaveDraft} className="flex-1 h-10 bg-trust-blue hover:bg-deep-blue text-white font-bold text-sm rounded transition shadow-md">Save as Draft</button>
                    <button type="button" onClick={handleSubmit} disabled={isSubmitting}
                      className="flex-1 h-10 bg-gradient-to-r from-midnight-ink to-midnight-ink/90 hover:from-midnight-ink hover:to-midnight-ink text-white font-bold text-sm rounded transition shadow-md disabled:opacity-60">
                      {isSubmitting?'ENROLLING...':'ENROLL'}
                    </button>
                  </>
                )}
              </div>
            ):(
              <div className="text-sm text-gray-500 text-center mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                ?? You don&apos;t have permission to {editingId?'edit':'enroll'} workforce members.
              </div>
            )}

          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function EnrolWorkforcePage() {
  const router = useRouter();
  return <EnrolWorkforceForm open onClose={()=>router.push('/home')} />;
}
