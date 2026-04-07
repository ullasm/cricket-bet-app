import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  increment,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import type { Timestamp as TimestampType } from 'firebase/firestore';
import { db } from './firebase';

// ── interfaces ────────────────────────────────────────────────────────────────

export interface Match {
  id: string;
  groupId: string;
  teamA: string;
  teamB: string;
  format: 'T20' | 'ODI' | 'Test';
  drawAllowed: boolean;
  matchDate: TimestampType;
  status: 'upcoming' | 'live' | 'completed' | 'abandoned';
  result: 'team_a' | 'team_b' | 'draw' | 'pending' | 'abandoned';
  noDrawPolicy: 'refund' | 'rollover';
  bettingOpen: boolean;
  bettingClosedAt: TimestampType | null;
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
  groupId: string;
  userId: string;
  pickedOutcome: 'team_a' | 'team_b' | 'draw';
  stake: number;
  pointsDelta: number | null;
  status: 'pending' | 'won' | 'lost' | 'refunded';
  placedAt: TimestampType;
}

// ── match functions ───────────────────────────────────────────────────────────

export async function getMatches(groupId: string): Promise<Match[]> {
  const snap = await getDocs(
    query(
      collection(db, 'matches'),
      where('groupId', '==', groupId)
    )
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Match))
    .sort((a, b) => b.matchDate.toMillis() - a.matchDate.toMillis());
}

export async function getMatchById(matchId: string): Promise<Match | null> {
  const snap = await getDoc(doc(db, 'matches', matchId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Match;
}

export async function createMatch(
  groupId: string,
  matchData: Record<string, unknown>
): Promise<string> {
  const ref = await addDoc(collection(db, 'matches'), {
    ...matchData,
    groupId,
  });
  return ref.id;
}

// ── bet functions ─────────────────────────────────────────────────────────────

export async function placeBet(
  matchId: string,
  groupId: string,
  userId: string,
  pickedOutcome: 'team_a' | 'team_b' | 'draw',
  stake: number
): Promise<string> {
  const ref = await addDoc(collection(db, 'bets'), {
    matchId,
    groupId,
    userId,
    pickedOutcome,
    stake,
    pointsDelta: null,
    status: 'pending',
    placedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getUserBetsForGroup(
  groupId: string,
  userId: string
): Promise<Bet[]> {
  // Single-field query on userId (auto-indexed, satisfies own-bet read rule).
  // groupId is filtered in JS since bets span multiple groups.
  const snap = await getDocs(
    query(collection(db, 'bets'), where('userId', '==', userId))
  );
  return snap.docs
    .filter((d) => d.data().groupId === groupId)
    .map((d) => ({ id: d.id, ...d.data() } as Bet));
}

export async function getBetsForGroup(groupId: string): Promise<Bet[]> {
  const snap = await getDocs(
    query(collection(db, 'bets'), where('groupId', '==', groupId))
  );

  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Bet));
}

export async function getUserBetForMatch(
  matchId: string,
  userId: string
): Promise<Bet | null> {
  // Query on userId only (single-field, auto-indexed) to avoid requiring a
  // composite index. matchId is checked in JS against the smaller result set.
  const snap = await getDocs(
    query(
      collection(db, 'bets'),
      where('userId', '==', userId)
    )
  );
  if (snap.empty) return null;
  const found = snap.docs.find((d) => d.data().matchId === matchId);
  if (!found) return null;
  return { id: found.id, ...found.data() } as Bet;
}

export async function getGroupBetsForMatch(
  matchId: string,
  groupId: string
): Promise<Bet[]> {
  // Query by groupId only (single-field, auto-indexed) to avoid requiring a
  // composite index. matchId is filtered in JS from the smaller result set.
  const snap = await getDocs(
    query(
      collection(db, 'bets'),
      where('groupId', '==', groupId)
    )
  );
  return snap.docs
    .filter((d) => d.data().matchId === matchId)
    .map((d) => ({ id: d.id, ...d.data() } as Bet));
}

// ── settlement ────────────────────────────────────────────────────────────────

export async function settleMatch(
  matchId: string,
  groupId: string,
  result: string,
  noDrawPolicy: string
): Promise<void> {
  const bets = await getGroupBetsForMatch(matchId, groupId);
  const matchRef = doc(db, 'matches', matchId);

  function memberRef(userId: string) {
    return doc(db, 'groups', groupId, 'members', userId);
  }

  async function refundAll() {
    await Promise.all(
      bets.map((b) =>
        updateDoc(doc(db, 'bets', b.id), { status: 'refunded', pointsDelta: 0 })
      )
    );
  }

  // ── abandoned ──────────────────────────────────────────────────────────────
  if (result === 'abandoned') {
    await refundAll();
    await updateDoc(matchRef, {
      status: 'abandoned',
      result: 'abandoned',
      bettingOpen: false,
      bettingClosedAt: Timestamp.now(),
    });
    return;
  }

  // ── draw ───────────────────────────────────────────────────────────────────
  if (result === 'draw') {
    const drawBets = bets.filter((b) => b.pickedOutcome === 'draw');
    const otherBets = bets.filter((b) => b.pickedOutcome !== 'draw');

    if (drawBets.length === 0) {
      if (noDrawPolicy === 'refund') {
        await refundAll();
      }
      // rollover: leave bets as pending, admin handles next match
      await updateDoc(matchRef, {
        status: 'completed',
        result: 'draw',
        bettingOpen: false,
        bettingClosedAt: Timestamp.now(),
      });
      return;
    }

    const losersStake = otherBets.reduce((s, b) => s + b.stake, 0);
    const winnerShare = Math.floor(losersStake / drawBets.length);

    await Promise.all([
      ...drawBets.map((b) =>
        updateDoc(doc(db, 'bets', b.id), { status: 'won', pointsDelta: winnerShare }).then(() =>
          updateDoc(memberRef(b.userId), { totalPoints: increment(winnerShare) })
        )
      ),
      ...otherBets.map((b) =>
        updateDoc(doc(db, 'bets', b.id), { status: 'lost', pointsDelta: -b.stake }).then(() =>
          updateDoc(memberRef(b.userId), { totalPoints: increment(-b.stake) })
        )
      ),
    ]);

    await updateDoc(matchRef, {
      status: 'completed',
      result: 'draw',
      bettingOpen: false,
      bettingClosedAt: Timestamp.now(),
    });
    return;
  }

  // ── normal win (team_a / team_b) ───────────────────────────────────────────
  const winnerBets = bets.filter((b) => b.pickedOutcome === result);
  const loserBets = bets.filter((b) => b.pickedOutcome !== result);

  const losersStake = loserBets.reduce((s, b) => s + b.stake, 0);
  const winnerShare = winnerBets.length > 0 ? Math.floor(losersStake / winnerBets.length) : 0;

  await Promise.all([
    ...winnerBets.map((b) =>
      updateDoc(doc(db, 'bets', b.id), { status: 'won', pointsDelta: winnerShare }).then(() =>
        updateDoc(memberRef(b.userId), { totalPoints: increment(winnerShare) })
      )
    ),
    ...loserBets.map((b) =>
      updateDoc(doc(db, 'bets', b.id), { status: 'lost', pointsDelta: -b.stake }).then(() =>
        updateDoc(memberRef(b.userId), { totalPoints: increment(-b.stake) })
      )
    ),
  ]);

  await updateDoc(matchRef, {
    status: 'completed',
    result,
    bettingOpen: false,
    bettingClosedAt: Timestamp.now(),
  });
}

// ── leaderboard ───────────────────────────────────────────────────────────────

export async function getAllUsers(): Promise<LeaderboardUser[]> {
  const snap = await getDocs(
    query(collection(db, 'users'), orderBy('totalPoints', 'desc'))
  );
  return snap.docs.map((d) => d.data() as LeaderboardUser);
}
