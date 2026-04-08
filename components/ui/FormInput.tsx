import type { FC, InputHTMLAttributes } from 'react';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  /** Use red focus ring for destructive confirmation inputs */
  danger?: boolean;
  /** Wrapper div className */
  wrapperClassName?: string;
}

export const FormInput: FC<FormInputProps> = ({
  label,
  error,
  hint,
  danger = false,
  wrapperClassName = '',
  id,
  className = '',
  ...rest
}) => {
  const focusRing = danger
    ? 'focus:ring-red-500'
    : 'focus:ring-green-500';

  const inputClasses =
    `w-full rounded-lg bg-[var(--bg-input)] border border-[var(--border)] px-4 py-2.5 ` +
    `text-[var(--text-primary)] placeholder-[var(--text-muted)] ` +
    `focus:outline-none focus:ring-2 ${focusRing} focus:border-transparent ` +
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
      <input id={id} className={inputClasses} {...rest} />
      {hint && !error && (
        <p className="text-xs text-[var(--text-muted)] mt-1">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
};
