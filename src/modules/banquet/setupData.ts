import { send } from "../../core/api";
import type { HallInput, PackageInput } from "./setup";

/* ══════════════════════════════════════════════════════════════════
   HALLS AND PACKAGES' WRITES (lane U, 19 Nov) — the web's addBanquetVenue,
   amendBanquetVenue, addBanquetPackage and switchBanquetPackage
   (src/modules/banquet/data/banquet.ts lines 326-364), through the core's
   `send`. The read is data.ts's readSetup (key ["banquet", code, "setup"],
   shared with Add a course).

   OFFLINE: no venue or package path is on the web's list
   (src/lib/offline.ts), so `send` refuses each with the UNLISTED sentence
   and nothing is held (setup.check.ts holds it).

   KEYS: none of the four routes reads an idempotency key. Adding a hall or
   a package twice after a lost reply is refused by the server itself
   ("There is already a hall with that name here.", a unique name); an edit
   and a switch set a value, so a repeat sets the same. The screen still
   takes no second Add until it has read the list again (MEMORY 16).
   ══════════════════════════════════════════════════════════════════ */

const at = (code: string) => `/api/hotels/${encodeURIComponent(code)}/banquet`;
type Ok = { ok: true };

export const addHall = (code: string, body: HallInput) => send<Ok & { id: string }>("POST", `${at(code)}/venues`, body);

/** Every field the web's dialog holds; present-and-null CLEARS a capacity or the usual rate. */
export const changeHall = (code: string, id: string, body: HallInput) =>
  send<Ok>("PATCH", `${at(code)}/venues/${encodeURIComponent(id)}`, body);

export const addPackage = (code: string, body: PackageInput) => send<Ok & { id: string }>("POST", `${at(code)}/packages`, body);

/** Off or on, and nothing else: the server refuses any other field (PACKAGE_FIXED, D27-305). */
export const switchPackage = (code: string, id: string, isActive: boolean) =>
  send<Ok>("PATCH", `${at(code)}/packages/${encodeURIComponent(id)}`, { isActive });
