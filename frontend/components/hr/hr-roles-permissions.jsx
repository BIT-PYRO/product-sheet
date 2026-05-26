'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Plus, Save, Copy, Trash2, Users, ChevronDown, ChevronRight,
  Shield, CheckCircle2, XCircle, Loader2, AlertCircle, RefreshCw,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const PERM_COLS = [
  { key: 'view',   label: 'View',     color: 'text-blue-400' },
  { key: 'edit',   label: 'Edit',     color: 'text-amber-400' },
  { key: 'create', label: 'Create',   color: 'text-emerald-400' },
  { key: 'export', label: 'Export',   color: 'text-purple-400' },
  { key: 'amount', label: 'Financial', color: 'text-rose-400' },
];

const DESIGNATION_ORDER = [
  'Intern', 'Associate', 'Manager', 'Department Head',
  'Director', 'CEO', 'Chairman', 'Superuser',
];

function emptyPerms() {
  return { view: false, edit: false, create: false, export: false, amount: false };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cascadePerms(p) {
  const r = { ...p };
  if (r.create) { r.edit = true; r.view = true; }
  if (r.edit)   { r.view = true; }
  return r;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ToggleCell({ checked, onChange, color, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${
        checked ? 'bg-trust-blue' : 'bg-[#334155]'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className={`fixed bottom-6 right-6 z-[200] flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-xl text-sm font-medium border ${
        type === 'success'
          ? 'bg-[#0f2b1b] border-emerald-700 text-emerald-300'
          : 'bg-[#2b0f0f] border-red-700 text-red-300'
      }`}
    >
      {type === 'success'
        ? <CheckCircle2 className="w-4 h-4 shrink-0" />
        : <XCircle className="w-4 h-4 shrink-0" />}
      {message}
    </div>
  );
}

// ─── New Custom Role Modal ─────────────────────────────────────────────────────

function NewRoleModal({ departments, onClose, onCreated }) {
  const [dept, setDept] = useState('');
  const [roleName, setRoleName] = useState('');
  const [cloneFrom, setCloneFrom] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!dept.trim() || !roleName.trim()) {
      setError('Department and Role Name are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/accounts/role-templates/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: roleName.trim(), department: dept.trim(), permissions: {} }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.message || 'Failed to create role.'); return; }
      onCreated(data?.data || data);
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
          <Plus className="w-5 h-5 text-trust-blue" />
          New Custom Role
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">Department *</label>
            <select
              value={dept}
              onChange={e => setDept(e.target.value)}
              className="w-full bg-[#1e293b] border border-[#334155] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-trust-blue"
            >
              <option value="">Select department…</option>
              {departments.map(d => (
                <option key={d.name} value={d.name}>{d.name}</option>
              ))}
              <option value="__custom__">Other / Custom</option>
            </select>
          </div>

          {dept === '__custom__' && (
            <div>
              <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">Custom Department Name *</label>
              <input
                type="text"
                placeholder="e.g. Quality Assurance"
                value={dept === '__custom__' ? '' : dept}
                onChange={e => setDept(e.target.value)}
                className="w-full bg-[#1e293b] border border-[#334155] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-trust-blue"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">Role / Designation Name *</label>
            <input
              type="text"
              placeholder="e.g. Senior Wax Specialist"
              value={roleName}
              onChange={e => setRoleName(e.target.value)}
              className="w-full bg-[#1e293b] border border-[#334155] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-trust-blue"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-[#334155] text-[#94a3b8] text-sm hover:bg-[#1e293b] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-trust-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Create Role
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Apply Confirmation Modal ──────────────────────────────────────────────────

function ApplyConfirmModal({ template, onClose, onConfirm, applying }) {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-[#1e3a5f] rounded-xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-base font-bold text-white">Apply to Members</h3>
            <p className="text-sm text-[#94a3b8] mt-1">
              This will overwrite individual permissions for <strong className="text-white">all active</strong>{' '}
              <span className="text-trust-blue">{template.role}</span>{template.department ? ` in ${template.department}` : ''} members.
            </p>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            disabled={applying}
            className="flex-1 py-2 rounded-lg border border-[#334155] text-[#94a3b8] text-sm hover:bg-[#1e293b] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={applying}
            className="flex-1 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {applying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Permission Matrix (right panel) ──────────────────────────────────────────

function PermissionMatrix({ template, modules, allModules, onSave, canEdit }) {
  const [perms, setPerms] = useState({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!template) return;
    const saved = (template.permissions?.sheets) || {};
    const merged = {};
    const relevantKeys = modules.map(m => m.key);
    // Include all modules that exist in saved perms (even if not in dept allocation)
    const allKeys = new Set([...relevantKeys, ...Object.keys(saved)]);
    allKeys.forEach(k => {
      merged[k] = saved[k] ? { ...emptyPerms(), ...saved[k] } : emptyPerms();
    });
    setPerms(merged);
    setDirty(false);
  }, [template, modules]);

  function toggle(moduleKey, permKey) {
    setPerms(prev => {
      const next = { ...prev, [moduleKey]: { ...(prev[moduleKey] || emptyPerms()) } };
      next[moduleKey][permKey] = !next[moduleKey][permKey];
      // Cascade
      next[moduleKey] = cascadePerms(next[moduleKey]);
      // my-desk always keeps view+edit
      if (moduleKey === 'my-desk') {
        next[moduleKey].view = true;
        next[moduleKey].edit = true;
      }
      return next;
    });
    setDirty(true);
  }

  function toggleAll(moduleKey) {
    setPerms(prev => {
      const cur = prev[moduleKey] || emptyPerms();
      const allOn = PERM_COLS.every(c => cur[c.key]);
      const next = { ...prev, [moduleKey]: PERM_COLS.reduce((acc, c) => ({ ...acc, [c.key]: !allOn }), {}) };
      if (!allOn && moduleKey === 'my-desk') {
        next[moduleKey].view = true;
        next[moduleKey].edit = true;
      }
      return next;
    });
    setDirty(true);
  }

  function handleSave() {
    const payload = {
      ...template.permissions,
      sheets: perms,
      manage_members: template.permissions?.manage_members || false,
    };
    onSave(template, payload);
    setDirty(false);
  }

  if (!template) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#475569] text-sm">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Select a role from the left panel to edit its permissions.</p>
        </div>
      </div>
    );
  }

  // Separate dept-allocated modules from others saved
  const deptKeys = new Set(modules.map(m => m.key));
  const extraKeys = Object.keys(perms).filter(k => !deptKeys.has(k));
  const moduleMap = Object.fromEntries(allModules.map(m => [m.key, m.label]));

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e293b] shrink-0">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-trust-blue" />
            {template.role}
            {template.department && (
              <span className="text-xs font-normal text-[#94a3b8]">· {template.department}</span>
            )}
          </h3>
          <p className="text-xs text-[#64748b] mt-0.5">
            {modules.length} module{modules.length !== 1 ? 's' : ''} allocated to this department
          </p>
        </div>
        {canEdit && (
          <button
            onClick={handleSave}
            disabled={!dirty}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-trust-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="w-3.5 h-3.5" />
            Save Role
          </button>
        )}
      </div>

      {/* manage_members toggle */}
      <div className="px-5 py-2.5 border-b border-[#1e293b] flex items-center justify-between shrink-0">
        <div>
          <span className="text-sm font-medium text-[#e2e8f0]">Manage Members</span>
          <p className="text-xs text-[#64748b]">Can assign/revoke permissions for team members</p>
        </div>
        <ToggleCell
          checked={!!template.permissions?.manage_members}
          disabled={!canEdit}
          onChange={v => {
            onSave(template, { ...template.permissions, sheets: perms, manage_members: v });
          }}
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#0d1b2e]">
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider w-48">
                Module
              </th>
              {PERM_COLS.map(c => (
                <th key={c.key} className="text-center px-3 py-2.5 text-xs font-semibold uppercase tracking-wider w-24">
                  <span className={c.color}>{c.label}</span>
                </th>
              ))}
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-[#475569] uppercase tracking-wider w-16">
                All
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Department modules */}
            {modules.map((mod, i) => {
              const p = perms[mod.key] || emptyPerms();
              const isMyDesk = mod.key === 'my-desk';
              const allOn = PERM_COLS.every(c => p[c.key]);
              return (
                <tr
                  key={mod.key}
                  className={`border-b border-[#1e293b] transition-colors ${
                    i % 2 === 0 ? 'bg-[#0f172a]' : 'bg-[#0d1521]'
                  } hover:bg-[#142035]`}
                >
                  <td className="px-5 py-2.5 text-[#e2e8f0] font-medium">
                    <span className="flex items-center gap-1.5">
                      {isMyDesk && <span className="text-xs bg-emerald-900/50 text-emerald-400 px-1.5 py-0.5 rounded font-normal">Always</span>}
                      {mod.label}
                    </span>
                  </td>
                  {PERM_COLS.map(c => (
                    <td key={c.key} className="text-center px-3 py-2.5">
                      <div className="flex justify-center">
                        <ToggleCell
                          checked={!!p[c.key]}
                          disabled={!canEdit || (isMyDesk && (c.key === 'view' || c.key === 'edit'))}
                          onChange={() => toggle(mod.key, c.key)}
                          color={c.color}
                        />
                      </div>
                    </td>
                  ))}
                  <td className="text-center px-3 py-2.5">
                    {canEdit && !isMyDesk && (
                      <button
                        onClick={() => toggleAll(mod.key)}
                        className={`text-xs px-2 py-0.5 rounded ${
                          allOn
                            ? 'bg-[#1e293b] text-[#94a3b8] hover:bg-[#273549]'
                            : 'bg-trust-blue/20 text-trust-blue hover:bg-trust-blue/30'
                        } transition-colors`}
                      >
                        {allOn ? 'Off' : 'All'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {/* Extra saved modules (not in dept allocation) */}
            {extraKeys.length > 0 && (
              <>
                <tr>
                  <td colSpan={PERM_COLS.length + 2} className="px-5 py-2 bg-[#0a1120]">
                    <span className="text-xs text-[#475569] font-semibold uppercase tracking-wider">
                      Other Saved Modules
                    </span>
                  </td>
                </tr>
                {extraKeys.map((key, i) => {
                  const p = perms[key] || emptyPerms();
                  const allOn = PERM_COLS.every(c => p[c.key]);
                  return (
                    <tr
                      key={key}
                      className={`border-b border-[#1e293b] opacity-70 ${
                        i % 2 === 0 ? 'bg-[#0f172a]' : 'bg-[#0d1521]'
                      }`}
                    >
                      <td className="px-5 py-2 text-[#94a3b8] text-sm">
                        {moduleMap[key] || key}
                      </td>
                      {PERM_COLS.map(c => (
                        <td key={c.key} className="text-center px-3 py-2">
                          <div className="flex justify-center">
                            <ToggleCell
                              checked={!!p[c.key]}
                              disabled={!canEdit}
                              onChange={() => toggle(key, c.key)}
                            />
                          </div>
                        </td>
                      ))}
                      <td className="text-center px-3 py-2">
                        {canEdit && (
                          <button
                            onClick={() => toggleAll(key)}
                            className={`text-xs px-2 py-0.5 rounded ${
                              allOn ? 'bg-[#1e293b] text-[#94a3b8]' : 'bg-trust-blue/20 text-trust-blue'
                            }`}
                          >
                            {allOn ? 'Off' : 'All'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HRRolesPermissions() {
  const [departments, setDepartments] = useState([]);
  const [allModules, setAllModules] = useState([]);
  const [templates, setTemplates] = useState([]);    // flat list of RoleDefaultPermissions
  const [grouped, setGrouped] = useState({});        // dept → [template]
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [expandedDepts, setExpandedDepts] = useState({});
  const [searchQ, setSearchQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyTarget, setApplyTarget] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [currentUserLevel, setCurrentUserLevel] = useState(-1);

  // ── Load meta (departments + modules) ────────────────────────────────────

  const loadMeta = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts/departments/', { cache: 'no-store' });
      const data = await res.json();
      if (data?.data) {
        setDepartments(data.data.departments || []);
        setAllModules(data.data.all_modules || []);
      }
    } catch { /* ignore */ }
  }, []);

  // ── Load templates ────────────────────────────────────────────────────────

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts/role-templates/', { cache: 'no-store' });
      const data = await res.json();
      if (data?.data) {
        setTemplates(data.data.flat || []);
        setGrouped(data.data.grouped || {});
      }
    } catch { /* ignore */ }
  }, []);

  // ── Check current user's edit capability ──────────────────────────────────

  const checkUserLevel = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      const data = await res.json();
      if (!data?.success) return;
      const u = data.user;
      if (u?.is_superuser || u?.role === 'admin') {
        setCanEdit(true);
        setCurrentUserLevel(99);
        return;
      }
      const email = (u?.email || '').toLowerCase();
      if (!email) return;
      const wfRes = await fetch(`/api/workforce-me?email=${encodeURIComponent(email)}`, { cache: 'no-store' });
      const wfData = await wfRes.json();
      const list = Array.isArray(wfData?.data) ? wfData.data
        : Array.isArray(wfData?.data?.results) ? wfData.data.results
        : Array.isArray(wfData?.results) ? wfData.results : [];
      const match = list.find(m => (m.email || '').toLowerCase() === email);
      if (!match) return;
      const DES_ORDER = ['Intern','Associate','Manager','Department Head','Director','CEO','Chairman','Superuser'];
      const lvl = DES_ORDER.indexOf(match.designation || '');
      setCurrentUserLevel(lvl);
      // Department Head (idx=3) and above can manage roles
      if (lvl >= 3 || match.permissions?.manage_members) setCanEdit(true);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadMeta(), loadTemplates(), checkUserLevel()])
      .finally(() => setLoading(false));
  }, [loadMeta, loadTemplates, checkUserLevel]);

  // ── Expand first dept by default ──────────────────────────────────────────

  useEffect(() => {
    const keys = Object.keys(grouped);
    if (keys.length && !Object.values(expandedDepts).some(Boolean)) {
      setExpandedDepts({ [keys[0]]: true });
    }
  }, [grouped]);

  // ── Filtered left panel ───────────────────────────────────────────────────

  const filteredGrouped = useMemo(() => {
    if (!searchQ.trim()) return grouped;
    const q = searchQ.toLowerCase();
    const result = {};
    Object.entries(grouped).forEach(([dept, roles]) => {
      const filtered = roles.filter(
        r => r.role.toLowerCase().includes(q) || dept.toLowerCase().includes(q)
      );
      if (filtered.length) result[dept] = filtered;
    });
    return result;
  }, [grouped, searchQ]);

  // ── Dept modules for selected template ────────────────────────────────────

  const selectedDeptModules = useMemo(() => {
    if (!selectedTemplate) return [];
    const dept = departments.find(d => d.name === selectedTemplate.department);
    return dept?.modules || [];
  }, [selectedTemplate, departments]);

  // ── Save handler ──────────────────────────────────────────────────────────

  async function handleSave(template, permissionsPayload) {
    setSaving(true);
    try {
      const res = await fetch(`/api/accounts/role-templates/${template.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: permissionsPayload }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data?.message || 'Save failed.', 'error'); return; }
      showToast(`Saved: ${template.role}${data?.data?.synced != null ? ` · ${data.data.synced} member(s) synced` : ''}`);
      await loadTemplates();
      // Re-select updated template
      setSelectedTemplate(prev => prev?.id === template.id
        ? { ...prev, permissions: permissionsPayload }
        : prev
      );
    } catch {
      showToast('Network error.', 'error');
    } finally {
      setSaving(false);
    }
  }

  // ── Apply handler ─────────────────────────────────────────────────────────

  async function handleApply() {
    if (!applyTarget) return;
    setApplying(true);
    try {
      const res = await fetch(`/api/accounts/role-templates/${applyTarget.id}/apply/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) { showToast(data?.message || 'Apply failed.', 'error'); return; }
      showToast(`Applied to ${data?.data?.synced ?? 0} member(s).`);
    } catch {
      showToast('Network error.', 'error');
    } finally {
      setApplying(false);
      setApplyTarget(null);
    }
  }

  // ── Clone handler ─────────────────────────────────────────────────────────

  async function handleClone(template) {
    const newRole = window.prompt(`Clone "${template.role}" as new role name:`);
    if (!newRole?.trim()) return;
    try {
      const res = await fetch(`/api/accounts/role-templates/${template.id}/clone/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_role: newRole.trim(), new_department: template.department }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data?.message || 'Clone failed.', 'error'); return; }
      showToast(`Cloned → ${newRole}`);
      await loadTemplates();
    } catch {
      showToast('Network error.', 'error');
    }
  }

  // ── Delete handler ────────────────────────────────────────────────────────

  async function handleDelete(template) {
    if (!window.confirm(`Delete role template "${template.role}" (${template.department})?`)) return;
    try {
      const res = await fetch(`/api/accounts/role-templates/${template.id}/`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { showToast(data?.message || 'Delete failed.', 'error'); return; }
      showToast(`Deleted: ${template.role}`);
      if (selectedTemplate?.id === template.id) setSelectedTemplate(null);
      await loadTemplates();
    } catch {
      showToast('Network error.', 'error');
    }
  }

  // ── Seed handler ──────────────────────────────────────────────────────────

  async function handleSeed() {
    if (!window.confirm('This will seed/reset default permissions for all standard combinations. Continue?')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/accounts/role-templates/seed/', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (!res.ok) { showToast(data?.message || 'Seed failed.', 'error'); return; }
      showToast(`Seeded: ${data?.data?.created} created, ${data?.data?.updated} updated.`);
      await loadTemplates();
    } catch {
      showToast('Network error.', 'error');
    } finally {
      setSaving(false);
    }
  }

  function showToast(message, type = 'success') {
    setToast({ message, type });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-trust-blue" />
      </div>
    );
  }

  const deptKeys = Object.keys(filteredGrouped).sort();

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a1120]">
      {/* Top Bar */}
      <div className="shrink-0 px-5 py-3 border-b border-[#1e293b] flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-trust-blue" />
          <h2 className="text-base font-bold text-white">Roles &amp; Permissions</h2>
          <span className="text-xs bg-[#1e293b] text-[#64748b] px-2 py-0.5 rounded-full">
            {templates.length} role{templates.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#475569]" />
            <input
              type="text"
              placeholder="Search roles…"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-[#1e293b] border border-[#334155] text-white text-sm rounded-lg w-44 focus:outline-none focus:border-trust-blue placeholder-[#475569]"
            />
          </div>
          {/* Refresh */}
          <button
            onClick={() => { setLoading(true); Promise.all([loadMeta(), loadTemplates()]).finally(() => setLoading(false)); }}
            className="p-1.5 rounded-lg border border-[#334155] text-[#64748b] hover:text-white hover:bg-[#1e293b] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {/* Seed (superuser only) */}
          {currentUserLevel >= 6 && (
            <button
              onClick={handleSeed}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg border border-amber-700/50 text-amber-400 text-xs hover:bg-amber-900/20 transition-colors"
            >
              Seed Defaults
            </button>
          )}
          {/* New Custom Role */}
          {canEdit && (
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-trust-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> New Custom Role
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {/* ── Left Panel: Saved Roles ── */}
        <div className="w-64 shrink-0 border-r border-[#1e293b] flex flex-col min-h-0">
          <div className="px-3 py-2 border-b border-[#1e293b]">
            <p className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Saved Roles</p>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {deptKeys.length === 0 && (
              <p className="text-xs text-[#475569] text-center mt-8 px-4">
                {searchQ ? 'No roles match your search.' : 'No role templates yet. Click "New Custom Role" or seed defaults.'}
              </p>
            )}
            {deptKeys.map(dept => {
              const roles = filteredGrouped[dept] || [];
              const isExpanded = expandedDepts[dept] ?? false;
              // Sort by hierarchy level
              const sorted = [...roles].sort((a, b) => {
                const li = DESIGNATION_ORDER.indexOf(a.role);
                const lj = DESIGNATION_ORDER.indexOf(b.role);
                if (li === -1 && lj === -1) return a.role.localeCompare(b.role);
                if (li === -1) return 1;
                if (lj === -1) return -1;
                return li - lj;
              });
              return (
                <div key={dept}>
                  {/* Department header */}
                  <button
                    onClick={() => setExpandedDepts(p => ({ ...p, [dept]: !p[dept] }))}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[#0f1e30] transition-colors"
                  >
                    <span className="text-xs font-semibold text-[#94a3b8] truncate">{dept}</span>
                    <span className="flex items-center gap-1 text-[#475569]">
                      <span className="text-xs">{sorted.length}</span>
                      {isExpanded
                        ? <ChevronDown className="w-3 h-3" />
                        : <ChevronRight className="w-3 h-3" />}
                    </span>
                  </button>
                  {/* Roles */}
                  {isExpanded && sorted.map(tmpl => {
                    const isSelected = selectedTemplate?.id === tmpl.id;
                    return (
                      <div
                        key={tmpl.id}
                        className={`group flex items-center justify-between px-4 py-1.5 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-trust-blue/15 border-r-2 border-trust-blue'
                            : 'hover:bg-[#0f1e30]'
                        }`}
                        onClick={() => setSelectedTemplate(tmpl)}
                      >
                        <div className="min-w-0">
                          <p className={`text-sm truncate ${isSelected ? 'text-white font-medium' : 'text-[#cbd5e1]'}`}>
                            {tmpl.role}
                          </p>
                          {!tmpl.is_standard && (
                            <p className="text-xs text-trust-blue/70">custom</p>
                          )}
                        </div>
                        {canEdit && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                            <button
                              onClick={e => { e.stopPropagation(); handleClone(tmpl); }}
                              className="p-1 rounded hover:bg-[#1e3a5f] text-[#64748b] hover:text-white"
                              title="Clone role"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            {!['CEO','Chairman','Superuser'].includes(tmpl.role) && (
                              <button
                                onClick={e => { e.stopPropagation(); handleDelete(tmpl); }}
                                className="p-1 rounded hover:bg-red-900/40 text-[#64748b] hover:text-red-400"
                                title="Delete role"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right Panel: Permissions ── */}
        <div className="flex-1 flex flex-col min-h-0">
          {selectedTemplate && canEdit && (
            <div className="shrink-0 px-5 py-2 border-b border-[#1e293b] flex items-center justify-end gap-2">
              <button
                onClick={() => setApplyTarget(selectedTemplate)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-700/50 text-amber-400 text-xs hover:bg-amber-900/20 transition-colors"
              >
                <Users className="w-3.5 h-3.5" />
                Apply to Members
              </button>
            </div>
          )}
          <PermissionMatrix
            template={selectedTemplate}
            modules={selectedDeptModules}
            allModules={allModules}
            onSave={handleSave}
            canEdit={canEdit}
          />
        </div>
      </div>

      {/* Modals */}
      {showNewModal && (
        <NewRoleModal
          departments={departments}
          onClose={() => setShowNewModal(false)}
          onCreated={async () => {
            setShowNewModal(false);
            showToast('Custom role created.');
            await loadTemplates();
          }}
        />
      )}

      {applyTarget && (
        <ApplyConfirmModal
          template={applyTarget}
          applying={applying}
          onClose={() => setApplyTarget(null)}
          onConfirm={handleApply}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
