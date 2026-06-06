'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Filter, Download } from 'lucide-react';

export default function PlatformAnalytics() {
    const [funnel, setFunnel] = useState(null);
    const [adoption, setAdoption] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('/api/v1/platform/analytics/upgrade-funnel/').then(r => r.json()),
            fetch('/api/v1/platform/analytics/feature-adoption/').then(r => r.json())
        ]).then(([fData, aData]) => {
            setFunnel(fData);
            setAdoption(aData);
            setLoading(false);
        });
    }, []);

    if (loading) return <div className="animate-pulse space-y-4"><div className="h-10 bg-slate-200 dark:bg-slate-800 rounded"></div><div className="h-64 bg-slate-200 dark:bg-slate-800 rounded"></div></div>;

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
    const funnelData = funnel?.funnel ? [
        { name: 'Total Requests', value: funnel.funnel.total },
        { name: 'Contacted', value: funnel.funnel.contacted },
        { name: 'Converted', value: funnel.funnel.converted },
        { name: 'Rejected', value: funnel.funnel.rejected },
    ] : [];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Analytics Center</h1>
                    <p className="text-slate-500 dark:text-slate-400">Track platform usage, feature adoption, and upgrade funnels.</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-sm font-medium hover:bg-slate-50 dark:hover:bg-white/10 transition flex items-center gap-2">
                        <Filter className="w-4 h-4" /> Filter
                    </button>
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition flex items-center gap-2">
                        <Download className="w-4 h-4" /> Export
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Feature Adoption</CardTitle>
                        <CardDescription>Percentage of active tenants using each module</CardDescription>
                    </CardHeader>
                    <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={adoption} layout="vertical" margin={{ left: 40, right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#333" opacity={0.2} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="feature" type="category" axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="usage_percent" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Upgrade Request Funnel</CardTitle>
                        <CardDescription>Conversion metrics for locked feature requests</CardDescription>
                    </CardHeader>
                    <CardContent className="h-80 flex items-center justify-center">
                        {funnel && (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={funnelData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={2} dataKey="value">
                                        {funnelData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                        <div className="flex flex-col justify-center space-y-4 ml-4 w-1/3">
                            {funnelData.map((entry, index) => (
                                <div key={entry.name} className="flex flex-col">
                                    <div className="flex items-center text-sm mb-1">
                                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                        <span className="text-slate-600 dark:text-slate-300">{entry.name}</span>
                                    </div>
                                    <span className="font-bold text-xl pl-5">{entry.value}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
