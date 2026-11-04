# Rules for every slice helper (wave 2, 15 Oct) — read before your first write

You are one of several Opus helpers building a slice of the Fidato PMS phone app (React Native +
Expo SDK 57, TypeScript, expo-router, @tanstack/react-query) in parallel. The mobile chat (the
mobile master) sent you, reviews and merges. **The owner decided (M-9): "don't ask me, just build
all" — every act the web has for your role, EXACTLY as the web's mobile version.** Where the web
decides a thing, build the web's way; ask only what the web cannot answer.

## Where you work — strict
- ONLY in your copy's `mobile/` folder: `D:\fidato pms moblie\.claude\worktrees\<your copy>\mobile`,
  on your branch (checked out). `node_modules` is a junction to the shared one: NEVER `npm install`,
  NEVER add a package. A package you need: name it and its Expo SDK 57 version in your report
  (`node -e "console.log(require('./node_modules/expo/bundledNativeModules.json')['<name>'])"`),
  build everything else, and show that control disabled with the reason "On the website for now".
- Never write in `D:\fidato pms` (the PMS), in `D:\fidato pms moblie\mobile` (the master's), in any
  other copy, or in the PMS code inside your copy (`api/`, `db/`, `src/`, `scripts/` at the copy
  ROOT). READ all of the PMS freely: it is your spec.
- Never `git push`, merge or deploy. Commit locally on your branch; every message ends with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Never read, print or copy any `.env`. Never start or stop PostgreSQL. Never stop a server that is
  not yours. Never use the PMS's own website (localhost:5173) or its API (8787): they are the
  main chat's.
- THE CORE IS FROZEN: never edit `app/_layout.tsx`, `app/index.tsx`, `app/all.tsx`, `app/hotel/`,
  any existing file under `app/housekeeping/` or `app/pos/`, `src/core/*`, `package.json`,
  `app.json`, `scripts/`, nor another module's files. Shared files you may NOT edit in an existing
  module: its `MODULE.md`, `DEFECTS.md`, `types.ts`, `roles.ts`, `Pay.tsx`. A core change you need:
  the exact diff in your report.

## Read first (in your copy's `mobile/`)
`CLAUDE.md`, `AGENTS.md` (the definition of done per screen; the rules that bite), `DECISIONS.md`
(M-1 offline as the web, M-5 the key from the first tap, M-9), `MEMORY.md` (4: the shared browser
pane; 5: the Metro cache). The core: `src/core/api.ts` (`api`, `orNull`, `send`, `HeldError`,
`ApiError`), `session.tsx` (`useSession`, `roleAt`), `ui.tsx` (`useRead`, `Screen`, `Head`,
`Card`, `Capsule`, `ReadFailed`, `Row`, `s`), `theme.ts` (`c`, `space`, `t`, `face` — NEVER
`fontWeight`), `format.ts`, `offline.ts` (the web's tiers, copied whole), `outbox.ts`, `types.ts`,
`HeldBar.tsx`. **The patterns to copy:** `src/modules/housekeeping/` (MODULE.md, roles.ts with the
API's sentences read back from it, board.ts + board.check.ts, Rooms.tsx) and
`app/housekeeping/[code]/*.tsx` (a route: useSession guard → Redirect; find the hotel; `roleAt`).

## M-11, the owner, 31 Oct: THE PICTURE IS THE SPEC
"First take the screenshots of the PMS app in the mobile view, then build exactly this in the
native features, so that we are aligned and it is the same overall."

- **The reference set:** `D:\fidato pms moblie\.local\pms-shots\` — today's PMS at phone width (390 px),
  full length: `all\` (81 screens by menu), `new\` (63 addresses added since), `roles\` (each role's
  home, its open menu `r-<role>-menu`, its account menu `r-<role>-account`). Each screen is a
  `.png` (open it with the Read tool) and a `.txt` (its exact words); `index.json` lists them.
  **These replace the 21 Sep set and the older `pos-reference` wherever they differ.**
- **Today's code:** the PMS at the top of your copy is two weeks old. Read today's in
  `D:\fidato pms moblie\.claude\worktrees\pms-ref` (read only): its `src/` and `api/src/` are what the
  pictures show. Your own API still runs the older code on your scratch database, so a read the
  picture needs may be missing there: say so in your report and draw the dash or the empty state,
  never an invented figure.
- **Build what the picture shows:** the same words, order, grouping, colours, sizes, tiles, pills,
  empty states. Where the PMS itself is broken at phone width (the Till's clipping, R-15) draw it
  unclipped and say so. Port the look from the web's code and tokens; do not eyeball a colour.
- **A state the picture does not show** (a dialog, a running table, a check-in sheet): take it
  yourself with the same tool, under the preview lock. The private pair is RUNNING and yours to
  press real buttons on: website `http://localhost:5190`, API `http://localhost:8870`, database
  `fidato_ref` (a private copy; nothing reaches the main chat). In
  `D:\fidato pms moblie\.local\pms-shots\`: write a list, then
  `node capture.mjs my-list.json flows/<your name>` — the header of `capture.mjs` shows the format
  (`to`, `as`, `steps` of `{click}`, `{label}`, `{wait}`; omit `to` to carry on from the page).
  Each capture run has its own Chrome now, so a capture needs no lock of its own.
- **Before you report, compare side by side:** shoot YOUR native screens with the same tool
  (`BASE=http://localhost:<your Expo port> node capture.mjs my-native.json flows/<your name>-native`,
  under the preview lock), read each pair, and list every difference left. A difference you cannot
  close (a package, the core, the phone itself) goes in your report with the reason.

## How every screen is built
- **Map the web twin first** (its pages, data file, the API routes and their gates in
  `api/src/roleGate.ts`, its MODULE.md and DEFECTS.md), then build. Port the web's words, rules and
  order of controls with the source file named in a comment; never invent.
- **The look:** the web at phone width. Reference pictures: `D:\fidato pms\.local\screenshots\2026-09-21\mobile\`
  (an older set, before the 22 Sep theme: follow the web's CODE where they differ) and
  `D:\fidato pms moblie\.local\pos-reference\` (today's look: tiles, sheets, buttons). Read them
  with the Read tool.
- **Rights:** a control the API would refuse is DISABLED with the API's own sentence (read it back
  from your API with a refused curl — a refused write changes nothing), never hidden. Put the lists
  and sentences in your module's `roles.ts` (or a file with your prefix) with a check.
- **Money is the server's.** The phone never totals a bill or a tax; every figure comes from the
  API. A dash, never a zero, for a figure the system does not hold.
- **Writes only through `send()`.** A `HeldError` is said as held (never a failure); an `ApiError`
  503 is the web's refusal sentence (offline, refused tier); any other `ApiError` the server's own
  words. Reads through `useRead(fn, [<your module>, code, …])` with the hotel in every key;
  invalidate `[<your module>, code]` after a write; poll as the web does.
- **Four states** (loading · failed · empty · offline) with different words; touch targets ≥ 44 px;
  labels on icon buttons; lucide-react-native icons only; pull to refresh.
- **Pure rules** in a `.ts` file with a `.check.ts` beside it, in the style of
  `src/modules/reports/figures.check.ts` (plain `eq()`, `node --experimental-strip-types`, `.ts`
  import extensions, no React Native imports). Break each important rule once, see the check fail,
  restore it.

## Running it — ONE PREVIEW AT A TIME (the machine has little free memory)
1. Write and check your code first: `npx tsc --noEmit` and your `.check.ts` files need no server.
2. Only to see your screens, take the preview lock (it may be held for a while — keep coding
   meanwhile; poll every few minutes, do not spin):
   `mkdir "/d/fidato pms moblie/.local/mobile-preview.lock" 2>/dev/null && echo "<your name> $(date +%H:%M)" > "/d/fidato pms moblie/.local/mobile-preview.lock/what"`
   — if `mkdir` fails, the lock is held; try again later.
3. With the lock, start YOUR API (Git Bash, in the background):
   `cd "/d/fidato pms moblie/api" && DATABASE_URL="postgres://pms_app:CHANGE_ME_app@127.0.0.1:55432/<your database>" PORT=<your API port> NODE_ENV=development ALLOW_DEV_AUTH=1 DB_POOL_MAX=5 CORS_ORIGIN="http://localhost:<your Expo port>" node_modules/.bin/tsx src/server.ts > "<your copy>/.local/api.log" 2>&1`
   (wait for `curl http://127.0.0.1:<API port>/health`), then YOUR Expo from your copy's `mobile/`,
   with its own Metro cache (mkdir it first):
   `TEMP='<your copy>\.local\metro-tmp' TMP='<your copy>\.local\metro-tmp' EXPO_PUBLIC_API_URL=http://192.168.1.33:<API port> npx expo start --lan --port <Expo port> > ../.local/expo.log 2>&1`.
   Check `/_sitemap` (in the browser) lists your routes.
4. The browser pane is SHARED (MEMORY 4): `preview_start {url: "http://localhost:<Expo port>"}`,
   `resize_window` 375×812 on YOUR `tabId`; every page script starts with
   `if (location.origin !== "http://localhost:<Expo port>") throw new Error("wrong tab")`; pass
   `tabId` to every browser call. Press buttons with `javascript_tool` (`element.click()`), read
   `document.body.innerText`; typing a URL drops the in-memory sign-in, so move inside the app with
   expo-router's `router.push` (Metro's `__r.getModules()` in development); keep each script under
   40 s. Screenshots may time out while the pane is hidden. Say in your report that buttons were
   pressed by script. Test data: make it with curl against YOUR API (the `x-dev-staff-id` header,
   the test people: dev-owner, dev-gm, dev-desk, dev-admin, dev-hotel-manager, dev-revenue,
   dev-housekeeping, dev-stores, dev-kitchen, dev-chef, dev-finance, dev-pos).
5. **The HELD path, every write you build:** wrap `window.fetch` so writes to your API throw
   `TypeError('Network request failed')` → see it held (or refused with the web's words, for a
   refused tier) and counted by the bar; restore → sent once.
6. When done previewing: STOP your Expo and your API (PowerShell: the listener on your port and its
   parents — `Get-NetTCPConnection -LocalPort <port> -State Listen`, `Get-CimInstance Win32_Process`
   — match YOUR copy's path or YOUR port, then `taskkill /PID <top> /T /F`; check the port is free),
   close your tab, and `rm -rf "/d/fidato pms moblie/.local/mobile-preview.lock"`. Never hold the
   lock while you are only coding; never more than 45 minutes at a time.

## If you are stopped (it happened on 16 Oct to every helper at once)
- **Commit after each screen** (and after each rules file with its check), even before the gates:
  a stopped helper loses only what was not committed.
- Keep one line per step in `<your copy>/.local/progress.txt` (`HH:MM what you just finished,
  what is next`), so whoever resumes you knows where you were.
- Resumed: read your branch's commits (`git log mobile/app..HEAD`), your `git status` and
  `progress.txt`, and continue — never start over. If you held a lock and your servers are gone,
  remove that lock yourself.

## Gates, once, at the end (no servers needed), ONE RUN AT A TIME
`until mkdir "/d/fidato pms moblie/.local/mobile-gates.lock" 2>/dev/null; do sleep 30; done; bash scripts/gates.sh; rmdir "/d/fidato pms moblie/.local/mobile-gates.lock"`
in your copy's `mobile/` → must end ALL GATES GREEN (types, every check, both phone bundles, no test
sign-in, the bundle's routes exactly your `app/`).

## Report back in this shape (AGENTS.md)
What I built (screens, routes, files, commit hashes) · What I saw (size, roles, pressed by script,
the reference pictures matched) · What I proved (gates and checks actually run; the rules broken on
purpose) · Not proved (honestly) · Questions (only what the web cannot decide; each with a
recommendation; packages with their SDK 57 version) · Core changes needed (exact diffs: an entry
point from a Dashboard tile or a landing, for example) · Text for your module's MODULE.md /
DEFECTS.md if the module is not yours alone · Faults in the web or API you found (for
docs/api-requests.md, R-16 onward).
