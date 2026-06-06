'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Building, User, Layout, Briefcase, ChevronRight, X } from 'lucide-react';

export default function GlobalSearch({ isOpen, onClose }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    useEffect(() => {
        if (!query.trim()) {
            setResults(null);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                // In a real implementation, this would hit a dedicated /api/v1/platform/search/ endpoint.
                // For this implementation, we will mock the search behavior as per Phase 7 requirements.
                const mockResults = {
                    tenants: [
                        { id: 1, name: 'XYZ Fashion', type: 'tenant', icon: Building, url: '/platform/tenants/1' }
                    ].filter(r => r.name.toLowerCase().includes(query.toLowerCase())),
                    users: [
                        { id: 1, name: 'John Doe', type: 'user', icon: User, url: '#' }
                    ].filter(r => r.name.toLowerCase().includes(query.toLowerCase())),
                    plans: [
                        { id: 1, name: 'Growth Plan', type: 'plan', icon: Layout, url: '/platform/plans' }
                    ].filter(r => r.name.toLowerCase().includes(query.toLowerCase()))
                };
                
                // Only keep categories that have results
                const filtered = {};
                if (mockResults.tenants.length) filtered.tenants = mockResults.tenants;
                if (mockResults.users.length) filtered.users = mockResults.users;
                if (mockResults.plans.length) filtered.plans = mockResults.plans;
                
                setResults(Object.keys(filtered).length > 0 ? filtered : null);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div 
                className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform scale-100 transition-all"
                onClick={e => e.stopPropagation()}
            >
                {/* Search Input */}
                <div className="flex items-center px-4 py-4 border-b border-slate-100 dark:border-slate-800">
                    <Search className="w-5 h-5 text-slate-400 mr-3" />
                    <input 
                        type="text" 
                        autoFocus
                        placeholder="Search tenants, users, plans..." 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder:text-slate-400 text-lg"
                    />
                    <button onClick={onClose} className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Results */}
                <div className="max-h-96 overflow-y-auto p-2">
                    {loading && (
                        <div className="p-4 text-center text-sm text-slate-500">Searching...</div>
                    )}
                    
                    {!loading && !results && query.trim() && (
                        <div className="p-8 text-center">
                            <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500">No results found for "{query}"</p>
                        </div>
                    )}

                    {!loading && !query.trim() && (
                        <div className="p-8 text-center">
                            <p className="text-slate-500 text-sm">Start typing to search across the platform.</p>
                        </div>
                    )}

                    {!loading && results && Object.entries(results).map(([category, items]) => (
                        <div key={category} className="mb-4 last:mb-0">
                            <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                {category}
                            </div>
                            <div className="space-y-1">
                                {items.map(item => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={`${item.type}-${item.id}`}
                                            onClick={() => {
                                                router.push(item.url);
                                                onClose();
                                            }}
                                            className="w-full flex items-center justify-between px-3 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md group transition-colors"
                                        >
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-3 group-hover:bg-blue-100 dark:group-hover:bg-blue-800 transition-colors">
                                                    <Icon className="w-4 h-4 text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                                                </div>
                                                <span className="font-medium text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300">{item.name}</span>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex justify-between">
                    <span>Use <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">↑</kbd> <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">↓</kbd> to navigate</span>
                    <span>Press <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">Esc</kbd> to close</span>
                </div>
            </div>
        </div>
    );
}
