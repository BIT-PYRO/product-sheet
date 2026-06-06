'use client';
import { useState, useEffect, createContext, useContext } from 'react';

const UserContext = createContext({ user: null });

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  return <UserContext.Provider value={{ user }}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
