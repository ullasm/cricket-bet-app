'use client';

import type { Match, Bet } from '@/lib/matches';
import { Card, Badge, matchStatusVariant } from '@/components/ui';
import { getMatchResultLabel } from '@/components/MatchBettingDetails';

// ── helpers ───────────────────────────────────────────────────────────────────

function getBetChipLabel(bet: Bet) {
  if (bet.status === 'won') {
    return `+${bet.pointsDelta ?? 0} pts`;
  }
  if (bet.status === 'lost') {
    return `−${Math.abs(bet.pointsDelta ?? 0)} pts`;
  }
  if (bet.status === 'refunded') {
    return 'refunded';
  }
  return 'pending';
}

function getBetChipClasses(status: Bet['status']) {
  if (status === 'won') {
    return 'bg-green-500/15 text-green-400 border border-green-500/25';
  }
  if (status === 'lost') {
    return 'bg-red-500/15 text-red-400 border border-red-500/25';
  }
  return 'bg-[var(--bg-input)] text-[var(--text-muted)] border border-[var(--border)]';
}

function getBetSortRank(status: Bet['status']) {
  if (status === 'won') return 0;
  if (status === 'lost') return 1;
  return 2;
}

function formatMatchDate(ts: Match['matchDate']) {
  return ts.toDate().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ── props ─────────────────────────────────────────────────────────────────────

export interface SettledMatchCardProps {
  match: Match;
  bets: Bet[];
  memberNames: Record<string, string>;
}

// ── component ─────────────────────────────────────────────────────────────────

export function SettledMatchCard({ match, bets, memberNames }: SettledMatchCardProps) {
  const resultLabel = getMatchResultLabel(match);
  const sortedBets = [...bets].sort((a, b) => {
    const rankDiff = getBetSortRank(a.status) - getBetSortRank(b.status);
    if (rankDiff !== 0) return rankDiff;

    const nameA = memberNames[a.userId] ?? 'Unknown';
    const nameB = memberNames[b.userId] ?? 'Unknown';
    return nameA.localeCompare(nameB);
  });

  return (
    <Card variant="default" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-semibold text-[var(--text-primary)]">
          {match.teamA} <span className="text-[var(--text-muted)]">vs</span> {match.teamB}
        </span>
        <div className="flex items-center gap-2">
          <Badge variant="format">{match.format}</Badge>
          <Badge variant={matchStatusVariant(match.status)}>
            {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
          </Badge>
        </div>
      </div>

      <p className="text-xs text-[var(--text-muted)]">{formatMatchDate(match.matchDate)}</p>

      <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-primary)]">
        <span aria-hidden>🏆</span>
        <span>{resultLabel}</span>
      </div>

      {sortedBets.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">No bets placed</p>
      ) : (
        <div className="space-y-2">
          {[
            sortedBets.filter((b) => b.status === 'won'),
            sortedBets.filter((b) => b.status !== 'won'),
          ].map((group, gi) =>
            group.length === 0 ? null : (
              <div key={gi} className="flex flex-wrap gap-2">
                {group.map((bet) => {
                  const displayName = memberNames[bet.userId] ?? 'Unknown';
                  return (
                    <span
                      key={bet.id}
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getBetChipClasses(bet.status)}`}
                    >
                      {displayName}: {getBetChipLabel(bet)}
                    </span>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}
    </Card>
  );
}
