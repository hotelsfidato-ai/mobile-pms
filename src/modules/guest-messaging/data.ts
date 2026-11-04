import { api } from "../../core/api";
import type { ConnectionsHealth, GuestMessages } from "./rules";

/* ══════════════════════════════════════════════════════════════════
   GUEST MESSAGING'S CALLS — the web's
   src/modules/guest-messaging/data/guestMessages.ts (getGuestMessages) and
   src/modules/connections-health/data.ts (getConnectionsHealth), through
   the core only. TWO READS AND NO WRITE: what was sent is written by the
   sender itself (api/src/sending.ts) and nothing here adds to it; the
   health page changes nothing. The web's one write in this seam, Send
   check-in link (POST /stays/:id/checkin-link), belongs to the booking's
   screens, not to this one (its MODULE.md), so it is not here.

   OFFLINE: reads only, so nothing is held or refused; with no line the
   read fails and the screen says "No connection" (react-query keeps the
   last answer on screen when a re-read fails).
   ══════════════════════════════════════════════════════════════════ */

const at = (code: string) => `/api/hotels/${encodeURIComponent(code)}`;

/** Everything sent at one property, newest first, 200 at most (the server's) -
    or, given a booking, what went about it and its group (D22-41). */
export const getGuestMessages = (code: string, reservation?: string) =>
  api<GuestMessages>(`${at(code)}/guest-messages${reservation ? `?reservation=${encodeURIComponent(reservation)}` : ""}`);

/** Every outside connection judged for this property, and whether alert emails are on. */
export const getConnectionsHealth = (code: string) =>
  api<ConnectionsHealth>(`${at(code)}/connections-health`);
