'use client';

import { usePermissionRefresh } from '@/hooks/usePermissionRefresh';
import { UserProvider } from '@/contexts/UserContext';
import { EntitlementProvider } from '@/contexts/EntitlementContext';
import { EntitlementGuard } from '@/components/EntitlementGuard';

/**
 * Layout for all pages under /frontend/.
 * Mounts the permission-refresh hook so every authenticated page
 * automatically detects revokes and permission changes in real-time.
 */
export default function FrontendLayout({ children }) {
  usePermissionRefresh();
  return (
    <UserProvider>
      <EntitlementProvider>
        <EntitlementGuard>
          {children}
        </EntitlementGuard>
      </EntitlementProvider>
    </UserProvider>
  );
}
