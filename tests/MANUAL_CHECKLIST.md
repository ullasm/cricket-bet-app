# WhoWins — Manual Test Checklist

> Items in this checklist cannot be automated by Playwright because they require:
> - Visual/perceptual inspection (themes, layout)
> - Native browser dialogs or OS-level interactions (share sheets)
> - Touch gestures on physical mobile devices
> - PWA install prompts (browser-controlled UX)
> - Stubs where the route is unreachable from the live UI

**Legend:**  
✅ Pass  ❌ Fail  ⚠️ Partial  🔁 Not tested  

---

## 1. Visual Theme Correctness

> Test each theme on the **Groups list (`/groups`)**, **Group Dashboard**, **Matches Admin**, and **Profile** pages.

### 1.1 Dark Theme (default)

| # | What to do | What to expect | Result |
|---|---|---|---|
| 1.1.1 | Open app with no localStorage theme override | Background is dark (near-black), card surfaces are dark grey, text is white/light grey | 🔁 |
| 1.1.2 | Check all buttons | Primary buttons are green-500; Danger buttons are red; Secondary buttons are grey | 🔁 |
| 1.1.3 | Check form inputs on /login | Dark background input, light-coloured placeholder text, green focus ring | 🔁 |
| 1.1.4 | Check badge colours | Format badge, status badge (Upcoming=blue, Live=green, Completed=grey, Abandoned=yellow) all readable | 🔁 |

### 1.2 Light Theme

| # | What to do | What to expect | Result |
|---|---|---|---|
| 1.2.1 | Switch to light theme (if theme toggle exists) OR set localStorage to light | Background is white/light grey, card surfaces are white, text is dark | 🔁 |
| 1.2.2 | Verify no text/background contrast failures | All text readable against card and page backgrounds | 🔁 |
| 1.2.3 | Check green accent elements | Navbar logo, primary buttons, focus rings remain green-500 or adapted for light | 🔁 |

### 1.3 Dark-Compact Theme

| # | What to do | What to expect | Result |
|---|---|---|---|
| 1.3.1 | Switch to dark-compact theme | Same colours as Dark but reduced padding/spacing on cards and list items | 🔁 |
| 1.3.2 | Verify match cards on dashboard are more compact | Reduced vertical whitespace between match cards | 🔁 |

### 1.4 Light-Compact Theme

| # | What to do | What to expect | Result |
|---|---|---|---|
| 1.4.1 | Switch to light-compact theme | Light colour palette with compact spacing | 🔁 |
| 1.4.2 | Verify readability | No text clipping or overflow on compact group cards | 🔁 |

---

## 2. WhatsApp Share Sheet

| # | What to do | What to expect | Result |
|---|---|---|---|
| 2.1 | Open `/groups/[groupId]/group` as a group member | "Share on WhatsApp" button is visible | 🔁 |
| 2.2 | Click "Share on WhatsApp" on a **mobile device** (iOS/Android) | Native share sheet opens with the invite link and group name pre-filled in the message body | 🔁 |
| 2.3 | Click "Share on WhatsApp" on **desktop Chrome** | WhatsApp Web opens in a new tab (or share intent fires) with the invite URL | 🔁 |
| 2.4 | Verify the invite link in the shared message is correct | URL matches `[baseUrl]/join/[inviteCode]` format | 🔁 |

---

## 3. Mobile Layout and Touch Interactions

> Test on a real device or Chrome DevTools device emulation at 375×812 (iPhone SE).

| # | What to do | What to expect | Result |
|---|---|---|---|
| 3.1 | Open `/login` on mobile | Full-width card centred vertically; keyboard doesn't push layout off-screen | 🔁 |
| 3.2 | Open `/groups` on mobile | Group cards stack in a single column (not grid) | 🔁 |
| 3.3 | Open `/groups/[groupId]` on mobile | Navbar shows logo + avatar row; group name row; tabs row — all 3 rows visible | 🔁 |
| 3.4 | Tap the inline "Place Bet" button | Bet form expands inline; keyboard appears for stake input; no layout overflow | 🔁 |
| 3.5 | Tap "+100" stake preset three times | Stake accumulates correctly on mobile tap | 🔁 |
| 3.6 | Open `/groups/[groupId]/group` on mobile | Member list is scrollable; all action buttons are tap-accessible | 🔁 |
| 3.7 | Open `/admin` as superAdmin on mobile | Series table is horizontally scrollable or wraps gracefully | 🔁 |
| 3.8 | Tap the user avatar in the navbar | Dropdown opens; Admin link visible for superAdmin, not visible for members | 🔁 |

---

## 4. PWA Install Prompt

| # | What to do | What to expect | Result |
|---|---|---|---|
| 4.1 | Visit the app in Chrome on Android (first visit) | Browser shows "Add to Home Screen" banner or install prompt after a brief interaction | 🔁 |
| 4.2 | Accept the install prompt | App installs as a PWA; standalone window opens with correct app name and icon | 🔁 |
| 4.3 | Open the installed PWA | Loads without browser chrome (no address bar); splash screen shows app logo | 🔁 |
| 4.4 | Navigate between pages inside the PWA | All navigation works; no broken back-button behaviour | 🔁 |

---

## 5. Stubs — Routes Unreachable from Live UI

These scenarios are marked `[STUB]` in the test plan. They require direct URL navigation to reach.

### 5.1 Bet Page `/groups/[groupId]/bet/[matchId]`

> **Stub reason:** No navigation link in the current UI points to this page. The dashboard uses inline betting cards instead.  
> **How to test:** Manually construct the URL using a known `groupId` and `matchId` from Firestore.

| # | What to do | What to expect | Result |
|---|---|---|---|
| 5.1.1 | Navigate to `/groups/{groupId}/bet/{matchId}` with `bettingOpen=true` as a member | Outcome picker shows 2 or 3 buttons (based on `drawAllowed`) | 🔁 |
| 5.1.2 | Select an outcome; click Confirm | Bet is placed; redirected to group dashboard; stake is hardcoded to 1000 pts | 🔁 |
| 5.1.3 | Navigate to the page when `bettingOpen=false` | Read-only locked view; existing bet shown or "no bet placed" message | 🔁 |
| 5.1.4 | Navigate as unauthenticated | Redirected to `/login` | 🔁 |
| 5.1.5 | Navigate as non-member | "Access denied" card shown | 🔁 |
| 5.1.6 | Navigate with invalid `matchId` | "Match not found" card shown | 🔁 |

### 5.2 Settlements Page `/groups/[groupId]/settlements`

> **Stub reason:** The Settlements tab only appears in the navbar when you are already on the settlements page — no other group page links to it. Effectively invisible without knowing the URL.

| # | What to do | What to expect | Result |
|---|---|---|---|
| 5.2.1 | Navigate directly to `/groups/{groupId}/settlements` as a member | Full settlements table loads; outstanding and acknowledged rows shown | 🔁 |
| 5.2.2 | Confirm "Settlements" tab appears in navbar **only on this page** | Dashboard, Points, Group pages do NOT show a Settlements tab | 🔁 |
| 5.2.3 | As the recipient of a settlement, type exact phrase → click "Received" | Settlement marked acknowledged; "Received ✓" shown for recipient row | 🔁 |
| 5.2.4 | Navigate as unauthenticated | Redirected to `/login` | 🔁 |

### 5.3 Settlements on Points Page (Feature-Flagged Off)

> **Stub reason:** `NEXT_PUBLIC_SHOW_SETTLEMENTS=false` — the settlements section on `/groups/[groupId]/points` is hidden.

| # | What to do | What to expect | Result |
|---|---|---|---|
| 5.3.1 | Set `NEXT_PUBLIC_SHOW_SETTLEMENTS=true` in `.env.local` and restart `npm run dev` | Settlements section appears on Points page below the standings table | 🔁 |
| 5.3.2 | Verify settlements render the same as the standalone settlements page | Same rows, same acknowledgement flow | 🔁 |

### 5.4 Admin Series Delete (Partial)

> **Stub reason:** "Remove series" button only hides the series from local UI state. It does NOT delete from Firestore.

| # | What to do | What to expect | Result |
|---|---|---|---|
| 5.4.1 | Click "Remove series" on any series row in `/admin` | Series row disappears from the list; toast says to delete manually via Firebase Console | 🔁 |
| 5.4.2 | Reload `/admin` | The series **reappears** (was never deleted from Firestore) | 🔁 |

### 5.5 Tab Navigation Consistency Gap

> **Stub reason:** The Settlements page has a different nav tab set from all other group pages.

| # | What to do | What to expect | Result |
|---|---|---|---|
| 5.5.1 | Navigate to the group Dashboard, Points, Group pages | Verify none of them show a "Settlements" tab | 🔁 |
| 5.5.2 | Navigate to `/groups/{groupId}/settlements` directly | Verify a "Settlements" tab appears in the navbar **only here** | 🔁 |
| 5.5.3 | Note the discrepancy for a UX backlog ticket | No automatic navigation path exists to the Settlements page from the main group nav | 🔁 |

---

## 6. Rollover Flow (Complex Scenario B-08)

> **Reason not automated:** Requires a specific sequence — create match with noDrawPolicy=rollover, member bets, admin declares draw (locking bets), admin creates next match, admin declares winner on next match, locked bets pay out. The multi-step nature and shared-state dependency make this fragile as an automated test.

| # | What to do | What to expect | Result |
|---|---|---|---|
| 6.1 | Admin creates match: `drawAllowed=true`, `noDrawPolicy=rollover`, betting open | Match appears in upcoming section with "Allow Draw" shown | 🔁 |
| 6.2 | Member places bet on Draw outcome | Bet placed with `status=pending` | 🔁 |
| 6.3 | Admin declares result=draw | All bets become `status=locked`; `pointsDelta=0` on each; rollover pot accumulates | 🔁 |
| 6.4 | Member views dashboard | Bet shown with "Locked" badge; no points change | 🔁 |
| 6.5 | Admin creates a second match and opens betting | New match appears; rollover pot is visible to admin | 🔁 |
| 6.6 | Admin declares winner on second match | Locked bets from the first match are paid out; member sees final points total | 🔁 |

---

## 7. Cross-Browser / Device Spot Checks

| # | What to do | What to expect | Result |
|---|---|---|---|
| 7.1 | Open app in **Safari** on macOS | Layout renders correctly; no visible CSS variable fallback failures | 🔁 |
| 7.2 | Open app in **Firefox** | Login, bet placement, and group management all function | 🔁 |
| 7.3 | Open app on **iPhone Safari** | Mobile layout correct; touch interactions work; no horizontal scroll | 🔁 |

---

*Last updated: Phase 3 test implementation*
