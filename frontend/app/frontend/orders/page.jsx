'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import MasterNavigationDrawer from '@/components/master_navigation_drawer';
import { CreateOrderForm } from '@/app/frontend/orders/create-job/page';
import { OrderSheetView } from '@/app/frontend/orders/job-sheet/page';
import { OrderProgressSheetView } from '@/app/frontend/orders/progress-sheet/page';
import { useSheetPermissions } from '@/hooks/use-sheet-permissions';
import DeletionHistoryDrawer from '@/components/deletion-history-drawer';

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const { canView, canCreate, loading: permsLoading } = useSheetPermissions('orders');
  const [showCreateOrderForm, setShowCreateOrderForm] = useState(false);
  const [showOrderSheet, setShowOrderSheet] = useState(false);
  const [showOrderProgressSheet, setShowOrderProgressSheet] = useState(false);
  const [autoPicklist, setAutoPicklist] = useState(null);
  const createOrderSectionRef = useRef(null);
  const orderSheetSectionRef = useRef(null);
  const orderProgressSectionRef = useRef(null);

  // Auto-open order sheet when navigated from invoice with ?view=orders&picklist=N
  useEffect(() => {
    if (!searchParams) return;
    const view = searchParams.get('view');
    const picklist = searchParams.get('picklist');
    if (view === 'orders') {
      setShowOrderSheet(true);
      setShowCreateOrderForm(false);
      setShowOrderProgressSheet(false);
      if (picklist) setAutoPicklist(Number(picklist));
    }
  }, [searchParams]);

  const scrollToSection = (ref) => {
    if (!ref?.current) return;
    const HEADER_OFFSET = 96;
    const targetTop =
      ref.current.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({
      top: Math.max(targetTop, 0),
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    if (!showCreateOrderForm || !createOrderSectionRef.current) return;
    requestAnimationFrame(() => scrollToSection(createOrderSectionRef));
  }, [showCreateOrderForm]);

  useEffect(() => {
    if (!showOrderSheet || !orderSheetSectionRef.current) return;
    requestAnimationFrame(() => scrollToSection(orderSheetSectionRef));
  }, [showOrderSheet]);

  useEffect(() => {
    if (!showOrderProgressSheet || !orderProgressSectionRef.current) return;
    requestAnimationFrame(() => scrollToSection(orderProgressSectionRef));
  }, [showOrderProgressSheet]);

  if (permsLoading) return <div className="min-h-screen bg-cloud-gray flex items-center justify-center"><div className="w-8 h-8 border-4 border-trust-blue border-t-transparent rounded-full animate-spin" /></div>;
  if (!canView) return <div className="min-h-screen bg-cloud-gray flex items-center justify-center"><div className="text-center"><h2 className="text-xl font-bold text-midnight-ink mb-2">Access Denied</h2><p className="text-cool-gray text-sm">You do not have permission to view this sheet. Contact your admin.</p></div></div>;

  return (
    <main className="min-h-screen bg-cloud-gray">
      <div className="transition-[left,width] duration-300 ease-in-out fixed top-0 left-0 right-0 z-[60] bg-white/95 py-2 border-b border-soft-border shadow-sm backdrop-blur px-3 md:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MasterNavigationDrawer inHeader />
            <h1 className="text-xl font-bold tracking-tight text-midnight-ink">ORDERS</h1>
          </div>
          <div />
        </div>
      </div>

      <div className="w-full px-0 pt-20 pb-8">
        <div className="mb-8 px-4 md:px-6">
          <p className="text-base text-cool-gray">Create and manage orders</p>
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4 md:px-6">
          {canCreate && (
            <button
              type="button"
              onClick={() => {
                setShowCreateOrderForm((prev) => !prev);
                setShowOrderSheet(false);
                setShowOrderProgressSheet(false);
              }}
              className="block text-left rounded-xl border border-soft-border bg-white p-6 hover:border-slate-text hover:shadow-md transition"
            >
              <h2 className="text-lg font-semibold text-midnight-ink">Create Order</h2>
              <p className="text-sm text-cool-gray mt-2">
                {showCreateOrderForm ? 'Hide order form' : 'Create a new order'}
              </p>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setShowOrderSheet((prev) => !prev);
              setShowCreateOrderForm(false);
              setShowOrderProgressSheet(false);
            }}
            className="block text-left rounded-xl border border-soft-border bg-white p-6 hover:border-slate-text hover:shadow-md transition"
          >
            <h2 className="text-lg font-semibold text-midnight-ink">Order Sheet</h2>
            <p className="text-sm text-cool-gray mt-2">
              {showOrderSheet ? 'Hide order sheet' : 'View and manage order sheets'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowOrderProgressSheet((prev) => !prev);
              setShowCreateOrderForm(false);
              setShowOrderSheet(false);
            }}
            className="block text-left rounded-xl border border-soft-border bg-white p-6 hover:border-slate-text hover:shadow-md transition"
          >
            <h2 className="text-lg font-semibold text-midnight-ink">Order Progress Sheet</h2>
            <p className="text-sm text-cool-gray mt-2">
              {showOrderProgressSheet ? 'Hide order progress sheet' : 'View order progress sheet'}
            </p>
          </button>
        </section>


        {showCreateOrderForm && (
          <section
            ref={createOrderSectionRef}
            className="mt-6 mx-4 md:mx-6 rounded-xl border border-soft-border bg-white p-4 md:p-6"
          >
            <CreateOrderForm embedded />
          </section>
        )}

        {showOrderSheet && (
          <section
            ref={orderSheetSectionRef}
            className="mt-6 rounded-none border-y border-soft-border bg-white p-0"
          >
            <OrderSheetView embedded defaultPicklistNum={autoPicklist} />
          </section>
        )}

        {showOrderProgressSheet && (
          <section
            ref={orderProgressSectionRef}
            className="mt-6 rounded-none border-y border-soft-border bg-white p-0"
          >
            <OrderProgressSheetView embedded />
          </section>
        )}
      </div>
      <DeletionHistoryDrawer appLabel="orders" modelName="order" />
    </main>
  );
}
