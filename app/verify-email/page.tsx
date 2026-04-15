'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { resendVerificationEmail } from '@/lib/auth';
import { useAuth } from '@/lib/AuthContext';
import { Spinner, Button, Card } from '@/components/ui';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const { user, loading } = useAuth();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    // If user is already verified and logged in, redirect them
    if (!loading && user?.emailVerified) {
      router.replace('/groups');
    }
  }, [user, loading, router]);

  async function handleResend() {
    setResending(true);
    try {
      await resendVerificationEmail();
      toast.success('Verification email sent!');
      setResent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resend verification email');
    } finally {
      setResending(false);
    }
  }

  if (loading) return <Spinner size="lg" fullPage />;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
      <Card variant="modal" padding="p-8" className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link href="/" className="text-3xl font-bold text-green-500 hover:text-green-400 transition-colors">🏆 WhoWins</Link>
          <p className="mt-2 text-[var(--text-secondary)] text-sm">Verify your email</p>
        </div>

        <div className="space-y-4">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              Check your email
            </h2>
            
            <p className="text-[var(--text-secondary)] mb-4">
              We&apos;ve sent a verification link to{' '}
              <span className="font-medium text-[var(--text-primary)]">{email || 'your email'}</span>
            </p>
            
            <p className="text-sm text-[var(--text-muted)] mb-6">
              Click the link in the email to verify your account and start using WhoWins.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleResend}
              variant="secondary"
              size="lg"
              loading={resending}
              className="w-full"
              disabled={resent}
            >
              {resent ? 'Email Sent!' : 'Resend Verification Email'}
            </Button>

            <Button
              onClick={() => router.push('/login')}
              variant="secondary"
              size="lg"
              className="w-full"
            >
              Back to Login
            </Button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
              Didn&apos;t receive the email?
            </h3>
            <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
              <li>• Check your spam or junk folder</li>
              <li>• Make sure you entered the correct email address</li>
              <li>• Wait a few minutes and try resending</li>
            </ul>
          </div>

          <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
            Already verified your email?{' '}
            <Link href="/login" className="text-green-500 hover:text-green-400 font-medium">
              Sign in
            </Link>
          </p>
        </div>
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