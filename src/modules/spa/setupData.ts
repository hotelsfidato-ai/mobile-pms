import { send } from "../../core/api";
import type { TreatmentInput } from "./setup";

/* ══════════════════════════════════════════════════════════════════
   TREATMENTS AND THERAPISTS' WRITES (lane U, 19 Nov) — the web's
   addTreatment, changeTreatment, addTherapist and changeTherapist
   (src/modules/spa/data/spa.ts lines 192-216), through the core's `send`.
   The reads are data.ts's readTreatments and readTherapists (keys
   ["spa", code, "treatments"] and ["spa", code, "therapists"], shared with
   Book a treatment).

   OFFLINE: no spa path is on the web's list, so `send` refuses each with
   the UNLISTED sentence and nothing is held (setup.check.ts holds it).
   KEYS: none is read. An add repeated after a lost reply is refused by the
   server's unique name ("This property already sells a …", "… is already
   on this property's list."); a change and a toggle set values.
   ══════════════════════════════════════════════════════════════════ */

const at = (code: string) => `/api/hotels/${encodeURIComponent(code)}/spa`;
type Ok = { ok: true; id: string };

export const addTreatment = (code: string, body: TreatmentInput) => send<Ok>("POST", `${at(code)}/treatments`, body);

/** Name, minutes, price and Free, as the web's dialog sends them: `price: null` takes it back to unpriced. */
export const changeTreatment = (code: string, id: string, body: TreatmentInput) =>
  send<Ok>("PATCH", `${at(code)}/treatments/${encodeURIComponent(id)}`, body);

/** Off the list, or back on it: nothing is deleted. */
export const listTreatment = (code: string, id: string, isActive: boolean) =>
  send<Ok>("PATCH", `${at(code)}/treatments/${encodeURIComponent(id)}`, { isActive });

export const addTherapist = (code: string, name: string) => send<Ok>("POST", `${at(code)}/therapists`, { name });

export const listTherapist = (code: string, id: string, isActive: boolean) =>
  send<Ok>("PATCH", `${at(code)}/therapists/${encodeURIComponent(id)}`, { isActive });
