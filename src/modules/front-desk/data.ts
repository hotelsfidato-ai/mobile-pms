import { api, ApiError, orNull, send, type Hotel } from "../../core/api";
import type { Room, Stay } from "../../core/types";
import { arrivals, assignable, dueOut, inHouse, upcoming, walkIns } from "./desk";

/* ══════════════════════════════════════════════════════════════════
   THE FRONT DESK'S READS AND WRITES — the web's calls, one file:
     src/modules/front-desk/data/stays.ts, operations.ts
     src/modules/finance/data/folios.ts (getFolio), tax.ts
     src/modules/guests/data/people.ts, companions.ts, bookingSources.ts
     src/modules/inventory/data/rates.ts (getInventory, getTariff)
     src/modules/reservations/data/groups.ts (createBooking), booking.ts
   Writes go through `send` (the web's tiers, the key from the tap).
   ══════════════════════════════════════════════════════════════════ */

/** The fields the core's Stay does not name yet (the web's types.ts today). */
export interface DeskStay extends Stay {
  /** The room's own type when it is not the type booked (D27-328). */
  givenRoomType?: string;
  guestCompany?: { name: string | null; gstin: string | null; address: string | null } | null;
  /** A list's figure: absent is no bill, a dash (D17-16). */
  balance?: number;
}

/** src/lib/api.ts DeskRules, the fields read here. GET /api/hotels sends them; the core's Hotel does not name them yet. */
export interface DeskRules {
  defaultPaymentMethod: string;
  paymentMethods?: { label: string; kind: string }[];
  defaultIdType: string | null;
  defaultNationality: string;
  defaultTitle: string | null;
  defaultGuarantee: "confirmed" | "tentative";
  defaultBillTo: "guest" | "company";
  requiredBookingFields: string[];
  idTypesOff: string[];
}
export const rulesOf = (hotel: Hotel) => (hotel as Hotel & { deskRules?: DeskRules }).deskRules;
export const timesOf = (hotel: Hotel) => hotel as Hotel & { checkInTime?: string; checkOutTime?: string };

const stays = (code: string, from: string, to = from) => api<DeskStay[]>(`/api/hotels/${code}/stays?from=${from}&to=${to}`);

export const readArrivals = async (code: string, date: string) => arrivals(await stays(code, date), date);
export const readUpcoming = async (code: string, date: string, to: string) => upcoming(await stays(code, addDay(date), to), date);
const addDay = (date: string) => new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
/** Every booking ever made: the web's Walk-ins read this too (listStays). */
export const readWalkIns = async (code: string) => walkIns(await api<DeskStay[]>(`/api/hotels/${code}/stays`));

export const readStay = (code: string, id: string) => orNull<DeskStay>(`/api/hotels/${code}/stays/${id}`);
export const readRooms = (code: string) => api<Room[]>(`/api/hotels/${code}/rooms`);
export const readHouse = (code: string) =>
  api<{ rooms: Array<{ number: string; inHouse: boolean; outOfOrder: boolean; empty: boolean }>; inHouse: number; empty: number }>(`/api/hotels/${code}/house-now`);

/** A role without bills reads none (D27-143): the balance prints its dash. */
export const readFolio = (code: string, id: string) =>
  orNull<{ balance: number; payments: number }>(`/api/hotels/${code}/stays/${id}/folio`, [403]);

async function withBalances(code: string, list: DeskStay[], bills: boolean): Promise<DeskStay[]> {
  if (!bills) return list;
  return Promise.all(list.map(async (s) => {
    const folio = await readFolio(code, s.id);
    return folio ? { ...s, balance: folio.balance } : s;
  }));
}
export const readInHouse = async (code: string, date: string, bills: boolean) => withBalances(code, inHouse(await stays(code, date)), bills);
export const readDueOut = async (code: string, date: string, bills: boolean) => withBalances(code, dueOut(await stays(code, date)), bills);

/** What the check-in's room list reads (operations.ts assignableRooms). */
export async function readAssignable(code: string, roomType: string, date: string, currentRoom?: string | null, departure?: string) {
  const [rooms, list] = await Promise.all([readRooms(code), stays(code, date)]);
  return assignable(rooms, inHouse(list), roomType, date, currentRoom, departure);
}

export interface EarlyArrival {
  isEarly: boolean;
  checkInTime: string;
  checkOutTime: string;
  /** Null when the property does not charge: a sentence, never ₹0. */
  charge: number | null;
  lateCharge: number | null;
  mayWaive: boolean;
}
/** The property's clock and charges; a failed read is no answer (the web's). */
export const readEarly = (code: string) => api<EarlyArrival>(`/api/hotels/${code}/early-arrival`).catch(() => null);

export interface Express {
  express: boolean;
  document?: { type: string; number: string };
  advance?: { owed: number; words: string } | null;
  bookingSite?: boolean;
  prepaidOnSite?: boolean;
}
export const readExpress = (code: string, id: string, prepaid?: boolean) =>
  api<Express>(`/api/hotels/${code}/stays/${id}/express-check-in${prepaid === undefined ? "" : `?prepaid=${prepaid}`}`)
    .catch((): Express => ({ express: false }));

export const readTaxRate = (code: string, amount: number) =>
  api<{ rate: number | null; scheme: "gst" | "vat" }>(`/api/hotels/${code}/tax/room/rate?amount=${encodeURIComponent(String(amount))}`);

export interface BlacklistWarning { stayId: string; guest: string; reference: string; source: string; blacklistedName: string; reason: string | null }
/** Only a warning (CRM-3): a refused read shows none, as the web's fetchOr. */
export const readBlacklist = (code: string, from: string, to: string) =>
  api<{ warnings?: BlacklistWarning[] }>(`/api/hotels/${code}/guests/blacklist-warnings?from=${from}&to=${to}`)
    .then((r) => r.warnings ?? [], () => [] as BlacklistWarning[]);

/** This booking has ID details waiting from the guest's own page (WaitingDetailsLink). */
export const readWaiting = (code: string) =>
  api<{ waiting: Array<{ reference: string }> }>(`/api/hotels/${code}/online-checkin/desk`).then((d) => d.waiting, () => []);

export const checkInPath = (code: string, id: string) => `/api/hotels/${code}/stays/${id}/check-in`;
export const checkIn = (code: string, id: string, body: object) => send<{ ok: true }>("POST", checkInPath(code, id), body);
export const assignRoom = (code: string, id: string, roomNumber: string) =>
  send<{ ok: true; room: string; guest: string; typeChanged: boolean; typeName: string }>("POST", `/api/hotels/${code}/stays/${id}/assign`, { roomNumber });

/* ── Every adult in the room (D27-382) ─────────────────────────────── */
export interface Companion {
  guestId: string; name: string; nationality: string; idType: string | null; idNumber: string | null; filed: boolean;
  [answer: string]: unknown;
}
export interface StayPeople {
  adults: number; recorded: number; lead: string; leadNationality: string; open: boolean;
  companions: Companion[];
  leadVisit?: Record<string, string | null | undefined>;
}
/** Null for whoever may not read a guest's ID (the block draws nothing). */
export const readCompanions = (code: string, id: string) =>
  orNull<StayPeople>(`/api/hotels/${code}/stays/${id}/companions`, [403]);
export const addCompanion = (code: string, id: string, person: object) => send("POST", `/api/hotels/${code}/stays/${id}/companions`, person);
export const saveCompanion = (code: string, id: string, guestId: string, person: object) => send("PUT", `/api/hotels/${code}/stays/${id}/companions/${guestId}`, person);
export const removeCompanion = (code: string, id: string, guestId: string) => send("DELETE", `/api/hotels/${code}/stays/${id}/companions/${guestId}`);

/** A refused write's sentence, as a screen says it. */
export const said = (e: unknown) => (e instanceof ApiError || e instanceof Error ? e.message : String(e));
