'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { verifyEmail } from '@/lib/auth';
import { Spinner, Button, Card } from '@/components/ui';

function VerifyActionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const actionCode = searchParams.get('oobCode');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function handleVerification() {
      if (!actionCode || mode !== 'verifyEmail') {
        setStatus('error');
        setMessage('Invalid verification link');
        return;
      }

      try {
        // Apply the verification code
        await verifyEmail(actionCode);
        
        // Get user ID from the action code (in a real app, you might need to decode it)
        // For now, we'll rely on Firebase to update the user's emailVerified status
        // and the user will need to sign in again
        
        setStatus('success');
        setMessage('Email verified successfully! You can now sign in to your account.');
        
        toast.success('Email verified successfully!');
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Failed to verify email');
        toast.error('Failed to verify email');
      }
    }

    handleVerification();
  }, [actionCode, mode]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
        <Card variant="modal" padding="p-8" className="w-full max-w-md text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Verifying your email...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
      <Card variant="modal" padding="p-8" className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link href="/" className="text-3xl font-bold text-green-500 hover:text-green-400 transition-colors">🏆 WhoWins</Link>
          <p className="mt-2 text-[var(--text-secondary)] text-sm">
            {status === 'success' ? 'Email Verified' : 'Verification Failed'}
          </p>
        </div>

        <div className="space-y-4">
          <div className="text-center">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              status === 'success' ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {status === 'success' ? (
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              ) : (
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              )}
            </div>
            
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              {status === 'success' ? 'Email Verified!' : 'Verification Failed'}
            </h2>
            
            <p className="text-[var(--text-secondary)] mb-6">
              {message}
            </p>
          </div>

          <div className="space-y-3">
            {status === 'success' ? (
              <>
                <Button
                  onClick={() => router.push('/login')}
                  variant="primary"
                  size="lg"
                  className="w-full"
                >
                  Sign In Now
                </Button>
                
                <Button
                  onClick={() => router.push('/')}
                  variant="secondary"
                  size="lg"
                  className="w-full"
                >
                  Go to Homepage
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => router.push('/verify-email')}
                  variant="primary"
                  size="lg"
                  className="w-full"
                >
                  Try Again
                </Button>
                
                <Button
                  onClick={() => router.push('/login')}
                  variant="secondary"
                  size="lg"
                  className="w-full"
                >
                  Back to Login
                </Button>
              </>
            )}
          </div>

          {status === 'error' && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">
                Need help?
              </h3>
              <ul className="text-xs text-red-700 dark:text-red-400 space-y-1">
                <li>• The verification link may have expired</li>
                <li>• Try requesting a new verification email</li>
                <li>• Contact support if the problem persists</li>
              </ul>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function VerifyActionPage() {
  return (
    <Suspense fallback={<Spinner size="lg" fullPage />}>
      <VerifyActionForm />
    </Suspense>
  );
}