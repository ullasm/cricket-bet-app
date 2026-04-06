import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface Match {
  id: string;
  teamA: string;
  teamB: string;
  format: 'T20' | 'ODI' | 'Test';
  drawAllowed: boolean;
  matchDate: Timestamp;
  status: 'upcoming' | 'live' | 'completed' | 'abandoned';
  result: 'team_a' | 'team_b' | 'draw' | 'pending' | 'abandoned';
  noDrawPolicy: 'refund' | 'rollover';
  bettingOpen: boolean;
  bettingClosedAt: Timestamp | null;
  cricApiMatchId: string | null;
}

export interface LeaderboardUser {
  uid: string;
  displayName: string;
  email: string;
  totalPoints: number;
  role: 'admin' | 'member';
  avatarColor: string;
}

export interface Bet {
  id: string;
  matchId: string;
  userId: string;
  pickedOutcome: 'team_a' | 'team_b' | 'draw';
  stake: number;
  pointsDelta: number | null;
  status: 'pending' | 'won' | 'lost' | 'refunded';
  placedAt: Timestamp;
}

export async function getMatches(): Promise<Match[]> {
  const snap = await getDocs(
    query(collection(db, 'matches'), orderBy('matchDate', 'desc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Match));
}

export async function getMatchById(matchId: string): Promise<Match | null> {
  const snap = await getDoc(doc(db, 'matches', matchId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Match;
}

export async function placeBet(
  matchId: string,
  userId: string,
  pickedOutcome: 'team_a' | 'team_b' | 'draw',
  stake: number
): Promise<string> {
  const ref = await addDoc(collection(db, 'bets'), {
    matchId,
    userId,
    pickedOutcome,
    stake,
    pointsDelta: null,
    status: 'pending',
    placedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getAllUsers(): Promise<LeaderboardUser[]> {
  const snap = await getDocs(
    query(collection(db, 'users'), orderBy('totalPoints', 'desc'))
  );
  return snap.docs.map((d) => d.data() as LeaderboardUser);
}

export async function getUserBetForMatch(
  matchId: string,
  userId: string
): Promise<Bet | null> {
  const snap = await getDocs(
    query(
      collection(db, 'bets'),
      where('matchId', '==', matchId),
      where('userId', '==', userId)
    )
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Bet;
}
