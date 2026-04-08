import type { FC, ReactNode } from 'react';

interface CenteredCardProps {
  children: ReactNode;
  maxWidth?: string;
}

export const CenteredCard: FC<CenteredCardProps> = ({
  children,
  maxWidth = 'max-w-md',
}) => (
  <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
    <div className={`${maxWidth} w-full`}>
      {children}
    </div>
  </div>
);
