'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Spinner } from '@/components/ui';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const redirectTo = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?redirect=${encodeURIComponent(redirectTo)}`);
    } else if (!user.emailVerified) {
      const redirectTo = `${window.location.pathname}${window.location.search}`;
      router.replace(`/verify-email?email=${encodeURIComponent(user.email ?? '')}&redirect=${encodeURIComponent(redirectTo)}`);
    }
  }, [user, loading, router]);

  if (loading) {
    return <Spinner size="lg" fullPage />;
  }

  if (!user || !user.emailVerified) return null;

  return <>{children}</>;
}
