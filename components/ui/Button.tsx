import type { FC, ButtonHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost-danger' | 'ghost' | 'ghost-warning';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-green-500 hover:bg-green-600 text-white',
  secondary:
    'bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border)]',
  danger:
    'bg-red-500 hover:bg-red-600 text-white',
  'ghost-danger':
    'bg-red-500/10 hover:bg-red-500/20 text-red-400',
  ghost:
    'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
  'ghost-warning':
    'text-[var(--text-secondary)] hover:text-red-400',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-sm',
};

interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Render as a Next.js Link (pass href). The element becomes an <a> tag. */
  href?: string;
  children?: ReactNode;
  className?: string;
}

type ButtonProps = ButtonBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps | 'href'>;

export const Button: FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  href,
  children,
  className = '',
  disabled,
  ...rest
}) => {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed';
  const classes = `${base} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
  const isDisabled = disabled || loading;

  const content = (
    <>
      {loading && <Spinner size="sm" />}
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} disabled={isDisabled} {...rest}>
      {content}
    </button>
  );
};
