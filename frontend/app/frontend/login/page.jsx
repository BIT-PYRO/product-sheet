'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ── helpers ──────────────────────────────────────────────────────────────────
function safeRedirect(next) {
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return '/frontend/welcome';
}

// ── Google Sign-In button ────────────────────────────────────────────────────
function GoogleLoginButton({ redirectPath }) {
  const router = useRouter();
  const btnRef = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCredential = useCallback(async (response) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/frontend/api/auth/google', {
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
    let isMounted = true;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || !btnRef.current) return;

    const initGsi = () => {
      if (!isMounted || !window.google?.accounts?.id || !btnRef.current) return;
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredential,
          ux_mode: 'popup',
        });
        // Clear container before rendering to prevent duplicates
        btnRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: 'outline',
          size: 'large',
          width: btnRef.current.offsetWidth || 400,
          text: 'signin_with',
          shape: 'rectangular',
        });
      } catch (err) {
        // If popup/postMessage is blocked (COOP/COEP) fall back to redirect ux_mode
        try {
          console.warn('GSI init failed, falling back to redirect mode', err);
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredential,
            ux_mode: 'redirect',
          });
          btnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(btnRef.current, {
            theme: 'outline',
            size: 'large',
            width: btnRef.current.offsetWidth || 400,
            text: 'signin_with',
            shape: 'rectangular',
          });
        } catch (err2) {
          console.error('GSI initialization failed completely', err2);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGsi();
      return () => { isMounted = false; };
    }

    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', initGsi);
      return () => {
        isMounted = false;
        existing.removeEventListener('load', initGsi);
      };
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initGsi;
    document.head.appendChild(script);

    return () => {
      isMounted = false;
      script.onload = null;
    };
  }, [handleCredential]);

  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return null;

  return (
    <div className="space-y-2">
      {loading && (
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400 py-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600 dark:border-slate-600 dark:border-t-slate-300" />
          Signing in…
        </div>
      )}
      <div ref={btnRef} className="w-full flex justify-center" />
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2 rounded-md">{error}</p>
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
        <label className="text-base font-semibold text-slate-700 dark:text-slate-300">User ID</label>
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter user ID"
          autoComplete="username"
          className="h-11 bg-slate-50 dark:bg-black/50 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-blue-500"
        />
      </div>
      <div className="space-y-2">
        <label className="text-base font-semibold text-slate-700 dark:text-slate-300">Password</label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          autoComplete="current-password"
          className="h-11 bg-slate-50 dark:bg-black/50 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-blue-500"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2 rounded-md">{error}</p>
      )}
      <Button type="submit" className="w-full h-11 text-base font-semibold bg-blue-600 hover:bg-blue-500 text-white border-0" disabled={isSubmitting}>
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
      .catch(() => { });
  }, [router, redirectPath]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative bg-transparent transition-colors duration-300">

      {/* Background Gradient to match other premium pages */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(29,78,216,0.15),transparent)] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(29,78,216,0.3),transparent)] pointer-events-none transition-colors duration-500" />

      {/* Back Button */}
      <Link
        href="/"
        className="absolute top-6 left-6 sm:top-8 sm:left-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors bg-white/70 dark:bg-white/5 backdrop-blur-md px-3 py-2 rounded-lg shadow-sm dark:shadow-none border border-slate-200 dark:border-white/10 hover:shadow-md dark:hover:bg-white/10"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <section className="w-full max-w-md bg-white/80 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl dark:shadow-[0_0_40px_rgba(37,99,235,0.1)] p-8 transition-colors duration-300">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white text-center tracking-tight">Sign In</h1>
        <p className="text-base text-slate-500 dark:text-slate-400 text-center mt-2">Access your workspace</p>

        <PasswordLogin redirectPath={redirectPath} />

        {/* Google Sign-In — shown only when NEXT_PUBLIC_GOOGLE_CLIENT_ID is set */}
        {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200 dark:border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-black px-2 text-slate-500 dark:text-slate-400 font-medium rounded-full transition-colors duration-300">or continue with</span>
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
        <main className="min-h-screen bg-slate-50 dark:bg-[#0A0A0A] flex items-center justify-center px-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600 dark:border-white/10 dark:border-t-blue-500" />
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
