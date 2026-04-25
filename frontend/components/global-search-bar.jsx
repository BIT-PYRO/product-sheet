'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ArrowRight } from 'lucide-react';

const SHEET_BLOCKS = [
  { href: '/frontend/master-product-sheet', title: 'Master Product Sheet', subtitle: 'All product records', keywords: ['sku', 'product', 'records', 'all products', 'listing', 'master'] },
  { href: '/frontend/master-inventory-sheet', title: 'Master Inventory Sheet', subtitle: 'Live stock and final stock', keywords: ['inventory', 'stock', 'live stock', 'final stock', 'quantity', 'master'] },
  { href: '/frontend/enrol-customer', title: 'Enroll Customer', subtitle: 'Customer entry form', keywords: ['customer', 'enroll', 'client', 'onboard', 'new customer', 'buyer', 'phone', 'contact'] },
  { href: '/frontend/master-customer-sheet', title: 'Master Customer Sheet', subtitle: 'Customer records and details', keywords: ['customer', 'records', 'clients', 'details', 'master', 'buyer'] },
  { href: '/frontend/master-kyc-sheet', title: 'Master KYC Sheet', subtitle: 'Company KYC records', keywords: ['kyc', 'know your customer', 'company', 'verification', 'documents', 'gst', 'pan', 'aadhar'] },
  { href: '/frontend/master-workforce-sheet', title: 'Master Workforce Sheet', subtitle: 'Workforce records', keywords: ['workforce', 'worker', 'employee', 'staff', 'records', 'master', 'craftsMan'] },
  { href: '/frontend/master-job-sheet', title: 'Master Job Sheet', subtitle: 'Job master data', keywords: ['job', 'work order', 'task', 'assignment', 'master', 'job card'] },
  { href: '/frontend/managers-dashboard', title: 'Managers Dashboard', subtitle: 'Manager view and job cards', keywords: ['manager', 'dashboard', 'job cards', 'overview', 'manage', 'admin'] },
  { href: '/frontend/drafts', title: 'Drafts', subtitle: 'View and load saved drafts', keywords: ['draft', 'saved', 'pending', 'resume', 'incomplete', 'continue'] },
  { href: '/frontend/orders', title: 'Orders', subtitle: 'Create and manage job orders', keywords: ['order', 'job order', 'manage orders', 'create order', 'dispatch'] },
  { href: '/frontend/home', title: 'Home', subtitle: 'Home dashboard', keywords: ['home', 'dashboard', 'welcome'] },
];

export default function GlobalSearchBar() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef(null);

  // Live data cache — fetched once on first search focus
  const [liveData, setLiveData] = useState({ products: [], customers: [], workforce: [] });
  const [liveLoaded, setLiveLoaded] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);

  async function fetchLiveData() {
    if (liveLoaded || liveLoading) return;
    setLiveLoading(true);
    try {
      const [prodRes, custRes, wfRes] = await Promise.all([
        fetch('/api/products', { cache: 'no-store' }),
        fetch('/api/customers', { cache: 'no-store' }),
        fetch('/api/workforce', { cache: 'no-store' }),
      ]);
      const [prodData, custData, wfData] = await Promise.all([
        prodRes.json().catch(() => ({})),
        custRes.json().catch(() => ({})),
        wfRes.json().catch(() => ({})),
      ]);
      const extract = (d) =>
        Array.isArray(d?.data) ? d.data :
        Array.isArray(d?.data?.results) ? d.data.results : [];
      setLiveData({
        products: extract(prodData),
        customers: extract(custData),
        workforce: extract(wfData),
      });
      setLiveLoaded(true);
    } catch {
      // ignore — static results still shown
    } finally {
      setLiveLoading(false);
    }
  }

  const { sheetMatches, productMatches, customerMatches, workforceMatches } = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { sheetMatches: [], productMatches: [], customerMatches: [], workforceMatches: [] };

    const sheetMatches = SHEET_BLOCKS.filter(block =>
      block.title.toLowerCase().includes(q) ||
      block.subtitle.toLowerCase().includes(q) ||
      (block.keywords || []).some(k => k.toLowerCase().includes(q))
    );

    const productMatches = liveData.products.filter(p =>
      (p.master_sku || '').toLowerCase().includes(q) ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    ).slice(0, 8);

    const customerMatches = liveData.customers.filter(c =>
      (c.company_name || '').toLowerCase().includes(q) ||
      (c.authorized_person_name || '').toLowerCase().includes(q) ||
      (c.mobile || '').toLowerCase().includes(q) ||
      (c.city || '').toLowerCase().includes(q)
    ).slice(0, 6);

    const workforceMatches = liveData.workforce.filter(w =>
      (w.full_name || '').toLowerCase().includes(q) ||
      (w.phone || '').toLowerCase().includes(q)
    ).slice(0, 6);

    return { sheetMatches, productMatches, customerMatches, workforceMatches };
  })();

  const totalResults = sheetMatches.length + productMatches.length + customerMatches.length + workforceMatches.length;

  function handleSheetClick(block) {
    setSearchQuery('');
    setIsSearchOpen(false);
    router.push(block.href);
  }

  function handleRecordClick(href) {
    setSearchQuery('');
    setIsSearchOpen(false);
    router.push(href);
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative flex-1 max-w-sm" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cool-gray pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setIsSearchOpen(true); }}
          onFocus={() => { setIsSearchOpen(true); fetchLiveData(); }}
          placeholder="Search sheets, products, customers…"
          className="w-full h-9 pl-9 pr-8 text-sm rounded-lg border border-soft-border bg-white focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent placeholder-slate-400 transition"
        />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cool-gray hover:text-midnight-ink transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {liveLoading && (
          <span className="absolute right-7 top-1/2 -translate-y-1/2 text-[10px] text-cool-gray animate-pulse">loading…</span>
        )}
      </div>

      {isSearchOpen && searchQuery.trim() && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-soft-border shadow-2xl z-[70] overflow-hidden">
          {totalResults === 0 ? (
            <div className="px-4 py-5 text-center text-sm text-cool-gray">
              No results for <span className="font-semibold text-midnight-ink">&ldquo;{searchQuery}&rdquo;</span>
            </div>
          ) : (
            <div className="py-1 max-h-[360px] overflow-y-auto">

              {sheetMatches.length > 0 && (
                <>
                  <div className="px-4 pt-2 pb-1">
                    <span className="text-[10px] font-bold tracking-widest text-cool-gray uppercase">Navigation</span>
                  </div>
                  {sheetMatches.map((block, idx) => (
                    <button
                      key={block.href + idx}
                      onClick={() => handleSheetClick(block)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-cloud-gray text-left transition group"
                    >
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-trust-blue/10 text-trust-blue text-[10px] font-bold shrink-0">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-midnight-ink">{block.title}</p>
                        <p className="text-xs text-cool-gray">{block.subtitle}</p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-cool-gray group-hover:text-trust-blue transition shrink-0" />
                    </button>
                  ))}
                </>
              )}

              {productMatches.length > 0 && (
                <>
                  <div className={`px-4 pb-1 ${sheetMatches.length > 0 ? 'pt-2 border-t border-soft-border' : 'pt-2'}`}>
                    <span className="text-[10px] font-bold tracking-widest text-cool-gray uppercase">Products</span>
                  </div>
                  {productMatches.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleRecordClick('/frontend/master-product-sheet')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-cloud-gray text-left transition group"
                    >
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold shrink-0">P</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-midnight-ink truncate">{p.name || p.master_sku}</p>
                        <p className="text-xs text-cool-gray">Master SKU: {p.master_sku}{p.category ? ` · ${p.category}` : ''}</p>
                      </div>
                      <span className="text-[10px] text-cool-gray shrink-0">Master Product Sheet</span>
                    </button>
                  ))}
                </>
              )}

              {customerMatches.length > 0 && (
                <>
                  <div className={`px-4 pb-1 ${(sheetMatches.length + productMatches.length) > 0 ? 'pt-2 border-t border-soft-border' : 'pt-2'}`}>
                    <span className="text-[10px] font-bold tracking-widest text-cool-gray uppercase">Customers</span>
                  </div>
                  {customerMatches.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleRecordClick('/frontend/master-customer-sheet')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-cloud-gray text-left transition group"
                    >
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold shrink-0">C</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-midnight-ink truncate">{c.company_name}</p>
                        <p className="text-xs text-cool-gray">{[c.authorized_person_name, c.mobile, c.city].filter(Boolean).join(' · ')}</p>
                      </div>
                      <span className="text-[10px] text-cool-gray shrink-0">Master Customer Sheet</span>
                    </button>
                  ))}
                </>
              )}

              {workforceMatches.length > 0 && (
                <>
                  <div className={`px-4 pb-1 ${(sheetMatches.length + productMatches.length + customerMatches.length) > 0 ? 'pt-2 border-t border-soft-border' : 'pt-2'}`}>
                    <span className="text-[10px] font-bold tracking-widest text-cool-gray uppercase">Workforce</span>
                  </div>
                  {workforceMatches.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => handleRecordClick('/frontend/master-workforce-sheet')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-cloud-gray text-left transition group"
                    >
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold shrink-0">W</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-midnight-ink truncate">{w.full_name}</p>
                        <p className="text-xs text-cool-gray">{w.phone || (w.active ? 'Active' : 'Inactive')}</p>
                      </div>
                      <span className="text-[10px] text-cool-gray shrink-0">Master Workforce Sheet</span>
                    </button>
                  ))}
                </>
              )}

            </div>
          )}
        </div>
      )}
    </div>
  );
}
