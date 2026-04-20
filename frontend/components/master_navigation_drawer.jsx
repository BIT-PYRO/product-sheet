'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { House, LayoutDashboard, X, ChevronDown, ChevronRight } from 'lucide-react';

const NAV_GROUPS = [
  {
    label: 'Sheets',
    items: [
      { href: '/product-sheet', permKey: 'product-sheet', label: 'Product Sheet' },
      { href: '/designer-sheet', permKey: 'designer-sheet', label: 'Designer Sheet' },
      { href: '/finding-entry', permKey: 'finding-entry', label: 'Findings Sheet' },
    ],
  },
  {
    label: 'Master Sheets',
    items: [
      { href: '/master-product-sheet', permKey: 'master-product-sheet', label: 'Master Product Sheet' },
      { href: '/master-inventory-sheet', permKey: 'master-inventory-sheet', label: 'Master Inventory Sheet' },
      { href: '/master-designer-sheet', permKey: 'master-designer-sheet', label: 'Master Designer Sheet' },
      { href: '/master-workforce-sheet', permKey: 'master-workforce-sheet', label: 'Master Workforce Sheet' },
      { href: '/finding-sheet', permKey: 'finding-sheet', label: 'Master Findings Sheet' },
      { href: '/master-job-sheet', permKey: 'master-job-sheet', label: 'Master Job Sheet' },
      { href: '/master-kyc-sheet', permKey: 'master-kyc-sheet', label: 'Master KYC Sheet' },
      { href: '/master-customer-sheet', permKey: 'master-customer-sheet', label: 'Master Customer Sheet' },
    ],
  },
  {
    label: 'Forms',
    items: [
      { href: '/enrol-workforce', permKey: 'enrol-workforce', label: 'Enroll Workforce' },
      { href: '/enrol-customer', permKey: 'enrol-customer', label: 'Enroll Customer' },
      { href: '/company-kyc', permKey: 'master-kyc-sheet', label: 'Company KYC Form' },
    ],
  },
  {
    label: 'Others',
    items: [
      { href: '/managers-dashboard', permKey: 'managers-dashboard', label: 'Managers Dashboard' },
      {
        href: '/orders',
        permKey: 'orders',
        label: 'Orders',
        subItems: [
          { href: '/orders', label: 'Create Order' },
          { href: '/orders', label: 'Order Sheet' },
          { href: '/orders', label: 'Order Progress Sheet' },
        ],
      },
      {
        href: '/inventory',
        permKey: 'inventory',
        label: 'Inventory',
        subItems: [
          { href: '/inventory/product-inventory', label: 'Product Inventory' },
          { href: '/inventory/stone-inventory',   label: 'Stone Inventory' },
          { href: '/inventory/finding-inventory', label: 'Finding Inventory' },
          { href: '/inventory/die-inventory',     label: 'Die Inventory' },
          { href: '/inventory/others',            label: 'Others' },
          { href: '/inventory/tools',             label: 'Tools' },
          { href: '/inventory/machines',          label: 'Machines' },
          { href: '/inventory/stock-log',         label: 'Stock Log' },
          { href: '/inventory/stone-log',         label: 'Stone Log' },
          { href: '/inventory/product-log',       label: 'Jewel Logs' },
          { href: '/inventory/low-stock',         label: 'Low Stock' },
        ],
      },
      {
        href: '/drafts',
        permKey: 'drafts',
        label: 'Drafts',
        subItems: [
          { href: '/drafts', label: 'Create Job' },
          { href: '/drafts', label: 'Create Order' },
          { href: '/drafts', label: 'Enroll Workforce' },
          { href: '/drafts', label: 'Quick Enroll' },
          { href: '/drafts', label: 'KYC Form' },
        ],
      },
      {
        href: '/accountancy',
        permKey: 'accountancy',
        label: 'Accountancy',
        subItems: [
          { href: '/accountancy', label: 'Journal Entry' },
          { href: '/accountancy', label: 'Ledger Summary' },
          { href: '/accountancy', label: 'Trial Balance' },
          { href: '/accountancy', label: 'Profit & Loss' },
          { href: '/accountancy', label: 'Balance Sheet' },
        ],
      },
    ],
  },
];

function NavItem({ item, canAccess, onClose }) {
  const [hovered, setHovered] = useState(false);
  const accessible = canAccess(item.permKey);

  if (item.subItems) {
    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="flex flex-col"
      >
        {accessible ? (
          <Link
            href={item.href}
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium rounded transition-colors flex items-center justify-between bg-trust-blue/5 border border-trust-blue/40 text-deep-blue hover:bg-trust-blue/20 hover:border-trust-blue"
          >
            <span>{item.label}</span>
            <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${hovered ? 'rotate-90' : ''}`} />
          </Link>
        ) : (
          <div
            title="You don't have access to this module. Contact your admin."
            className="px-4 py-2.5 text-sm font-medium rounded flex items-center justify-between bg-gray-50 border border-gray-200 text-gray-400 cursor-not-allowed select-none opacity-60"
          >
            <span>{item.label}</span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          </div>
        )}
        <div
          className={`overflow-hidden transition-all duration-200 ${
            hovered ? 'max-h-[500px] opacity-100 mt-1' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="pl-4 flex flex-col gap-1">
            {item.subItems.map((sub) => (
              <Link
                key={sub.href + sub.label}
                href={sub.href}
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium rounded transition-colors block bg-cloud-gray/60 border border-soft-border text-midnight-ink hover:bg-trust-blue/10 hover:border-trust-blue/40"
              >
                {sub.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!accessible) {
    return (
      <div
        title="You don't have access to this module. Contact your admin."
        className="px-4 py-2.5 text-sm font-medium rounded block text-center bg-gray-50 border border-gray-200 text-gray-400 cursor-not-allowed select-none opacity-60"
      >
        {item.label}
      </div>
    );
  }
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className="px-4 py-2.5 text-sm font-medium rounded transition-colors block text-center bg-trust-blue/5 border border-trust-blue/40 text-deep-blue hover:bg-trust-blue/20 hover:border-trust-blue"
    >
      {item.label}
    </Link>
  );
}

function NavGroup({ group, canAccess, onClose }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className="mb-3"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-base font-semibold rounded bg-trust-blue/10 border border-trust-blue text-deep-blue hover:bg-trust-blue/20 transition-colors"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
      >
        <span>{group.label}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          isExpanded ? 'max-h-[1200px] opacity-100 mt-1' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="pl-3 flex flex-col gap-1.5">
          {group.items.map((item) => (
            <NavItem key={item.href + item.label} item={item} canAccess={canAccess} onClose={onClose} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MasterNavigationDrawer({ inHeader = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [myPerms, setMyPerms] = useState(null); // null = admin/full access

  const handleClose = () => setIsOpen(false);

  // canAccess returns true if the user has any permission for the given permKey
  function canAccess(permKey) {
    if (myPerms === null) return true;
    const p = myPerms?.sheets?.[permKey];
    if (!p) return false;
    return !!(p.view || p.edit || p.create || p.export || p.amount);
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
      <div className={inHeader ? 'inline-flex items-center gap-1.5' : 'contents'}>
        <button
          onClick={() => setIsOpen(true)}
          className={dashboardButtonClass}
          aria-label="Open dashboard"
          suppressHydrationWarning
        >
          <LayoutDashboard className="h-5 w-5 text-midnight-ink" />
        </button>
        {inHeader && (
          <Link
            href="/home"
            className="h-11 w-11 border-2 border-midnight-ink bg-white rounded hover:bg-cloud-gray transition-colors shadow-sm inline-flex items-center justify-center"
            aria-label="Go to home"
          >
            <House className="h-5 w-5 text-midnight-ink" />
          </Link>
        )}
      </div>

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

              {NAV_GROUPS.map((group) => (
                <NavGroup
                  key={group.label}
                  group={group}
                  canAccess={canAccess}
                  onClose={handleClose}
                />
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
