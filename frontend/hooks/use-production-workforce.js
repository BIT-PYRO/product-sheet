'use client';
import { useEffect, useState } from 'react';

/**
 * Fetches all active workforce and filters to the production department.
 * Also resolves the current session user's name + contact from their workforce record.
 */
export function useProductionWorkforce() {
  const [productionWorkers, setProductionWorkers] = useState([]);
  const [allWorkforce, setAllWorkforce] = useState([]);
  const [currentUser, setCurrentUser] = useState({ name: '', contact: '' });

  useEffect(() => {
    Promise.all([
      fetch('/api/workforce?active=true&page_size=500', { cache: 'no-store' })
        .then(r => r.json()).catch(() => null),
      fetch('/api/auth/session', { cache: 'no-store' })
        .then(r => r.json()).catch(() => null),
    ]).then(([wfResult, sessionData]) => {
      const all = Array.isArray(wfResult?.data)
        ? wfResult.data
        : (wfResult?.data?.results || []);
      setAllWorkforce(all);
      const prod = all.filter(w => (w.department || '').toLowerCase().includes('production'));
      setProductionWorkers(prod);
      if (sessionData?.user) {
        const u = sessionData.user;
        const name = u.first_name
          ? `${u.first_name} ${u.last_name || ''}`.trim()
          : (u.username || '');
        const email = (u.email || '').toLowerCase();
        const wfRecord = all.find(m => (m.email || '').toLowerCase() === email);
        setCurrentUser({ name, contact: wfRecord?.phone || wfRecord?.whatsapp || '' });
      }
    }).catch(() => {});
  }, []);

  return { productionWorkers, allWorkforce, currentUser };
}
