import type { FC, ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  /** Optional element rendered on the right side (button, link, etc.) */
  action?: ReactNode;
  /** Bottom margin class. Defaults to 'mb-3'. */
  mb?: string;
  className?: string;
}

export const SectionHeader: FC<SectionHeaderProps> = ({
  title,
  action,
  mb = 'mb-3',
  className = '',
}) => {
  if (action) {
    return (
      <div className={`flex items-center justify-between ${mb} ${className}`}>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
        {action}
      </div>
    );
  }

  return (
    <h2 className={`text-lg font-semibold text-[var(--text-primary)] ${mb} ${className}`}>
      {title}
    </h2>
  );
};
