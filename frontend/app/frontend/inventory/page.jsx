'use client';

import Link from 'next/link';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';

const INVENTORY_BUTTONS = [
  { href: '/inventory/product-inventory', title: 'Product inventory', subtitle: 'Track and manage final product stock' },
  { href: '#', title: 'Stone inventory', subtitle: 'View and update stone stock balances' },
  { href: '#', title: 'Finding inventory', subtitle: 'Monitor findings stock and movement' },
  { href: '/inventory/others', title: 'Others', subtitle: 'Manage consumables and purchased items stock' },
  { href: '/inventory/tools', title: 'Tools', subtitle: 'Track tools by department and purchase value' },
];

export default function InventoryPage() {
  return (
    <main className="min-h-screen bg-cloud-gray">
      <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-xl font-bold tracking-tight text-midnight-ink">INVENTORY</h1>
          </div>
          <div />
        </div>
      </div>

      <div className="w-full px-4 md:px-6 pt-20 pb-8">
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
        </section>
      </div>
    </main>
  );
}
