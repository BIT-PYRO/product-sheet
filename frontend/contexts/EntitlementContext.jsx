'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useUser } from './UserContext';

const EntitlementContext = createContext({
  features: [],
  entitlements: {},
  hasFeature: () => false,
  planName: 'None',
  isLoading: true
});

export function EntitlementProvider({ children }) {
  const { user } = useUser();
  const [features, setFeatures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadFeatures = useCallback(async () => {
    try {
      const res = await fetch('/api/features');
      const data = await res.json();
      if (data?.success && data?.data) {
        setFeatures(data.data);
      }
    } catch (err) {
      console.error('Failed to load platform features', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  const hasFeature = useCallback((featureCode) => {
    if (!user) return false;
    if (user.is_superuser) return true;

    const entitlements = user.entitlements || {};
    return !!entitlements[featureCode];
  }, [user]);

  return (
    <EntitlementContext.Provider value={{
      features,
      entitlements: user?.entitlements || {},
      hasFeature,
      planName: user?.plan_name || 'None',
      isLoading: isLoading || user === undefined // If user is strictly undefined, it's loading
    }}>
      {children}
    </EntitlementContext.Provider>
  );
}

export function useEntitlements() {
  return useContext(EntitlementContext);
}
