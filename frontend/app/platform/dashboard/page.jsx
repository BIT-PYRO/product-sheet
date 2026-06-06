'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, TrendingUp, DollarSign, Activity, AlertCircle, RefreshCcw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

export default function PlatformDashboard() {
    const [metrics, setMetrics] = useState(null);
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [metricsRes, activityRes] = await Promise.all([
                fetch('/api/v1/platform/dashboard/'),
                fetch('/api/v1/platform/dashboard/activity/')
            ]);
            
            if (!metricsRes.ok || !activityRes.ok) throw new Error('Failed to fetch dashboard data');
            
            const mData = await metricsRes.json();
            const aData = await activityRes.json();
            
            setMetrics(mData);
            setActivity(aData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) return <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div><div className="space-y-2"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div></div></div></div>;
    if (error) return <div className="text-red-500 flex items-center gap-2"><AlertCircle className="w-5 h-5"/> Error loading dashboard: {error}</div>;

    const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Platform Overview</h1>
                    <p className="text-slate-500 dark:text-slate-400">High-level metrics across all tenants and subscriptions.</p>
                </div>
                <button onClick={fetchData} className="px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-sm font-medium hover:bg-slate-50 dark:hover:bg-white/10 transition flex items-center gap-2">
                    <RefreshCcw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Tenants</CardTitle>
                        <Users className="w-4 h-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.metrics.total_tenants}</div>
                        <p className="text-xs text-slate-500 mt-1">{metrics.metrics.active_tenants} Active, {metrics.metrics.trial_tenants} Trialing</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Suspended / Cancelled</CardTitle>
                        <Activity className="w-4 h-4 text-red-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{metrics.metrics.suspended_tenants + metrics.metrics.cancelled_tenants}</div>
                        <p className="text-xs text-slate-500 mt-1">{metrics.metrics.suspended_tenants} Suspended, {metrics.metrics.cancelled_tenants} Cancelled</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Monthly Recurring Revenue</CardTitle>
                        <DollarSign className="w-4 h-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">${metrics.metrics.mrr.toLocaleString()}</div>
                        <p className="text-xs text-slate-500 mt-1">ARR: ${metrics.metrics.arr.toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Paid Tenants</CardTitle>
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{metrics.metrics.active_paid_tenants}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Tenant Growth</CardTitle>
                        <CardDescription>New signups over the last 6 months</CardDescription>
                    </CardHeader>
                    <CardContent className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={metrics.charts.growth}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Industry Distribution</CardTitle>
                        <CardDescription>Active tenants breakdown by industry</CardDescription>
                    </CardHeader>
                    <CardContent className="h-72 flex justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={metrics.charts.industry_distribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {metrics.charts.industry_distribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-col justify-center space-y-2 ml-4">
                            {metrics.charts.industry_distribution.map((entry, index) => (
                                <div key={entry.name} className="flex items-center text-sm">
                                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                    <span className="text-slate-600 dark:text-slate-300">{entry.name}</span>
                                    <span className="ml-auto font-medium pl-4">{entry.value}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Activity Feeds */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Administrative Actions</CardTitle>
                        <CardDescription>Recent high-risk operations performed by Super Admins</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {activity.length === 0 ? (
                                <p className="text-sm text-slate-500">No recent administrative actions.</p>
                            ) : (
                                activity.map((audit) => (
                                    <div key={audit.id} className="flex flex-col border-b border-slate-100 dark:border-white/5 pb-3 last:border-0 last:pb-0">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="font-semibold text-slate-900 dark:text-white mr-2">{audit.action}</span>
                                                <span className="text-sm text-slate-500">on <span className="font-medium text-slate-700 dark:text-slate-300">{audit.tenant}</span></span>
                                            </div>
                                            <span className="text-xs text-slate-400">{new Date(audit.created_at).toLocaleString()}</span>
                                        </div>
                                        <div className="text-sm text-slate-500 mt-1">By: {audit.performed_by}</div>
                                        <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-white/5 p-2 rounded mt-2 border border-slate-100 dark:border-white/10">
                                            <span className="font-medium">Reason:</span> {audit.reason}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Signups</CardTitle>
                        <CardDescription>Latest tenants onboarded to the platform</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {metrics.recent_activity.signups.length === 0 ? (
                                <p className="text-sm text-slate-500">No recent signups.</p>
                            ) : (
                                metrics.recent_activity.signups.map((t) => (
                                    <div key={t.id} className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">{t.name}</p>
                                            <p className="text-sm text-slate-500">{t.plan}</p>
                                        </div>
                                        <div className="text-sm text-slate-400">
                                            {new Date(t.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
