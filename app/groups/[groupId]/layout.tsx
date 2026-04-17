// Server component layout — forces dynamic rendering for all [groupId] routes.
// Required because the page files are 'use client' components, which cannot
// export route-segment config (dynamic, generateStaticParams, etc.).
// Without this, Next.js omits these routes from prerender-manifest.json and
// `next start` returns 404 for every /groups/[groupId]/* URL.
export const dynamic = 'force-dynamic';

export default function GroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
