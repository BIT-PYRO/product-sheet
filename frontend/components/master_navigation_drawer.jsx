'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { House, LayoutDashboard, X } from 'lucide-react';

const NAV_LINKS = [
  { href: '/', permKey: 'product-sheet', label: 'Product Sheet', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/master-product-sheet', permKey: 'master-product-sheet', label: 'Master Product Sheet', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/master-inventory-sheet', permKey: 'master-inventory-sheet', label: 'Master Inventory Sheet', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/master-job-sheet', permKey: 'master-job-sheet', label: 'Master Job Sheet', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/master-workforce-sheet', permKey: 'master-workforce-sheet', label: 'Master Workforce Sheet', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/company-kyc', permKey: 'master-kyc-sheet', label: 'Company KYC Form', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/master-kyc-sheet', permKey: 'master-kyc-sheet', label: 'Master KYC Sheet', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/master-customer-sheet', permKey: 'master-customer-sheet', label: 'Master Customer Sheet', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/managers-dashboard', permKey: 'managers-dashboard', label: 'Managers Dashboard', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/orders', permKey: 'orders', label: 'Orders', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/enrol-workforce', permKey: 'enrol-workforce', label: 'Enroll Workforce', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/enrol-customer', permKey: 'enrol-customer', label: 'Enroll Customer', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/designer-sheet', permKey: 'designer-sheet', label: 'Designer Sheet', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/master-designer-sheet', permKey: 'master-designer-sheet', label: 'Master Designer Sheet', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/finding-sheet', permKey: 'finding-sheet', label: 'Master Finding Sheet', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/finding-entry', permKey: 'finding-entry', label: 'Finding Sheet', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
  { href: '/drafts', permKey: 'drafts', label: 'Drafts', className: 'bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20' },
];

export default function MasterNavigationDrawer({ inHeader = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [myPerms, setMyPerms] = useState(null); // null = admin/full access

  const handleClose = () => setIsOpen(false);

  // canAccess returns true if the user has view permission for the given permKey
  function canAccess(permKey) {
    if (myPerms === null) return true;
    return myPerms?.sheets?.[permKey]?.view === true;
  }

  useEffect(() => {
    setIsMounted(true);
    // Fetch the current user's permissions once on mount
    (async () => {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) return;
        const u = data.user;
        if (u?.role === 'admin' || u?.is_superuser) {
          setMyPerms(null); // full access for admins/superusers
          return;
        }
        const email = (u?.email || '').toLowerCase();
        if (!email) return;
        const wfRes = await fetch(`/api/workforce-me?email=${encodeURIComponent(email)}`, { cache: 'no-store' });
        const wfData = await wfRes.json().catch(() => null);
        const list = Array.isArray(wfData?.data) ? wfData.data
          : Array.isArray(wfData?.data?.results) ? wfData.data.results
          : Array.isArray(wfData?.results) ? wfData.results : [];
        const match = list.find((m) => (m.email || '').toLowerCase() === email);
        if (!match) { setMyPerms(null); return; }
        const des = (match.designation || '').toLowerCase().trim();
        const isSuperDesig = des === 'chairman' || des === 'ceo';
        setMyPerms(isSuperDesig ? null : (match.permissions || {}));
      } catch {
        setMyPerms(null); // fail open on error
      }
    })();
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

              {NAV_LINKS.map((item) => {
                const accessible = canAccess(item.permKey);
                if (!accessible) {
                  return (
                    <div
                      key={item.href}
                      title="You don't have access to this module. Contact your admin."
                      className="w-full mb-4 px-4 py-3 text-base font-semibold rounded block text-center bg-gray-50 border border-gray-200 text-gray-400 cursor-not-allowed select-none opacity-60"
                    >
                      {item.label}
                    </div>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleClose}
                    className={`w-full mb-4 px-4 py-3 text-base font-semibold rounded transition-colors block text-center ${item.className}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
