# WhoWins — Playwright TypeScript Test Plan

> Phase 1 of 4. This document defines every route, role, access rule, and test scenario before a single test file is written.

---

## 1. Project Overview

| Property | Value |
|---|---|
| App name | WhoWins |
| Framework | Next.js 16.2.2 (App Router, all client components) |
| React | 19.2.4 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Auth method | Firebase Auth — Email/Password + Google OAuth |
| Database | Firestore (client SDK v12 + admin SDK v13) |
| Auth guards | Client-side only — `ProtectedRoute` component + per-page `useEffect` checks. **No middleware.ts exists.** |
| Route protection | Unauthenticated users are redirected to `/login?redirect=<path>` by `ProtectedRoute`. SuperAdmin guard in `app/admin/layout.tsx`. |
| Feature flags | `NEXT_PUBLIC_ALLOW_CREATE_GROUP`, `NEXT_PUBLIC_SHOW_SETTLEMENTS` |
| Deployed on | Vercel (cron at `/api/cron/daily` runs 02:00 UTC daily) |

### Firestore Collections

| Collection | Purpose |
|---|---|
| `users/{uid}` | User profiles — `displayName`, `email`, `totalPoints`, `role`, `avatarColor`, `groupIds[]`, `superAdmin?` |
| `groups/{groupId}` | Group documents — `name`, `createdBy`, `inviteCode`, `createdAt`, `rolloverPot?` |
| `groups/{groupId}/members/{userId}` | Group membership — `role: 'admin'\|'member'`, `totalPoints`, `displayName`, `avatarColor`, `joinedAt` |
| `matches/{matchId}` | Match documents — `groupId`, `teamA`, `teamB`, `format`, `status`, `result`, `bettingOpen`, `bettingClosedAt`, `drawAllowed`, `noDrawPolicy`, `cricApiMatchId` |
| `bets/{betId}` | Bet records — `matchId`, `groupId`, `userId`, `pickedOutcome`, `stake`, `pointsDelta`, `status`, `placedAt` |
| `settlements/{settlementId}` | Acknowledged debt settlements |
| `transactions/{transactionId}` | Financial ledger entries |
| `masterSeries/{seriesId}` | CricAPI series config (superAdmin managed) |
| `masterMatch/{matchId}` | Match catalogue from CricAPI |
| `sourceData/{docId}` | Raw CricAPI response cache |
| `systemCache/{cacheId}` | API throttle state |

### Environment Variables (names only)

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Client | Firebase config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Client | Firebase config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Client | Firebase config |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Client | Firebase config |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Client | Firebase config |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Client | Firebase config |
| `NEXT_PUBLIC_CRICAPI_KEY` | Client | CricAPI match data key |
| `NEXT_PUBLIC_ALLOW_CREATE_GROUP` | Client | Toggles Create Group UI (currently `true`) |
| `NEXT_PUBLIC_SHOW_SETTLEMENTS` | Client | Toggles settlements section on Points page (currently `false`) |
| `NEXT_PUBLIC_SYNC_SECRET` | Client | Sync API secret used by superAdmin UI |
| `SYNC_SECRET` | Server | Sync API secret validated server-side |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Server | Admin SDK credentials for API routes |
| `CRON_SECRET` | Server | Vercel cron job authorization header |

---

## 2. Role Model

### Unauthenticated Visitor
- Cannot access any route guarded by `ProtectedRoute`
- Redirected to `/login?redirect=<original-path>` on every protected page
- Can access `/login`, `/register`, and `/join/[inviteCode]` (sees sign-in CTA)
- No Firestore access (rules block unauthenticated reads everywhere except `masterMatch`, `sourceData`, `systemCache`)

### Member (default role)
- **How stored:** `role: 'member'` on the `groups/{groupId}/members/{userId}` subcollection document
- **How checked:** `getUserGroupMember(groupId, user.uid)` returns the member doc; pages check `.role === 'admin'` to determine elevated access
- Created when a user joins a group via invite link; role defaults to `'member'`
- Can view all group pages (dashboard, points, group info)
- Can place, change, and remove own bets while `bettingOpen === true` and match status is `upcoming` or `live`
- Cannot access the `/groups/[groupId]/matches` admin page (sees access-denied card)
- Cannot edit group name, regenerate invite code, promote/demote/remove members, or delete group
- Cannot see "Matches" tab in the group navbar

### Group Admin
- **How stored:** `role: 'admin'` on the `groups/{groupId}/members/{userId}` subcollection document
- **How checked:** Same `getUserGroupMember` call; `.role === 'admin'` check in each page
- Automatically assigned to the user who creates a group
- Can be promoted from or demoted to `'member'` by any other group admin
- Full access to `/groups/[groupId]/matches` — the group match management page
- Sees "Matches" tab in the group navbar
- Can create, edit, delete matches; toggle betting; declare results; manage any member's bets
- Can edit group name, regenerate invite code, promote/demote members, remove members, delete group
- **Does NOT inherit superAdmin powers** — platform `/admin` requires a separate `superAdmin` flag

### Super Admin
- **How stored:** `superAdmin: true` boolean field on the `users/{uid}` Firestore document
- **How checked:** `app/admin/layout.tsx` reads `userProfile.superAdmin`; redirects to `/groups` if false or missing
- Also enforced in Firestore rules: `masterSeries` writes require `get(users/uid).data.superAdmin == true`
- `AppNavbar` shows "Admin" menu link only when `userProfile.superAdmin === true`
- Can access `/admin` — the global series/match sync management page
- Privileges are platform-wide, **not group-specific** — on group pages, access depends on whether they are also a group member with admin role

---

## 3. Route Inventory

| Route | File | Type | Dynamic Segments |
|---|---|---|---|
| `/` | `app/page.tsx` | redirect hub | — |
| `/login` | `app/login/page.tsx` | public | — |
| `/register` | `app/register/page.tsx` | public | — |
| `/profile` | `app/profile/page.tsx` | protected | — |
| `/groups` | `app/groups/page.tsx` | protected | — |
| `/groups/create` | `app/groups/create/page.tsx` | protected + feature-flagged | — |
| `/groups/[groupId]` | `app/groups/[groupId]/page.tsx` | protected + member-only | `groupId`: Firestore group doc ID |
| `/groups/[groupId]/points` | `app/groups/[groupId]/points/page.tsx` | protected + member-only | `groupId` |
| `/groups/[groupId]/settlements` | `app/groups/[groupId]/settlements/page.tsx` | protected + member-only | `groupId` |
| `/groups/[groupId]/matches` | `app/groups/[groupId]/matches/page.tsx` | protected + group-admin-only | `groupId` |
| `/groups/[groupId]/group` | `app/groups/[groupId]/group/page.tsx` | protected + member-only (admin sees edit controls) | `groupId` |
| `/groups/[groupId]/bet/[matchId]` | `app/groups/[groupId]/bet/[matchId]/page.tsx` | protected + member-only | `groupId`, `matchId`: Firestore match doc ID |
| `/join/[inviteCode]` | `app/join/[inviteCode]/page.tsx` | semi-public | `inviteCode`: 6-char group invite code |
| `/admin` | `app/admin/page.tsx` | super-admin-only | — |

### Per-route access descriptions

**`/`**
- Unauthenticated: redirects to `/login`
- All authenticated roles: redirects to `/groups`

**`/login`**
- Unauthenticated: shows login form
- Already authenticated: redirects to `/groups` (or `?redirect` param destination)

**`/register`**
- Unauthenticated: shows registration form
- Already authenticated: redirects to `/groups` (or `?redirect` param destination)

**`/profile`**
- Unauthenticated: redirected to `/login?redirect=/profile`
- Any authenticated user: sees own profile, groups list, edit name/avatar color

**`/groups`**
- Unauthenticated: redirected to `/login?redirect=/groups`
- Any authenticated user: sees list of groups they belong to; Create Group button if env allows

**`/groups/create`**
- Unauthenticated: redirected to login
- Authenticated (any role): create group form (feature exists; NEXT_PUBLIC_ALLOW_CREATE_GROUP currently `true`)

**`/groups/[groupId]`**
- Unauthenticated: redirected to login
- Non-member authenticated: shows "Access denied — you are not a member of this group"
- Member: full dashboard — live/upcoming/past matches with inline betting
- Group admin: same as member plus "Matches" tab visible in navbar
- SuperAdmin (if not group member): access denied

**`/groups/[groupId]/points`**
- Unauthenticated: redirected to login
- Non-member authenticated: shows "Access denied"
- Member/Admin: points leaderboard; settlements section only if `NEXT_PUBLIC_SHOW_SETTLEMENTS === 'true'`

**`/groups/[groupId]/settlements`**
- Unauthenticated: redirected to login
- Non-member authenticated: shows "Access denied"
- Member/Admin: full settlements table with acknowledgement workflow
- Note: This page is not linked from other group pages' nav tabs — it is effectively orphaned unless URL is typed directly

**`/groups/[groupId]/matches`**
- Unauthenticated: redirected to login
- Non-member or member (role=member): shows "Access denied" card with Back to Group link
- Group admin: full match management UI (add/edit/delete matches, manage bets, declare results)

**`/groups/[groupId]/group`**
- Unauthenticated: redirected to login
- Non-member authenticated: shows "Access denied" (via permission-denied Firestore error)
- Member: read-only view (group name, creation date, invite link, member list, WhatsApp share)
- Group admin: same + edit group name, regenerate invite, promote/demote/edit/remove members, delete group

**`/groups/[groupId]/bet/[matchId]`**
- Unauthenticated: redirected to login
- Non-member authenticated: shows "Access denied" card
- Member/Admin (betting open + match upcoming/live): outcome picker + confirm bet
- Member/Admin (betting locked or closed): read-only locked view showing existing bet or "no bet" message
- Status: **[STUB]** — page is fully implemented but has no navigation links pointing to it from the current UI; inline betting on the dashboard is used instead

**`/join/[inviteCode]`**
- Unauthenticated: shows login/register CTA with group name
- Valid code + authenticated + not yet a member: join confirmation button
- Valid code + authenticated + already a member: "You're already in this group!" with link
- Invalid/expired code: "Invalid invite link" message
- Invite code is normalized to uppercase before lookup

**`/admin`**
- Unauthenticated: `ProtectedRoute` redirects to login; admin layout then redirects to `/groups`
- Authenticated non-superAdmin: admin layout redirects to `/groups`
- SuperAdmin: series management (add series, manage CricAPI IDs, fill/sync matches, edit match dates)

---

## 4. Role-Access Matrix

> **Column definitions:**
> - FULL — user can access and use all features
> - READ — user can view but cannot perform write actions
> - REDIRECT — user is redirected away (destination noted)
> - BLOCKED — user sees an error or access-denied message on the page
> - N/A — route is not directly relevant to this role category
>
> **Note on Super Admin:** Platform `superAdmin` does NOT grant group-level admin rights. For group pages, Super Admin access is identical to Member or Group Admin depending on their group membership role.

| Route | Unauthenticated | Member | Group Admin | Super Admin (platform) |
|---|---|---|---|---|
| `/` | REDIRECT → /login | REDIRECT → /groups | REDIRECT → /groups | REDIRECT → /groups |
| `/login` | FULL | REDIRECT → /groups | REDIRECT → /groups | REDIRECT → /groups |
| `/register` | FULL | REDIRECT → /groups | REDIRECT → /groups | REDIRECT → /groups |
| `/profile` | REDIRECT → /login | FULL | FULL | FULL |
| `/groups` | REDIRECT → /login | FULL | FULL | FULL |
| `/groups/create` | REDIRECT → /login | FULL (env-flagged) | FULL (env-flagged) | FULL (env-flagged) |
| `/groups/[groupId]` | REDIRECT → /login | FULL | FULL + Matches tab | Same as Member/Admin based on group role |
| `/groups/[groupId]/points` | REDIRECT → /login | FULL | FULL | Same as Member/Admin |
| `/groups/[groupId]/settlements` | REDIRECT → /login | FULL | FULL | Same as Member/Admin |
| `/groups/[groupId]/matches` | REDIRECT → /login | BLOCKED (access denied card) | FULL | BLOCKED unless also group admin |
| `/groups/[groupId]/group` | REDIRECT → /login | READ (no edit controls) | FULL | READ unless also group admin |
| `/groups/[groupId]/bet/[matchId]` | REDIRECT → /login | FULL (if betting open) | FULL (if betting open) | Same as Member/Admin |
| `/join/[inviteCode]` | FULL (shows sign-in CTA) | FULL (join or already-joined view) | FULL | FULL |
| `/admin` | REDIRECT → /login → /groups | REDIRECT → /groups | REDIRECT → /groups | FULL |

---

## 5. Test Scenario Categories

### A) Per-page tests

#### A1. Home (`/`)
- A1-01: Unauthenticated visit → redirects to `/login`
- A1-02: Authenticated visit → redirects to `/groups`

#### A2. Login (`/login`)
- A2-01: Valid email/password login → success toast → redirects to `/groups`
- A2-02: Valid email/password with `?redirect` param → redirects to param destination after login
- A2-03: Wrong password → error toast, stays on login
- A2-04: Non-existent email → error toast
- A2-05: Password field too short (no min enforced on login, but server rejects) → error toast
- A2-06: Already authenticated visit → immediately redirects to `/groups`
- A2-07: Google "Continue with Google" button is visible and clickable
- A2-08: Link to Register page preserves `?redirect` param

#### A3. Register (`/register`)
- A3-01: Valid registration (name, email, password ≥6, confirm match) → account created → redirects
- A3-02: Password fewer than 6 characters → error toast "Password must be at least 6 characters"
- A3-03: Passwords do not match → error toast "Passwords do not match"
- A3-04: Already authenticated visit → immediately redirects
- A3-05: Google sign-in for brand-new user → creates account → redirects
- A3-06: Link to Sign In page preserves `?redirect` param

#### A4. Profile (`/profile`)
- A4-01: Unauthenticated → redirected to `/login?redirect=/profile`
- A4-02: Page shows display name, email, total points, avatar
- A4-03: Avatar colour picker changes live preview avatar
- A4-04: Display name fewer than 2 characters → error toast
- A4-05: Save with no changes → "Nothing to update" info toast
- A4-06: Save with name change → success toast; navbar avatar name updates
- A4-07: Save with colour change → success toast; navbar avatar colour updates
- A4-08: My Groups list shows all groups the user belongs to
- A4-09: Clicking a group in My Groups navigates to that group dashboard
- A4-10: Creator badge shows for groups created by the current user

#### A5. Groups (`/groups`)
- A5-01: Unauthenticated → redirected to login
- A5-02: User with no groups → empty state with correct message
- A5-03: `NEXT_PUBLIC_ALLOW_CREATE_GROUP=true` → "Create Group" button visible
- A5-04: `NEXT_PUBLIC_ALLOW_CREATE_GROUP=false` → "Create Group" button hidden and empty-state text changes
- A5-05: Groups listed as cards with group name, creation date, "Enter Group" button
- A5-06: "Enter Group" navigates to the correct group dashboard

#### A6. Create Group (`/groups/create`)
- A6-01: Unauthenticated → redirected to login
- A6-02: Group name fewer than 3 characters → error toast
- A6-03: Valid name → group created → redirects to new group's dashboard
- A6-04: "Back to Groups" link navigates to `/groups`
- A6-05: Creator is set as admin in new group (verify Matches tab appears)

#### A7. Group Dashboard (`/groups/[groupId]`)
- A7-01: Unauthenticated → redirected to login
- A7-02: Non-member authenticated user → "Access denied — you are not a member" message + Back link
- A7-03: Member sees live/ongoing, upcoming, and past match sections
- A7-04: No matches in group → all sections show empty-state cards
- A7-05: Upcoming match with bettingOpen=true → "Place Bet" button visible
- A7-06: Inline bet flow: click "Place Bet" → select outcome → set stake → confirm → bet recorded, button changes to "Change Bet"/"Remove Bet"
- A7-07: Outcome picker shows 2 buttons (no draw) or 3 buttons (draw allowed)
- A7-08: Stake preset buttons (+100, +500, +1000) add to current stake value
- A7-09: Stake input cleared → stake is 0 → Confirm Bet button disabled
- A7-10: "Change Bet" opens edit inline form pre-filled with current outcome/stake
- A7-11: "Remove Bet" shows confirmation modal; Cancel keeps bet; Confirm removes it
- A7-12: Past matches default filter is "Betted"; filter chips change displayed matches
- A7-13: "Betted By Me" filter shows only past matches where current user placed a bet
- A7-14: "All" filter shows every past match
- A7-15: Recent section shows last completed match where current user placed a bet
- A7-16: Member does NOT see "Matches" tab in group navbar
- A7-17: Group admin DOES see "Matches" tab in group navbar
- A7-18: Match auto-closes betting when matchDate has passed (bettingOpen becomes false)

#### A8. Matches Admin (`/groups/[groupId]/matches`)
- A8-01: Unauthenticated → redirected to login
- A8-02: Non-member or member (role=member) → "Access denied" card with "Back to Group" button
- A8-03: Group admin sees "Add Matches" section, "Create Match" form, "All Matches" list
- A8-04: "Search Matches" loads master matches from Firestore; live matches appear first
- A8-05: League filter chips filter master match list
- A8-06: Adding a master match creates it in the group; "Add to Group" changes to "Added ✓"
- A8-07: Create Match form: missing match date → error toast
- A8-08: Create Match form: empty team name → error toast
- A8-09: Create Match with format=Test → drawAllowed auto-checked and disabled
- A8-10: Create Match with status=Completed → result selector appears; selecting result and submitting creates completed match
- A8-11: Match filter chips (All/Ongoing/Upcoming/Previous) filter the match list
- A8-12: "Edit" button on match opens edit modal pre-filled with match data; Save updates match
- A8-13: "Delete" button shows confirmation modal; confirm removes match from list
- A8-14: "Close Betting" / "Open Betting" toggle updates match bettingOpen state
- A8-15: Declare result dropdown + Confirm → result declared, points settled, member standings updated
- A8-16: Re-declaring result on already-settled match shows re-settlement warning text
- A8-17: "Manage Bets" button opens modal with all group members
- A8-18: Admin can select outcome and stake for any member in Manage Bets modal → save → bet appears
- A8-19: Admin can clear any member's bet via "Clear Bet" button
- A8-20: Manage Bets on a completed match → saving triggers re-settlement

#### A9. Points (`/groups/[groupId]/points`)
- A9-01: Unauthenticated → redirected to login
- A9-02: Non-member → "Access denied" message
- A9-03: Standings leaderboard shows all members sorted by totalPoints descending
- A9-04: Current user row is highlighted in green
- A9-05: Admin members show "Admin" badge
- A9-06: With `NEXT_PUBLIC_SHOW_SETTLEMENTS=false` → settlements section is hidden
- A9-07: With `NEXT_PUBLIC_SHOW_SETTLEMENTS=true` → settlements section shows outstanding and acknowledged rows
- A9-08: Recipient of settlement sees "Type 'Received N' then click Received" input
- A9-09: Typing wrong phrase → "Received" button stays disabled
- A9-10: Typing exact phrase → "Received" button enables; clicking records acknowledgement
- A9-11: Acknowledged settlement shows "Received ✓" for recipient; "—" for others

#### A10. Settlements (`/groups/[groupId]/settlements`)
- A10-01: Unauthenticated → redirected to login
- A10-02: Non-member → "Access denied" message
- A10-03: Page shows settlements table (same logic as points page settlements section)
- A10-04: "All settled up!" shows when no outstanding or acknowledged settlements
- A10-05: Recipient acknowledgement flow works (type-to-confirm + Received button)
- A10-06: Non-recipient rows show "—" in acknowledgement column
- A10-07: Page is reachable via direct URL; it is NOT linked in other group pages' nav tabs

#### A11. Group (`/groups/[groupId]/group`)
- A11-01: Unauthenticated → redirected to login
- A11-02: Non-member → access denied (Firestore permission-denied leads to isAdmin=false display)
- A11-03: Member sees group name, creation date, invite link, member list with role badges
- A11-04: Member sees "Share on WhatsApp" button
- A11-05: Member does NOT see pencil/edit icon next to group name
- A11-06: Member does NOT see "Regenerate Link" button
- A11-07: Member does NOT see promote/demote/remove controls for other members
- A11-08: Member does NOT see Danger Zone section
- A11-09: "Copy" button copies invite link
- A11-10: Admin sees pencil icon next to group name; clicking enables inline edit
- A11-11: Admin saves group name < 3 chars → error toast
- A11-12: Admin saves valid new name → name updates in header
- A11-13: Admin regenerates invite link → new code shown; toast warns old link is invalid
- A11-14: Admin can "Make Admin" for a member → member row shows Admin badge
- A11-15: Admin can "Remove Admin" for another admin → badge reverts to Member
- A11-16: Admin can edit member display name inline (pencil icon)
- A11-17: Admin saves member name < 2 chars → error toast
- A11-18: Admin "Remove" button shows confirmation modal; confirm removes member from list
- A11-19: Admin sees Danger Zone with "Delete Group" button
- A11-20: Delete Group modal requires typing exact group name; mismatch keeps button disabled
- A11-21: Correct name typed → Delete Group enabled → confirms → group deleted → redirects to `/groups`

#### A12. Bet Page (`/groups/[groupId]/bet/[matchId]`) [STUB]
- A12-01: Unauthenticated → redirected to login
- A12-02: Non-member → "Access denied" card
- A12-03: Match not found → "Match not found" card
- A12-04: Match with bettingOpen=false → locked view showing existing bet or "no bet placed"
- A12-05: Match with status=completed → locked view with match status badge
- A12-06: Open match → outcome picker (2 or 3 buttons based on drawAllowed) shown
- A12-07: No outcome selected → Confirm Bet button does not appear
- A12-08: Existing bet → "Current bet" card shown; outcome pre-selected
- A12-09: Select outcome + confirm → bet upserted → redirected to group dashboard
- A12-10: STAKE is hardcoded to 1000 pts (no custom stake input on this page)
- **[STUB]** No current navigation path leads to this route; it is unreachable from the live UI

#### A13. Join Group (`/join/[inviteCode]`)
- A13-01: Unauthenticated visit → shows group name (if valid code), "Sign in to join" and "Create account" buttons with correct `?redirect` param
- A13-02: Invalid invite code → "Invalid invite link" message
- A13-03: Authenticated + already a member → "You're already in this group!" with "Go to Group" link
- A13-04: Authenticated + not yet a member → join confirmation card; click "Join Group" → joins → redirects to group dashboard
- A13-05: Invite code in URL is case-insensitive (normalised to uppercase)
- A13-06: After joining, user appears in group's member list

#### A14. Admin (`/admin`)
- A14-01: Unauthenticated → redirected to login, then admin layout redirects to `/groups`
- A14-02: Authenticated non-superAdmin → redirected to `/groups`
- A14-03: SuperAdmin sees Admin page with "Match Sync" and "Series" sections
- A14-04: "Sync Live Matches" button triggers sync; displays result JSON on success
- A14-05: Add Series form: name + CricAPI UUID required; optional end date; submits → series appears
- A14-06: Series row expands to show match table when clicked
- A14-07: "Fill / Refresh Matches" imports matches from CricAPI for a series
- A14-08: Inline match date edit (pencil icon on date cell) → datetime-local input → save
- A14-09: "Remove series" button hides series from local state (toast notes permanent deletion requires Firestore console)
- A14-10: "Set end date" / pencil on end date → date picker → save; series shows "ended" tag when past
- A14-11: "Admin" link visible in navbar dropdown only for superAdmin users

---

### B) Cross-page flow tests

- B-01: **Registration → join via invite → place bet** — Register new account → visit `/join/[code]` → join group → land on group dashboard → see upcoming match → place bet → confirm bet appears with "Change Bet" button
- B-02: **Create group → add match → member bets → declare result → check points** — Admin creates group → adds match from master list → member joins → member places bet → admin closes betting → admin declares winner → member sees Won/Lost badge on dashboard → points page shows updated standings
- B-03: **Group admin promotes member → promoted member accesses matches** — Admin goes to Group page → promotes another member → promoted user refreshes their dashboard → "Matches" tab now visible → can access match management page
- B-04: **Invite regeneration → old link invalid → new link works** — Admin regenerates invite link → old invite URL resolves to "Invalid invite link" → new URL joins successfully
- B-05: **Admin deletes group → members lose access** — Admin deletes group → any member who navigates to the group URL sees access denied or group not found
- B-06: **Admin removes member → removed user sees access denied** — Admin removes a member via Group page → removed user visits group dashboard → sees "Access denied — you are not a member"
- B-07: **Draw/abandoned match → refund flow** — Admin creates match with result=abandoned → declare result → all pending bets get status=refunded, pointsDelta=0 → member sees "refunded" badge
- B-08: **Rollover flow** — Admin creates match with drawAllowed=true, noDrawPolicy=rollover → declare result=draw → bets become status=locked → admin creates next match → declares winner → locked bets paid out with rollover pot

---

### C) Role-boundary tests

- C-01: Member navigates directly to `/groups/[groupId]/matches` → sees "Access denied" card, not match management UI
- C-02: Non-member authenticated user navigates to `/groups/[groupId]` (any sub-route) → sees "Access denied" or error, not group content
- C-03: Non-superAdmin authenticated user navigates to `/admin` → redirected to `/groups`
- C-04: Member cannot see "Matches" tab in group navbar; admin can
- C-05: Member's account dropdown does NOT show "Admin" link; superAdmin's does
- C-06: Member on Group page: no pencil icon on group name, no Regenerate Link, no member action buttons, no Danger Zone
- C-07: Member cannot acknowledge someone else's settlement (only the `toUserId` recipient can)
- C-08: Member cannot place a bet after `bettingOpen` has been set to false (Confirm Bet button is either absent or Firestore rule blocks the write)
- C-09: Member cannot remove another member's bet (no UI + Firestore rules block delete on others' bets)
- C-10: Group admin who is NOT a platform superAdmin → cannot access `/admin` → redirected to `/groups`
- C-11: SuperAdmin who is NOT a group member → visiting any `/groups/[groupId]/*` page shows access denied

---

### D) Multi-user interaction tests

> These scenarios require two simultaneously-active user sessions.

- D-01: **Real-time bet visibility** — User A places a bet → User B (same group, different session) refreshes dashboard → User B sees User A's bet in the "Who Betted" section without a page reload
- D-02: **Result declaration propagates** — Admin declares match result → all group members' dashboards show updated bet status (Won/Lost/Refunded) and the points page leaderboard updates
- D-03: **Betting close propagates** — Admin closes betting on a match → member who already has "Change Bet" / "Remove Bet" buttons visible refreshes → buttons disappear; bet is now locked
- D-04: **Member added by join → visible to admin** — User joins via invite link → admin opens Group page → new member appears in member list
- D-05: **Admin manages member bet → member sees it** — Admin adds a bet for a specific member via Manage Bets → that member loads their dashboard → their bet appears as if they placed it themselves
- D-06: **Admin regenerates invite → old link fails** — Admin regenerates invite code while another user has the old URL open → other user clicks their link → "Invalid invite link" (invite codes are single-use/replaced)
- D-07: **Settlement acknowledgement visibility** — User A acknowledges a settlement → User B (the other party) refreshes Points page → sees "Received ✓" status on that settlement row

---

### E) Edge case tests

- E-01: **Empty group dashboard** — Group with no matches added → all sections (Ongoing, Upcoming, Previous) show "No matches" / empty-state cards
- E-02: **Betting locked after match starts** — Match `bettingOpen=false` (auto-closed or admin-closed) → "Place Bet" button not shown; existing bet is read-only; inline edit form cannot be opened
- E-03: **Draw option gating** — Match with `drawAllowed=true` → 3-outcome picker (Team A / Draw / Team B); `drawAllowed=false` → 2-outcome picker
- E-04: **Test format auto-draw** — Creating a match with format=Test → "Allow Draw" checkbox auto-checked and disabled
- E-05: **Stake preset accumulation** — Click +100 three times → stake shows 300; then clear input → stake is blank; Confirm button disabled
- E-06: **Stake 0 → Confirm disabled** — Enter 0 in stake field → Confirm button is disabled
- E-07: **Remove bet confirmation guard** — Clicking "Remove Bet" once does NOT remove the bet; must confirm in modal
- E-08: **Invalid invite code** — Visit `/join/XXXXXX` with non-existent code → "Invalid invite link" card shown
- E-09: **Group name min-length** — Create Group with 2-char name → "must be at least 3 characters" error
- E-10: **Profile name min-length** — Save profile with 1-char display name → "must be at least 2 characters" error
- E-11: **Delete group type-to-confirm guard** — Type partial group name → Delete button disabled; type exact name → enabled
- E-12: **Re-settle on existing settled match** — Admin re-declares result on completed match → old points rolled back → new points applied → standings update
- E-13: **Past matches filter empty state** — Group has past matches but none have bets → "Betted" filter shows "No matches for this filter" (not empty section entirely)
- E-14: **Member name edit min-length** — Admin edits member name to 1 char → "must be at least 2 characters" error
- E-15: **Settlements empty state** — Group with no completed matches → Points and Settlements pages show "All settled up!"
- E-16: **Already-member join** — Authenticated user visits their own group's invite link → sees "You're already in this group!" with link to group
- E-17: **Firestore permission-denied for betting** — If Firestore rules block a bet write (e.g. rules not published), user sees helpful error toast about publishing Firestore rules
- E-18: **Series "ended" badge** — Set end date in the past on admin series row → series header shows "ended" grey tag
- E-19: **No upcoming matches in admin search** — masterMatch collection has no active matches → "No upcoming matches found" text after search
- E-20: **Manage Bets empty group** — Group with no members (edge case) → "No group members found" in modal

---

## 6. Stubs and Gaps

| Route / Feature | Status | Notes |
|---|---|---|
| `/groups/[groupId]/bet/[matchId]` | **[STUB — UNREACHABLE]** | Page is fully implemented but no navigation link in the current UI points to it. The group dashboard uses inline betting cards instead. STAKE is hardcoded to 1000 pts. Tests will be tagged `[STUB]`. |
| `/groups/[groupId]/settlements` | **[PARTIAL — ORPHANED]** | Full implementation exists. However, the "Settlements" tab only appears in the navbar when already on the settlements page — no other group page links to it. Effectively invisible without knowing the URL. |
| Settlements on Points page | **[FEATURE-FLAGGED OFF]** | The settlements section on `/groups/[groupId]/points` is controlled by `NEXT_PUBLIC_SHOW_SETTLEMENTS`. It is currently `false` in `.env.local`, so the section is hidden. Tests must set the flag to `true` to exercise this path, or test the standalone settlements page instead. |
| `/admin` delete series | **[PARTIAL]** | The "Remove series" button hides the series from local UI state only. It does NOT write a delete to Firestore. Toast informs the user to delete manually via Firebase Console. Tests can only assert the UI hides the item, not that it is deleted from the database. |
| Tab navigation consistency | **[GAP]** | The Settlements page has a different nav tab set than all other group pages (it includes a "Settlements" tab; the others do not). This inconsistency means users have no visible nav path to Settlements from the dashboard, points, or group pages. |
| API routes (`/api/*`) | **[OUT OF SCOPE for UI tests]** | API routes are server-side cron/sync routes authenticated by `SYNC_SECRET` or `CRON_SECRET`. They are not part of the browser UI and will not be covered by Playwright tests. |

---

## Summary

| Metric | Count |
|---|---|
| Total routes inventoried | 14 |
| Public routes | 2 (`/login`, `/register`) |
| Semi-public routes | 2 (`/`, `/join/[inviteCode]`) |
| Protected routes | 9 |
| Admin-only (group) routes | 1 (`/groups/[groupId]/matches`) |
| Super-admin-only routes | 1 (`/admin`) |
| Roles identified | 4 (Unauthenticated, Member, Group Admin, Super Admin) |
| Feature flags | 2 (`NEXT_PUBLIC_ALLOW_CREATE_GROUP`, `NEXT_PUBLIC_SHOW_SETTLEMENTS`) |
| **Test scenarios — Category A (per-page)** | **~110** |
| **Test scenarios — Category B (cross-page flows)** | **8** |
| **Test scenarios — Category C (role-boundary)** | **11** |
| **Test scenarios — Category D (multi-user)** | **7** |
| **Test scenarios — Category E (edge cases)** | **20** |
| **Total test scenarios** | **~156** |
| Stubs / gaps identified | 5 |
