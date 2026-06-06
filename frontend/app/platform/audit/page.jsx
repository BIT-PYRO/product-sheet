'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, ShieldCheck, AlertCircle, Filter, Download } from 'lucide-react';

export default function PlatformAuditCenter() {
    const [audits, setAudits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchAudits = async () => {
            setLoading(true);
            try {
                const query = search ? `?search=${encodeURIComponent(search)}` : '';
                const res = await fetch(`/api/v1/platform/audit/${query}`);
                if (!res.ok) throw new Error('Failed to fetch audit logs');
                const data = await res.json();
                setAudits(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(fetchAudits, 300);
        return () => clearTimeout(timer);
    }, [search]);

    if (error) return <div className="text-red-500"><AlertCircle className="inline w-5 h-5 mr-2"/>{error}</div>;

    const getActionColor = (action) => {
        const act = action.toLowerCase();
        if (act.includes('suspend') || act.includes('cancel') || act.includes('delete')) return 'text-red-500 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50';
        if (act.includes('reactivate') || act.includes('approve')) return 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/50';
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/50';
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Platform Audit Center</h1>
                    <p className="text-slate-500 dark:text-slate-400">Immutable record of high-risk Super Admin operations.</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-sm font-medium hover:bg-slate-50 dark:hover:bg-white/10 transition flex items-center gap-2">
                        <Filter className="w-4 h-4" /> Filter
                    </button>
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition flex items-center gap-2">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
                    <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-blue-500"/> Action Timeline</CardTitle>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search actions, tenants, users..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/10 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="animate-pulse space-y-4 p-6">
                            <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded"></div>
                            <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded"></div>
                            <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded"></div>
                        </div>
                    ) : audits.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            No audit records found matching your criteria.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {audits.map((audit) => (
                                <div key={audit.id} className="p-6 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider border ${getActionColor(audit.action)}`}>
                                                {audit.action}
                                            </span>
                                            <span className="text-slate-500 dark:text-slate-400 text-sm">
                                                Target: <span className="font-semibold text-slate-900 dark:text-white">{audit.tenant}</span>
                                            </span>
                                        </div>
                                        <div className="text-sm text-slate-500 text-right whitespace-nowrap">
                                            {new Date(audit.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-4 mt-4">
                                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                                                {audit.performed_by.substring(0, 2).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex-1 bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 p-3 rounded-lg shadow-sm">
                                            <div className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                                                {audit.performed_by}
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                                <span className="font-medium text-slate-900 dark:text-slate-300">Reason:</span> {audit.reason}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
