/* ══════════════════════════════════════════════════════════════════
   GROUPS ON A PHONE — the pure rules, ported from the web's
     src/modules/reservations/pages/Groups.tsx      the list, its pills, two balances
     src/modules/reservations/pages/GroupPanel.tsx  one group: its rooms, who
                                                     pays, the host's account
     src/modules/reservations/data/groups.ts        the shapes the API answers
     api/src/modules/front-desk/stays.ts 477-590    GET /groups (the list)
     api/src/modules/reservations/groups.ts         GET /groups/:id, master, lead, routing
   Pure: no React Native, so groups.check.ts runs under node.

   TWO BALANCES, NEVER ONE (the web's own rule). What the host owes
   (`masterBalance`, the master folio) and what the rooms owe on their own
   folios (`guestBalance`) are different debts settled by different people.
   The phone shows both as the server sent them and never adds them. NULL IS
   NOT ZERO: no host account, or a role that reads bookings but not bills
   (D27-143, roleGate WITHHELD), is a dash. Every figure to the paisa
   (MEMORY 9, MFIN-4): the web's money() prints whole rupees.
   ══════════════════════════════════════════════════════════════════ */

import { DASH, rupees } from "../finance/bill.ts";

/* ── The shapes the API answers (data/groups.ts, cut to what is read) ── */

/** GET /groups?scope=: one group in the list. */
export interface StayGroup {
  id: string;
  name: string;
  /** The block code, "" when none (stays.ts). */
  reference: string;
  company: string | null;
  rooms: number;
  nights: number;
  arrival: string;
  departure: string;
  inHouse: number;
  dueIn: number;
  departed: number;
  cancelled: number;
  routedRooms: number;
  /** Null: no host account, or not this role's to see. */
  masterBalance: number | null;
  /** Null for a role that reads bookings but not bills (WITHHELD). */
  guestBalance: number | null;
}

/** GET /groups/:id: one room of the group (app.group_rooms). */
export interface GroupRoom {
  reservationId: string;
  reference: string;
  guest: string;
  /** Null once they have left: never a room number for somebody gone. */
  room: string | null;
  roomType: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  /** The database's word: confirmed, checked_in, checked_out, cancelled, no_show, tentative. */
  status: string;
  agreedRate: number;
  routed: boolean;
  /** This stay's own folio; null when withheld. */
  balance: number | null;
  adults: number;
  children: number;
}

export interface GroupMasterLine { date: string; description: string; category: string; amount: number; room: string | null }

export interface GroupMaster {
  id: string;
  balance: number;
  lines: GroupMasterLine[];
  /** The company the bill is addressed to (D27-305 (10)); null: the person who leads. */
  company: string | null;
  /** Its tax invoice's number, while one stands. */
  invoice: string | null;
}

export interface GroupDetail {
  id: string;
  name: string;
  blockCode: string | null;
  company: string | null;
  notes: string | null;
  leadId: string | null;
  rooms: GroupRoom[];
  /** Null: no host account yet, or withheld. */
  master: GroupMaster | null;
  /** Null when withheld: the web then draws no balances at all. */
  guestBalance: number | null;
}

export type Scope = "current" | "all";

/* ── Words and figures ── */

/** The web's `owed`: null is "not yours to see" or "no host account" - a dash, never ₹0. */
export const owed = (v: number | null | undefined): string => (v == null ? DASH : rupees(v));

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The page's line under Groups (Groups.tsx PageHeader): the count of groups and of their rooms. */
export function headLine(groups: readonly StayGroup[] | undefined): string {
  if (!groups || groups.length === 0) return "A wedding, a conference, a family - one booking with several rooms.";
  return `${plural(groups.length, "group")} · ${plural(groups.reduce((n, g) => n + g.rooms, 0), "room")}`;
}

/** "2 rooms · 4 room-nights · 24 Oct 2026 to 26 Oct 2026" (GroupRow). */
export function rowLine(g: StayGroup, day: (iso: string) => string): string {
  return `${plural(g.rooms, "room")} · ${plural(g.nights, "room-night")} · ${day(g.arrival)} to ${day(g.departure)}`;
}

export type Tone = "accent" | "info" | "warning" | "neutral" | "danger" | "success";

/** Where the group is today (GroupRow): only the states actually there, one colour each (D27-48). */
export function chipsOf(g: StayGroup): Array<{ tone: Tone; label: string }> {
  const out: Array<{ tone: Tone; label: string }> = [];
  if (g.inHouse > 0) out.push({ tone: "info", label: `${g.inHouse} in house` });
  if (g.dueIn > 0) out.push({ tone: "accent", label: `${g.dueIn} due in` });
  if (g.departed > 0) out.push({ tone: "neutral", label: `${g.departed} departed` });
  if (g.cancelled > 0) out.push({ tone: "danger", label: `${g.cancelled} cancelled` });
  if (g.routedRooms > 0) out.push({ tone: "neutral", label: `${g.routedRooms} billed to the host` });
  return out;
}

/** The list's empty state, by scope (Groups.tsx EmptyState). */
export const emptyOf = (scope: Scope) => scope === "current"
  ? { title: "No groups here or coming", line: "Nothing with more than one room is in the house or due. Past groups are under All." }
  : { title: "No groups yet", line: "A booking made for more than one room becomes a group automatically. Nothing has been made yet." };

/* ── One group (GroupPanel.tsx) ── */

/** STATUS_TONE / STATUS_WORD: the lists' words and colours for a room. */
const STATE: Record<string, { tone: Tone; label: string }> = {
  confirmed: { tone: "accent", label: "Due in" },
  checked_in: { tone: "info", label: "In house" },
  due_out: { tone: "warning", label: "Due out" },
  checked_out: { tone: "neutral", label: "Checked out" },
  cancelled: { tone: "danger", label: "Cancelled" },
  no_show: { tone: "danger", label: "No show" },
  tentative: { tone: "neutral", label: "Waiting for the hotel" },
};

/** Due out is in house and leaving on the business date (the web's stateOf). */
export function stateOf(r: Pick<GroupRoom, "status" | "checkOut">, businessDate: string): { tone: Tone; label: string } {
  const key = r.status === "checked_in" && r.checkOut === businessDate ? "due_out" : r.status;
  return STATE[key] ?? { tone: "neutral", label: r.status.replace("_", " ") };
}

/** Who the master bill is addressed to - the server's own order: its company,
    else the guest who leads the group, else the group. */
export const billTo = (g: GroupDetail) =>
  g.master?.company ?? g.rooms.find((r) => r.reservationId === g.leadId)?.guest ?? g.name;

/** The header's line: block code, company, the count of rooms. */
export const groupLine = (g: GroupDetail) =>
  [g.blockCode, g.company, plural(g.rooms.length, "room")].filter(Boolean).join(" · ");

/** The host tile's note: "3 of 9 rooms routed here". */
export function routedNote(g: GroupDetail): string {
  const n = g.rooms.filter((r) => r.routed).length;
  return `${n} of ${g.rooms.length} ${n === 1 ? "room routed here" : "rooms routed here"}`;
}

/** Why the master bill cannot be invoiced yet; "" when it can (GroupPanel `notYet`,
    invoiced as a departed stay is). The thresholds are the web's. */
export function notYet(g: GroupDetail): string {
  const m = g.master;
  if (!m) return "";
  if (m.lines.length === 0) return "Nothing has been charged to the host yet.";
  if (g.rooms.some((r) => ["confirmed", "checked_in", "tentative"].includes(r.status))) {
    return "Every room checks out first: a night still to come would land on this bill.";
  }
  if (m.balance > 0.5) return "The bill still carries a balance. Settle it, or send it to the city ledger, before invoicing.";
  if (m.balance < -0.5) return "The bill is overpaid. Refund the difference before invoicing.";
  return "";
}

/** A room that no longer stands cannot lead (D22-52): the server's own sentence (groups.ts /lead). */
export function whyNotLead(r: GroupRoom, leadId: string | null): string | null {
  if (r.reservationId === leadId) return `${r.guest} leads the group.`;
  if (["cancelled", "void", "no_show"].includes(r.status)) return `${r.guest}'s booking no longer stands, so it cannot lead the group.`;
  return null;
}

/** Putting a room on the host with no host account: the server's own refusal (groups.ts /routing). */
export const whyNotRoute = (g: GroupDetail, r: GroupRoom): string | null =>
  !r.routed && !g.master ? "This group has no open master folio yet. Open one, and the room charges will go to it." : null;

/** The toast after a routing change (GroupPanel `toggle`). */
export const routedSaid = (r: GroupRoom) =>
  r.routed ? `${r.guest} pays their own room` : `${r.guest}'s room goes to the host`;

/** Settle is the bill's main act while the host owes; with nothing owed it is off (FolioPanel SettleDialog). */
export const settleOff = (m: GroupMaster) => m.balance <= 0;
