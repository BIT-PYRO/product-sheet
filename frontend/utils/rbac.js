'use client';
/**
 * Stub for usePagePermissions.
 * In this single-tenant project every authenticated user can view amounts and export.
 * Extend this if role-based restrictions are needed later.
 */
export function usePagePermissions() {
  return { canViewAmounts: true, canExport: true };
}
