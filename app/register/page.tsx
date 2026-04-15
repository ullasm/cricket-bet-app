'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { registerUser, signInWithGoogle } from '@/lib/auth';
import { useAuth } from '@/lib/AuthContext';
import { Spinner, Button, Card, FormInput } from '@/components/ui';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/groups';
  const loginHref = `/login?redirect=${encodeURIComponent(redirectTo)}`;
  const { user, loading } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

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

    setSubmitting(true);
    try {
      await registerUser(email, password, displayName);
      toast.success('Account created! Please check your email to verify your account.');
      // Redirect to verification page instead of groups
      router.replace('/verify-email?email=' + encodeURIComponent(email));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setSubmitting(false);
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
          <p className="mt-2 text-[var(--text-secondary)] text-sm">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            id="displayName"
            label="Display Name"
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
          />

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
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <FormInput
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />

          <div className="text-xs text-[var(--text-muted)] mt-2">
            By creating an account, you agree to receive a verification email.
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={submitting}
            className="w-full mt-2"
          >
            Create Account
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
          Already have an account?{' '}
          <Link href={loginHref} className="text-green-500 hover:text-green-400 font-medium">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<Spinner size="lg" fullPage />}>
      <RegisterForm />
    </Suspense>
  );
}
