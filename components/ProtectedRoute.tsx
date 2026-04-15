'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Spinner } from '@/components/ui';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      const redirectTo = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?redirect=${encodeURIComponent(redirectTo)}`);
    }

    // Check if user is authenticated but email is not verified
    if (!loading && user && !user.emailVerified) {
      // Allow access to verification-related pages
      const allowedPaths = ['/verify-email', '/verify-action', '/logout'];
      const currentPath = window.location.pathname;

      if (!allowedPaths.some(path => currentPath.startsWith(path))) {
        router.replace(`/verify-email?email=${encodeURIComponent(user.email || '')}`);
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return <Spinner size="lg" fullPage />;
  }

  if (!user) return null;

  // Check email verification for non-verification pages
  if (!user.emailVerified) {
    const allowedPaths = ['/verify-email', '/verify-action', '/logout'];
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    if (!allowedPaths.some(path => currentPath.startsWith(path))) {
      return <Spinner size="lg" fullPage />;
    }
  }

  return <>{children}</>;
}