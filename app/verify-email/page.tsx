'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { auth } from '@/lib/firebase';
import { resendVerificationEmail, logoutUser } from '@/lib/auth';
import { useAuth } from '@/lib/AuthContext';
import { Spinner, Button, Card } from '@/components/ui';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') ?? '';
  const redirectTo = searchParams.get('redirect') ?? '/groups';
  const { user, loading } = useAuth();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user?.emailVerified) {
      router.replace(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  async function handleResend() {
    setResending(true);
    try {
      await resendVerificationEmail();
      toast.success('Verification email sent!');
      setCooldown(60);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setResending(false);
    }
  }

  async function handleContinue() {
    setChecking(true);
    try {
      await auth.currentUser?.reload();
      if (auth.currentUser?.emailVerified) {
        toast.success('Email verified! Welcome!');
        router.replace(redirectTo);
      } else {
        toast.error('Email not verified yet. Please check your inbox.');
      }
    } catch {
      toast.error('Failed to check verification status');
    } finally {
      setChecking(false);
    }
  }

  async function handleSignOut() {
    await logoutUser();
    router.replace('/login');
  }

  if (loading || !user) return <Spinner size="lg" fullPage />;

  const displayEmail = emailParam || user.email || '';

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
      <Card variant="modal" padding="p-8" className="w-full max-w-md text-center">
        <div className="mb-6">
          <Link href="/" className="text-3xl font-bold text-green-500 hover:text-green-400 transition-colors">
            WhoWins
          </Link>
          <div className="mt-4 text-5xl">✉️</div>
          <h1 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">Verify your email</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            We sent a verification link to
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{displayEmail}</p>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            Click the link in your email, then come back here and press the button below.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            variant="primary"
            size="lg"
            loading={checking}
            onClick={handleContinue}
            className="w-full"
          >
            I&apos;ve verified my email
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="md"
            loading={resending}
            disabled={cooldown > 0}
            onClick={handleResend}
            className="w-full"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
          </Button>
        </div>

        <p className="mt-5 text-xs text-[var(--text-muted)]">
          Check your spam folder if you don&apos;t see the email.
        </p>

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-3 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors underline"
        >
          Sign out and use a different account
        </button>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Spinner size="lg" fullPage />}>
      <VerifyEmailForm />
    </Suspense>
  );
}
