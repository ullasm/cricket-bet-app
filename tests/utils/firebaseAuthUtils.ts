/**
 * tests/utils/firebaseAuthUtils.ts
 *
 * Authenticates a Playwright page by navigating to /login and submitting
 * the email/password form — the same flow a real user follows.
 *
 * Note: the previous implementation used the Firebase REST API + localStorage
 * injection to avoid the form.  That was only needed when tests relied on
 * Playwright storageState to persist sessions across pages (which doesn't
 * work with Firebase Auth v9+ because it stores state in IndexedDB).
 * Since every test calls loginAsRole() fresh, the form-based approach is
 * simpler, more reliable, and avoids the page.goto() / waitUntil:'load'
 * hanging issue caused by persistent Firestore streams in fresh contexts.
 */

import type { Page } from '@playwright/test';

/**
 * Authenticate `page` by navigating to /login and submitting the form.
 * Waits until the app redirects to /groups, confirming the login succeeded.
 */
export async function loginWithFirebase(
  page:     Page,
  email:    string,
  password: string,
): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.waitForURL('**/groups**', { timeout: 30_000 });
}
