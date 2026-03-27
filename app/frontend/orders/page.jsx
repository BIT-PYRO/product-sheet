'use client';

import Link from 'next/link';

export default function OrdersPage() {
  return (
    <main className="min-h-screen bg-cloud-gray p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/home" className="text-sm text-trust-blue hover:underline">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-midnight-ink mt-3">Orders</h1>
          <p className="text-base text-cool-gray mt-2">Create and manage orders</p>
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
