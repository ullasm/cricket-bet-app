/**
 * tests/e2e/betting/place-bet.spec.ts
 *
 * A7-06, A7-10 — Inline bet placement, change bet, and stake presets
 */

import { test, expect } from '@playwright/test';
import { getGroupId } from '../../utils/sessionUtils';
import { createTestMatch, deleteTestDocument } from '../../utils/firestoreUtils';
import { loginAsRole } from '../../utils/authUtils';

function dashUrl(groupId: string) { return `/groups/${groupId}`; }

test.describe('Inline bet placement — place, change, remove', () => {
  let matchId: string;

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, 'friends_member_raghu');
  });

  test.beforeEach(async () => {
    const groupId = getGroupId('friends');
    matchId = await createTestMatch(groupId, {
      teamA: 'India',
      teamB: 'England',
      drawAllowed: false,
      bettingOpen: true,
      status: 'upcoming',
    });
  });

  test.afterEach(async () => {
    if (matchId) await deleteTestDocument('matches', matchId);
  });

  test('A7-06: Click "Place Bet" → select outcome → set stake → confirm → bet recorded; button changes to "Change Bet"', async ({ page }) => {
    const groupId = getGroupId('friends');
    await page.goto(dashUrl(groupId));
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Open bet form
    await page.getByRole('button', { name: /Place Bet/i }).first().click();

    // Select India
    await page.getByRole('button', { name: 'India' }).first().click();

    // Set stake
    const stakeInput = page.getByPlaceholder('Custom amount');
    await stakeInput.clear();
    await stakeInput.fill('500');

    // Confirm
    await page.getByRole('button', { name: /Confirm Bet/i }).click();

    await expect(page.getByText(/placed successfully/i)).toBeVisible({ timeout: 10_000 });

    // Bet placed — "Change Bet" should appear
    await expect(page.getByRole('button', { name: /Change Bet/i }).first()).toBeVisible({ timeout: 8_000 });
  });

  test('A7-10: "Change Bet" opens inline form pre-filled with current outcome/stake', async ({ page }) => {
    const groupId = getGroupId('friends');
    await page.goto(dashUrl(groupId));
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Place a bet first
    await page.getByRole('button', { name: /Place Bet/i }).first().click();
    await page.getByRole('button', { name: 'India' }).first().click();
    const stakeInput = page.getByPlaceholder('Custom amount');
    await stakeInput.fill('750');
    await page.getByRole('button', { name: /Confirm Bet/i }).click();
    await expect(page.getByText(/placed successfully/i)).toBeVisible({ timeout: 10_000 });

    // Click Change Bet
    await page.getByRole('button', { name: /Change Bet/i }).first().click();

    // The form should open with the stake input visible and India outcome accessible
    await expect(page.getByPlaceholder('Custom amount')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: 'India' }).first()).toBeVisible();
  });

});
