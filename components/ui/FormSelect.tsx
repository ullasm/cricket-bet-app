import type { FC, SelectHTMLAttributes, ReactNode } from 'react';

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  /** Wrapper div className */
  wrapperClassName?: string;
}

export const FormSelect: FC<FormSelectProps> = ({
  label,
  error,
  hint,
  children,
  wrapperClassName = '',
  id,
  className = '',
  ...rest
}) => {
  const selectClasses =
    `w-full rounded-lg bg-[var(--bg-input)] border border-[var(--border)] px-4 py-2.5 ` +
    `text-[var(--text-primary)] ` +
    `focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ` +
    className;

  return (
    <div className={wrapperClassName}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
        >
          {label}
        </label>
      )}
      <select id={id} className={selectClasses} {...rest}>
        {children}
      </select>
      {hint && !error && (
        <p className="text-xs text-[var(--text-muted)] mt-1">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
};
