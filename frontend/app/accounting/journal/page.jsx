import { redirect } from 'next/navigation';

/**
 * Legacy /accounting/journal route — now protected under /frontend/accountancy/journal
 * via the EntitlementGuard layout. Permanently redirect.
 */
export default function JournalRedirectPage() {
  redirect('/frontend/accountancy/journal');
}
