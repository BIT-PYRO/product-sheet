'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, UserPlus, Calendar } from 'lucide-react';

export default function PlatformOnboardingCenter() {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch('/api/v1/platform/tenants/')
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch tenants');
                return res.json();
            })
            .then(data => setTenants(data))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="animate-pulse space-y-4"><div className="h-10 bg-slate-200 dark:bg-slate-800 rounded"></div><div className="flex gap-4"><div className="flex-1 h-96 bg-slate-200 dark:bg-slate-800 rounded"></div></div></div>;
    if (error) return <div className="text-red-500"><AlertCircle className="inline w-5 h-5 mr-2"/>{error}</div>;

    const columns = [
        { id: 'pending_verification', label: 'Pending Verification', color: 'border-amber-500' },
        { id: 'active_trial', label: 'Active Trial', color: 'border-blue-500' },
        { id: 'active_paid', label: 'Completed (Paid)', color: 'border-green-500' },
        { id: 'suspended', label: 'Suspended', color: 'border-red-500' },
        { id: 'cancelled', label: 'Cancelled', color: 'border-slate-500' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-full flex flex-col">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Onboarding Center</h1>
                <p className="text-slate-500 dark:text-slate-400">Track tenant progression through the signup and lifecycle stages.</p>
            </div>

            <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
                {columns.map(col => {
                    const columnTenants = tenants.filter(t => t.status === col.id);
                    
                    return (
                        <div key={col.id} className="min-w-[320px] max-w-[320px] bg-slate-100 dark:bg-[#151515] rounded-xl p-4 flex flex-col h-full border border-slate-200 dark:border-white/5">
                            <div className="flex justify-between items-center mb-4 px-2">
                                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center">
                                    <div className={`w-3 h-3 rounded-full mr-2 border-2 ${col.color}`}></div>
                                    {col.label}
                                </h3>
                                <span className="bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-xs py-0.5 px-2 rounded-full font-medium">
                                    {columnTenants.length}
                                </span>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                                {columnTenants.map(t => (
                                    <div key={t.id} className="bg-white dark:bg-[#222] p-4 rounded-lg shadow-sm border border-slate-200 dark:border-white/10 hover:border-blue-500 transition-colors cursor-pointer group">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{t.company}</h4>
                                        </div>
                                        <div className="space-y-2 mt-3">
                                            <div className="flex items-center text-xs text-slate-500">
                                                <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                                                {t.users} User{t.users !== 1 ? 's' : ''}
                                            </div>
                                            <div className="flex items-center text-xs text-slate-500">
                                                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                                                {new Date(t.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="mt-4 flex gap-2">
                                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400">
                                                {t.industry || 'No Industry'}
                                            </span>
                                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400">
                                                {t.plan || 'No Plan'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
