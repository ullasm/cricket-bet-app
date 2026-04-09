import type { FC, ReactNode } from 'react';

/**
 * Variants:
 *  Match status  : match-live | match-upcoming | match-completed | match-abandoned
 *  Bet status    : bet-won | bet-lost | bet-pending | bet-refunded
 *  Role          : role-admin | role-member
 *  Misc          : format
 *
 * Shape:
 *  pill (default) — rounded-full px-2 py-0.5  (tight status chip)
 *  chip           — rounded-full px-2.5 py-1   (slightly larger, used in PastMatchCard summaries)
 *  tag            — rounded px-1.5 py-0.5      (square-ish, used for role badges)
 */

export type BadgeVariant =
  | 'match-live'
  | 'match-upcoming'
  | 'match-completed'
  | 'match-abandoned'
  | 'bet-won'
  | 'bet-lost'
  | 'bet-pending'
  | 'bet-refunded'
  | 'bet-locked'
  | 'role-admin'
  | 'role-member'
  | 'format'
  | 'neutral';

export type BadgeShape = 'pill' | 'chip' | 'tag';

const variantClasses: Record<BadgeVariant, string> = {
  'match-live':      'bg-green-500/20 text-green-400',
  'match-upcoming':  'bg-yellow-500/20 text-yellow-400',
  'match-completed': 'bg-slate-600/40 text-[var(--text-muted)]',
  'match-abandoned': 'bg-slate-600/40 text-[var(--text-muted)]',
  'bet-won':         'bg-green-500/20 text-green-400',
  'bet-lost':        'bg-red-500/20 text-red-400',
  'bet-pending':     'bg-yellow-500/20 text-yellow-400',
  'bet-refunded':    'bg-slate-600/40 text-[var(--text-muted)]',
  'bet-locked':      'bg-blue-500/15 text-blue-400',
  'role-admin':      'bg-yellow-500/20 text-yellow-400',
  'role-member':     'bg-[var(--bg-hover)] text-[var(--text-muted)]',
  'format':          'bg-[var(--bg-input)] text-[var(--text-secondary)]',
  'neutral':         'bg-[var(--bg-card)] text-[var(--text-muted)]',
};

const shapeClasses: Record<BadgeShape, string> = {
  pill: 'rounded-full px-2 py-0.5',
  chip: 'rounded-full px-2.5 py-1',
  tag:  'rounded px-1.5 py-0.5',
};

interface BadgeProps {
  variant: BadgeVariant;
  shape?: BadgeShape;
  children: ReactNode;
  className?: string;
}

export const Badge: FC<BadgeProps> = ({
  variant,
  shape = 'pill',
  children,
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center text-xs font-medium ${variantClasses[variant]} ${shapeClasses[shape]} ${className}`}
    >
      {children}
    </span>
  );
};

/** Convenience helper: maps a match status string to the correct Badge variant */
export function matchStatusVariant(
  status: 'live' | 'upcoming' | 'completed' | 'abandoned',
): BadgeVariant {
  return `match-${status}` as BadgeVariant;
}

/** Convenience helper: maps a bet status string to the correct Badge variant */
export function betStatusVariant(
  status: 'pending' | 'won' | 'lost' | 'refunded' | 'locked',
): BadgeVariant {
  return `bet-${status}` as BadgeVariant;
}
