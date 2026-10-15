# Fidato Mobile — read before anything else

**A SEPARATE SYSTEM (the owner, 15 Oct 2026, PMS D27-333 / M-2):** the native phone app of the Fidato
PMS, built with **React Native + Expo** as real installed apps for Android and iPhone (M-3). It lives
only in `D:\fidato pms moblie\mobile` and its branch `mobile/app`. **It is never merged into the PMS's
cp6, and nothing of it is copied into `D:\fidato pms`.**

The folder above this one (`D:\fidato pms moblie`) is a git worktree of the PMS: the whole PMS is
there to **read** (screens, data shapes, rules, API, decisions). **Build only inside `mobile/`.**
Never edit the PMS's `api/`, `db/`, `src/`, `scripts/` or its root notes from here.

## Read in this order, before your first write

1. This file.
2. `AGENTS.md` (here): how the work is divided, the definition of done, the gates, the defect system.
3. `HANDOVER.md` (here): the top block — where it stands and what is next.
4. `DECISIONS.md` (here): every decision for the app, numbered M-1, M-2 …
5. `docs/PLAN.md` (here): the whole rebuild plan, build and production.
6. `MEMORY.md` (here): the mistakes not to repeat. Then the module's `MODULE.md` and `DEFECTS.md`.

## The PMS's principles apply here unchanged

- **No decision without the owner's yes** (16 Sep). Ask with a recommendation and wait; silence is
  not approval. Anything unspecified goes to the owner as a question.
- **Nothing leaves this machine** (19 Sep): no push, no Expo cloud build, no store upload, no
  over-the-air update, unless the owner says yes for that exact thing. The production route is
  decided after slice 2 (M-3).
- **Never read, print, copy or commit any `.env`** — not the PMS's `api/.env`, not its root `.env`.
  The app's public sign-in settings come from the owner.
- **No default prices.** A missing figure is a dash, never a zero.
- **Open the screen before claiming it works**: on the phone (Expo Go or a development build) or the
  375 × 812 preview, and say which. Run the gates you quote.
- **Every mistake goes into `MEMORY.md`, numbered; every defect into its module's `DEFECTS.md`.**
- **Every command given to the owner is labelled with where it runs.**
- **Ponytail**: the minimum code that works. **No new package without the owner's yes** (name and
  exact version first; installed inside `mobile/` only).
- **Indian context**: rupees in Indian format, the PMS's GST rules, India's data-protection law.
- **Helper model by task** (PMS D27-310): Opus for money, permissions, offline/outbox and anything
  touching data rules; Sonnet for screens and wording; Haiku for mechanical or read-only jobs.

## The app and the PMS

- **The app has no server and no database of its own.** It calls the PMS's API (the same Hono API,
  the same Firebase accounts and roles). **The API decides who may do what.**
- **A change the app needs in the API or the database belongs to the PMS.** Write it in
  `docs/api-requests.md`; the owner takes it to the PMS's main chat. Never change it here.
- **Reuse, don't reinvent**: port the PMS's data shapes and rules into `mobile/src` with the source
  file named in a comment. The app never imports from `../src` at run time.

## Running it locally

- API **8860**, from this worktree's `api/`, on the database **`fidato_mobile`** (never `fidato`).
  Expo **8081**. The PC is `192.168.1.33` on the Wi-Fi.
- **The PostgreSQL on 55432 belongs to the PMS's main chat: never start or stop it.** Every database
  run goes through `D:\fidato pms\.local\dbq.sh`.
- **Before giving the owner the phone link, warm both phone bundles** (MEMORY 1).
- Exact commands: `docs/PLAN.md` § 9 and `HANDOVER.md`.

## When you stop

A `CHANGELOG.md` entry, the top block of `HANDOVER.md` brought up to date, and a short report to the
PMS's main chat (through the owner, or a message when that chat is running).
