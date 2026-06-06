'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, KeyRound } from 'lucide-react';
import Link from 'next/link';

export default function AccountSettingsPage() {
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        const result = await res.json();
        if (res.status === 401) { router.replace('/login'); return; }
        if (!res.ok || !result.success) { return; }
        setSessionUser(result.user);
      } catch {
        // Network error — fail silently
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  async function handleSaveCredentials(e) {
    e.preventDefault();
    setMessage(''); setIsError(false);

    if (!newUsername.trim() || !newPassword.trim()) {
      setMessage('Username and password cannot be empty.');
      setIsError(true); return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.');
      setIsError(true); return;
    }
    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters.');
      setIsError(true); return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/set-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername.trim(), password: newPassword }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setMessage(result.message || 'Failed to save credentials.');
        setIsError(true); return;
      }
      setMessage('Credentials saved! Redirecting to login…');
      setIsError(false);
      setNewUsername(''); setNewPassword(''); setConfirmPassword('');
      setTimeout(() => {
        fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
          router.replace('/login');
        });
      }, 2000);
    } catch {
      setMessage('Unable to save. Please try again.');
      setIsError(true);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cloud-gray flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-trust-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cloud-gray font-sans">
      <header className="bg-white border-b border-soft-border px-6 py-4 flex items-center gap-4">
        <Link href="/frontend/home" className="p-1.5 rounded-full hover:bg-cloud-gray transition" title="Back">
          <ArrowLeft className="h-5 w-5 text-midnight-ink" />
        </Link>
        <h1 className="text-base font-bold text-midnight-ink">Account Settings</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-soft-border overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 border-b border-soft-border bg-cloud-gray">
            <KeyRound className="h-4 w-4 text-trust-blue shrink-0" />
            <span className="text-xs font-bold text-midnight-ink uppercase tracking-widest">Account Settings</span>
          </div>

          <form onSubmit={handleSaveCredentials} className="px-5 py-4 space-y-3">
            <p className="text-xs text-cool-gray">
              Set a username and password so you can log in directly next time.
              {sessionUser?.email && (
                <> Your account will remain linked to{' '}
                  <strong className="text-midnight-ink">{sessionUser.email}</strong>.
                </>
              )}
            </p>

            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 font-medium">
              Your username will be visible to everyone and used as your official name across the platform.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">New Username</label>
              <input
                type="text"
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                placeholder="Choose a username"
                autoComplete="new-username"
                className="w-full h-9 rounded-lg border border-soft-border px-3 text-sm text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue bg-cloud-gray"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                className="w-full h-9 rounded-lg border border-soft-border px-3 text-sm text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue bg-cloud-gray"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-cool-gray uppercase tracking-wide">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
                className="w-full h-9 rounded-lg border border-soft-border px-3 text-sm text-midnight-ink focus:outline-none focus:ring-2 focus:ring-trust-blue bg-cloud-gray"
              />
            </div>

            {message && (
              <p className={`text-xs px-3 py-2 rounded-md font-medium ${isError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="h-9 px-5 rounded-lg bg-trust-blue hover:bg-deep-blue text-white text-sm font-semibold transition disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Credentials'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
