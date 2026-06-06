'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, ShieldAlert, CheckCircle, XCircle, AlertCircle, RefreshCcw } from 'lucide-react';
import Link from 'next/link';

export default function TenantDetailWorkspace() {
    const params = useParams();
    const router = useRouter();
    const tenantId = params.tenantId;

    const [tenant, setTenant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    const [actionReason, setActionReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const fetchTenant = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/platform/tenants/${tenantId}/`);
            if (!res.ok) {
                if (res.status === 404) throw new Error('Tenant not found');
                throw new Error('Failed to fetch tenant details');
            }
            const data = await res.json();
            setTenant(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTenant();
    }, [tenantId]);

    const handleAction = async (actionType) => {
        if (!actionReason.trim()) {
            alert('A reason is mandatory for administrative actions.');
            return;
        }

        if (!confirm(`Are you sure you want to ${actionType.replace('_', ' ')} this tenant?`)) return;

        setActionLoading(true);
        try {
            const res = await fetch(`/api/v1/platform/tenants/${tenantId}/action/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: actionType, reason: actionReason })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Action failed');
            
            alert(data.message);
            setActionReason('');
            fetchTenant();
        } catch (err) {
            alert(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className="animate-pulse space-y-4"><div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div><div className="h-64 bg-slate-200 dark:bg-slate-800 rounded"></div></div>;
    if (error) return <div className="text-red-500"><AlertCircle className="inline w-5 h-5 mr-2"/>{error}</div>;
    if (!tenant) return null;

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'users', label: 'Users' },
        { id: 'subscription', label: 'Subscription' },
        { id: 'features', label: 'Features' },
        { id: 'usage', label: 'Usage' },
        { id: 'branding', label: 'Branding' },
        { id: 'audit', label: 'Audit Logs' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <Link href="/platform/tenants" className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center mb-4 transition">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Tenants
                </Link>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{tenant.overview.name}</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Tenant ID: {tenant.overview.id} • Slug: {tenant.overview.slug}</p>
                    </div>
                    <div className="flex gap-2">
                        {tenant.overview.status === 'suspended' ? (
                            <button onClick={() => handleAction('reactivate')} disabled={actionLoading} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition disabled:opacity-50">
                                Reactivate Tenant
                            </button>
                        ) : (
                            <button onClick={() => handleAction('suspend')} disabled={actionLoading} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm font-medium transition disabled:opacity-50">
                                Suspend Tenant
                            </button>
                        )}
                        <button onClick={() => handleAction('cancel_subscription')} disabled={actionLoading} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition disabled:opacity-50">
                            Cancel Subscription
                        </button>
                    </div>
                </div>
            </div>

            {/* Action Reason Input */}
            <div className="bg-slate-100 dark:bg-[#1A1A1A] p-4 rounded-lg border border-slate-200 dark:border-white/10">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Mandatory Reason for Administrative Action <span className="text-red-500">*</span>
                </label>
                <input 
                    type="text" 
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="E.g., Customer requested cancellation via support ticket #12345"
                    className="w-full px-3 py-2 bg-white dark:bg-[#0A0A0A] border border-slate-300 dark:border-white/20 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-slate-200 dark:border-white/10">
                <nav className="flex gap-6">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                                activeTab === tab.id 
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Contents */}
            <div className="mt-6">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Tenant Identity</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <span className="text-sm text-slate-500 block">Company Name</span>
                                    <span className="font-medium">{tenant.overview.name}</span>
                                </div>
                                <div>
                                    <span className="text-sm text-slate-500 block">System Slug</span>
                                    <span className="font-medium">{tenant.overview.slug}</span>
                                </div>
                                <div>
                                    <span className="text-sm text-slate-500 block">Industry</span>
                                    <span className="font-medium">{tenant.overview.industry || 'Not set'}</span>
                                </div>
                                <div>
                                    <span className="text-sm text-slate-500 block">Created At</span>
                                    <span className="font-medium">{new Date(tenant.overview.created_at).toLocaleString()}</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Current Status</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <span className="text-sm text-slate-500 block mb-1">Lifecycle State</span>
                                    <span className="px-2 py-1 rounded bg-slate-100 dark:bg-white/10 text-sm font-semibold uppercase">{tenant.overview.status}</span>
                                </div>
                                <div>
                                    <span className="text-sm text-slate-500 block">Current Plan</span>
                                    <span className="font-medium">{tenant.overview.plan || 'No Plan'}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'subscription' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Billing & Subscription</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {tenant.subscription ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-sm text-slate-500 block">Plan Name</span>
                                            <span className="font-medium">{tenant.subscription.plan_name}</span>
                                        </div>
                                        <div>
                                            <span className="text-sm text-slate-500 block">Billing Status</span>
                                            <span className="font-medium uppercase">{tenant.subscription.status}</span>
                                        </div>
                                        <div>
                                            <span className="text-sm text-slate-500 block">Trial End Date</span>
                                            <span className="font-medium">{tenant.subscription.trial_end_date ? new Date(tenant.subscription.trial_end_date).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-sm text-slate-500 block">Current Period End</span>
                                            <span className="font-medium">{tenant.subscription.current_period_end ? new Date(tenant.subscription.current_period_end).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-slate-500">No active subscription found for this tenant.</p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'branding' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Tenant Branding</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {tenant.branding ? (
                                <div className="space-y-4">
                                    <div className="flex gap-6">
                                        <div>
                                            <span className="text-sm text-slate-500 block mb-1">Primary Color</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded border" style={{ backgroundColor: tenant.branding.primary_color }}></div>
                                                <span>{tenant.branding.primary_color}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-sm text-slate-500 block mb-1">Secondary Color</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded border" style={{ backgroundColor: tenant.branding.secondary_color }}></div>
                                                <span>{tenant.branding.secondary_color}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-slate-500 block">Support Email</span>
                                        <span className="font-medium">{tenant.branding.support_email || 'Not set'}</span>
                                    </div>
                                    <div>
                                        <span className="text-sm text-slate-500 block">Website</span>
                                        <span className="font-medium">{tenant.branding.company_website || 'Not set'}</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-slate-500">No branding configuration found.</p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {['users', 'features', 'usage', 'audit'].includes(activeTab) && (
                    <div className="text-center py-12 text-slate-500">
                        <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium">Coming Soon</h3>
                        <p className="mt-1">This detailed view is being connected to the underlying APIs.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
