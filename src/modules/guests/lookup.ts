/* ══════════════════════════════════════════════════════════════════
   LOOKING UP A GUEST OR A COMPANY ON A PHONE — the rules, ported by hand
   from the web's src/modules/guests/pages/Guests.tsx (GUEST_COLUMNS,
   GuestsPage, KIND_ORDER, KIND_COPY, SOURCE_COLUMNS, CompaniesPage),
   data/directory.ts (the shapes), logic/contactKeys.ts (phoneKey,
   emailKey, agreedToOffers), src/modules/crm/pages/Guest360.tsx (STAY_WORD,
   the search's two letters, the cards' words) and crm/data/crm.ts. The
   servers are api/src/modules/guests/directory.ts and people.ts; every
   shape here is their answer.

   A FIGURE IS THE SERVER'S. Spend, revenue, balances and what a stay was
   charged are shown as sent (laundry's `rupees`: paise kept, never rounded
   to a rupee, MEMORY 9); a dash where the web draws one. The only sums are
   the web's own on Companies and agents (its three tiles and each group's
   line), which the API does not send: ported as the web adds them, in whole
   paise so a float never moves a rupee (MODULE.md, a PMS request).

   GUEST DATA (India's DPDP Act): nothing here keeps a guest anywhere; the
   screens read through the core's query cache, cleared at sign-out. An ID
   document never reaches the phone: Guest 360 sends only whether one is on
   file (`hasId`), and the phone says only that.

   Pure: no React Native, so lookup.check.ts runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { DASH } from "../../core/format.ts";
import { dayOf, rupees } from "../laundry/docket.ts";

/* ── Guests (GET /guests?asOn=) ───────────────────────────────────── */

/** directory.ts GuestRecord. `id` is the name's key (grouped by name, never
    merged), not a guest record: a row opens nothing, as on the web. */
export interface GuestRecord {
  id: string;
  name: string;
  stays: number;
  nights: number;
  /** The latest departure that has already happened. */
  lastStay: string | null;
  /** The earliest arrival still ahead: a returning guest. */
  nextStay: string | null;
  totalSpend: number;
  openBalance: number;
  sources: string[];
  /** Two live stays under one name that overlap. */
  possibleDuplicate: boolean;
}

/** GuestsPage's search: part of the name, any case (QA GU-5). */
export const byName = (rows: readonly GuestRecord[], search: string) => {
  const q = search.trim().toLowerCase();
  return q ? rows.filter((g) => g.name.toLowerCase().includes(q)) : [...rows];
};

/** The pill beside the title, the web's own words ("1 guests" too). */
export const guestCount = (rows: readonly GuestRecord[]) => `${rows.length} guests`;

/** The yellow note's title: "21 names have stays that overlap". */
export const overlapTitle = (n: number) => `${n} name${n === 1 ? " has" : "s have"} stays that overlap`;
export const OVERLAP_NOTE = "One person cannot be in two rooms on the same night, so either these are two people sharing a "
  + "name or something was entered twice. Shown, not merged - a wrong merge is far harder to undo than a visible duplicate.";

/** LAST STAY: the day, or "first visit" in grey. */
export const lastStayWords = (g: Pick<GuestRecord, "lastStay">) => (g.lastStay ? dayOf(g.lastStay) : "first visit");
/** Under it, in blue, a stay still ahead: "back 24 Oct 2026". */
export const backWords = (g: Pick<GuestRecord, "nextStay">) => (g.nextStay ? `back ${dayOf(g.nextStay)}` : null);

export type Owed = { text: string; tone: "owes" | "credit" | "none"; said: string };
/** BALANCE and OWED: nothing is a dash; what is owed red, what is in credit
    blue, each the size of the figure (the web's money(Math.abs(...)) - the
    colour carries the side, and the said words for a reader carry it too). */
export function owed(balance: number | null | undefined): Owed {
  if (balance == null || !Number.isFinite(balance)) return { text: DASH, tone: "none", said: "not known" };
  if (balance === 0) return { text: DASH, tone: "none", said: "nothing" };
  const text = rupees(Math.abs(balance));
  return balance > 0 ? { text, tone: "owes", said: `${text} owed` } : { text, tone: "credit", said: `${text} in credit` };
}

/* ── Companies and agents (GET /companies, GET /company-records) ──── */

export type Kind = "OTA" | "Direct" | "Corporate";

/** directory.ts CompanyRecord: one row per name bookings came through. */
export interface CompanyRecord {
  id: string;
  name: string;
  kind: Kind;
  bookings: number;
  roomNights: number;
  revenue: number;
  openBalance: number;
  /** Charged outside the PMS today: null, a dash. */
  commissionPct: number | null;
}

/** What the phone takes from a company's record (contracts' CompanyRow): its
    id and name only - nothing of its credit, contact or GSTIN is shown here. */
export interface CompanyName { id: string; name: string }

const nameKey = (name: string) => name.trim().toLowerCase();

/** CompaniesPage's rows: the bookings' rows, then each company on record with
    no booking here, under Corporate, at nothing. Each row says whether a
    record stands behind it (the web's Edit). */
export function companyRows(booked: readonly CompanyRecord[], records: readonly CompanyName[] | undefined) {
  const named = new Set(booked.map((r) => nameKey(r.name)));
  const held = new Set((records ?? []).map((r) => nameKey(r.name)));
  const rows: CompanyRecord[] = [
    ...booked,
    ...(records ?? []).filter((r) => !named.has(nameKey(r.name))).map((r) => ({
      id: r.id, name: r.name, kind: "Corporate" as const, bookings: 0, roomNights: 0, revenue: 0, openBalance: 0, commissionPct: null,
    })),
  ];
  return rows.map((r) => ({ ...r, hasRecord: held.has(nameKey(r.name)) }));
}

/** OTAs first: they carry a commission and are the ones somebody checks. */
export const KIND_ORDER: readonly Kind[] = ["OTA", "Direct", "Corporate"];
export const KIND_COPY: Record<Kind, { title: string; blurb: string; tone: "accent" | "info" | "neutral" }> = {
  OTA: { title: "Travel agents", blurb: "Booked through a channel, and charged a commission for it.", tone: "accent" },
  Direct: { title: "Direct", blurb: "Straight to the property. No commission on any of it.", tone: "info" },
  Corporate: { title: "Corporate accounts", blurb: "A firm booking for its own people, settled on the city ledger.", tone: "neutral" },
};

export function groupsOf<R extends CompanyRecord>(rows: readonly R[]) {
  return KIND_ORDER.map((kind) => ({ kind, rows: rows.filter((r) => r.kind === kind) })).filter((g) => g.rows.length > 0);
}

/* The web adds rupees as floats; the phone adds whole paise, so 0.1 + 0.2 is
   30 paise and a sum shows the paise its parts carry. */
const paise = (n: number) => Math.round(n * 100);
const sumPaise = (rows: readonly CompanyRecord[], f: (r: CompanyRecord) => number) => rows.reduce((n, r) => n + paise(f(r)), 0);

/** A group's line: "₹39,88,166 · 514 bookings". */
export const groupLine = (rows: readonly CompanyRecord[]) =>
  `${rupees(sumPaise(rows, (r) => r.revenue) / 100)} · ${rows.reduce((n, r) => n + r.bookings, 0)} bookings`;

export interface Split { agent: number; direct: number; owedToUs: number; agentPct: number; directPct: number }
/** The three tiles, drawn only when there is revenue with a source (the web:
    "nothing is invented when the list is empty"). Owed to the property counts
    only the sources that owe: one in credit does not pay another's bill. */
export function splitOf(rows: readonly CompanyRecord[]): Split | null {
  const of = (k: Kind) => sumPaise(rows.filter((r) => r.kind === k), (r) => r.revenue);
  const agent = of("OTA");
  const direct = of("Direct");
  const total = agent + direct + of("Corporate");
  if (!(total > 0)) return null;
  return {
    agent: agent / 100, direct: direct / 100,
    owedToUs: sumPaise(rows, (r) => Math.max(r.openBalance, 0)) / 100,
    agentPct: Math.round((agent / total) * 100), directPct: Math.round((direct / total) * 100),
  };
}

/** REVENUE: no booking yet, nothing earned, a dash rather than ₹0. */
export const revenueWords = (r: Pick<CompanyRecord, "bookings" | "revenue">) => (r.bookings === 0 ? DASH : rupees(r.revenue));
/** COMMISSION: charged outside this system today, a dash; a figure when sent. */
export const commissionWords = (r: Pick<CompanyRecord, "commissionPct">) => (r.commissionPct === null ? DASH : `${r.commissionPct}%`);

/* ── Guest 360 (GET /crm/guests?q=, GET /crm/guests/:id) ──────────── */

/** crm.ts GuestFound. */
export interface GuestFound { id: string; name: string; phone: string | null; email: string | null; visits: number; isBlacklisted: boolean }

/** The search asks the server from two letters (searchGuests). */
export const searchReady = (q: string) => q.trim().length >= 2;

/** crm.ts Guest360: everything app.guest_360 sends. */
export interface Guest360 {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  nationality: string | null;
  isVip: boolean;
  isBlacklisted: boolean;
  blacklistReason: string | null;
  /** That an ID is on file - never the document. */
  hasId: boolean;
  companies: string[];
  visits: number;
  nights: number;
  charged: number;
  firstStay: string | null;
  lastStay: string | null;
  stays: Array<{
    id: string; hotelCode: string; hotelName: string; reference: string;
    checkIn: string; checkOut: string; status: string;
    roomType: string | null; source: string | null; charged: number;
  }>;
  sent: Array<{ at: string; channel: string; kind: string; status: string; hotelName: string }>;
  noOffers: Array<{ id: string; kind: "phone" | "email"; value: string; at: string }>;
  joined: Array<{ id: string; guestId: string; name: string; at: string }>;
}
export type Stay360 = Guest360["stays"][number];

/** "98765 43210 · a@b.in", a dash for what is not on file. */
export const contactLine = (g: Pick<Guest360, "phone" | "email">) => `${g.phone ?? DASH} · ${g.email ?? DASH}`;

/** "Nationality IN · an ID is on file · books under Infosys": never the ID. */
export const whoLine = (g: Pick<Guest360, "nationality" | "hasId" | "companies">) =>
  `Nationality ${g.nationality ?? DASH} · ${g.hasId ? "an ID is on file" : "no ID on file"}`
  + `${g.companies.length > 0 ? ` · books under ${g.companies.join(", ")}` : ""}`;

/** "Joined into this record: A, B." */
export const joinedLine = (g: Pick<Guest360, "joined">) =>
  (g.joined.length > 0 ? `Joined into this record: ${g.joined.map((j) => j.name).join(", ")}.` : null);

/** The desk's words for a stay (QA GU-7), not the column's. */
const STAY_WORD: Record<string, string> = {
  confirmed: "Due in", checked_in: "In house", checked_out: "Checked out",
  cancelled: "Cancelled", no_show: "No show", void: "Void", tentative: "Waiting for the hotel",
};
export const stayWord = (status: string) => STAY_WORD[status] ?? status.replace("_", " ");
/** "12 Aug 2026 – 14 Aug 2026". */
export const stayDates = (s: Pick<Stay360, "checkIn" | "checkOut">) => `${dayOf(s.checkIn)} – ${dayOf(s.checkOut)}`;

/** One line of "What was sent to them": its day, what, how, its state, where. */
export const sentWords = (m: Guest360["sent"][number]) => ({
  day: dayOf(m.at), what: m.kind.replace(/_/g, " "), how: `by ${m.channel} · ${m.status} · ${m.hotelName}`,
});

/* ── Offers (D25-39 opt-in, D21-22 "no offers") ───────────────────── */

/** contactKeys.ts phoneKey: +91 98765 43210, 098765 43210 and 9876543210 are
    one number; under ten digits, or all one digit, matches nobody. The
    database holds the same rule (app.phone_key). */
export function phoneKey(phone: string | null | undefined): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  const k = d.length === 12 && d.startsWith("91") ? d.slice(2) : d.length === 11 && d.startsWith("0") ? d.slice(1) : d;
  return k.length < 10 || /^(\d)\1*$/.test(k) ? null : k;
}
export const emailKey = (email: string | null | undefined) => email?.trim().toLowerCase() || null;

export interface OffersYes { phones: readonly string[]; emails: readonly string[] }
/** NoOffersCard's `agreed`: null until the yes list is read (a dash); a yes on
    the phone or the email, and no "no" beside it (marketing's gate). */
export function agreed(yes: OffersYes | undefined, g: Pick<Guest360, "phone" | "email" | "noOffers">): boolean | null {
  if (!yes) return null;
  const p = phoneKey(g.phone);
  const e = emailKey(g.email);
  return ((p !== null && yes.phones.includes(p)) || (e !== null && yes.emails.includes(e))) && g.noOffers.length === 0;
}
export const offersWords = (a: boolean | null) => (a === null ? DASH
  : a ? "Agreed to offers. They may be sent to this guest's phone and email, at every hotel."
    : "No offers are sent: this guest has not said yes.");
/** "No offers to phone 9876543210". */
export const noOffersWords = (o: Guest360["noOffers"][number]) => `No offers to ${o.kind === "phone" ? "phone" : "email"} ${o.value}`;
