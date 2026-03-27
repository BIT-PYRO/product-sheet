'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera, ArrowLeft, User, Phone, MapPin,
  Briefcase, Globe, FileText, Pencil, Check, X, Shield,
  GitFork, Lock, ChevronDown, ChevronRight, UserCheck,
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

/* ─── Hierarchy node ─────────────────────────────────── */
function HierarchyNode({ member, isSelf, isAbove, canExpand, onViewProfile, onAssignJob, depth = 0 }) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = member.children && member.children.length > 0;

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l-2 border-soft-border pl-4 mt-2' : ''}`}>
      <div className={`relative flex items-center gap-3 rounded-xl px-4 py-3 border transition
        ${isSelf ? 'bg-trust-blue/10 border-trust-blue/40' : isAbove ? 'bg-cloud-gray border-soft-border opacity-80' : 'bg-white border-soft-border hover:border-trust-blue/40 hover:shadow-sm'}`}>

        {/* avatar */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0
          ${isSelf ? 'bg-trust-blue text-white' : isAbove ? 'bg-slate-300 text-slate-600' : 'bg-midnight-ink/10 text-midnight-ink'}`}>
          {initials(member.full_name || member.username)}
        </div>

        {/* info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-midnight-ink truncate">
              {member.full_name || member.username}
              {isSelf && <span className="ml-1.5 text-xs text-trust-blue font-normal">(You)</span>}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[member.role] || ROLE_COLORS.staff}`}>
              {ROLE_LABELS[member.role] || member.role}
            </span>
          </div>
          {member.department && <p className="text-xs text-cool-gray mt-0.5">{member.department}</p>}
        </div>

        {/* right actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isAbove ? (
            <span className="flex items-center gap-1 text-[10px] text-cool-gray bg-cloud-gray border border-soft-border rounded-full px-2 py-0.5">
              <Lock className="h-2.5 w-2.5" /> Locked
            </span>
          ) : !isSelf && (
            <>
              <button onClick={() => onViewProfile && onViewProfile(member)}
                className="text-[10px] font-semibold text-trust-blue border border-trust-blue/40 rounded-full px-2.5 py-0.5 hover:bg-trust-blue hover:text-white transition">
                View
              </button>
              <button onClick={() => onAssignJob && onAssignJob(member)}
                className="text-[10px] font-semibold text-white bg-midnight-ink border border-midnight-ink rounded-full px-2.5 py-0.5 hover:bg-trust-blue hover:border-trust-blue transition flex items-center gap-1">
                <Plus className="h-2.5 w-2.5" /> Job
              </button>
            </>
          )}
          {hasChildren && !isAbove && (
            <button onClick={() => setOpen(o => !o)} className="text-cool-gray hover:text-midnight-ink transition">
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* children */}
      {hasChildren && open && !isAbove && (
        member.children.map(child => (
          <HierarchyNode
            key={child.id || child.username}
            member={child}
            isSelf={child._isSelf}
            isAbove={false}
            canExpand={true}
            onViewProfile={onViewProfile}
            onAssignJob={onAssignJob}
            depth={depth + 1}
          />
        ))
      )}
    </div>
  );
}

/* ─── Hierarchy panel ────────────────────────────────── */
function HierarchyPanel({ sessionUser, allMembers, onAssignJob }) {
  const router = useRouter();
  const myRole = sessionUser?.role || 'staff';
  const myRank = ROLE_ORDER[myRole] ?? 2;

  // Group members by role rank
  const above  = allMembers.filter(m => (ROLE_ORDER[m.role] ?? 2) < myRank);
  const peers  = allMembers.filter(m => (ROLE_ORDER[m.role] ?? 2) === myRank && m.username !== sessionUser?.username);
  const below  = allMembers.filter(m => (ROLE_ORDER[m.role] ?? 2) > myRank);

  // Build a simple 3-tier tree: Admins > Managers > Staff
  const tiers = [
    { label: 'Admins',   role: 'admin',   members: allMembers.filter(m => m.role === 'admin') },
    { label: 'Managers', role: 'manager', members: allMembers.filter(m => m.role === 'manager') },
    { label: 'Staff',    role: 'staff',   members: allMembers.filter(m => m.role === 'staff') },
  ].filter(t => t.members.length > 0);

  function handleView(member) {
    router.push(`/master-workforce-sheet`);
  }

  return (
    <div className="space-y-4">
      {/* legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-cool-gray">
        <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Locked = above your level</span>
        <span className="flex items-center gap-1"><UserCheck className="h-3 w-3 text-trust-blue" /> You can assign jobs to levels below</span>
      </div>

      {tiers.map(tier => {
        const tierRank = ROLE_ORDER[tier.role] ?? 2;
        const isAboveTier = tierRank < myRank;
        const [tierOpen, setTierOpen] = useState(true);

        return (
          <div key={tier.role} className="rounded-xl border border-soft-border overflow-hidden">
            <button
              onClick={() => setTierOpen(o => !o)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left transition
                ${isAboveTier ? 'bg-slate-100' : 'bg-midnight-ink'}`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${ROLE_DOT[tier.role]}`} />
                <span className={`text-xs font-bold uppercase tracking-widest ${isAboveTier ? 'text-slate-500' : 'text-white'}`}>
                  {tier.label}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold
                  ${isAboveTier ? 'bg-slate-200 text-slate-500' : 'bg-white/20 text-white'}`}>
                  {tier.members.length}
                </span>
                {isAboveTier && <Lock className="h-3 w-3 text-slate-400" />}
              </div>
              {tierOpen ? <ChevronDown className={`h-4 w-4 ${isAboveTier ? 'text-slate-400' : 'text-white/60'}`} />
                        : <ChevronRight className={`h-4 w-4 ${isAboveTier ? 'text-slate-400' : 'text-white/60'}`} />}
            </button>

            {tierOpen && (
              <div className="divide-y divide-soft-border">
                {tier.members.map(m => {
                  const isSelf = m.username === sessionUser?.username;
                  return (
                    <div key={m.id || m.username}
                      className={`flex items-center gap-3 px-4 py-3 transition
                        ${isSelf ? 'bg-trust-blue/5' : isAboveTier ? 'bg-slate-50' : 'bg-white hover:bg-cloud-gray'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                        ${isSelf ? 'bg-trust-blue text-white' : isAboveTier ? 'bg-slate-200 text-slate-500' : 'bg-midnight-ink/10 text-midnight-ink'}`}>
                        {initials(m.full_name || m.username)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-midnight-ink truncate">
                          {m.full_name || m.username}
                          {isSelf && <span className="ml-1.5 text-xs font-normal text-trust-blue">(You)</span>}
                        </p>
                        <p className="text-xs text-cool-gray">{m.department || m.email || ''}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isAboveTier ? (
                          <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
                            <Lock className="h-2.5 w-2.5" /> Locked
                          </span>
                        ) : !isSelf && (
                          <>
                            <button
                              onClick={handleView}
                              className="text-[10px] font-semibold text-trust-blue border border-trust-blue/40 rounded-full px-2.5 py-0.5 hover:bg-trust-blue hover:text-white transition">
                              View
                            </button>
                            <button
                              onClick={() => onAssignJob && onAssignJob(m)}
                              className="text-[10px] font-semibold text-white bg-midnight-ink rounded-full px-2.5 py-0.5 hover:bg-trust-blue transition flex items-center gap-1">
                              <Plus className="h-2.5 w-2.5" /> Job
                            </button>
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
      })}
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
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 70% 50%, rgba(37,99,235,0.18) 0%, transparent 70%)' }} />
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
