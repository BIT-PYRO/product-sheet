'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { EnrolWorkforceForm } from '@/app/frontend/enrol-workforce/page';
import DateTimeStamp from '@/components/date-time-stamp';

const SHEET_BLOCKS = [
  { href: '/', title: 'Product Sheet', subtitle: 'Product entry and live stock form' },
  { href: '/master-product-sheet', title: 'Master Product Sheet', subtitle: 'All product records' },
  { href: '/master-inventory-sheet', title: 'Master Inventory Sheet', subtitle: 'Live stock and final stock' },
  {href: '/enrol-customer', title: 'Enroll Customer', subtitle: 'Customer entry form' },
  { href: '/master-customer-sheet', title: 'Master Customer Sheet', subtitle: 'Customer records and details' },
  { href: '/master-kyc-sheet', title: 'Master KYC Sheet', subtitle: 'Company KYC records' },
  { href: '/enrol-workforce', title: 'Enrol Workforce', subtitle: 'Workforce onboarding form' },
  { href: '/master-workforce-sheet', title: 'Master Workforce Sheet', subtitle: 'Workforce records' },
  { href: '/master-job-sheet', title: 'Master Job Sheet', subtitle: 'Job master data' },
  { href: '/managers-dashboard', title: 'Managers Dashboard', subtitle: 'Manager view and job cards' },
  { href: '/drafts', title: 'Drafts', subtitle: 'View and load saved drafts' },
  { href: '/orders', title: 'Orders', subtitle: 'Create and manage job orders' },
  { href: '#my-desk', title: 'My Desk', subtitle: 'Coming soon' },
  { href: '#dummy-1', title: 'Dummy Button', subtitle: 'Coming soon' },
  { href: '#dummy-2', title: 'Dummy Button', subtitle: 'Coming soon' },
];

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState('User');
  const [isEnrollWorkforceOpen, setIsEnrollWorkforceOpen] = useState(false);
  const [enrollStatusMessage, setEnrollStatusMessage] = useState('');

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
    <main className="min-h-screen bg-cloud-gray p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-midnight-ink">Home</h1>
            <p className="text-base text-cool-gray mt-2">Welcome, {username}</p>
          </div>
          <div className="flex items-center gap-3">
            <DateTimeStamp />
            <Button variant="outline" onClick={handleLogout} className="h-11 text-base font-semibold">Logout</Button>
          </div>
        </div>

        {enrollStatusMessage && (
          <div className="mb-4 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success-dark">
            {enrollStatusMessage}
          </div>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SHEET_BLOCKS.map((block, index) => {
            const num = <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-trust-blue text-white text-xs font-bold mb-2">{index + 1}</span>;

            if (block.href === '/enrol-workforce') {
              return (
                <button
                  key={block.href}
                  type="button"
                  onClick={() => setIsEnrollWorkforceOpen(true)}
                  className="block text-left rounded-xl border border-soft-border bg-white p-6 hover:border-trust-blue hover:shadow-md transition"
                >
                  {num}
                  <h2 className="text-lg font-semibold text-midnight-ink">{block.title}</h2>
                  <p className="text-sm text-cool-gray mt-2">{block.subtitle}</p>
                </button>
              );
            }

            return (
              <Link
                key={block.href}
                href={block.href}
                className="block rounded-xl border border-soft-border bg-white p-6 hover:border-trust-blue hover:shadow-md transition"
              >
                {num}
                <h2 className="text-lg font-semibold text-midnight-ink">{block.title}</h2>
                <p className="text-sm text-cool-gray mt-2">{block.subtitle}</p>
              </Link>
            );
          })}
        </section>
      </div>

      {isEnrollWorkforceOpen && (
        <EnrolWorkforceForm
          open={isEnrollWorkforceOpen}
          onEnroll={(fullName) => {
            setEnrollStatusMessage(`${fullName} enrolled successfully.`);
          }}
          onClose={() => setIsEnrollWorkforceOpen(false)}
        />
      )}
    </main>
  );
}
