'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Spinner } from '@/components/ui';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!userProfile || !userProfile.superAdmin)) {
      router.replace('/groups');
    }
  }, [loading, userProfile, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <Spinner size="xl" />
      </div>
    );
  }

  if (!userProfile?.superAdmin) {
    return null;
  }

  return <>{children}</>;
}
