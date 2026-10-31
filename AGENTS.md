# Agents — how the mobile work is divided without breaking it

The PMS's `AGENTS.md` (one folder up) is the model; this is the mobile app's own version. Where they
differ, this file wins inside `mobile/`.

## Who does what

- **The mobile chat** (the mobile master) works in `D:\fidato pms moblie\mobile` on branch
  `mobile/app`. It talks to the owner, sends helpers, merges their branches into `mobile/app`, keeps
  `DECISIONS.md`, `HANDOVER.md`, `CHANGELOG.md` and `MEMORY.md`, and owns the **core** (below).
- **Helpers** each work in their own copy, made by the mobile chat **inside this folder**, never in
  `D:\fidato pms`:
  ```powershell
  # the owner's PC, PowerShell (or Git Bash with git -C) - a helper's copy, its own branch
  git -C "D:\fidato pms moblie" worktree add "D:\fidato pms moblie\.claude\worktrees\<name>" -b mobile/<name> mobile/app
  ```
  ⚠ Do not use the Agent tool's own "worktree" isolation: it makes copies under the PMS's
  `D:\fidato pms\.claude\worktrees`. Make the copy as above and point the helper at it.
- A helper's copy shares `mobile/node_modules` through a junction (never `npm install` in a copy).
  The junction comes out **before** the copy goes to the Recycle Bin, right after its merge.
- Each helper gets its own ports (API 8861 +, Expo 8082 +) and, only if it needs one, its own scratch
  database `fidato_mobile_<name>` built through `D:\fidato pms\.local\dbq.sh` (a copy of
  `fidato_mobile` by `pg_dump | psql` works while the phone's API is connected).
- **Each copy's Expo gets its own Metro cache** (MCORE-2, MEMORY 5), Git Bash, in the copy's `mobile/`:
  `TEMP='<copy>\.local\metro-tmp' TMP='<copy>\.local\metro-tmp' EXPO_PUBLIC_API_URL=... npx expo start --lan --port <port>`.
- **The browser pane is shared** (MEMORY 4): every page script checks `location.origin` first, every
  browser call names its `tabId`. Helpers run the gates one at a time:
  `until mkdir "/d/fidato pms moblie/.local/mobile-gates.lock" 2>/dev/null; do sleep 15; done; bash scripts/gates.sh; rmdir "/d/fidato pms moblie/.local/mobile-gates.lock"`.

## Lanes: one module each

The app mirrors the PMS's service names, so a module and its web twin are easy to find:

```
mobile/src/core/                     shared, the mobile chat only: api client, sign-in, outbox,
                                     storage, theme, ui pieces, navigation, ported common types
mobile/src/modules/<service>/        one PMS service: its screens, data calls, ported rules
mobile/src/modules/<service>/MODULE.md    what it does, which web screens it mirrors, its endpoints
mobile/src/modules/<service>/DEFECTS.md   every defect found in it (below)
```

**One helper per module at a time.** Its claim is a line in `HANDOVER.md` ("who holds what"),
written by the mobile chat. **The core is frozen for helpers**: a change there is asked of the mobile
chat. `app/` (the routes, expo-router), `package.json`, `app.json` and `mobile/src/core/*` are the core.

## Before your first write

1. Read `CLAUDE.md`, `HANDOVER.md`, `DECISIONS.md`, `docs/PLAN.md`, `MEMORY.md`, then the module's
   `MODULE.md` and `DEFECTS.md`, and the **web twin**: `src/modules/<service>/MODULE.md`, its
   screens and `src/modules/<service>/data/*` in the PMS one folder up.
2. Find the API endpoints the web screen calls and the rules it applies (`src/lib/rules.ts`,
   `src/lib/permissions.ts`, the module's own). Port; do not invent.
3. Anything not decided: ask the mobile chat, which asks the owner.

## The rules that bite (carried over from the PMS)

1. **The API decides rights.** The app hides nothing the API would allow and allows nothing it would
   refuse; a blocked action is **shown disabled with its reason, never hidden**.
2. **A dash, never a zero**, for a figure that is missing. No default prices anywhere.
3. **Never claim unrun code works.** Open the screen; say on what (phone model / preview width).
4. **Data calls only through `mobile/src/core/api.ts`**, and each module's own `data` file — never a
   bare `fetch` in a screen.
5. **The hotel is in every request and every cached key**; switching hotel never shows the last
   hotel's data.
6. **Offline only as the web allows** (M-1): the same tiers, the same idempotency keys, first in
   first out; settlements refused offline with the reason.
7. **Money, permissions and the outbox are Opus work** and get a second look before merging.

## Definition of done, per screen

```
Screen          file and its place in the navigation
Web twin        the PMS screen it mirrors, and any difference (the owner's yes for each)
Picture         its phone-view picture in ../.local/pms-shots (M-11); shot side by side with the native screen; every difference listed
Reads/Writes    which API endpoints, through which data file
Rules           which ported rule decides each control; blocked = disabled with its reason
Offline         which writes queue, which are refused, the words the user sees
States          empty · loading · error · offline, all four, with different words
What I saw      on which phone or preview size, with the sign-in role used
Accessibility   touch targets 44 px or more, labels on icon buttons, readable contrast
Packages        none added, or the owner's yes recorded in DECISIONS.md
```

## The gates (run in `mobile/`, all green before a merge)

```bash
# this PC, Git Bash, in D:\fidato pms moblie\mobile (or a helper's copy's mobile/)
bash scripts/gates.sh
```

It runs the type check, every `*.check.ts`, both phone bundles (`expo export`), and
`scripts/check-no-dev-login.mjs` on each bundle (no test sign-in in a release build). One line per
step in `../.local/mobile-gates/progress.txt`, logs beside it; the first line names the commit.
"ALL GATES GREEN" on a clean commit is the proof a merge needs.

A check that has never failed proves nothing: break the rule once, see it fail, put it back.

## Defects and mistakes

- **A defect in one module** goes in that module's `DEFECTS.md`, numbered with **M + the PMS's
  prefix**: `MHK-1` housekeeping, `MPOS-1` restaurant, `MFD-1` front desk, `MRS-1` reservations,
  `MFIN-1` money, `MRP-1` reports and the owner's figures, `MCORE-1` the core. Each entry: what
  happened, how it was found, **what was done about it**, and the rule it leaves. Fixed entries stay.
- **A lesson that would bite any module** goes in `MEMORY.md`, numbered 1, 2, 3 …
- **A defect in the PMS itself** (the API, the data) is not fixed here: write it in
  `docs/api-requests.md` for the PMS's main chat.

## Handover (every helper, every stop)

```
What I built        screens and files, the commit hash
What I saw          on which phone / preview, which roles
What I proved       gates and checks actually run, and the one I broke on purpose
Not proved          honestly
How to run and stop ports, pids, the database
Questions           each with a recommendation
```
