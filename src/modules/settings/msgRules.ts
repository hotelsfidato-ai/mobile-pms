/* ══════════════════════════════════════════════════════════════════
   SETTINGS → MESSAGES, AND RIVALS' PRICES — the rules (lane
   m13-set-messages, letter G, 20 Nov). Ported by hand from the PMS's
   (16 Nov release):
     src/modules/guest-messaging/data/settings.ts     the shapes
     src/modules/guest-messaging/pages/MessageSwitches.tsx, DailyReportEmails.tsx
     src/modules/reports/data/emails.ts               the schedules' shapes, PERIOD_WORDS
     src/modules/reports/pages/ScheduledReports.tsx   addressesIn, NEW, toInput, draftOf, the words
     src/modules/market-rates/data.ts, pages/RivalsPrices.tsx
     src/lib/format.ts dateShort                       "16 Nov 2026"
   The server decides who may, what may be scheduled with which period,
   and every refusal's words (api/src/modules/guest-messaging/settings.ts,
   api/src/modules/reports/emails.ts, api/src/modules/market-rates/routes.ts).

   Pure: no React Native here, so `msgRules.check.ts` runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { DASH, msAt } from "../../core/format.ts";
import { can, mayReach, type Role } from "../../core/menu.ts";
import { notYourRole, refusalFor } from "../admin/roles.ts";

/* ── The shapes (the web's seams) ─────────────────────────────────── */

export interface MessageSwitch {
  kind: string; label: string; when: string; isOn: boolean;
  /** The invoice only: invoices issued before it never go by themselves. */
  switchedOnAt?: string | null;
  changedBy: string | null; changedAt: string | null;
}
export interface MessageSwitches { messages: MessageSwitch[]; catchUp: { from: string; until: string } }

export interface DailyReportEmail {
  key: string; title: string; contains: string; isOn: boolean; addresses: string[];
  changedBy: string | null; changedAt: string | null;
}
export interface ReportEmails {
  reports: DailyReportEmail[];
  /** The sender's sentence where nothing can be sent yet; null when it can. */
  notConnected: string | null;
}

export type FileType = "pdf" | "xlsx";
export type Period = "yesterday" | "last-week" | "last-month" | "month-to-date";
export type Frequency = "daily" | "weekly" | "monthly";
export interface ScheduleInput {
  report: string; period: Period; frequency: Frequency;
  /** Weekly: 1 Monday to 7 Sunday. */
  weekday: number | null;
  /** Monthly: 1 to 28. */
  dayOfMonth: number | null;
  fileType: FileType; addresses: string[]; isPaused: boolean;
}
export interface Schedule extends ScheduleInput {
  id: string; title: string;
  /** "every Sunday", "on the 1st of each month", "every day" (the server's words). */
  when: string;
  changedBy: string | null; changedAt: string;
  last: { date: string; status: "sent" | "failed" | "refused"; detail: string | null; at: string } | null;
}
export interface Schedules {
  schedules: Schedule[];
  /** Every report, with the periods it may be scheduled with (none: it cannot be). */
  reports: { key: string; title: string; periods: Period[] }[];
  notConnected: string | null;
}

export interface RivalsSwitch {
  isOn: boolean;
  /** Whether the server has SERPAPI_KEY. Never the key. */
  keySet: boolean;
  lastRunOn: string | null; changedBy: string | null; changedAt: string | null;
}

/* ── The four pages: the web's address, its label, and who may ────── */

/** The console's pages (messages.settings.ts, reports.settings.ts, rivals.settings.ts). */
export const PAGES = {
  switches: { path: "/settings/messages/switches", label: "Guest messages on/off" },
  reportEmails: { path: "/settings/messages/daily-report-emails", label: "Daily report emails" },
  schedules: { path: "/settings/messages/scheduled-reports", label: "Scheduled reports" },
  rivals: { path: "/settings/connections/rivals-prices", label: "Rivals' prices" },
} as const;
export type PageKey = keyof typeof PAGES;

/** OPENING: the web's RequireAccess asks the console's navigation (the core's `mayReach`, the
    console's default `setting`): null when the web opens it for this role, else its sentence. */
export function refusedPage(role: Role, page: PageKey): string | null {
  const { path, label } = PAGES[page];
  return mayReach(role, path) ? null : notYourRole(role, label);
}

/** DOING: api/src/roleGate.ts WRITE_RULES, each grant("room_config", "edit", …), and the database's
    app.manages_hotel behind it. null when the role may, else the gate's own sentence. */
const DOING: Record<PageKey, string> = {
  switches: "Switching a guest message",
  reportEmails: "Choosing who gets the reports by email",
  schedules: "Choosing which reports go by email on a schedule",
  rivals: "Switching rivals' prices",
};
export const refusedWrite = (role: Role, page: PageKey): string | null =>
  can(role, "edit", "room_config") ? null : refusalFor(DOING[page], "room_config", "edit");

/* ── Addresses (DailyReportEmails.tsx, ScheduledReports.tsx addressesIn) ── */

/** Typed one a line, or with commas: the server checks each (and lower-cases, de-duplicates). */
export const addressesIn = (text: string) => text.split(/[\s,;]+/).filter(Boolean);

/** DailyReportEmails' hint under each "Send to". */
export const sendToHint = (isOn: boolean, text: string) =>
  isOn && !addressesIn(text).length ? "On, but nobody gets it until an address is typed." : "One email address a line.";

export type EmailsDraft = Record<string, { isOn: boolean; text: string }>;
/** What the screen holds for each report, from what the server sent. */
export const emailsDraftOf = (r: ReportEmails): EmailsDraft =>
  Object.fromEntries(r.reports.map((x) => [x.key, { isOn: x.isOn, text: x.addresses.join("\n") }]));
/** PUT /report-emails' body: all four, as a whole (D27-280). */
export const emailsBody = (draft: EmailsDraft) =>
  ({ reports: Object.entries(draft).map(([key, d]) => ({ key, isOn: d.isOn, addresses: addressesIn(d.text) })) });

/* ── Scheduled reports (emails.ts, ScheduledReports.tsx) ──────────── */

export const PERIOD_WORDS: Record<Period, string> = {
  yesterday: "The day the audit closed",
  "last-week": "Last week, Monday to Sunday",
  "last-month": "Last month",
  "month-to-date": "This month so far",
};
export const PERIODS = Object.keys(PERIOD_WORDS) as Period[];
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const FILE_WORDS: Record<FileType, string> = { pdf: "PDF", xlsx: "Excel" };
export const LAST_WORDS = { sent: "Sent", failed: "Failed", refused: "Not sent" } as const;

export type Draft = Omit<ScheduleInput, "addresses"> & { text: string };
export const NEW: Draft = {
  report: "", period: "last-week", frequency: "weekly", weekday: 7, dayOfMonth: 1, fileType: "pdf",
  isPaused: false, text: "",
};
/** The body sent: only the day the frequency uses, the addresses as typed. */
export const toInput = (d: Draft): ScheduleInput => ({
  report: d.report, period: d.period, frequency: d.frequency,
  weekday: d.frequency === "weekly" ? d.weekday : null,
  dayOfMonth: d.frequency === "monthly" ? d.dayOfMonth : null,
  fileType: d.fileType, addresses: addressesIn(d.text), isPaused: d.isPaused,
});
export const draftOf = (s: Schedule): Draft => ({
  report: s.report, period: s.period, frequency: s.frequency, weekday: s.weekday ?? 1, dayOfMonth: s.dayOfMonth ?? 1,
  fileType: s.fileType, isPaused: s.isPaused, text: s.addresses.join("\n"),
});
/** Pause or Resume from the list: the schedule as it is, paused the other way. */
export const pausedInput = (s: Schedule): ScheduleInput => toInput({ ...draftOf(s), isPaused: !s.isPaused });

/** The reports that may go on a schedule (yearly ones and one supplier's or account's may not). */
export const schedulable = (reports: Schedules["reports"]) => reports.filter((r) => r.periods.length > 0);
/** The periods offered for the chosen report; every period while none is chosen. */
export const periodsFor = (reports: Schedules["reports"], key: string): Period[] => {
  const p = reports.find((r) => r.key === key)?.periods ?? [];
  return p.length ? p : PERIODS;
};
/** Choosing a report keeps the period when it may, else its first. */
export function pickReport(d: Draft, reports: Schedules["reports"], key: string): Draft {
  const allowed = reports.find((r) => r.key === key)?.periods ?? [];
  return { ...d, report: key, period: allowed.includes(d.period) ? d.period : allowed[0] ?? d.period };
}
/** "Days it covers"'s hint for a report of a whole month. */
export const periodsHint = (reports: Schedules["reports"], key: string) =>
  (reports.find((r) => r.key === key)?.periods.length ?? 0) === 1
    ? "A report of a whole month goes for last month only: this month is not closed yet." : undefined;
export const mayAdd = (d: Draft) => d.report !== "" && addressesIn(d.text).length > 0;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** The web's dateShort ("d MMM yyyy") of a date the server sends as text ("2026-11-16"); a dash when none. */
export function dayShort(date: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date ?? "");
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : DASH;
}
/** A schedule's lines in the list, in the web's words. */
export const periodLine = (s: Schedule) => `${PERIOD_WORDS[s.period]}, ${s.when} after the night audit, as ${FILE_WORDS[s.fileType]}`;
export const toLine = (s: Schedule) => `To ${s.addresses.join(", ")}`;
export const lastLine = (s: Schedule) =>
  s.last
    ? `Last: ${LAST_WORDS[s.last.status]} for the day ${dayShort(s.last.date)}${s.last.detail ? ` - ${s.last.detail}` : ""}`
    : "Not sent yet.";
/** Take it off's dialog (ScheduledReports.tsx): its title, sentence and buttons. */
export const removeWords = (s: Schedule) => ({
  title: "Take this schedule off?",
  body: `${s.title}, ${s.when}. Nothing more is sent by it; what was sent stays recorded.\n\nTo pause it instead, press Pause: it keeps its addresses.`,
  act: "Take it off", keep: "Keep it",
});

/* ── Guest messages on/off: the invoice's moment, the catch-up line ── */

const two = (n: number) => String(n).padStart(2, "0");
/** `new Date(x).toLocaleString("en-IN")` as a browser writes it, in the phone's own time:
    "20/11/2026, 8:35:09 am" (the hour not padded). A dash when the time cannot be read. */
export function stampIn(text: string | null | undefined): string {
  const ms = msAt(text);
  if (ms === null) return DASH;
  const at = new Date(ms);
  const h = at.getHours();
  return `${two(at.getDate())}/${two(at.getMonth() + 1)}/${at.getFullYear()}, ${h % 12 || 12}:${two(at.getMinutes())}:${two(at.getSeconds())} ${h < 12 ? "am" : "pm"}`;
}
/** The invoice's "On since …", only while it is on and the server says since when. */
export const onSince = (m: MessageSwitch): string | null =>
  m.kind === "invoice" && m.isOn && m.switchedOnAt ? `On since ${stampIn(m.switchedOnAt)}.` : null;
export const catchUpLine = (c: MessageSwitches["catchUp"]) =>
  `A booking made before sending was first switched on is confirmed only from ${c.from} to ${c.until}, the hotel's time (fixed).`;

/* ── One page's stop, kept outside React (MEMORY 16, 22; BRIEF-T4) ──
   None of these routes reads an idempotency key. While a write is on its
   way the page sends nothing else (and its sheet cannot close); after an
   unknown outcome its writes stay grey until a read that BEGAN after the
   loss has come back. Kept by hotel and page (`${code}/${page}`), so
   leaving the page and coming back, or closing a sheet, does not drop it. */

export const stillUnknown = (lostAt: number | null, began: number) => lostAt !== null && began <= lostAt;

export function pageStops(now: () => number = Date.now) {
  const lost = new Map<string, number>();
  const flying = new Map<string, number>();
  /* A page drawn again after leaving and coming back hears the change too. */
  const watchers = new Set<() => void>();
  const told = () => { for (const fn of watchers) fn(); };
  return {
    /** A write's outcome is unknown, from now. */
    lose: (k: string) => { lost.set(k, now()); told(); },
    /** A read that began at `began` came back: the doubt is over when it began after the loss. */
    seen: (k: string, began: number) => {
      if (lost.has(k) && !stillUnknown(lost.get(k)!, began)) { lost.delete(k); told(); }
    },
    lost: (k: string) => lost.has(k),
    begin: (k: string) => { flying.set(k, (flying.get(k) ?? 0) + 1); told(); },
    end: (k: string) => { const n = (flying.get(k) ?? 1) - 1; if (n > 0) flying.set(k, n); else flying.delete(k); told(); },
    flying: (k: string) => (flying.get(k) ?? 0) > 0,
    watch: (fn: () => void) => { watchers.add(fn); return () => { watchers.delete(fn); }; },
    now,
  };
}
/** The app's one store of these four pages' stops. */
export const stops = pageStops();
