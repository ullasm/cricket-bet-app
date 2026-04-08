import type { FC, ReactNode } from 'react';

export type CardVariant = 'default' | 'modal' | 'danger-zone';

const variantClasses: Record<CardVariant, string> = {
  'default':     'bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-[var(--card-padding)]',
  'modal':       'bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-xl',
  'danger-zone': 'bg-[var(--bg-card)] border border-red-500/30 rounded-xl p-[var(--card-padding)]',
};

interface CardProps {
  variant?: CardVariant;
  /** Only used when variant="modal". Defaults to p-6. */
  padding?: string;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const Card: FC<CardProps> = ({
  variant = 'default',
  padding,
  header,
  footer,
  children,
  className = '',
}) => {
  const modalPadding = variant === 'modal' ? (padding ?? 'p-6') : '';

  return (
    <div className={`${variantClasses[variant]} ${modalPadding} ${className}`}>
      {header && (
        <div className="mb-4">
          {header}
        </div>
      )}
      {children}
      {footer && (
        <div className="mt-4">
          {footer}
        </div>
      )}
    </div>
  );
};
