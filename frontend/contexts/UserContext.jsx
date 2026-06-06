'use client';
import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const UserContext = createContext({ user: null });

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data?.user) {
          setUser(data.user);
          
          // Tenant Verification Redirect
          if (data.user.tenant && data.user.tenant.status === 'pending_verification') {
             if (pathname !== '/onboarding' && pathname !== '/signup') {
                 router.push('/onboarding');
             }
          }
        }
      })
      .catch(() => {});
  }, [pathname, router]);

  return <UserContext.Provider value={{ user }}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
