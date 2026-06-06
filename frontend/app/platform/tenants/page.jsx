'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, MoreVertical, Eye, Settings, ShieldAlert, AlertCircle, Play } from 'lucide-react';
import Link from 'next/link';

export default function TenantManagement() {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetch('/api/v1/platform/tenants/')
            .then(res => res.json())
            .then(data => {
                setTenants(data);
            })
            .finally(() => setLoading(false));
    }, []);

    const filteredTenants = tenants.filter(t => 
        t.company.toLowerCase().includes(search.toLowerCase()) ||
        (t.industry && t.industry.toLowerCase().includes(search.toLowerCase())) ||
        (t.plan && t.plan.toLowerCase().includes(search.toLowerCase()))
    );

    const getStatusBadge = (status) => {
        switch(status) {
            case 'active_trial': return <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-medium">Trial</span>;
            case 'active_paid': return <span className="px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium">Active</span>;
            case 'suspended': return <span className="px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-medium">Suspended</span>;
            case 'cancelled': return <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 text-xs font-medium">Cancelled</span>;
            default: return <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 text-xs font-medium">{status}</span>;
        }
    };

    if (loading) return <div className="animate-pulse space-y-4"><div className="h-10 bg-slate-200 dark:bg-slate-800 rounded"></div><div className="h-64 bg-slate-200 dark:bg-slate-800 rounded"></div></div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Tenant Management</h1>
                <p className="text-slate-500 dark:text-slate-400">View and manage all organizations on the platform.</p>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <CardTitle>All Tenants</CardTitle>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search tenants..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/10 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-white/5 border-y border-slate-200 dark:border-white/10">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Company</th>
                                    <th className="px-6 py-3 font-medium">Industry</th>
                                    <th className="px-6 py-3 font-medium">Plan</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                    <th className="px-6 py-3 font-medium">Users</th>
                                    <th className="px-6 py-3 font-medium">Storage</th>
                                    <th className="px-6 py-3 font-medium">Created Date</th>
                                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                                {filteredTenants.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                                            No tenants found matching "{search}".
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTenants.map((t) => (
                                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{t.company}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{t.industry}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{t.plan}</td>
                                            <td className="px-6 py-4">{getStatusBadge(t.status)}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{t.users}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{t.storage}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{new Date(t.created_at).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-right">
                                                <Link href={`/platform/tenants/${t.id}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium inline-flex items-center gap-1">
                                                    <Eye className="w-4 h-4" /> View
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
