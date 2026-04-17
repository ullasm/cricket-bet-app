// Server component layout — forces dynamic rendering for [inviteCode] routes.
export const dynamic = 'force-dynamic';

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
