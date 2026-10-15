/* ══════════════════════════════════════════════════════════════════
   PAYING A BILL — the rules and words of the web's Till order card
   (src/modules/pos/pages/Till.tsx: OrderPanel 924-1366, SplitPanel
   772-922), its room question (components/AskDialog.tsx roomAsk) and
   its PAN box (components/CashIdFields.tsx); the bodies are
   data/till.ts settleOrder / settleSplit. The API decides
   (api/src/modules/pos/till.ts settle, 4272-4702): every figure here is
   the server's, and the server checks again whatever the phone sends.
   The only sums are the Part panel's own, as the web's SplitPanel does
   them, to say "Still to take" before the server is asked.
   Pure: no React Native here, so `PayRules.check.ts` runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { cash as money } from "../../core/format.ts";
import { whyNotRing } from "./roles.ts";
import type { CashId, ChargeableRoom, Order, TenderInput } from "./types.ts";

/** The server's own sentence for a bill with nothing on it (till.ts 4459-4463). */
export const NOTHING_ON_IT = "There is nothing on this order. Add an item, or abandon it.";

/** Till.tsx 1284-1288: an order on a function is paid on the function's bill. */
export const onFunctionWords = (o: Pick<Order, "eventTitle">) =>
  `This order is on ${o.eventTitle ?? "a function"}'s bill, so the host pays for it there. `
  + "To take a room, cash, a card or UPI, choose \"Not for a function\" above first.";

/** Why no payment at all can be taken here, or null: the API's role
    sentence (whyNotRing), then an empty bill (the web disables every way
    on `live.length === 0`; the server's sentence says why). */
export function whyNotSettle(o: Pick<Order, "lines">, role: string | null): string | null {
  return whyNotRing(role) ?? (o.lines.some((l) => !l.voided) ? null : NOTHING_ON_IT);
}

/** Why room, cash, card, UPI and Part are off, or null: on a function
    they stay in sight, switched off, with the reason (Till.tsx 996-999). */
export function whyNotOtherWays(o: Pick<Order, "lines" | "eventId" | "eventTitle">, role: string | null): string | null {
  return whyNotSettle(o, role) ?? (o.eventId !== null ? onFunctionWords(o) : null);
}

/** More than ₹1,00,000: the PAN box shows (Till.tsx 1320; Rule 159). The
    server asks only when that much of it is cash, and refuses cash of
    ₹2,00,000 or more on one bill whatever is typed (cashLimit.ts). */
export const asksCashId = (o: Pick<Order, "payable">) => o.payable > 100_000;

/** settleOrder's body (data/till.ts 852-861), word for word. */
export function settleBody(
  method: "room" | "cash" | "card" | "upi" | "function",
  room?: string, folioId?: string, cashId: CashId = {},
) {
  return { method, room, folioId, ...cashId };
}

/* ── Charge to room (AskDialog.tsx roomAsk, D27-117, D27-162) ───── */

export interface RoomBill { folioId: string; guest: string; company?: string | null }

/** The bills open on this room, from the kept list (`GET /till/rooms`). */
export const billsOn = (rooms: readonly ChargeableRoom[] | undefined, room: string): RoomBill[] =>
  (rooms ?? []).filter((r) => r.room === room.trim());

export interface RoomAsk {
  title: string;
  body?: string;
  /** Two open bills: one answer each, in place of the confirm. */
  choices?: { label: string; folioId: string }[];
}

const whose = (b: RoomBill) => (b.company ? `${b.guest} - bill to ${b.company}` : b.guest);

/** The question before a bill goes to a room: whose bill it lands on,
    and which when the room has two. `amount` is the web's money(gross). */
export function roomAsk(room: string, amount: string, bills: readonly RoomBill[]): RoomAsk {
  const title = `Charge ${amount} to room ${room}?`;
  if (bills.length > 1) {
    return {
      title,
      body: `Room ${room} has ${bills.length} open bills. Whose is it?`,
      choices: bills.map((b) => ({ label: whose(b), folioId: b.folioId })),
    };
  }
  return { title, ...(bills[0] ? { body: `${whose(bills[0])} will see it on their room bill.` } : {}) };
}

/* ── What is said after (Till.tsx 973-979, 820) ─────────────────── */

export interface Settled { payable: number; guest?: string }

export function settledWords(
  method: "room" | "cash" | "card" | "upi" | "function", o: Pick<Order, "gross" | "eventTitle">, res: Settled,
): string {
  if (res.guest) return `${money(o.gross)} to ${res.guest}`;
  if (method === "function") return `${money(o.gross)} on ${o.eventTitle ?? "the function"}'s bill`;
  return money(res.payable);
}

/* ── Part - pay two ways (SplitPanel) ───────────────────────────────
   They must add up to the payable exactly; room is not offered (a bill
   going to a folio goes there in full). Typed as text on the phone, so
   "12." can be typed; read as the web's Number(...) || 0. */

export type PartMethod = "cash" | "card" | "upi";
export interface PartRow { method: PartMethod; amount: string; tendered: string }

export const firstRow = (): PartRow => ({ method: "cash", amount: "", tendered: "" });

const num = (s: string) => Number(s) || 0;
const paise = (n: number) => Math.round(n * 100) / 100;

/** The panel's figures, as SplitPanel works them (798-809). */
export function partSums(o: Pick<Order, "payable">, rows: readonly PartRow[]) {
  /* Paid wholly in cash, the bill is whole rupees (NA-2): the server
     rounds it the same way at the settle. */
  const bill = rows.every((r) => r.method === "cash") ? Math.round(o.payable) : o.payable;
  const taken = rows.reduce((a, r) => a + num(r.amount), 0);
  const left = paise(bill - taken);
  const cash = rows.find((r) => r.method === "cash");
  const change = cash && cash.tendered !== "" ? paise(num(cash.tendered) - num(cash.amount)) : null;
  return { bill, taken, left, balanced: Math.abs(left) < 0.005, change };
}

/** "Another payment": a card for what is left (SplitPanel 883-884). */
export const anotherRow = (left: number): PartRow =>
  ({ method: "card", amount: left > 0 ? String(left) : "", tendered: "" });

/** Only cash is handed over: a method changed off cash drops its tendered figure. */
export const setMethod = (r: PartRow, method: PartMethod): PartRow =>
  ({ ...r, method, ...(method === "cash" ? {} : { tendered: "" }) });

/** settleSplit's body: the rows with an amount, cash's tendered when typed. */
export function partBody(rows: readonly PartRow[], cashId: CashId = {}) {
  const tenders: TenderInput[] = rows
    .filter((r) => num(r.amount) > 0)
    .map((r) => ({
      method: r.method,
      amount: num(r.amount),
      ...(r.method === "cash" && r.tendered !== "" ? { tendered: num(r.tendered) } : {}),
    }));
  return { tenders, ...cashId };
}

/** The Settle button's words: Settle, or what is short or over. */
export const partButton = (s: { balanced: boolean; left: number }) =>
  s.balanced ? "Settle" : `${money(Math.abs(s.left))} ${s.left > 0 ? "short" : "over"}`;
