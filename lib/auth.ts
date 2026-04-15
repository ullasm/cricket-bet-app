import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  UserCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

const AVATAR_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

// Helper function to get the origin URL safely
function getOrigin(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Default to localhost for server-side (will be overridden by client)
  return 'http://localhost:3000';
}

export async function registerUser(
  email: string,
  password: string,
  displayName: string
) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const { user } = credential;

  // Send email verification with action URL settings
  await sendEmailVerification(user, {
    url: `${getOrigin()}/verify-action`,
    handleCodeInApp: true,
  });

  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    displayName,
    email,
    emailVerified: false,
    totalPoints: 0,
    role: 'member',
    avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    groupIds: [],
    createdAt: serverTimestamp(),
  });

  return user;
}

export async function loginUser(
  email: string,
  password: string
): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logoutUser(): Promise<void> {
  return signOut(auth);
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  const { user } = credential;

  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName ?? 'Anonymous',
      email: user.email ?? '',
      emailVerified: user.emailVerified,
      totalPoints: 0,
      role: 'member',
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      groupIds: [],
      createdAt: serverTimestamp(),
    });
  }

  return user;
}

// Email verification functions
export async function sendVerificationEmail(user: User) {
  return sendEmailVerification(user, {
    url: `${getOrigin()}/verify-action`,
    handleCodeInApp: true,
  });
}

export async function resendVerificationEmail() {
  if (!auth.currentUser) {
    throw new Error('No user is currently signed in');
  }
  return sendEmailVerification(auth.currentUser, {
    url: `${getOrigin()}/verify-action`,
    handleCodeInApp: true,
  });
}

export async function verifyEmail(actionCode: string) {
  return applyActionCode(auth, actionCode);
}

export async function checkEmailVerificationCode(actionCode: string) {
  return checkActionCode(auth, actionCode);
}

// Password reset functions
export async function sendPasswordReset(email: string) {
  return sendPasswordResetEmail(auth, email, {
    url: `${getOrigin()}/reset-password`,
    handleCodeInApp: true,
  });
}

export async function confirmPasswordResetWithCode(actionCode: string, newPassword: string) {
  return confirmPasswordReset(auth, actionCode, newPassword);
}

export async function verifyPasswordReset(actionCode: string) {
  return verifyPasswordResetCode(auth, actionCode);
}

// Update user email verification status in Firestore
export async function updateEmailVerificationStatus(uid: string, verified: boolean) {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    emailVerified: verified,
    emailVerifiedAt: verified ? serverTimestamp() : null,
  });
}

