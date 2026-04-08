import type { FC } from 'react';

type SpinnerSize = 'sm' | 'md' | 'xl' | 'lg';

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  xl: 'h-8 w-8',
  lg: 'h-10 w-10',
};

interface SpinnerProps {
  size?: SpinnerSize;
  /** Wrap in a full-screen centered container */
  fullPage?: boolean;
  className?: string;
}

export type { SpinnerSize };

export const Spinner: FC<SpinnerProps> = ({ size = 'md', fullPage = false, className = '' }) => {
  const svg = (
    <svg
      className={`animate-spin text-green-500 ${sizeClasses[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        {svg}
      </div>
    );
  }

  return svg;
};
