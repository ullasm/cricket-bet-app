'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { sendPasswordReset } from '@/lib/auth';
import { Spinner, Button, Card, FormInput } from '@/components/ui';

function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      await sendPasswordReset(email);
      setSent(true);
      toast.success('Password reset email sent!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send password reset email');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
      <Card variant="modal" padding="p-8" className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link href="/" className="text-3xl font-bold text-green-500 hover:text-green-400 transition-colors">🏆 WhoWins</Link>
          <p className="mt-2 text-[var(--text-secondary)] text-sm">
            {sent ? 'Check your email' : 'Reset your password'}
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
              </div>
              
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                Check your email
              </h2>
              
              <p className="text-[var(--text-secondary)] mb-4">
                We&apos;ve sent password reset instructions to{' '}
                <span className="font-medium text-[var(--text-primary)]">{email}</span>
              </p>
              
              <p className="text-sm text-[var(--text-muted)] mb-6">
                Click the link in the email to reset your password.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => router.push('/login')}
                variant="primary"
                size="lg"
                className="w-full"
              >
                Back to Login
              </Button>
              
              <Button
                onClick={() => setSent(false)}
                variant="secondary"
                size="lg"
                className="w-full"
              >
                Try another email
              </Button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                Didn&apos;t receive the email?
              </h3>
              <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                <li>• Check your spam or junk folder</li>
                <li>• Make sure you entered the correct email address</li>
                <li>• Wait a few minutes and try again</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[var(--text-secondary)] text-center mb-4">
              Enter your email address and we&apos;ll send you instructions to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <FormInput
                id="email"
                label="Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={submitting}
                className="w-full mt-2"
              >
                Send Reset Instructions
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link href="/login" className="text-sm text-green-500 hover:text-green-400 font-medium">
                Back to Login
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<Spinner size="lg" fullPage />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}