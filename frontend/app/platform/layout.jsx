'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, ArrowUpCircle, BarChart3, Settings, Briefcase, UserPlus, Activity, ShieldCheck, Search } from 'lucide-react';
import GlobalSearch from '@/components/platform/GlobalSearch';

export default function PlatformLayout({ children }) {
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    // Hook 1: Auth check — must always run, no early returns before all hooks
    useEffect(() => {
        fetch('/api/v1/auth/me/')
            .then(res => {
                if (!res.ok) throw new Error('Not authenticated');
                return res.json();
            })
            .then(data => {
                if (data.data?.is_superuser) {
                    setAuthorized(true);
                } else {
                    router.push('/dashboard');
                }
            })
            .catch(() => {
                router.push('/login');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [router]);

    // Hook 2: Keyboard shortcut — must always run before any conditional returns
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Early returns come AFTER all hooks
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!authorized) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
                <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-slate-400 mt-2">You do not have permission to access the Platform Operations Center.</p>
            </div>
        );
    }

    const navLinks = [
        { href: '/platform/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/platform/tenants', label: 'Tenants', icon: Users },
        { href: '/platform/upgrade-requests', label: 'Upgrades', icon: ArrowUpCircle },
        { href: '/platform/analytics', label: 'Analytics', icon: BarChart3 },
        { href: '/platform/plans', label: 'Plans', icon: Settings },
        { href: '/platform/industries', label: 'Industries', icon: Briefcase },
        { href: '/platform/onboarding', label: 'Onboarding', icon: UserPlus },
        { href: '/platform/health', label: 'System Health', icon: Activity },
        { href: '/platform/audit', label: 'Audit Logs', icon: ShieldCheck },
    ];

    return (
        <div className="min-h-screen flex bg-slate-50 dark:bg-[#0A0A0A] text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-500/30">
            <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
            
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col hidden md:flex">
                <div className="h-16 flex items-center px-6 border-b border-slate-800">
                    <span className="text-xl font-bold text-white tracking-tight">Platform Ops</span>
                </div>
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {navLinks.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname.startsWith(link.href);
                        return (
                            <Link 
                                key={link.href} 
                                href={link.href}
                                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                                    isActive 
                                    ? 'bg-blue-600 text-white font-medium' 
                                    : 'hover:bg-slate-800 hover:text-white'
                                }`}
                            >
                                <Icon className="w-5 h-5" />
                                {link.label}
                            </Link>
                        )
                    })}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header Navbar */}
                <header className="h-16 flex items-center justify-between px-8 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#111]">
                    <div 
                        onClick={() => setIsSearchOpen(true)}
                        className="flex items-center text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer bg-slate-100 dark:bg-white/5 px-4 py-1.5 rounded-md text-sm border border-slate-200 dark:border-white/10 transition-colors"
                    >
                        <Search className="w-4 h-4 mr-2" />
                        Search Platform (Ctrl+K)
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => {
                                const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
                                if (currentTheme === 'dark') {
                                    document.documentElement.classList.remove('dark');
                                    localStorage.setItem('theme', 'light');
                                } else {
                                    document.documentElement.classList.add('dark');
                                    localStorage.setItem('theme', 'dark');
                                }
                            }}
                            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"
                            title="Toggle Theme"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hidden dark:block"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="block dark:hidden"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                        </button>
                        
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                            SA
                        </div>

                        <button 
                            onClick={async () => {
                                // Clear tokens (basic client-side cleanup)
                                document.cookie = "psd-access-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                                document.cookie = "psd-refresh-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                                // Call logout endpoint if it exists
                                await fetch('/api/v1/auth/logout/', { method: 'POST' }).catch(() => {});
                                router.push('/login');
                            }}
                            className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 dark:text-red-400 transition-colors"
                            title="Log out"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                        </button>
                    </div>
                </header>
                
                {/* Scrollable Page Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
