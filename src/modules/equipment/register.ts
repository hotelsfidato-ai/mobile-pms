/* ══════════════════════════════════════════════════════════════════
   THE EQUIPMENT REGISTER'S SHAPES, WORDS AND RULES (lane m13-hk, 19 Nov),
   ported from the PMS's 16 Nov release; each from:
     src/modules/equipment/data/equipment.ts    the shapes, the calls
     src/modules/equipment/words.ts             STATUS_LABEL, heldText, costText, endsText, whoMay
     src/modules/equipment/pages/EquipmentRegister.tsx   the filters, the waiting tile, the line
     src/modules/equipment/pages/EquipmentItem.tsx       the locks, the notes, the history
     src/modules/equipment/flows/ItemDialogs.tsx         move, status, retire, part of a count
     api/src/modules/equipment/grants.ts                 who may (the web's copy is the matrix)
   A FIGURE NOBODY TYPED IS A DASH: a cost is the server's (totalCost is
   worked out by the server), shown with its paise when it has them (MEMORY
   9) - the web's money() rounds; a warranty nobody entered is a dash, never
   "expired". The phone adds nothing up.
   Pure: no React Native, so register.check.ts runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { DASH } from "../../core/format.ts";
import { can, ROLE_LABELS, ROLES, type Role } from "../../core/menu.ts";

/** The register's actions (grants.ts EquipmentAction), each one of the matrix's. */
export type Action = "view" | "create" | "edit" | "approve" | "export";

export { DASH };

/* ── The shapes (data/equipment.ts) ─────────────────────────────── */

export type EquipmentStatus = "in_use" | "under_repair" | "retired";
export type HeldAs = "tagged" | "counted";

export interface EquipmentItem {
  id: string; name: string; categoryId: string | null; category: string | null;
  heldAs: HeldAs; tag: string | null; quantity: number;
  roomId: string | null; locationId: string | null;
  /** "Room 104" or the place's name - one wording, the server's. */
  place: string;
  supplierId: string | null; supplier: string | null;
  purchaseDate: string | null;
  /** Per piece on a counted line. Null: nobody typed it. */
  unitCost: number | null;
  /** The server's figure (cost x count), null with the cost. */
  totalCost: number | null;
  warrantyEnds: string | null; amcEnds: string | null;
  /** "room", or the kind of place - "store" is where leaving needs approval (S12). */
  placeKind: string | null;
  status: EquipmentStatus;
  leaving: { moveId: string; approvalId: string; to: string | null; reason: string | null; by: string | null; at: string } | null;
  leavingRefused: { to: string | null; note: string | null; at: string | null; sentBack: boolean } | null;
  retireRequest: { approvalId: string; by: string | null; at: string; reason: string | null } | null;
  retireRefused: { note: string | null; at: string | null; sentBack: boolean } | null;
  retired: { by: string | null; at: string; reason: string | null; requestedBy: string | null } | null;
  splitFrom: string | null;
  createdAt: string;
}

export type HistoryKind = "added" | "split" | "status" | "retired" | "edited" | "moved" | "move_asked" | "retire_asked";
export type Decision = "pending" | "approved" | "rejected" | "clarify";
export interface HistoryEntry {
  id: string; kind: HistoryKind; quantity: number;
  from: string | null; to: string | null; place: string | null;
  fromStatus: EquipmentStatus | null; toStatus: EquipmentStatus | null;
  related: { id: string; name: string | null; place: string | null } | null;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  note: string | null; who: string | null; at: string;
  decision: { status: Decision; by: string | null; at: string | null; note: string | null } | null;
}

export interface EquipmentOptions {
  rooms: { id: string; number: string }[];
  places: { id: string; name: string; kind: string }[];
  suppliers: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  nextTag: string;
}

/* ── The addresses ──────────────────────────────────────────────── */

const at = (code: string) => `/api/hotels/${encodeURIComponent(code)}/equipment`;
export const listPath = (code: string) => at(code);
export const optionsPath = (code: string) => `${at(code)}/options`;
export const itemPath = (code: string, id: string) => `${at(code)}/items/${encodeURIComponent(id)}`;
export const movePath = (code: string, id: string) => `${itemPath(code, id)}/move`;
export const statusPath = (code: string, id: string) => `${itemPath(code, id)}/status`;
export const retirePath = (code: string, id: string) => `${itemPath(code, id)}/retire`;
/** Housekeeping's repairs, through its front door (ItemRepairs.tsx, listRepairsForItem). */
export const repairsPath = (code: string, id: string) => `/api/hotels/${encodeURIComponent(code)}/work-orders?item=${encodeURIComponent(id)}`;

/* ── Who may (words.ts whoMay; grants.ts) ───────────────────────── */

/** "Owner, Admin, General Manager, Hotel Manager or Inventory Manager" - from the
    permissions table, so the sentence cannot disagree with the rule. */
export function whoMay(action: Action): string {
  const labels = ROLES.filter((r) => r !== "automation" && can(r, action, "equipment")).map((r) => ROLE_LABELS[r]);
  return labels.length <= 1 ? labels.join("") : `${labels.slice(0, -1).join(", ")} or ${labels[labels.length - 1]}`;
}
export const may = (role: string | null, action: Action) =>
  role !== null && (ROLES as readonly string[]).includes(role) && can(role as Role, action, "equipment");

/** The register's line under the head when adding is not this person's (EquipmentRegister.tsx). */
export const ADD_REFUSED = () => `Adding and changing equipment is for the ${whoMay("create")}.`;
export const EXPORT_REFUSED = () => `Exporting the register is for the ${whoMay("export")}.`;

/* ── How the register says things (words.ts) ───────────────────── */

export const STATUS_LABEL: Record<EquipmentStatus, string> = { in_use: "In use", under_repair: "Under repair", retired: "Retired" };
export type Tone = "neutral" | "info" | "success" | "warning" | "danger";
export const STATUS_TONE: Record<EquipmentStatus, Tone> = { in_use: "success", under_repair: "warning", retired: "neutral" };

/** "EQ-0007" for a tagged item; "12 pieces" for a counted line. */
export const heldText = (i: Pick<EquipmentItem, "heldAs" | "tag" | "quantity">): string =>
  i.heldAs === "tagged" ? (i.tag ?? DASH) : `${i.quantity} ${i.quantity === 1 ? "piece" : "pieces"}`;

const whole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const paise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** The web's money() - "₹38,000" as the picture - except that a cost with paise keeps them (MEMORY 9). */
export const rupees = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? DASH : Number.isInteger(n) ? whole.format(n) : paise.format(n);

/** What it cost: a dash when nobody typed a cost - never ₹0. A count's total is the server's. */
export function costText(i: Pick<EquipmentItem, "heldAs" | "unitCost" | "totalCost" | "quantity">): string {
  if (i.unitCost === null) return DASH;
  if (i.heldAs === "tagged" || i.quantity === 1) return rupees(i.unitCost);
  return `${rupees(i.totalCost)} · ${rupees(i.unitCost)} each`;
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "14 Mar 2025" (the web's dateShort) from a date or the start of a server time. */
export const dayText = (date: string | null | undefined) =>
  !date || !/^\d{4}-\d{2}-\d{2}/.test(date) ? DASH : `${Number(date.slice(8, 10))} ${MON[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;

/** A date, or a dash; a past one is said as a fact: "ended 31 Mar 2026". */
export const endsText = (date: string | null, today: string | null | undefined): string =>
  !date ? DASH : today && date < today ? `ended ${dayText(date)}` : dayText(date);

/** "Room 205 (a store)" where leaving it needs approval. */
export const placeText = (i: Pick<EquipmentItem, "place" | "placeKind">) => `${i.place}${i.placeKind === "store" ? " (a store)" : ""}`;

/** The item's pills after its status, in the web's order. */
export function pillsOf(i: EquipmentItem): { label: string; tone: Tone }[] {
  const out = [{ label: STATUS_LABEL[i.status], tone: STATUS_TONE[i.status] }];
  if (i.leaving) out.push({ label: "Waiting to leave the store", tone: "warning" });
  if (i.leavingRefused && !i.leaving) out.push({ label: "Taking it out refused", tone: "neutral" });
  if (i.retireRequest) out.push({ label: "Retirement waiting", tone: "warning" });
  return out;
}

/** The head's line: "3 lines in the hotel · 1 under repair · 2 retired". */
export function headLine(items: EquipmentItem[] | undefined): string {
  if (!items || items.length === 0) return "Everything durable in the hotel, the restaurant and the rooms.";
  const inHotel = items.filter((i) => i.status !== "retired").length;
  const repair = items.filter((i) => i.status === "under_repair").length;
  const retired = items.length - inHotel;
  return `${inHotel} line${inHotel === 1 ? "" : "s"} in the hotel${repair ? ` · ${repair} under repair` : ""}${retired ? ` · ${retired} retired` : ""}`;
}

/* ── The filters (EquipmentRegister.tsx) ────────────────────────── */

export type StatusFilter = "all" | EquipmentStatus;
/** The places things ARE, by their own name, in room order. */
export function placesOf(items: EquipmentItem[]): { value: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const i of items) seen.set(i.roomId ?? i.locationId ?? i.place, i.place);
  return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1], undefined, { numeric: true })).map(([value, label]) => ({ value, label }));
}
export const shownOf = (items: EquipmentItem[], place: string, status: StatusFilter) =>
  items.filter((i) => (place === "all" || (i.roomId ?? i.locationId) === place) && (status === "all" || i.status === status));

/** Every waiting request beside the thing it is about (the register's warm tile). */
export interface Waiting { item: EquipmentItem; what: string; approvalId: string; by: string | null; reason: string | null }
export function waitingOf(items: EquipmentItem[]): Waiting[] {
  return items.flatMap((i) => {
    const out: Waiting[] = [];
    if (i.leaving) out.push({ item: i, what: `to leave the store for ${i.leaving.to ?? DASH}`, approvalId: i.leaving.approvalId, by: i.leaving.by, reason: i.leaving.reason });
    if (i.retireRequest) out.push({ item: i, what: "to be retired", approvalId: i.retireRequest.approvalId, by: i.retireRequest.by, reason: i.retireRequest.reason });
    return out;
  });
}
export const waitingTitle = (n: number) => `${n === 1 ? "One request waits" : `${n} requests wait`} in the approvals inbox`;
export const askedLine = (w: Pick<Waiting, "by" | "reason">) => `Asked by ${w.by ?? DASH}${w.reason ? ` - ${w.reason}` : ""}`;

/* ── One item: what may be done (EquipmentItem.tsx) ─────────────── */

export const RETIRED_LOCK = "A retired item is kept exactly as it was retired.";
export const WAITING_LOCK = "A request for it is waiting in the approvals inbox. It is decided there first.";

export interface ItemActs {
  /** Why Change details / Under repair / Retire are grey; null when open. */
  edit: string | null;
  /** Why Move (or Ask to take out) is grey. */
  move: string | null;
  moveLabel: string;
  statusLabel: string;
  /** The line under the head (lockedWhy, else who may). */
  line: string | null;
}
export function actsOf(i: EquipmentItem, role: string | null): ItemActs {
  const mayEdit = may(role, "edit");
  const fromStore = i.placeKind === "store";
  const lock = i.status === "retired" ? RETIRED_LOCK : i.leaving || i.retireRequest ? WAITING_LOCK : null;
  const whoEdit = `Changing, moving and retiring equipment is for the ${whoMay("edit")}.`;
  /* Anybody who can see it may ASK for it to leave the store (S15). */
  const mayMove = mayEdit || fromStore;
  return {
    edit: lock ?? (mayEdit ? null : whoEdit),
    move: lock ?? (mayMove ? null : whoEdit),
    moveLabel: fromStore && !mayEdit ? "Ask to take out" : "Move",
    statusLabel: i.status === "under_repair" ? "Back in use" : "Under repair",
    line: lock ?? (mayEdit ? null : `${whoEdit}${fromStore ? " Anybody who can see it may ask for it to leave the store." : ""}`),
  };
}

/** The item's notes, in the web's order and words (EquipmentItem.tsx). */
export function notesOf(i: EquipmentItem): { key: string; warm: boolean; title: string; text: string }[] {
  const out: { key: string; warm: boolean; title: string; text: string }[] = [];
  if (i.leaving) {
    out.push({ key: "leaving", warm: true, title: "Waiting to leave the store",
      text: `for ${i.leaving.to ?? DASH} - asked by ${i.leaving.by ?? DASH} on ${dayText(i.leaving.at)}${i.leaving.reason ? `: ${i.leaving.reason}` : "."}` });
  }
  if (i.leavingRefused && !i.leaving) {
    const r = i.leavingRefused;
    out.push({ key: "leavingRefused", warm: false, title: r.sentBack ? "Sent back" : "Refused",
      text: `- taking it to ${r.to ?? DASH}${r.at ? ` (${dayText(r.at)})` : ""}${r.note ? `: ${r.note}` : "."} It is still here.` });
  }
  if (i.retireRequest) {
    out.push({ key: "retireRequest", warm: true, title: "Retirement waiting",
      text: `- asked by ${i.retireRequest.by ?? DASH} on ${dayText(i.retireRequest.at)}${i.retireRequest.reason ? `: ${i.retireRequest.reason}` : "."}` });
  }
  if (i.retireRefused && !i.retireRequest && i.status !== "retired") {
    const r = i.retireRefused;
    out.push({ key: "retireRefused", warm: false, title: `Retirement ${r.sentBack ? "sent back" : "refused"}`,
      text: `${r.at ? `(${dayText(r.at)})` : ""}${r.note ? `: ${r.note}` : "."}` });
  }
  if (i.status === "retired" && i.retired) {
    const r = i.retired;
    out.push({ key: "retired", warm: false, title: `Retired on ${dayText(r.at)}`,
      text: `by ${r.by ?? DASH}${r.requestedBy ? `, asked for by ${r.requestedBy}` : ""}${r.reason ? ` - ${r.reason}` : ""}` });
  }
  return out;
}

/** The details card, in the web's order. */
export function detailsOf(i: EquipmentItem, today: string | null | undefined): { label: string; value: string }[] {
  return [
    { label: i.heldAs === "tagged" ? "Tag" : "How many", value: heldText(i) },
    { label: "Where", value: placeText(i) },
    { label: "Category", value: i.category ?? DASH },
    { label: "Supplier", value: i.supplier ?? DASH },
    { label: "Bought on", value: dayText(i.purchaseDate) },
    { label: "Cost", value: costText(i) },
    { label: "Warranty ends", value: endsText(i.warrantyEnds, today) },
    { label: "Service contract ends", value: endsText(i.amcEnds, today) },
  ];
}

/* ── The history, in words (EquipmentItem.tsx HistoryLine) ──────── */

const FIELD: Record<string, string> = {
  name: "name", category: "category", supplier: "supplier", tag: "tag", purchaseDate: "bought on",
  unitCost: "cost", warrantyEnds: "warranty end", amcEnds: "service contract end",
};
function changeValue(field: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return DASH;
  if (field === "unitCost") { const n = Number(v); return Number.isFinite(n) ? rupees(n) : String(v); }
  if (field === "purchaseDate" || field === "warrantyEnds" || field === "amcEnds") return dayText(String(v));
  return String(v);
}
export function historyLine(h: HistoryEntry, item: Pick<EquipmentItem, "heldAs" | "splitFrom">): string {
  const some = item.heldAs === "counted" ? ` ${h.quantity}` : "";
  switch (h.kind) {
    case "added": return `Added${some} in ${h.place ?? DASH}, ${STATUS_LABEL[h.toStatus ?? "in_use"].toLowerCase()}`;
    case "split": {
      const cameFrom = h.related?.id === item.splitFrom;
      const other = h.related ? `${cameFrom ? "the line in " : "their own line, now in "}${h.related.place ?? DASH}` : DASH;
      return cameFrom ? `${h.quantity} taken from ${other}` : `${h.quantity} taken off to ${other}`;
    }
    case "moved": return `Moved${some} from ${h.from ?? DASH} to ${h.to ?? DASH}`;
    case "move_asked": return `Asked to take${some} out of ${h.from ?? DASH} to ${h.to ?? DASH}`;
    case "status": return h.toStatus === "under_repair" ? "Marked under repair" : "Back in use";
    case "retired": return `Retired${some}${h.note ? `: ${h.note}` : ""}`;
    case "retire_asked": return `Asked to retire it${h.note ? `: ${h.note}` : ""}`;
    case "edited": return `Changed ${Object.entries(h.changes ?? {}).map(([f, ch]) => `${FIELD[f] ?? f} from ${changeValue(f, ch.from)} to ${changeValue(f, ch.to)}`).join("; ")}`;
    default: return String(h.kind);
  }
}
/** The note under a line: not for a retirement, whose line carries it. */
export const historyNote = (h: HistoryEntry) => (h.note && h.kind !== "retired" && h.kind !== "retire_asked" ? h.note : null);
/** What became of a request (DecisionLine); `when` writes the time. */
export function decisionLine(h: HistoryEntry, when: (at: string | null) => string): { text: string; waiting: boolean } | null {
  const d = h.decision;
  if (!d) return null;
  if (d.status === "pending") return { text: "Waiting in the approvals inbox", waiting: true };
  const word = d.status === "approved" ? "Approved" : d.status === "rejected" ? "Refused" : "Sent back";
  return { text: `${word}${d.at ? ` ${when(d.at)}` : ""} · ${d.by ?? DASH}${d.note ? ` - ${d.note}` : ""}`, waiting: false };
}
export const namesLine = () => `Who did what is shown to the ${whoMay("approve")}.`;

/* ── The dialogs (ItemDialogs.tsx, AddEquipmentDialog.tsx) ───────── */

/** How many of a counted line: blank is all of it; sent only when typed. */
export const askCount = (i: Pick<EquipmentItem, "heldAs" | "quantity">) => i.heldAs === "counted" && i.quantity > 1;
export const countOf = (i: Pick<EquipmentItem, "heldAs">, typed: string): number | undefined =>
  i.heldAs === "counted" && typed.trim() !== "" ? Number(typed) : undefined;
export const countHint = (i: Pick<EquipmentItem, "quantity">, what: string) =>
  `Blank ${what} all ${i.quantity}. Fewer makes them their own line, and both lines are kept.`;

/** Leaving: from a store to anywhere that is not a store - asked for, with a reason (S12-S15).
    Before anything is chosen, somebody who may only ask is asking whatever they choose. */
export function leaves(i: Pick<EquipmentItem, "placeKind">, toKind: string | null, chosen: boolean, mayEdit: boolean): boolean {
  if (i.placeKind !== "store") return false;
  return chosen ? toKind !== "store" : !mayEdit;
}
/** Why Move / Ask is grey: the server's own sentence for a leaving without a reason. */
export function whyNotMove(chosen: boolean, leaving: boolean, note: string): string | null {
  if (!chosen) return "Choose where it goes first.";
  if (leaving && !note.trim()) return "Why is it leaving the store? The Inventory Manager decides on it.";
  return null;
}
export const movedWords = (r: { requested?: boolean; split?: boolean; quantity?: number }) =>
  r.requested ? "Asked - it moves when the Inventory Manager approves it" : r.split ? `${r.quantity} moved, as their own line` : "Moved";

export const RETIRE_WHY = "Why is it being retired? Broken beyond repair, lost, sold, given away.";
export const whyNotRetire = (reason: string) => (reason.trim() ? null : RETIRE_WHY);
/** A tagged item retired by somebody who may not approve waits in the inbox (S16). */
export const retireWaits = (i: Pick<EquipmentItem, "heldAs">, role: string | null) => i.heldAs === "tagged" && !may(role, "approve");

/** Only what changed is sent, so the history names only that; emptied is null, never zero (EditItemDialog). */
export interface EditForm { name: string; category: string; tag: string; supplierId: string; unitCost: string }
export function changesOf(i: EquipmentItem, f: EditForm): Record<string, string | null> {
  const blank = (v: string) => (v.trim() === "" ? null : v.trim());
  const out: Record<string, string | null> = {};
  if (f.name.trim() !== i.name) out.name = f.name.trim();
  if (blank(f.category) !== i.category) out.category = blank(f.category);
  if (i.heldAs === "tagged" && f.tag.trim() !== i.tag) out.tag = f.tag.trim();
  if ((f.supplierId || null) !== i.supplierId) out.supplierId = f.supplierId || null;
  if (blank(f.unitCost) !== (i.unitCost === null ? null : String(i.unitCost))) out.unitCost = blank(f.unitCost);
  return out;
}

export interface AddForm {
  name: string; category: string; heldAs: HeldAs; tag: string; quantity: string;
  whereKind: "room" | "place"; roomId: string; locationId: string; supplierId: string; unitCost: string;
  status: "in_use" | "under_repair";
}
export function whyNotAdd(f: AddForm): string | null {
  if (!f.name.trim()) return "What is it called?";
  if (f.heldAs === "tagged" ? !f.tag.trim() : !f.quantity.trim()) return f.heldAs === "tagged" ? "A tagged item needs its tag. The form offers the next free number." : "How many? A whole number, one or more.";
  if (!(f.whereKind === "room" ? f.roomId : f.locationId)) return "Where is it? Choose a room or a place - one of the two.";
  return null;
}
/** POST /equipment's body, as AddEquipmentDialog sends it (no dates from the phone: no date picker). */
export function addBody(f: AddForm) {
  return {
    name: f.name.trim(),
    ...(f.category.trim() ? { category: f.category.trim() } : {}),
    heldAs: f.heldAs,
    ...(f.heldAs === "tagged" ? { tag: f.tag.trim() } : { quantity: Number(f.quantity) }),
    ...(f.whereKind === "room" ? { roomId: f.roomId } : { locationId: f.locationId }),
    ...(f.supplierId ? { supplierId: f.supplierId } : {}),
    ...(f.unitCost.trim() ? { unitCost: f.unitCost.trim() } : {}),
    status: f.status,
  };
}

/* ── Its repairs (housekeeping's ItemRepairs.tsx) ───────────────── */

/** REPAIR_REPORTERS (repairRoles.ts): everybody who works with the things. */
const REPAIR_REPORTERS = ["owner", "admin", "gm", "hotel_manager", "stores", "kitchen_manager", "chef", "housekeeping", "front_desk"];
export const REPORT_REFUSED = "Reporting a repair is for the people who work with the equipment - not the accountant or a viewer.";
/** Only a tagged thing is repaired, and a retired one is kept as it was retired. */
export function whyNotReport(i: Pick<EquipmentItem, "status" | "heldAs">, role: string | null): string | null {
  if (i.status === "retired") return RETIRED_LOCK;
  if (i.heldAs !== "tagged") return "A counted line is retired or replaced, not repaired.";
  if (role === null || !REPAIR_REPORTERS.includes(role)) return REPORT_REFUSED;
  return null;
}

/* ── The files (EquipmentRegister.tsx ITEM_EXPORT) ──────────────── */

export const ITEM_COLUMNS = ["Item", "Category", "Held as", "Tag", "How many", "Where", "Status", "Supplier", "Bought on",
  "Cost per piece", "Total cost", "Warranty ends", "Service contract ends"] as const;
export const itemRow = (i: EquipmentItem): string[] => [
  i.name, i.category ?? DASH, i.heldAs === "tagged" ? "Tag" : "Count", i.tag ?? DASH, String(i.quantity), i.place,
  STATUS_LABEL[i.status], i.supplier ?? DASH, dayText(i.purchaseDate), rupees(i.unitCost), rupees(i.totalCost),
  dayText(i.warrantyEnds), dayText(i.amcEnds),
];
