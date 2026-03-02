'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Suspense } from 'react';

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuthToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent multiple executions
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const handleCallback = async () => {
      try {
        const token = searchParams.get('token');
        const errorParam = searchParams.get('error');

        if (errorParam) {
          setError(errorParam);
          setTimeout(() => router.push('/'), 3000);
          return;
        }

        if (!token) {
          setError('No authentication token received');
          setTimeout(() => router.push('/'), 3000);
          return;
        }

        // Refresh token is now stored server-side, only need to store JWT
        await setAuthToken(token);
        router.push('/');
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setTimeout(() => router.push('/'), 3000);
      }
    };

    handleCallback();
  }, [router, searchParams, setAuthToken]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-danger/50 bg-surface p-8 text-center shadow-surface">
          <div className="mb-4 text-6xl">&#x274C;</div>
          <h1 className="mb-2 text-2xl font-bold text-danger">Authentication Failed</h1>
          <p className="mb-4 text-muted">{error}</p>
          <p className="text-sm text-muted">Redirecting to home page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-surface">
        <div className="mb-6 inline-block animate-spin text-6xl">&#x23F3;</div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">Authenticating...</h1>
        <p className="text-muted">Please wait while we complete your login.</p>
      </div>
    </div>
  );
}

export default function OAuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-surface">
            <div className="mb-6 inline-block animate-spin text-6xl">&#x23F3;</div>
            <h1 className="mb-2 text-2xl font-bold text-foreground">Loading...</h1>
          </div>
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
