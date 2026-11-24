# Memory — the mobile app's mistakes, numbered

A mistake that would bite any module goes here, numbered. A defect in one module goes in that
module's `DEFECTS.md` instead. Read the newest first.

---

### 29 · The stores' Expo Go moved to SDK 58 and stopped opening the app (25 Nov)

The owner's phone updated Expo Go to SDK 58; the app was on SDK 57, and Expo Go opens only its own
SDK. Nothing in the gates can see this: it showed only on the phone. **What was done (M-19):**
`npx expo install expo@^58.0.0 --fix`, which npm refused twice (ERESOLVE): expo-router 57 had
`@expo/ui`, `expo-symbols` and `@expo/log-box` as its own dependencies and 58 takes them as peers, so
the old copies left in `package-lock.json` clashed. Their lock entries (and the old router's) were
deleted and `npm install` run; the app imports none of them. Then the 9 type errors of React Native
0.88's strict types (`useRef<ScrollView>` is now `useRef<ScrollViewInstance>`; `renderItem={null}`
refused), `File.write()` awaited (async since SDK 58: the share must not go before the file is
written), `@types/react` to 19.3 under devDependencies (`npx expo install @types/react -- --save-dev`
put it under dependencies). **The rule:** when Expo Go says the SDK does not match, the app follows
the stores' SDK (Expo Go for an older SDK is Android only); after an SDK move run `npx expo install
--check` until it says "Dependencies are up to date", then the gates, then open every role.

**The same day, on the phone:** "[Worklets] Mismatch between JavaScript part and native part of
Worklets (0.14.0 vs 0.13.0)" at the first screen. `react-native-drawer-layout` (inside expo-router)
needs `react-native-reanimated`; deleting the old lock entries let npm fetch the newest Reanimated
4.8.0 and Worklets 0.14.0, while Expo Go 58 carries 4.7.1 and 0.13.0 (the lock had had exactly those).
`npx expo install --check` and the browser could not see it: they look only at the app's own
dependencies, and the web has no native part. **Done:** the three pinned as the app's own dependencies
by `npx expo install react-native-reanimated react-native-worklets react-native-gesture-handler`, so
the next SDK move keeps them in step. **The rule:** never delete a lock entry for a native package;
after an SDK move compare every native package in `node_modules` with the SDK's
`bundledNativeModules.json`, not only `package.json`'s.

---

### 30 · Stopping my own gates by name stopped another session's (25 Nov)

To stop the app's gates I killed every process whose command line held `gates.sh`, with
`taskkill /T`. It also ended the PMS main chat's `bash scripts/gates.sh separate-bills`, running at
the same time in `D:\fidato pms\.claude\worktrees\separate-bills`. **What was done:** Postgres and the
API checked (both up), the owner told so that run is repeated. **The rule:** stop a run by the pid
this chat started it with, or match on this copy's own path (`mobile-pms`), never on a script name
other copies share.

---

### 28 · Two files importing each other stopped the app at its first screen (21 Nov)

`core/Shell.tsx` imported `ShellAccount`, `ShellMenu` and `ShellNotes`, and each of them imported
`regular` / `body` / `SCRIM` / `Slide` back from `Shell.tsx`. On load, ShellAccount's styles read
`regular` before Shell had defined it: "Cannot access 'regular' before initialization", and nothing
rendered. Every gate was green; it was found by the first open in the PC's browser at 375 px (the cloud
never ran the app). **What was done:** the shared four moved to `core/ShellParts.tsx`; the sign-in, all
twelve roles' first screens and the GM's menu were then opened. A new gate, `circles`
(`scripts/check-no-import-circles.mjs`), refuses any import circle among the app's files; it found
this one when it was put back on purpose. **The rule:** a frame's pieces never import from the frame;
what they share goes in a file of its own.

### 27 · Names that differ only in capitals broke the PC's type check (21 Nov)

The cloud (Linux, which tells capitals apart) left 25 pairs such as `stores/Sheets.tsx` beside
`stores/sheets.ts`. On the PC (Windows), `import "./Sheets"` found `sheets.ts` first: the type check
failed with TS1149 and TS2305 on the first `bash scripts/gates.sh` after the transfer, while both phone
bundles still built (Metro matched the capitals). It was found by that first gate run on the PC.
**What was done:** each lowercase file became `<name>Rules.ts` (as `PayRules.ts`, MPOS-1) and its 129
imports were rewritten. A new first gate, `names`, refuses two names that differ only in capitals,
so Linux catches it too; it was broken on purpose once and failed. **The rule:** never give two files
in one folder the same name but for capitals, with or without the extension.

### 26 · A "safe" native option can delete what a name from outside points at (20 Nov)

expo-file-system's `idempotent: true` deletes whatever stands at the destination before moving a
download in — on iPhone, a folder too — and the destination came from the server's file name, which
the uploader chose. **The rule:** read the native code before passing an option a name from outside
can steer; keep server-named files in one folder of their own, check after the download that the
file sits straight inside it, and refuse otherwise. And iPhone's share sheet goes by the file's
NAME only: a stored file is saved under the server's name, never one the phone makes up (MPOS-P1).

### 25 · A file picked on the phone stays in the cache unless it is deleted (20 Nov)

The document and image pickers copy the chosen file into the app's cache; nothing deleted it, so an
old system's guest list (full ID numbers, the server keeps four digits) and downloaded vouchers,
slips and GSTR-1 files stayed on the phone after sign-out (the reviews of 20 Nov). **The rule:** a
picked file is read once and its copy forgotten (`forgetPicked`, `base64For`, `readText`); every
file handed to the share sheet goes into `cache/share/`, emptied before each, on sign-out and at app
start; never delete straight after `shareAsync` (Android reads late).

### 24 · A whole list sent from the last read must wait for the next read (20 Nov)

The Settings lists (ID types, booking colours, required fields) and Taxes send a whole list or a
whole heading built from the last read, and the server replaces it. After a write LANDED, the
controls were live before the re-read came back, so a second change sent a list without the first
(or the old bands back). MEMORY 22 covers only the doubt after a lost reply. **The rule:** after a
landed write that sends a whole record, keep its controls grey until a read that began after the
write's end has come back (`<name>/fresh` in the stop book; money's `freshBook`).

### 23 · A port of the web's menu goes stale, and a web rule on a phone address lies (20 Nov)

The phone's menu was a 2/4 Nov port: fifteen web entries were missing by 16 Nov and nobody saw it.
And the web's "which space is this page in" rule, applied to PHONE addresses, put every console
screen in the Front office. **The rule:** compare the port with the web by running the web's own
navigation under node for every role (1,685 comparisons, MADM-1's re-port), any web rule on a phone
address goes through the route table first, and a check against the files in `app/` beats a
hand-kept list of allowed routes.

### 22 · A stop that guards a write must live as long as the doubt, not as long as the sheet (20 Nov)

Three lanes (minibar, equipment, the finance desk) and the older dialogs kept the unknown-outcome
stop, and sometimes the idempotency key, inside the sheet or in the screen's React state. Closing
the sheet, or leaving the screen and coming back (the cache still shows data read before the loss),
dropped it, and a second tap made a second charge or a second deposit. Independent reviews found
it each time. **The rule:** on a route that reads no key, (1) while a write is on its way its sheet
cannot be closed and the screen sends nothing else; (2) the doubt (moment of loss, and the keeper
where the route reads a key) is kept outside React, keyed by hotel, screen and record; (3) it lifts
only on success or on a read that **began** after the loss (a read that merely finishes after it
may have been sent before). The server's key is still the real fix (R-30, R-31 and the M-13 rows).

### 21 · A refusal sentence lives in more than one check (20 Nov)

The Bar role fix changed pos's till refusal, and another module's check (`PayRules.check.ts`) still
held the old words, so the first gate run failed. **The rule:** when a sentence the server or web
words changes, search the whole app for the old words before the gates. And check a brief's claim
("the phone rounds") against the web's own formatter first: the screen matched the web; the export
file was the fault (MFD-9).

### 20 · A doc conflict can move a section under the wrong heading (20 Nov)

Merging two lanes' MODULE.md sections put one lane's picture table under the other lane's heading;
the merge looked clean. **The rule:** after any conflict in a module's MODULE.md or DEFECTS.md,
read the headings around the join.

### 19 · On Linux, Metro's cache follows TMPDIR, not TEMP/TMP (20 Nov)

`gates.sh` gave each copy its own Metro cache through `TEMP`/`TMP` (MEMORY 5), which is what
Windows reads. In the cloud (Linux) Metro read `TMPDIR`, so every helper's export shared
`/tmp/metro-cache`, and one copy's bundle lacked its new route file (found by the Rooms helper; the
routes gate caught it, so nothing wrong was merged). **The rule:** `gates.sh` sets all three.

### 18 · "Break it once" on an uncommitted file, restored with git, restored nothing (19 Nov)

The mobile chat broke `exportDoc.ts`'s escaping to prove its check, then ran `git checkout` to put
it back — but the file was new and untracked, so nothing came back and the broken file stayed (and
the check had not failed either: its data held no `&`). **The rule:** copy a file aside before
breaking it and copy it back; and a break that does not fail means the check is missing a case.

### 17 · Three small traps of 4 Nov's cloud work

- **A push in the same command as a commit** lost the commit when the permission check refused
  the command. Commit and push in separate commands.
- **A node check of a server time passes while the phone shows NaN:** make `Date.parse` ISO-only
  inside the check, as Hermes is (MCRS-1, the menu check's `isoOnly`; extends MEMORY 7).
- **A route that reads the key is defeated by a key per call:** a form whose server de-duplicates
  sends one key for the whole form (housekeeping `formKeeper`); a dialog's "until read again" needs
  its close to really read again (MGS-3).

### 16 · Letting a key go on a re-read assumes the person sees the record (4 Nov)

The keeper forgets a payment's key once its record is read again — written for Settle, which also
empties the amount. Banquet's payment dialog re-read the function but stayed open with the amount
typed, so a lost reply then a second tap made a second ₹50,000 advance (MBQ-1, the independent
review). **The rule:** on `outcomeUnknown(e)` (nothing came back, or a 5xx) a money form empties its
amount and says "Not known whether it was …"; where the server reads no key, the dialog takes no
more taps until it is closed and the record seen.

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
