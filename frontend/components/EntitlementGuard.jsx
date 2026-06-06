'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEntitlements } from '@/contexts/EntitlementContext';
import { useEffect, useState } from 'react';
import { UpgradeModal } from './UpgradeModal';

export function EntitlementGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { features, hasFeature, isLoading } = useEntitlements();
  const [lockedFeature, setLockedFeature] = useState(null);

  useEffect(() => {
    // We only protect specific routes, not the dashboard itself
    if (isLoading || !pathname || pathname === '/home' || pathname === '/') return;

    // Find if current route corresponds to a feature
    // Some routes might have nested paths, but we match exactly or prefix depending on feature design.
    // For now, exact matching on route.
    const activeFeature = features.find(f => pathname.startsWith(f.route || '/no-match'));
    
    if (activeFeature && !hasFeature(activeFeature.feature_code)) {
      setLockedFeature(activeFeature);
    } else {
      setLockedFeature(null);
    }
  }, [pathname, features, hasFeature, isLoading]);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading environment...</div>;
  }

  if (lockedFeature) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
        <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground mb-6">You don't have access to this module on your current plan.</p>
        <button 
          onClick={() => router.push('/home')}
          className="text-trust-blue hover:underline mb-4"
        >
          Return to Dashboard
        </button>
        <UpgradeModal 
          feature={lockedFeature}
          isOpen={true}
          onClose={() => router.push('/home')}
        />
      </div>
    );
  }

  return children;
}
