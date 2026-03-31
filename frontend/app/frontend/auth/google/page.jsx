'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function GoogleAuthHandler() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState('Signing you in...');

  useEffect(() => {
    const token = params.get('token');

    if (!token) {
      router.replace('/login?error=missing_token');
      return;
    }

    fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          router.replace('/home');
        } else {
          setStatus('Login failed. Redirecting...');
          router.replace('/login?error=google_auth_failed');
        }
      })
      .catch(() => {
        setStatus('Network error. Redirecting...');
        router.replace('/login?error=network');
      });
  }, [params, router]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-700" />
      <p className="text-sm text-gray-500">{status}</p>
    </div>
  );
}

export default function GoogleAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-700" />
          <p className="text-sm text-gray-500">Signing you in...</p>
        </div>
      }
    >
      <GoogleAuthHandler />
    </Suspense>
  );
}
