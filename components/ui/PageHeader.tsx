import type { FC, ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

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
  actions,
  maxWidth = '5xl',
  logoClassName,
  className = '',
}) => {
  return (
    <header
      className={`bg-[var(--bg-card)] border-b border-[var(--border)] px-6 py-4 ${className}`}
    >
      <div className={`${maxWidthClasses[maxWidth]} mx-auto flex items-center justify-between gap-4`}>
        {/* Left side */}
        <div className="flex items-center gap-3 min-w-0">
          {backHref && (
            <Link
              href={backHref}
              className="shrink-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
          )}
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

        {/* Right side */}
        {actions && (
          <div className="flex items-center gap-3 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
};
