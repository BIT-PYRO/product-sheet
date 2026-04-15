'use client';
import React, { useState, useEffect } from "react";
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDrafts, useDraftLoader } from "@/components/drafts-manager";
import { useSheetPermissions } from '@/hooks/use-sheet-permissions';

const PENDING_DRAFT_KEY = 'pending_enroll_workforce_draft';

const INPUT_CLS = 'w-full border border-soft-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent bg-cloud-gray text-midnight-ink placeholder-slate-400 transition disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-80';

const DESIGNATION_ORDER = [
  'Chairman','CEO','Director','General Manager','Department Head','Project Manager',
  'Manager','Supervisor','Associate','Developer','Intern','Labour','Worker',
  'Cook','Pantry Boy','Janitor','Messenger','Security','Electrician','Plumber',
  'CCTV','Carpenter','Ironsmith','Locksmith',
];
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

const MAJOR_CITIES = [
  'Agra','Ahmedabad','Amritsar','Aurangabad','Bangalore','Bhopal','Bhubaneswar',
  'Chandigarh','Chennai','Coimbatore','Dehradun','Delhi','Faridabad','Ghaziabad',
  'Gurgaon','Guwahati','Hyderabad','Indore','Jaipur','Jamshedpur','Jodhpur',
  'Kanpur','Kochi','Kolkata','Lucknow','Ludhiana','Madurai','Mangalore',
  'Meerut','Mumbai','Mysore','Nagpur','Nashik','Noida','Patna','Pune',
  'Raipur','Rajkot','Ranchi','Surat','Thane','Thiruvananthapuram','Vadodara',
  'Varanasi','Vijayawada','Visakhapatnam',
];

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
  'Customer Relation Management': { categories: ['Inbound Calls','Outbound Calls','Social Media','Emails','Offline'], roles: ['Chairman','CEO','Director','Department Head','Manager','Associate','Intern'] },
  'Operations':                   { categories: [], roles: ['Chairman','CEO','Director','Department Head','Manager','Associate','Intern'] },
  'Design':                       { categories: ['Jewellery','Branding','Visuals','Photographer / Videographer'], roles: ['Chairman','CEO','Director','Department Head','Manager','Associate','Intern'] },
  'Logistics':                    { categories: [], roles: ['Chairman','CEO','Director','Department Head','Manager','Associate','Intern'] },
  'Purchase':                     { categories: ['Tools / Machinery','Metals','Gemstones'], roles: ['Chairman','CEO','Director','Department Head','Manager','Associate'] },
  'Sales / Business Development': { categories: ['Domestic','International'], roles: ['Chairman','CEO','Director','Department Head','Manager','Associate','Intern'] },
  'Finance':                      { categories: [], roles: ['Chairman','CEO','Director','Department Head','Manager','Associate','Intern'] },
  'Information Technology':       { categories: ['Shopify','Software'], roles: ['Chairman','CEO','Director','Department Head','General Manager','Project Manager','Developer','Associate','Intern'] },
  'Human Resource':               { categories: [], roles: ['Chairman','CEO','Director','Department Head','Manager','Associate','Intern'] },
  'Production':                   { categories: ['3D Printing','Die Cutting','Master Making','Wax','Wax Setting','Casting','Filing','Polish','Enamel','Hand Setting','Plating','Quality Check'], roles: ['Chairman','CEO','Director','Department Head','General Manager','Manager','Supervisor','Labour'] },
  'Services':                     { categories: [], roles: ['Security','Electrician','Plumber','CCTV','Carpenter','Ironsmith','Locksmith'] },
  'House Keeping':                { categories: [], roles: ['Cook','Pantry Boy','Janitor','Messenger'] },
};

const DEPARTMENTS = Object.keys(DEPT_DATA);

/* ─── Default permissions by designation + department ─────────────────────
   Called when enrolling a NEW member. Keys must match MODULES in manage-members.
   Permission flags: view, edit, create, export, amount
─────────────────────────────────────────────────────────────────────────── */
function defaultPermsByRole(designation, department) {
  const des  = (designation || '').trim();
  const dept = (department  || '').trim();

  // Short permission builders
  const p  = (v,e,c,x,a) => ({ view:!!v, edit:!!e, create:!!c, export:!!x, amount:!!a });
  const N    = p(0,0,0,0,0);   // no access
  const V    = p(1,0,0,0,0);   // view only
  const VC   = p(1,0,1,0,0);   // view + create
  const VEC  = p(1,1,1,0,0);   // view + edit + create
  const VECE = p(1,1,1,1,0);   // view + edit + create + export
  const FULL = p(1,1,1,1,1);   // all

  const ALL_KEYS = [
    'product-sheet','master-product-sheet','master-inventory-sheet',
    'enrol-customer','master-customer-sheet','master-kyc-sheet',
    'enrol-workforce','master-workforce-sheet','master-job-sheet',
    'managers-dashboard','drafts','orders','my-desk','create-generic-job',
    'master-designer-sheet','designer-sheet','finding-sheet','finding-entry','inventory',
  ];
  const allPerm  = (lvl) => Object.fromEntries(ALL_KEYS.map(k => [k, lvl]));
  const baseBuild = () => Object.fromEntries(ALL_KEYS.map(k => [k, N]));

  // ── Tier 0: Top leadership (manage_members only for Chairman & CEO) ───
  if (['Chairman','CEO'].includes(des)) {
    return { sheets: allPerm(FULL), manage_members: true };
  }
  if (['Director','General Manager'].includes(des)) {
    return { sheets: allPerm(FULL), manage_members: false };
  }

  // ── Tier 1: Department Head / Project Manager ──────────────────────────
  if (['Department Head','Project Manager'].includes(des)) {
    const s = allPerm(VECE); // view+edit+create+export everywhere, no amount
    s['managers-dashboard'] = V;
    s['my-desk']            = FULL;
    s['drafts']             = FULL;
    return { sheets: s, manage_members: false };
  }

  // ── Tier 2: Manager (department-aware) ────────────────────────────────
  if (des === 'Manager') {
    const s = baseBuild();
    s['my-desk']  = VEC;
    s['drafts']   = VEC;
    s['product-sheet'] = V;
    s['orders']   = V;
    switch (dept) {
      case 'Finance':
        s['master-product-sheet']   = FULL;
        s['master-inventory-sheet'] = FULL;
        s['master-customer-sheet']  = V;
        s['master-kyc-sheet']       = VECE;
        s['orders']                 = FULL;
        break;
      case 'Human Resource':
        s['enrol-workforce']        = VECE;
        s['master-workforce-sheet'] = VECE;
        s['master-kyc-sheet']       = V;
        break;
      case 'Sales / Business Development':
        s['enrol-customer']         = VECE;
        s['master-customer-sheet']  = VECE;
        s['master-product-sheet']   = V;
        s['orders']                 = VECE;
        break;
      case 'Customer Relation Management':
        s['enrol-customer']         = VEC;
        s['master-customer-sheet']  = VEC;
        s['orders']                 = V;
        break;
      case 'Purchase':
        s['master-inventory-sheet'] = VECE;
        s['inventory']              = VECE;
        s['finding-sheet']          = V;
        s['finding-entry']          = VECE;
        s['master-product-sheet']   = V;
        break;
      case 'Production':
        s['master-job-sheet']       = VEC;
        s['create-generic-job']     = VEC;
        s['finding-sheet']          = V;
        s['finding-entry']          = VEC;
        s['orders']                 = V;
        break;
      case 'Design':
        s['master-designer-sheet']  = VEC;
        s['designer-sheet']         = VEC;
        s['finding-sheet']          = V;
        break;
      case 'Marketing':
        s['master-customer-sheet']  = V;
        break;
      case 'Logistics':
        s['orders']                 = VECE;
        s['master-product-sheet']   = V;
        break;
      case 'Operations':
        s['master-job-sheet']       = VEC;
        s['create-generic-job']     = VEC;
        s['orders']                 = V;
        break;
      case 'Information Technology':
        s['master-product-sheet']   = V;
        s['master-inventory-sheet'] = V;
        s['master-job-sheet']       = V;
        break;
    }
    return { sheets: s, manage_members: false };
  }

  // ── Tier 3: Associate / Developer / Supervisor ────────────────────────
  if (['Associate','Developer','Supervisor'].includes(des)) {
    const s = baseBuild();
    s['my-desk']       = VEC;
    s['drafts']        = VEC;
    s['product-sheet'] = V;
    switch (dept) {
      case 'Finance':
        s['orders'] = V;
        break;
      case 'Human Resource':
        s['enrol-workforce']        = VC;
        s['master-workforce-sheet'] = V;
        break;
      case 'Sales / Business Development':
        s['enrol-customer']         = VC;
        s['master-customer-sheet']  = V;
        s['orders']                 = V;
        break;
      case 'Customer Relation Management':
        s['enrol-customer']         = VC;
        s['master-customer-sheet']  = V;
        break;
      case 'Purchase':
        s['master-inventory-sheet'] = V;
        s['inventory']              = V;
        s['finding-entry']          = VC;
        break;
      case 'Production':
        s['master-job-sheet']       = V;
        s['finding-entry']          = VC;
        s['create-generic-job']     = VC;
        break;
      case 'Design':
        s['designer-sheet']         = VEC;
        s['finding-sheet']          = V;
        s['finding-entry']          = VC;
        break;
      case 'Marketing':
        s['master-customer-sheet']  = V;
        break;
      case 'Logistics':
        s['orders'] = V;
        break;
      case 'Operations':
        s['orders']             = V;
        s['master-job-sheet']   = V;
        s['create-generic-job'] = VC;
        break;
      case 'Information Technology':
        s['master-product-sheet']   = V;
        s['master-inventory-sheet'] = V;
        break;
    }
    return { sheets: s, manage_members: false };
  }

  // ── Tier 4: Intern / Labour / Worker ──────────────────────────────────
  if (['Intern','Labour','Worker'].includes(des)) {
    const s = baseBuild();
    s['my-desk'] = VEC;
    s['drafts']  = VEC;
    if (dept === 'Production') {
      s['master-job-sheet'] = V;
    }
    if (des === 'Intern') {
      s['product-sheet'] = V;
    }
    return { sheets: s, manage_members: false };
  }

  // ── Tier 5: Services & House Keeping — no sheet access ────────────────
  const noAccessRoles = [
    'Security','Electrician','Plumber','CCTV Operator','Carpenter','Ironsmith','Locksmith',
    'Cook','Pantry Boy','Janitor','Messenger',
  ];
  if (noAccessRoles.includes(des)) {
    return { sheets: baseBuild(), manage_members: false };
  }

  // ── Default fallback: my-desk + drafts only ───────────────────────────
  const s = baseBuild();
  s['my-desk'] = VEC;
  s['drafts']  = VEC;
  return { sheets: s, manage_members: false };
}

const emptyAddress = () => ({
  line1: '', line2: '', country: '', countryOther: '', state: '', stateOther: '', city: '', cityOther: '', pincode: '',
});

export function EnrolWorkforceForm({ onEnroll, onClose, open = true, draftData = null, editingId = null, readOnly = false, canEditOverride = false }) {
  const { canEdit: sheetCanEdit, canCreate } = useSheetPermissions('master-workforce-sheet');
  const canEdit = canEditOverride || sheetCanEdit;
  const { saveDraft } = useDrafts();
  const loadedDraft = useDraftLoader();
  const formScrollRef = React.useRef(null);
  const [form, setForm] = useState({
    fullName: '',
    dob: '',
    gender: '',
    email: '',
    contact: '',
    whatsapp: '',
    department: '',
    departmentOther: '',
    designation: '',
    designationOther: '',
    workingStyle: '',
    workingStyleOther: '',
    category: '',
    categoryOther: '',
    currentAddress: emptyAddress(),
    permanentAddress: emptyAddress(),
    sameAsCurrent: false,
    currentLocation: '',
    firstLang: '',
    firstLangOther: '',
    secondLang: '',
    secondLangOther: '',
    accountName: '',
    bankName: '',
    accountNumber: '',
    ifsc: '',
    notes: '',
  });
  const [documents, setDocuments] = useState({ aadhaar: null, pan: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [isReadOnly, setIsReadOnly] = useState(readOnly);
  const savedFormRef = React.useRef(null);

  // Custom roles added via "Other" — fetched from backend meta
  const [customRoles, setCustomRoles] = useState([]);
  // Custom departments added via "Other" — fetched from backend meta
  const [customDepartments, setCustomDepartments] = useState([]);

  useEffect(() => {
    fetch('/api/workforce/meta', { cache: 'no-store' })
      .then(r => r.json())
      .catch(() => null)
      .then(meta => {
        if (!meta?.success) return;
        const staticRoles = new Set(Object.values(DEPT_DATA).flatMap(d => d.roles));
        const allMetaRoles = meta.data?.designations || [];
        setCustomRoles(allMetaRoles.filter(r => !staticRoles.has(r)));
        const staticDepts = new Set(Object.keys(DEPT_DATA));
        const allMetaDepts = meta.data?.departments || [];
        setCustomDepartments(allMetaDepts.filter(d => !staticDepts.has(d)));
      });
  }, []);

  useEffect(() => { if (draftData) setForm(draftData); }, [draftData]);

  useEffect(() => {
    const pendingDraft = localStorage.getItem(PENDING_DRAFT_KEY);
    if (pendingDraft) {
      try {
        setForm(JSON.parse(pendingDraft));
        localStorage.removeItem(PENDING_DRAFT_KEY);
      } catch (e) { console.error('Failed to load pending draft:', e); }
    }
  }, []);

  useEffect(() => {
    if (loadedDraft && loadedDraft.section === 'Enroll Workforce') setForm(loadedDraft.data);
  }, [loadedDraft]);

  useEffect(() => {
    if (!editingId) return;
    fetch(`/api/workforce/${editingId}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(result => {
        const d = result?.data || result;
        if (!d?.full_name && !d?.id) return;
        setForm({
          fullName: d.full_name || '',
          dob: d.dob || '',
          gender: d.gender || '',
          email: d.email || '',
          contact: d.phone || '',
          whatsapp: d.whatsapp || '',
          department: d.department || '',
          departmentOther: '',
          designation: d.designation || '',
          designationOther: '',
          workingStyle: d.working_style || '',
          workingStyleOther: '',
          category: d.category || '',
          categoryOther: '',
          currentAddress: { ...emptyAddress(), ...(d.current_address || {}) },
          permanentAddress: { ...emptyAddress(), ...(d.permanent_address || {}) },
          sameAsCurrent: false,
          currentLocation: d.current_location || '',
          firstLang: d.first_language || '',
          firstLangOther: '',
          secondLang: d.second_language || '',
          secondLangOther: '',
          accountName: d.account_name || '',
          bankName: d.bank_name || '',
          accountNumber: d.account_number || '',
          ifsc: d.ifsc || '',
          notes: d.notes || '',
        });
      })
      .catch(() => {});
  }, [editingId]);

  /* ── Viewer's own workforce record (for job-details gating) ── */
  const [viewerMember, setViewerMember] = useState(null);
  const [viewerSession, setViewerSession] = useState(null);
  const [targetDesignation, setTargetDesignation] = useState(null);
  useEffect(() => {
    if (!editingId) return;
    (async () => {
      try {
        const sessRes = await fetch('/api/auth/session', { cache: 'no-store' });
        const sessJson = await sessRes.json();
        if (!sessRes.ok || !sessJson.success) return;
        setViewerSession(sessJson.user || null);
        const email = sessJson.user?.email || '';
        if (!email) return;
        const wfRes = await fetch('/api/workforce?page_size=200', { cache: 'no-store' });
        const wfJson = await wfRes.json().catch(() => null);
        const list = Array.isArray(wfJson?.data) ? wfJson.data
          : Array.isArray(wfJson?.data?.results) ? wfJson.data.results
          : Array.isArray(wfJson?.results) ? wfJson.results : [];
        const viewer = list.find(m => (m.email || '').toLowerCase() === email.toLowerCase());
        if (viewer) setViewerMember(viewer);
        const target = list.find(m => m.id === editingId);
        if (target) setTargetDesignation(target.designation);
      } catch {}
    })();
  }, [editingId]);

  /* superuser / admin / Chairman / CEO bypass */
  const viewerIsSuperUser = (() => {
    if (!viewerSession) return false;
    if (viewerSession.role === 'admin') return true;
    if (viewerSession.is_superuser) return true;
    const des = (viewerMember?.designation || '').toLowerCase().trim();
    return des === 'chairman' || des === 'ceo';
  })();

  /* Job details locked unless viewer has manage_members AND outranks the target */
  const jobDetailsLocked = (() => {
    if (!editingId) return false; // new enrolment — always editable
    if (viewerIsSuperUser) return false; // superusers can always edit
    if (!viewerMember) return true; // still loading or no match — lock
    if (!viewerMember.permissions?.manage_members) return true;
    // can't edit own job details
    if (viewerMember.id === editingId) return true;
    const viewerRank = getDesignationRank(viewerMember.designation);
    const targetRank = getDesignationRank(targetDesignation);
    return viewerRank >= targetRank; // must strictly outrank
  })();

  const handleSameAsCurrent = (checked) => {
    setForm((prev) => ({
      ...prev,
      sameAsCurrent: checked,
      permanentAddress: checked ? { ...prev.currentAddress } : emptyAddress(),
    }));
  };

  const handleSubmit = async () => {
    const fullName = String(form.fullName || '').trim();
    if (!fullName) {
      setSubmitStatus({ success: false, message: 'Full Name is required to enroll.' });
      formScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true)
    setSubmitStatus(null)

    const resolveAddr = (addr) => ({
      line1: String(addr.line1 || '').trim(),
      line2: String(addr.line2 || '').trim(),
      country: addr.country === 'Other' ? (addr.countryOther || '') : (addr.country || ''),
      state: addr.state === 'Other' ? (addr.stateOther || '') : (addr.state || ''),
      city: addr.city === 'Other' ? (addr.cityOther || '') : (addr.city || ''),
      pincode: String(addr.pincode || '').trim(),
    });

    try {
      const url = editingId ? `/api/workforce/${editingId}` : '/api/workforce';
      const method = editingId ? 'PATCH' : 'POST';
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: fullName,
          phone: String(form.contact || '').trim(),
          whatsapp: String(form.whatsapp || '').trim(),
          email: String(form.email || '').trim(),
          dob: String(form.dob || '').trim() || null,
          gender: String(form.gender || '').trim(),
          department: String(form.department === 'Other' ? (form.departmentOther || '') : (form.department || '')).trim(),
          designation: String(form.designation === 'Other' ? (form.designationOther || '') : (form.designation || '')).trim(),
          working_style: String(form.workingStyle === 'Other' ? (form.workingStyleOther || '') : (form.workingStyle || '')).trim(),
          category: String(form.category === 'Other' ? (form.categoryOther || '') : (form.category || '')).trim(),
          current_address: resolveAddr(form.currentAddress),
          permanent_address: resolveAddr(form.permanentAddress),
          current_location: String(form.currentLocation || '').trim(),
          first_language: String(form.firstLang === 'Other' ? (form.firstLangOther || '') : (form.firstLang || '')).trim(),
          second_language: String(form.secondLang === 'Other' ? (form.secondLangOther || '') : (form.secondLang || '')).trim(),
          account_name: String(form.accountName || '').trim(),
          bank_name: String(form.bankName || '').trim(),
          account_number: String(form.accountNumber || '').trim(),
          ifsc: String(form.ifsc || '').trim(),
          notes: String(form.notes || '').trim(),
          active: true,
          // Auto-assign default permissions on first enroll (not on edit)
          ...(!editingId && {
            permissions: defaultPermsByRole(
              form.designation === 'Other' ? (form.designationOther || '') : (form.designation || ''),
              form.department  === 'Other' ? (form.departmentOther  || '') : (form.department  || ''),
            ),
          }),
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        const message = result?.error?.message || result?.message || 'Unable to enroll workforce member.';
        setSubmitStatus({ success: false, message });
        formScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      setSubmitStatus({ success: true, message: `${fullName} ${editingId ? 'updated' : 'enrolled'} successfully.` });
      formScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

      // Notify other components (e.g. Master Workforce Sheet) to refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('workforce-updated'));
      }

      if (onEnroll) onEnroll(fullName);
      if (onClose) onClose();
    } catch {
      setSubmitStatus({ success: false, message: 'Unable to enroll workforce member. Please try again.' });
      formScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    saveDraft('Enroll Workforce', `draft_enroll_${Date.now()}`, { ...form, title: form.fullName || 'Enroll Workforce Draft' });
    if (typeof window !== 'undefined') alert('Draft saved successfully!');
    handleClose();
  };

  const handleClose = () => { if (onClose) onClose(); };

  const handleDialogOpenChange = (nextOpen) => { if (!nextOpen) handleClose(); };

  const handleInput = (e, section, field) => {
    const { name, value, type, checked } = e.target;
    if (section === 'currentAddress' || section === 'permanentAddress') {
      setForm((prev) => {
        const updatedSection = { ...prev[section], [field]: value };
        if (field === 'country') {
          updatedSection.state = '';
          updatedSection.stateOther = '';
          updatedSection.city = '';
          updatedSection.cityOther = '';
        }
        if (field === 'state') {
          updatedSection.city = '';
          updatedSection.cityOther = '';
        }
        const next = { ...prev, [section]: updatedSection };
        if (prev.sameAsCurrent && section === 'currentAddress') {
          next.permanentAddress = { ...updatedSection };
        }
        return next;
      });
    } else if (name === 'sameAsCurrent') {
      handleSameAsCurrent(checked);
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFile = (e, docType) => setDocuments((prev) => ({ ...prev, [docType]: e.target.files[0] }));
  const handleUploadClick = (docType) => document.getElementById(`file-input-${docType}`).click();

  const renderAddressSection = (section) => {
    const addr = form[section];
    const isIndia = addr.country === 'India';
    return (
      <div className="flex flex-col gap-2 mt-2">
        <input className={INPUT_CLS} placeholder="Address Line 1" value={addr.line1} onChange={e => handleInput(e, section, 'line1')} />
        <input className={INPUT_CLS} placeholder="Address Line 2" value={addr.line2} onChange={e => handleInput(e, section, 'line2')} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {/* Country */}
          <div>
            <select className={INPUT_CLS} value={addr.country} onChange={e => handleInput(e, section, 'country')}>
              <option value="">Select Country...</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="Other">Other</option>
            </select>
            {addr.country === 'Other' && (
              <input className={`${INPUT_CLS} mt-1`} placeholder="Enter country name" value={addr.countryOther} onChange={e => handleInput(e, section, 'countryOther')} />
            )}
          </div>
          {/* State */}
          <div>
            {isIndia ? (
              <>
                <select className={INPUT_CLS} value={addr.state} onChange={e => handleInput(e, section, 'state')}>
                  <option value="">Select State...</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="Other">Other</option>
                </select>
                {addr.state === 'Other' && (
                  <input className={`${INPUT_CLS} mt-1`} placeholder="Enter state name" value={addr.stateOther} onChange={e => handleInput(e, section, 'stateOther')} />
                )}
              </>
            ) : (
              <input className={INPUT_CLS} placeholder="State / Province" value={addr.state} onChange={e => handleInput(e, section, 'state')} />
            )}
          </div>
          {/* City */}
          <div>
            {isIndia ? (
              <>
                <select className={INPUT_CLS} value={addr.city} onChange={e => handleInput(e, section, 'city')}>
                  <option value="">Select City...</option>
                  {MAJOR_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="Other">Other</option>
                </select>
                {addr.city === 'Other' && (
                  <input className={`${INPUT_CLS} mt-1`} placeholder="Enter city name" value={addr.cityOther} onChange={e => handleInput(e, section, 'cityOther')} />
                )}
              </>
            ) : (
              <input className={INPUT_CLS} placeholder="City" value={addr.city} onChange={e => handleInput(e, section, 'city')} />
            )}
          </div>
          {/* Pincode */}
          <div>
            <input className={INPUT_CLS} placeholder="Pincode / ZIP" value={addr.pincode} onChange={e => handleInput(e, section, 'pincode')} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent ref={formScrollRef} className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-cloud-gray to-cloud-gray text-midnight-ink p-0 gap-0 [&>button]:hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-soft-border bg-trust-blue relative">
          <div className="flex items-center justify-center">
            <DialogTitle className="text-lg font-bold text-white">
              {isReadOnly ? 'VIEW WORKFORCE' : editingId ? 'EDIT WORKFORCE' : 'ENROLL WORKFORCE'}
            </DialogTitle>
          </div>
          {isReadOnly && canEdit && (
            <button
              type="button"
              onClick={() => { savedFormRef.current = { ...form }; setIsReadOnly(false); }}
              className="absolute left-5 top-3.5 px-4 py-1 bg-white text-trust-blue font-bold text-sm rounded-full hover:bg-gray-100 transition shadow"
            >
              Edit
            </button>
          )}
          <button
            onClick={handleClose}
            className="absolute right-5 top-4 text-cool-gray hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>

        {submitStatus && (
          <div className="sticky top-0 z-10 px-5 pt-3 bg-cloud-gray/95 backdrop-blur-sm border-b border-soft-border">
            <div className={`rounded-md px-3 py-2 text-sm font-medium ${submitStatus.success ? 'bg-success/10 text-success-dark border border-success/30' : 'bg-danger/10 text-danger-dark border border-danger/30'}`}>
              {submitStatus.message}
            </div>
          </div>
        )}

        <div className="px-5 pb-5 flex flex-col gap-2">
          <form className="space-y-6 pt-4">
          <fieldset disabled={isReadOnly} className="space-y-6 border-0 p-0 m-0 min-w-0">

            {/* ── Section 1: Personal Information ── */}
            <div>
              <h3 className="text-base font-bold text-midnight-ink mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-text" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Full Name *</label>
                  <input className={INPUT_CLS} name="fullName" value={form.fullName} onChange={handleInput} placeholder="Enter full name" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Date of Birth</label>
                  <input type="date" className={INPUT_CLS} name="dob" value={form.dob} onChange={handleInput} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Gender *</label>
                  <select className={INPUT_CLS} name="gender" value={form.gender} onChange={handleInput}>
                    <option value="">Select gender...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Email Address</label>
                  <input className={INPUT_CLS} name="email" value={form.email} onChange={handleInput} placeholder="e.g. name@example.com" type="email" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Contact Number *</label>
                  <input className={INPUT_CLS} name="contact" value={form.contact} onChange={handleInput} placeholder="e.g. 9876543210" type="tel" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">WhatsApp Number</label>
                  <input className={INPUT_CLS} name="whatsapp" value={form.whatsapp} onChange={handleInput} placeholder="e.g. 9876543210" type="tel" />
                </div>
              </div>
            </div>

            {/* ── Section 2: Job Details ── */}
            <fieldset disabled={isReadOnly || jobDetailsLocked} className="border-0 p-0 m-0 min-w-0">
            <div>
              <h3 className="text-base font-bold text-midnight-ink mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-text" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Job Details
              </h3>
              {!isReadOnly && jobDetailsLocked && (
                <p className="text-xs text-cool-gray mb-3">Job details can only be updated by a senior with manage access.</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Department */}
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Department</label>
                  <select
                    className={INPUT_CLS}
                    name="department"
                    value={form.department}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((prev) => ({ ...prev, department: val, departmentOther: '', category: '', categoryOther: '', designation: '', designationOther: '' }));
                    }}
                  >
                    <option value="">Select department...</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    {customDepartments.length > 0 && (
                      <optgroup label="Custom Departments">
                        {customDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                      </optgroup>
                    )}
                    <option value="Other">Other</option>
                  </select>
                  {form.department === 'Other' && (
                    <input className={`${INPUT_CLS} mt-2`} name="departmentOther" value={form.departmentOther} onChange={handleInput} placeholder="Enter department name" />
                  )}
                </div>
                {/* Category — filters based on department */}
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Category</label>
                  {!form.department || form.department === 'Other' ? (
                    <p className="text-sm text-cool-gray italic mt-1">Select a department first</p>
                  ) : DEPT_DATA[form.department]?.categories?.length > 0 ? (
                    <>
                      <select className={INPUT_CLS} name="category" value={form.category} onChange={handleInput}>
                        <option value="">Select category...</option>
                        {DEPT_DATA[form.department].categories.map(c => <option key={c} value={c}>{c}</option>)}
                        <option value="Other">Other</option>
                      </select>
                      {form.category === 'Other' && (
                        <input className={`${INPUT_CLS} mt-2`} name="categoryOther" value={form.categoryOther} onChange={handleInput} placeholder="Enter category" />
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-cool-gray italic mt-1">No sub-categories for this department</p>
                  )}
                </div>
                {/* Role / Designation — filters based on department */}
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Role / Designation</label>
                  <select className={INPUT_CLS} name="designation" value={form.designation} onChange={handleInput}>
                    <option value="">Select role...</option>
                    {!form.department || form.department === 'Other' ? (
                      <optgroup label="Leadership">
                        <option value="Chairman">Chairman</option>
                        <option value="CEO">CEO</option>
                      </optgroup>
                    ) : (
                      <>
                        {DEPT_DATA[form.department]?.roles?.length > 0 && (
                          <optgroup label="Department Roles">
                            {[...DEPT_DATA[form.department].roles].reverse().map(r => <option key={r} value={r}>{r}</option>)}
                          </optgroup>
                        )}
                      </>
                    )}
                    {customRoles.length > 0 && (
                      <optgroup label="Custom Roles">
                        {customRoles.map(r => <option key={r} value={r}>{r}</option>)}
                      </optgroup>
                    )}
                    <option value="Other">Other</option>
                  </select>
                  {form.designation === 'Other' && (
                    <input className={`${INPUT_CLS} mt-2`} name="designationOther" value={form.designationOther} onChange={handleInput} placeholder="Enter role / designation" />
                  )}
                </div>
                {/* Working Style */}
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Working Style</label>
                  <select className={INPUT_CLS} name="workingStyle" value={form.workingStyle} onChange={handleInput}>
                    <option value="">Select working style...</option>
                    {WORKING_STYLES.map(w => <option key={w} value={w}>{w}</option>)}
                    <option value="Other">Other</option>
                  </select>
                  {form.workingStyle === 'Other' && (
                    <input className={`${INPUT_CLS} mt-2`} name="workingStyleOther" value={form.workingStyleOther} onChange={handleInput} placeholder="Enter working style" />
                  )}
                </div>
              </div>
            </div>
            </fieldset>

            {/* ── Section 3: Current Address ── */}
            <div>
              <h3 className="text-base font-bold text-midnight-ink mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-text" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Current Address *
              </h3>
              {renderAddressSection('currentAddress')}
            </div>

            {/* ── Section 4: Permanent Address ── */}
            <div>
              <h3 className="text-base font-bold text-midnight-ink mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-text" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Permanent Address *
              </h3>
              <div className="flex items-center mb-3">
                <input type="checkbox" name="sameAsCurrent" checked={form.sameAsCurrent} onChange={handleInput} className="w-4 h-4 text-trust-blue border-soft-border rounded cursor-pointer" />
                <span className="text-sm text-slate-text font-medium ml-2">Same as current address</span>
              </div>
              {!form.sameAsCurrent && renderAddressSection('permanentAddress')}
              {form.sameAsCurrent && (
                <p className="text-sm text-slate-text italic">Using current address as permanent address.</p>
              )}
            </div>

            {/* ── Section 5: Languages ── */}
            <div>
              <h3 className="text-base font-bold text-midnight-ink mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-text" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                Languages
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">First Language</label>
                  <select className={INPUT_CLS} name="firstLang" value={form.firstLang} onChange={handleInput}>
                    <option value="">Select language...</option>
                    {INDIAN_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                    <option value="Other">Other</option>
                  </select>
                  {form.firstLang === 'Other' && (
                    <input className={`${INPUT_CLS} mt-2`} name="firstLangOther" value={form.firstLangOther} onChange={handleInput} placeholder="Enter language name" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Second Language</label>
                  <select className={INPUT_CLS} name="secondLang" value={form.secondLang} onChange={handleInput}>
                    <option value="">Select language...</option>
                    {INDIAN_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                    <option value="Other">Other</option>
                  </select>
                  {form.secondLang === 'Other' && (
                    <input className={`${INPUT_CLS} mt-2`} name="secondLangOther" value={form.secondLangOther} onChange={handleInput} placeholder="Enter language name" />
                  )}
                </div>
              </div>
            </div>

            {/* ── Section 6: Banking Details ── */}
            <div>
              <h3 className="text-base font-bold text-midnight-ink mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-text" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Banking Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Account Name</label>
                  <input className={INPUT_CLS} name="accountName" value={form.accountName} onChange={handleInput} placeholder="Name on bank account" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Bank Name</label>
                  <input className={INPUT_CLS} name="bankName" value={form.bankName} onChange={handleInput} placeholder="e.g. HDFC Bank" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">Account Number</label>
                  <input className={INPUT_CLS} name="accountNumber" value={form.accountNumber} onChange={handleInput} placeholder="Enter account number" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-text mb-2">IFSC Code</label>
                  <input className={INPUT_CLS} name="ifsc" value={form.ifsc} onChange={handleInput} placeholder="e.g. HDFC0001234" />
                </div>
              </div>
            </div>

            {/* ── Section 7: Identity Documents ── */}
            <div>
              <h3 className="text-base font-bold text-midnight-ink mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-text" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Identity Documents
              </h3>
              <p className="text-cool-gray text-sm font-medium mb-4">Upload your identity documents</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className="border-2 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-soft-border transition"
                  onClick={() => handleUploadClick('aadhaar')}
                >
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => handleFile(e, 'aadhaar')} id="file-input-aadhaar" />
                  <svg className="w-10 h-10 text-cool-gray mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  <div className="font-semibold">Aadhaar Card</div>
                  <div className="text-sm text-cool-gray">{documents.aadhaar ? documents.aadhaar.name : <><span>Drag your file here, or </span><span className="text-slate-text font-semibold">browse</span></>}</div>
                  <div className="text-sm text-cool-gray">PDF, JPG, PNG (Max 5MB)</div>
                </div>
                <div
                  className="border-2 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-soft-border transition"
                  onClick={() => handleUploadClick('pan')}
                >
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => handleFile(e, 'pan')} id="file-input-pan" />
                  <svg className="w-10 h-10 text-cool-gray mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4a1 1 0 011-1h8a1 1 0 011 1v12m-5 4h.01" /></svg>
                  <div className="font-semibold">PAN Card</div>
                  <div className="text-sm text-cool-gray">{documents.pan ? documents.pan.name : <><span>Drag your file here, or </span><span className="text-slate-text font-semibold">browse</span></>}</div>
                  <div className="text-sm text-cool-gray">PDF, JPG, PNG (Max 5MB)</div>
                </div>
              </div>
            </div>

            {/* ── Section 8: Notes ── */}
            <div>
              <h3 className="text-base font-bold text-midnight-ink mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-text" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Notes
              </h3>
              <p className="text-cool-gray text-sm font-medium mb-2">Add any additional notes or remarks</p>
              <textarea
                className={INPUT_CLS}
                name="notes"
                value={form.notes}
                onChange={handleInput}
                rows="5"
                placeholder="Enter your notes here..."
              />
            </div>

          </fieldset>

            {/* ── Action Buttons ── */}
            {isReadOnly ? (
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 h-10 border border-soft-border text-midnight-ink hover:bg-cloud-gray font-bold text-sm rounded transition"
                >
                  Close
                </button>
              </div>
            ) : (editingId ? canEdit : canCreate) ? (
              <div className="flex gap-2 mt-2">
                {editingId ? (
                  <>
                    <button
                      type="button"
                      onClick={() => { if (savedFormRef.current) setForm(savedFormRef.current); setIsReadOnly(true); setSubmitStatus(null); }}
                      className="flex-1 h-10 border border-soft-border text-midnight-ink hover:bg-cloud-gray font-bold text-sm rounded transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex-1 h-10 bg-gradient-to-r from-midnight-ink to-midnight-ink/90 hover:from-midnight-ink hover:to-midnight-ink text-white font-bold text-sm rounded transition shadow-md disabled:opacity-60"
                    >
                      {isSubmitting ? 'SAVING...' : 'SAVE CHANGES'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      className="flex-1 h-10 bg-trust-blue hover:bg-deep-blue text-white font-bold text-sm rounded transition shadow-md"
                    >
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex-1 h-10 bg-gradient-to-r from-midnight-ink to-midnight-ink/90 hover:from-midnight-ink hover:to-midnight-ink text-white font-bold text-sm rounded transition shadow-md disabled:opacity-60"
                    >
                      {isSubmitting ? 'ENROLLING...' : 'ENROLL'}
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500 text-center mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                🔒 You don&apos;t have permission to {editingId ? 'edit' : 'enroll'} workforce members.
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

  return (
    <EnrolWorkforceForm
      open
      onClose={() => router.push('/home')}
    />
  );
}
