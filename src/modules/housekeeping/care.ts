/* ══════════════════════════════════════════════════════════════════
   THE MINIBAR AND THE HOUSEKEEPING CHECKLISTS — their shapes, words and
   rules (lane "m13-hk", 19 Nov; the PMS's 16 Nov release, D27-383 item 10,
   D27-396). Ported, not invented; each from:
     src/modules/housekeeping/data/housekeeping.ts   the shapes, the calls
     src/modules/housekeeping/pages/Minibar.tsx      Waiting, Recorded, The list, ItemDialog
     src/modules/housekeeping/flows/MinibarFlow.tsx  what was taken from a room
     src/modules/housekeeping/pages/Checklists.tsx   the switch, the lists, each room's record
     api/src/modules/housekeeping/minibar.ts         the server's refusals and who may
     api/src/modules/housekeeping/checklists.ts      the same, for the checklists
   MONEY IS THE SERVER'S. A price is the hotel's typed figure, `charged`
   is what reached the bill with its tax: both shown as sent, with their
   paise (MEMORY 9), a dash when not sent. The web adds price x count up in
   the browser ("₹X before tax"); the phone shows each line's own price and
   adds nothing (MODULE.md, the differences).
   Pure: no React Native, so care.check.ts runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { DASH } from "../../core/format.ts";

/* ── The shapes (data/housekeeping.ts 425-490) ─────────────────── */

export interface MinibarItem {
  id: string; stockItemId: string; name: string; unit: string;
  /** Null: nobody has typed a price, so it cannot be charged (a dash, never ₹0). */
  price: number | null;
  storeId: string; store: string;
  /** A drink in the excise registers: billed as VAT, never GST. */
  alcohol: boolean; active: boolean; onHand: number | null;
}
export interface MinibarLine { item: string; name: string; quantity: number; price: number | null; alcohol: boolean }
export interface MinibarRecord {
  id: string; room: string; recordedAt: string; recordedBy: string | null;
  status: "charged" | "waiting" | "not_charged";
  waitingWhy: "disputed" | "after_checkout" | null;
  lines: MinibarLine[];
  reference: string | null; guest: string | null; stayStatus: string | null;
  decidedBy: string | null; decidedAt: string | null; decidedNote: string | null;
  /** What reached the bill with its tax; null when nothing did. */
  charged: number | null;
  /** A line of it was taken off the bill (the bill's own Reverse). */
  reversed: boolean;
}
export interface Minibar {
  items: MinibarItem[]; records: MinibarRecord[];
  stock: { id: string; name: string; unit: string; alcohol: boolean }[];
  stores: { id: string; name: string; bar: boolean }[];
  mayKeep: boolean; mayRecord: boolean; mayDecide: boolean;
}

export type ChecklistJob = "checkout" | "stayover" | "deep" | "inspection";
export const JOBS: readonly ChecklistJob[] = ["checkout", "stayover", "deep", "inspection"];
export const JOB_LABELS: Record<ChecklistJob, string> = {
  checkout: "Checkout clean", stayover: "Stay-over", deep: "Deep clean", inspection: "Inspection",
};
export interface Checklist {
  id: string; job: ChecklistJob; roomTypeId: string | null;
  /** Null: every room type without a list of its own. */
  roomType: string | null; items: string[];
}
export interface ChecklistSetup {
  required: boolean; checklists: Checklist[]; roomTypes: { id: string; name: string }[]; mayKeep: boolean;
}
export interface ChecklistRun {
  id: string; room: string; job: ChecklistJob; doneAt: string; doneBy: string | null;
  passed: boolean; failed: { item: string; note: string | null }[];
}

/* ── The addresses (each with the hotel in it, AGENTS rule 5) ───── */

const at = (code: string) => `/api/hotels/${encodeURIComponent(code)}`;
export const minibarPath = (code: string) => `${at(code)}/minibar`;
export const minibarItemsPath = (code: string) => `${at(code)}/minibar/items`;
export const minibarItemPath = (code: string, id: string) => `${at(code)}/minibar/items/${encodeURIComponent(id)}`;
export const minibarRecordsPath = (code: string) => `${at(code)}/minibar/records`;
export const minibarDecidePath = (code: string, id: string) => `${at(code)}/minibar/records/${encodeURIComponent(id)}/decide`;
export const checklistsPath = (code: string) => `${at(code)}/checklists`;
export const requiredPath = (code: string) => `${at(code)}/checklists/required`;
export const checklistPath = (code: string, id: string) => `${at(code)}/checklists/${encodeURIComponent(id)}`;
/** The last hundred tickings, of one room or every room (listChecklistRuns). */
export const runsPath = (code: string, room: string) => {
  const r = room.trim();
  return `${at(code)}/housekeeping/checklist-runs${r ? `?room=${encodeURIComponent(r)}` : ""}`;
};

/* ── Figures ─────────────────────────────────────────────────────── */

const inrPrecise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** The web's moneyPrecise ("₹1,20,000.00"): the minibar's figures keep their
    paise. Null, or nothing a number can be, is a dash - never ₹0. */
export const money = (n: number | null | undefined) =>
  n == null || typeof n !== "number" || !Number.isFinite(n) ? DASH : inrPrecise.format(n);

/* ── The minibar's words (Minibar.tsx) ─────────────────────────── */

/** "Water x 2, Chips" (Minibar.tsx `what`). */
export const whatWasTaken = (r: Pick<MinibarRecord, "lines">) =>
  r.lines.map((l) => `${l.name}${l.quantity > 1 ? ` x ${l.quantity}` : ""}`).join(", ");

/** One line of a take, with the price the server recorded for one: the
    phone shows it and does not multiply (the web's beforeTax adds them up). */
export const lineText = (l: MinibarLine) =>
  `${l.name}${l.quantity > 1 ? ` x ${l.quantity}` : ""} · ${money(l.price)} each before tax`;

/** "Tanvi Bhide (FD-1042)"; a name the server does not send is a dash. */
export const guestText = (r: Pick<MinibarRecord, "guest" | "reference">) =>
  `${r.guest ?? DASH}${r.reference ? ` (${r.reference})` : ""}`;

export const waitingPill = (r: Pick<MinibarRecord, "waitingWhy">) =>
  r.waitingWhy === "after_checkout" ? "Found after check-out" : "Not sure";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

/** A recorded take's pill (Minibar.tsx Recorded): the bill's Reverse wins. */
export function recordedPill(r: Pick<MinibarRecord, "reversed" | "status">): { label: string; tone: Tone } {
  if (r.reversed) return { label: "Taken off the bill", tone: "neutral" };
  if (r.status === "charged") return { label: "On the bill", tone: "success" };
  return { label: "Not charged", tone: "neutral" };
}

/** "Test GM, 19 Nov 2026, 9:05 AM · charged by Test Desk: note" - `when` writes the times. */
export function recordedLine(r: MinibarRecord, when: (at: string | null) => string): string {
  let s = `${r.recordedBy ?? DASH}, ${when(r.recordedAt)}`;
  if (r.decidedAt) s += ` · ${r.status === "charged" ? "charged" : "not charged"} by ${r.decidedBy ?? DASH}`;
  if (r.decidedNote) s += `: ${r.decidedNote}`;
  return s;
}

/** What waits for the desk, and the rest of the fortnight - the server sorts them. */
export const waitingOf = (m: Pick<Minibar, "records">) => m.records.filter((r) => r.status === "waiting");
export const recordedOf = (m: Pick<Minibar, "records">) => m.records.filter((r) => r.status !== "waiting");

/** The list's price: a dash until typed. */
export const priceText = (i: Pick<MinibarItem, "price">) => money(i.price);
/** In the take dialog, the web's words for an item nobody priced. */
export const NO_PRICE = "No price yet - cannot be charged";
/** "Main store: 24 bottle"; the server's stock figure, a dash when not sent. */
export const stockText = (i: Pick<MinibarItem, "store" | "onHand" | "unit">) =>
  `${i.store}: ${i.onHand == null ? DASH : i.onHand} ${i.unit}`;

/** Minibar.tsx TheList's line under the title, by who may keep it. */
export const listNote = (mayKeep: boolean) => mayKeep
  ? "Each item is a Store item. Its price is yours to type: an item with none cannot be charged."
  : "The owner, an administrator or the general manager change the list and its prices.";
export function listEmpty(m: Pick<Minibar, "mayKeep" | "stock">): string {
  if (!m.mayKeep) return "The owner, an administrator or the general manager adds it.";
  return m.stock.length ? "Add the Store items a room's minibar holds." : "Add the items to the Store first, then here.";
}
/** Who keeps the list, said where the web hides Add and Change (AGENTS rule 1). */
export const KEEP_REFUSED = "The owner, an administrator or the general manager change the list and its prices.";

/* ── Who may (api/src/modules/housekeeping/minibar.ts, roleGate.ts) ── */

/** RECORD_REFUSED, the route's own sentence (MINIBAR_RECORDERS). */
export const RECORD_REFUSED =
  "Recording what was taken from a minibar is for the owner, an administrator, the general "
  + "manager, the hotel manager, reception or housekeeping. Ask one of them.";
/** Minibar.tsx WaitingCard, for someone the server says may not decide. */
export const DESK_DECIDES = "The desk decides this.";

/** Why "Record for a room" is grey, or null (the web hides it in both cases). */
export function whyNotOpenTake(m: Pick<Minibar, "mayRecord" | "items">): string | null {
  if (!m.mayRecord) return RECORD_REFUSED;
  if (!m.items.some((i) => i.active)) return "This hotel has no minibar list yet.";
  return null;
}

/* ── What was taken from a room (MinibarFlow.tsx) ──────────────── */

export type Counts = Record<string, number>;

/** One more or one less, 0 to 99 (the server's 1 to 99 a line). */
export const step = (count: Counts, id: string, by: number): Counts =>
  ({ ...count, [id]: Math.max(0, Math.min(99, (count[id] ?? 0) + by)) });

/** The items a take may count: on the list, with a price (no default prices). */
export const shownItems = (items: MinibarItem[]) => items.filter((i) => i.active);
export const countable = (i: Pick<MinibarItem, "price">) => i.price !== null;

/** POST /minibar/records's lines: each counted item once, with how many. */
export function takeLines(items: MinibarItem[], count: Counts): { itemId: string; quantity: number }[] {
  return shownItems(items)
    .filter((i) => countable(i) && (count[i.id] ?? 0) > 0)
    .map((i) => ({ itemId: i.id, quantity: count[i.id]! }));
}

/** MinibarFlow's `why`: said when Record is tapped grey. */
export function whyNotTake(room: string, lines: unknown[]): string | null {
  if (!room.trim()) return "Which room?";
  if (lines.length === 0) return "Count what was taken first.";
  return null;
}

export const takeBody = (room: string, lines: { itemId: string; quantity: number }[], disputed: boolean) =>
  ({ room: room.trim(), lines, disputed });

/** The take's main button (MinibarFlow). */
export const takeLabel = (disputed: boolean) => (disputed ? "Send to the desk" : "Record what was taken");

/** "3 counted" - the phone counts pieces, never rupees (the web's running total is a browser sum). */
export function countedText(lines: { quantity: number }[]): string {
  const n = lines.reduce((s, l) => s + l.quantity, 0);
  return n === 0 ? "Nothing counted yet" : `${n} counted`;
}

/** The web's toast once the server has answered (MinibarFlow save). */
export function takenWords(room: string, answer: { status?: string; waitingWhy?: string | null } | undefined): string {
  const n = room.trim().toUpperCase();
  if (answer?.status === "charged") return `On room ${n}'s bill. The refill is out of the store.`;
  if (answer?.waitingWhy === "after_checkout") return `Room ${n}'s guest has left: the desk decides.`;
  return "Sent to the desk to confirm.";
}

/* ── The desk decides a waiting one (Minibar.tsx WaitingCard) ──── */

/** The server's own refusal of Not charged with no reason (minibar.ts decide). */
export const SAY_WHY_NOT = "Say why it is not charged. The reason stays on the record.";
export const whyNotDecline = (note: string) => (note.trim() ? null : SAY_WHY_NOT);
export const decideBody = (charge: boolean, note: string) => (charge ? { charge } : { charge, note: note.trim() });
export const decidedWords = (charge: boolean, room: string) =>
  (charge ? `On room ${room}'s bill.` : "Not charged. The reason stays on the record.");

/* ── An item on the list (Minibar.tsx ItemDialog) ──────────────── */

/** A drink starts on the Bar store, anything else on the Main store. */
export function startStore(stores: Minibar["stores"], alcohol: boolean): string {
  return (stores.find((s) => (alcohol ? s.bar : s.name === "Main store")) ?? stores[0])?.id ?? "";
}

/** Why Save is grey, or null - the server's own sentences (minibar.ts POST /items). */
export function whyNotSaveItem(isNew: boolean, stockId: string, storeId: string): string | null {
  if (isNew && !stockId) return "Which Store item is it?";
  if (!storeId) return "Which store is it refilled from?";
  return null;
}

/** The price as typed, sent as typed: empty is "no price yet", which the server keeps as none. */
export const newItemBody = (stockItemId: string, price: string, storeId: string) => ({ stockItemId, price: price.trim(), storeId });
export const changeItemBody = (price: string, storeId: string, active: boolean) => ({ price: price.trim(), storeId, active });
/** The price field's start: a dash for none is typed as nothing (ItemDialog). */
export const priceInput = (i: Pick<MinibarItem, "price"> | null) => (i == null || i.price === null ? "" : String(i.price));

export const itemSavedWords = (name: string | null, isNew: boolean) =>
  (isNew ? `${name ?? "It"} is on the minibar list.` : `${name ?? "It"} is changed.`);

/* ── Checklists (Checklists.tsx) ────────────────────────────────── */

/** One item per line, trimmed, none blank (ChecklistDialog). */
export const itemsOf = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);
export const itemsHint = (n: number) => `${n} item${n === 1 ? "" : "s"}`;

/** The server's own refusals of a list (checklists.ts itemsOf), said before sending. */
export function whyNotSaveList(items: string[]): string | null {
  if (items.length === 0) return "A checklist has at least one item.";
  if (items.length > 60) return "A checklist has at most 60 items.";
  if (items.some((i) => i.length > 120)) return "Keep each item under 120 letters.";
  if (new Set(items.map((i) => i.toLowerCase())).size !== items.length) return "Each item once.";
  return null;
}

/** POST /checklists for a new one; PUT /checklists/:id with the items alone for a change. */
export const newListBody = (job: ChecklistJob, roomTypeId: string, items: string[]) =>
  ({ job, roomTypeId: roomTypeId || null, items });

export const roomTypeText = (c: Pick<Checklist, "roomType">) => c.roomType ?? "Every room type";
export const listTitle = (c: Pick<Checklist, "job" | "roomType">) => `${JOB_LABELS[c.job]} · ${roomTypeText(c)}`;

export const KEEPS_LISTS = "The owner, an administrator or the general manager adds them.";
export const SWITCH_LABEL = "A room is marked clean or inspected only by ticking its checklist";
export const switchNote = (mayKeep: boolean) => mayKeep
  ? "Off: the board's Clean and Inspected mark a room with one tap, as before. A room type with no list for the job is always marked with one tap."
  : "The owner, an administrator or the general manager switch this.";
export const switchedWords = (required: boolean) =>
  (required ? "Rooms are now marked by their checklist." : "Rooms are marked with one tap again.");
export const listsEmpty = (mayKeep: boolean) => (mayKeep
  ? "Add one for a job - checkout clean, stay-over, deep clean or inspection."
  : KEEPS_LISTS);
/** The web's toast after Remove; the phone asks first with the same words (a destructive act). */
export const REMOVED = "The checklist is removed. What was ticked with it stays on each room's record.";

/** A ticking's pill (History). */
export function runPill(r: Pick<ChecklistRun, "passed" | "job">): { label: string; tone: Tone } {
  if (!r.passed) return { label: "Failed", tone: "danger" };
  return { label: r.job === "inspection" ? "Passed" : "Done", tone: "success" };
}
export const failedText = (f: { item: string; note: string | null }) => (f.note ? `${f.item} - ${f.note}` : f.item);
export const runsEmptyTitle = (room: string) =>
  (room.trim() ? `Nothing ticked in room ${room.trim().toUpperCase()} yet` : "Nothing ticked yet");

/* ── The files (Minibar.tsx RECORD_EXPORT, Checklists.tsx RUN_EXPORT) ── */

/** A take's status in the export's own words. */
export function exportStatus(r: Pick<MinibarRecord, "reversed" | "status" | "waitingWhy">): string {
  if (r.reversed) return "Taken off the bill";
  if (r.status === "charged") return "On the bill";
  if (r.status === "waiting") return r.waitingWhy === "after_checkout" ? "Waiting: found after check-out" : "Waiting: not sure";
  return "Not charged";
}
export const RECORD_COLUMNS = ["Room", "Booking", "Guest", "Taken", "Status", "Charged with tax", "Recorded by", "Recorded", "Decided by", "Decided", "Note"] as const;
/** One take as the export's row, each cell as the screen writes it; `when` writes the times. */
export const recordRow = (r: MinibarRecord, when: (at: string | null) => string): string[] => [
  r.room, r.reference ?? DASH, r.guest ?? DASH, r.lines.map((l) => `${l.name} x ${l.quantity}`).join(", "), exportStatus(r),
  money(r.charged), r.recordedBy ?? DASH, when(r.recordedAt), r.decidedBy ?? DASH, when(r.decidedAt), r.decidedNote ?? DASH,
];
export const RUN_COLUMNS = ["Room", "Job", "Result", "Ticked by", "When", "What failed"] as const;
export const runRow = (r: ChecklistRun, when: (at: string | null) => string): string[] => [
  r.room, JOB_LABELS[r.job], runPill(r).label, r.doneBy ?? DASH, when(r.doneAt), r.failed.map(failedText).join("; ") || DASH,
];
