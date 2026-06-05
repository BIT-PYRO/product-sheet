'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { EnrolWorkforceForm } from '@/app/frontend/enrol-workforce/page';
import { GenericJobModal } from '@/components/generic-job-modal';
import DateTimeStamp from '@/components/date-time-stamp';
import { Search, X, ArrowRight, User, Users, Settings, ChevronRight, KeyRound, ShieldCheck } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { useEntitlements } from '@/contexts/EntitlementContext';
import { UpgradeModal } from '@/components/UpgradeModal';
import { Lock } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState('User');
  const [userInfo, setUserInfo] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [isEnrollWorkforceOpen, setIsEnrollWorkforceOpen] = useState(false);
  const [isGenericJobModalOpen, setIsGenericJobModalOpen] = useState(false);
  const [enrollStatusMessage, setEnrollStatusMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [myDesignation, setMyDesignation] = useState('');
  const searchRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const userInfoRef = useRef(null);

  const { features, hasFeature } = useEntitlements();
  const [selectedFeatureToUnlock, setSelectedFeatureToUnlock] = useState(null);

  // Live data cache — fetched once on first search focus
  const [myPerms, setMyPerms] = useState(null); // null = not yet loaded
  const [permsReady, setPermsReady] = useState(false);

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

  // Compute results grouped by type
  const { sheetMatches, productMatches, customerMatches, workforceMatches } = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { sheetMatches: [], productMatches: [], customerMatches: [], workforceMatches: [] };

    const sheetMatches = features.filter(block =>
      (block.name || '').toLowerCase().includes(q) ||
      (block.description || '').toLowerCase().includes(q)
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
    if (block.href === '/enrol-workforce') {
      setIsEnrollWorkforceOpen(true);
    } else if (!block.href.startsWith('#')) {
      router.push(block.href);
    }
  }

  function handleRecordClick(href) {
    setSearchQuery('');
    setIsSearchOpen(false);
    router.push(href);
  }

  async function fetchMyWorkforceProfile(u) {
    try {
      const email = (u?.email || '').toLowerCase();
      const key = `profile_photo_${u?.username || u?.id}`;
      const wfRes = await fetch(`/api/workforce-me?email=${encodeURIComponent(email)}`, { cache: 'no-store' });
      const wfData = await wfRes.json().catch(() => null);
      const list = Array.isArray(wfData?.data) ? wfData.data
        : Array.isArray(wfData?.data?.results) ? wfData.data.results
        : Array.isArray(wfData?.results) ? wfData.results : [];
      const match = list.find(m => (m.email || '').toLowerCase() === email);
      if (match) {
        if (match.full_name) setUsername(match.full_name);
        if (match.profile_photo_url) {
          setProfilePhoto(match.profile_photo_url);
          localStorage.setItem(key, match.profile_photo_url);
        }
        const des = (match.designation || '').toLowerCase().trim();
        setMyDesignation(match.designation || '');
        const isSuperDesig = des === 'chairman' || des === 'ceo';
        setMyPerms(isSuperDesig ? null : (match.permissions || {}));
      } else {
        setMyPerms(null);
      }
    } catch {
      setMyPerms(null);
    }
  }

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
        const result = await response.json();

        if (response.status === 401) {
          router.replace('/login');
          return;
        }
        if (!response.ok || !result.success) { return; }

        const u = result.user;
        const fullName = [u?.first_name, u?.last_name].filter(Boolean).join(' ');
        setUsername(fullName || u?.username || u?.id || 'User');
        setUserInfo(u);
        userInfoRef.current = u;
        // Profile photo: start with localStorage for instant display
        const key = `profile_photo_${u?.username || u?.id}`;
        const saved = localStorage.getItem(key);
        if (saved) setProfilePhoto(saved);

        // Fetch this user's workforce permissions (skip for admins — they see everything)
        if (u?.role === 'admin' || u?.is_superuser) {
          setMyPerms(null); // null = show all
          setPermsReady(true);
        } else {
          await fetchMyWorkforceProfile(u);
          setPermsReady(true);
        }
      } catch {
        // Network error — fail silently, user stays on page
      }
    };

    loadSession();
  }, [router]);

  // Listen for profile photo updates from the profile page
  useEffect(() => {
    function onPhotoUpdated(e) {
      setProfilePhoto(e.detail?.photo || null);
    }
    window.addEventListener('profile_photo_updated', onPhotoUpdated);
    return () => window.removeEventListener('profile_photo_updated', onPhotoUpdated);
  }, []);

  // Re-fetch name and photo whenever a workforce record is saved
  useEffect(() => {
    function onWorkforceUpdated() {
      if (userInfoRef.current) fetchMyWorkforceProfile(userInfoRef.current);
    }
    window.addEventListener('workforce-updated', onWorkforceUpdated);
    return () => window.removeEventListener('workforce-updated', onWorkforceUpdated);
  }, []);

  // myPerms === null → admin/superuser/no record → full access
  // myPerms is an object → accessible if ANY permission is granted
  function canAccess(permKey) {
    if (myPerms === null) return true;
    const p = myPerms?.sheets?.[permKey];
    if (!p) return false;
    return !!(p.view || p.edit || p.create || p.export || p.amount);
  }

  function getInitials() {
    const f = userInfo?.first_name?.[0] || '';
    const l = userInfo?.last_name?.[0] || '';
    if (f || l) return (f + l).toUpperCase();
    return (userInfo?.username || username)?.[0]?.toUpperCase() || '?';
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setIsProfileDropdownOpen(false);
        setIsSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
    }
  };

  return (
    <main className="min-h-screen bg-cloud-gray p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-midnight-ink">Home</h1>
            <p className="text-base text-cool-gray mt-2">
              Welcome,{' '}
              <Link
                href="/profile"
                className="font-bold text-trust-blue hover:underline underline-offset-2 transition"
              >
                {username}
              </Link>
              {userInfo?.is_superuser && (
                <sup className="ml-1 text-[10px] font-bold text-red-500 tracking-wide">superuser</sup>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <DateTimeStamp />
            <ThemeToggle />
            {/* User avatar — opens profile dropdown */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setIsProfileDropdownOpen(o => !o)}
                title="Account options"
                className="w-9 h-9 rounded-full border-2 border-trust-blue overflow-hidden flex items-center justify-center bg-trust-blue text-white text-sm font-bold hover:opacity-90 transition shrink-0"
                suppressHydrationWarning
              >
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span>{getInitials()}</span>
                )}
              </button>

              {/* Dropdown */}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-background rounded-xl border border-soft-border shadow-lg z-50 py-1 overflow-hidden">
                  <Link
                    href="/profile"
                    onClick={() => setIsProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-midnight-ink hover:bg-cloud-gray transition"
                  >
                    <User className="h-4 w-4 text-cool-gray" />
                    My Profile
                  </Link>
                  <a
                    href="/manage-members"
                    onClick={() => setIsProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-midnight-ink hover:bg-cloud-gray transition"
                  >
                    <Users className="h-4 w-4 text-cool-gray" />
                    Manage Members
                  </a>
                  <button
                    onClick={() => setIsSettingsOpen(o => !o)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-midnight-ink hover:bg-cloud-gray transition w-full text-left"
                    suppressHydrationWarning
                  >
                    <Settings className="h-4 w-4 text-cool-gray shrink-0" />
                    <span className="flex-1">Settings</span>
                    <ChevronRight className={`h-3.5 w-3.5 text-cool-gray transition-transform duration-150 ${isSettingsOpen ? 'rotate-90' : ''}`} />
                  </button>
                  {isSettingsOpen && (
                    <div className="border-l-2 border-trust-blue ml-4 mr-2 mb-1">
                      <a
                        href="/settings/account"
                        onClick={() => { setIsProfileDropdownOpen(false); setIsSettingsOpen(false); }}
                        className="flex items-center gap-2.5 pl-4 pr-2 py-2 text-sm text-midnight-ink hover:bg-cloud-gray transition rounded-r-lg"
                      >
                        <KeyRound className="h-3.5 w-3.5 text-cool-gray shrink-0" />
                        Account Settings
                      </a>
                      {(userInfo?.is_superuser || ['ceo', 'chairman', 'director'].includes(myDesignation.toLowerCase().trim())) && (
                        <Link
                          href="/frontend/settings/api-keys"
                          onClick={() => { setIsProfileDropdownOpen(false); setIsSettingsOpen(false); }}
                          className="flex items-center gap-2.5 pl-4 pr-2 py-2 text-sm text-midnight-ink hover:bg-cloud-gray transition rounded-r-lg"
                        >
                          <KeyRound className="h-3.5 w-3.5 text-cool-gray shrink-0" />
                          API Keys
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <Button variant="outline" onClick={handleLogout} className="h-11 text-base font-semibold">Logout</Button>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative mb-8" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-cool-gray pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setIsSearchOpen(true); }}
              onFocus={() => { setIsSearchOpen(true); fetchLiveData(); }}
              placeholder="Search by name, SKU, customer, workforce, product…"
              className="w-full h-11 pl-10 pr-9 text-sm rounded-xl border border-soft-border bg-background text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-trust-blue focus:border-transparent placeholder-slate-400 transition"
              suppressHydrationWarning
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cool-gray hover:text-midnight-ink transition"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {liveLoading && (
              <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] text-cool-gray animate-pulse">loading…</span>
            )}
          </div>

          {/* Dropdown results */}
          {isSearchOpen && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-background rounded-xl border border-soft-border shadow-2xl z-50 overflow-hidden">
              {totalResults === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-cool-gray">
                  No results for <span className="font-semibold text-midnight-ink">&ldquo;{searchQuery}&rdquo;</span>
                </div>
              ) : (
                <div className="py-1 max-h-[380px] overflow-y-auto">

                  {/* Sheet Navigation Results */}
                  {sheetMatches.length > 0 && (
                    <>
                      <div className="px-4 pt-2 pb-1">
                        <span className="text-[10px] font-bold tracking-widest text-cool-gray uppercase">Navigation</span>
                      </div>
                      {sheetMatches.map((block, idx) => {
                        return (
                          <button
                            key={(block.route || block.feature_code) + idx}
                            onClick={() => handleSheetClick(block)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-cloud-gray text-left transition group"
                          >
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-trust-blue/10 text-trust-blue text-[10px] font-bold shrink-0">{idx + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-midnight-ink">{block.name}</p>
                              <p className="text-xs text-cool-gray">{block.description}</p>
                            </div>
                            <ArrowRight className="h-3 w-3 text-cool-gray group-hover:text-trust-blue transition shrink-0" />
                          </button>
                        );
                      })}
                    </>
                  )}

                  {/* Product Records */}
                  {productMatches.length > 0 && (
                    <>
                      <div className={`px-4 pb-1 ${sheetMatches.length > 0 ? 'pt-2 border-t border-soft-border' : 'pt-2'}`}>
                        <span className="text-[10px] font-bold tracking-widest text-cool-gray uppercase">Products</span>
                      </div>
                      {productMatches.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleRecordClick('/master-product-sheet')}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-cloud-gray text-left transition group"
                        >
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold shrink-0">P</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-midnight-ink truncate">{p.name || p.master_sku}</p>
                            <p className="text-xs text-cool-gray">SKU: {p.master_sku}{p.category ? ` · ${p.category}` : ''}</p>
                          </div>
                          <span className="text-[10px] text-cool-gray shrink-0">Master Product Sheet</span>
                        </button>
                      ))}
                    </>
                  )}

                  {/* Customer Records */}
                  {customerMatches.length > 0 && (
                    <>
                      <div className={`px-4 pb-1 ${(sheetMatches.length + productMatches.length) > 0 ? 'pt-2 border-t border-soft-border' : 'pt-2'}`}>
                        <span className="text-[10px] font-bold tracking-widest text-cool-gray uppercase">Customers</span>
                      </div>
                      {customerMatches.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleRecordClick('/master-customer-sheet')}
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

                  {/* Workforce Records */}
                  {workforceMatches.length > 0 && (
                    <>
                      <div className={`px-4 pb-1 ${(sheetMatches.length + productMatches.length + customerMatches.length) > 0 ? 'pt-2 border-t border-soft-border' : 'pt-2'}`}>
                        <span className="text-[10px] font-bold tracking-widest text-cool-gray uppercase">Workforce</span>
                      </div>
                      {workforceMatches.map((w) => (
                        <button
                          key={w.id}
                          onClick={() => handleRecordClick('/master-workforce-sheet')}
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

        {enrollStatusMessage && (
          <div className="mb-4 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success-dark">
            {enrollStatusMessage}
          </div>
        )}

        {/* Pending approval banner — never shown to superusers */}
        {userInfo && userInfo.is_approved === false && !userInfo.is_superuser && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Account Pending Approval</p>
              <p className="text-sm text-amber-700 mt-0.5">
                Your account is awaiting approval from an administrator. Until then, you can only access this page and your Profile.
                You can set a username &amp; password in{' '}
                <a href="/settings/account" className="underline font-semibold">Account Settings</a>.
              </p>
            </div>
          </div>
        )}

        {Object.entries(features.reduce((acc, feature) => {
          const cat = feature.category || 'General';
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(feature);
          return acc;
        }, {})).map(([category, catFeatures]) => (
          <div key={category} className="mb-8">
            <h3 className="text-xl font-bold tracking-tight text-midnight-ink mb-4">{category}</h3>
            <section className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${userInfo?.is_approved === false && !userInfo?.is_superuser ? 'opacity-40 pointer-events-none select-none' : ''}`}>
              {catFeatures.map((block) => {
                const accessible = hasFeature(block.feature_code);
                
                // Locked tile
                if (!accessible) {
                  return (
                    <button
                      key={block.feature_code}
                      type="button"
                      onClick={() => setSelectedFeatureToUnlock(block)}
                      className="block text-left rounded-xl border border-soft-border bg-muted/30 p-6 opacity-60 hover:opacity-100 hover:border-trust-blue hover:bg-muted/50 transition cursor-not-allowed select-none group relative overflow-hidden"
                      suppressHydrationWarning
                    >
                      <div className="absolute right-4 top-4 text-cool-gray group-hover:text-trust-blue transition-colors">
                        <Lock className="w-5 h-5" />
                      </div>
                      <h2 className="text-lg font-semibold text-gray-500 flex items-center gap-2">
                        {block.name}
                      </h2>
                      <p className="text-sm text-gray-400 mt-2">{block.description}</p>
                      <div className="mt-4 flex gap-2">
                        <span className="inline-flex items-center rounded-md bg-trust-blue/10 px-2 py-1 text-xs font-medium text-trust-blue ring-1 ring-inset ring-trust-blue/20">
                          Upgrade to {block.min_plan_name || 'Premium'}
                        </span>
                      </div>
                    </button>
                  );
                }

                if (block.route === '/enrol-workforce') {
                  return (
                    <button
                      key={block.route}
                      type="button"
                      onClick={() => setIsEnrollWorkforceOpen(true)}
                      className="block text-left rounded-xl border border-soft-border bg-background p-6 hover:border-trust-blue hover:shadow-md transition relative"
                    >
                      <h2 className="text-lg font-semibold text-midnight-ink flex items-center gap-2">
                        {block.name}
                        {block.is_beta && <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20 uppercase tracking-wider">Beta</span>}
                      </h2>
                      <p className="text-sm text-cool-gray mt-2">{block.description}</p>
                    </button>
                  );
                }

                if (block.route === '#create-generic-job') {
                  return (
                    <button
                      key={block.route}
                      type="button"
                      onClick={() => setIsGenericJobModalOpen(true)}
                      className="block text-left rounded-xl border border-soft-border bg-background p-6 hover:border-trust-blue hover:shadow-md transition relative"
                    >
                      <h2 className="text-lg font-semibold text-midnight-ink flex items-center gap-2">
                        {block.name}
                        {block.is_beta && <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20 uppercase tracking-wider">Beta</span>}
                      </h2>
                      <p className="text-sm text-cool-gray mt-2">{block.description}</p>
                    </button>
                  );
                }

                return (
                  <Link
                    key={block.route}
                    href={block.route || '#'}
                    className="block rounded-xl border border-soft-border bg-background p-6 hover:border-trust-blue hover:shadow-md transition relative"
                  >
                    <h2 className="text-lg font-semibold text-midnight-ink flex items-center gap-2">
                      {block.name}
                      {block.is_beta && <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20 uppercase tracking-wider">Beta</span>}
                    </h2>
                    <p className="text-sm text-cool-gray mt-2">{block.description}</p>
                  </Link>
                );
              })}
            </section>
          </div>
        ))}
      </div>

      {isEnrollWorkforceOpen && (
        <EnrolWorkforceForm
          open={isEnrollWorkforceOpen}
          onEnroll={(fullName) => {
            setEnrollStatusMessage(`${fullName} enrolled successfully.`);
          }}
          onClose={() => setIsEnrollWorkforceOpen(false)}
        />
      )}

      {isGenericJobModalOpen && (
        <GenericJobModal
          open={isGenericJobModalOpen}
          onOpenChange={setIsGenericJobModalOpen}
        />
      )}

      <UpgradeModal 
        feature={selectedFeatureToUnlock} 
        isOpen={!!selectedFeatureToUnlock} 
        onClose={() => setSelectedFeatureToUnlock(null)} 
      />
    </main>
  );
}
