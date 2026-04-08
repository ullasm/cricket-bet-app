'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/AuthContext';
import { getGroupByInviteCode, isGroupMember, joinGroup } from '@/lib/groups';
import type { Group } from '@/lib/groups';
import { Spinner, Button, Card, CenteredCard } from '@/components/ui';

type PageState = 'loading' | 'invalid' | 'unauthenticated' | 'already-member' | 'join';

export default function JoinPage() {
  const params = useParams<{ inviteCode: string }>();
  const inviteCode = params.inviteCode.toUpperCase();
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [pageState, setPageState] = useState<PageState>('loading');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    async function resolve() {
      if (!user) {
        setPageState('unauthenticated');
        return;
      }

      const found = await getGroupByInviteCode(inviteCode);
      if (!found) {
        setPageState('invalid');
        return;
      }
      setGroup(found);

      const member = await isGroupMember(found.groupId, user.uid);
      setPageState(member ? 'already-member' : 'join');
    }

    resolve().catch(() => setPageState('invalid'));
  }, [authLoading, user, inviteCode]);

  async function handleJoin() {
    if (!group || !user || !userProfile) return;
    setJoining(true);
    try {
      await joinGroup(group.groupId, user.uid, userProfile.displayName, userProfile.avatarColor);
      toast.success(`Welcome to ${group.name}!`);
      router.replace(`/groups/${group.groupId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to join group');
    } finally {
      setJoining(false);
    }
  }

  // ── Full screen spinner (auth + initial load) ─────────────────────────────
  if (pageState === 'loading') {
    return <Spinner size="lg" fullPage />;
  }

  // ── Invalid invite ────────────────────────────────────────────────────────
  if (pageState === 'invalid') {
    return (
      <CenteredCard maxWidth="max-w-sm">
        <Card variant="modal" padding="p-8" className="text-center space-y-4">
          <div className="text-4xl">🔗</div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Invalid invite link</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            This invite link is invalid or has expired.
          </p>
          <Button variant="primary" size="md" href="/groups">
            Go to My Groups
          </Button>
        </Card>
      </CenteredCard>
    );
  }

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (pageState === 'unauthenticated') {
    const redirectPath = `/join/${inviteCode}`;
    return (
      <CenteredCard maxWidth="max-w-sm">
        <Card variant="modal" padding="p-8" className="text-center space-y-5">
          <div className="text-4xl">🏆</div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">{group?.name}</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              You&apos;ve been invited to join <span className="font-medium text-[var(--text-primary)]">{group?.name}</span>
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button variant="primary" size="lg" href={`/login?redirect=${encodeURIComponent(redirectPath)}`} className="w-full">
              Sign in to join
            </Button>
            <Button variant="secondary" size="lg" href={`/register?redirect=${encodeURIComponent(redirectPath)}`} className="w-full">
              Create account
            </Button>
          </div>
        </Card>
      </CenteredCard>
    );
  }

  // ── Already a member ──────────────────────────────────────────────────────
  if (pageState === 'already-member') {
    return (
      <CenteredCard maxWidth="max-w-sm">
        <Card variant="modal" padding="p-8" className="text-center space-y-4">
          {/* ✓ checkmark: text-green-400 is brand accent text color, correct semantic use */}
          <div className="text-green-400 text-4xl">✓</div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">You&apos;re already in this group!</h2>
          <p className="text-sm text-[var(--text-secondary)]">{group?.name}</p>
          <Button variant="primary" size="md" href={`/groups/${group?.groupId}`}>
            Go to Group
          </Button>
        </Card>
      </CenteredCard>
    );
  }

  // ── Join confirmation ─────────────────────────────────────────────────────
  return (
    <CenteredCard maxWidth="max-w-sm">
      <Card variant="modal" padding="p-8" className="text-center space-y-5">
        <div className="text-4xl">🏆</div>
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">{group?.name}</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            You&apos;ve been invited to join this group
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          loading={joining}
          onClick={handleJoin}
          className="w-full"
        >
          Join Group
        </Button>
      </Card>
    </CenteredCard>
  );
}
