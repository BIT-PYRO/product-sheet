'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const SHEET_BLOCKS = [
  { href: '/', title: 'Product Sheet', subtitle: 'Product entry and live stock form' },
  { href: '/master-product-sheet', title: 'Master Product Sheet', subtitle: 'All product records' },
  { href: '/master-inventory-sheet', title: 'Master Inventory Sheet', subtitle: 'Live stock and final stock' },
  { href: '/master-job-sheet', title: 'Master Job Sheet', subtitle: 'Job master data' },
  { href: '/master-workforce-sheet', title: 'Master Workforce Sheet', subtitle: 'Workforce records' },
  { href: '/master-kyc-sheet', title: 'Master KYC Sheet', subtitle: 'Company KYC records' },
  { href: '/managers-dashboard', title: 'Managers Dashboard', subtitle: 'Manager view and job cards' },
  { href: '/enrol-workforce', title: 'Enrol Workforce', subtitle: 'Workforce onboarding form' },
  { href: '/drafts', title: 'Drafts', subtitle: 'View and load saved drafts' },
];

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState('User');

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
        const result = await response.json();

        if (!response.ok || !result.success) {
          router.replace('/login');
          return;
        }

        setUsername(result.user?.id || 'User');
      } catch {
        router.replace('/login');
      }
    };

    loadSession();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Home</h1>
            <p className="text-sm text-slate-600 mt-1">Welcome, {username}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SHEET_BLOCKS.map((block) => (
            <Link
              key={block.href}
              href={block.href}
              className="block rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300 hover:shadow-sm transition"
            >
              <h2 className="text-base font-semibold text-slate-900">{block.title}</h2>
              <p className="text-sm text-slate-600 mt-2">{block.subtitle}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
