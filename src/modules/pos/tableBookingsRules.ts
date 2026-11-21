/* ══════════════════════════════════════════════════════════════════
   TABLE BOOKINGS' RULES (the owner's D27-221, D27-224; outside diners,
   259) — ported from the web's src/modules/pos/pages/TableBookings.tsx
   (16 Nov) and src/modules/pos/data/tableBookings.ts; the API is
   api/src/modules/pos/tableBookings.ts (GET /table-bookings?date=, POST
   /table-bookings, /:id/confirm, /decline, /arrive, /seat, /no-show,
   /cancel). Every act on the night is refused by the server from a state
   it may not be done in, so a repeat is safe; a new booking is not
   (a second POST books a second table).
   Pure: tableBookings.check.ts runs it under node.
   ══════════════════════════════════════════════════════════════════ */

export type BookingStatus = "requested" | "confirmed" | "declined" | "cancelled" | "arrived" | "seated" | "no_show";

/** data/tableBookings.ts TableBooking. */
export interface TableBooking {
  id: string;
  at: string;
  /** The hotel's own day and time, "YYYY-MM-DD" and "HH:MM". */
  date: string;
  time: string;
  party: number;
  note: string | null;
  status: BookingStatus;
  answer: string | null;
  table: { id: string; label: string } | null;
  outlet: string;
  guest: string;
  reference: string | null;
  room: string | null;
  answeredBy: string | null;
  outside?: boolean;
  phone?: string | null;
  section?: { id: string; name: string } | null;
  arrivedAt?: string | null;
  order?: { id: string; orderNo: string } | null;
}

export interface TableBookingList {
  today: string;
  bookings: TableBooking[];
  tables: { id: string; label: string; section?: string | null }[];
  sections?: { id: string; name: string }[];
}

export const STATUS: Record<BookingStatus, { words: string; tone: "warning" | "success" | "neutral" | "danger" }> = {
  requested: { words: "Waiting", tone: "warning" },
  confirmed: { words: "Confirmed", tone: "success" },
  declined: { words: "Declined", tone: "danger" },
  cancelled: { words: "Cancelled", tone: "neutral" },
  arrived: { words: "Arrived", tone: "warning" },
  seated: { words: "Seated", tone: "success" },
  no_show: { words: "No-show", tone: "danger" },
};
export const statusOf = (s: string) => STATUS[s as BookingStatus] ?? { words: s, tone: "neutral" as const };

const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Today", else "Fri, 6 Nov" (en-IN's weekday short, day numeric, month short), read by UTC so the phone's own zone cannot move it. */
export function dayWords(date: string, today: string): string {
  if (date === today) return "Today";
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return `${WEEK[d.getUTCDay()]}, ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`;
}

/** Waiting first (whatever night), then the shown day, then what comes after. */
export function lists(all: readonly TableBooking[], shown: string) {
  const waiting = all.filter((b) => b.status === "requested");
  const answered = all.filter((b) => b.status !== "requested");
  return { waiting, todays: answered.filter((b) => b.date === shown), later: answered.filter((b) => b.date !== shown) };
}

export const people = (n: number) => `${n} ${n === 1 ? "person" : "people"}`;

/** What each card may offer (BookingCard): the requested pair, or the night's acts. */
export function offers(b: Pick<TableBooking, "status">) {
  const onNight = b.status === "confirmed" || b.status === "arrived";
  return {
    answer: b.status === "requested",
    seat: onNight,
    arrived: b.status === "confirmed",
    noShow: b.status === "confirmed",
    cancel: onNight,
  };
}

/** The card's lines under the guest, as BookingCard writes them. */
export function detailLine(b: TableBooking): string | null {
  if (b.status === "confirmed" || b.status === "arrived") {
    return `${b.table ? `Table ${b.table.label}` : "No table named"}${b.answeredBy ? ` · by ${b.answeredBy}` : ""}`
      + (b.status === "arrived" && b.arrivedAt ? ` · arrived ${b.arrivedAt}` : "");
  }
  if (b.status === "seated") return `At table ${b.table?.label ?? "-"}${b.order ? ` · bill ${b.order.orderNo} is open on Tables` : ""}`;
  if (b.status === "declined") return `Told the guest: ${b.answer ?? ""}`;
  if (b.status === "cancelled" && b.answer) return `Why: ${b.answer}`;
  return null;
}

export type Asking = "confirm" | "decline" | "seat" | "cancel";
export const ACT: Record<Asking, { title: string; button: string; done: string }> = {
  confirm: { title: "Confirm this table", button: "Confirm", done: "Confirmed" },
  decline: { title: "Decline this table", button: "Decline", done: "Declined" },
  seat: { title: "Seat them", button: "Seat", done: "Seated" },
  cancel: { title: "Cancel this booking", button: "Cancel booking", done: "Cancelled" },
};

/** The dialog's path and body (data/tableBookings.ts). */
export function answer(act: Asking, id: string, table: string, why: string): { path: string; body: Record<string, unknown> } {
  switch (act) {
    case "confirm": return { path: `${id}/confirm`, body: { tableId: table || null } };
    case "decline": return { path: `${id}/decline`, body: { reason: why } };
    case "seat": return { path: `${id}/seat`, body: { tableId: table } };
    case "cancel": return { path: `${id}/cancel`, body: { reason: why } };
  }
}

export const tableLabel = (t: { label: string; section?: string | null }) => (t.section ? `${t.label} · ${t.section}` : t.label);

/** New booking's fields (NewBooking) and what it sends (bookOutsideDiner). */
export interface Diner { name: string; phone: string; party: string; date: string; time: string; tableId: string; sectionId: string; note: string }
export const dinerBody = (v: Diner) => ({
  name: v.name, phone: v.phone, party: Number(v.party), date: v.date, time: v.time,
  tableId: v.tableId || null, sectionId: v.tableId ? null : v.sectionId || null, note: v.note,
});
