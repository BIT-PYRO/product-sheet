'use client';

import Link from 'next/link';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import { House } from 'lucide-react';

export default function OrdersPage() {
  return (
    <main className="min-h-screen bg-cloud-gray">
      <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MasterNavigationDrawer inHeader />
            <Link
              href="/home"
              className="inline-flex items-center gap-2 rounded-lg border border-soft-border bg-white px-3 py-2 text-sm font-medium text-midnight-ink hover:bg-slate-50 transition-colors"
            >
              <House className="h-4 w-4" />
              Home
            </Link>
            <h1 className="text-xl font-bold tracking-tight text-midnight-ink">ORDERS</h1>
          </div>
          <div />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-20 pb-8">
        <div className="mb-8">
          <p className="text-base text-cool-gray">Create and manage orders</p>
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/orders/create-job"
            className="block rounded-xl border border-soft-border bg-white p-6 hover:border-trust-blue hover:shadow-md transition"
          >
            <h2 className="text-lg font-semibold text-midnight-ink">Create Order</h2>
            <p className="text-sm text-cool-gray mt-2">Create a new order</p>
          </Link>

          <Link
            href="/orders/job-sheet"
            className="block rounded-xl border border-soft-border bg-white p-6 hover:border-trust-blue hover:shadow-md transition"
          >
            <h2 className="text-lg font-semibold text-midnight-ink">Order Sheet</h2>
            <p className="text-sm text-cool-gray mt-2">View and manage order sheets</p>
          </Link>
        </section>
      </div>
    </main>
  );
}
