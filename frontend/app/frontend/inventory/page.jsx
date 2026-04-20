'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import GlobalSearchBar from '@/components/global-search-bar';
import DateTimeStamp from '@/components/date-time-stamp';

const INVENTORY_BUTTONS = [
  { href: '/inventory/product-inventory', title: 'Product inventory', subtitle: 'Track and manage final product stock' },
  { href: '/inventory/stone-inventory', title: 'Stone inventory', subtitle: 'View and update stone stock balances' },
  { href: '/inventory/finding-inventory', title: 'Finding inventory', subtitle: 'Monitor findings stock and movement' },
  { href: '/inventory/others', title: 'Others', subtitle: 'Manage consumables and purchased items stock' },
  { href: '/inventory/tools', title: 'Tools', subtitle: 'Track tools by department and purchase value' },
  { href: '/inventory/machines',   title: 'Machines',   subtitle: 'Track machine stock and condition-wise availability' },
  { href: '/inventory/stock-log', title: 'Stock Log', subtitle: 'Tools, machinery & others received/issued movement log' },
  { href: '/inventory/stone-log', title: 'Stone Log', subtitle: 'Stone inventory received/issued movement log' },
  { href: '/inventory/product-log', title: 'Product & Finding Log', subtitle: 'Product and finding inventory received/issued movement log' },
];

export default function InventoryPage() {
  const [pendingCount, setPendingCount] = useState(null);

  useEffect(() => {
    async function fetchPending() {
      try {
        const res = await fetch('/api/issue-requests?status=pending&page_size=500');
        if (!res.ok) return;
        const data = await res.json();
        const rows = data?.data?.results ?? data?.data ?? data?.results ?? [];
        setPendingCount(rows.length);
      } catch { /* non-fatal */ }
    }
    fetchPending();
  }, []);

  const hasAlert = pendingCount > 0;

  return (
    <main className="min-h-screen bg-cloud-gray">
      <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-xl font-bold tracking-tight text-midnight-ink">INVENTORY</h1>
          </div>
          <GlobalSearchBar />
          <DateTimeStamp />
        </div>
      </div>

      <div className="w-full px-3 md:px-4 pt-16 pb-16">
        <div className="mb-6">
          <p className="text-base text-cool-gray">Select an inventory section</p>
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {INVENTORY_BUTTONS.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="block text-left rounded-xl border border-soft-border bg-white p-6 hover:border-trust-blue hover:shadow-md transition"
            >
              <h2 className="text-lg font-semibold text-midnight-ink">{item.title}</h2>
              <p className="text-sm text-cool-gray mt-2">{item.subtitle}</p>
            </Link>
          ))}

          {/* Low Stock – shows pending issue request count */}
          <Link
            href="/inventory/low-stock"
            className={`block text-left rounded-xl p-6 hover:shadow-md transition ${
              hasAlert
                ? 'border-2 border-amber-400 bg-amber-50 hover:border-amber-500'
                : 'border border-soft-border bg-white hover:border-trust-blue'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {hasAlert && <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />}
              <h2 className={`text-lg font-semibold ${hasAlert ? 'text-amber-800' : 'text-midnight-ink'}`}>Low Stock</h2>
              {pendingCount !== null && pendingCount > 0 && (
                <span className="ml-auto text-xs font-bold bg-amber-400 text-white rounded-full px-2 py-0.5 shrink-0">
                  {pendingCount} pending
                </span>
              )}
            </div>
            <p className={`text-sm ${hasAlert ? 'text-amber-700' : 'text-cool-gray'}`}>
              View low-stock alerts across all inventories and fulfill orders
            </p>
          </Link>
        </section>
      </div>
    </main>
  );
}
