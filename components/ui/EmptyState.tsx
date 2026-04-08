import type { FC, ReactNode } from 'react';
import { Button } from './Button';

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  /** Emoji string or any ReactNode (icon, image, etc.) */
  icon?: ReactNode;
  heading: string;
  subtext?: string;
  action?: EmptyStateAction;
  /** Use 'card' (default) for the full padded card look, or 'inline' for a simple centered text block */
  variant?: 'card' | 'inline';
  className?: string;
}

export const EmptyState: FC<EmptyStateProps> = ({
  icon,
  heading,
  subtext,
  action,
  variant = 'card',
  className = '',
}) => {
  const inner = (
    <>
      {icon && (
        <div className="text-4xl leading-none">{icon}</div>
      )}
      <p className="text-[var(--text-secondary)] text-base">{heading}</p>
      {subtext && (
        <p className="text-[var(--text-muted)] text-sm">{subtext}</p>
      )}
      {action && (
        action.href ? (
          <Button variant="primary" size="lg" href={action.href}>
            {action.label}
          </Button>
        ) : (
          <Button variant="primary" size="lg" onClick={action.onClick}>
            {action.label}
          </Button>
        )
      )}
    </>
  );

  if (variant === 'inline') {
    return (
      <div className={`flex flex-col items-center gap-3 text-center ${className}`}>
        {inner}
      </div>
    );
  }

  return (
    <div
      className={`bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-12 flex flex-col items-center gap-4 text-center ${className}`}
    >
      {inner}
    </div>
  );
};
