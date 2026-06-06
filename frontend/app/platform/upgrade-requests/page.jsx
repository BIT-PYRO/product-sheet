'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpCircle, CheckCircle, XCircle, Mail, AlertCircle, PhoneCall, User } from 'lucide-react';
import Link from 'next/link';

export default function UpgradeRequestCenter() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/v1/platform/upgrade-requests/');
            if (!res.ok) throw new Error('Failed to fetch upgrade requests');
            const data = await res.json();
            setRequests(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const updateStatus = async (id, status) => {
        try {
            const res = await fetch('/api/v1/platform/upgrade-requests/', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status })
            });
            if (!res.ok) throw new Error('Failed to update status');
            fetchRequests(); // Refresh data
        } catch (err) {
            alert(err.message);
        }
    };

    if (loading) return <div className="animate-pulse space-y-4"><div className="h-10 bg-slate-200 dark:bg-slate-800 rounded"></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"><div className="h-40 bg-slate-200 dark:bg-slate-800 rounded"></div><div className="h-40 bg-slate-200 dark:bg-slate-800 rounded"></div></div></div>;
    if (error) return <div className="text-red-500"><AlertCircle className="inline w-5 h-5 mr-2"/>{error}</div>;

    const getStatusStyle = (status) => {
        switch(status) {
            case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            case 'contacted': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'converted': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'rejected': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Upgrade Request Center</h1>
                <p className="text-slate-500 dark:text-slate-400">Manage tenants who hit a paywall and requested to upgrade their plans.</p>
            </div>

            {requests.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/10 rounded-lg">
                    <ArrowUpCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">No Upgrade Requests</h3>
                    <p className="text-slate-500 mt-1">There are no pending upgrade requests from tenants right now.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {requests.map(req => (
                        <Card key={req.id} className="relative overflow-hidden group">
                            <div className={`absolute top-0 left-0 w-1 h-full ${
                                req.status === 'pending' ? 'bg-amber-500' : 
                                req.status === 'contacted' ? 'bg-blue-500' : 
                                req.status === 'converted' ? 'bg-green-500' : 'bg-slate-300'
                            }`}></div>
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider ${getStatusStyle(req.status)}`}>
                                        {req.status}
                                    </span>
                                    <span className="text-xs text-slate-400">{new Date(req.created_at).toLocaleDateString()}</span>
                                </div>
                                
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                                    {req.tenant_id ? (
                                        <Link href={`/platform/tenants/${req.tenant_id}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                            {req.tenant_name}
                                        </Link>
                                    ) : req.tenant_name}
                                </h3>
                                <div className="text-sm text-slate-500 mb-4">
                                    <p className="flex items-center gap-2"><User className="w-4 h-4"/> {req.user_name}</p>
                                    <p className="flex items-center gap-2 mt-1"><Mail className="w-4 h-4"/> {req.user_email}</p>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md mb-4 border border-slate-100 dark:border-white/5">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Requested Feature</p>
                                    <p className="font-medium text-slate-900 dark:text-white">{req.requested_feature}</p>
                                    <p className="text-xs text-slate-500 mt-2">Current Plan: <span className="font-medium">{req.current_plan}</span></p>
                                </div>

                                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
                                    {req.status === 'pending' && (
                                        <button onClick={() => updateStatus(req.id, 'contacted')} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition">
                                            <PhoneCall className="w-4 h-4" /> Contacted
                                        </button>
                                    )}
                                    {['pending', 'contacted'].includes(req.status) && (
                                        <button onClick={() => updateStatus(req.id, 'converted')} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition">
                                            <CheckCircle className="w-4 h-4" /> Convert
                                        </button>
                                    )}
                                    {['pending', 'contacted'].includes(req.status) && (
                                        <button onClick={() => updateStatus(req.id, 'rejected')} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-sm transition">
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
