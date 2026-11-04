/* ══════════════════════════════════════════════════════════════════
   THE NIGHT AUDIT'S SHAPES AND WORDS — ported from the web's
   src/modules/night-audit/data/nightAudit.ts (the types) and
   pages/NightAudit.tsx (the words), trimmed to what the phone shows.
   The server decides everything here: whether the day may close
   (`canRun`, the same `blockersFor` POST /run refuses with), every count
   and every rupee. Nothing is counted, totalled or rounded on the phone;
   a figure the record does not hold is a dash. Pure: audit.check.ts.
   ══════════════════════════════════════════════════════════════════ */

import { DASH, count, dateLong, instant } from "../../core/format.ts";

/* ── data/nightAudit.ts 13-47 ─────────────────────────────────────── */

export interface AuditCheck {
  id: string;
  label: string;
  detail: string;
  /** ok: nothing to do. attention: a person should look first. */
  state: "ok" | "attention";
  count: number;
  /** A web address (/h/5EL/arrivals); the phone opens its own twin where it has one. */
  link?: string;
}

/** One thing a person must settle before the day may close (nightAudit.ts Blocker). */
export interface Blocker { id: string; reason: string; rooms: string[] }

/** Today closed under 16 hours after the last audit (D27-389). */
export interface EarlyAudit {
  lastAt: string;
  /** "23:36 on 1 Nov", by the hotel's clock (the server's words). */
  lastClock: string;
  hours: number;
  may: "reason" | "warning" | "refused";
}

/** GET /api/hotels/:code/night-audit (checklist.ts). */
export interface NightAuditState {
  businessDate: string;
  nextBusinessDate: string;
  checks: AuditCheck[];
  canRun: { allowed: boolean; reason?: string; blockers?: Blocker[] };
  /** "10 Oct 2026", printed by Postgres; null when nothing has closed. */
  lastRun: string | null;
  calendarDate?: string | null;
  lastCompletedAt?: string | null;
  early?: EarlyAudit | null;
}

/** A line of GET /night-audit/runs (nightAudit.ts ClosedDay). */
export interface ClosedDay {
  businessDate: string;
  ranBy: string | null;
  startedAt: string;
  completedAt: string | null;
  roomsPosted: number | null;
  /** The room charges the audit posted, before tax. */
  revenuePosted: number | null;
  noShows: number | null;
  corrections?: number;
  correctedRevenue?: number | null;
  earlyReason?: string | null;
  earlyBy?: string | null;
}

/** A line of GET /night-audit/undos. */
export interface AuditUndoRecord {
  id: string; backTo: string; lastDay: string; reason: string;
  undoneBy: string | null; undoneAt: string; audits: number;
}

/** POST /night-audit/run's 200 answer (data/nightAudit.ts NightAuditResult). */
export interface NightAuditResult {
  ok: boolean;
  businessDate: string;
  nextBusinessDate?: string;
  roomsPosted?: number;
  revenuePosted?: number;
  complimentary?: number;
  noShows?: number;
  restaurant?: {
    orders: number; covers: number; net: number; tax: number; gross: number;
    byTender: Array<{ method: string; amount: number }>;
    struck?: Array<{ orderNo: string; name: string; qty: number; value: number; reason: string | null; by: string | null }>;
    voided?: Array<{ orderNo: string; amount: number; method: string | null; reason: string; by: string | null; at: string }>;
    noCharge?: Array<{ orderNo: string; table: string | null; reason: string; by: string | null; at: string }>;
  };
  drawers?: {
    frontDesk: { shifts: number; opening: number; counted: number; variances: number };
    till: { outlets: number; opening: number; counted: number; variances: number };
  };
}

/* ── Figures and times, as the web writes them ──────────────────────── */

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrPaise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** The web's money() (₹3,699) - except that a figure with paise keeps them
    (MEMORY 9: never rounded). A figure not held is a dash. */
export const rupees = (n: number | null | undefined) =>
  n == null ? DASH : Number.isInteger(n) ? inr.format(n) : inrPaise.format(n);

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "10 Oct 2026" - the web's dateShort (format.ts 131, "d MMM yyyy"), not the core's "10 Oct". */
export const dayYear = (date: string) => `${Number(date.slice(8, 10))} ${MON[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;

/** "13 Oct 2026, 3:54 AM" at `offset` minutes east of UTC: the web's dateTime
    ("d MMM yyyy, h:mm a"), which the browser writes on its own clock. */
export function dateTimeAt(ms: number, offset: number): string {
  const d = new Date(ms + offset * 60_000);
  const h = d.getUTCHours(), m = d.getUTCMinutes();
  return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
/** A server time on this phone's clock; a dash when none or unreadable (MEMORY 7: ISO first). */
export function dateTime(text: string | null | undefined): string {
  if (!text) return DASH;
  const ms = Date.parse(instant(text));
  return Number.isNaN(ms) ? DASH : dateTimeAt(ms, -new Date(ms).getTimezoneOffset());
}

/* ── The head ─────────────────────────────────────────────────────── */

/** The pill beside the title (NightAudit.tsx 130). */
export function headPill(checks: AuditCheck[]): { tone: "warning" | "success"; words: string } {
  const n = checks.filter((x) => x.state === "attention").length;
  return n ? { tone: "warning", words: `${n} to look at` } : { tone: "success", words: "Nothing outstanding" };
}

/** A check's Open: only with a link and something to open (NightAudit.tsx 178);
    `route` is the phone's own screen for it, null where the phone has none. */
export function openOf(x: AuditCheck, phoneRoute: (to: string) => string | null): { route: string | null } | null {
  if (!x.link || !(x.count > 0)) return null;
  return { route: phoneRoute(x.link) };
}

/* ── What stops the close ──────────────────────────────────────────── */

/** Each blocking item with its reason, in the server's order. `canRun.reason`
    is every blocker's sentence joined, then the 16 hours' refusal for this
    person (checklist.ts 91-96); a sentence the blockers do not carry is shown
    after them. An older server sends no blockers: its one sentence. */
export function stops(canRun: NightAuditState["canRun"]): Array<{ reason: string; rooms: string[] }> {
  const blockers = (canRun.blockers ?? []).map((b) => ({ reason: b.reason, rooms: b.rooms ?? [] }));
  const reason = canRun.reason?.trim() ?? "";
  const joined = blockers.map((b) => b.reason).join(" ");
  const rest = reason.startsWith(joined) ? reason.slice(joined.length).trim() : reason;
  return rest && rest !== joined ? [...blockers, { reason: rest, rooms: [] }] : blockers;
}

/** "Last run: …" (NightAudit.tsx 210). */
export const lastRunWords = (lastRun: string | null) =>
  `Last run: ${lastRun ?? "never - this property has not closed a date in this system"}`;

/* ── The window before Run (NightAudit.tsx 227-286, D27-117, D27-389) ── */

/** The confirming Close is on once the box is ticked and, when the 16 hours
    ask for one, a reason is given. */
export const mayConfirm = (state: NightAuditState, ticked: boolean, reason: string) =>
  ticked && (!state.early || reason.trim().length > 0);

/** What Run sends: the day the screen SAYS it is closing (NA-2) - never the
    server's - and the reason only when the 16 hours ask for one. */
export const runBody = (state: NightAuditState, reason: string): { businessDate: string; reason?: string } =>
  state.early ? { businessDate: state.businessDate, reason: reason.trim() } : { businessDate: state.businessDate };

/** The 16 hours' words in the window (NightAudit.tsx 250). */
export const earlyWords = (e: EarlyAudit) =>
  `${e.may === "warning" ? "Warning: the" : "The"} last audit finished at ${e.lastClock}, ${e.hours} hours ago - less than 16. `
  + "Say why this day closes so soon. The reason is kept with the audit.";

/** The window's paragraph and its box (NightAudit.tsx 263-270). */
export const closeWords = (state: NightAuditState) =>
  `The property moves to ${dateLong(state.nextBusinessDate)}. Tonight's room charges are posted to every guest in house `
  + "and arrivals who did not come become no-shows. A closed day cannot be edited, only corrected afterwards.";
export const TICK = "I have checked the day being closed, today's date and the last audit.";

/* ── After the press ──────────────────────────────────────────────── */

/** A day already closed (409, D17-12): the record that was made. The 409's
    body carries it, which the core's ApiError does not keep (MNA-1); the
    same record is the day's line of GET /runs, read again after the 409. */
export const alreadyMade = (status: number, closing: string, runs: ClosedDay[] | undefined) =>
  status === 409 ? runs?.find((d) => d.businessDate === closing) ?? null : null;

/** "Ran by … · closed … · rooms posted … · room revenue … · no-shows …" (NightAudit.tsx 300). */
export const recordLine = (d: ClosedDay) =>
  `Ran by ${d.ranBy ?? DASH} · closed ${dateTime(d.completedAt)} · rooms posted ${count(d.roomsPosted)}`
  + ` · room revenue ${rupees(d.revenuePosted)} · no-shows ${count(d.noShows)}`;

const s = (n: number) => (n === 1 ? "" : "s");

/** The green card's lines (NightAudit.tsx 320-409), every figure the server's. */
export function resultLines(r: NightAuditResult): { head: string; posted: string; restaurant: string[]; drawers: Array<{ label: string; line: string }> } {
  const head = `${dateLong(r.businessDate)} is closed.${r.nextBusinessDate ? ` The property is now operating in ${dateLong(r.nextBusinessDate)}.` : ""}`;
  /* The web writes `roomsPosted ?? 0`; a figure not sent is a dash here. */
  const posted = `${count(r.roomsPosted)} room${s(r.roomsPosted ?? 0)} posted`
    + (typeof r.revenuePosted === "number" ? ` · ${rupees(r.revenuePosted)}` : "")
    + (r.complimentary ? ` · ${r.complimentary} complimentary, not charged` : "")
    + (r.noShows ? ` · ${r.noShows} no-show${s(r.noShows)}` : "");

  const restaurant: string[] = [];
  const p = r.restaurant;
  /* READ, not posted: the till's own figures, shown only when it worked. */
  if (p && (p.orders > 0 || (p.voided ?? []).length > 0 || (p.noCharge ?? []).length > 0)) {
    restaurant.push(`Restaurant · ${p.orders} order${s(p.orders)}${p.covers > 0 ? `, ${p.covers} covers` : ""}`
      + ` · ${rupees(p.gross)} (${rupees(p.net)} + ${rupees(p.tax)} tax)`);
    if (p.byTender.length) restaurant.push(p.byTender.map((x) => `${x.method} ${rupees(x.amount)}`).join(" · "));
    for (const x of p.struck ?? []) restaurant.push(`Struck after the kitchen: ${x.qty} × ${x.name} (${rupees(x.value)}) · ${x.orderNo} · ${x.by ?? DASH} · ${x.reason ?? DASH}`);
    for (const v of p.voided ?? []) restaurant.push(`Voided: ${v.orderNo} (${rupees(v.amount)}, ${v.method ?? DASH}) · ${v.by ?? DASH} at ${v.at} · ${v.reason}`);
    for (const v of p.noCharge ?? []) restaurant.push(`NC: ${v.orderNo}${v.table ? ` · ${v.table}` : ""} · approved by ${v.by ?? DASH} at ${v.at} · ${v.reason}`);
  }

  /* Two drawers, side by side, never added together. */
  const drawer = (label: string, unit: string, n: number, d: { opening: number; counted: number; variances: number }) => ({
    label: `${label} · ${n} ${unit}${s(n)} closed`,
    line: n === 0 ? "Not used today."
      : `Opened ${rupees(d.opening)} · counted ${rupees(d.counted)}${d.variances > 0 ? ` · ${d.variances} explained variance${s(d.variances)}` : ""}`,
  });
  const drawers = r.drawers
    ? [drawer("Front desk", "shift", r.drawers.frontDesk.shifts, r.drawers.frontDesk), drawer("Till", "outlet", r.drawers.till.outlets, r.drawers.till)]
    : [];
  return { head, posted, restaurant, drawers };
}

/* ── Closed days (NightAudit.tsx 414-534) ─────────────────────────── */

/** The first day that may still be corrected: the 1st of last month (D24-5). */
export function firstCorrectable(businessDate: string | undefined): string | null {
  if (!businessDate) return null;
  const y = Number(businessDate.slice(0, 4)), m = Number(businessDate.slice(5, 7));
  return m === 1 ? `${y - 1}-12-01` : `${y}-${String(m - 1).padStart(2, "0")}-01`;
}

export const closedDaysNote = (correcting: boolean, from: string | null) =>
  correcting && from
    ? `Every night audit run at this property, newest first. Days from ${dateLong(from)} on can be corrected; older ones stay as they are.`
    : "Every night audit run at this property, newest first.";

/** One closed day as the web's phone card lists it: the label in capitals
    beside its value. "Why early" only for a day that closed early (the
    picture of 31 Oct has no such row; MODULE.md). */
export function dayRows(d: ClosedDay): Array<{ label: string; value: string }> {
  const revenue = d.correctedRevenue == null ? rupees(d.revenuePosted) : `${rupees(d.revenuePosted)} → ${rupees(d.correctedRevenue)}`;
  return [
    { label: "Ran by", value: d.ranBy ?? DASH },
    { label: "Closed", value: dateTime(d.completedAt) },
    { label: "Rooms posted", value: count(d.roomsPosted) },
    { label: "Room revenue", value: revenue },
    { label: "No-shows", value: count(d.noShows) },
    ...(d.earlyReason ? [{ label: "Why early", value: `${d.earlyReason} · ${d.earlyBy ?? DASH}` }] : []),
  ];
}

/** The pills beside a closed day's date. */
export const dayPills = (d: ClosedDay) => [
  ...((d.corrections ?? 0) > 0 ? [{ tone: "info" as const, words: "Corrected" }] : []),
  ...(d.earlyReason ? [{ tone: "warning" as const, words: "Under 16 hours" }] : []),
];

/** A cancelled audit's two lines (NightAudit.tsx 452-458). */
export const undoLines = (u: AuditUndoRecord) => [
  `Back to ${dateLong(u.backTo)} · ${u.audits} ${u.audits === 1 ? "audit" : "audits"} undone, to ${dayYear(u.lastDay)}`,
  `${u.reason} · ${u.undoneBy ?? DASH} · ${dateTime(u.undoneAt)}`,
];
