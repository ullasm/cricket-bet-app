/**
 * tests/setup/saveAuthState.ts
 *
 * !! OBSOLETE — kept for reference only. Do NOT run this script. !!
 *
 * Firebase Auth v9+ stores session state in IndexedDB. Playwright storageState
 * captures only cookies and localStorage, so any .auth/*.json files saved here
 * do NOT contain a valid Firebase session — tests would start unauthenticated.
 *
 * Auth is now handled per-test via loginAsRole() → loginWithFirebase():
 *   1. POST credentials to the Firebase REST API (Node, not the browser).
 *   2. Inject the returned token into localStorage in Firebase SDK format.
 *   3. Reload the page so the SDK reads it and establishes a session.
 *
 * global-setup.ts performs a lightweight credential check (REST API only,
 * no browser) before every test run to catch misconfigured .env.test early.
 */

import * as path from 'path';
import * as fs from 'fs';
import { chromium } from '@playwright/test';
import { parseEnvTest } from '../utils/parseEnvTest';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthEntry {
  /** Key used for the .json filename, e.g. "friends_admin_ullas" */
  roleKey: string;
  email: string;
  password: string;
}

// ── Build the list of users to authenticate ───────────────────────────────────

function buildAuthList(): AuthEntry[] {
  const config = parseEnvTest();
  const entries: AuthEntry[] = [];

  // Super admin
  entries.push({
    roleKey:  'superAdmin',
    email:    config.superAdmin.email,
    password: config.superAdmin.password,
  });

  // All group users
  for (const group of config.groups) {
    for (const user of group.admins) {
      entries.push({
        roleKey:  `${group.key}_admin_${user.alias}`,
        email:    user.email,
        password: user.password,
      });
    }
    for (const user of group.members) {
      entries.push({
        roleKey:  `${group.key}_member_${user.alias}`,
        email:    user.email,
        password: user.password,
      });
    }
  }

  // Deduplicate by email (ullas appears in both groups — save both role files
  // but they will share the same login session).
  const seen = new Set<string>();
  const unique: AuthEntry[] = [];
  for (const entry of entries) {
    // Always include (even duplicate emails) since each roleKey maps to a
    // separate .json file that tests reference.
    if (!seen.has(entry.roleKey)) {
      seen.add(entry.roleKey);
      unique.push(entry);
    }
  }
  return unique;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const config   = parseEnvTest();
  const authDir  = path.resolve(process.cwd(), 'tests', '.auth');
  const baseUrl  = config.baseUrl;

  // Ensure .auth directory exists
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  console.log('══════════════════════════════════════════════════════════════');
  console.log('  WhoWins E2E — Save Auth State');
  console.log(`  Base URL: ${baseUrl}`);
  console.log('══════════════════════════════════════════════════════════════');

  const entries = buildAuthList();
  console.log(`\nSaving auth state for ${entries.length} role keys...\n`);

  const browser = await chromium.launch({ headless: true });

  for (const entry of entries) {
    const { roleKey, email, password } = entry;
    const outPath = path.join(authDir, `${roleKey}.json`);

    console.log(`  → ${roleKey} (${email})`);

    const context = await browser.newContext({ baseURL: baseUrl });
    const page    = await context.newPage();

    try {
      await page.goto('/login');
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill(password);
      await page.getByRole('button', { name: 'Sign In' }).click();

      // Wait until we leave /login
      await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
        timeout: 15_000,
      });

      await context.storageState({ path: outPath });
      console.log(`     ✓ Saved: ${outPath}`);

      // Verify the session is actually authenticated
      await page.goto('/groups');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      const verifyUrl = page.url();
      if (verifyUrl.includes('/login')) {
        throw new Error(
          `Session for ${roleKey} was not saved correctly — navigating to /groups redirected to /login`
        );
      }
      console.log(`     ✓ Verified: session is authenticated`);
    } catch (err) {
      console.error(`     ✗ FAILED for ${roleKey}:`, err);
    } finally {
      await context.close();
    }
  }

  await browser.close();

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  Auth state saved. You can now run: npm run test:e2e');
  console.log('══════════════════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('\n[saveAuthState] FATAL:', err.message ?? err);
  process.exit(1);
});
