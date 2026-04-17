/**
 * tests/global-setup.ts
 *
 * Runs automatically before every `npm run test:e2e` call (registered as
 * globalSetup in playwright.config.ts).
 *
 * NOTE: Firebase Auth v9+ stores session state in IndexedDB, which Playwright
 * storageState cannot capture. This file therefore does NOT launch a browser
 * or write any .auth/*.json files. Instead it performs a lightweight credential
 * check — one Firebase REST API call per user — so that a misconfigured
 * .env.test is caught immediately rather than surfacing as auth failures inside
 * individual tests.
 *
 * Auth state is established per-test via loginAsRole() (authUtils.ts) →
 * loginWithFirebase() (firebaseAuthUtils.ts): REST API call → localStorage
 * injection → page reload.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as admin from 'firebase-admin';
import { parseEnvTest } from './utils/parseEnvTest';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthEntry {
  roleKey:  string;
  email:    string;
  password: string;
}

interface FirebaseSignInResponse {
  idToken?: string;
  error?:   { message?: string };
}

// ── Read Firebase API key from .env.local ─────────────────────────────────────

function readFirebaseApiKey(): string {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key   = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key === 'NEXT_PUBLIC_FIREBASE_API_KEY') return value;
  }
  throw new Error('global-setup: NEXT_PUBLIC_FIREBASE_API_KEY not found in .env.local');
}

// ── Build credential list ─────────────────────────────────────────────────────

function buildAuthList(): AuthEntry[] {
  const config  = parseEnvTest();
  const entries: AuthEntry[] = [];

  entries.push({
    roleKey:  'superAdmin',
    email:    config.superAdmin.email,
    password: config.superAdmin.password,
  });

  for (const group of config.groups) {
    for (const user of group.admins) {
      entries.push({ roleKey: `${group.key}_admin_${user.alias}`, email: user.email, password: user.password });
    }
    for (const user of group.members) {
      entries.push({ roleKey: `${group.key}_member_${user.alias}`, email: user.email, password: user.password });
    }
  }

  // Deduplicate by roleKey
  const seen   = new Set<string>();
  const unique: AuthEntry[] = [];
  for (const entry of entries) {
    if (!seen.has(entry.roleKey)) {
      seen.add(entry.roleKey);
      unique.push(entry);
    }
  }
  return unique;
}

// ── Verify a single credential via Firebase REST API ─────────────────────────

async function verifyCredential(
  apiKey:   string,
  email:    string,
  password: string,
): Promise<boolean> {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  const res  = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const body = (await res.json()) as FirebaseSignInResponse;
  return res.ok && !!body.idToken;
}

// ── Clean previous run artifacts ─────────────────────────────────────────────

function cleanArtifacts(): void {
  // Clear screenshot/video artifacts and the HTML report from the previous run.
  // Do NOT touch tests/logs/ — Playwright's JUnit reporter writes results.xml
  // there AFTER this function runs, and a shell redirect (> run.log) opened
  // before globalSetup would be unlinked if we deleted the directory here.
  const dirs = ['test-results', 'tests/playwright-report'];
  for (const dir of dirs) {
    const fullPath = path.resolve(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
    fs.mkdirSync(fullPath, { recursive: true });
  }

  // Ensure logs dir exists (created fresh only if absent).
  const logsDir = path.resolve(process.cwd(), 'tests/logs');
  fs.mkdirSync(logsDir, { recursive: true });

  console.log('  Previous run artifacts cleared (test-results, playwright-report)\n');
}

// ── Reset group member roles to .env.test baseline ───────────────────────────

async function resetGroupMemberRoles(): Promise<void> {
  const keyPath     = path.resolve(process.cwd(), 'serviceAccountKey.json');
  const sessionPath = path.resolve(process.cwd(), 'tests', 'test-session-uids.json');
  if (!fs.existsSync(keyPath) || !fs.existsSync(sessionPath)) return;

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(keyPath, 'utf-8'))) });
  }

  const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8')) as {
    uids: Record<string, string>;
    groupIds: Record<string, string>;
  };
  const config = parseEnvTest();
  const db     = admin.firestore();
  const updates: Promise<unknown>[] = [];

  for (const group of config.groups) {
    const groupId = session.groupIds[group.key];
    if (!groupId) continue;

    for (const user of group.admins) {
      const uid = session.uids[`${group.key}_admin_${user.alias}`];
      if (uid) updates.push(db.collection('groups').doc(groupId).collection('members').doc(uid).update({ role: 'admin' }));
    }
    for (const user of group.members) {
      const uid = session.uids[`${group.key}_member_${user.alias}`];
      if (uid) updates.push(db.collection('groups').doc(groupId).collection('members').doc(uid).update({ role: 'member' }));
    }
  }

  await Promise.all(updates);
  console.log('  Group member roles reset to .env.test baseline\n');
}

// ── Global setup ──────────────────────────────────────────────────────────────

export default async function globalSetup(): Promise<void> {
  cleanArtifacts();
  await resetGroupMemberRoles();

  const config  = parseEnvTest();
  const apiKey  = readFirebaseApiKey();
  const entries = buildAuthList();

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  WhoWins E2E — Verifying credentials (global setup)');
  console.log(`  Base URL : ${config.baseUrl}`);
  console.log(`  Roles    : ${entries.length}`);
  console.log('══════════════════════════════════════════════════════════════\n');

  const failed: string[] = [];

  for (const { roleKey, email, password } of entries) {
    const ok = await verifyCredential(apiKey, email, password);
    if (ok) {
      console.log(`  ✓  Credentials valid for [${roleKey}] (${email})`);
    } else {
      console.error(`  ✗  Invalid credentials for [${roleKey}] (${email})`);
      failed.push(roleKey);
    }
  }

  console.log('');

  if (failed.length > 0) {
    throw new Error(
      `Global setup: invalid credentials for: ${failed.join(', ')}.\n` +
      `Ensure credentials in .env.test are correct and Firebase Auth users exist.`,
    );
  }

  console.log('══════════════════════════════════════════════════════════════');
  console.log('  All credentials verified. Starting test run…');
  console.log('══════════════════════════════════════════════════════════════\n');
}
