import type { FC } from 'react';

type AvatarSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-sm',
};

interface AvatarProps {
  name: string;
  color: string;
  size?: AvatarSize;
  className?: string;
}

export const Avatar: FC<AvatarProps> = ({ name, color, size = 'md', className = '' }) => {
  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-semibold shrink-0 ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: color }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
};
