/* ══════════════════════════════════════════════════════════════════
   HALLS AND PACKAGES' RULES ON A PHONE (lane U, 19 Nov) — ported by hand
   from the web's src/modules/banquet/pages/BanquetSetup.tsx (a hall's and a
   package's line, VenueDialog's and PackageDialog's bodies, who may) and
   data/banquet.ts (the shapes, in ./rules.ts). The server is
   api/src/modules/banquet/banquet.ts lines 975-1158 (GET /setup, POST and
   PATCH /venues, POST and PATCH /packages), its gate HALLS in
   api/src/roleGate.ts line 175 (`room_config` edit) and the read's
   `see(["reservation", "room_config"], "the banquet halls")` line 942.

   NOTHING HERE SHIPS A PRICE. A usual rate, a rate a head nobody has typed
   is null: a dash ("no usual rate"), never 0. 0 is sent only with Free
   ticked (D27-120; the server's priceProblem refuses 0 otherwise, in its
   own words). A figure is sent as typed - never rounded here - and the
   server's figure is shown as it came back (MEMORY 9).

   A PACKAGE IS RETIRED, NEVER CHANGED (D27-305): switched off or on, its
   name, price and contents are fixed. Switching one off asks first (M-13's
   brief: a retirement asks; the web switches at once).

   Pure: no React Native, so setup.check.ts runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { figure, rupees, type Hall, type Package } from "./rules.ts";

/* ── Who may (api/src/permissions.ts through roleGate.ts refusalFor) ── */

/** `reservation` view or `room_config` view: the read (roleGate line 942). Every
    `room_config` viewer also views `reservation` today, so the list is the diary's. */
export const SETUP_READERS: readonly string[] = [
  "owner", "admin", "gm", "hotel_manager", "revenue_manager", "front_desk", "housekeeping",
  "kitchen_manager", "pos", "bar", "finance", "read_only",
];
/** `room_config` edit (HALLS): add a hall, edit one, add a package, switch one. */
export const SETTERS: readonly string[] = ["owner", "admin", "gm"];

export const SETUP_READ_REFUSED = "Reading the banquet halls is for the owner, an administrator, the general manager, the "
  + "hotel manager, the revenue manager, reception, housekeeping, the kitchen manager, a waiter, a bar person, the "
  + "accountant or a viewer. Ask one of them.";
export const HALLS_REFUSED =
  "Setting up the banquet halls and packages is for the owner, an administrator or the general manager. Ask one of them.";

const allow = (list: readonly string[], role: string | null, refusal: string) =>
  role != null && list.includes(role) ? null : refusal;
export const whyNotReadSetup = (role: string | null) => allow(SETUP_READERS, role, SETUP_READ_REFUSED);
export const whyNotSetUp = (role: string | null) => allow(SETTERS, role, HALLS_REFUSED);

/** The web's own notes, in each card, for somebody who may not (BanquetSetup.tsx). */
export const HALLS_WHO = "The owner, an administrator or the GM adds and edits them.";
export const PACKAGES_NOTE = "Never changed once added. Switch one off to stop offering it; functions keep what they were sold.";
export const PACKAGES_WHO = " The owner, an administrator or the GM adds and switches them.";

/* ── The lines (BanquetSetup.tsx) ─────────────────────────────── */

/** "Seats 200 · 300 standing · usually ₹50,000"; no rate is "no usual rate", never ₹0. */
export const hallLine = (v: Pick<Hall, "seated" | "floating" | "defaultRate">) =>
  `${v.seated !== null ? `Seats ${v.seated}` : "Seating not recorded"}`
  + `${v.floating !== null ? ` · ${v.floating} standing` : ""}`
  + ` · ${v.defaultRate === null ? "no usual rate" : `usually ${rupees(v.defaultRate)}`}`;

/** "₹850 a head · Soup, starters…"; no rate is "no rate - agreed per function". */
export const packageLine = (p: Pick<Package, "ratePerHead" | "description">) =>
  `${p.ratePerHead === null ? "no rate - agreed per function" : `${rupees(p.ratePerHead)} a head`}`
  + `${p.description ? ` · ${p.description}` : ""}`;

/** What the web says once a switch lands (its toast). */
export const switchedWords = (name: string, on: boolean) =>
  on ? `${name} is offered again` : `${name} is off: not offered for functions now`;

/* ── Add a hall, edit one (VenueDialog) ───────────────────────── */

export interface HallDraft { name: string; seated: string; floating: string; rate: string; free: boolean; notes: string }
export interface HallInput {
  name: string; seated: number | null; floating: number | null; defaultRate: number | null; free: boolean; notes?: string;
}

/** A hall opened for editing: blank where the server holds nothing; Free where it holds 0. */
export function hallDraft(v: Hall | null): HallDraft {
  const text = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));
  return {
    name: v?.name ?? "", seated: text(v?.seated), floating: text(v?.floating), rate: text(v?.defaultRate),
    free: v?.defaultRate === 0, notes: v?.notes ?? "",
  };
}

/** A head count: blank is "not measured" (null); otherwise a whole number, 0 or more.
    The server casts it to a whole number (`$5::int`), so 12.5 or "abc" would fail there. */
export function headCount(text: string): number | null | "bad" {
  const n = figure(text);
  if (n === null || n === "bad") return n;
  return Number.isInteger(n) && n >= 0 ? n : "bad";
}

/** Each box's problem, or null. */
export function hallProblems(d: HallDraft) {
  return {
    seated: headCount(d.seated) === "bad" ? "Not a whole number." : null,
    floating: headCount(d.floating) === "bad" ? "Not a whole number." : null,
    rate: figure(d.rate) === "bad" ? "Not a figure." : null,
  };
}

/** The body the web sends: every field, blank as null (the server then CLEARS a
    capacity or a usual rate - present-and-null means clear, banquet.ts line 1078),
    notes only when typed. Null when a box is not a figure, or there is no name. */
export function hallBody(d: HallDraft): HallInput | null {
  const seated = headCount(d.seated);
  const floating = headCount(d.floating);
  const rate = figure(d.rate);
  if (!d.name.trim() || seated === "bad" || floating === "bad" || rate === "bad") return null;
  return {
    name: d.name.trim(), seated, floating, defaultRate: rate, free: d.free,
    ...(d.notes ? { notes: d.notes } : {}),
  };
}

/* ── Add a package (PackageDialog) ────────────────────────────── */

export interface PackageDraft { name: string; rate: string; free: boolean; mealType: string; description: string }
export interface PackageInput { name: string; description?: string; ratePerHead: number | null; free: boolean; mealType?: string }
export const NO_PACKAGE: PackageDraft = { name: "", rate: "", free: false, mealType: "", description: "" };

export function packageBody(d: PackageDraft): PackageInput | null {
  const rate = figure(d.rate);
  if (!d.name.trim() || rate === "bad") return null;
  return {
    name: d.name.trim(),
    ...(d.description ? { description: d.description } : {}),
    ratePerHead: rate, free: d.free,
    ...(d.mealType ? { mealType: d.mealType } : {}),
  };
}

/** Free ticked fills 0 and greys the box; unticked empties it (the web's Checkbox). */
export const freeRate = (on: boolean) => ({ free: on, rate: on ? "0" : "" });
