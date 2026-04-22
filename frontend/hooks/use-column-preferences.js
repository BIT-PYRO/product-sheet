'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Persists per-user column visibility preferences in localStorage.
 *
 * @param {string} storageKey  - Unique key for the sheet (e.g. 'master-product-sheet')
 * @param {string[]} defaults  - Array of column IDs that should be visible by default
 * @returns {{ visibleColumns: Set, setVisibleColumns: Function, saveView: Function, saveViewStatus: string|null }}
 */
export function useColumnPreferences(storageKey, defaults) {
  const [visibleColumns, setVisibleColumns] = useState(() => new Set(defaults));
  const [saveViewStatus, setSaveViewStatus] = useState(null); // null | 'saved'
  const usernameRef = useRef('');
  const loadedRef = useRef(false);

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        const username = d?.user?.username || '';
        usernameRef.current = username;
        if (!username || loadedRef.current) return;
        loadedRef.current = true;
        try {
          const raw = localStorage.getItem(`col-prefs:${storageKey}:${username}`);
          if (raw) {
            const cols = JSON.parse(raw);
            if (Array.isArray(cols) && cols.length > 0) {
              setVisibleColumns(new Set(cols));
            }
          }
        } catch {
          // ignore parse errors
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const saveView = () => {
    const username = usernameRef.current;
    if (!username) return;
    try {
      localStorage.setItem(
        `col-prefs:${storageKey}:${username}`,
        JSON.stringify([...visibleColumns])
      );
      setSaveViewStatus('saved');
      setTimeout(() => setSaveViewStatus(null), 2000);
    } catch {
      // ignore storage errors
    }
  };

  return { visibleColumns, setVisibleColumns, saveView, saveViewStatus };
}
