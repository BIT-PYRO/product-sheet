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
    <main className="min-h-screen bg-cloud-gray flex items-center justify-center px-4">
      <section className="w-full max-w-md bg-white border border-soft-border rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-midnight-ink text-center">Sign In</h1>
        <p className="text-base text-cool-gray text-center mt-2">Login to access all sheets</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-2">
            <label className="text-base font-semibold text-slate-text">User ID</label>
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter user ID"
              autoComplete="username"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <label className="text-base font-semibold text-slate-text">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              className="h-11"
            />
          </div>

          {error && (
            <p className="text-sm text-danger-dark bg-danger-soft px-3 py-2 rounded-md">{error}</p>
          )}

          <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isSubmitting}>
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>
      </section>
    </main>
  );
}
