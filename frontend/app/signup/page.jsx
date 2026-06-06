'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function SignupContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [industries, setIndustries] = useState([]);
    
    // We get plan_id from the URL instead of user input
    const initialPlanId = searchParams.get('plan_id') || '';

    const [formData, setFormData] = useState({
        company_name: '',
        industry_id: '',
        plan_id: initialPlanId,
        owner_name: '',
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        // Fetch industries for the dropdown
        fetch('/api/v1/auth/public-industries/')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setIndustries(data);
                } else if (data && Array.isArray(data.data)) {
                    setIndustries(data.data);
                } else {
                    console.error("Unexpected industries response format", data);
                    setIndustries([]);
                }
            })
            .catch(err => {
                console.error("Error fetching industries", err);
                setIndustries([]);
            });
            
        // If plan_id is missing, we could redirect back to home, but we'll leave it for now
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const res = await fetch('/api/v1/auth/signup/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            
            if (res.ok) {
                setMessage(data.message);
                // Optionally redirect to login after a few seconds
                setTimeout(() => router.push('/frontend/login'), 5000);
            } else {
                setError(data.error || 'Registration failed.');
            }
        } catch (err) {
            setError('An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative bg-slate-50 dark:bg-[#0A0A0A] transition-colors duration-300">
            {/* Background Gradient */}
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(29,78,216,0.15),rgba(248,250,252,1))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(29,78,216,0.3),rgba(0,0,0,1))] pointer-events-none transition-colors duration-500" />

            {/* Back Button */}
            <Link
                href="/"
                className="absolute top-6 left-6 sm:top-8 sm:left-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors bg-white/70 dark:bg-white/5 backdrop-blur-md px-3 py-2 rounded-lg shadow-sm dark:shadow-none border border-slate-200 dark:border-white/10 hover:shadow-md dark:hover:bg-white/10"
            >
                <ArrowLeft className="w-4 h-4" />
                Back
            </Link>

            <section className="w-full max-w-md bg-white/80 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl dark:shadow-[0_0_40px_rgba(37,99,235,0.1)] p-8 transition-colors duration-300">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white text-center tracking-tight">Sign Up</h1>
                <p className="text-base text-slate-500 dark:text-slate-400 text-center mt-2">Create your workspace</p>

                {message && <div className="mt-6 p-3 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-md text-sm">{message}</div>}
                
                {!message && (
                    <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Company Name</label>
                            <Input name="company_name" required value={formData.company_name} onChange={handleChange} className="h-11 bg-slate-50 dark:bg-black/50 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-blue-500" placeholder="Acme Inc." />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Industry</label>
                            <select name="industry_id" required value={formData.industry_id} onChange={handleChange} className="flex h-11 w-full rounded-md border border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-black/50 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors">
                                <option value="" disabled className="text-slate-400 dark:text-slate-500">Select Industry</option>
                                {industries.map(ind => (
                                    <option key={ind.id} value={ind.id} className="text-slate-900 dark:text-white bg-white dark:bg-[#0A0A0A]">{ind.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
                            <Input name="owner_name" required value={formData.owner_name} onChange={handleChange} className="h-11 bg-slate-50 dark:bg-black/50 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-blue-500" placeholder="John Doe" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                            <Input name="email" type="email" required value={formData.email} onChange={handleChange} className="h-11 bg-slate-50 dark:bg-black/50 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-blue-500" placeholder="john@example.com" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password</label>
                            <Input name="password" type="password" required value={formData.password} onChange={handleChange} className="h-11 bg-slate-50 dark:bg-black/50 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-blue-500" placeholder="••••••••" />
                        </div>

                        {error && (
                            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2 rounded-md">{error}</p>
                        )}

                        <Button type="submit" className="w-full h-11 text-base font-semibold bg-blue-600 hover:bg-blue-500 text-white border-0" disabled={loading}>
                            {loading ? 'Creating workspace...' : 'Sign Up'}
                        </Button>
                    </form>
                )}

                <div className="mt-6 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Already have an account?{' '}
                        <Link href="/frontend/login" className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                            Sign In
                        </Link>
                    </p>
                </div>
            </section>
        </main>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={
            <main className="min-h-screen bg-slate-50 dark:bg-[#0A0A0A] flex items-center justify-center px-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600 dark:border-white/10 dark:border-t-blue-500" />
            </main>
        }>
            <SignupContent />
        </Suspense>
    );
}
