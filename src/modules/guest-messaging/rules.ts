/* ══════════════════════════════════════════════════════════════════
   GUEST MESSAGES AND CONNECTION HEALTH — the shapes and the words, ported
   by hand from the PMS (read only, 4 Nov):
     src/modules/guest-messaging/data/guestMessages.ts   SentMessage, GuestMessages, Unreachable
     src/modules/guest-messaging/pages/GuestMessages.tsx STATUS_WORDS, STATUS_TONE, wentTo,
                                                         the three "Sent by", the two empties
     api/src/modules/guest-messaging/messages.ts         what the server sends (KIND_WORDS there:
                                                         kindLabel arrives already in words)
     src/modules/connections-health/data.ts              Connection, ConnectionsHealth
     src/modules/connections-health/pages/ConnectionHealth.tsx  PILL, the "Last success" line,
                                                         the alert sentence
     src/lib/format.ts                                   dateShort ("d MMM yyyy"), dateTime
                                                         ("d MMM yyyy, h:mm a"), "-" for none
   Pure: no React Native here, so rules.check.ts runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { DASH, msAt } from "../../core/format.ts";

/* ── What the system sent (GET /api/hotels/:code/guest-messages) ──── */

export interface SentMessage {
  id: string;
  /** whatsapp | email: the PMS decides per message. */
  channel: string;
  kind: string;
  /** The desk's words for the kind, the server's (KIND_WORDS); an unnamed kind is itself. */
  kindLabel: string;
  /** Who it went to, as it was at the time. */
  to: { name: string | null; phone: string | null; email: string | null };
  /** `reference` only where it was a booking. */
  about: { kind: string; id: string; reference: string | null } | null;
  document: { name: string; bytes: number | null } | null;
  /** The property's own clock, "YYYY-MM-DDTHH:MI" (app.hotel_clock, migration 113). */
  sentAt: string;
  /** sent | failed - no third state. */
  status: string;
  detail: string | null;
  /** Null: nobody sent it, OR this reader may not see who (`byAPerson` says which). */
  sentBy: string | null;
  byAPerson: boolean;
}

export interface Unreachable {
  id: string;
  reference: string;
  guest: string;
  /** YYYY-MM-DD, the property's own day. */
  checkIn: string;
  why: string;
}

export interface GuestMessages {
  connected: boolean;
  /** The sender's own sentence, where it cannot send. */
  notConnected: string | null;
  onlineCheckIn: boolean;
  messages: SentMessage[];
  unreachable: Unreachable[];
}

export type Tone = "neutral" | "success" | "warning" | "danger";

/** GuestMessages.tsx STATUS_WORDS: an unknown state shows as itself. */
const STATUS_WORDS: Record<string, string> = { sent: "Delivered to the sender", failed: "Did not go" };
const STATUS_TONE: Record<string, Tone> = { sent: "success", failed: "danger" };
export const statusWord = (status: string) => STATUS_WORDS[status] ?? status;
export const statusTone = (status: string): Tone => STATUS_TONE[status] ?? "neutral";

/** Where it went, in the form the channel uses; the other where that one is missing; a dash for neither. */
export const wentTo = (m: SentMessage) =>
  (m.channel === "email" ? m.to.email : m.to.phone) ?? m.to.email ?? m.to.phone ?? DASH;

/** Three answers, not two: a name hidden by the staff table's row security is still a person (MSG-2). */
export const sentByWord = (m: SentMessage) => m.sentBy ?? (m.byAPerson ? "A member of staff" : "The system");

/** A message about a bill or an order has no booking reference: a dash (D17-49). */
export const bookingOf = (m: SentMessage) => m.about?.reference ?? DASH;

export const cameBack = (m: SentMessage) => m.detail ?? DASH;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The web's dateShort, "28 Oct 2026", of the property's own day: the date part of the
    server's text, read as written (no zone, so no device clock can move it a day). */
export function dayShort(text: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(text ?? "");
  if (!m) return DASH;
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month} ${m[1]}` : DASH;
}

/** The web's page description: one booking's, or the property's. */
export const underOf = (reservation: string | undefined) =>
  reservation ? "What this system sent about this booking" : "What this system sent guests, and whether it arrived";

/** TWO DIFFERENT EMPTIES, AND THE SCREEN SAYS WHICH (GuestMessages.tsx). */
export function emptyOf(connected: boolean): { title: string; description: string } {
  return connected
    ? {
      title: "Nothing has been sent yet",
      description: "A booking confirmed from here, from the central system or from a booking site gets its "
        + "confirmation and the guest's own link, and the link again the day before they arrive. Each one "
        + "shows up here with what came back.",
    }
    : {
      title: "Nothing has been sent, because nothing can be yet",
      description: "This is not a fault and nothing has failed. No message has been attempted, so there is nothing to show.",
    };
}

/** The note, only where the server says it cannot send AND gave its sentence. */
export const notConnectedOf = (g: GuestMessages): string | null => (!g.connected && g.notConnected ? g.notConnected : null);

/** MSG-3's card head. */
export const unreachableTitle = (n: number) =>
  n === 1 ? "1 booking no message can reach" : `${n} bookings no message can reach`;
export const UNREACHABLE_UNDER = "These guests will get no confirmation and no reminder. Add an email address to "
  + "the booking, or tick WhatsApp on it if the guest agrees.";

/* ── The connections' health (GET /api/hotels/:code/connections-health) ── */

export type ConnectionStatus = "green" | "amber" | "red" | "grey";

export interface Connection {
  key: string;
  label: string;
  status: ConnectionStatus;
  /** One sentence, the server's: what the colour means here. */
  summary: string;
  lastSuccess: string | null;
  lastError: { at: string | null; detail: string | null } | null;
}

export interface ConnectionsHealth {
  /** Whether the server has an address for the alert email. Never the address. */
  alertsTo: boolean;
  connections: Connection[];
}

/** ConnectionHealth.tsx PILL. A colour the web does not know is shown as itself, neutral. */
const PILL: Record<ConnectionStatus, { tone: Tone; words: string }> = {
  green: { tone: "success", words: "Working" },
  amber: { tone: "warning", words: "Needs a look" },
  red: { tone: "danger", words: "Not working" },
  grey: { tone: "neutral", words: "Not set up" },
};
export const pillOf = (status: string): { tone: Tone; words: string } =>
  PILL[status as ConnectionStatus] ?? { tone: "neutral", words: status };

/** The web's dateTime, "31 Oct 2026, 7:35 AM", on the device's clock as the browser's is;
    a dash for none or for a time that cannot be read (through `instant`, MEMORY 7). */
export function dateTime(text: string | null | undefined): string {
  const ms = msAt(text);
  if (ms === null) return DASH;
  const d = new Date(ms);
  const h = d.getHours();
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${h % 12 || 12}:${mm} ${h < 12 ? "AM" : "PM"}`;
}

/** The small line under each connection, as the web writes it. */
export function lastLine(c: Connection): string {
  const success = `Last success: ${dateTime(c.lastSuccess)}`;
  if (!c.lastError) return success;
  return `${success} · Last error: ${dateTime(c.lastError.at)}${c.lastError.detail ? ` - ${c.lastError.detail}` : ""}`;
}

export const HEALTH_UNDER = "Every outside connection this system uses, for the property in the top bar. "
  + "Backups, the disk and Firebase are the server's own.";

export const alertsLine = (alertsTo: boolean) => alertsTo
  ? "When a connection turns red, the owner is emailed once: at most once an hour for each connection, and "
    + "never while emails are not working, because that email could not go."
  : "Alert emails are off: the server's settings have no address for them yet (HEALTH_ALERT_EMAIL). They would "
    + "never go while emails are not working, because that email could not go.";
