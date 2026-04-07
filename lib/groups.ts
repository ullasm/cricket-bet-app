import {
  collection,
  collectionGroup,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { db } from './firebase';

// ── interfaces ────────────────────────────────────────────────────────────────

export interface Group {
  groupId: string;
  name: string;
  createdBy: string;
  inviteCode: string;
  createdAt: Timestamp;
}

export interface GroupMember {
  userId: string;
  displayName: string;
  avatarColor: string;
  role: 'admin' | 'member';
  totalPoints: number;
  joinedAt: Timestamp;
}

// ── helpers ───────────────────────────────────────────────────────────────────

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ── Firestore functions ───────────────────────────────────────────────────────

export async function createGroup(
  name: string,
  userId: string,
  userDisplayName: string,
  userAvatarColor: string
): Promise<string> {
  const groupRef = await addDoc(collection(db, 'groups'), {
    name,
    createdBy: userId,
    inviteCode: generateInviteCode(),
    createdAt: serverTimestamp(),
  });

  await setDoc(doc(db, 'groups', groupRef.id, 'members', userId), {
    userId,
    displayName: userDisplayName,
    avatarColor: userAvatarColor,
    role: 'admin',
    totalPoints: 0,
    joinedAt: serverTimestamp(),
  });

  return groupRef.id;
}

export async function getUserGroups(userId: string): Promise<Group[]> {
  const memberSnap = await getDocs(
    query(collectionGroup(db, 'members'), where('userId', '==', userId))
  );

  const groups = await Promise.all(
    memberSnap.docs.map(async (memberDoc) => {
      // parent of member doc is the group doc
      const groupRef = memberDoc.ref.parent.parent;
      if (!groupRef) return null;
      const groupSnap = await getDoc(groupRef);
      if (!groupSnap.exists()) return null;
      return { groupId: groupSnap.id, ...groupSnap.data() } as Group;
    })
  );

  return groups.filter((g): g is Group => g !== null);
}

export async function getGroupById(groupId: string): Promise<Group | null> {
  const snap = await getDoc(doc(db, 'groups', groupId));
  if (!snap.exists()) return null;
  return { groupId: snap.id, ...snap.data() } as Group;
}

export async function getGroupByInviteCode(inviteCode: string): Promise<Group | null> {
  const snap = await getDocs(
    query(collection(db, 'groups'), where('inviteCode', '==', inviteCode))
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { groupId: d.id, ...d.data() } as Group;
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const snap = await getDocs(
    query(
      collection(db, 'groups', groupId, 'members'),
      orderBy('totalPoints', 'desc')
    )
  );
  return snap.docs.map((d) => d.data() as GroupMember);
}

export async function joinGroup(
  groupId: string,
  userId: string,
  displayName: string,
  avatarColor: string
): Promise<void> {
  const memberRef = doc(db, 'groups', groupId, 'members', userId);
  const existing = await getDoc(memberRef);
  if (existing.exists()) return;

  await setDoc(memberRef, {
    userId,
    displayName,
    avatarColor,
    role: 'member',
    totalPoints: 0,
    joinedAt: serverTimestamp(),
  });
}

export async function isGroupMember(groupId: string, userId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'groups', groupId, 'members', userId));
  return snap.exists();
}

export async function isGroupAdmin(groupId: string, userId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'groups', groupId, 'members', userId));
  if (!snap.exists()) return false;
  return (snap.data() as GroupMember).role === 'admin';
}

export async function promoteMember(groupId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId, 'members', userId), { role: 'admin' });
}

export async function demoteMember(groupId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId, 'members', userId), { role: 'member' });
}

export async function removeMember(groupId: string, userId: string): Promise<void> {
  await deleteDoc(doc(db, 'groups', groupId, 'members', userId));
}

export async function regenerateInviteCode(groupId: string): Promise<string> {
  const newCode = generateInviteCode();
  await updateDoc(doc(db, 'groups', groupId), { inviteCode: newCode });
  return newCode;
}

export async function getUserGroupMember(
  groupId: string,
  userId: string
): Promise<GroupMember | null> {
  const snap = await getDoc(doc(db, 'groups', groupId, 'members', userId));
  if (!snap.exists()) return null;
  return snap.data() as GroupMember;
}

export async function updateGroupName(groupId: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId), { name });
}
