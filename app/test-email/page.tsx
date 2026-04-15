'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { sendEmailVerification, deleteUser, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button, Card, FormInput } from '@/components/ui';

export default function TestEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [testCount, setTestCount] = useState(0);

  // Generate a unique test email
  const generateTestEmail = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `test-${timestamp}-${random}@test.com`;
  };

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    let testEmail = email;
    
    // If no email provided, generate a unique one
    if (!testEmail) {
      testEmail = generateTestEmail();
      setEmail(testEmail);
    }

    try {
      // Create user with email/password
      const { createUserWithEmailAndPassword, signInWithEmailAndPassword } = await import('firebase/auth');
      
      let credential;
      try {
        // Try to create new user
        credential = await createUserWithEmailAndPassword(auth, testEmail, password || 'test123');
      } catch (createError: unknown) {
        // If email already exists, try to sign in instead
        if (createError instanceof Error && 'code' in createError && createError.code === 'auth/email-already-in-use') {
          toast('Email already exists, signing in instead...', { icon: 'ℹ️' });
          credential = await signInWithEmailAndPassword(auth, testEmail, password || 'test123');
        } else {
          throw createError;
        }
      }
      
      const newUser = credential.user;
      setUser(newUser);
      setTestCount(prev => prev + 1);
      
      toast.success(`User ${newUser.email} ready! Attempting to send verification email...`);
      
      // Try to send verification email with action URL settings
      try {
        await sendEmailVerification(newUser, {
          url: `${window.location.origin}/verify-action`,
          handleCodeInApp: true,
        });
        toast.success('Verification email sent! Check your inbox (and spam folder).');
      } catch (emailError: unknown) {
        console.error('Email sending error:', emailError);
        toast.error(`Failed to send email: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`);
        
        // Try without action URL settings as fallback
        try {
          await sendEmailVerification(newUser);
          toast.success('Fallback: Verification email sent without action URL settings.');
        } catch (fallbackError: unknown) {
          console.error('Fallback email error:', fallbackError);
          toast.error(`Fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
        }
      }
    } catch (err: unknown) {
      console.error('Registration error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create/sign in user');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (!user) {
      toast.error('No user logged in');
      return;
    }

    setSubmitting(true);
    try {
      await sendEmailVerification(user, {
        url: `${window.location.origin}/verify-action`,
        handleCodeInApp: true,
      });
      toast.success('Verification email resent!');
    } catch (err: unknown) {
      console.error('Resend error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to resend email');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteUser() {
    if (!user) {
      toast.error('No user to delete');
      return;
    }

    setSubmitting(true);
    try {
      await deleteUser(user);
      toast.success('Test user deleted successfully!');
      setUser(null);
      setEmail('');
    } catch (err: unknown) {
      console.error('Delete error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setSubmitting(false);
    }
  }

  function handleUseRandomEmail() {
    const randomEmail = generateTestEmail();
    setEmail(randomEmail);
    toast.success(`Using email: ${randomEmail}`);
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
      <Card variant="modal" padding="p-8" className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link href="/" className="text-3xl font-bold text-green-500 hover:text-green-400 transition-colors">🏆 WhoWins</Link>
          <p className="mt-2 text-[var(--text-secondary)] text-sm">Test Email Verification</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Tests: {testCount}</p>
        </div>

        <div className="space-y-4">
          {!user ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <p className="text-sm text-[var(--text-muted)]">
                Enter test credentials or use a random email to test email verification.
              </p>
              
              <div className="flex gap-2">
                <FormInput
                  id="email"
                  label="Test Email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleUseRandomEmail}
                  variant="secondary"
                  size="sm"
                  className="mt-6"
                >
                  Random
                </Button>
              </div>

              <FormInput
                id="password"
                label="Test Password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                hint="Leave empty for default 'test123'"
              />

              <div className="space-y-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={submitting}
                  className="w-full"
                >
                  Test Registration & Email
                </Button>
                
                <p className="text-xs text-[var(--text-muted)] text-center">
                  If email exists, will sign in instead of registering
                </p>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                  User Ready for Testing
                </h3>
                <p className="text-xs text-green-700 dark:text-green-400">
                  Email: {user.email}<br />
                  UID: {user.uid.substring(0, 8)}...<br />
                  Verified: {user.emailVerified ? 'Yes' : 'No'}<br />
                  Created: {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleTimeString() : 'Unknown'}
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleResend}
                  variant="secondary"
                  size="lg"
                  loading={submitting}
                  className="w-full"
                >
                  Resend Verification Email
                </Button>

                <Button
                  onClick={handleDeleteUser}
                  variant="danger"
                  size="lg"
                  loading={submitting}
                  className="w-full"
                >
                  Delete Test User
                </Button>

                <Button
                  onClick={() => {
                    setUser(null);
                    setEmail('');
                    setPassword('');
                  }}
                  variant="secondary"
                  size="lg"
                  className="w-full"
                >
                  Test Another Email
                </Button>

                <Button
                  onClick={() => router.push('/')}
                  variant="primary"
                  size="lg"
                  className="w-full"
                >
                  Back to Home
                </Button>
              </div>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                  Troubleshooting Tips
                </h3>
                <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                  <li>• Check your spam/junk folder</li>
                  <li>• Make sure Firebase project has email sending enabled</li>
                  <li>• Verify authorized domains in Firebase Console</li>
                  <li>• Check browser console for errors (F12)</li>
                  <li>• Try with a different email provider</li>
                </ul>
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">
              Common Issues & Solutions
            </h3>
            <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1">
              <li><strong>Firebase Configuration:</strong> Go to Firebase Console → Authentication → Templates → Email Verification</li>
              <li><strong>Authorized Domains:</strong> Add your domain to Firebase Console → Authentication → Settings → Authorized domains</li>
              <li><strong>Email Provider:</strong> Enable Email/Password provider in Authentication → Sign-in method</li>
              <li><strong>Action URL:</strong> Make sure action URL is configured correctly</li>
              <li><strong>Quota:</strong> Check if you&apos;ve exceeded Firebase email quota (100/day on free plan)</li>
            </ul>
          </div>

          <div className="mt-4 space-y-2">
            <Button
              onClick={() => {
                // Open browser console
                console.log('=== FIREBASE DEBUG INFO ===');
                console.log('Test user:', user);
                console.log('Current origin:', window.location.origin);
                console.log('Firebase auth:', auth);
                console.log('Firebase config:', {
                  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Set (hidden)' : 'Not set',
                  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
                  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                });
                toast.success('Check browser console (F12) for debug info');
              }}
              variant="secondary"
              size="sm"
              className="w-full"
            >
              Debug Info to Console
            </Button>

            <Button
              onClick={() => {
                const testUrl = `${window.location.origin}/verify-action`;
                navigator.clipboard.writeText(testUrl);
                toast.success(`Copied action URL: ${testUrl}`);
              }}
              variant="secondary"
              size="sm"
              className="w-full"
            >
              Copy Action URL to Clipboard
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}