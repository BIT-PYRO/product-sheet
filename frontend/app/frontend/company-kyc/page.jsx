'use client';

import { useRouter } from 'next/navigation';
import { CompanyKYCForm } from '@/components/company-kyc-form';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import DateTimeStamp from '@/components/date-time-stamp';

export default function CompanyKYCPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-cloud-gray">
      <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-xl font-bold tracking-tight text-midnight-ink">COMPANY KYC FORM</h1>
          </div>
          <DateTimeStamp />
        </div>
      </div>

      <div className="pt-16 px-3 md:px-4 pb-4">
        <div className="max-w-5xl mx-auto rounded-2xl border border-soft-border bg-white shadow-sm overflow-hidden">
          <CompanyKYCForm onClose={() => router.push('/managers-dashboard')} />
        </div>
      </div>
    </main>
  );
}
