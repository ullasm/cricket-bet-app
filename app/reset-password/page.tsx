'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { confirmPasswordResetWithCode, verifyPasswordReset } from '@/lib/auth';
import { Spinner, Button, Card, FormInput } from '@/components/ui';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const actionCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    async function validateCode() {
      if (!actionCode || mode !== 'resetPassword') {
        setValid(false);
        setValidating(false);
        return;
      }

      try {
        // Verify the password reset code
        const verifiedEmail = await verifyPasswordReset(actionCode);
        setEmail(verifiedEmail);
        setValid(true);
      } catch {
        setValid(false);
        toast.error('Invalid or expired password reset link');
      } finally {
        setValidating(false);
      }
    }

    validateCode();
  }, [actionCode, mode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!actionCode) {
      toast.error('Invalid reset link');
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordResetWithCode(actionCode, password);
      toast.success('Password reset successfully!');
      router.push('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  }

  if (validating) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
        <Card variant="modal" padding="p-8" className="w-full max-w-md text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Validating reset link...</p>
        </Card>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
        <Card variant="modal" padding="p-8" className="w-full max-w-md">
          <div className="mb-6 text-center">
            <Link href="/" className="text-3xl font-bold text-green-500 hover:text-green-400 transition-colors">🏆 WhoWins</Link>
            <p className="mt-2 text-[var(--text-secondary)] text-sm">Invalid Reset Link</p>
          </div>

          <div className="space-y-4">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                Invalid or Expired Link
              </h2>
              
              <p className="text-[var(--text-secondary)] mb-6">
                This password reset link is invalid or has expired.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => router.push('/forgot-password')}
                variant="primary"
                size="lg"
                className="w-full"
              >
                Request New Reset Link
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
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
      <Card variant="modal" padding="p-8" className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link href="/" className="text-3xl font-bold text-green-500 hover:text-green-400 transition-colors">🏆 WhoWins</Link>
          <p className="mt-2 text-[var(--text-secondary)] text-sm">Reset your password</p>
        </div>

        <div className="space-y-4">
          <p className="text-[var(--text-secondary)] text-center mb-4">
            Enter a new password for <span className="font-medium text-[var(--text-primary)]">{email}</span>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput
              id="password"
              label="New Password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            <FormInput
              id="confirmPassword"
              label="Confirm New Password"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              className="w-full mt-2"
            >
              Reset Password
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/login" className="text-sm text-green-500 hover:text-green-400 font-medium">
              Back to Login
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Spinner size="lg" fullPage />}>
      <ResetPasswordForm />
    </Suspense>
  );
}