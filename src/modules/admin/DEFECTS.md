# admin — defects (prefix MADM-)

Every defect found in the phone's Administration module: what happened, how it was found, what was
done about it, and the rule it leaves. Fixed entries stay.

## MADM-1 · The phone's console list is older than the web's (20 Nov) — fixed (mobile/m13-menu)

**What happened.** The core's port of the Settings console (`src/core/menu.ts` PAGES, 4 Nov) has no
"Backfill data" (`/settings/property/backfill-data`, D27-398) and no "Bring in old data"
(`/settings/property/old-data`, D27-383), and calls Money's "Room discounts" "Discounts" (D27-395);
nor the "Backfilled records" entry the Accountant reaches (`admin/nav.ts`, `/h/:code/backfill`). So
the phone's Settings list cannot show Backfill data, though the screen is built.
**How found.** Listing `sidebarFor(…, "settings")` for a GM against today's `*.settings.ts`.
**What was done.** Nothing in the core (frozen): the exact diff is in the lane's report. The Backfill
screen opens from its own route meanwhile, with the web's own read rule (`refusedBackfill`).
20 Nov (mobile/m13-menu): the core's menu re-ported from the 16 Nov release — Backfill data, Bring
in old data, Scheduled reports and "Room discounts" in the console, Backfilled records for the
Accountant. And the frame's Settings pill now opens this console (`spaceHome` → `/settings` →
`/admin/<code>`) instead of only showing its list in the drawer, and a console screen
(`/admin/<code>/roles`, `/inventory/<code>/room-types` …) lights Settings in the drawer
(`spaceHere`: the space of the web address the phone screen stands for). Pinned in
`menu.check.ts`; the menu compared with the web's own `navigation.ts` run under node: no difference.
**The rule.** Before building on a ported list, compare it with the web's of today, not of the day it
was ported.

## MADM-2 · A staff member's password could be offered to the phone's password manager (20 Nov) — fixed

**What happened.** `kit.tsx` PasswordField (Add somebody, Password) set `textContentType="newPassword"`,
so iOS's and Android's password managers could offer to save the password the manager types FOR a
member of staff as the manager's own Fidato sign-in.
**How found.** The independent review of the lane (A1).
**What was done.** The field sets `autoComplete="off"`, `importantForAutofill="no"`,
`textContentType="none"` (and no autocorrect), as the core's `keys.email` / `keys.name` do for
another person's details.
**The rule.** A field that holds somebody else's secret or details never tells the phone it is the
person's own: autofill off, no content type.

## MADM-3 · A sheet's unknown outcome was freed by closing the sheet (20 Nov) — fixed

**What happened.** People's sheets (Add somebody, Give a property, Password, Edit, Two-step off), Bank
details' Edit and Backfill's Remove kept the unknown-outcome stop inside the sheet (`useAct()`), so
closing the sheet freed it even before the list was read again. Harmless on the server (the reviewer
checked each: a repeated add answers "already here", a repeated grant, password, edit, two-step off,
bank save or backfill remove sets the same state again), but not the rule.
**How found.** The independent review (A3).
**What was done.** The stop is the screen's (`useStop(seenAt)` in `kit.tsx`, passed to each sheet's
`useAct`): it holds until a read of the list that BEGAN after the failure has come back, and while it
holds the openers are greyed (Add somebody, the card's sheet buttons, Change, Remove) with the
"Not known whether it was …" line. The cards already did this.
**The rule.** The stop lives as long as the record it guards is unseen, not as long as the dialog.

## MADM-4 · "Two-step required" was greyed for an Admin elsewhere (20 Nov) — fixed

**What happened.** Signing in decided the switch by the role at the hotel in view (owner or Admin
there). The server (migration 257, `app.set_two_step_required`) allows a group administrator, or
Owner or Admin at ANY hotel, with a real hotel on the roster: an Admin of hotel B who opened Settings
from hotel A, where they are GM, saw it greyed. Narrower than the API, never wider.
**How found.** The independent review (A2).
**What was done.** `roles.ts` `setsTwoStepRequired(who)` asks the server's own question of GET
/api/hotels's answer (the roster and each hotel's `testOf`); `roles.check.ts` pins it and was broken
once (the real-hotel half dropped: an Admin only in a test hotel became allowed; the check failed).
**Known difference left, narrower:** a real hotel the person is rostered at but that GET /api/hotels
does not list (a closed one) is not counted, so such a person sees the switch greyed where the server
would accept it.

## m16 pickers (20 Nov), lane m16-pick-front

### MADM-K1 · Backfill's stop lived in the screen's state (fixed)

What happened: Remove's unknown-outcome stop was `useStop(seenAt)`, React state of the Backfill screen: leaving the screen and coming back dropped it (MEMORY 22). With Add (a repeat makes a second line, and a stay's bill email goes twice) the gap mattered more. How found: wiring Add and Correct. Done: the three writes share the core's `useScreenStop("admin/<code>/backfill")`, its read wrapped by `watch`, so only a read begun after the loss lets it go. The rule: every new write on an old screen moves that screen's stop to the core's book first.
