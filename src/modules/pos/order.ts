import { cash } from "../../core/format.ts";
import { whyNotRing, whyNotStrikeSent } from "./roles.ts";
import type { CustomAddon, ExtraInput, LineAddons, Order, OrderLine } from "./types.ts";

/* ══════════════════════════════════════════════════════════════════
   THE ORDER'S RULES — the web's Till order card, ported (read 15 Oct):
     src/modules/pos/pages/Till.tsx          OrderPanel 931-1349, askStrike
                                             and fewer 195-229, abandon 1010
     src/modules/pos/pages/Terminal.tsx      the kitchen's words and Taken
                                             (263, 815-830)
     src/modules/pos/components/AskDialog.tsx SENT_STRIKE
     src/modules/pos/flows/OrderHeaderPanel.tsx the header's summary and body
     src/modules/pos/data/till.ts            every write's path and body
     src/modules/pos/lib/pricing.ts          addonBreakdown
   Which buttons are offered, which are refused and in whose words, and
   what each write sends. Pure, so order.check.ts can break them.

   ⚠ THE MONEY IS THE SERVER'S. Every figure below is a field of the
   order the API sent, formatted - never added up here. The one product
   is a line's amount (qty × the price copied onto the line): the API
   sends no line amount and the web multiplies the same two numbers.
   ══════════════════════════════════════════════════════════════════ */

/** What a manager is told before taking off food the kitchen has (D27-119). */
export const SENT_STRIKE =
  "The kitchen already has this. Only the owner, an administrator, the GM, the "
  + "hotel manager or the kitchen manager can take it off, and the reason prints "
  + "on the kitchen docket and in the day's report.";

/** A question the order asks before it writes (the web's AskDialog). */
export interface Ask {
  title: string;
  body?: string;
  /** A typed answer; `required` for a reason. */
  field?: { label: string; required: boolean };
  confirm: string;
}

/** One write: where, what, and the question first when there is one. */
export interface Act {
  method: "POST" | "PATCH";
  path: string;
  body: (reason?: string) => unknown;
  ask: Ask | null;
}

export const orderPath = (code: string, id: string) => `/api/hotels/${code}/till/orders/${id}`;
const linePath = (code: string, o: Order, l: OrderLine, act: string) => `${orderPath(code, o.id)}/lines/${l.id}/${act}`;

const isSent = (l: OrderLine) => l.kotStatus !== "pending";
export const isOpen = (o: Order) => o.status === "open";
export const live = (o: Order) => o.lines.filter((l) => !l.voided);
/** Something the kitchen does not have yet: Send is offered. */
export const unsent = (o: Order) => live(o).some((l) => !isSent(l));

/* ── The lines ─────────────────────────────────────────────────────── */

export interface LineActs {
  /** Customise and −: a dish (not a side or an add-on line) of an open order. */
  dish: boolean;
  /** ×: any line not struck, of an open order. */
  strike: boolean;
  /** Why − and × are refused for this person, else null. */
  whyNotTakeOff: string | null;
  /** Taken: a dish the kitchen made Ready (D27-221). */
  taken: boolean;
  /** Why ringing up (Customise, Taken) is refused for this person, else null. */
  whyNotRing: string | null;
}

export function lineActs(l: OrderLine, o: Order, role: string | null): LineActs {
  const open = isOpen(o) && !l.voided;
  const ring = whyNotRing(role);
  return {
    dish: open && l.parentLineId === null,
    strike: open,
    /* Before the kitchen has it, anybody at the till; after, managers only (D27-119). */
    whyNotTakeOff: ring ?? (isSent(l) ? whyNotStrikeSent(role) : null),
    taken: !l.voided && l.kotStatus === "ready",
    whyNotRing: ring,
  };
}

const TAKE_OFF = { body: SENT_STRIKE, field: { label: "Why is it coming off?", required: true }, confirm: "Take it off" };

/** ×: struck, not removed; once the kitchen has it, with a reason. */
export function strikeAct(code: string, o: Order, l: OrderLine): Act {
  return {
    method: "POST",
    path: linePath(code, o, l, "void"),
    body: (reason) => (reason ? { reason } : undefined),
    ask: isSent(l) ? { title: `Take off ${l.name}?`, ...TAKE_OFF } : null,
  };
}

/** −: one fewer; the last one is a strike (D27-189). */
export function fewerAct(code: string, o: Order, l: OrderLine): Act {
  if (l.qty <= 1) return strikeAct(code, o, l);
  return {
    method: "POST",
    path: linePath(code, o, l, "qty"),
    body: (reason) => ({ qty: l.qty - 1, ...(reason ? { reason } : {}) }),
    ask: isSent(l) ? { title: `1 fewer ${l.name}?`, ...TAKE_OFF } : null,
  };
}

/** Taken: the waiter carried it from the pass, it is served (D27-222). */
export const takenAct = (code: string, o: Order, l: OrderLine): Act =>
  ({ method: "POST", path: `${orderPath(code, o.id)}/taken`, body: () => ({ lineIds: [l.id] }), ask: null });

/** Under a dish: where the kitchen has it (the Terminal's words). Ready has its own pill. */
export function kotWords(l: OrderLine): string | null {
  if (l.voided || l.kotStatus === "pending" || l.kotStatus === "ready") return null;
  return l.kotStatus === "sent" ? "with the kitchen" : l.kotStatus === "preparing" ? "on the fire" : "served";
}

export const lineName = (l: OrderLine) => (l.extra ? `+ ${l.name}` : l.name);
/** The line's amount as the web's Till shows it (the API sends none). */
export const lineAmount = (l: OrderLine) => cash(l.qty * l.unitPrice);

/** "Veg Biryani 310 · Kebab ×2 +240" under the line (pricing.ts addonBreakdown, D27-289). */
export function addonBreakdown(kept: LineAddons): string {
  const n = (rupees: number) => rupees.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return [
    `${kept.dish} ${n(kept.base)}`,
    ...kept.addons.map((a) => `${a.name}${a.qty > 1 ? ` ×${a.qty}` : ""} ${a.price === 0 ? "Free" : `+${n(a.price * a.qty)}`}`),
  ].join(" · ");
}

/* ── The figures: the server's, in the web's order ─────────────────── */

/** Paise shown: a round off is under a rupee, and the web's whole-rupee
    money() prints -₹0.20 as "-₹0" (a fault not copied; MODULE.md). */
const inPaise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface Figure { label: string; value: string; strong?: boolean }

export function figures(o: Order): Figure[] {
  return [
    { label: "Net", value: cash(o.net) },
    ...(o.discount > 0 ? [
      /* The rate, not just the money: the statement that was actually made. */
      { label: o.discountType === "percent" ? `Discount ${o.discountValue}%` : "Discount", value: `-${cash(o.discount)}` },
      { label: "Taxable", value: cash(o.taxable) },
    ] : []),
    { label: "Tax", value: cash(o.tax) },
    ...(o.roundOff !== 0 ? [{ label: "Round off", value: `${o.roundOff > 0 ? "+" : ""}${inPaise.format(o.roundOff)}` }] : []),
    { label: "Total", value: cash(o.payable), strong: true },
  ];
}

/* ── The order's buttons ───────────────────────────────────────────── */

export interface Button { label: string; off: boolean; why: string | null }

/** First, because it happens several times per table (D27-166). */
export function sendButton(o: Order, role: string | null): Button {
  return unsent(o)
    ? { label: "Send to the kitchen", off: false, why: whyNotRing(role) }
    : { label: "Kitchen has it all", off: true, why: null };
}
export const sendAct = (code: string, o: Order): Act =>
  ({ method: "POST", path: `${orderPath(code, o.id)}/kot`, body: () => undefined, ask: null });

export function discountButton(o: Order, role: string | null): Button {
  return { label: o.discount > 0 ? "Change discount" : "Discount", off: live(o).length === 0, why: whyNotRing(role) };
}

export function roundButton(o: Order, role: string | null): Button {
  return { label: o.roundOff !== 0 ? "Undo round off" : "Round off", off: live(o).length === 0, why: whyNotRing(role) };
}
export const roundAct = (code: string, o: Order): Act =>
  ({ method: "POST", path: `${orderPath(code, o.id)}/round-off`, body: () => ({ apply: o.roundOff === 0 }), ask: null });

/** Close unpaid: once any of it went to the kitchen, the same people as a strike (D27-119). */
export function closeButton(o: Order, role: string | null): Button & { act: (code: string) => Act } {
  const sentAny = live(o).some(isSent);
  return {
    label: "Close unpaid",
    off: false,
    why: whyNotRing(role) ?? (sentAny ? whyNotStrikeSent(role) : null),
    act: (code) => ({
      method: "POST",
      path: `${orderPath(code, o.id)}/abandon`,
      body: (reason) => ({ reason }),
      ask: {
        title: "Close this bill unpaid?",
        body: "It stays on the record with this reason - a walkout and a duplicate are different things at the end of a shift."
          + (sentAny ? ` ${SENT_STRIKE}` : ""),
        field: { label: "Why is it being closed unpaid?", required: true },
        confirm: "Close unpaid",
      },
    }),
  };
}

/** Clear: frees the table of a finished bill (the floor's; refused while open). */
export const clearAct = (code: string, o: Order): Act =>
  ({ method: "POST", path: `${orderPath(code, o.id)}/clear`, body: () => undefined, ask: null });

/** What a finished bill says instead of its buttons. */
export function finished(o: Order): string {
  if (o.status === "settled") {
    return o.paymentMethod === "function"
      ? `On ${o.eventTitle ?? "the function"}'s bill${o.settledBy ? `, settled by ${o.settledBy}` : ""}.`
      : `Paid by ${o.paymentMethod}${o.settledBy ? `, taken by ${o.settledBy}` : ""}.`;
  }
  return `Closed unpaid - ${o.abandonedReason}`;
}

/* ── The discount (Till.tsx DiscountDialog) ────────────────────────── */

/** The body for Apply, or null while it cannot go (no amount, no reason).
    No cap or ceiling is worked out here: the cap is the server's and so
    is the refusal, word for word (the web greys Apply on its own sum). */
export function discountBody(type: "percent" | "fixed", value: string, reason: string) {
  const amount = Number(value.trim());
  if (value.trim() === "" || !Number.isFinite(amount) || amount <= 0 || !reason.trim()) return null;
  return { type, value: amount, reason: reason.trim() };
}

/* ── The header (OrderHeaderPanel.tsx) ─────────────────────────────── */

export const CHANNELS: { key: Order["orderType"]; label: string }[] = [
  { key: "dine_in", label: "Dine in" },
  { key: "takeaway", label: "Take away" },
  { key: "room_service", label: "Room service" },
  { key: "delivery", label: "Delivery" },
];

/** Only what has been answered; an empty header is one quiet line. */
export function headerSummary(o: Order): string {
  const said = [
    o.covers !== null && `${o.covers} cover${o.covers === 1 ? "" : "s"}`,
    o.waiter,
    o.orderType !== "dine_in" && CHANNELS.find((c) => c.key === o.orderType)?.label,
    o.customerName,
  ].filter(Boolean) as string[];
  return said.length ? said.join(" · ") : "Covers, waiter, customer";
}

export interface HeaderForm {
  covers: string; waiterId: string; channel: Order["orderType"];
  name: string; phone: string; address: string; locality: string;
}
export const headerForm = (o: Order): HeaderForm => ({
  covers: o.covers === null ? "" : String(o.covers), waiterId: "", channel: o.orderType,
  name: o.customerName ?? "", phone: o.customerPhone ?? "", address: o.customerAddress ?? "", locality: o.customerLocality ?? "",
});
/** One save for every field; the waiter only when one was picked (else they stay). */
export const headerBody = (f: HeaderForm) => ({
  covers: f.covers.trim() === "" ? null : Number(f.covers),
  ...(f.waiterId ? { waiterId: f.waiterId } : {}),
  orderType: f.channel,
  customerName: f.name, customerPhone: f.phone, customerAddress: f.address, customerLocality: f.locality,
});
export const holdAct = (code: string, o: Order): Act =>
  ({ method: "PATCH", path: orderPath(code, o.id), body: () => ({ held: o.heldAt === null }), ask: null });

/* ── Customise (CustomiseDialog.tsx, D27-289/290/291) ──────────────── */

/** As the server holds them (api extras.ts). */
export const MOST_OF_ONE = 9;
export const MOST_OF_A_CUSTOM = 99;
export const LONGEST_NAME = 60;

/** Typed add-ons as the server takes them: a 0 goes as Free, never as a price (data/till.ts). */
export const customInputs = (customs: readonly CustomAddon[]): ExtraInput[] =>
  customs.map((c) => (c.price === 0 ? { name: c.name, free: true, qty: c.qty } : { name: c.name, price: c.price, qty: c.qty }));

/** A typed add-on: a name, and a price or Free - never a default. Null when it may be added, else why not. */
export function whyNotCustom(name: string, price: string, free: boolean): string | null {
  if (name.trim() === "") return "Name it.";
  if (name.trim().length > LONGEST_NAME) return `At most ${LONGEST_NAME} letters, so the KOT can print it.`;
  if (!free && !(/^\d+(\.\d{1,2})?$/.test(price.trim()) && Number(price.trim()) > 0)) {
    return "Rupees, more than 0 - like 40 or 40.50. Or tick Free.";
  }
  return null;
}

/** Done: before Send the numbered ones fold into the dish (all, or just one split off);
    once the kitchen has it, every add-on is a line of its own for the next Send. */
export function customiseAct(
  code: string, o: Order, l: OrderLine, chosen: readonly { id: string; qty: number }[], scope: "all" | "one", customs: readonly CustomAddon[],
): Act {
  const numbered = chosen.map((a) => ({ id: a.id, qty: a.qty }));
  return isSent(l)
    ? { method: "POST", path: linePath(code, o, l, "extras"), ask: null,
      body: () => ({ extras: [...numbered.map((a) => ({ numberedId: a.id, qty: a.qty })), ...customInputs(customs)] }) }
    : { method: "POST", path: linePath(code, o, l, "numbered-addons"), ask: null,
      body: () => ({ numberedAddons: numbered, ...(scope === "one" ? { just: 1 } : {}), ...(customs.length ? { extras: customInputs(customs) } : {}) }) };
}
