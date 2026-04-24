'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AppNavbar, { type NavTab } from '@/components/AppNavbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/AuthContext';
import { getGroupById, getUserGroupMember } from '@/lib/groups';
import type { Group, GroupMember } from '@/lib/groups';
import { getBetsForGroup, type Match, type Bet } from '@/lib/matches';
import { Spinner, Card, SectionHeader } from '@/components/ui';
import { RunningTotalLedger } from '@/components/RunningTotalLedger';

// Type for ledger match data
interface LedgerMatch {
  matchId: string;
  matchName: string;
  matchDate: Date;
  winner: string;
  teamA: string;
  teamB: string;
}

const showLedger = process.env.NEXT_PUBLIC_SHOW_LEDGER === 'true'; // must be explicitly enabled

function ReportContent() {
  const params = useParams<{ groupId: string }>();
  const groupId = params.groupId;
  const { user } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [myMember, setMyMember] = useState<GroupMember | null | undefined>(undefined);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [completedMatches, setCompletedMatches] = useState<LedgerMatch[]>([]);
  const [groupBets, setGroupBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    Promise.all([
      getGroupById(groupId),
      getUserGroupMember(groupId, user.uid),
    ]).then(([groupResult, memberResult]) => {
      if (cancelled) return;
      setGroup(groupResult);
      if (!memberResult) {
        setMyMember(null);
        setLoading(false);
      } else {
        setMyMember(memberResult);
      }
    }).catch(() => {
      if (cancelled) return;
      setMyMember(null);
      setLoading(false);
    });

    // Fetch members
    const fetchMembers = async () => {
      try {
        const membersSnap = await getDocs(
          query(collection(db, 'groups', groupId, 'members'), orderBy('totalPoints', 'desc'))
        );
        if (!cancelled) {
          setMembers(membersSnap.docs.map((d) => d.data() as GroupMember));
        }
      } catch (err) {
        console.error('Error fetching members:', err);
      }
    };
    fetchMembers();

    // Fetch completed matches for the ledger
    const fetchMatchesAndBets = async () => {
      try {
        // Get completed matches
        const matchesSnap = await getDocs(
          query(
            collection(db, 'matches'),
            where('groupId', '==', groupId),
            where('status', '==', 'completed')
          )
        );
        
        const matches: LedgerMatch[] = matchesSnap.docs
          .map((d) => {
            const data = d.data() as Match;
            let winner = 'TBD';
            if (data.result === 'team_a') winner = data.teamA;
            else if (data.result === 'team_b') winner = data.teamB;
            else if (data.result === 'draw') winner = 'Draw';
            else if (data.result === 'abandoned') winner = 'Abandoned';
            
            return {
              matchId: d.id,
              matchName: `${data.teamA} vs ${data.teamB}`,
              matchDate: data.matchDate.toDate(),
              winner,
              teamA: data.teamA,
              teamB: data.teamB,
            };
          })
          .sort((a, b) => a.matchDate.getTime() - b.matchDate.getTime());
        
        if (!cancelled) {
          setCompletedMatches(matches);
        }

        // Get all bets for the group
        const betsSnap = await getDocs(
          query(collection(db, 'bets'), where('groupId', '==', groupId))
        );
        
        const bets: Bet[] = betsSnap.docs.map((d) => ({ 
          id: d.id, 
          ...d.data() 
        } as Bet));
        
        if (!cancelled) {
          setGroupBets(bets);
        }
      } catch (err) {
        console.error('Error fetching matches and bets for ledger:', err);
      }
    };

    fetchMatchesAndBets().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user, groupId]);

  if (loading) return <Spinner size="lg" fullPage />;

  if (myMember === null) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-red-400 font-semibold">Access denied — you are not a member of this group</p>
        <Link href="/groups" className="text-sm text-green-500 hover:text-green-400">
          Back to My Groups
        </Link>
      </div>
    );
  }

  const isAdmin = myMember?.role === 'admin';

  // Filter bets to only include those for completed matches (for the ledger)
  const ledgerBets = groupBets.filter(bet => 
    completedMatches.some(m => m.matchId === bet.matchId)
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <AppNavbar
        center={
          group?.name ? (
            <span className="font-light text-[var(--text-primary)] text-sm sm:text-base truncate">
              {group.name}
            </span>
          ) : undefined
        }
        maxWidth="5xl"
        tabs={[
          { label: 'Dashboard', href: `/groups/${groupId}` },
          { label: 'Points',    href: `/groups/${groupId}/points` },
          { label: 'Report',    href: `/groups/${groupId}/report` },
          ...(isAdmin ? [{ label: 'Matches', href: `/groups/${groupId}/matches` }] as NavTab[] : []),
          { label: 'Group',     href: `/groups/${groupId}/group` },
        ]}
      />

      <main className="max-w-5xl mx-auto px-2 py-8 space-y-6">

        {/* Running Total Ledger */}
        {showLedger && completedMatches.length > 0 ? (
          <Card variant="default">
            <SectionHeader title="Running Total Ledger" mb="mb-4" />
            <RunningTotalLedger
              members={members}
              matches={completedMatches}
              bets={ledgerBets}
              currentUserId={user?.uid ?? ''}
            />
          </Card>
        ) : (
          <Card variant="default">
            <SectionHeader title="Running Total Ledger" mb="mb-4" />
            <p className="text-[var(--text-muted)] text-sm text-center py-4">
              {!showLedger
                ? 'Ledger feature is not enabled.'
                : 'No completed matches with bets yet.'}
            </p>
          </Card>
        )}

      </main>
    </div>
  );
}

export default function ReportPage() {
  return (
    <ProtectedRoute>
      <ReportContent />
    </ProtectedRoute>
  );
}
