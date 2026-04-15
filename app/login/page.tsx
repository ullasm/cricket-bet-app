'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { loginUser, signInWithGoogle, resendVerificationEmail } from '@/lib/auth';
import { useAuth } from '@/lib/AuthContext';
import { Spinner, Button, Card, FormInput } from '@/components/ui';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/groups';
  const registerHref = `/register?redirect=${encodeURIComponent(redirectTo)}`;
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showVerificationWarning, setShowVerificationWarning] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setShowVerificationWarning(false);
    
    try {
      const credential = await loginUser(email, password);
      const user = credential.user;
      
      // Check if email is verified
      if (!user.emailVerified) {
        setShowVerificationWarning(true);
        toast.error('Please verify your email before signing in');
        return;
      }
      
      toast.success('Welcome back!');
      router.replace(redirectTo);
    } catch (err: unknown) {
      // Check if error is due to unverified email
      if (err instanceof Error && 'code' in err && err.code === 'auth/email-not-verified') {
        setShowVerificationWarning(true);
        toast.error('Please verify your email before signing in');
      } else {
        toast.error(err instanceof Error ? err.message : 'Failed to sign in');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendVerification() {
    setResendingVerification(true);
    try {
      await resendVerificationEmail();
      toast.success('Verification email sent! Please check your inbox.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resend verification email');
    } finally {
      setResendingVerification(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      toast.success('Welcome!');
      router.replace(redirectTo);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  }

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
      <Card variant="modal" padding="p-8" className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link href="/" className="text-3xl font-bold text-green-500 hover:text-green-400 transition-colors">🏆 WhoWins</Link>
          <p className="mt-2 text-[var(--text-secondary)] text-sm">Sign in to your account</p>
        </div>

        {showVerificationWarning && (
          <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.346 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
              <div>
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  Email not verified
                </h3>
                <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                  Please verify your email address before signing in.
                </p>
                <Button
                  onClick={handleResendVerification}
                  variant="secondary"
                  size="sm"
                  loading={resendingVerification}
                  className="mt-2"
                >
                  Resend Verification Email
                </Button>
              </div>
            </div>
          </div>
        )}

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

          <FormInput
            id="password"
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <div className="text-right">
            <Link href="/forgot-password" className="text-sm text-green-500 hover:text-green-400 font-medium">
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={submitting}
            className="w-full mt-2"
          >
            Sign In
          </Button>
        </form>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 border-t border-[var(--border)]" />
          <span className="text-xs text-[var(--text-muted)]">or</span>
          <div className="flex-1 border-t border-[var(--border)]" />
        </div>

        {/* Google button left as-is — bg-white/text-slate-800 is third-party branding, no matching variant */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="mt-4 w-full flex items-center justify-center gap-3 rounded-lg bg-white hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2.5 font-semibold text-slate-800 transition-colors border border-gray-200"
        >
          {googleLoading ? (
            <Spinner size="sm" className="text-slate-600" />
          ) : (
            <span className="text-[#4285F4] font-bold text-base leading-none">G</span>
          )}
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          Don&apos;t have an account?{' '}
          <Link href={registerHref} className="text-green-500 hover:text-green-400 font-medium">
            Register
          </Link>
        </p>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Spinner size="lg" fullPage />}>
      <LoginForm />
    </Suspense>
  );
}
