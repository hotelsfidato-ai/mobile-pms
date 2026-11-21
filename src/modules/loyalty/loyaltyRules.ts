import { keyKeeper, type KeyKeeper } from "../../core/keys.ts";

/* ══════════════════════════════════════════════════════════════════
   LOYALTY'S SHAPES AND RULES, pure (loyalty.check.ts runs them).
   Ported by hand, trimmed to what the phone draws, from the PMS:
     src/modules/loyalty/data/loyalty.ts      LoyaltyStay, LoyaltyScreen,
                                              StatementLine, LoyaltyCard,
                                              HotelMonth (lines 8-94)
     src/modules/loyalty/pages/Loyalty.tsx    the page's words and when
                                              each button is offered or
                                              enabled (lines 35-245)
     src/modules/loyalty/MemberCard.tsx       the statement's words, the
                                              adjustment's enabling (14-96)
     api/src/modules/loyalty/loyalty.ts       what each route reads
   Every figure is the server's: points, balances, the month's earned and
   used. The phone adds, rounds and clamps nothing (MEMORY 9); a figure the
   server did not send is a dash, never a zero. What a person types is sent
   as typed: a blank is never 0.
   ══════════════════════════════════════════════════════════════════ */

export const DASH = "-";

/** One guest in house (data/loyalty.ts LoyaltyStay). */
export interface LoyaltyStay {
  id: string;
  reference: string;
  room: string | null;
  guestId: string;
  name: string;
  hasPhone: boolean;
  member: boolean;
  /** Null for a guest who is not a member. */
  points: number | null;
  /** False for a booking site's or an agent's booking: no points off it (L14). */
  direct: boolean;
}

/** GET /:code/loyalty (data/loyalty.ts LoyaltyScreen). */
export interface LoyaltyScreen {
  /** Group settings, null until set (L1, L8). */
  name: string | null;
  pointsPer100: number | null;
  /** What the guest agrees to (L4); null while the programme has no name. */
  words: string | null;
  /** app.sets_group_settings() */
  maySetRules: boolean;
  /** app.module_enabled(hotel, 'loyalty') */
  isOn: boolean;
  /** app.is_crm_manager(): the owner, an administrator or the GM. */
  isManager: boolean;
  /** app.redeems_loyalty_points(hotel) (D27-305). */
  mayRedeem: boolean;
  stays: LoyaltyStay[];
}

/** One line of a member's statement (data/loyalty.ts StatementLine). */
export interface StatementLine {
  id: number;
  kind: "earn" | "redeem" | "adjust" | "lapse";
  points: number;
  reason: string | null;
  at: string;
  hotelName: string;
  reference: string | null;
  /** A use whose discount line was reversed on the bill: the points came back. */
  undone: boolean;
}

/** GET /:code/loyalty/guests/:id (app.loyalty_card). */
export interface LoyaltyCard {
  member: { since: string; hotelName: string } | null;
  points: number | null;
  statement: StatementLine[];
}

/** GET /:code/loyalty/by-hotel?month= (app.loyalty_by_hotel). */
export interface HotelMonth { hotelCode: string; hotelName: string; earned: number | null; used: number | null }

/* ── Figures ─────────────────────────────────────────────────────── */

const num = new Intl.NumberFormat("en-IN");
const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/** The web's number(), with a dash for a figure not sent (the web draws 0 there). */
export const pointsText = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? DASH : num.format(n));

/** The web's money(): 1 point is ₹1 (L8). A dash for a figure not sent. */
export const rupees = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? DASH : inr.format(n));

/** "+1,200" / "-500", as the statement prints a line (MemberCard.tsx 64). */
export const signed = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? DASH : `${n > 0 ? "+" : ""}${num.format(n)}`;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];

/** The web's dateShort ("d MMM yyyy") on the day part of a server time,
    as the card does (`at.slice(0, 10)`): read as text, never through Date
    (MEMORY 7). A dash when it is not a day. */
export function dayOf(at: string | null | undefined): string {
  const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(at ?? "");
  if (!d) return DASH;
  const month = MONTHS[Number(d[2]) - 1];
  return month ? `${Number(d[3])} ${month.slice(0, 3)} ${d[1]}` : DASH;
}

/* ── The page's words ────────────────────────────────────────────── */

/** The page head's line (Loyalty.tsx 44-47). */
export function rulesLine(s: Pick<LoyaltyScreen, "name" | "pointsPer100">): string {
  return `${s.name ?? "No programme name yet"} · ${s.pointsPer100 === null
    ? "no earn rate set: stays earn nothing"
    : `${pointsText(s.pointsPer100)} points per ₹100 before GST; 1 point is ₹1 off room charges`}`;
}

export const OFF_NOTE = "Loyalty is off at this hotel: nobody joins, earns or uses points here. The owner or an "
  + "administrator turns it on in Settings, under Modules.";

/** D27-305, D27-307: whoever lacks a right is told who has it (Loyalty.tsx 87-90). */
export const NO_REDEEM = "Points are used by reception, the hotel manager, the general manager, an administrator or the owner.";
export const NO_JOIN = "Guests join and leave through reception, the hotel manager, the general manager, an administrator or the owner.";

export function inHouseNote(mayRedeem: boolean, mayJoin: boolean): string | null {
  return [!mayRedeem && NO_REDEEM, !mayJoin && NO_JOIN].filter(Boolean).join(" ") || null;
}

/** A row's buttons (Loyalty.tsx 72-81). The web leaves a button out for a
    role without the right; the phone draws it grey (AGENTS rule 1), the
    sentence in the card's head. A STATE that rules one out leaves it out,
    as the web: no Use points on a booking site's or an agent's stay (L14). */
export type RowAct = { act: "spend" | "leave" | "join"; label: string; refused: boolean };
export function rowActs(stay: Pick<LoyaltyStay, "member" | "direct">, mayRedeem: boolean, mayJoin: boolean): RowAct[] {
  if (!stay.member) return [{ act: "join", label: "Join", refused: !mayJoin }];
  const out: RowAct[] = [];
  if (stay.direct) out.push({ act: "spend", label: "Use points", refused: !mayRedeem });
  out.push({ act: "leave", label: "Leave", refused: !mayJoin });
  return out;
}

/** Join's text when the programme has no name (Loyalty.tsx 134). */
export const NO_WORDS = "The programme has no name yet, so there is nothing to agree to. The owner, an administrator or "
  + "the GM names it on this Loyalty screen, under The rules.";

/* ── What a person types ─────────────────────────────────────────── */

/** The Use points box keeps digits only (Loyalty.tsx 167). */
export const digitsOnly = (text: string) => text.replace(/\D/g, "");
/** The adjustment's box keeps digits and a minus (MemberCard.tsx 70). */
export const signedDigits = (text: string) => text.replace(/[^\d-]/g, "");
/** The earn rate's box keeps digits and a point (Loyalty.tsx 208). */
export const decimalOnly = (text: string) => text.replace(/[^\d.]/g, "");

/** A whole number as typed; null for a blank or anything that is not one
    ("", "-", "5-3"). Never 0 for a blank. */
export function wholeOf(text: string): number | null {
  if (!/^-?\d+$/.test(text)) return null;
  const n = Number(text);
  return Number.isSafeInteger(n) ? n : null;
}

/** Use points is enabled from 500 (Loyalty.tsx 160: Number.isInteger(n) && n >= 500). */
export function spendOf(text: string): number | null {
  const n = wholeOf(text);
  return n !== null && n >= 500 ? n : null;
}

/** The button's words: "Use ₹600", or "Use points" before a figure is typed (Loyalty.tsx 162). */
export function spendLabel(text: string): string {
  const n = wholeOf(text);
  return n !== null && n > 0 ? `Use ${rupees(n)}` : "Use points";
}

/** Adjust is enabled for a whole number other than 0, with a reason (MemberCard.tsx 77). */
export function adjustOf(text: string, reason: string): number | null {
  const n = wholeOf(text);
  return n !== null && n !== 0 && reason.trim() ? n : null;
}

/** The earn rate as typed: a blank is "none" (null, nothing earns - L8);
    anything else goes as the text it is, and the server decides it (a
    number above 0 and at most 100) in its own words. The web sends
    Number(text), and "5..5" becomes NaN, which JSON sends as null - the
    rate quietly cleared (PMS request, MODULE.md). */
export const rateBody = (text: string): string | null => (text === "" ? null : text);

/** The rules' fields as the web fills them (Loyalty.tsx 197-198). */
export const rateText = (n: number | null) => (n === null ? "" : String(n));

/* ── The statement ───────────────────────────────────────────────── */

const WHAT: Record<StatementLine["kind"], string> = { earn: "Earned", redeem: "Used", adjust: "Adjusted", lapse: "Lapsed" };

/** "Used on 5EL-0042 at 5 Elements - a reason (taken off the bill again; points back)" (MemberCard.tsx 59-62). */
export function lineWords(l: Pick<StatementLine, "kind" | "reference" | "hotelName" | "reason" | "undone">): string {
  return `${WHAT[l.kind] ?? l.kind}${l.reference ? ` on ${l.reference}` : ""} at ${l.hotelName}`
    + `${l.reason ? ` - ${l.reason}` : ""}${l.undone ? " (taken off the bill again; points back)" : ""}`;
}

/** The card's head line (MemberCard.tsx 47-48). */
export function memberLine(c: Pick<LoyaltyCard, "member">): string {
  return c.member
    ? `Member since ${dayOf(c.member.since)}, joined at ${c.member.hotelName}`
    : "Not a member. The desk joins a guest on the Loyalty screen, with their yes.";
}

/* ── The month by hotel ──────────────────────────────────────────── */

/** "2026-10" from a phone's own date, as the web's `isoDate(new Date()).slice(0, 7)`. */
export const monthOfDate = (d: { getFullYear(): number; getMonth(): number }) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/** "October 2026"; the text itself when it is not a month. */
export function monthWords(month: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  const name = m ? MONTHS[Number(m[2]) - 1] : undefined;
  return m && name ? `${name} ${m[1]}` : month;
}

/** A month before or after, on the text alone. */
export function shiftMonth(month: string, by: number): string {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return month;
  const at = Number(m[1]) * 12 + (Number(m[2]) - 1) + by;
  return `${Math.floor(at / 12)}-${String((at % 12) + 1).padStart(2, "0")}`;
}

/* ── One key per stay for Use points (core/keys.ts, MFIN-1) ──────── */

/** The redeem route reads the idempotency key (app.loyalty_redeem: "a
    repeat answers as the first did"). Use points tapped again after a lost
    reply keeps its key, so the points are taken once; a screen read that
    began after the failure and SHOWS that stay lets it go - the person now
    sees the balance, and a second use is on purpose. Another hotel's read
    changes nothing; each person has their own keys. */
export function redeemKeys(who: () => string = () => "", make?: () => KeyKeeper) {
  const keepers = new Map<string, KeyKeeper>();
  const name = (code: string, id: string) => `${code}/${id}`;
  return {
    of(code: string, stayId: string): KeyKeeper {
      let k = keepers.get(name(code, stayId));
      if (!k) { k = make ? make() : keyKeeper({ who }); keepers.set(name(code, stayId), k); }
      return k;
    },
    /** Before a screen read: this hotel's keepers' clocks. */
    marks(code: string): Map<string, number> {
      const out = new Map<string, number>();
      for (const [n, k] of keepers) if (n.startsWith(`${code}/`)) out.set(n, k.mark());
      return out;
    },
    /** The read came back: forget what it showed. */
    seen(code: string, marks: Map<string, number>, screen: Pick<LoyaltyScreen, "stays">) {
      for (const s of screen.stays) {
        const n = name(code, s.id);
        const m = marks.get(n);
        if (m !== undefined) keepers.get(n)?.seen(m);
      }
    },
  };
}
