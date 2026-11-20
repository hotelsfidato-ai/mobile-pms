import { DASH, dateLong, dateShort } from "../../core/format.ts";
import { whyNotRing } from "./roles.ts";
import type { OrderSummary } from "./types";

/* ══════════════════════════════════════════════════════════════════
   THE TILL'S AND THE TERMINAL'S RULES — the lane m13-till (19 Nov),
   ported from today's PMS (the read-only checkout, 16 Nov release):
     src/modules/pos/pages/Till.tsx       TillPage 64-524 (the lists, Start
                                          an order), EarlierBills 533-581,
                                          OrderRow 583-642
     src/modules/pos/pages/Terminal.tsx   the outlet chosen once 91-170,
                                          the choice 429-498, the header and
                                          the open orders 505-640, the lock
                                          line 1279-1293
     src/modules/pos/components/GuestOrders.tsx   room-service orders waiting
     src/modules/guests/components/Preferences.tsx RoomPreferences (food and
                                          allergy only, for an in-house room)
     api/src/roleGate.ts                  TILL 228 and its refusal 1289-1329
     api/src/modules/pos/till.ts          GET /till/orders 2076-2133 (open
                                          orders of any day, plus today's
                                          finished), GET /till/bills 2159-2290
   THE MONEY IS THE SERVER'S: every figure here is a field the API sent
   (gross, net); nothing is added up. Pure: no React Native, so
   `till.check.ts` runs under node.
   ══════════════════════════════════════════════════════════════════ */

/** The Till rings the restaurant (Till.tsx 136, openOrder(hotelId, "REST")). */
export const TILL_OUTLET = "REST";

/** A row of GET /till/orders or /till/bills: the web's OrderSummary, with
    `net` (an NC bill's value, D27-394), which the phone's types.ts of
    15 Oct does not carry yet. */
export interface TillRow extends OrderSummary { net?: number | null }

/* ── Who may ring up (roleGate.ts 228: `payment` create, plus the
   waiter and the Bar person by name). roles.ts now carries today's list
   and sentence (MPOS-T1, fixed by m13-fixes on 20 Nov), so the Till and
   the Terminal ask it as every other till screen does. */
export const RING_REFUSAL = "Ringing up an order is for the owner, an administrator, the general manager, the hotel manager, "
  + "reception, a waiter, a bar person or the accountant. Ask one of them.";
export const ringWhy = (role: string | null) => whyNotRing(role);

/* ── Figures, as the web's money() writes them ─────────────────────── */

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrPaise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** The web's money() (₹1,386) - except that a figure with paise keeps them
    (MEMORY 9: never rounded); not sent is a dash, never ₹0. */
export const rupees = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? DASH : Number.isInteger(n) ? inr.format(n) : inrPaise.format(n);
/** The Terminal's moneyPrecise (₹1,386.00). */
export const precise = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? DASH : inrPaise.format(n);

/* ── The Till's lists (Till.tsx 263-269) ──────────────────────────── */

/** Settled today shows the first twelve (Till.tsx 466). */
export const SETTLED_SHOWN = 12;

/** Open orders (any day: the API keeps them), and today's finished ones.
    A joined bill (D27-370) was not settled: its dishes are on the bill it
    joined, so it is in neither list. */
export function tillLists(rows: TillRow[]) {
  const open = rows.filter((o) => o.status === "open");
  const done = rows.filter((o) => o.status !== "open" && o.status !== "joined");
  return { open, done: done.slice(0, SETTLED_SHOWN) };
}

/** The title's pill: "19 open", amber while any is open (PageHeader badge). */
export const openPill = (open: number) => ({ text: `${open} open`, warning: open > 0 });

/** The row's second line: "3 items · 06:21 · upi", an earlier day's with its
    day first ("11 Oct · …"), a voided bill " · VOID" (OrderRow 610-615). */
export function rowLine(o: TillRow, withDate = false): string {
  return `${withDate ? `${dateShort(o.businessDate)} · ` : ""}${o.lines} item${o.lines === 1 ? "" : "s"} · ${o.openedAt}`
    + `${o.paymentMethod ? ` · ${o.paymentMethod}` : ""}${o.status === "void" ? " · VOID" : ""}`;
}

/** The row's figure: a bill given free says NC with its value, never a sale
    (D27-394); a voided one keeps its total, struck (D27-324). */
export function rowFigure(o: TillRow): { text: string; struck: boolean } {
  return {
    text: o.status === "no_charge" ? `NC ${rupees(o.net)}` : rupees(o.gross),
    struck: o.status === "void",
  };
}

/** "20261011-136 · T4", spoken whole. */
export const rowLabel = (o: TillRow, withDate = false) =>
  `${o.orderNo}${o.table ? ` · ${o.table}` : ""}, ${rowLine(o, withDate)}, ${rowFigure(o).text}${o.status === "void" ? ", voided" : ""}`;

/* ── Start an order (Till.tsx 133-142, Terminal.tsx 172-181) ──────── */

/** POST /till/orders: the outlet, and the table only when one was typed. */
export const openBody = (outlet: string, table: string) =>
  table.trim() ? { outlet, table: table.trim() } : { outlet };

/** A parcel (components/NewParcel.tsx, D27-359): named, a phone if given. */
export const parcelBody = (outlet: string, name: string, phone: string) =>
  ({ outlet, parcel: { name: name.trim(), phone: phone.trim() || null } });
export const PARCEL_NAMELESS = "Whose parcel is it? Type the customer's name.";

/** Opened: the order, then its pad over it, as the web's Till shows the
    order with the menu beside it (Till.tsx 136-142). The pad sends to the
    order by its id, so the outlet is the order's (till.ts batch 6276-6291). */
export const orderHref = (code: string, id: string) => `/pos/${code}/order/${id}`;
export const padHref = (code: string, id: string, table: string | null) =>
  `/pos/${code}/pad?order=${id}${table ? `&table=${encodeURIComponent(table)}` : ""}`;

/* ── An earlier day's bill (Till.tsx 533-581; till.ts bills 2159) ─── */

/** The Day (the phone's own date picker, M-16; max the till's business date) or two characters of the
    number ask, as the web; both may be given. */
export const earlierAsked = (date: string, no: string) => date !== "" || no.trim().length >= 2;
export function earlierPath(code: string, date: string, no: string) {
  const q = [date ? `date=${encodeURIComponent(date)}` : "", no.trim() ? `no=${encodeURIComponent(no.trim())}` : ""].filter(Boolean).join("&");
  return `/api/hotels/${code}/till/bills?${q}`;
}
export const earlierNone = (date: string, no: string) =>
  `No paid bill ${date ? `on ${dateShort(date)}` : ""}${date && no.trim() ? " " : ""}${no.trim() ? `with "${no.trim()}" in its number` : ""}.`;
export const EARLIER_FAILED = "The bills could not be read. Try again.";

/* ── The Terminal (Terminal.tsx) ───────────────────────────────────── */

/** GET /pos/outlets (posBridge.ts PosOutlet), cut to what the Terminal reads. */
export interface PosOutlet { code: string; name: string; isActive: boolean }

/** Remembered on THIS DEVICE (Terminal.tsx 61, "fidato.terminal-outlet"),
    per property on the phone: the web's one key would carry one hotel's
    outlet into another's till (AGENTS rule 5). */
export const outletKey = (code: string) => `fidato.terminal-outlet.${code}`;

export const activeOutlets = (list: PosOutlet[]) => list.filter((o) => o.isActive);
/** The chosen outlet's name, or its code while the list is not in. */
export const outletName = (list: PosOutlet[] | undefined, code: string) =>
  (list ?? []).filter((o) => o.isActive).find((o) => o.code === code)?.name ?? code;

/** "19 open · Saturday, 11 October 2026": the business date the API sent. */
export const terminalLine = (open: number, businessDate: string | null | undefined) =>
  `${open} open · ${businessDate ? dateLong(businessDate) : DASH}`;
/** A Terminal row's line: "AC5 · 1 item" (Terminal.tsx 617-619). */
export const terminalRowLine = (o: TillRow) => `${o.table ?? "no table"} · ${o.lines} item${o.lines === 1 ? "" : "s"}`;
export const lockedLine = (name: string) => `This terminal is locked to ${name}.`;

/* ── Room-service orders waiting (components/GuestOrders.tsx) ─────── */

export interface GuestOrder {
  id: string; room: string | null; note: string | null; createdAt: string;
  lines: { name: string; qty: number; unitPrice: number }[];
}
export const guestTitle = (room: string | null) => (room ? `Room ${room}` : "Room service");
export const guestDishes = (o: GuestOrder) => o.lines.map((l) => `${l.qty} × ${l.name}`).join(", ");
export const declineTitle = (room: string | null) => `Decline ${room ? `Room ${room}'s` : "this"} order?`;

/* ── The guest in that room: food and allergy (Preferences.tsx 92-112) ── */

export interface StayPreferences {
  room: string | null; inHouse: boolean;
  preferences: { allergies?: string | null; food?: "veg" | "jain" | null };
}
const FOOD = { veg: "Vegetarian", jain: "Jain" } as const;

/** The in-house guest of that room: the allergy (drawn red, no setting hides
    it) and their food, or null when there is nothing to say. */
export function roomLine(stays: unknown, room: string | null): { allergy: string | null; words: string[] } | null {
  /* It sits on another service's screen: an answer not of this shape is no preferences. */
  const list = Array.isArray(stays) ? (stays as StayPreferences[]) : [];
  const key = room?.trim().toUpperCase();
  const found = key ? list.find((s) => s.room?.toUpperCase() === key && s.inHouse) : undefined;
  if (!found) return null;
  const p = found.preferences ?? {};
  const words = p.food && FOOD[p.food] ? [FOOD[p.food]] : [];
  if (!p.allergies && words.length === 0) return null;
  return { allergy: p.allergies || null, words };
}
