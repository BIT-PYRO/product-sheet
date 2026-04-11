'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, KeyRound, ShieldCheck, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        const result = await res.json();
        if (!res.ok || !result.success) { router.replace('/login'); return; }
        setSessionUser(result.user);
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

  return (
    <div className="min-h-screen bg-cloud-gray font-sans">
      <header className="bg-white border-b border-soft-border px-6 py-4 flex items-center gap-4">
        <Link href="/home" className="p-1.5 rounded-full hover:bg-cloud-gray transition" title="Back">
          <ArrowLeft className="h-5 w-5 text-midnight-ink" />
        </Link>
        <h1 className="text-base font-bold text-midnight-ink">Settings</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-3">
        <Link
          href="/settings/account"
          className="flex items-center gap-4 bg-white rounded-xl border border-soft-border px-5 py-4 hover:border-trust-blue transition group"
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-cloud-gray shrink-0">
            <KeyRound className="h-4 w-4 text-trust-blue" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-midnight-ink">Account Settings</p>
            <p className="text-xs text-cool-gray mt-0.5">Set your username and password</p>
          </div>
          <ChevronRight className="h-4 w-4 text-cool-gray group-hover:text-trust-blue shrink-0" />
        </Link>

        {sessionUser?.is_superuser && (
          <Link
            href="/settings/role-permissions"
            className="flex items-center gap-4 bg-white rounded-xl border border-soft-border px-5 py-4 hover:border-trust-blue transition group"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-cloud-gray shrink-0">
              <ShieldCheck className="h-4 w-4 text-trust-blue" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-midnight-ink">Default Role Permissions</p>
              <p className="text-xs text-cool-gray mt-0.5">Configure module access defaults per role</p>
            </div>
            <ChevronRight className="h-4 w-4 text-cool-gray group-hover:text-trust-blue shrink-0" />
          </Link>
        )}
      </div>
    </div>
  );
}