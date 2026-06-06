'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Check, X, ShieldAlert, AlertCircle, PlusCircle, Settings } from 'lucide-react';

export default function PlatformPlanManagement() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/v1/platform/plans/');
            if (!res.ok) throw new Error('Failed to fetch plans');
            const data = await res.json();
            setPlans(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const toggleFeature = async (planId, featureId, currentState) => {
        try {
            const res = await fetch(`/api/v1/platform/plans/${planId}/features/${featureId}/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_enabled: !currentState })
            });
            if (!res.ok) throw new Error('Failed to toggle feature');
            
            // Optimistic update
            setPlans(plans.map(p => {
                if (p.id === planId) {
                    return {
                        ...p,
                        features: p.features.map(f => f.feature_id === featureId ? { ...f, is_enabled: !currentState } : f)
                    };
                }
                return p;
            }));
        } catch (err) {
            alert(err.message);
        }
    };

    if (loading) return <div className="animate-pulse space-y-4"><div className="h-10 bg-slate-200 dark:bg-slate-800 rounded"></div><div className="flex gap-4"><div className="w-1/4 h-96 bg-slate-200 dark:bg-slate-800 rounded"></div><div className="w-1/4 h-96 bg-slate-200 dark:bg-slate-800 rounded"></div></div></div>;
    if (error) return <div className="text-red-500"><AlertCircle className="inline w-5 h-5 mr-2"/>{error}</div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Plan Management</h1>
                    <p className="text-slate-500 dark:text-slate-400">Manage subscription tiers and toggle feature availability.</p>
                </div>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition flex items-center gap-2">
                    <PlusCircle className="w-4 h-4" /> Create Plan
                </button>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-4 items-start">
                {plans.map(plan => (
                    <Card key={plan.id} className="min-w-[320px] max-w-[320px] relative">
                        {plan.code === 'enterprise' && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>}
                        <CardHeader className="text-center pb-2">
                            <CardTitle className="text-2xl">{plan.name}</CardTitle>
                            <CardDescription>{plan.code}</CardDescription>
                            <div className="mt-4">
                                <span className="text-4xl font-bold text-slate-900 dark:text-white">${plan.base_price_monthly}</span>
                                <span className="text-slate-500">/mo</span>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                {plan.features.map(f => (
                                    <div key={f.feature_id} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-2">
                                            {f.is_enabled ? (
                                                <Check className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <X className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                                            )}
                                            <span className={`text-sm ${f.is_enabled ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-600 line-through'}`}>
                                                {f.feature_name}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={() => toggleFeature(plan.id, f.feature_id, f.is_enabled)}
                                            className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300 rounded transition"
                                        >
                                            Toggle
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter>
                            <button className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-md text-sm font-medium transition flex items-center justify-center gap-2">
                                <Settings className="w-4 h-4" /> Edit Configuration
                            </button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
