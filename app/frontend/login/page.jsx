'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectPath = useMemo(() => '/home', []);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
        if (response.ok) {
          router.replace('/home');
        }
      } catch {
        // Keep user on login page when session check fails
      }
    };

    checkSession();
  }, [router]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const safeUsername = username.trim();
    if (!safeUsername || !password.trim()) {
      setError('Username and password are required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: safeUsername, password }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.message || 'Invalid user ID or password.');
        return;
      }

      router.replace(redirectPath);
    } catch {
      setError('Unable to login. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <section className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <h1 className="text-xl font-bold text-slate-900 text-center">Sign In</h1>
        <p className="text-sm text-slate-600 text-center mt-1">Login to access all sheets</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">User ID</label>
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter user ID"
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>
      </section>
    </main>
  );
}
