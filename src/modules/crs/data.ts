import { api, send } from "../../core/api";
import type { CrsBookings, CrsSetup, SetupForm } from "./bookings";

/* ══════════════════════════════════════════════════════════════════
   CRS BOOKINGS' CALLS — the web's src/modules/crs/data/crs.ts (48-75),
   through the core only. Routes: api/src/modules/crs/routes.ts (the list,
   Done) and setup.ts (the connection card).

   OFFLINE: no /crs path is on the web's list (src/lib/offline.ts), so
   `send` refuses Done and Save with the web's UNLISTED sentence ("This
   cannot be done offline yet…") and holds nothing (bookings.check.ts).

   KEYS: neither write moves money, and neither route reads the
   idempotency key; each tap is latched on the screen (MEMORY 8). A Done
   repeated after a lost reply is refused by the server ("That note is not
   here, or is already done.", 409) and changes nothing; Save is a whole
   replace, so the same form sent twice leaves the same connection.
   ══════════════════════════════════════════════════════════════════ */

const at = (code: string) => `/api/hotels/${encodeURIComponent(code)}/crs`;

/** Every CRS booking the reader acted on at this hotel, newest first (200 at most, the server's). */
export const listCrsBookings = (code: string) => api<CrsBookings>(`${at(code)}/bookings`);

/** The desk has acted on a change made in the CRS. It changes nothing in the CRS or on the booking. */
export const markNoteDone = (code: string, crsId: string) =>
  send<{ ok: true }>("POST", `${at(code)}/bookings/${encodeURIComponent(crsId)}/done`);

/** The connection card: the owner and an administrator only (403 with SETUP_REFUSED for anybody else). */
export const getCrsSetup = (code: string) => api<CrsSetup>(`${at(code)}/setup`);

export const saveCrsSetup = (code: string, form: SetupForm) => send<{ ok: true }>("PUT", `${at(code)}/setup`, form);

/** One booking's CRS facts, for its own panel (the web's CrsFacts: `?reservation=<id>`). */
export const crsFactsOf = (code: string, reservationId: string) =>
  api<CrsBookings>(`${at(code)}/bookings?reservation=${encodeURIComponent(reservationId)}`);
