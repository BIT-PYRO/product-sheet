'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { House, LayoutDashboard, X } from 'lucide-react';

const NAV_LINKS = [
  { href: '/', label: 'Product Sheet', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/master-product-sheet', label: 'Master Product Sheet', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/master-inventory-sheet', label: 'Master Inventory Sheet', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/master-job-sheet', label: 'Master Job Sheet', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/master-workforce-sheet', label: 'Master Workforce Sheet', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/company-kyc', label: 'Company KYC Form', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/master-kyc-sheet', label: 'Master KYC Sheet', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/master-customer-sheet', label: 'Master Customer Sheet', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/managers-dashboard', label: 'Managers Dashboard', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/orders', label: 'Orders', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/enrol-workforce', label: 'Enrol Workforce', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/enrol-customer', label: 'Enrol Customer', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/designer-sheet', label: 'Designer Sheet', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/master-designer-sheet', label: 'Master Designer Sheet', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/finding-sheet', label: 'Master Finding Sheet', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/finding-entry', label: 'Finding Sheet', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/drafts', label: 'Drafts', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
];

export default function MasterNavigationDrawer({ inHeader = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const handleClose = () => setIsOpen(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const dashboardButtonClass = inHeader
    ? 'h-11 w-11 border-2 border-midnight-ink bg-white rounded hover:bg-cloud-gray transition-colors shadow-sm inline-flex items-center justify-center'
    : 'fixed top-4 left-4 z-50 p-2 border-2 border-midnight-ink bg-white rounded hover:bg-cloud-gray transition-colors';

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={dashboardButtonClass}
        aria-label="Open dashboard"
        suppressHydrationWarning
      >
        <LayoutDashboard className="h-5 w-5 text-midnight-ink" />
      </button>

      {isMounted && createPortal(
        <>
          {isOpen && (
            <div
              className="fixed top-[60px] left-0 right-0 bottom-0 z-40 bg-black bg-opacity-50"
              onClick={handleClose}
            />
          )}

          <div
            className={`fixed top-[60px] left-0 h-[calc(100vh-60px)] w-80 bg-white border-r-2 border-soft-border transform transition-transform duration-300 z-50 overflow-y-auto ${
              isOpen
                ? 'translate-x-0 shadow-lg pointer-events-auto'
                : '-translate-x-[110%] shadow-none pointer-events-none'
            }`}
          >
            <div className="p-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Dashboard</h2>
                <div className="flex items-center gap-2">
                  <Link
                    href="/home"
                    onClick={handleClose}
                    className="p-1.5 hover:bg-cloud-gray rounded-full border border-soft-border"
                    aria-label="Go to home"
                  >
                    <House className="h-4 w-4 text-midnight-ink" />
                  </Link>
                  <button
                    onClick={handleClose}
                    className="p-1 hover:bg-cloud-gray rounded"
                    aria-label="Close dashboard"
                    suppressHydrationWarning
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleClose}
                  className={`w-full mb-4 px-4 py-3 text-base font-semibold rounded transition-colors block text-center ${item.className}`}
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
