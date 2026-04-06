'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ── helpers ──────────────────────────────────────────────────────────────────
function safeRedirect(next) {
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return '/home';
}

// ── Password login tab ───────────────────────────────────────────────────────
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

// ── Email OTP login tab ──────────────────────────────────────────────────────
function EmailOTPLogin({ redirectPath }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError(''); setInfo('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setIsSending(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setError(result.message || 'Failed to send OTP.');
        return;
      }
      setStep('otp');
      setCountdown(60);
      setInfo(`OTP sent to ${cleanEmail}. Check your inbox (and spam folder).`);
    } catch {
      setError('Unable to send OTP. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp.trim()) { setError('Please enter the OTP.'); return; }
    setIsVerifying(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setError(result.message || 'Invalid OTP.');
        return;
      }
      router.replace(redirectPath);
    } catch {
      setError('Unable to verify OTP. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (step === 'otp') {
    return (
      <form onSubmit={handleVerifyOTP} className="mt-6 space-y-5">
        {info && (
          <p className="text-sm text-trust-blue bg-blue-50 border border-blue-100 px-3 py-2 rounded-md">{info}</p>
        )}
        <div className="space-y-2">
          <label className="text-base font-semibold text-slate-text">
            One-Time Password
          </label>
          <Input
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="Enter 4-digit OTP"
            inputMode="numeric"
            maxLength={4}
            autoFocus
            className="h-11 tracking-widest text-center text-lg font-semibold"
          />
        </div>
        {error && (
          <p className="text-sm text-danger-dark bg-danger-soft px-3 py-2 rounded-md">{error}</p>
        )}
        <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isVerifying}>
          {isVerifying ? 'Verifying…' : 'Verify & Sign In'}
        </Button>
        <div className="text-center">
          {countdown > 0 ? (
            <p className="text-sm text-cool-gray">Resend OTP in {countdown}s</p>
          ) : (
            <button
              type="button"
              onClick={() => { setStep('email'); setOtp(''); setError(''); setInfo(''); }}
              className="text-sm text-trust-blue hover:underline"
            >
              ← Change email / Resend OTP
            </button>
          )}
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendOTP} className="mt-6 space-y-5">
      <div className="space-y-2">
        <label className="text-base font-semibold text-slate-text">Email Address</label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          autoComplete="email"
          className="h-11"
        />
      </div>
      {error && (
        <p className="text-sm text-danger-dark bg-danger-soft px-3 py-2 rounded-md">{error}</p>
      )}
      <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isSending}>
        {isSending ? 'Sending OTP…' : 'Send OTP'}
      </Button>
    </form>
  );
}

// ── Main login page ──────────────────────────────────────────────────────────
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState('password');

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

        {/* Tab switcher */}
        <div className="mt-6 flex rounded-lg bg-cloud-gray p-1 gap-1">
          <button
            type="button"
            onClick={() => setTab('password')}
            className={`flex-1 h-9 rounded-md text-sm font-semibold transition-all ${
              tab === 'password'
                ? 'bg-white text-midnight-ink shadow-sm'
                : 'text-cool-gray hover:text-midnight-ink'
            }`}
          >
            Username &amp; Password
          </button>
          <button
            type="button"
            onClick={() => setTab('email')}
            className={`flex-1 h-9 rounded-md text-sm font-semibold transition-all ${
              tab === 'email'
                ? 'bg-white text-midnight-ink shadow-sm'
                : 'text-cool-gray hover:text-midnight-ink'
            }`}
          >
            Email OTP
          </button>
        </div>

        {tab === 'password' ? (
          <PasswordLogin redirectPath={redirectPath} />
        ) : (
          <EmailOTPLogin redirectPath={redirectPath} />
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
