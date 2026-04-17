/**
 * tests/utils/sessionUtils.ts
 *
 * Runtime accessors for the test session data written by provisionUsers.ts.
 * Never hardcode groupIds or UIDs in test files — always go through these helpers.
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseEnvTest } from './parseEnvTest';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SessionData {
  sessionId: string;
  uids: Record<string, string>;
  groupIds: Record<string, string>;
}

// ── Session loader (singleton, cached after first read) ───────────────────────

let _session: SessionData | null = null;

function getSession(): SessionData {
  if (_session) return _session;
  const filePath = path.resolve(process.cwd(), 'tests', 'test-session-uids.json');
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `tests/test-session-uids.json not found.\n` +
      'Run "npm run test:setup" to provision test users before running tests.'
    );
  }
  _session = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as SessionData;
  return _session;
}

// ── Public accessors ──────────────────────────────────────────────────────────

/**
 * Returns the Firestore document ID of a test group.
 * @param key  'friends' | 'family'
 */
export function getGroupId(key: 'friends' | 'family'): string {
  const id = getSession().groupIds[key];
  if (!id) throw new Error(`No groupId for key: "${key}"`);
  return id;
}

/**
 * Returns the Firebase Auth UID for a session user.
 * @param key  e.g. 'superAdmin', 'friends_admin_ullas', 'friends_member_raghu'
 */
export function getUid(key: string): string {
  const uid = getSession().uids[key];
  if (!uid) throw new Error(`No UID for session key: "${key}"`);
  return uid;
}

/** Returns the session identifier string (e.g. "ww-test-2026-04-16-0910"). */
export function getSessionId(): string {
  return getSession().sessionId;
}

/** Returns the base URL from .env.test [config] section. */
export function getBaseUrl(): string {
  return parseEnvTest().baseUrl;
}
