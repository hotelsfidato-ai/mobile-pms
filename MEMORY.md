# Memory — the mobile app's mistakes, numbered

A mistake that would bite any module goes here, numbered. A defect in one module goes in that
module's `DEFECTS.md` instead. Read the newest first.

---

### 15 · A link lost at a merge, and the gates stayed green (4 Nov)

Resolving Laundry's menu conflict, the mobile chat's script refused to add its PHONE_ROUTES line
(the address also appears in the web's entry list) and the merge was committed without it: every
gate passed with Laundry unreachable. **The rule:** `menu.check.ts` now fails when a module's first
screen (`app/<name>/[code]`) has no menu link; after any conflict, count what each side added.

### 14 · A picture can be older than the code, or taken on a development build (4 Nov)

All bookings and New booking changed on 2 Nov, after the pictures of 31 Oct (MRS-2); the role
pictures' extra System entry was the web's development-only "Design system" (`index.json` shows
`dev-*` sign-ins). **The rule:** before calling a difference, compare the page's last change in the
PMS with the picture's date, and check how the picture was taken.

### 13 · An idempotency key kept too long swallows a deliberate repeat (4 Nov)

The mobile chat's first `keyKeeper` kept a payment's key until it landed. A guest paying ₹500, the
reply lost, then the other ₹500 in cash the same day, would have sent the second with the first's
key: the server answers with the stored first receipt, the phone says "taken", nothing is recorded.
Found by the independent review before the merge. **The rule:** a key lives only while the outcome
is unknown — forget it once the server answered (yes or its own no) or the person has seen the
state again; and money changes get a second, independent look before they merge.

### 12 · A picture can be blank, or show a press that never happened (4 Nov)

`all/09-front-desk-online-check-in` is a blank page with an empty `.txt`; every `r-<role>-account`
picture equals its `-home` (the avatar's press never opened the menu); `02-home-rooms` is the desk's
Rooms grid, not the housekeeping board. **The rule:** before matching, check the `.txt` is not empty,
the pressed state really differs from the page before it, and the picture's path in its folder's
`index.json` is the screen you think.

### 11 · A check whose test data makes a wrong formula right proves nothing (4 Nov)

The desk's `footOf` check passed with Charged = balance + paid, because the made-up bill had total =
balance + paid. **The rule:** choose data where the server's figure differs from any sum the phone
could make, then break the rule once and see it fail.

### 10 · A route parameter with a capital is invisible to the routes gate (4 Nov)

`[stayId]` never matches `gates.sh`'s `\[[a-z]+\]`, so the bundle-routes check cannot see it (MFD-1,
MFIN-3: twice). **The rule:** route parameters are lower case (`[id]`, `[code]`); a brief names them
so.

### 9 · A module's own formatter or clamp gets round the figure rule (4 Nov)

On a stay's bill a whole-rupee formatter showed ₹7,583 for ₹7,582.50 and "₹0 still owed" for twenty
paise; `Math.max(balance, 0)` turned an overpaid bill into "₹0 outstanding" (MFIN-4). **The rule:** a
figure is shown as the server sent it — never rounded, never clamped; a dash only for "not sent";
review every `Math.*`, `?? 0` and local formatter on a money screen.

### 8 · One tap must be one write: `send()` mints a key per call (4 Nov)

A button guarded only by a `busy` state can be tapped twice before the state reaches it, and each
call to `send()` makes a new idempotency key, so the server sees two writes (MPOS-3, MHK-W2).
**The rule:** latch a write at the tap (`useRef`), grey the button while it is on its way; a key
that outlives a lost reply needs the core change MFIN-1.

### 7 · The phone's engine reads only ISO times; node reads more (4 Nov)

The API sends some times as Postgres's text ("2026-10-31 07:35:58.215147+05:30"). Node and a browser
read it, Hermes answers NaN — so a `.check.ts` passes while the phone shows "NaN" (MPOS-1, MGS-2,
R-18). **The rule:** every server time goes through one ISO conversion (`instant()`) before `Date`,
and the check tests the converted text, not only the result.

### 6 · A brief named a file wrong because only the top folder was looked at (4 Nov)

The mobile chat's cloud brief told nine helpers "there is no index.json" after listing only
`reference/pms-shots/`; each of `all/`, `new/` and `roles/` has one. **The rule:** before a brief
says a file is or is not there, search the whole tree (`find`), not one folder.

Also learnt in the cloud (4 Nov), not mistakes: an `EXPO_PUBLIC_*` value reaches the bundle only
when written out in full as `process.env.EXPO_PUBLIC_X` (never `process.env[name]`), and Metro must
start with `--clear` after it changes; a helper's `git push` of its own branch was refused by the
session's permission check, while the mobile chat's merge into `main` went through.

### 5 · Copies that share node_modules must not share Metro's cache (15 Oct)

Three helper copies at once, one `%TEMP%\metro-cache`: expo-router's route list was cached for
whichever copy built first, so two previews served another copy's screens. **The rule:** every
Expo and every gate run gets its own `TEMP`/`TMP` (AGENTS.md, PLAN § 9; `gates.sh` does it and
checks the bundle's routes). MCORE-2.

### 4 · The browser pane is shared, and its tab ids are reused (15 Oct)

With three helpers previewing at once, one helper's script (undoing its fetch wrapper) ran on
another helper's page: `tab-1` had become that helper's 8084. **The rule:** start every page script
with `if (location.origin !== "http://localhost:<your port>") throw …`, pass `tabId` to every browser
call, and re-check your own wrapper and window size before trusting a result. Typing a URL reloads
the preview and drops the in-memory sign-in: move inside the app with expo-router's `router.push`
(in development, through Metro's `__r.getModules()`).

### 3 · Two decision lists, one number (14-15 Oct)

The mobile chat wrote the app's plan as "D27-321", saw the PMS take 321, renumbered it "D27-322" —
and the PMS had meanwhile used 322 too ("Add a property's message"). Two different decisions now
carry the same number in two places. **The rule:** the app's decisions are numbered **M-1, M-2 …**
in `mobile/DECISIONS.md` (M-2); the old "D27-322" on this branch is M-1.

### 2 · An interrupted npm install left a lock file that broke the type check (14 Oct)

`npm install` was stopped half-way; `package-lock.json` kept empty versions and a truncated
`csstype`, and `tsc` then failed inside `node_modules` with errors that looked like the app's.
**The rule:** when `tsc` fails inside `node_modules`, delete `mobile/node_modules` and
`mobile/package-lock.json` and install again, before touching the app's code.

### 1 · Expo Go sat on "loading" on the owner's first open (14 Oct)

The phone reached Metro (seen connected from 192.168.1.37), but the first phone bundle after an Expo
restart took **195 s** on a D: drive busy with other work, and Expo Go gave up first. Once built, the
bundle was served in 0.06 s. **The rule:** after any Expo start, request **both** phone bundles (the
manifest's `launchAsset.url`, with `expo-platform: android` and `ios`) and wait until each answers in
under a second **before** giving the owner the link.
