'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Briefcase, Activity, FileText, Layers, AlertCircle, Plus } from 'lucide-react';

export default function PlatformIndustryManagement() {
    const [industries, setIndustries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch('/api/v1/platform/industries/')
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch industries');
                return res.json();
            })
            .then(data => {
                setIndustries(data);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="animate-pulse space-y-4"><div className="h-10 bg-slate-200 dark:bg-slate-800 rounded"></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"><div className="h-48 bg-slate-200 dark:bg-slate-800 rounded"></div><div className="h-48 bg-slate-200 dark:bg-slate-800 rounded"></div></div></div>;
    if (error) return <div className="text-red-500"><AlertCircle className="inline w-5 h-5 mr-2"/>{error}</div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Industry Management</h1>
                    <p className="text-slate-500 dark:text-slate-400">Configure industry-specific workflows, templates, and attributes.</p>
                </div>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Industry
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {industries.map(ind => (
                    <Card key={ind.id} className="hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer group">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <div className="w-8 h-8 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                    <Briefcase className="w-4 h-4" />
                                </div>
                                {ind.name}
                            </CardTitle>
                            <CardDescription>{ind.code}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-lg text-center">
                                    <span className="block text-2xl font-bold text-slate-900 dark:text-white">{ind.active_tenants}</span>
                                    <span className="text-xs text-slate-500 uppercase tracking-wider">Tenants</span>
                                </div>
                                <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-lg text-center">
                                    <span className="block text-2xl font-bold text-slate-900 dark:text-white">{ind.workflows}</span>
                                    <span className="text-xs text-slate-500 uppercase tracking-wider">Workflows</span>
                                </div>
                                <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-lg text-center">
                                    <span className="block text-2xl font-bold text-slate-900 dark:text-white">{ind.templates}</span>
                                    <span className="text-xs text-slate-500 uppercase tracking-wider">Templates</span>
                                </div>
                                <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-lg text-center">
                                    <span className="block text-2xl font-bold text-slate-900 dark:text-white">{ind.inventory_definitions}</span>
                                    <span className="text-xs text-slate-500 uppercase tracking-wider">Attributes</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
