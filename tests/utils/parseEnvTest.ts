/**
 * tests/utils/parseEnvTest.ts
 *
 * Parses the INI-style .env.test file at the project root and returns a
 * strongly-typed TestConfig object.  Throws a descriptive error for any
 * missing required field so failures are caught before any network call.
 *
 * File format supported:
 *
 *   [config]
 *   base_url=http://localhost:3000
 *   session_id=auto
 *
 *   [super_admin]
 *   email=...
 *   password=...
 *
 *   [group.friends]
 *   display_name=GroupA
 *   admin.ullas.name=Ullas
 *   admin.ullas.email=...
 *   admin.ullas.password=...
 *   member.raghu.name=Raghu
 *   ...
 *
 *   [teardown]
 *   delete_firebase_auth_users=true
 *   ...
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Public types ──────────────────────────────────────────────────────────────

export interface TestUser {
  /** Short alias used as part of the uid key, e.g. "ullas", "vasu" */
  alias: string;
  name: string;
  email: string;
  password: string;
}

export interface TestGroup {
  /** Suffix after "group.", e.g. "friends" or "family" */
  key: string;
  /** Human-readable group name written to Firestore */
  displayName: string;
  admins: TestUser[];
  members: TestUser[];
}

export interface TestConfig {
  baseUrl: string;
  /**
   * Session identifier prefixed to all test-created Firestore documents.
   * When the .env.test value is "auto" this is generated as
   * ww-test-YYYY-MM-DD-HHmm at parse time.
   */
  sessionId: string;
  superAdmin: { email: string; password: string };
  groups: TestGroup[];
  teardown: {
    deleteFirebaseAuthUsers: boolean;
    deleteFirestoreGroups: boolean;
    deleteFirestoreMatches: boolean;
    deleteFirestoreBets: boolean;
    deleteFirestoreUsers: boolean;
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function generateSessionId(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `ww-test-${now.getFullYear()}-` +
    `${pad(now.getMonth() + 1)}-${pad(now.getDate())}-` +
    `${pad(now.getHours())}${pad(now.getMinutes())}`
  );
}

function requireField(
  section: string,
  data: Record<string, string>,
  key: string,
): string {
  const val = data[key];
  if (!val) {
    throw new Error(`[${section}] "${key}" is required but was not found in .env.test`);
  }
  return val;
}

function parseBool(section: string, data: Record<string, string>, key: string): boolean {
  const raw = data[key];
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new Error(
    `[${section}] "${key}" must be "true" or "false", got: "${raw ?? '(missing)'}"`
  );
}

/**
 * Parse an INI file into a map of section → (key → value).
 * Blank lines and lines starting with # are ignored.
 */
function parseIni(raw: string): Record<string, Record<string, string>> {
  const sections: Record<string, Record<string, string>> = {};
  let current = '__root__';

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('[') && line.endsWith(']')) {
      current = line.slice(1, -1).trim();
      if (!(current in sections)) sections[current] = {};
      continue;
    }

    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;

    const key = line.slice(0, eqIdx).trim();
    const value = line.slice(eqIdx + 1).trim();
    if (!(current in sections)) sections[current] = {};
    sections[current][key] = value;
  }

  return sections;
}

/**
 * Parse all users out of a group section.
 *
 * Keys follow the pattern  `<role>.<alias>.<field>`  e.g.:
 *   admin.ullas.name  admin.ullas.email  admin.ullas.password
 *   member.raghu.name ...
 *
 * Preserved insertion order within each role bucket.
 */
function parseGroupUsers(
  sectionName: string,
  data: Record<string, string>,
): { admins: TestUser[]; members: TestUser[] } {
  // Map of "role.alias" → partial user data
  const userMap = new Map<string, Partial<TestUser> & { role: 'admin' | 'member' }>();

  for (const [k, v] of Object.entries(data)) {
    if (k === 'display_name') continue;

    const parts = k.split('.');
    if (parts.length !== 3) continue;

    const [roleRaw, alias, field] = parts;
    if (roleRaw !== 'admin' && roleRaw !== 'member') continue;

    const mapKey = `${roleRaw}.${alias}`;
    if (!userMap.has(mapKey)) {
      userMap.set(mapKey, { alias, role: roleRaw as 'admin' | 'member' });
    }

    const entry = userMap.get(mapKey)!;
    if (field === 'name')     entry.name = v;
    else if (field === 'email')    entry.email = v;
    else if (field === 'password') entry.password = v;
  }

  const admins: TestUser[] = [];
  const members: TestUser[] = [];

  for (const [mapKey, user] of userMap.entries()) {
    if (!user.alias || !user.name || !user.email || !user.password) {
      throw new Error(
        `[${sectionName}] User "${mapKey}" is missing one of: name, email, password`
      );
    }
    const testUser: TestUser = {
      alias:    user.alias,
      name:     user.name,
      email:    user.email,
      password: user.password,
    };
    if (user.role === 'admin') admins.push(testUser);
    else members.push(testUser);
  }

  return { admins, members };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Parse .env.test from the project root and return a fully-validated
 * TestConfig.  Throws immediately if any required field is absent.
 */
export function parseEnvTest(): TestConfig {
  const filePath = path.resolve(process.cwd(), '.env.test');

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `.env.test not found at: ${filePath}\n` +
      'Create it from the template in tests/TEST_PLAN.md before running tests.'
    );
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const sections = parseIni(raw);

  // ── [config] ─────────────────────────────────────────────────────────────
  const cfg = sections['config'] ?? {};
  const baseUrl = requireField('config', cfg, 'base_url');
  const rawSessionId = cfg['session_id'] ?? 'auto';
  const sessionId = rawSessionId === 'auto' ? generateSessionId() : rawSessionId;

  // ── [super_admin] ─────────────────────────────────────────────────────────
  const sa = sections['super_admin'] ?? {};
  const superAdmin = {
    email:    requireField('super_admin', sa, 'email'),
    password: requireField('super_admin', sa, 'password'),
  };

  // ── [group.*] ─────────────────────────────────────────────────────────────
  const groups: TestGroup[] = [];

  for (const [sectionName, sectionData] of Object.entries(sections)) {
    if (!sectionName.startsWith('group.')) continue;

    const key = sectionName.slice('group.'.length);
    const displayName = requireField(sectionName, sectionData, 'display_name');
    const { admins, members } = parseGroupUsers(sectionName, sectionData);

    if (admins.length === 0) {
      throw new Error(`[${sectionName}] must define at least one admin user`);
    }

    groups.push({ key, displayName, admins, members });
  }

  if (groups.length === 0) {
    throw new Error('No [group.*] sections found in .env.test');
  }

  // ── [teardown] ────────────────────────────────────────────────────────────
  const td = sections['teardown'] ?? {};
  const teardown = {
    deleteFirebaseAuthUsers: parseBool('teardown', td, 'delete_firebase_auth_users'),
    deleteFirestoreGroups:   parseBool('teardown', td, 'delete_firestore_groups'),
    deleteFirestoreMatches:  parseBool('teardown', td, 'delete_firestore_matches'),
    deleteFirestoreBets:     parseBool('teardown', td, 'delete_firestore_bets'),
    deleteFirestoreUsers:    parseBool('teardown', td, 'delete_firestore_users'),
  };

  return { baseUrl, sessionId, superAdmin, groups, teardown };
}
