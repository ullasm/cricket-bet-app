'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/AuthContext';
import { getMatchById, getUserBetForMatch, placeBet } from '@/lib/matches';
import type { Match, Bet } from '@/lib/matches';
import { getUserGroupMember } from '@/lib/groups';
import type { GroupMember } from '@/lib/groups';

const STAKE = 1000;
type Outcome = 'team_a' | 'team_b' | 'draw';

// ── helpers ───────────────────────────────────────────────────────────────────

function formatMatchDate(ts: Match['matchDate']) {
  return ts.toDate().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: Match['status'] }) {
  const styles: Record<Match['status'], string> = {
    live: 'bg-green-500/20 text-green-400',
    upcoming: 'bg-yellow-500/20 text-yellow-400',
    completed: 'bg-slate-600/40 text-[var(--text-muted)]',
    abandoned: 'bg-slate-600/40 text-[var(--text-muted)]',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function BetStatusBadge({ status }: { status: Bet['status'] }) {
  const styles: Record<Bet['status'], string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    won: 'bg-green-500/20 text-green-400',
    lost: 'bg-red-500/20 text-red-400',
    refunded: 'bg-slate-600/40 text-[var(--text-muted)]',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function BackLink({ groupId }: { groupId: string }) {
  return (
    <Link
      href={`/groups/${groupId}`}
      className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Group
    </Link>
  );
}

function InfoScreen({ groupId, message }: { groupId: string; message: string }) {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center gap-4 px-4">
      <p className="text-[var(--text-secondary)] text-base">{message}</p>
      <BackLink groupId={groupId} />
    </div>
  );
}

function OutcomeButton({
  label,
  value,
  selected,
  accentClass,
  onClick,
}: {
  label: string;
  value: Outcome;
  selected: Outcome | null;
  accentClass: string;
  onClick: () => void;
}) {
  const isSelected = selected === value;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl py-4 px-3 font-semibold text-sm transition-all border-2 ${
        isSelected
          ? `${accentClass} border-current shadow-lg scale-[1.02]`
          : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--bg-hover)]'
      }`}
    >
      {label}
    </button>
  );
}

// ── main content ──────────────────────────────────────────────────────────────

function BetContent() {
  const params = useParams<{ groupId: string; matchId: string }>();
  const { groupId, matchId } = params;
  const router = useRouter();
  const { user } = useAuth();

  const [match, setMatch] = useState<Match | null | undefined>(undefined);
  const [existingBet, setExistingBet] = useState<Bet | null | undefined>(undefined);
  const [member, setMember] = useState<GroupMember | null | undefined>(undefined);
  const [selected, setSelected] = useState<Outcome | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getMatchById(matchId),
      getUserBetForMatch(matchId, user.uid),
      getUserGroupMember(groupId, user.uid),
    ])
      .then(([m, bet, mem]) => {
        setMatch(m);
        setExistingBet(bet);
        setMember(mem);
      })
      .catch(() => {
        toast.error('Failed to load match data');
        setMatch(null);
        setExistingBet(null);
        setMember(null);
      });
  }, [user, matchId, groupId]);

  async function handleConfirm() {
    if (!selected || !user) return;
    setConfirming(true);
    try {
      await placeBet(matchId, groupId, user.uid, selected, STAKE);
      toast.success('Bet placed successfully!');
      router.replace(`/groups/${groupId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to place bet');
    } finally {
      setConfirming(false);
    }
  }

  // ── loading ──────────────────────────────────────────────────────────────
  if (match === undefined || existingBet === undefined || member === undefined) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <svg className="animate-spin h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  // ── not a member ─────────────────────────────────────────────────────────
  if (member === null) {
    return <InfoScreen groupId={groupId} message="Access denied — you are not a member of this group." />;
  }

  // ── match not found ──────────────────────────────────────────────────────
  if (match === null) {
    return <InfoScreen groupId={groupId} message="Match not found." />;
  }

  // ── betting closed ───────────────────────────────────────────────────────
  if (match.status !== 'upcoming' && match.status !== 'live') {
    return <InfoScreen groupId={groupId} message="Betting is closed for this match." />;
  }

  if (!match.bettingOpen) {
    return <InfoScreen groupId={groupId} message="Betting is currently closed for this match." />;
  }

  // ── existing bet ─────────────────────────────────────────────────────────
  if (existingBet) {
    const outcomeLabel: Record<Outcome, string> = {
      team_a: match.teamA,
      team_b: match.teamB,
      draw: 'Draw',
    };
    const delta = existingBet.pointsDelta;

    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center gap-4 px-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8 max-w-sm w-full text-center space-y-3">
          <div className="text-green-400 text-4xl">✓</div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Your bet is placed!</h2>

          <div className="space-y-2 text-sm">
            <p className="text-[var(--text-secondary)]">
              Picked:{' '}
              <span className="font-medium text-[var(--text-primary)]">
                {outcomeLabel[existingBet.pickedOutcome as Outcome]}
              </span>
            </p>
            <p className="text-[var(--text-secondary)]">
              Stake: <span className="font-medium text-[var(--text-primary)]">{existingBet.stake} pts</span>
            </p>
            <div className="flex items-center justify-center gap-2">
              <BetStatusBadge status={existingBet.status} />
              {delta !== null && existingBet.status === 'won' && (
                <span className="text-green-400 font-semibold">+{delta} pts</span>
              )}
              {delta !== null && existingBet.status === 'lost' && (
                <span className="text-red-400 font-semibold">{delta} pts</span>
              )}
            </div>
          </div>

          <div className="pt-2">
            <BackLink groupId={groupId} />
          </div>
        </div>
      </div>
    );
  }

  // ── main betting UI ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="max-w-lg mx-auto px-6 py-8 space-y-6">
        <BackLink groupId={groupId} />

        {/* Match info card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-[var(--card-padding)] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {match.teamA} <span className="text-[var(--text-muted)]">vs</span> {match.teamB}
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--bg-input)] text-[var(--text-secondary)]">
                {match.format}
              </span>
              <StatusBadge status={match.status} />
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)]">{formatMatchDate(match.matchDate)}</p>
          <div className="pt-1 border-t border-[var(--border)]">
            <p className="text-sm text-[var(--text-secondary)]">
              Stake: <span className="text-green-400 font-semibold">{STAKE} pts</span>
            </p>
          </div>
        </div>

        {/* Outcome picker */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-[var(--text-secondary)]">Pick your outcome</p>
          <div className="flex gap-3">
            <OutcomeButton
              label={match.teamA}
              value="team_a"
              selected={selected}
              accentClass="bg-blue-500/20 text-blue-400"
              onClick={() => setSelected('team_a')}
            />
            {match.drawAllowed && (
              <OutcomeButton
                label="Draw"
                value="draw"
                selected={selected}
                accentClass="bg-slate-500/40 text-[var(--text-primary)]"
                onClick={() => setSelected('draw')}
              />
            )}
            <OutcomeButton
              label={match.teamB}
              value="team_b"
              selected={selected}
              accentClass="bg-red-500/20 text-red-400"
              onClick={() => setSelected('team_b')}
            />
          </div>
        </div>

        {/* Confirm button */}
        {selected && (
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-500 hover:bg-green-600 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-3 font-semibold text-white transition-colors"
          >
            {confirming ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Placing bet…
              </>
            ) : (
              'Confirm Bet'
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default function GroupBetPage() {
  return (
    <ProtectedRoute>
      <BetContent />
    </ProtectedRoute>
  );
}
