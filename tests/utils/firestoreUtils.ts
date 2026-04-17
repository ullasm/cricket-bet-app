/**
 * tests/utils/firestoreUtils.ts
 *
 * Firebase Admin SDK helpers for test data setup and teardown.
 * Initialises Admin SDK directly from serviceAccountKey.json (not via env var).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as admin from 'firebase-admin';
import { getSessionId } from './sessionUtils';

// ── Admin SDK init (singleton) ────────────────────────────────────────────────

function initAdmin(): void {
  if (admin.apps.length) return;
  const keyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `serviceAccountKey.json not found at: ${keyPath}\n` +
      'Download it from Firebase Console → Project settings → Service accounts.'
    );
  }
  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

// ── Public types ──────────────────────────────────────────────────────────────

export interface MatchDoc {
  groupId: string;
  teamA?: string;
  teamB?: string;
  format?: 'T20' | 'ODI' | 'Test';
  drawAllowed?: boolean;
  matchDate?: admin.firestore.Timestamp;
  status?: 'upcoming' | 'live' | 'completed' | 'abandoned';
  result?: 'team_a' | 'team_b' | 'draw' | 'pending' | 'abandoned';
  noDrawPolicy?: 'refund' | 'rollover';
  bettingOpen?: boolean;
  bettingClosedAt?: admin.firestore.Timestamp | null;
  cricApiMatchId?: string | null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Creates a match document in Firestore tagged with `_createdByTest` and
 * `_testSession` so teardown can identify and delete it.
 *
 * Defaults to: upcoming T20 match starting in 2 hours, bettingOpen=true.
 *
 * @returns  the new match document ID
 */
export async function createTestMatch(
  groupId: string,
  overrides: Partial<MatchDoc> = {},
): Promise<string> {
  initAdmin();
  const db = admin.firestore();
  const sessionId = getSessionId();

  const twoHoursFromNow = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + 2 * 60 * 60 * 1000)
  );

  const defaults: Omit<MatchDoc, 'groupId'> = {
    teamA:          'India',
    teamB:          'Australia',
    format:         'T20',
    drawAllowed:    false,
    matchDate:      twoHoursFromNow,
    status:         'upcoming',
    result:         'pending',
    noDrawPolicy:   'refund',
    bettingOpen:    true,
    bettingClosedAt: null,
    cricApiMatchId: null,
  };

  const payload = {
    ...defaults,
    ...overrides,
    groupId,
    _createdByTest: true,
    _testSession:   sessionId,
  };

  const ref = await db.collection('matches').add(payload);
  return ref.id;
}

/**
 * Deletes a single document from any top-level collection.
 * Use in afterEach to clean up documents created during a test.
 */
export async function deleteTestDocument(
  collectionName: string,
  docId: string,
): Promise<void> {
  initAdmin();
  const db = admin.firestore();
  await db.collection(collectionName).doc(docId).delete();
}

/**
 * Returns the raw data of a Firestore document, or undefined if not found.
 */
export async function getDocument(
  collectionName: string,
  docId: string,
): Promise<Record<string, unknown> | undefined> {
  initAdmin();
  const db = admin.firestore();
  const snap = await db.collection(collectionName).doc(docId).get();
  return snap.exists ? (snap.data() as Record<string, unknown>) : undefined;
}

/**
 * Creates a bet document in Firestore tagged with test metadata.
 * @returns  the new bet document ID
 */
export async function createTestBet(
  matchId: string,
  groupId: string,
  userId: string,
  pickedOutcome: 'team_a' | 'team_b' | 'draw' = 'team_a',
  stake = 1000,
): Promise<string> {
  initAdmin();
  const db = admin.firestore();
  const sessionId = getSessionId();

  const ref = await db.collection('bets').add({
    matchId,
    groupId,
    userId,
    pickedOutcome,
    stake,
    pointsDelta: null,
    status: 'pending',
    placedAt: admin.firestore.FieldValue.serverTimestamp(),
    _createdByTest: true,
    _testSession: sessionId,
  });
  return ref.id;
}

/**
 * Updates a match document's fields directly (e.g. to close betting in a test).
 */
export async function updateTestMatch(
  matchId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  initAdmin();
  const db = admin.firestore();
  await db.collection('matches').doc(matchId).update(fields);
}
