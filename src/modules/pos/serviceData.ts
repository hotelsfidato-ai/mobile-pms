/* ══════════════════════════════════════════════════════════════════
   THE SERVICE LANE'S READS AND WRITES — after the web's
   src/modules/pos/data/till.ts (listBillHistory, listWaiters, getOrder,
   getDayEnd, openDay, recordMovement, countDrawer, closeDay),
   data/posBridge.ts (listPosOutlets, listPosTickets) and
   data/tableBookings.ts. Reads through `api`, writes through `send` (the
   web's offline tiers: every day-end write and every table booking is
   refused offline, with the web's sentence). Keys: ["pos", code, …].
   ══════════════════════════════════════════════════════════════════ */

import { api, send } from "../../core/api";
import { askPath, type Ask, type BillHistory } from "./billHistory";
import { OUTLET, type DayEnd, type MovementKind } from "./dayEnd";
import type { PosOutlet, PosTickets } from "./roomCharges";
import type { Diner, TableBookingList } from "./tableBookings";
import { dinerBody } from "./tableBookings";
import type { Order } from "./types";

const H = (code: string) => `/api/hotels/${code}`;

/* ── Bill history ─────────────────────────────────────────────────── */
export const readBillHistory = (code: string, ask: Ask) => api<BillHistory>(askPath(code, ask));
export const readWaiters = async (code: string) =>
  (await api<{ waiters: { id: string; name: string }[] }>(`${H(code)}/till/waiters`)).waiters;
export const readOrder = (code: string, id: string) => api<Order>(`${H(code)}/till/orders/${id}`);

/* ── Close restaurant day ─────────────────────────────────────────── */
export const readDayEnd = (code: string) => api<DayEnd>(`${H(code)}/till/day-end?outlet=${OUTLET}`);
type Ok = { ok: true };
export const openDay = (code: string, opening: number) => send<Ok>("POST", `${H(code)}/till/day-end/open`, { opening });
export const countDrawer = (code: string, denominations: { value: number; count: number }[]) =>
  send<Ok>("POST", `${H(code)}/till/day-end/count`, { denominations });
export const recordMovement = (code: string, body: { kind: MovementKind; amount: number; reason: string; category?: string }) =>
  send<Ok & { id?: string }>("POST", `${H(code)}/till/day-end/movements`, body);
export const closeDay = (code: string, body: { varianceReason: string; keptCash: number }) =>
  send<Ok & { variance: number; counted: number; expected: number }>("POST", `${H(code)}/till/day-end/close`, body);

/* ── Charges to rooms ─────────────────────────────────────────────── */
export const readOutlets = (code: string) => api<PosOutlet[]>(`${H(code)}/pos/outlets`);
export const readTickets = (code: string) => api<PosTickets>(`${H(code)}/pos/tickets`);

/* ── Table bookings ───────────────────────────────────────────────── */
export const readTableBookings = (code: string, date: string) =>
  api<TableBookingList>(`${H(code)}/table-bookings${date ? `?date=${date}` : ""}`);
export const actOnBooking = (code: string, path: string, body: Record<string, unknown>) =>
  send<Ok>("POST", `${H(code)}/table-bookings/${path}`, body);
export const bookOutsideDiner = (code: string, v: Diner) => send<Ok>("POST", `${H(code)}/table-bookings`, dinerBody(v));
