'use client';

import { usePermissionRefresh } from '@/hooks/usePermissionRefresh';

/**
 * Layout for all pages under /frontend/.
 * Mounts the permission-refresh hook so every authenticated page
 * automatically detects revokes and permission changes in real-time.
 */
export default function FrontendLayout({ children }) {
  usePermissionRefresh();
  return children;
}
