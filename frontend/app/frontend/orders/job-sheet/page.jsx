'use client';

import Link from 'next/link';

export default function JobSheetPage() {
  return (
    <main className="min-h-screen bg-cloud-gray p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/orders" className="text-sm text-trust-blue hover:underline">
            ← Back to Orders
          </Link>
          <h1 className="text-3xl font-bold text-midnight-ink mt-3">Job Sheet</h1>
          <p className="text-base text-cool-gray mt-2">View and manage job sheets</p>
        </div>
      </div>
    </main>
  );
}
