'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, User, Palette } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/AuthContext';
import { logoutUser } from '@/lib/auth';
import { useTheme, type Theme } from '@/lib/ThemeContext';
import { PageHeader, Avatar } from '@/components/ui';

type MaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '3xl' | '4xl' | '5xl';

interface AppNavbarProps {
  backHref?: string;
  subtitle?: string;
  center?: ReactNode;
  maxWidth?: MaxWidth;
  extraActions?: ReactNode;
}

const THEMES: { value: Theme; label: string; icon: string }[] = [
  { value: 'dark',          label: 'Dark',    icon: '🌙' },
  { value: 'light',         label: 'Light',   icon: '☀️' },
  { value: 'dark-compact',  label: 'Dark C',  icon: '🌙' },
  { value: 'light-compact', label: 'Light C', icon: '☀️' },
];

/**
 * AppNavbar — single nav bar for every authenticated page.
 *
 * Avatar click opens a dropdown containing:
 *   • User name + points
 *   • My Profile link
 *   • Theme picker (inline swatches)
 *   • Sign out
 */
export default function AppNavbar({
  backHref,
  subtitle,
  center,
  maxWidth = '5xl',
  extraActions,
}: AppNavbarProps) {
  const router = useRouter();
  const { userProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    try {
      await logoutUser();
      router.replace('/login');
    } catch {
      toast.error('Failed to sign out');
    }
  }

  const actions = (
    <>
      {extraActions}

      {/* Avatar dropdown */}
      {userProfile && (
        <div ref={menuRef} className="relative">

          {/* Trigger button */}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="true"
            aria-expanded={open}
            aria-label="Account menu"
            className="flex items-center gap-1.5 rounded-full hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          >
            <Avatar
              name={userProfile.displayName}
              color={userProfile.avatarColor}
              size="md"
            />
            <svg
              className={`h-3 w-3 text-[var(--text-secondary)] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
              viewBox="0 0 12 12"
              fill="currentColor"
              aria-hidden
            >
              <path d="M6 8L1 3h10L6 8z" />
            </svg>
          </button>

          {/* Dropdown panel */}
          {open && (
            <div className="absolute right-0 top-full mt-2 w-56 z-50 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden">

              {/* User identity */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
                <Avatar
                  name={userProfile.displayName}
                  color={userProfile.avatarColor}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {userProfile.displayName}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {userProfile.totalPoints} pts
                  </p>
                </div>
              </div>

              {/* My Profile */}
              <div className="py-1 border-b border-[var(--border)]">
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <User className="h-4 w-4 text-[var(--text-secondary)]" />
                  My Profile
                </Link>
              </div>

              {/* Theme picker */}
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <p className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1.5 mb-2">
                  <Palette className="h-3.5 w-3.5" />
                  Theme
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {THEMES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTheme(t.value)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        theme === t.value
                          ? 'bg-green-500/15 text-green-400 ring-1 ring-green-500/40'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sign out */}
              <div className="py-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>

            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <PageHeader
      backHref={backHref}
      subtitle={subtitle}
      center={center}
      maxWidth={maxWidth}
      actions={actions}
    />
  );
}
