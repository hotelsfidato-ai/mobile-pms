import { api, send } from "../../core/api";
import type { Team } from "./roles";
import type { DeskMessages, DeskView, InHouse, LostItem, RequestList, WakeUpCall } from "./rules";

/* ══════════════════════════════════════════════════════════════════
   GUEST SERVICES' CALLS — the web's data/requests.ts, data/wakeAndLost.ts
   and online-checkin's data/desk.ts. The server decides who sees what and
   who may act; a refusal comes back as an ApiError with its sentence (the
   core reads `reason` and `error`).

   OFFLINE: none of these paths is on the web's list (src/lib/offline.ts,
   the web's MODULE.md: "a request is not held when the line is down"), so
   `send` refuses each with the web's sentence and holds nothing.
   ══════════════════════════════════════════════════════════════════ */

const at = (code: string) => `/api/hotels/${encodeURIComponent(code)}`;
const desk = (code: string) => `${at(code)}/online-checkin`;
type Ok = { ok: true };

/* Guest requests */
export const listRequests = (code: string, view: "open" | "done") =>
  api<RequestList>(`${at(code)}/requests?view=${view}`);
export const raiseRequest = (code: string, input: { reservationId: string; team: Team; what: string; when?: string }) =>
  send<Ok>("POST", `${at(code)}/requests`, input);
export const actOnRequest = (code: string, id: string, action: "take" | "done" | "cancel", note?: string) =>
  send<Ok>("PATCH", `${at(code)}/requests/${id}`, { action, note });

/* Wake-up calls */
export const listWakeUps = (code: string, view: "open" | "done") =>
  api<{ calls: WakeUpCall[]; rooms: InHouse[]; today: string }>(`${at(code)}/wake-up-calls?view=${view}`);
export const setWakeUp = (code: string, input: { reservationId: string; day: string; time: string; note?: string }) =>
  send<Ok>("POST", `${at(code)}/wake-up-calls`, input);
export const actOnWakeUp = (code: string, id: string, action: "confirm" | "done" | "cancel", reason?: string) =>
  send<Ok>("PATCH", `${at(code)}/wake-up-calls/${id}`, { action, reason });

/* Lost property */
export const listLost = (code: string, view: "kept" | "cleared") =>
  api<{ items: LostItem[]; mayClear: boolean }>(`${at(code)}/lost-property?view=${view}`);
export const logLost = (code: string, input: { what: string; foundWhere: string; roomNumber?: string; keptWhere?: string }) =>
  send<Ok>("POST", `${at(code)}/lost-property`, input);
export const clearLost = (code: string, id: string, action: "returned" | "disposed", words: string) =>
  send<Ok>("PATCH", `${at(code)}/lost-property/${id}`, action === "returned" ? { action, to: words } : { action, reason: words });

/* Online check-in, the desk */
export const getDesk = (code: string) => api<DeskView>(desk(code));
export const confirmDetails = (code: string, id: string) =>
  send<{ confirmed: true }>("POST", `${desk(code)}/submissions/${id}/confirm`, {});
export const setAsideDetails = (code: string, id: string) =>
  send<{ setAside: true }>("POST", `${desk(code)}/submissions/${id}/set-aside`, {});
/** A spa or laundry request, done or declined; a message to the desk is marked handled with `done`. */
export const handleRequest = (code: string, id: string, status: "done" | "declined") =>
  send<{ status: string }>("POST", `${desk(code)}/requests/${id}`, { status });

/* Messages to the desk, and replies */
export const getDeskMessages = (code: string, reservation?: string) =>
  api<DeskMessages>(`${desk(code)}/messages${reservation ? `?reservation=${encodeURIComponent(reservation)}` : ""}`);
export const replyToGuest = (code: string, reservation: string, what: string) =>
  send<{ reply: { id: string } }>("POST", `${desk(code)}/messages/${encodeURIComponent(reservation)}/reply`, { what });
