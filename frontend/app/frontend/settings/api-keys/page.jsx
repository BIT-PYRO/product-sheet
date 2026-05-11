'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import APIKeyList from '@/components/api_keys/APIKeyList';

export default function APIKeysPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        if (res.status === 401) { router.replace('/login'); return; }
        const result = await res.json();
        if (!result.success) { router.replace('/login'); return; }
        const u = result.user;
        if (!u || !['admin', 'manager'].includes(u.role)) {
          router.replace('/frontend/home');
          return;
        }
        setUser(u);
      } catch {
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cloud-gray flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-trust-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-cloud-gray font-sans">
      <header className="bg-white border-b border-soft-border px-6 py-4 flex items-center gap-4">
        <Link href="/frontend/home" className="p-1.5 rounded-full hover:bg-cloud-gray transition" title="Back">
          <ArrowLeft className="h-5 w-5 text-midnight-ink" />
        </Link>
        <div>
          <h1 className="text-base font-bold text-midnight-ink">API Keys</h1>
          <p className="text-xs text-cool-gray">Manage external data access keys</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <APIKeyList />
      </div>
    </div>
  );
}
