'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera, ArrowLeft, User, Phone, MapPin,
  Briefcase, Globe, FileText, Pencil, Check, X, Shield,
  CreditCard, Building2, FolderOpen,
} from 'lucide-react';

/* ─── constants ─────────────────────────────────────── */
const ROLE_LABELS   = { admin: 'Admin', manager: 'Manager', staff: 'Staff' };
const ROLE_ORDER    = { admin: 0, manager: 1, staff: 2 };   // lower = higher rank
const ROLE_COLORS   = {
  admin:   'bg-trust-blue text-white border border-trust-blue',
  manager: 'bg-midnight-ink text-white border border-midnight-ink',
  staff:   'bg-soft-border text-slate-text border border-soft-border',
};
const ROLE_DOT = {
  admin:   'bg-trust-blue',
  manager: 'bg-midnight-ink',
  staff:   'bg-cool-gray',
};

const DESIGNATION_ORDER = [
  'Chairman','CEO','Director','General Manager','Department Head','Project Manager',
  'Manager','Supervisor','Associate','Developer','Intern','craftsMan','Worker',
  'Cook','Pantry Boy','Janitor','Messenger','Security','Electrician','Plumber',
  'CCTV','Carpenter','Ironsmith','Locksmith',
];

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

const WORKING_STYLES = ['On-site','Remote','Hybrid','Field Work','Part-time','Contractual'];

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana',
  'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur',
  'Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir',
  'Ladakh','Lakshadweep','Puducherry',
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

function getDesignationRank(desig) {
  if (!desig) return 999;
  const idx = DESIGNATION_ORDER.findIndex(d => d.toLowerCase() === desig.toLowerCase());
  return idx === -1 ? 998 : idx;
}

function buildDocProxyUrl(url, mode = 'preview') {
  const clean = String(url || '').trim();
  if (!clean) return '';
  return `/api/workforce/document-file?mode=${encodeURIComponent(mode)}&url=${encodeURIComponent(clean)}`;
}

/* ─── helpers ────────────────────────────────────────── */
function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0][0].toUpperCase();
}

/* ─── sub-components ─────────────────────────────────── */
function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-xl border border-soft-border overflow-hidden mb-4">
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-soft-border bg-cloud-gray">
        <Icon className="h-4 w-4 text-trust-blue shrink-0" />
        <h2 className="text-xs font-bold text-midnight-ink uppercase tracking-widest">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function FieldRow({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold text-cool-gray uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-medium text-midnight-ink">
        {value || <span className="text-cool-gray italic font-normal">—</span>}
      </p>
    </div>
  );
}

function EditableField({ label, name, value, editValue, isEditing, onChange, type = 'text', options, disabled }) {
  return (
    <div>
      <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide block mb-0.5">{label}</label>
      {isEditing && !disabled ? (
        options ? (
          <select
            value={editValue ?? ''}
            onChange={e => onChange(name, e.target.value)}
            className="w-full h-9 rounded-lg border border-soft-border px-3 text-sm text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue bg-cloud-gray"
          >
            <option value="">Select...</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            type={type}
            value={editValue ?? ''}
            onChange={e => onChange(name, e.target.value)}
            className="w-full h-9 rounded-lg border border-soft-border px-3 text-sm text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue bg-cloud-gray"
          />
        )
      ) : (
        <p className="text-sm font-medium text-midnight-ink">
          {value || <span className="text-cool-gray italic font-normal">—</span>}
        </p>
      )}
    </div>
  );
}

function EditableAddress({ title, prefix, addr, editData, isEditing, onChange }) {
  if (!isEditing) {
    const parts = [addr?.line1, addr?.line2, addr?.city, addr?.state, addr?.country, addr?.pincode].filter(Boolean);
    return (
      <div>
        <p className="text-sm font-medium text-midnight-ink">
          {parts.length ? parts.join(', ') : <span className="text-cool-gray italic font-normal">—</span>}
        </p>
      </div>
    );
  }
  const get = (field) => editData?.[`${prefix}_${field}`] ?? '';
  const set = (field, val) => onChange(`${prefix}_${field}`, val);
  const country = get('country');
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
      <div className="sm:col-span-2">
        <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide block mb-0.5">Address Line 1</label>
        <input type="text" value={get('line1')} onChange={e => set('line1', e.target.value)}
          className="w-full h-9 rounded-lg border border-soft-border px-3 text-sm text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue bg-cloud-gray" />
      </div>
      <div className="sm:col-span-2">
        <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide block mb-0.5">Address Line 2</label>
        <input type="text" value={get('line2')} onChange={e => set('line2', e.target.value)}
          className="w-full h-9 rounded-lg border border-soft-border px-3 text-sm text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue bg-cloud-gray" />
      </div>
      <div>
        <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide block mb-0.5">Country</label>
        <select value={country} onChange={e => set('country', e.target.value)}
          className="w-full h-9 rounded-lg border border-soft-border px-3 text-sm text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue bg-cloud-gray">
          <option value="">Select...</option>
          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide block mb-0.5">State</label>
        {country === 'India' ? (
          <select value={get('state')} onChange={e => set('state', e.target.value)}
            className="w-full h-9 rounded-lg border border-soft-border px-3 text-sm text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue bg-cloud-gray">
            <option value="">Select...</option>
            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        ) : (
          <input type="text" value={get('state')} onChange={e => set('state', e.target.value)}
            className="w-full h-9 rounded-lg border border-soft-border px-3 text-sm text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue bg-cloud-gray" />
        )}
      </div>
      <div>
        <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide block mb-0.5">City</label>
        <input type="text" value={get('city')} onChange={e => set('city', e.target.value)}
          className="w-full h-9 rounded-lg border border-soft-border px-3 text-sm text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue bg-cloud-gray" />
      </div>
      <div>
        <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide block mb-0.5">Pincode / ZIP</label>
        <input type="text" value={get('pincode')} onChange={e => set('pincode', e.target.value)}
          className="w-full h-9 rounded-lg border border-soft-border px-3 text-sm text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue bg-cloud-gray" />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════ */
export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [sessionUser, setSessionUser]       = useState(null);
  const [workforceMember, setWorkforceMember] = useState(null);
  const [viewerMember, setViewerMember]     = useState(null); // the logged-in user's own workforce record
  const [loading, setLoading]               = useState(true);
  const [profilePhoto, setProfilePhoto]     = useState(null);
  const [docUploading, setDocUploading]     = useState({ aadhaar: false, pan: false });
  const autoCreateRef = useRef(false);

  const [isEditing, setIsEditing]       = useState(false);
  const [isEditingJob, setIsEditingJob] = useState(false); // separate edit mode for job details
  const [editData, setEditData]         = useState({});
  const [saving, setSaving]             = useState(false);
  const [saveMessage, setSaveMessage]   = useState('');
  const [heroVisible, setHeroVisible]   = useState(true);
  const [loggingOut, setLoggingOut]     = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    if (heroRef.current) observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);

  /* ── logout ── */
  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { /* ignore — cookies will be cleared anyway */ }
    router.replace('/login');
  }

  /* ── load ── */
  useEffect(() => {
    async function load() {
      try {
        const res    = await fetch('/api/auth/session', { cache: 'no-store' });
        const result = await res.json();
        if (res.status === 401) { router.replace('/login'); return; }
        if (!res.ok || !result.success) { return; }

        const u = result.user;
        setSessionUser(u);

        // fetch workforce to find current user's profile
        const allRes    = await fetch('/api/workforce?page_size=200', { cache: 'no-store' });
        const allResult = await allRes.json().catch(() => null);
        const rawList   = Array.isArray(allResult?.data) ? allResult.data
                        : Array.isArray(allResult?.data?.results) ? allResult.data.results
                        : Array.isArray(allResult?.results) ? allResult.results : [];

        const email = u.email || '';
        let match = email ? rawList.find(m => (m.email || '').toLowerCase() === email.toLowerCase()) : null;
        // Also try matching by username if no email match (e.g. superuser with no email in workforce)
        if (!match && u.username) {
          match = rawList.find(m => (m.username || '').toLowerCase() === u.username.toLowerCase());
        }
        if (match) {
          setWorkforceMember(match);
          setViewerMember(match);   // viewer IS the profile owner on own profile
          // Prefer the server-stored photo URL (visible to all), fall back to localStorage
          if (match.profile_photo_url) {
            setProfilePhoto(match.profile_photo_url);
            localStorage.setItem(`profile_photo_${u.username}`, match.profile_photo_url);
          } else {
            const saved = localStorage.getItem(`profile_photo_${u.username}`);
            if (saved) setProfilePhoto(saved);
          }
        } else {
          const saved = localStorage.getItem(`profile_photo_${u.username}`);
          if (saved) setProfilePhoto(saved);
          // Auto-create workforce record for admin/superuser who has no record yet
          const isAdmin = u.role === 'admin' || u.is_superuser === true;
          if (isAdmin && (email || u.username) && !autoCreateRef.current) {
            autoCreateRef.current = true;
            try {
              const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username;
              const createRes = await fetch('/api/workforce', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  full_name: fullName,
                  email: email || '',
                  username: u.username || '',
                  active: true,
                  designation: 'Admin',
                  department: 'Management',
                }),
              });
              if (createRes.ok) {
                const created = await createRes.json().catch(() => null);
                const newRecord = created?.data || created;
                if (newRecord?.id) {
                  setWorkforceMember(newRecord);
                  setViewerMember(newRecord);
                  window.dispatchEvent(new CustomEvent('workforce-updated'));
                }
              } else if (createRes.status === 400) {
                // Backend found duplicate — fetch by ID if returned
                const errBody = await createRes.json().catch(() => null);
                const existingId = errBody?.id || errBody?.detail?.id;
                if (existingId) {
                  const fetchRes = await fetch(`/api/workforce/${existingId}`, { cache: 'no-store' });
                  if (fetchRes.ok) {
                    const fetchResult = await fetchRes.json().catch(() => null);
                    const rec = fetchResult?.data || fetchResult;
                    if (rec?.id) { setWorkforceMember(rec); setViewerMember(rec); }
                  }
                }
              }
            } catch { /* ignore — will retry next load */ }
          }
        }
      } catch { /* Network error — fail silently */ }
      finally  { setLoading(false); }
    }
    load();
  }, [router]);

  /* ── helpers ── */
  function getInitials() {
    const wf = workforceMember;
    if (wf?.full_name) return initials(wf.full_name);
    const f = sessionUser?.first_name?.[0] || '';
    const l = sessionUser?.last_name?.[0]  || '';
    if (f || l) return (f + l).toUpperCase();
    return sessionUser?.username?.[0]?.toUpperCase() || '?';
  }

  function getDisplayName() {
    if (workforceMember?.full_name) return workforceMember.full_name;
    const full = [sessionUser?.first_name, sessionUser?.last_name].filter(Boolean).join(' ');
    return full || sessionUser?.username || '';
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Photo must be under 5 MB.'); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      // Show immediately and cache locally
      setProfilePhoto(dataUrl);
      localStorage.setItem(`profile_photo_${sessionUser.username}`, dataUrl);
      window.dispatchEvent(new CustomEvent('profile_photo_updated', { detail: { photo: dataUrl } }));
      // Upload to server so all other users see the new photo
      if (workforceMember?.id) {
        try {
          const res = await fetch(`/api/workforce/${workforceMember.id}/upload-photo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photo_data: dataUrl }),
          });
          const result = await res.json().catch(() => null);
          if (res.ok && result?.data?.profile_photo_url) {
            const url = result.data.profile_photo_url;
            setWorkforceMember(prev => ({ ...prev, profile_photo_url: url }));
            // Replace base64 in cache with the stable server URL
            localStorage.setItem(`profile_photo_${sessionUser.username}`, url);
            window.dispatchEvent(new CustomEvent('profile_photo_updated', { detail: { photo: url } }));
            window.dispatchEvent(new CustomEvent('workforce-updated'));
          }
        } catch {
          // Network error — local preview is still shown
        }
      }
    };
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setProfilePhoto(null);
    localStorage.removeItem(`profile_photo_${sessionUser.username}`);
    window.dispatchEvent(new CustomEvent('profile_photo_updated', { detail: { photo: null } }));
    if (workforceMember?.id) {
      fetch(`/api/workforce/${workforceMember.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_photo_url: '' }),
      }).catch(() => {});
      setWorkforceMember(prev => ({ ...prev, profile_photo_url: '' }));
      window.dispatchEvent(new CustomEvent('workforce-updated'));
    }
  }

  function startEdit() {
    if (!workforceMember) return;
    const wf = workforceMember;
    const ca = wf.current_address || {};
    const pa = wf.permanent_address || {};
    setEditData({
      full_name: wf.full_name || '',
      dob: wf.dob || '',
      gender: wf.gender || '',
      phone: wf.phone || '',
      whatsapp: wf.whatsapp || '',
      first_language: wf.first_language || '',
      second_language: wf.second_language || '',
      gst_number: wf.gst_number || '',
      notes: wf.notes || '',
      category: wf.category || '',
      working_style: wf.working_style || '',
      // banking
      account_name: wf.account_name || '',
      bank_name: wf.bank_name || '',
      account_number: wf.account_number || '',
      ifsc: wf.ifsc || '',
      // current address (flattened)
      current_line1: ca.line1 || '',
      current_line2: ca.line2 || '',
      current_country: ca.country || '',
      current_state: ca.state || '',
      current_city: ca.city || '',
      current_pincode: ca.pincode || '',
      // permanent address (flattened)
      permanent_line1: pa.line1 || '',
      permanent_line2: pa.line2 || '',
      permanent_country: pa.country || '',
      permanent_state: pa.state || '',
      permanent_city: pa.city || '',
      permanent_pincode: pa.pincode || '',
    });
    setIsEditing(true);
    setSaveMessage('');
  }

  /* canEditJob: viewer has manage_members, outranks the target, and is NOT the target themselves */
  const canEditJob = (() => {
    const vm = viewerMember;
    const target = workforceMember;
    if (!vm || !target) return false;
    if (!vm.permissions?.manage_members) return false;
    // users cannot edit their own job details
    if (vm.id === target.id) return false;
    return getDesignationRank(vm.designation) < getDesignationRank(target.designation);
  })();

  function startEditJob() {
    if (!workforceMember) return;
    const wf = workforceMember;
    setEditData(prev => ({
      ...prev,
      job_department: wf.department || '',
      job_category: wf.category || '',
      job_designation: wf.designation || '',
      job_working_style: wf.working_style || '',
      job_current_location: wf.current_location || '',
    }));
    setIsEditingJob(true);
    setSaveMessage('');
  }

  function cancelEditJob() { setIsEditingJob(false); setSaveMessage(''); }

  function handleEditChange(name, value) { setEditData(prev => ({ ...prev, [name]: value })); }

  async function handleDeleteDocument(docType) {
    if (!workforceMember?.id || !docType) return;
    setDocUploading(p => ({ ...p, [docType]: true }));
    try {
      const res = await fetch(`/api/workforce/${workforceMember.id}/delete-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_type: docType }),
      });
      const result = await res.json().catch(() => null);
      if (res.ok && result?.success) {
        const key = docType === 'aadhaar' ? 'aadhaar_url' : 'pan_url';
        setWorkforceMember(prev => ({ ...prev, [key]: '' }));
        setSaveMessage(`${docType === 'aadhaar' ? 'Aadhaar' : 'PAN'} deleted successfully.`);
        window.dispatchEvent(new CustomEvent('workforce-updated'));
      } else {
        setSaveMessage((result?.message || 'Failed to delete document.') + '');
      }
    } catch {
      setSaveMessage('Network error while deleting document.');
    } finally {
      setDocUploading(p => ({ ...p, [docType]: false }));
    }
  }

  async function handleSave() {
    if (!workforceMember?.id) return;
    setSaving(true); setSaveMessage('');
    try {
      const payload = { ...editData };
      if (payload.dob === '') payload.dob = null;
      // reconstruct address objects from flat fields
      payload.current_address = {
        line1: payload.current_line1 || '', line2: payload.current_line2 || '',
        country: payload.current_country || '', state: payload.current_state || '',
        city: payload.current_city || '', pincode: payload.current_pincode || '',
      };
      payload.permanent_address = {
        line1: payload.permanent_line1 || '', line2: payload.permanent_line2 || '',
        country: payload.permanent_country || '', state: payload.permanent_state || '',
        city: payload.permanent_city || '', pincode: payload.permanent_pincode || '',
      };
      // remove flat address keys
      ['current_line1','current_line2','current_country','current_state','current_city','current_pincode',
       'permanent_line1','permanent_line2','permanent_country','permanent_state','permanent_city','permanent_pincode',
       'job_department','job_category','job_designation','job_working_style','job_current_location',
      ].forEach(k => delete payload[k]);

      const res    = await fetch(`/api/workforce/${workforceMember.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await res.json().catch(() => null);
      if (res.ok && result?.success) {
        setWorkforceMember(prev => ({ ...prev, ...payload }));
        setSaveMessage('Saved successfully!'); setIsEditing(false);
        window.dispatchEvent(new CustomEvent('workforce-updated'));
      } else { setSaveMessage(result?.message || 'Failed to save.'); }
    } catch { setSaveMessage('Network error. Please try again.'); }
    finally  { setSaving(false); }
  }

  async function handleSaveJob() {
    if (!workforceMember?.id) return;
    setSaving(true); setSaveMessage('');
    try {
      const payload = {
        department: editData.job_department || '',
        category: editData.job_category || '',
        designation: editData.job_designation || '',
        working_style: editData.job_working_style || '',
        current_location: editData.job_current_location || '',
      };
      const res = await fetch(`/api/workforce/${workforceMember.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await res.json().catch(() => null);
      if (res.ok && result?.success) {
        setWorkforceMember(prev => ({ ...prev, ...payload }));
        setSaveMessage('Job details saved!'); setIsEditingJob(false);
        window.dispatchEvent(new CustomEvent('workforce-updated'));
      } else { setSaveMessage(result?.message || 'Failed to save job details.'); }
    } catch { setSaveMessage('Network error. Please try again.'); }
    finally  { setSaving(false); }
  }

  function cancelEdit() { setIsEditing(false); setEditData({}); setSaveMessage(''); }

  /* ── loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-cloud-gray flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-trust-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const wf = workforceMember;

  /* ════ RENDER ════ */
  return (
    <div className="min-h-screen bg-cloud-gray flex flex-col font-sans">

      {/* ══ Full-width top nav bar ══ */}
      <header className="w-full bg-trust-blue flex items-center gap-4 px-6 py-0 h-14 shrink-0">
        {/* Hide Back for unapproved users — /home is not accessible to them */}
        {sessionUser?.is_approved !== false && (
          <button onClick={() => router.push('/home')} className="text-white/60 hover:text-white transition shrink-0" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}

        {/* avatar + name (left side) */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-8 h-8 rounded-full border-2 border-white/20 overflow-hidden cursor-pointer shrink-0"
            onClick={() => fileInputRef.current?.click()} title="Change photo"
          >
            {profilePhoto
              ? <img src={profilePhoto} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-white flex items-center justify-center text-trust-blue text-xs font-bold">{getInitials()}</div>
            }
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-tight truncate">{getDisplayName()}</p>
            <p className="text-[11px] text-white/50 leading-tight">@{sessionUser?.username}</p>
          </div>
        </div>

        {/* center title */}
        <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-bold text-white uppercase tracking-widest hidden md:block">
          My Profile
        </h1>

        {/* right: role badge + logout */}
        <div className="shrink-0 flex items-center gap-2">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${ROLE_COLORS[sessionUser?.role] || ROLE_COLORS.staff}`}>
            {ROLE_LABELS[sessionUser?.role] || 'Staff'}
          </span>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 transition disabled:opacity-60"
            title="Sign out"
          >
            {loggingOut ? 'Signing out…' : 'Logout'}
          </button>
        </div>

        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handlePhotoChange} />
      </header>

      {/* ══ Full-width dark profile hero ══ */}
      <div ref={heroRef} className="w-full bg-trust-blue border-b border-white/10 relative overflow-hidden">
        <div className="relative w-full px-6 md:px-12 py-6 flex flex-col md:flex-row items-center md:items-end gap-5">

          {/* big avatar */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-full border-4 border-white/20 overflow-hidden cursor-pointer shadow-xl"
              onClick={() => fileInputRef.current?.click()} title="Click to change photo">
              {profilePhoto
                ? <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-white flex items-center justify-center text-trust-blue text-3xl font-bold">{getInitials()}</div>
              }
            </div>
            <button onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-1 right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow hover:bg-cloud-gray transition" title="Change photo">
              <Camera className="h-3 w-3 text-midnight-ink" />
            </button>
          </div>

          {/* name block */}
          <div className="flex-1 text-center md:text-left pb-0.5">
            <h2 className="text-2xl font-bold text-white">{getDisplayName()}</h2>
            <p className="text-white/50 text-sm mt-0.5">{sessionUser?.email}</p>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${ROLE_COLORS[sessionUser?.role] || ROLE_COLORS.staff}`}>
                {ROLE_LABELS[sessionUser?.role] || 'Staff'}
              </span>
              {wf?.department && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/10 text-white border border-white/10">
                  {wf.department}
                </span>
              )}
              {wf?.active === false && <span className="text-xs font-semibold px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/20">Inactive</span>}
            </div>
          </div>

          {/* right actions */}
          <div className="flex items-center gap-2 shrink-0">
            {profilePhoto && (
              <button onClick={removePhoto} className="text-white/40 hover:text-white/70 text-xs transition">Remove photo</button>
            )}
            {wf && !isEditing && (
              <button onClick={startEdit}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-4 py-2 rounded-lg transition border border-white/10">
                <Pencil className="h-3 w-3" /> Edit Profile
              </button>
            )}
            {isEditing && (
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1 bg-trust-blue hover:bg-deep-blue text-white text-xs font-semibold px-4 py-2 rounded-lg transition disabled:opacity-60">
                  <Check className="h-3 w-3" /> {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={cancelEdit}
                  className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-4 py-2 rounded-lg transition">
                  <X className="h-3 w-3" /> Cancel
                </button>
              </div>
            )}
          </div>
        </div>


      </div>

      {/* ══ Sticky bottom edit bar — appears when hero scrolls out of view ══ */}
      {wf && !heroVisible && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-soft-border shadow-lg px-4 md:px-8 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-soft-border shrink-0">
              {profilePhoto
                ? <img src={profilePhoto} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-trust-blue flex items-center justify-center text-white text-xs font-bold">{getInitials()}</div>
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-midnight-ink truncate">{getDisplayName()}</p>
              {isEditing
                ? <p className="text-xs text-amber-600 font-medium">Editing — unsaved changes</p>
                : <p className="text-xs text-cool-gray">Your profile</p>
              }
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isEditing ? (
              <button onClick={startEdit}
                className="flex items-center gap-1.5 bg-trust-blue hover:bg-deep-blue text-white text-sm font-semibold px-4 py-2 rounded-lg transition shadow-sm">
                <Pencil className="h-3.5 w-3.5" /> Edit Profile
              </button>
            ) : (
              <>
                <button onClick={cancelEdit}
                  className="flex items-center gap-1.5 border border-soft-border text-midnight-ink hover:bg-cloud-gray text-sm font-semibold px-4 py-2 rounded-lg transition">
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 bg-trust-blue hover:bg-deep-blue text-white text-sm font-semibold px-4 py-2 rounded-lg transition shadow-sm disabled:opacity-60">
                  <Check className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══ Body ══ */}
      <div className="flex-1 w-full px-4 md:px-8 lg:px-12 py-6 pb-20">

        {/* save message — also as floating toast so it's visible when scrolled down */}
        {saveMessage && (
          <>
            <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium max-w-3xl
              ${saveMessage.toLowerCase().includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {saveMessage}
            </div>
            <div className={`fixed top-5 right-5 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold border
              ${saveMessage.toLowerCase().includes('success') ? 'bg-green-600 text-white border-green-700' : 'bg-red-600 text-white border-red-700'}`}
              onClick={() => setSaveMessage('')} style={{cursor:'pointer'}} title="Click to dismiss">
              {saveMessage.toLowerCase().includes('success')
                ? <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                : <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              }
              {saveMessage}
            </div>
          </>
        )}

        {/* ─── PROFILE ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* LEFT sidebar — quick stats */}
            <div className="lg:col-span-1 space-y-4">
              {!wf && (
                <div className="rounded-xl bg-white border border-soft-border px-5 py-4 text-sm text-cool-gray">
                  No workforce profile linked. Ask your admin to enroll you via <strong className="text-midnight-ink">Enroll Workforce</strong> with your email.
                </div>
              )}

              {/* Account card */}
              <div className="bg-white rounded-xl border border-soft-border overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-3 border-b border-soft-border bg-cloud-gray">
                  <Shield className="h-4 w-4 text-trust-blue" />
                  <span className="text-xs font-bold text-midnight-ink uppercase tracking-widest">Account</span>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <FieldRow label="Username" value={`@${sessionUser?.username}`} />
                  <FieldRow label="Role" value={ROLE_LABELS[sessionUser?.role] || 'Staff'} />
                  <FieldRow label="Email" value={sessionUser?.email} />
                  {sessionUser?.is_approved === false && (
                    <p className="text-[11px] text-amber-600 font-semibold pt-1">
                      Account pending approval — limited access until an admin approves you.
                    </p>
                  )}
                  {sessionUser?.is_approved !== false && (
                    <p className="text-[11px] text-cool-gray pt-1">Managed by administrator.</p>
                  )}
                </div>
              </div>

              {/* Work quick card */}
              {wf && (
                <div className="bg-white rounded-xl border border-soft-border overflow-hidden">
                  <div className="flex items-center gap-2.5 px-5 py-3 border-b border-soft-border bg-cloud-gray">
                    <Briefcase className="h-4 w-4 text-trust-blue" />
                    <span className="text-xs font-bold text-midnight-ink uppercase tracking-widest">Work</span>
                  </div>
                  <div className="px-5 py-4 space-y-3">
                    <FieldRow label="Designation" value={wf?.designation} />
                    <FieldRow label="Department" value={wf?.department} />
                    <FieldRow label="Category" value={wf?.category} />
                    <FieldRow label="Working Style" value={wf?.working_style} />
                    <FieldRow label="Location" value={wf?.current_location} />
                    <FieldRow label="GST" value={wf?.gst_number} />
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT main — detail sections */}
            <div className="lg:col-span-2 space-y-0">

              {/* Inline edit status bar — no duplicate button, just status text */}
              {wf && isEditing && (
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-amber-600 font-medium">Editing your profile — make your changes below.</p>
                </div>
              )}
              {wf && !isEditing && (
                <div className="mb-4">
                  <p className="text-xs text-cool-gray">View and manage your personal information.</p>
                </div>
              )}

              <SectionCard icon={User} title="Personal Information">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <EditableField label="Full Name"     name="full_name" value={wf?.full_name} editValue={editData.full_name} isEditing={isEditing} onChange={handleEditChange} />
                  <EditableField label="Date of Birth" name="dob"       type="date" value={wf?.dob} editValue={editData.dob} isEditing={isEditing} onChange={handleEditChange} />
                  <EditableField label="Gender"        name="gender"    value={wf?.gender} editValue={editData.gender} isEditing={isEditing} onChange={handleEditChange} options={['Male','Female','Other']} />
                  <FieldRow      label="Email Address" value={sessionUser?.email || wf?.email} />
                </div>
              </SectionCard>

              <SectionCard icon={Phone} title="Contact Details">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <EditableField label="Contact Number" name="phone"    value={wf?.phone}    editValue={editData.phone}    isEditing={isEditing} onChange={handleEditChange} />
                  <EditableField label="WhatsApp"       name="whatsapp" value={wf?.whatsapp} editValue={editData.whatsapp} isEditing={isEditing} onChange={handleEditChange} />
                </div>
              </SectionCard>

              {/* ── Job Details (manage_members + hierarchy gated) ── */}
              <div className="bg-white rounded-xl border border-soft-border overflow-hidden mb-4">
                <div className="flex items-center gap-2.5 px-5 py-3 border-b border-soft-border bg-cloud-gray">
                  <Briefcase className="h-4 w-4 text-trust-blue shrink-0" />
                  <h2 className="text-xs font-bold text-midnight-ink uppercase tracking-widest flex-1">Job Details</h2>
                  {canEditJob && !isEditingJob && (
                    <button onClick={startEditJob}
                      className="flex items-center gap-1 text-trust-blue hover:text-deep-blue text-xs font-semibold transition">
                      <Pencil className="h-3 w-3" /> Assign Role
                    </button>
                  )}
                  {isEditingJob && (
                    <div className="flex gap-2">
                      <button onClick={handleSaveJob} disabled={saving}
                        className="flex items-center gap-1 bg-trust-blue text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-60">
                        <Check className="h-3 w-3" /> {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button onClick={cancelEditJob}
                        className="flex items-center gap-1 text-cool-gray hover:text-midnight-ink text-xs font-semibold transition">
                        <X className="h-3 w-3" /> Cancel
                      </button>
                    </div>
                  )}
                </div>
                <div className="px-5 py-4">
                  {isEditingJob ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                      <div>
                        <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide block mb-0.5">Department</label>
                        <select value={editData.job_department ?? ''} onChange={e => {
                          handleEditChange('job_department', e.target.value);
                          handleEditChange('job_category', '');
                          handleEditChange('job_designation', '');
                        }} className="w-full h-9 rounded-lg border border-soft-border px-3 text-sm text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue bg-cloud-gray">
                          <option value="">Select...</option>
                          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide block mb-0.5">Category</label>
                        <select value={editData.job_category ?? ''} onChange={e => handleEditChange('job_category', e.target.value)}
                          className="w-full h-9 rounded-lg border border-soft-border px-3 text-sm text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue bg-cloud-gray">
                          <option value="">Select...</option>
                          {(DEPT_DATA[editData.job_department]?.categories || []).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide block mb-0.5">Designation</label>
                        <select value={editData.job_designation ?? ''} onChange={e => handleEditChange('job_designation', e.target.value)}
                          className="w-full h-9 rounded-lg border border-soft-border px-3 text-sm text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue bg-cloud-gray">
                          <option value="">Select...</option>
                          {(DEPT_DATA[editData.job_department]?.roles || []).map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <EditableField label="Working Style" name="job_working_style" value={wf?.working_style} editValue={editData.job_working_style} isEditing={true} onChange={handleEditChange} options={WORKING_STYLES} />
                      <EditableField label="Current Location" name="job_current_location" value={wf?.current_location} editValue={editData.job_current_location} isEditing={true} onChange={handleEditChange} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                      <FieldRow label="Department"       value={wf?.department} />
                      <FieldRow label="Category"         value={wf?.category} />
                      <FieldRow label="Designation"      value={wf?.designation} />
                      <FieldRow label="Working Style"    value={wf?.working_style} />
                      <FieldRow label="Current Location" value={wf?.current_location} />
                    </div>
                  )}
                  {!canEditJob && !isEditingJob && (
                    <p className="text-xs text-cool-gray mt-3">Job details can only be updated by a senior with manage access.</p>
                  )}
                </div>
              </div>

              <SectionCard icon={MapPin} title="Current Address">
                <EditableAddress title="Current Address" prefix="current" addr={wf?.current_address} editData={editData} isEditing={isEditing} onChange={handleEditChange} />
              </SectionCard>

              <SectionCard icon={MapPin} title="Permanent Address">
                <EditableAddress title="Permanent Address" prefix="permanent" addr={wf?.permanent_address} editData={editData} isEditing={isEditing} onChange={handleEditChange} />
              </SectionCard>

              <SectionCard icon={Globe} title="Languages & Other">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <EditableField label="First Language"  name="first_language"  value={wf?.first_language}  editValue={editData.first_language}  isEditing={isEditing} onChange={handleEditChange} options={INDIAN_LANGUAGES} />
                  <EditableField label="Second Language" name="second_language" value={wf?.second_language} editValue={editData.second_language} isEditing={isEditing} onChange={handleEditChange} options={INDIAN_LANGUAGES} />
                  <EditableField label="GST Number"      name="gst_number"      value={wf?.gst_number}      editValue={editData.gst_number}      isEditing={isEditing} onChange={handleEditChange} />
                  {/* Category is admin-only — it determines software access permissions. Read-only here. */}
                  <div>
                    <FieldRow label="Category" value={wf?.category} />
                    {isEditing && <p className="text-[11px] text-cool-gray mt-0.5">Assigned by admin.</p>}
                  </div>
                  <EditableField label="Working Style"   name="working_style"   value={wf?.working_style}   editValue={editData.working_style}   isEditing={isEditing} onChange={handleEditChange} options={WORKING_STYLES} />
                </div>
              </SectionCard>

              <SectionCard icon={CreditCard} title="Banking Details">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <EditableField label="Account Holder Name" name="account_name"   value={wf?.account_name}   editValue={editData.account_name}   isEditing={isEditing} onChange={handleEditChange} />
                  <EditableField label="Bank Name"           name="bank_name"       value={wf?.bank_name}       editValue={editData.bank_name}       isEditing={isEditing} onChange={handleEditChange} />
                  <EditableField label="Account Number"      name="account_number"  value={wf?.account_number}  editValue={editData.account_number}  isEditing={isEditing} onChange={handleEditChange} />
                  <EditableField label="IFSC Code"           name="ifsc"            value={wf?.ifsc}            editValue={editData.ifsc}            isEditing={isEditing} onChange={handleEditChange} />
                </div>
              </SectionCard>

              <SectionCard icon={FileText} title="Notes">
                {isEditing ? (
                  <textarea rows={3} value={editData.notes ?? ''} onChange={e => handleEditChange('notes', e.target.value)}
                    className="w-full rounded-lg border border-soft-border px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue bg-cloud-gray resize-none" />
                ) : (
                  <p className={`text-sm font-medium text-midnight-ink whitespace-pre-line`}>
                    {wf?.notes || <span className="text-cool-gray italic font-normal">No notes.</span>}
                  </p>
                )}
              </SectionCard>

              <SectionCard icon={FolderOpen} title="Identity Documents">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Aadhaar Card */}
                  <div className="rounded-lg border border-soft-border p-4 bg-cloud-gray">
                    <p className="text-xs font-bold text-cool-gray uppercase tracking-wide mb-2">Aadhaar Card</p>
                    {wf?.aadhaar_url ? (
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <a href={buildDocProxyUrl(wf.aadhaar_url, 'preview')} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-trust-blue underline hover:text-deep-blue truncate">View Document</a>
                      </div>
                    ) : (
                      <p className="text-sm text-cool-gray italic mb-2">Not uploaded yet.</p>
                    )}
                    {isEditing && (
                      <div className="flex items-center gap-2">
                        <label className={`flex items-center gap-2 cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${docUploading.aadhaar ? 'opacity-50 pointer-events-none' : 'border-trust-blue text-trust-blue hover:bg-blue-50'}`}>
                          <input type="file" className="hidden" accept="image/*,application/pdf" disabled={docUploading.aadhaar}
                            onChange={async (e) => {
                              const file = e.target.files?.[0]; if (!file || !wf?.id) return;
                              if (file.size > 10 * 1024 * 1024) { alert('File must be under 10 MB.'); return; }
                              setDocUploading(p => ({ ...p, aadhaar: true }));
                              try {
                                const reader = new FileReader();
                                reader.onload = async (ev) => {
                                  const res = await fetch(`/api/workforce/${wf.id}/upload-document`, {
                                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ photo_data: ev.target.result, doc_type: 'aadhaar' }),
                                  });
                                  const result = await res.json().catch(() => null);
                                  if (res.ok && (result?.data?.url || result?.data?.aadhaar_url)) {
                                    const uploadedUrl = result.data.url || result.data.aadhaar_url;
                                    setWorkforceMember(prev => ({ ...prev, aadhaar_url: uploadedUrl }));
                                    setSaveMessage('Aadhaar uploaded successfully.');
                                  } else { setSaveMessage('Aadhaar upload failed. ' + (result?.message || 'Try again.')); }
                                  setDocUploading(p => ({ ...p, aadhaar: false }));
                                };
                                reader.readAsDataURL(file);
                              } catch { setDocUploading(p => ({ ...p, aadhaar: false })); }
                            }} />
                          {docUploading.aadhaar ? 'Uploading…' : (wf?.aadhaar_url ? 'Replace Aadhaar' : 'Upload Aadhaar')}
                        </label>
                        {wf?.aadhaar_url && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument('aadhaar')}
                            disabled={docUploading.aadhaar}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {/* PAN Card */}
                  <div className="rounded-lg border border-soft-border p-4 bg-cloud-gray">
                    <p className="text-xs font-bold text-cool-gray uppercase tracking-wide mb-2">PAN Card</p>
                    {wf?.pan_url ? (
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <a href={buildDocProxyUrl(wf.pan_url, 'preview')} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-trust-blue underline hover:text-deep-blue truncate">View Document</a>
                      </div>
                    ) : (
                      <p className="text-sm text-cool-gray italic mb-2">Not uploaded yet.</p>
                    )}
                    {isEditing && (
                      <div className="flex items-center gap-2">
                        <label className={`flex items-center gap-2 cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${docUploading.pan ? 'opacity-50 pointer-events-none' : 'border-trust-blue text-trust-blue hover:bg-blue-50'}`}>
                          <input type="file" className="hidden" accept="image/*,application/pdf" disabled={docUploading.pan}
                            onChange={async (e) => {
                              const file = e.target.files?.[0]; if (!file || !wf?.id) return;
                              if (file.size > 10 * 1024 * 1024) { alert('File must be under 10 MB.'); return; }
                              setDocUploading(p => ({ ...p, pan: true }));
                              try {
                                const reader = new FileReader();
                                reader.onload = async (ev) => {
                                  const res = await fetch(`/api/workforce/${wf.id}/upload-document`, {
                                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ photo_data: ev.target.result, doc_type: 'pan' }),
                                  });
                                  const result = await res.json().catch(() => null);
                                  if (res.ok && (result?.data?.url || result?.data?.pan_url)) {
                                    const uploadedUrl = result.data.url || result.data.pan_url;
                                    setWorkforceMember(prev => ({ ...prev, pan_url: uploadedUrl }));
                                    setSaveMessage('PAN uploaded successfully.');
                                  } else { setSaveMessage('PAN upload failed. ' + (result?.message || 'Try again.')); }
                                  setDocUploading(p => ({ ...p, pan: false }));
                                };
                                reader.readAsDataURL(file);
                              } catch { setDocUploading(p => ({ ...p, pan: false })); }
                            }} />
                          {docUploading.pan ? 'Uploading…' : (wf?.pan_url ? 'Replace PAN' : 'Upload PAN')}
                        </label>
                        {wf?.pan_url && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument('pan')}
                            disabled={docUploading.pan}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {!isEditing && <p className="text-xs text-cool-gray mt-3">Click <strong>Edit Profile</strong> (top right) to upload your identity documents.</p>}
              </SectionCard>
            </div>
        </div>
      </div>
    </div>
  );
}
