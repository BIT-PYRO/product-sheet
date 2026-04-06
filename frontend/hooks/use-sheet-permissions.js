'use client';

import { useEffect, useState } from 'react';

/**
 * Fetches the current user's sheet-level permissions for a given permKey.
 * Returns { canEdit, canCreate, loading }.
 *
 * - Admins, superusers, and Chairman/CEO designations always get full access.
 * - If no workforce record is found, full access is granted (fail open).
 * - While loading, canEdit and canCreate start as true so buttons don't flash away.
 */
export function useSheetPermissions(permKey) {
  const [canEdit, setCanEdit] = useState(true);
  const [canCreate, setCanCreate] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !data?.success) { setLoading(false); return; }

        const u = data.user;

        // Admins and superusers have full access — no restrictions
        if (u?.role === 'admin' || u?.is_superuser) {
          setLoading(false);
          return;
        }

        const email = (u?.email || '').toLowerCase();
        if (!email) { setLoading(false); return; }

        const wfRes = await fetch(`/api/workforce-me?email=${encodeURIComponent(email)}`, { cache: 'no-store' });
        const wfData = await wfRes.json().catch(() => null);
        if (cancelled) return;

        const list = Array.isArray(wfData?.data) ? wfData.data
          : Array.isArray(wfData?.data?.results) ? wfData.data.results
          : Array.isArray(wfData?.results) ? wfData.results : [];
        const match = list.find((m) => (m.email || '').toLowerCase() === email);

        // No workforce record → full access
        if (!match) { setLoading(false); return; }

        // Chairman/CEO → full access
        const des = (match.designation || '').toLowerCase().trim();
        if (des === 'chairman' || des === 'ceo') { setLoading(false); return; }

        const perms = match.permissions?.sheets?.[permKey] || {};
        if (!cancelled) {
          setCanEdit(!!perms.edit);
          setCanCreate(!!perms.create);
        }
      } catch {
        // fail open — keep default true values
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [permKey]);

  return { canEdit, canCreate, loading };
}
