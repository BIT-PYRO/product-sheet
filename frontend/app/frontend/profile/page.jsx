'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera, ArrowLeft, User, Phone, MapPin,
  Briefcase, Globe, FileText, Pencil, Check, X, Shield,
  GitFork, Lock, ChevronDown, ChevronRight,
  LayoutDashboard, Plus,
} from 'lucide-react';

/* ─── constants ─────────────────────────────────────── */
const ROLE_LABELS   = { admin: 'Admin', manager: 'Manager', staff: 'Staff' };
const ROLE_ORDER    = { admin: 0, manager: 1, staff: 2 };   // lower = higher rank
const ROLE_COLORS   = {
  admin:   'bg-red-100 text-red-700 border border-red-200',
  manager: 'bg-amber-100 text-amber-700 border border-amber-200',
  staff:   'bg-sky-100 text-sky-700 border border-sky-200',
};
const ROLE_DOT = {
  admin:   'bg-red-500',
  manager: 'bg-amber-500',
  staff:   'bg-sky-500',
};

/* ─── helpers ────────────────────────────────────────── */
function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
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

function EditableField({ label, name, value, editValue, isEditing, onChange, type = 'text' }) {
  return (
    <div>
      <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide block mb-0.5">{label}</label>
      {isEditing ? (
        <input
          type={type}
          value={editValue ?? ''}
          onChange={e => onChange(name, e.target.value)}
          className="w-full h-9 rounded-lg border border-soft-border px-3 text-sm text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue bg-cloud-gray"
        />
      ) : (
        <p className="text-sm font-medium text-midnight-ink">
          {value || <span className="text-cool-gray italic font-normal">—</span>}
        </p>
      )}
    </div>
  );
}

function AddressBlock({ label, addr }) {
  const parts = [addr?.line1, addr?.line2, addr?.city, addr?.state, addr?.pincode].filter(Boolean);
  return (
    <div>
      <p className="text-xs font-semibold text-cool-gray uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-medium text-midnight-ink">
        {parts.length ? parts.join(', ') : <span className="text-cool-gray italic font-normal">—</span>}
      </p>
    </div>
  );
}

/* ─── Member Detail Modal ─────────────────────────────── */
function MemberDetailModal({ member, onClose }) {
  if (!member) return null;
  const addr = (a) => {
    const parts = [a?.line1, a?.line2, a?.city, a?.state, a?.pincode].filter(Boolean);
    return parts.length ? parts.join(', ') : '—';
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* header */}
        <div className="bg-midnight-ink rounded-t-2xl px-6 py-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-trust-blue flex items-center justify-center text-white text-xl font-bold shrink-0">
            {initials(member.full_name || member.email || '?')}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white truncate">{member.full_name || '—'}</h3>
            {member.designation && <p className="text-xs text-white/60 mt-0.5">{member.designation}</p>}
            {member.department && <p className="text-xs text-white/40">{member.department}</p>}
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* body */}
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {[
              { label: 'Email',    val: member.email },
              { label: 'Phone',    val: member.phone },
              { label: 'WhatsApp', val: member.whatsapp },
              { label: 'Gender',   val: member.gender },
              { label: 'DOB',      val: member.dob },
              { label: 'GST',      val: member.gst_number },
              { label: 'Location', val: member.current_location },
              { label: 'Lang 1',   val: member.first_language },
              { label: 'Lang 2',   val: member.second_language },
            ].map(({ label, val }) => val ? (
              <div key={label}>
                <p className="text-[10px] font-semibold text-cool-gray uppercase tracking-wide">{label}</p>
                <p className="text-sm font-medium text-midnight-ink">{val}</p>
              </div>
            ) : null)}
          </div>
          {member.current_address && Object.values(member.current_address || {}).some(Boolean) && (
            <div>
              <p className="text-[10px] font-semibold text-cool-gray uppercase tracking-wide mb-0.5">Current Address</p>
              <p className="text-sm font-medium text-midnight-ink">{addr(member.current_address)}</p>
            </div>
          )}
          {member.permanent_address && Object.values(member.permanent_address || {}).some(Boolean) && (
            <div>
              <p className="text-[10px] font-semibold text-cool-gray uppercase tracking-wide mb-0.5">Permanent Address</p>
              <p className="text-sm font-medium text-midnight-ink">{addr(member.permanent_address)}</p>
            </div>
          )}
          {member.notes && (
            <div>
              <p className="text-[10px] font-semibold text-cool-gray uppercase tracking-wide mb-0.5">Notes</p>
              <p className="text-sm text-midnight-ink whitespace-pre-wrap">{member.notes}</p>
            </div>
          )}
          {!member.active && (
            <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
              Inactive
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Hierarchy Tier Section (extracted to avoid hooks-in-loop) ─── */
const HIERARCHY_TIERS = [
  {
    key: 'senior',
    label: 'Senior Management',
    subtitle: 'C-Level / Department Heads',
    icon: null,
    color: 'bg-blue-400',
    textColor: 'text-white',
    lockColor: 'bg-blue-50 border-blue-100',
    designations: [
      'Chief Operating Officer (COO)',
      'Chief Financial Officer (CFO)',
      'Chief Marketing Officer (CMO)',
      'Head of Merchandising / Product Head',
      'HR Head',
    ],
  },
  {
    key: 'middle',
    label: 'Middle Management',
    subtitle: 'Managers & Department Leads',
    icon: null,
    color: 'bg-blue-500',
    textColor: 'text-white',
    lockColor: 'bg-blue-50 border-blue-100',
    designations: [
      'Store Manager / Retail Manager',
      'Production Manager',
      'Inventory Manager',
      'Sales Manager',
      'Digital Marketing Manager',
    ],
  },
  {
    key: 'supervisors',
    label: 'Supervisors / Team Leads',
    subtitle: 'Floor & Workshop Supervisors',
    icon: null,
    color: 'bg-blue-700',
    textColor: 'text-white',
    lockColor: 'bg-blue-50 border-blue-100',
    designations: [
      'Floor Supervisor (Retail)',
      'Workshop Supervisor',
      'Customer Support Lead',
    ],
  },
  {
    key: 'core',
    label: 'Core Workforce',
    subtitle: 'Primary Operations Staff',
    icon: null,
    color: 'bg-blue-800',
    textColor: 'text-white',
    lockColor: 'bg-blue-50 border-blue-100',
    designations: [
      'Sales Executive / Showroom Staff',
      'Karigar / Craftsman',
      'Inventory Staff',
      'Digital Team',
      'Customer Support Executive',
    ],
  },
  {
    key: 'entry',
    label: 'Entry-Level Roles',
    subtitle: 'Interns & Trainees',
    icon: null,
    color: 'bg-blue-950',
    textColor: 'text-white',
    lockColor: 'bg-blue-50 border-blue-100',
    designations: [
      'Intern - Marketing',
      'Intern - Operations',
      'Intern - Tech / Shopify',
      'Trainee - Sales',
      'Trainee - Production',
    ],
  },
];

// Tier rank: lower = more senior (used for lock logic based on Django role)
const TIER_RANK = {
  senior: 0,
  middle: 1,
  supervisors: 2,
  core: 3,
  entry: 4,
};

// Map Django user roles to a tier rank (admin = senior, manager = middle/supervisor, staff = core/entry)
function userRoleToTierRank(role) {
  if (role === 'admin') return 0;
  if (role === 'manager') return 2;
  return 3; // staff
}

function getDesignationTier(designation) {
  if (!designation) return 'core';
  const d = designation.toLowerCase();
  if (HIERARCHY_TIERS[0].designations.some(x => x.toLowerCase() === d)) return 'senior';
  if (HIERARCHY_TIERS[1].designations.some(x => x.toLowerCase() === d)) return 'middle';
  if (HIERARCHY_TIERS[2].designations.some(x => x.toLowerCase() === d)) return 'supervisors';
  if (HIERARCHY_TIERS[4].designations.some(x => x.toLowerCase() === d)) return 'entry';
  return 'core';
}

function TierSection({ tier, members, myTierRank, sessionUser, onSelectMember, onAssignJob }) {
  const [open, setOpen] = useState(true);
  const tierRank = TIER_RANK[tier.key];
  const isAbove = tierRank < myTierRank;

  return (
    <div className="rounded-xl border border-soft-border overflow-hidden shadow-sm">
      {/* tier header */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition
          ${isAbove ? 'bg-slate-100' : tier.color}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-bold uppercase tracking-widest ${isAbove ? 'text-slate-500' : tier.textColor}`}>
                {tier.label}
              </span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                ${isAbove ? 'bg-slate-200 text-slate-500' : 'bg-black/10 ' + tier.textColor}`}>
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </span>
              {isAbove && <Lock className="h-3 w-3 text-slate-400" />}
            </div>
            <p className={`text-[10px] mt-0.5 ${isAbove ? 'text-slate-400' : tier.textColor + ' opacity-70'}`}>{tier.subtitle}</p>
          </div>
        </div>
        {open
          ? <ChevronDown className={`h-4 w-4 shrink-0 ${isAbove ? 'text-slate-400' : tier.textColor}`} />
          : <ChevronRight className={`h-4 w-4 shrink-0 ${isAbove ? 'text-slate-400' : tier.textColor}`} />
        }
      </button>

      {/* members list */}
      {open && (
        <div className={`divide-y divide-soft-border ${isAbove ? tier.lockColor : 'bg-white'}`}>
          {members.length === 0 ? (
            <p className="px-5 py-4 text-xs text-cool-gray italic">No members in this tier yet.</p>
          ) : members.map(m => {
            const isSelf = m.email === sessionUser?.email;
            return (
              <div
                key={m.id}
                onClick={() => onSelectMember(m)}
                className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer transition
                  ${isSelf ? 'bg-trust-blue/5' : isAbove ? 'opacity-70' : 'hover:bg-cloud-gray'}`}
              >
                {/* avatar */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                  ${isSelf ? 'bg-trust-blue text-white' : isAbove ? 'bg-slate-200 text-slate-500' : 'bg-midnight-ink/10 text-midnight-ink'}`}>
                  {initials(m.full_name || m.email || '?')}
                </div>
                {/* info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-midnight-ink truncate">
                    {m.full_name || m.email || 'Unknown'}
                    {isSelf && <span className="ml-1.5 text-xs font-normal text-trust-blue">(You)</span>}
                  </p>
                  <p className="text-xs text-cool-gray truncate">
                    {m.designation || m.department || m.email || ''}
                  </p>
                </div>
                {/* actions */}
                <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                  {isAbove ? (
                    <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
                      <Lock className="h-2.5 w-2.5" /> Locked
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => onSelectMember(m)}
                        className="text-[10px] font-semibold text-trust-blue border border-trust-blue/40 rounded-full px-2.5 py-1 hover:bg-trust-blue hover:text-white transition">
                        Details
                      </button>
                      {!isSelf && (
                        <button
                          onClick={() => onAssignJob && onAssignJob(m)}
                          className="text-[10px] font-semibold text-white bg-midnight-ink rounded-full px-2.5 py-1 hover:bg-trust-blue transition flex items-center gap-1">
                          <Plus className="h-2.5 w-2.5" /> Job
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Hierarchy panel ────────────────────────────────── */
function HierarchyPanel({ sessionUser, allMembers, onAssignJob }) {
  const [selectedMember, setSelectedMember] = useState(null);
  const myTierRank = userRoleToTierRank(sessionUser?.role || 'staff');

  // Group all workforce members into their hierarchy tiers
  const tierMembers = {};
  HIERARCHY_TIERS.forEach(t => { tierMembers[t.key] = []; });

  allMembers.forEach(m => {
    const tk = getDesignationTier(m.designation);
    tierMembers[tk].push(m);
  });

  // Also put admin-role users who have no designation in senior tier
  // and manager-role users with no designation in middle tier
  allMembers.forEach(m => {
    if (!m.designation) {
      // already added to 'core' above by getDesignationTier, which returns 'core' for no designation
      // rebalance: move based on Django role if no designation
      const defaultTier = m.role === 'admin' ? 'senior' : m.role === 'manager' ? 'middle' : 'core';
      if (defaultTier !== 'core') {
        // remove from core, add to correct tier
        tierMembers['core'] = tierMembers['core'].filter(x => x.id !== m.id);
        if (!tierMembers[defaultTier].find(x => x.id === m.id)) {
          tierMembers[defaultTier].push(m);
        }
      }
    }
  });

  return (
    <div className="space-y-4">
      {/* legend */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-cool-gray bg-white rounded-xl border border-soft-border px-4 py-3">
        <span className="flex items-center gap-1.5"><Lock className="h-3 w-3" /> Locked = above your access level</span>
        <span className="flex items-center gap-1.5 text-trust-blue"><User className="h-3 w-3" /> Click any member to view details</span>
        <span className="flex items-center gap-1.5"><Plus className="h-3 w-3 text-midnight-ink" /> Assign job to members below you</span>
      </div>

      {HIERARCHY_TIERS.map(tier => (
        <TierSection
          key={tier.key}
          tier={tier}
          members={tierMembers[tier.key] || []}
          myTierRank={myTierRank}
          sessionUser={sessionUser}
          onSelectMember={setSelectedMember}
          onAssignJob={onAssignJob}
        />
      ))}

      {/* Member detail modal */}
      {selectedMember && (
        <MemberDetailModal member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}
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
  const [allMembers, setAllMembers]         = useState([]);
  const [loading, setLoading]               = useState(true);
  const [profilePhoto, setProfilePhoto]     = useState(null);
  const [activeTab, setActiveTab]           = useState('profile'); // 'profile' | 'hierarchy'

  const [isEditing, setIsEditing]   = useState(false);
  const [editData, setEditData]     = useState({});
  const [saving, setSaving]         = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  /* ── load ── */
  useEffect(() => {
    async function load() {
      try {
        const res    = await fetch('/api/auth/session', { cache: 'no-store' });
        const result = await res.json();
        if (!res.ok || !result.success) { router.replace('/login'); return; }

        const u = result.user;
        setSessionUser(u);

        // fetch all workforce members for hierarchy
        const allRes    = await fetch('/api/workforce?page_size=200', { cache: 'no-store' });
        const allResult = await allRes.json().catch(() => null);
        const rawList   = Array.isArray(allResult?.data) ? allResult.data
                        : Array.isArray(allResult?.data?.results) ? allResult.data.results
                        : Array.isArray(allResult?.results) ? allResult.results : [];

        setAllMembers(rawList);

        const email = u.email || '';
        if (email) {
          const match = rawList.find(m => (m.email || '').toLowerCase() === email.toLowerCase());
          if (match) setWorkforceMember(match);
        }

        const saved = localStorage.getItem(`profile_photo_${u.username}`);
        if (saved) setProfilePhoto(saved);
      } catch { router.replace('/login'); }
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
    reader.onload = ev => {
      const dataUrl = ev.target.result;
      setProfilePhoto(dataUrl);
      localStorage.setItem(`profile_photo_${sessionUser.username}`, dataUrl);
      window.dispatchEvent(new CustomEvent('profile_photo_updated', { detail: { photo: dataUrl } }));
    };
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setProfilePhoto(null);
    localStorage.removeItem(`profile_photo_${sessionUser.username}`);
    window.dispatchEvent(new CustomEvent('profile_photo_updated', { detail: { photo: null } }));
  }

  function startEdit() {
    if (!workforceMember) return;
    const wf = workforceMember;
    setEditData({
      full_name: wf.full_name || '', dob: wf.dob || '', gender: wf.gender || '',
      phone: wf.phone || '', whatsapp: wf.whatsapp || '', department: wf.department || '',
      designation: wf.designation || '',
      current_location: wf.current_location || '', first_language: wf.first_language || '',
      second_language: wf.second_language || '', gst_number: wf.gst_number || '', notes: wf.notes || '',
    });
    setIsEditing(true);
    setSaveMessage('');
  }

  function handleEditChange(name, value) { setEditData(prev => ({ ...prev, [name]: value })); }

  async function handleSave() {
    if (!workforceMember?.id) return;
    setSaving(true); setSaveMessage('');
    try {
      const res    = await fetch(`/api/workforce/${workforceMember.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editData),
      });
      const result = await res.json().catch(() => null);
      if (res.ok && result?.success) {
        setWorkforceMember(prev => ({ ...prev, ...editData }));
        setSaveMessage('Saved successfully!'); setIsEditing(false);
      } else { setSaveMessage(result?.message || 'Failed to save.'); }
    } catch { setSaveMessage('Network error. Please try again.'); }
    finally  { setSaving(false); }
  }

  function cancelEdit() { setIsEditing(false); setEditData({}); setSaveMessage(''); }

  /* ── assign job stub ── */
  function handleAssignJob(member) {
    router.push('/master-job-sheet');
  }

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
      <header className="w-full bg-midnight-ink flex items-center gap-4 px-6 py-0 h-14 shrink-0">
        <button onClick={() => router.push('/home')} className="text-white/60 hover:text-white transition shrink-0" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* avatar + name (left side) */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-8 h-8 rounded-full border-2 border-white/20 overflow-hidden cursor-pointer shrink-0"
            onClick={() => fileInputRef.current?.click()} title="Change photo"
          >
            {profilePhoto
              ? <img src={profilePhoto} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-trust-blue flex items-center justify-center text-white text-xs font-bold">{getInitials()}</div>
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

        {/* right: role badge */}
        <div className="shrink-0">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${ROLE_COLORS[sessionUser?.role] || ROLE_COLORS.staff}`}>
            {ROLE_LABELS[sessionUser?.role] || 'Staff'}
          </span>
        </div>

        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handlePhotoChange} />
      </header>

      {/* ══ Full-width dark profile hero ══ */}
      <div className="w-full bg-midnight-ink border-b border-white/10 relative overflow-hidden">
        <div className="relative w-full px-6 md:px-12 py-6 flex flex-col md:flex-row items-center md:items-end gap-5">

          {/* big avatar */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-full border-4 border-white/20 overflow-hidden cursor-pointer shadow-xl"
              onClick={() => fileInputRef.current?.click()} title="Click to change photo">
              {profilePhoto
                ? <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-trust-blue flex items-center justify-center text-white text-3xl font-bold">{getInitials()}</div>
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

        {/* ── Tab bar ── */}
        <div className="w-full px-6 md:px-12 flex gap-0 border-t border-white/10">
          {[
            { key: 'profile',   label: 'Profile',          icon: User },
            { key: 'hierarchy', label: 'Company Hierarchy', icon: GitFork },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition
                ${activeTab === tab.key
                  ? 'border-trust-blue text-white'
                  : 'border-transparent text-white/40 hover:text-white/70'}`}>
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ Body ══ */}
      <div className="flex-1 w-full px-4 md:px-8 lg:px-12 py-6">

        {/* save message */}
        {saveMessage && (
          <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium max-w-3xl
            ${saveMessage.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {saveMessage}
          </div>
        )}

        {/* ─── PROFILE TAB ─── */}
        {activeTab === 'profile' && (
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
                  <p className="text-[11px] text-cool-gray pt-1">Managed by administrator.</p>
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
                    <FieldRow label="Location" value={wf?.current_location} />
                    <FieldRow label="GST" value={wf?.gst_number} />
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT main — detail sections */}
            <div className="lg:col-span-2 space-y-0">

              <SectionCard icon={User} title="Personal Information">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <EditableField label="Full Name"     name="full_name" value={wf?.full_name} editValue={editData.full_name} isEditing={isEditing} onChange={handleEditChange} />
                  <EditableField label="Date of Birth" name="dob"       type="date" value={wf?.dob} editValue={editData.dob} isEditing={isEditing} onChange={handleEditChange} />
                  <EditableField label="Gender"        name="gender"    value={wf?.gender} editValue={editData.gender} isEditing={isEditing} onChange={handleEditChange} />
                  <FieldRow      label="Email Address" value={sessionUser?.email || wf?.email} />
                </div>
              </SectionCard>

              <SectionCard icon={Phone} title="Contact Details">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <EditableField label="Contact Number" name="phone"    value={wf?.phone}    editValue={editData.phone}    isEditing={isEditing} onChange={handleEditChange} />
                  <EditableField label="WhatsApp"       name="whatsapp" value={wf?.whatsapp} editValue={editData.whatsapp} isEditing={isEditing} onChange={handleEditChange} />
                </div>
              </SectionCard>

              <SectionCard icon={Briefcase} title="Work Details">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <EditableField label="Designation"      name="designation"      value={wf?.designation}      editValue={editData.designation}      isEditing={isEditing} onChange={handleEditChange} />
                  <EditableField label="Department"       name="department"       value={wf?.department}       editValue={editData.department}       isEditing={isEditing} onChange={handleEditChange} />
                  <EditableField label="Current Location" name="current_location" value={wf?.current_location} editValue={editData.current_location} isEditing={isEditing} onChange={handleEditChange} />
                </div>
              </SectionCard>

              <SectionCard icon={MapPin} title="Current Address">
                <AddressBlock label="Address" addr={wf?.current_address} />
                {isEditing && <p className="text-xs text-cool-gray mt-2">Address edits require admin update.</p>}
              </SectionCard>

              <SectionCard icon={MapPin} title="Permanent Address">
                <AddressBlock label="Address" addr={wf?.permanent_address} />
              </SectionCard>

              <SectionCard icon={Globe} title="Languages & Other">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <EditableField label="First Language"  name="first_language"  value={wf?.first_language}  editValue={editData.first_language}  isEditing={isEditing} onChange={handleEditChange} />
                  <EditableField label="Second Language" name="second_language" value={wf?.second_language} editValue={editData.second_language} isEditing={isEditing} onChange={handleEditChange} />
                  <EditableField label="GST Number"      name="gst_number"      value={wf?.gst_number}      editValue={editData.gst_number}      isEditing={isEditing} onChange={handleEditChange} />
                </div>
              </SectionCard>

              <SectionCard icon={FileText} title="Notes">
                {isEditing ? (
                  <textarea rows={3} value={editData.notes ?? ''} onChange={e => handleEditChange('notes', e.target.value)}
                    className="w-full rounded-lg border border-soft-border px-3 py-2 text-sm text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue bg-cloud-gray resize-none" />
                ) : (
                  <p className="text-sm font-medium text-midnight-ink whitespace-pre-line">
                    {wf?.notes || <span className="text-cool-gray italic font-normal">No notes.</span>}
                  </p>
                )}
              </SectionCard>
            </div>
          </div>
        )}

        {/* ─── HIERARCHY TAB ─── */}
        {activeTab === 'hierarchy' && (
          <div className="max-w-3xl">
            <div className="mb-4">
              <h2 className="text-base font-bold text-midnight-ink">Company Hierarchy</h2>
              <p className="text-sm text-cool-gray mt-0.5">
                Levels above yours are <strong>locked</strong>. You can view profiles and assign jobs to levels at or below yours.
              </p>
            </div>
            <HierarchyPanel
              sessionUser={sessionUser}
              allMembers={allMembers}
              onAssignJob={handleAssignJob}
            />
          </div>
        )}
      </div>
    </div>
  );
}
