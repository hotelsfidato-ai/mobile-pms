/* ══════════════════════════════════════════════════════════════════
   SETTINGS › LISTS AND FRONT DESK on a phone — the pure rules (lane
   m13-set-lists, 20 Nov). No React Native here, so lists.check.ts runs
   under node. Ported from the PMS of 16 Nov:

     src/modules/front-desk/desk.settings.ts      the eight console pages
     src/modules/front-desk/settings/ListPages.tsx the six list pages, their
                                                   words, REASON_TABS, ID_TYPES,
                                                   STATES (built-in colours)
     src/modules/front-desk/settings/ListEditor.tsx search, add, move (swap),
                                                   On/Off, rename, delete
     src/modules/front-desk/settings/FrontDeskPage.tsx FIELDS and the sections
     src/modules/front-desk/components/FrontDeskRules.tsx ADVANCE, DAYS, IDS,
                                                   TITLES, START, the figures
     src/modules/inventory/components/FrontDeskCard.tsx the hours and charges
     api/src/modules/front-desk/lists.ts          COLOUR, the label limits
     api/src/modules/inventory/inventorySetup.ts  PATCH /front-desk: the clock,
                                                   the night audit's owner/admin
   ══════════════════════════════════════════════════════════════════ */

import { DASH } from "../../core/format.ts";
import type { Role } from "../../core/menu.ts";

/* ── The hotel's lists (lists.ts data) ───────────────────────────── */

export type ListKind = "market_segment" | "reason_block" | "reason_cancel" | "reason_void" | "reason_correction";
export interface ListItem { id: string; label: string; colour: string | null; sort: number; active: boolean }
export interface Holiday { id: string; day: string; name: string; colour: string | null }

/** Which list a list page edits: one of the hotel's kinds, or the group's VIP levels. */
export type ListSource = { kind: ListKind } | { vip: true };
export interface ListPane { source: ListSource; noun: string; withColour: boolean; why?: string }
export interface ListPage { slug: string; title: string; explain: string; panes: readonly { tab?: string; pane: ListPane }[] }

/** ListPages.tsx REASON_TABS: the four ready-reason lists, as tabs. */
export const REASON_TABS: readonly [ListKind, string, string][] = [
  ["reason_block", "Block", "Taking a room out of service: offered under its note."],
  ["reason_cancel", "Cancel", "Cancelling a booking: offered under \"Why\"."],
  ["reason_void", "Void", "Voiding a booking entered by mistake."],
  ["reason_correction", "Bill correction", "Changing or reversing a line on a bill."],
];

/** THE TABLE OF KINDS: the three pages that are the list pattern (ListEditor), by the web's slug. */
export const LIST_PAGES: Readonly<Record<"market-segments" | "reasons" | "vip", ListPage>> = {
  "market-segments": {
    slug: "market-segments", title: "Market segments",
    explain: "Who the guest is, for the reports: offered on New booking. A booking keeps its segment's "
      + "words even if the segment is renamed or switched Off later; one a booking uses cannot be "
      + "deleted, only switched Off.",
    panes: [{ pane: { source: { kind: "market_segment" }, noun: "segment", withColour: false } }],
  },
  reasons: {
    slug: "reasons", title: "Ready reasons",
    explain: "Reasons the desk taps instead of typing. One tapped fills the reason box; typing your own "
      + "still works, and the reason is kept exactly as it was written.",
    panes: REASON_TABS.map(([kind, tab, why]) => ({ tab, pane: { source: { kind }, noun: "reason", withColour: false, why } })),
  },
  vip: {
    slug: "vip", title: "VIP levels",
    explain: "One list for the whole group, because a guest is one record at every hotel: marking a "
      + "guest VIP asks which level, and the level travels with them. Only the owner or an "
      + "administrator changes it.",
    panes: [{ pane: { source: { vip: true }, noun: "level", withColour: true } }],
  },
};

/** The API path of a list (lists.ts): the hotel's kind, or the group's VIP levels through this hotel. */
export const listPath = (code: string, source: ListSource) =>
  `/api/hotels/${encodeURIComponent(code)}/${"vip" in source ? "vip-levels" : `lists/${source.kind}`}`;

/** ListEditor `rows`: the search, case-blind, on the label. */
export const shownRows = (all: readonly ListItem[], find: string) =>
  all.filter((r) => r.label.toLowerCase().includes(find.trim().toLowerCase()));

/** ListEditor: moving is off while searching, and at either end. */
export const mayMove = (i: number, length: number, find: string, up: boolean) =>
  !find && i >= 0 && (up ? i > 0 : i < length - 1);

/** ListEditor `swap`: the two PATCHes, in order - a takes b's place (one more when they tie), b takes a's. */
export function swapSorts(a: Pick<ListItem, "id" | "sort">, b: Pick<ListItem, "id" | "sort">) {
  return [
    { id: a.id, sort: b.sort === a.sort ? b.sort + 1 : b.sort },
    { id: b.id, sort: a.sort },
  ] as const;
}

/** ListEditor's empty line: none at all, or none matching. */
export const emptyWords = (all: number, noun: string) => (all ? "Nothing matches." : `No ${noun}s yet.`);

/* ── Colours: the web's colour box gives "#RRGGBB" in capitals ───── */

/** lists.ts COLOUR, and its sentence. */
export const COLOUR = /^#[0-9a-fA-F]{6}$/;
export const COLOUR_WRONG = "A colour is like #DF6128.";
/** What a typed colour is sent as: the web's colour box's capitals, with its "#" (the phone has no
    colour box, so it is typed). Null when it is not a colour (then COLOUR_WRONG is said). */
export function typedColour(text: string): string | null {
  const t = text.trim();
  const hex = t.startsWith("#") ? t : `#${t}`;
  return COLOUR.test(hex) ? hex.toUpperCase() : null;
}

/* ── Holidays ────────────────────────────────────────────────────── */

/** HolidaysPage's first colour. */
export const HOLIDAY_COLOUR = "#FFF4DC";
/** ListEditor's swatch for a row with none (#E2E5E8). */
export const NO_COLOUR = "#E2E5E8";

/** A day typed YYYY-MM-DD (M-7: no date picker), and a real one: the web's date box gives no other,
    and the API casts it to a date (a 30 February would fail there, not be refused in words). */
export function isDay(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [y, m, d] = text.split("-").map(Number) as [number, number, number];
  const at = new Date(Date.UTC(y, m - 1, d));
  return at.getUTCFullYear() === y && at.getUTCMonth() === m - 1 && at.getUTCDate() === d;
}

/** HolidaysPage: Add is open with a day and a name. */
export const mayAddHoliday = (day: string, name: string) => isDay(day.trim()) && Boolean(name.trim());

/* ── ID types and reservation types (saved as the desk's settings) ── */

/** ListPages.tsx ID_TYPES. */
export const ID_TYPES: readonly [string, string][] = [
  ["aadhaar", "Aadhaar"], ["passport", "Passport"], ["driving_licence", "Driving licence"],
  ["voter", "Voter ID"], ["other", "Other"],
];

/** IdTypesPage `set`: the list sent as idTypesOff when one is switched. */
export const nextOff = (off: readonly string[], type: string, on: boolean): string[] =>
  on ? off.filter((t) => t !== type) : [...off, type];

/** ListPages.tsx STATES: today's booking states and their built-in colours (D27-260 Q6). */
export const STATES: readonly [string, string, string][] = [
  ["confirmed", "Confirmed", "#E6F0FA"], ["waiting", "Tentative (waiting for the hotel)", "#EEF0F2"],
  ["in-house", "In house", "#1F6FB2"], ["due-out", "Due out", "#F6C445"],
  ["departed", "Checked out", "#EEF0F2"], ["no-show", "No-show", "#9F2F4F"],
];

/* ── The desk's rules (GET /api/hotels deskRules; src/lib/api.ts DeskRules) ── */

export interface DeskRules {
  defaultPaymentMethod: string;
  deskMayOverbook: boolean;
  advanceBeforeCheckIn: "none" | "first_night" | "whole_stay";
  weekendDays: number[];
  defaultIdType: string | null;
  defaultNationality: string;
  defaultTitle: string | null;
  defaultGuarantee: "confirmed" | "tentative";
  defaultBillTo: "guest" | "company";
  requiredBookingFields: string[];
  hkDirtyAfterMove: boolean;
  hkDirtyAfterUnblock: boolean;
  hkStayoverDirtyAtAudit: boolean;
  idTypesOff: string[];
  statusColours: Record<string, string> | null;
  posRoundOff: "off" | "manual" | "automatic";
  kpiDayUseHalf: boolean;
  kpiCompAsSold: boolean;
  invoiceAtCheckout?: "print" | "offer" | "invoices";
  invoiceCopies?: 1 | 2;
  gmMayUndoCheckIn?: boolean;
  holidays: Array<{ day: string; name: string; colour: string | null }>;
}

/** FrontDeskRules.tsx START: what the card shows for a hotel the server sent no rules for. */
export const START: DeskRules = {
  defaultPaymentMethod: "Cash", deskMayOverbook: true, advanceBeforeCheckIn: "none",
  weekendDays: [0, 6], defaultIdType: null, defaultNationality: "IN", defaultTitle: null,
  defaultGuarantee: "confirmed", defaultBillTo: "guest", requiredBookingFields: [],
  hkDirtyAfterMove: true, hkDirtyAfterUnblock: true, hkStayoverDirtyAtAudit: false,
  idTypesOff: [], statusColours: null, posRoundOff: "manual",
  kpiDayUseHalf: false, kpiCompAsSold: true, holidays: [],
  invoiceAtCheckout: "print", invoiceCopies: 2,
  gmMayUndoCheckIn: true,
};

export const ADVANCE = [["none", "None"], ["first_night", "The first night"], ["whole_stay", "The whole stay"]] as const;
export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const IDS = [
  ["", "None"], ["aadhaar", "Aadhaar"], ["passport", "Passport"],
  ["driving_licence", "Driving licence"], ["voter", "Voter ID"], ["other", "Other"],
] as const;
export const TITLES = ["", "Mr", "Ms", "Mrs", "Dr"] as const;

/** FrontDeskRulesCard's eight figures, in its order. */
export function ruleFigures(r: DeskRules): [string, string][] {
  return [
    ["Way of paying", r.defaultPaymentMethod],
    ["Desk may overbook", r.deskMayOverbook ? "Yes" : "No"],
    ["Advance before check-in", ADVANCE.find(([v]) => v === r.advanceBeforeCheckIn)?.[1] ?? "None"],
    ["Weekend", r.weekendDays.map((d) => DAYS[d]).join(", ") || DASH],
    ["ID starts on", IDS.find(([v]) => v === (r.defaultIdType ?? ""))?.[1] ?? "None"],
    ["Nationality", r.defaultNationality],
    ["Title", r.defaultTitle ?? DASH],
    ["GM may undo a check-in", r.gmMayUndoCheckIn === false ? "No" : "Yes"],
  ];
}

/** RulesDialog's weekend button: a day in or out, the list kept in order. */
export const toggleDay = (days: readonly number[], d: number) =>
  days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort();

/** RulesDialog `submit`: what PATCH /front-desk is sent - the dialog's own fields. The web sends the
    whole rules record less the way of paying (set on Money › Payment methods); the route reads only
    these, so the change is the same. */
export function rulesBody(r: DeskRules) {
  return {
    deskMayOverbook: r.deskMayOverbook, advanceBeforeCheckIn: r.advanceBeforeCheckIn, weekendDays: r.weekendDays,
    defaultIdType: r.defaultIdType || null, defaultNationality: r.defaultNationality,
    defaultTitle: r.defaultTitle || null, gmMayUndoCheckIn: r.gmMayUndoCheckIn,
  };
}

/** FrontDeskPage FIELDS: what New booking may be made to ask for. */
export const FIELDS: readonly [string, string][] = [
  ["phone", "Phone"], ["email", "Email"], ["nationality", "Nationality"], ["address", "Address"],
  ["expectedArrival", "Expected arrival time"], ["marketSegment", "Market segment"],
  ["businessSource", "Business source"], ["salesPerson", "Sales person"],
];
/** FrontDeskPage: a field ticked or not, the list sent whole. */
export const withField = (fields: readonly string[], k: string, on: boolean): string[] =>
  on ? [...fields, k] : fields.filter((x) => x !== k);

/* ── The front desk's hours (GET /room-setup frontDesk; PATCH /front-desk) ── */

export interface FrontDeskHours {
  checkInTime: string; checkOutTime: string; nightAuditOpensAt: string;
  /** Null: "we do not charge for this" - a dash, never ₹0. */
  earlyCheckinCharge: number | null; lateCheckoutCharge: number | null;
}

/** FrontDeskCard's figure: rupees as the web's money(), paise kept when there are any (MEMORY 9); a dash for none. */
const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrPaise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const charge = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? DASH : Number.isInteger(n) ? inr.format(n) : inrPaise.format(n);

/** inventorySetup.ts: a 24-hour time, and the route's sentence for one that is not. */
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
export const timeProblem = (label: string, value: string) =>
  CLOCK.test(value) ? null : `${label} is a 24-hour time, like 13:00.`;

/** FrontDeskDialog `submit`: the hours; the night audit's time only when it changed, so the GM can
    still save the hours (D27-338). */
export function hoursBody(was: Pick<FrontDeskHours, "nightAuditOpensAt">, cin: string, cout: string, audit: string) {
  return { checkInTime: cin, checkOutTime: cout, ...(audit !== was.nightAuditOpensAt ? { nightAuditOpensAt: audit } : {}) };
}

/** The first refusal of the hours, in the route's own order and words, before anything is asked. */
export function hoursProblem(cin: string, cout: string, audit: string): string | null {
  return timeProblem("Check-in time", cin) ?? timeProblem("Check-out time", cout)
    ?? timeProblem("The night audit's opening time", audit);
}

/** inventorySetup.ts isOwnerOrAdmin (maySwitchModules: a group administrator is the owner). */
export const AUDIT_TIME_REFUSED = "The night audit's opening time is for the owner or an administrator. Ask one of them.";
export const whyNotAuditTime = (role: Role) => (role === "owner" || role === "admin" ? null : AUDIT_TIME_REFUSED);

/* ── An unknown outcome (MEMORY 16, 22) ─────────────────────────────
   None of these routes reads an idempotency key. When nothing came back,
   or the server failed, the page's writes stay grey until a read that
   BEGAN after the loss has come back. The doubt is kept here, outside
   React, by hotel and page (the VIP levels by the group: one list), so
   leaving the screen and coming back finds it. */

const DOUBTS = new Map<string, number>();
export const doubtKey = (code: string, page: string) => (page === "vip" ? "group:vip" : `${code.toUpperCase()}:${page}`);
/** True while nothing read since `lostAt` has come back (a read must BEGIN after it). */
export const stillUnknown = (lostAt: number | null, began: number | undefined) =>
  lostAt !== null && (began === undefined || began <= lostAt);
export const doubts = {
  at: (key: string): number | null => DOUBTS.get(key) ?? null,
  lost: (key: string, at: number) => { DOUBTS.set(key, at); },
  /** Forgotten once a read begun after the loss has come back; true when it went. */
  settle: (key: string, began: number | undefined): boolean => {
    const at = DOUBTS.get(key);
    if (at === undefined || stillUnknown(at, began)) return false;
    DOUBTS.delete(key);
    return true;
  },
};
export const UNKNOWN_LINE = "Not known whether the last change was saved: the page reads it again before anything else is changed. Pull down to read it.";
