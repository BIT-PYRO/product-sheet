'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, Database, Server, HardDrive, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function PlatformHealthCenter() {
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchHealth = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/v1/platform/health/');
            if (!res.ok) throw new Error('Failed to fetch health data');
            const data = await res.json();
            setHealth(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealth();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading && !health) return <div className="animate-pulse space-y-4"><div className="h-10 bg-slate-200 dark:bg-slate-800 rounded"></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"><div className="h-32 bg-slate-200 dark:bg-slate-800 rounded"></div><div className="h-32 bg-slate-200 dark:bg-slate-800 rounded"></div><div className="h-32 bg-slate-200 dark:bg-slate-800 rounded"></div><div className="h-32 bg-slate-200 dark:bg-slate-800 rounded"></div></div></div>;
    if (error) return <div className="text-red-500"><AlertCircle className="inline w-5 h-5 mr-2"/>{error}</div>;

    const StatusIndicator = ({ status }) => {
        if (status === 'healthy') {
            return <div className="flex items-center text-green-500 font-medium"><CheckCircle2 className="w-5 h-5 mr-2"/> Healthy</div>;
        }
        return <div className="flex items-center text-red-500 font-medium"><AlertCircle className="w-5 h-5 mr-2"/> Critical</div>;
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">System Health</h1>
                <p className="text-slate-500 dark:text-slate-400">Real-time status of critical infrastructure components.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className={health.database.status === 'healthy' ? 'border-green-500/20' : 'border-red-500/50'}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">PostgreSQL Database</CardTitle>
                        <Database className="w-4 h-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <StatusIndicator status={health.database.status} />
                    </CardContent>
                </Card>

                <Card className={health.redis.status === 'healthy' ? 'border-green-500/20' : 'border-red-500/50'}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Redis Cache & Queues</CardTitle>
                        <Server className="w-4 h-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <StatusIndicator status={health.redis.status} />
                    </CardContent>
                </Card>

                <Card className={health.api.status === 'healthy' ? 'border-green-500/20' : 'border-red-500/50'}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Core API Endpoints</CardTitle>
                        <Activity className="w-4 h-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <StatusIndicator status={health.api.status} />
                    </CardContent>
                </Card>

                <Card className={health.storage.status === 'healthy' ? 'border-green-500/20' : 'border-red-500/50'}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Object Storage</CardTitle>
                        <HardDrive className="w-4 h-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-end">
                            <StatusIndicator status={health.storage.status} />
                            <span className="text-xs text-slate-500">{health.storage.usage} Full</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
