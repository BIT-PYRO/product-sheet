'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ── helpers ──────────────────────────────────────────────────────────────────
function safeRedirect(next) {
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return '/home';
}

// ── Google Sign-In button ────────────────────────────────────────────────────
// Uses Google Identity Services (GIS). Credential (ID token) comes back via
// callback — no page redirect needed. The token is posted to /api/auth/google
// which verifies it with Django and sets httpOnly JWT cookies.
function GoogleLoginButton({ redirectPath }) {
  const router = useRouter();
  const btnRef = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCredential = useCallback(async (response) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: response.credential }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        sessionStorage.setItem('calendar_auto_connect', '1');
        router.replace(redirectPath);
      } else {
        setError(data?.message || 'Google login failed. Please try again.');
        setLoading(false);
      }
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }, [router, redirectPath]);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || !btnRef.current) return;

    const initGsi = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredential,
        ux_mode: 'popup',
      });
      window.google.accounts.id.renderButton(btnRef.current, {
        theme: 'outline',
        size: 'large',
        width: btnRef.current.offsetWidth || 400,
        text: 'signin_with',
        shape: 'rectangular',
      });
    };

    if (window.google?.accounts?.id) {
      initGsi();
      return;
    }

    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', initGsi);
      return () => existing.removeEventListener('load', initGsi);
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initGsi;
    document.head.appendChild(script);
  }, [handleCredential]);

  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return null;

  return (
    <div className="space-y-2">
      {loading && (
        <div className="flex items-center justify-center gap-2 text-sm text-cool-gray py-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
          Signing in…
        </div>
      )}
      {/* GIS renders its button inside this div */}
      <div ref={btnRef} className="w-full" />
      {error && (
        <p className="text-sm text-danger-dark bg-danger-soft px-3 py-2 rounded-md">{error}</p>
      )}
    </div>
  );
}

// ── Password login form ──────────────────────────────────────────────────────
function PasswordLogin({ redirectPath }) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        headers: { 'Content-Type': 'application/json' },
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
    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
      <div className="space-y-2">
        <label className="text-base font-semibold text-slate-text">User ID</label>
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
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
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          autoComplete="current-password"
          className="h-11"
        />
      </div>
      {error && (
        <p className="text-sm text-danger-dark bg-danger-soft px-3 py-2 rounded-md">{error}</p>
      )}
      <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isSubmitting}>
        {isSubmitting ? 'Signing In…' : 'Sign In'}
      </Button>
    </form>
  );
}

// ── Main login page ──────────────────────────────────────────────────────────
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectPath = useMemo(() => safeRedirect(searchParams.get('next') || ''), [searchParams]);

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.success) router.replace(redirectPath); })
      .catch(() => {});
  }, [router, redirectPath]);

  return (
    <main className="min-h-screen bg-cloud-gray flex items-center justify-center px-4">
      <section className="w-full max-w-md bg-white border border-soft-border rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-midnight-ink text-center">Sign In</h1>
        <p className="text-base text-cool-gray text-center mt-1">Access your workspace</p>

        <PasswordLogin redirectPath={redirectPath} />

        {/* Google Sign-In — shown only when NEXT_PUBLIC_GOOGLE_CLIENT_ID is set */}
        {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-soft-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-cool-gray font-medium">or continue with</span>
              </div>
            </div>
            <GoogleLoginButton redirectPath={redirectPath} />
          </>
        )}
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-cloud-gray flex items-center justify-center px-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-700" />
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
