/**
 * tests/utils/authUtils.ts
 *
 * Shared login helpers for Playwright tests.
 * Authenticates by navigating to /login and submitting the form — the same
 * flow a real user follows.
 */

import type { Page } from '@playwright/test';
import { parseEnvTest } from './parseEnvTest';
import { loginWithFirebase } from './firebaseAuthUtils';

/**
 * Authenticate `page` as `email` using the Firebase REST API.
 * Signature is unchanged from the form-based version so all callers work as-is.
 */
export async function loginAs(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await loginWithFirebase(page, email, password);
}

/**
 * Resolves the email/password for a given session role key and calls loginAs.
 *
 * Role key format:  'superAdmin'  |  '{groupKey}_{role}_{alias}'
 * Examples:         'superAdmin', 'friends_admin_ullas', 'family_member_yashu'
 */
export async function loginAsRole(
  page: Page,
  roleKey: string,
): Promise<void> {
  const config = parseEnvTest();

  if (roleKey === 'superAdmin') {
    return loginAs(page, config.superAdmin.email, config.superAdmin.password);
  }

  // Parse  {groupKey}_{role}_{alias}
  const parts = roleKey.split('_');
  if (parts.length < 3) {
    throw new Error(
      `loginAsRole: invalid roleKey "${roleKey}". ` +
      'Expected format: "{groupKey}_{role}_{alias}"'
    );
  }

  const groupKey = parts[0];
  const role     = parts[1];
  const alias    = parts.slice(2).join('_'); // alias may itself contain underscores

  const group = config.groups.find((g) => g.key === groupKey);
  if (!group) {
    throw new Error(`loginAsRole: no group with key "${groupKey}" in .env.test`);
  }

  const pool = role === 'admin' ? group.admins : group.members;
  const user = pool.find((u) => u.alias === alias);
  if (!user) {
    throw new Error(
      `loginAsRole: no ${role} with alias "${alias}" in group "${groupKey}"`
    );
  }

  return loginAs(page, user.email, user.password);
}
