/* ══════════════════════════════════════════════════════════════════
   WORK ORDERS' RULES — the web's pages/WorkOrders.tsx and
   flows/RepairCosts.tsx, their shapes from data/housekeeping.ts, all in
   the PMS one folder up. Pure: no React Native, so workOrders.check.ts
   runs under node.

   WHO MAY: the list's own answer — `mayUpdate`, `mayRecordCosts`, and
   `costs` sent only to those who may see money (api/src/modules/
   housekeeping/housekeeping.ts, GET /work-orders). The sentences are the
   API's (repairRoles.ts UPDATE_REFUSED, COST_REFUSED), read back from it
   with refused requests. Raise one is roles.ts's whyNotRepair.
   ══════════════════════════════════════════════════════════════════ */

import type { OutboxEntry } from "../../core/offline.ts";
import { DASH, dateLong, dateShort } from "../../core/format.ts";

/* ── The shapes (data/housekeeping.ts) ─────────────────────────── */

export interface RepairCost {
  id: string;
  amount: number;
  note: string | null;
  recordedBy: string | null;
  recordedAt: string;
  proof: { id: string; filename: string; contentType: string };
  /** It stays on the record, out of the total. */
  cancelled: { by: string | null; at: string; reason: string } | null;
}

export interface WorkOrder {
  id: string;
  /** Null for anything that is not a room: a lift, the lobby door. */
  room: string | null;
  title: string;
  detail: string | null;
  category: string;
  priority: string;
  status: string;
  raisedBy: string | null;
  raisedAt: string;
  assignedTo: string | null;
  daysOpen: number;
  blocksRoom: boolean;
  closedBy: string | null;
  closedAt: string | null;
  resolution: string | null;
  equipment: { id: string; name: string; tag: string } | null;
  /** ABSENT for anybody who may not see money, never an empty list. */
  costs?: RepairCost[];
  /** Null when no cost stands: a dash, never ₹0. */
  costTotal?: number | null;
}

export interface WorkOrderList {
  orders: WorkOrder[];
  open: number;
  closed: number;
  closedShown: number;
  mayRecordCosts: boolean;
  maySeeCosts: boolean;
  mayUpdate: boolean;
}

export type View = "open" | "closed";

export const listPath = (code: string, view: View) => `/api/hotels/${code}/work-orders${view === "closed" ? "?view=closed" : ""}`;
export const orderPath = (code: string, id: string) => `/api/hotels/${code}/work-orders/${id}`;
export const cancelCostPath = (code: string, id: string) => `/api/hotels/${code}/repair-costs/${id}/cancel`;

/* ── The API's sentences (api/src/modules/housekeeping/repairRoles.ts) ── */

const UPDATERS = "the owner, an administrator, the general manager, the hotel manager, the Inventory Manager or housekeeping";
const RECORDERS = "the owner, an administrator, the general manager, the hotel manager or the Inventory Manager";
/** PATCH /work-orders/:id refused (UPDATE_REFUSED). */
export const UPDATE_REFUSED = `Updating a repair is for ${UPDATERS}. Ask one of them.`;
/** POST /repair-costs and its cancel refused (COST_REFUSED). */
export const COST_REFUSED = `Recording a repair cost is for ${RECORDERS}. Ask one of them.`;
/** The web's line over the list when Start and Close are not this person's (WorkOrders.tsx 110). */
export const UPDATE_WHO = `Starting and closing a repair is for ${UPDATERS}.`;
/** A control the phone cannot do yet (the helpers' rule): a proof is a photo or a file. */
export const ON_WEBSITE = "On the website for now";
/** The API's own refusal of a close with nothing said (PATCH /work-orders/:id). */
export const SAY_WHAT = "Say what was done. It is the line somebody reads next time.";

/* ── The card ──────────────────────────────────────────────────── */

export const PRIORITY: Record<string, { label: string; tone: Tone }> = {
  urgent: { label: "Urgent", tone: "danger" },
  high: { label: "High", tone: "warning" },
  normal: { label: "Normal", tone: "neutral" },
  low: { label: "Low", tone: "neutral" },
};
export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export const isClosed = (status: string) => status === "done" || status === "cancelled";

/** The card's pills, in the web's order (WorkOrders.tsx 206-218). */
export function pills(o: WorkOrder, status: string): Array<{ label: string; tone: Tone; door?: true }> {
  const out: Array<{ label: string; tone: Tone; door?: true }> = [];
  if (!isClosed(status)) out.push(PRIORITY[o.priority] ?? PRIORITY["normal"]!);
  if (status === "in_progress") out.push({ label: "Being fixed", tone: "info" });
  if (status === "done") out.push({ label: "Fixed", tone: "success" });
  if (status === "cancelled") out.push({ label: "Not needed", tone: "neutral" });
  if (o.blocksRoom) out.push({ label: "Room is out", tone: "warning", door: true });
  return out;
}

/** The calendar day of a date or a timestamp. The core's formats read
    "2026-10-10" only; a timestamp ("2026-10-10T08:21:34Z") would print NaN
    there (MHK-W1). The shapes do not say which the API sends, so both. */
const ymd = (date: string) => date.slice(0, 10);

/** The web's dateShort, "17 Sep 2026" (src/lib/format.ts); the core's leaves out the year. */
export const day = (date: string | null) => (date ? `${dateShort(ymd(date))} ${date.slice(0, 4)}` : DASH);
/** The web's dateLong, "Saturday, 10 October 2026", for a cost and its cancelling. */
export const longDay = (date: string | null) => (date ? dateLong(ymd(date)) : DASH);

/** The grey line under the title, in three parts: the middle one turns
    amber at a week (WorkOrders.tsx 233-250). A dash, not a blank, for a
    repair that is not in a room. */
export function meta(o: WorkOrder): { head: string; age: string | null; late: boolean; tail: string } {
  const head = `${o.room ? `Room ${o.room}` : DASH} · ${o.category} · raised ${day(o.raisedAt)}${o.raisedBy ? ` by ${o.raisedBy}` : ""}`;
  if (isClosed(o.status)) {
    return { head: `${head} · closed ${day(o.closedAt)}${o.closedBy ? ` by ${o.closedBy}` : ""}`, age: null, late: false, tail: "" };
  }
  const age = o.daysOpen === 0 ? "today" : `${o.daysOpen} ${o.daysOpen === 1 ? "day" : "days"} open`;
  return { head: `${head} · `, age, late: o.daysOpen >= 7, tail: o.assignedTo ? ` · ${o.assignedTo}` : " · nobody has picked it up" };
}

/* ── What this phone holds (the board's pattern, board.ts) ─────── */

/** The status the order's last held change asks for, or null when none is held.
    Matched on the whole path, the hotel's code in it (AGENTS rule 5). */
export function heldStatus(held: OutboxEntry[], code: string, id: string): string | null {
  const e = held.filter((x) => x.status === "waiting" && x.path === orderPath(code, id)).pop();
  if (!e) return null;
  try {
    return (JSON.parse(e.body ?? "{}") as { status?: string }).status ?? null;
  } catch {
    return null;
  }
}

/** What the card says while a change waits on this phone. */
export function queued(status: string | null): string | null {
  if (status == null) return null;
  return ({ in_progress: "Queued: start", open: "Queued: put back", done: "Queued: close as fixed", cancelled: "Queued: close as not needed" } as Record<string, string>)[status] ?? "Queued";
}

/** Start or Put back: the word, and what a tap sends. */
export const startLabel = (status: string) => (status === "open" ? "Start" : "Put back");
export const startBody = (status: string) => ({ status: status === "open" ? "in_progress" : "open" });

/** Said on a button while its change is on its way. */
export const SENDING = "Sending…";

/** Why Start / Put back / Close is grey: the API's refusal of the person
    first, then a repair closed on this phone and not yet sent, then a tap
    still on its way (a second tap would be a second change with its own
    key, MHK-W2). null = allowed. A closed repair has no buttons at all (the web's). */
export function whyNotUpdate(mayUpdate: boolean, status: string, sending = false): string | null {
  if (!mayUpdate) return UPDATE_REFUSED;
  if (isClosed(status)) return "Closed on this phone, waiting to sync.";
  if (sending) return SENDING;
  return null;
}

/** What Fixed / Not needed send; null while nothing is said (the API refuses it). */
export const closeBody = (status: "done" | "cancelled", resolution: string) =>
  resolution.trim() ? { status, resolution: resolution.trim() } : null;

/** What the web says once it is closed (CloseDialog's toast). */
export const closedWords = (o: WorkOrder, status: "done" | "cancelled") => ({
  title: status === "done" ? "Closed" : "Cancelled",
  body: o.equipment ? `${o.title}. ${o.equipment.name} is back in use once no other repair on it is open.` : o.title,
});

/* ── The list's words (WorkOrders.tsx 126-164) ─────────────────── */

export function empty(view: View, list: WorkOrderList | undefined): { title: string; body: string } {
  if (view === "closed") return { title: "Nothing closed yet", body: "A repair shows here once it is closed, with what was done." };
  return {
    title: "Nothing outstanding",
    body: list?.closed
      ? `${list.closed} closed and kept - "how many times have we fixed this room" needs them.`
      : "Raise one when something needs fixing.",
  };
}

export function foot(view: View, list: WorkOrderList | undefined): string | null {
  if (!list) return null;
  if (view === "open" && list.closed) {
    return `${list.closed} closed ${list.closed === 1 ? "order is" : "orders are"} kept on the record. `
      + "A table holding only open work cannot answer how many times a room has been fixed this year.";
  }
  if (view === "closed" && list.closed > list.closedShown) return `The ${list.closedShown} most recently closed, of ${list.closed}.`;
  return null;
}

/* ── Costs (flows/RepairCosts.tsx) ─────────────────────────────── */

const inrPrecise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** The web's moneyPrecise, "₹1,800.00": a cost's own figure shows its paise. */
export const paise = (n: number) => inrPrecise.format(n);

/** Why "Record the cost" is grey: the API's refusal first, else the proof
    the phone cannot attach yet. Never null on the phone. */
export const whyNotRecord = (mayRecord: boolean) => (mayRecord ? ON_WEBSITE : COST_REFUSED);

/** Why "Cancel this cost" is grey; null = allowed. */
export const whyNotCancel = (mayRecord: boolean) => (mayRecord ? null : COST_REFUSED);
