'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { House, LayoutDashboard, X } from 'lucide-react';

const NAV_LINKS = [
  { href: '/home', label: 'Home', className: 'bg-slate-700 hover:bg-slate-800' },
  { href: '/', label: 'Product Sheet', className: 'bg-green-600 hover:bg-green-700' },
  { href: '/master-job-sheet', label: 'Master Job Sheet', className: 'bg-yellow-500 hover:bg-yellow-600' },
  { href: '/master-product-sheet', label: 'Master Product Sheet', className: 'bg-teal-500 hover:bg-teal-600' },
  { href: '/master-inventory-sheet', label: 'Master Inventory Sheet', className: 'bg-lime-600 hover:bg-lime-700' },
  { href: '/master-workforce-sheet', label: 'Master Workforce Sheet', className: 'bg-orange-500 hover:bg-orange-600' },
  { href: '/master-kyc-sheet', label: 'Master KYC Sheet', className: 'bg-indigo-600 hover:bg-indigo-700' },
  { href: '/master-customer-sheet', label: 'Master Customer Sheet', className: 'bg-cyan-600 hover:bg-cyan-700' },
  { href: '/managers-dashboard', label: 'Managers Dashboard', className: 'bg-blue-500 hover:bg-blue-600' },
  { href: '/drafts', label: 'Drafts', className: 'bg-purple-600 hover:bg-purple-700' },
];

export default function MasterNavigationDrawer({ inHeader = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const handleClose = () => setIsOpen(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const dashboardButtonClass = inHeader
    ? 'p-2 border-2 border-black bg-white rounded hover:bg-gray-100 transition-colors shadow-sm'
    : 'fixed top-4 left-4 z-50 p-2 border-2 border-black bg-white rounded hover:bg-gray-100 transition-colors';

  const homeButtonClass = inHeader
    ? 'inline-flex items-center gap-2 px-3 py-2 border-2 border-black bg-white rounded text-sm font-semibold text-black hover:bg-gray-100 transition-colors shadow-sm'
    : 'fixed top-4 left-16 z-50 inline-flex items-center gap-2 border-2 border-black bg-white rounded px-3 py-2 text-sm font-semibold text-black hover:bg-gray-100 transition-colors';

  return (
    <>
      <div className={inHeader ? 'flex items-center gap-3' : undefined}>
        <button
          onClick={() => setIsOpen(true)}
          className={dashboardButtonClass}
          aria-label="Open dashboard"
        >
          <LayoutDashboard className="h-5 w-5 text-black" />
        </button>

        <Link
          href="/home"
          className={homeButtonClass}
          aria-label="Go to home"
        >
          <House className="h-4 w-4" />
          Home
        </Link>
      </div>

      {isMounted && createPortal(
        <>
          {isOpen && (
            <div
              className="fixed inset-0 z-40 bg-black bg-opacity-50"
              onClick={handleClose}
            />
          )}

          <div
            className={`fixed top-0 left-0 h-screen w-80 bg-white border-r-2 border-gray-300 transform transition-transform duration-300 z-50 overflow-y-auto ${
              isOpen
                ? 'translate-x-0 shadow-lg pointer-events-auto'
                : '-translate-x-[110%] shadow-none pointer-events-none'
            }`}
          >
            <div className="p-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Dashboard</h2>
                <button
                  onClick={handleClose}
                  className="p-1 hover:bg-gray-200 rounded"
                  aria-label="Close dashboard"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleClose}
                  className={`w-full mb-4 px-4 py-3 text-sm text-white font-semibold rounded transition-colors block text-center ${item.className}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
