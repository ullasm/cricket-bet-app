'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Spinner } from '@/components/ui';

const EMAIL_VERIFICATION_BYPASS = new Set([
  'vishi@gmail.com',
  'chetannauj@gmail.com',
  'raghustps1@gmail.com',
  'ullas.inet+1@gmail.com',
]);

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const isVerified = user && (user.emailVerified || EMAIL_VERIFICATION_BYPASS.has(user.email ?? ''));

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const redirectTo = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?redirect=${encodeURIComponent(redirectTo)}`);
    } else if (!isVerified) {
      const redirectTo = `${window.location.pathname}${window.location.search}`;
      router.replace(`/verify-email?email=${encodeURIComponent(user.email ?? '')}&redirect=${encodeURIComponent(redirectTo)}`);
    }
  }, [user, loading, router, isVerified]);

  if (loading) {
    return <Spinner size="lg" fullPage />;
  }

  if (!user || !isVerified) return null;

  return <>{children}</>;
}
