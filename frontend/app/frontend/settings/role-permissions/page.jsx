'use client';
import { useState, useEffect } from 'react';
import { Shield, Settings, Save, Trash2, Plus, ChevronRight, Info, Lock, Star, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

const APP_MODULES = [
  {
    id: 'products_inventory',
    name: 'Products & Inventory',
    pages: [
      { id: 'product_sheet', name: 'Product Sheet' },
      { id: 'master_product_sheet', name: 'Master Product Sheet' },
      { id: 'master_inventory_sheet', name: 'Master Inventory Sheet' },
      { id: 'inventory', name: 'Inventory' }
    ]
  },
  {
    id: 'design_findings',
    name: 'Design & Findings',
    pages: [
      { id: 'designer_sheet', name: 'Designer Sheet' },
      { id: 'master_designer_sheet', name: 'Master Designer Sheet' },
      { id: 'finding_entry', name: 'Finding Sheet' },
      { id: 'finding_sheet', name: 'Master Finding Sheet' }
    ]
  },
  {
    id: 'jobs_orders',
    name: 'Jobs & Orders',
    pages: [
      { id: 'create_generic_job', name: 'Create Generic Job' },
      { id: 'master_job_sheet', name: 'Master Job Sheet' },
      { id: 'orders', name: 'Orders' },
      { id: 'drafts', name: 'Drafts' }
    ]
  },
  {
    id: 'customers_kyc',
    name: 'Customers & KYC',
    pages: [
      { id: 'enrol_customer', name: 'Enroll Customer' },
      { id: 'master_customer_sheet', name: 'Master Customer Sheet' },
      { id: 'master_kyc_sheet', name: 'Master KYC Sheet' }
    ]
  },
  {
    id: 'human_resources',
    name: 'Human Resources',
    pages: [
      { id: 'team_directory', name: 'Team Directory' },
      { id: 'enrol_workforce', name: 'Enroll Workforce' },
      { id: 'master_workforce_sheet', name: 'Master Workforce Sheet' },
      { id: 'master_task_manager', name: 'Master Task Manager' },
      { id: 'meeting_manager', name: 'Meeting Manager' },
      { id: 'attendance_dashboard', name: 'Attendance Dashboard' },
      { id: 'leave_requests', name: 'Leave Requests' },
      { id: 'org_hierarchy', name: 'Org Hierarchy' },
      { id: 'roles_permissions', name: 'Roles & Permissions' },
      { id: 'diary', name: 'Diary' }
    ]
  },
  {
    id: 'finance_accountancy',
    name: 'Accountancy & Finance',
    pages: [
      { id: 'payroll', name: 'Payroll' },
      { id: 'expenses', name: 'Expenses' },
      { id: 'dept_expenses', name: 'Dept Expenses' },
      { id: 'accounts_payable', name: 'Accounts Payable' },
      { id: 'accounts_receivable', name: 'Accounts Receivable' },
      { id: 'invoices', name: 'Invoices' },
      { id: 'purchase_bills', name: 'Purchase Bills' },
      { id: 'profit_loss', name: 'Profit & Loss' },
      { id: 'finance_dashboard', name: 'Finance Dashboard' }
    ]
  },
  {
    id: 'workspace',
    name: 'Workspace',
    pages: [
      { id: 'my_desk', name: 'My Desk' },
      { id: 'managers_dashboard', name: 'Managers Dashboard' }
    ]
  }
];

const AVAILABLE_ACTIONS = [
  { id: 'view', label: 'View', description: 'Can read data and view this module.' },
  { id: 'create', label: 'Create', description: 'Can create new records in this module.' },
  { id: 'edit', label: 'Edit', description: 'Can modify existing data within this module.' },
  { id: 'delete', label: 'Delete', description: 'Can permanently delete records from this module.' },
  { id: 'view_amounts', label: 'View Amounts', description: 'Can view financial values and prices on this page.' },
  { id: 'export', label: 'Export', description: 'Can download or export data from this page.' }
];

export default function RolePermissionsPage() {
  const router = useRouter();
  const [roleName, setRoleName] = useState('');
  const [activeModule, setActiveModule] = useState(APP_MODULES[0].id);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [savedRoles, setSavedRoles] = useState([]);
  
  const [permissions, setPermissions] = useState({});
  const [toast, setToast] = useState({ open: false, message: '', type: 'success' });
  const [saving, setSaving] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(true);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/roles');
      if (res.ok) {
        const data = await res.json();
        setSavedRoles(data.roles || []);
      }
    } catch (err) {
      console.error("Failed to fetch roles:", err);
    } finally {
      setLoadingRoles(false);
    }
  };

  const selectedRole = savedRoles.find(r => r.id === selectedRoleId);
  const isSystemRole = selectedRole?.is_system === true;

  const handleSelectRole = (role) => {
    if (selectedRoleId === role.id) {
      setSelectedRoleId(null);
      setRoleName('');
      setPermissions({});
      return;
    }

    setSelectedRoleId(role.id);
    setRoleName(role.name);
    const newPerms = {};
    (role.permissions || []).forEach(p => {
      newPerms[p] = true;
    });
    setPermissions(newPerms);
  };

  const handleToggle = (moduleId, pageId, actionId) => {
    if (isSystemRole) return;
    const key = `${moduleId}:${pageId}:${actionId}`;
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const generatePayload = () => {
    return Object.keys(permissions).filter(key => permissions[key]);
  };

  const showToast = (message, type = 'success') => {
    setToast({ open: true, message, type });
    setTimeout(() => setToast({ open: false, message: '', type: 'success' }), 4000);
  };

  const handleSaveRole = async () => {
    if (!roleName.trim()) {
      showToast('Please enter a Role Name.', 'error');
      return;
    }

    const payloadArray = generatePayload();
    if (payloadArray.length === 0) {
      showToast('Please select at least one permission.', 'error');
      return;
    }

    setSaving(true);
    try {
      const url = selectedRoleId ? `/api/roles/${selectedRoleId}` : `/api/roles`;
      const method = selectedRoleId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roleName, permissions: payloadArray })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save role");

      showToast(selectedRoleId ? `Role '${roleName}' updated!` : `Role '${roleName}' created!`, 'success');

      if (!selectedRoleId) {
        setRoleName('');
        setPermissions({});
      }
      fetchRoles();
    } catch (err) {
      showToast(err.message || 'Error saving role', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm("Are you sure you want to delete this role?")) return;

    try {
      const res = await fetch(`/api/roles/${roleId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        showToast("Role deleted successfully.", "success");
        if (selectedRoleId === roleId) {
          setSelectedRoleId(null);
          setRoleName('');
          setPermissions({});
        }
        fetchRoles();
      } else {
        const data = await res.json();
        showToast(data.error || "Error deleting role.", "error");
      }
    } catch (err) {
      showToast("Error deleting role.", "error");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full bg-[#f8fafc] overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between p-4 px-6 bg-white border-b border-soft-border shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-trust-blue text-white p-2 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-midnight-ink">Roles & Permissions</h1>
            <span className="text-[10px] font-bold text-cool-gray block -mt-0.5 tracking-wider uppercase">MANAGE USER ACCESS LEVELS</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="absolute -top-2 left-2 bg-white px-1 text-[10px] text-cool-gray font-medium z-10">Role Name</span>
            <input
              type="text"
              value={roleName}
              onChange={e => setRoleName(e.target.value)}
              disabled={isSystemRole}
              placeholder="e.g. Fulfillment Manager"
              className={`w-72 h-9 px-3 text-sm font-semibold text-midnight-ink border rounded-md focus:outline-none focus:ring-1 focus:ring-trust-blue ${isSystemRole ? 'bg-[#fef3c7] border-[#f59e0b]' : 'bg-[#f1f5f9] border-soft-border'}`}
            />
          </div>

          {isSystemRole && (
            <div className="flex items-center gap-1.5 bg-[#fef3c7] border border-[#f59e0b] px-3 py-1.5 rounded-md">
              <Star className="w-4 h-4 text-[#f59e0b] fill-current" />
              <span className="text-[11px] font-bold text-[#92400e]">SYSTEM ROLE</span>
            </div>
          )}

          <div className="h-6 w-px bg-soft-border"></div>

          {selectedRoleId && !isSystemRole && (
            <button
              onClick={() => handleDeleteRole(selectedRoleId)}
              className="flex items-center gap-2 text-red-500 hover:text-red-600 font-bold text-sm px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}

          <button
            onClick={handleSaveRole}
            disabled={saving || isSystemRole}
            className="flex items-center gap-2 bg-trust-blue hover:bg-trust-blue-hover text-white font-bold text-sm px-5 py-2 rounded-md shadow-sm transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {selectedRoleId ? 'Update Role' : 'Create Role'}
          </button>
        </div>
      </div>

      {/* Main Content: 3 Columns */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        
        {/* Left Col: Saved Roles */}
        <div className="w-[280px] flex flex-col bg-white border-r border-soft-border shrink-0">
          <div className="p-4 border-b border-soft-border bg-[#f8fafc] shrink-0">
            <h2 className="text-xs font-black text-cool-gray tracking-[0.05em] uppercase">SAVED ROLES</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            <button
              onClick={() => { setSelectedRoleId(null); setRoleName(''); setPermissions({}); }}
              className={`w-full flex items-center p-3 rounded-xl transition-colors ${!selectedRoleId ? 'bg-trust-blue/10' : 'hover:bg-cloud-gray'}`}
            >
              <Plus className={`w-5 h-5 mr-3 ${!selectedRoleId ? 'text-trust-blue' : 'text-cool-gray'}`} />
              <span className={`text-sm font-bold ${!selectedRoleId ? 'text-trust-blue' : 'text-midnight-ink'}`}>New Custom Role</span>
            </button>
            <div className="h-px bg-soft-border my-2"></div>

            {loadingRoles ? (
              <div className="p-4 text-center">
                <div className="w-6 h-6 border-2 border-trust-blue/30 border-t-trust-blue rounded-full animate-spin mx-auto" />
              </div>
            ) : (
              savedRoles.map(role => (
                <button
                  key={role.id}
                  onClick={() => handleSelectRole(role)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                    selectedRoleId === role.id 
                      ? (role.is_system ? 'bg-[#fef3c7]/60' : 'bg-trust-blue/10')
                      : (role.is_system ? 'bg-[#fef3c7]/20 border border-[#f59e0b]/30' : 'hover:bg-cloud-gray')
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {role.is_system ? (
                      <ShieldCheck className={`w-5 h-5 ${selectedRoleId === role.id ? 'text-[#f59e0b]' : 'text-[#f59e0b]'}`} />
                    ) : (
                      <Shield className={`w-5 h-5 ${selectedRoleId === role.id ? 'text-trust-blue' : 'text-cool-gray'}`} />
                    )}
                    <div className="flex flex-col items-start">
                      <span className={`text-[13px] ${selectedRoleId === role.id ? 'font-black' : 'font-bold'} ${role.is_system ? 'text-midnight-ink' : 'text-midnight-ink'}`}>
                        {role.name}
                      </span>
                      {role.is_system && (
                        <span className="text-[10px] font-bold text-[#f59e0b]">Full Access</span>
                      )}
                    </div>
                  </div>
                  {role.is_system && <Star className="w-4 h-4 text-[#f59e0b] fill-current" />}
                  {selectedRoleId === role.id && !role.is_system && <ChevronRight className="w-4 h-4 text-trust-blue" />}
                  {selectedRoleId === role.id && role.is_system && <ChevronRight className="w-4 h-4 text-[#f59e0b]" />}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Middle Col: Modules Selection */}
        <div className="w-[320px] flex flex-col bg-[#f1f5f9] border-r border-soft-border shrink-0">
          <div className="p-4 border-b border-soft-border bg-[#e2e8f0] shrink-0">
            <h2 className="text-xs font-black text-cool-gray tracking-[0.05em] uppercase">APPLICATION MODULES</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {APP_MODULES.map((module) => {
              const isActive = activeModule === module.id;
              const activeCount = Object.keys(permissions).filter(key => key.startsWith(`${module.id}:`) && permissions[key]).length;

              return (
                <button
                  key={module.id}
                  onClick={() => setActiveModule(module.id)}
                  className={`w-full flex items-center justify-between py-4 px-5 rounded-2xl transition-all duration-200 ${
                    isActive ? 'bg-white shadow-sm' : 'hover:bg-cloud-gray/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full transition-colors ${isActive ? 'bg-trust-blue' : 'bg-transparent'}`} />
                    <span className={`text-[14px] ${isActive ? 'font-black text-midnight-ink' : 'font-bold text-cool-gray'}`}>
                      {module.name}
                    </span>
                  </div>
                  {activeCount > 0 && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${isActive ? 'bg-trust-blue text-white' : 'bg-[#cbd5e1] text-white'}`}>
                      {activeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Col: Permissions Grid */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          <div className="p-6 pb-4 shrink-0">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-black text-midnight-ink">
                {APP_MODULES.find(m => m.id === activeModule)?.name}
              </h2>
              <span className="bg-trust-blue/10 text-trust-blue px-3 py-1 rounded-lg text-xs font-black">
                {APP_MODULES.find(m => m.id === activeModule)?.pages.length} PAGES
              </span>
            </div>
            <p className="text-[13px] font-semibold text-cool-gray">
              Toggle individual permissions for each sub-page within this module.
            </p>
          </div>

          <div className="flex-1 flex flex-col p-6 pt-0 min-h-0">
            <div className="flex-1 flex flex-col border border-soft-border rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-auto flex-1">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="bg-[#f8fafc] sticky top-0 z-10 border-b-2 border-soft-border shadow-sm">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-midnight-ink">PAGE / SECTION</th>
                      {AVAILABLE_ACTIONS.map(action => (
                        <th key={action.id} className="px-4 py-4 text-xs font-black text-midnight-ink text-center">
                          <div className="flex items-center justify-center gap-1.5 group relative cursor-help">
                            {action.label}
                            <Info className="w-3.5 h-3.5 text-cool-gray" />
                            {/* Simple tooltip simulation */}
                            <div className="absolute hidden group-hover:block bottom-full mb-2 bg-midnight-ink text-white text-[10px] px-2 py-1 rounded w-32 left-1/2 -translate-x-1/2 z-20 whitespace-normal text-center">
                              {action.description}
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {APP_MODULES.find(m => m.id === activeModule)?.pages.map((page, idx) => (
                      <tr key={page.id} className="border-b border-soft-border hover:bg-trust-blue/5 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-midnight-ink">
                          {page.name}
                        </td>
                        {AVAILABLE_ACTIONS.map(action => {
                          const isChecked = permissions[`${activeModule}:${page.id}:${action.id}`] || false;
                          return (
                            <td key={action.id} className="px-4 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggle(activeModule, page.id, action.id)}
                                disabled={isSystemRole}
                                className="w-4 h-4 rounded border-soft-border text-trust-blue focus:ring-trust-blue disabled:opacity-50 cursor-pointer disabled:cursor-default"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 p-4 bg-[#fef3c7]/30 border border-dashed border-[#f59e0b] rounded-2xl flex items-center gap-4 shrink-0">
              <div className="text-[#f59e0b] bg-[#f59e0b]/10 p-2 rounded-xl">
                <Lock className="w-5 h-5" />
              </div>
              <p className="text-[13px] font-semibold text-[#92400e]">
                <strong className="font-black">Security Tip:</strong> Least privilege approach is recommended. Only grant the specific permissions required for the user to perform their specific role tasks.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast.open && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg border text-sm font-bold z-50 flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
