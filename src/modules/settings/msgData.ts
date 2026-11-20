import { ApiError, api, send } from "../../core/api";
import {
  type MessageSwitches, type ReportEmails, type RivalsSwitch, type ScheduleInput, type Schedules, type EmailsDraft, emailsBody,
} from "./msgRules";

/* ══════════════════════════════════════════════════════════════════
   SETTINGS → MESSAGES AND RIVALS' PRICES: THE CALLS (lane m13-set-messages)
   The web's seams, through the core only:
     src/modules/guest-messaging/data/settings.ts   guest-message-settings, report-emails
     src/modules/reports/data/emails.ts             report-schedules
     src/modules/market-rates/data.ts               market-rates/switch

   WHO: every read and write is roleGate's room_config (see / grant edit)
   and the database's app.manages_hotel: the owner, an administrator or
   the GM at this hotel. Anybody else gets the server's own sentence (a
   403), or "No such property, or it is not yours to set up." (a 404).

   OFFLINE: none of these writes is on the web's list (src/lib/offline.ts),
   so `send` refuses each with the web's sentence and holds nothing.

   KEYS: none of these routes reads an idempotency key (api/src/server.ts
   only lets it through CORS). The PUTs set a state, so a repeat is
   harmless; POST /report-schedules adds one, so a repeat after a lost
   reply would add a second. What stops it is the page's stop in the
   core's book (src/core/stop.ts, MsgKit usePageWrite): after an unknown
   outcome the page's writes stay grey until a read that BEGAN after the
   loss (and, when nothing came back, 5 s after it) has come back good.
   ══════════════════════════════════════════════════════════════════ */

const H = (code: string) => `/api/hotels/${encodeURIComponent(code)}`;

/** What a page reads: the answer, or the server's refusal of this person (403, 404) in its words. */
export type Readout<T> = { ok: T } | { refused: string };

/** A page's read; the screen wraps it in its stop's `watch` (MsgKit), which lets a loss go. */
async function readOf<T>(path: string): Promise<Readout<T>> {
  try {
    return { ok: await api<T>(path) };
  } catch (e) {
    if (e instanceof ApiError && (e.status === 403 || e.status === 404)) return { refused: e.message };
    throw e;
  }
}

/* ── Guest messages on/off ── */
export const getMessageSwitches = (code: string) =>
  readOf<MessageSwitches>(`${H(code)}/guest-message-settings`);
export const setMessageSwitch = (code: string, kind: string, isOn: boolean) =>
  send<{ ok: true }>("PUT", `${H(code)}/guest-message-settings/${encodeURIComponent(kind)}`, { isOn });

/* ── Daily report emails: all of them, as a whole (D27-280) ── */
export const getReportEmails = (code: string) => readOf<ReportEmails>(`${H(code)}/report-emails`);
export const setReportEmails = (code: string, draft: EmailsDraft) =>
  send<{ ok: true }>("PUT", `${H(code)}/report-emails`, emailsBody(draft));

/* ── Scheduled reports ── */
const S = (code: string) => `${H(code)}/report-schedules`;
export const getSchedules = (code: string) => readOf<Schedules>(S(code));
export const saveSchedule = (code: string, id: string | null, body: ScheduleInput): Promise<unknown> =>
  id ? send<{ ok: true }>("PUT", `${S(code)}/${encodeURIComponent(id)}`, body) : send<{ id: string }>("POST", S(code), body);
export const removeSchedule = (code: string, id: string) =>
  send<{ ok: true }>("DELETE", `${S(code)}/${encodeURIComponent(id)}`);

/* ── Rivals' prices ── */
export const getRivalsSwitch = (code: string) => readOf<RivalsSwitch>(`${H(code)}/market-rates/switch`);
export const setRivalsSwitch = (code: string, isOn: boolean) =>
  send<{ ok: true }>("PUT", `${H(code)}/market-rates/switch`, { isOn });
