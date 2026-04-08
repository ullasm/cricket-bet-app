import type { FC, ChangeEvent } from 'react';

interface FormCheckboxProps {
  id?: string;
  label: string;
  checked: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

export const FormCheckbox: FC<FormCheckboxProps> = ({
  id,
  label,
  checked,
  onChange,
  hint,
  disabled,
  className = '',
}) => {
  return (
    <label className={`flex items-center gap-2 cursor-pointer select-none ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="w-4 h-4 accent-green-500"
      />
      <span className="text-sm text-[var(--text-secondary)]">
        {label}
        {hint && <span className="ml-1 text-xs text-[var(--text-muted)]">{hint}</span>}
      </span>
    </label>
  );
};
