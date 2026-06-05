import { redirect } from 'next/navigation';

/**
 * Legacy /mydesk route — now protected under /frontend/my-desk
 * via the EntitlementGuard layout. Permanently redirect.
 */
export default function MyDeskRedirectPage() {
  redirect('/frontend/my-desk');
}
