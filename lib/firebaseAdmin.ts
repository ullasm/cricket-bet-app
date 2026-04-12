import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY env var is not set');
  }
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(serviceAccount)),
  });
}

export const adminDb = admin.firestore();
