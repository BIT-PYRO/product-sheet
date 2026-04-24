'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Polls the current user's workforce record every 2 minutes and on tab re-focus.
 * - If the member is revoked (active === false) → redirects to /login immediately.
 * - If updated_at changes → reloads the page to pick up new permissions.
 * - Uses BroadcastChannel to propagate reloads to all other open tabs in the same browser.
 *
 * Place this hook in a layout that wraps all authenticated pages.
 * It is safe on the login page — it returns early when unauthenticated.
 */
export function usePermissionRefresh() {
  const router = useRouter();
  const lastUpdatedAtRef = useRef(null);
  const initializedRef  = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let pollTimer = null;
    let bc = null;

    try {
      bc = new BroadcastChannel('workforce-sync');
    } catch {
      // BroadcastChannel not supported (e.g. Safari private mode) — degrade gracefully
    }

    if (bc) {
      bc.onmessage = (e) => {
        if (!cancelled && e.data?.type === 'reload') {
          window.location.reload();
        }
      };
    }

    async function check() {
      if (cancelled) return;
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        if (cancelled || !res.ok) return;
        const data = await res.json().catch(() => null);
        // Not authenticated — no-op (login page handles redirect itself)
        if (cancelled || !data?.success) return;

        const u = data.user;
        // Superusers / admins are never revoked through workforce records
        if (u?.is_superuser || u?.role === 'admin') return;

        const email = (u?.email || '').toLowerCase();
        if (!email) return;

        const wfRes = await fetch(`/api/workforce-me?email=${encodeURIComponent(email)}`, { cache: 'no-store' });
        if (cancelled || !wfRes.ok) return;
        const wfData = await wfRes.json().catch(() => null);
        if (cancelled) return;

        const list = Array.isArray(wfData?.data) ? wfData.data
          : Array.isArray(wfData?.data?.results) ? wfData.data.results
          : Array.isArray(wfData?.results) ? wfData.results
          : [];
        const match = list.find((m) => (m.email || '').toLowerCase() === email);
        if (!match) return;

        // Revoked → kick out
        if (match.active === false) {
          router.replace('/login');
          return;
        }

        const updatedAt = match.updated_at;
        if (!initializedRef.current) {
          lastUpdatedAtRef.current = updatedAt;
          initializedRef.current  = true;
        } else if (updatedAt && updatedAt !== lastUpdatedAtRef.current) {
          lastUpdatedAtRef.current = updatedAt;
          // Notify other tabs before reloading this one
          bc?.postMessage({ type: 'reload' });
          window.location.reload();
        }
      } catch {
        // Network error — fail silently, never block the user
      }
    }

    // Initial check + polling every 2 minutes
    check();
    pollTimer = setInterval(check, 2 * 60 * 1000);

    // Also check whenever the user returns to this tab
    const onVisibility = () => {
      if (!cancelled && document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      clearInterval(pollTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      try { bc?.close(); } catch { /* ignore */ }
    };
  }, [router]);
}
