import type { FC, ReactNode } from 'react';
import Link from 'next/link';

type MaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '3xl' | '4xl' | '5xl';

const maxWidthClasses: Record<MaxWidth, string> = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
};

interface PageHeaderProps {
  /** href for the back chevron. When omitted, no back arrow is shown. */
  backHref?: string;
  /** Small subtitle rendered below the logo (e.g. "My Group · Settings") */
  subtitle?: string;
  /** Content rendered in the absolute center of the header (e.g. group name). */
  center?: ReactNode;
  /** Slot rendered on the right side of the header (ThemeSwitcher, avatar, action buttons…) */
  actions?: ReactNode;
  /** Inner container max-width. Defaults to '5xl'. */
  maxWidth?: MaxWidth;
  /**
   * Overrides the logo's font-size class.
   * Defaults to 'text-base' when subtitle is present, 'text-3xl' otherwise.
   */
  logoClassName?: string;
  className?: string;
}

export const PageHeader: FC<PageHeaderProps> = ({
  backHref,
  subtitle,
  center,
  actions,
  maxWidth = '5xl',
  logoClassName,
  className = '',
}) => {
  return (
    <header
      className={`bg-[var(--bg-card)] border-b border-[var(--border)] px-6 py-4 ${className}`}
    >
      {/*
       * 3-column grid: [left | center | right]
       * Left and right columns are `1fr` each so they take equal space,
       * which forces the auto-width center column to always sit exactly
       * in the middle of the header regardless of content width.
       */}
      <div className={`${maxWidthClasses[maxWidth]} mx-auto grid grid-cols-[1fr_auto_1fr] items-center gap-4`}>

        {/* Left: back chevron + logo */}
        <div className="flex items-center gap-3 min-w-0">

          <div className="min-w-0">
            <Link
              href="/"
              className={`font-bold text-green-500 ${logoClassName ?? (subtitle ? 'text-base' : 'text-3xl')}`}
            >
              🏆 WhoWins
            </Link>
            {subtitle && (
              <span className="text-xs text-[var(--text-secondary)] truncate block">
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Center: group name or any centered content */}
        <div className="flex items-center justify-center min-w-0 px-2">
          {center}
        </div>

        {/* Right: actions (aligned end) */}
        <div className="flex items-center justify-end gap-3 shrink-0">
          {actions}
        </div>

      </div>
    </header>
  );
};
