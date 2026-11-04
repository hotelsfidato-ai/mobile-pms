import { api, ApiError, orNull, send, type Hotel } from "../../core/api";
import type { Room, Stay } from "../../core/types";
import type { Promotion, Split, Tariff } from "./booking";
import { arrivals, assignable, dueOut, emptyRooms, footOf, inHouse, upcoming, walkIns } from "./desk";

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

/** The stay's foot (FolioTotals): the folio's balance and the bill's own
    total and paid (data/bill.ts StayBill), the server's figures; none added
    here (MFD-3). A role without bills reads neither. */
export async function readFoot(code: string, s: DeskStay) {
  const [folio, bill] = await Promise.all([
    readFolio(code, s.id),
    orNull<{ total: number; paid: number; nightsToCome?: number }>(`/api/hotels/${code}/stays/${s.id}/bill`, [403]),
  ]);
  return footOf(s, folio, bill);
}

async function withBalances(code: string, list: DeskStay[], bills: boolean): Promise<DeskStay[]> {
  if (!bills) return list;
  return Promise.all(list.map(async (s) => {
    const folio = await readFolio(code, s.id);
    return folio ? { ...s, balance: folio.balance } : s;
  }));
}
export const readInHouse = async (code: string, date: string, bills: boolean) => withBalances(code, inHouse(await stays(code, date)), bills);
/** What departing guests still owe, the server's own count and sum
    (reports/data/dueOut.ts DueOut, as the Dashboard reads it); a role
    without bills gets none (403), not an error. */
export const readOwed = (code: string) => orNull<{ leaving: number; owing: number; owed: number }>(`/api/hotels/${code}/due-out`, [403]);
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

/** The desk's roles only (DESK_ROLES): ID details waiting from the guest's own
    page, and whether this hotel keeps ID photos. Null for anybody else. */
export const readDesk = (code: string) =>
  api<{ waiting: Array<{ reference: string }>; idPhotos?: { on: boolean; off: string | null } }>(`/api/hotels/${code}/online-checkin`).catch(() => null);

export const checkInPath = (code: string, id: string) => `/api/hotels/${code}/stays/${id}/check-in`;
export const checkIn = (code: string, id: string, body: object) => send<{ ok: true }>("POST", checkInPath(code, id), body);
export const assignRoom = (code: string, id: string, roomNumber: string) =>
  send<{ ok: true; room: string; guest: string; typeChanged: boolean; typeName: string }>("POST", `/api/hotels/${code}/stays/${id}/assign`, { roomNumber });

/** stayExtras.ts: the visits before this one, and the WhatsApp tick. */
export const readGuestMarks = (code: string, id: string) =>
  orNull<{ stayedBefore: number; whatsappAgreed: boolean }>(`/api/hotels/${code}/stays/${id}/guest-marks`, [403]);
export const setWhatsapp = (code: string, id: string, agreed: boolean) => send("POST", `/api/hotels/${code}/stays/${id}/whatsapp`, { agreed });
/** The guest's record, held offline ("VIP"). The group's levels: with any, marking asks which (D27-260). */
export const setVip = (code: string, guestId: string, isVip: boolean, levelId?: string) =>
  send<{ ok: true; guest: string }>("POST", `/api/hotels/${code}/guests/${guestId}/vip`, { isVip, ...(levelId ? { levelId } : {}) });
export const readVipLevels = (code: string) =>
  api<Array<{ id: string; label: string; active: boolean }>>(`/api/hotels/${code}/vip-levels`).catch(() => []);

/* ── More options (operations.ts, stayExtras.ts, reservations' booking.ts) ── */
export const amendStay = (code: string, id: string, input: object) =>
  send<{ guest: string; nightsBefore: number; nightsAfter: number; roomHeld: string | null }>("PATCH", `/api/hotels/${code}/stays/${id}`, input);
export const moveRoom = (code: string, id: string, input: object) =>
  send<{ guest: string; from: string; to: string; nightsBefore: number; nightsAfter: number }>("POST", `/api/hotels/${code}/stays/${id}/move`, input);
export const unassignRoom = (code: string, id: string) => send<{ room: string }>("POST", `/api/hotels/${code}/stays/${id}/unassign`, {});
export const voidStay = (code: string, id: string, reason: string) => send("POST", `/api/hotels/${code}/stays/${id}/void`, { reason });
export const confirmWaiting = (code: string, id: string) => send("POST", `/api/hotels/${code}/stays/${id}/confirm`, {});
export const cancelWaiting = (code: string, id: string, reason: string) => send("POST", `/api/hotels/${code}/stays/${id}/cancel`, { reason });
export const cancelConfirmed = (code: string, id: string, reason: string, waive: boolean) =>
  send<{ charged: number | null; waived: boolean }>("POST", `/api/hotels/${code}/stays/${id}/cancel`, { reason, ...(waive ? { waive } : {}) });
/** What cancelling would charge, written nowhere. `charge` null: no terms; 0: the free window. */
export const cancelPreview = (code: string, id: string) =>
  send<{ preview: { terms: string | null; charge: number | null } }>("POST", `/api/hotels/${code}/stays/${id}/cancel`, { dryRun: true });
export const readReasons = (code: string, kind: string) =>
  api<Array<{ id: string; label: string; active: boolean }>>(`/api/hotels/${code}/lists/${kind}`).catch(() => []);
export const readExchangeable = (code: string, id: string) =>
  api<{ rooms: Array<{ id: string; guest: string; room: string; reference: string; departs: string }> }>(`/api/hotels/${code}/stays/${id}/exchangeable`).then((o) => o.rooms, () => []);
export const exchangeRooms = (code: string, id: string, input: object) =>
  send<{ from: string; to: string }>("POST", `/api/hotels/${code}/stays/${id}/exchange`, input);
export const readInclusions = (code: string) =>
  api<{ inclusions: Array<{ id: string; name: string; rate: number | null }> }>(`/api/hotels/${code}/inclusions`).then((o) => o.inclusions, () => []);
export const readStayInclusions = (code: string, id: string) =>
  api<{ inclusions: Array<{ id: string; name: string; quantity: number; rate: number | null; notes: string | null; addedBy: string; at: string }> }>(`/api/hotels/${code}/stays/${id}/inclusions`).then((o) => o.inclusions, () => []);
export const addStayInclusion = (code: string, id: string, input: object) => send("POST", `/api/hotels/${code}/stays/${id}/inclusions`, input);
export const removeStayInclusion = (code: string, id: string, lineId: string) => send("DELETE", `/api/hotels/${code}/stays/${id}/inclusions/${lineId}`);

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

/* ── A walk-in: New booking's one page opened from an empty room ───── */
export interface InventoryCell { roomTypeId: string; roomType: string; date: string; available: number }
export const readInventory = (code: string, from: string, to: string) =>
  api<{ from: string; to: string; cells: InventoryCell[] }>(`/api/hotels/${code}/inventory?from=${from}&to=${to}`).catch(() => null);

interface Party { roomTypeId: string; mealPlan: string; from: string; to: string; adults: number; children: number }
const party = (p: Party) => `roomType=${p.roomTypeId}&mealPlan=${p.mealPlan}&from=${p.from}&to=${p.to}&adults=${p.adults}&children=${p.children}`;
export const readTariff = (code: string, p: Party) => api<Tariff>(`/api/hotels/${code}/tariff?${party(p)}`).catch(() => null);
export const readContract = (code: string, p: Party, companyId: string) =>
  api<Tariff>(`/api/hotels/${code}/contract-price?companyId=${companyId}&${party(p)}`).catch(() => null);
export const readBeforeGst = (code: string, gross: number) => api<Split>(`/api/hotels/${code}/tax/room/before-gst?gross=${encodeURIComponent(String(gross))}`);

export interface BookingSource { id: string; name: string; kind: string; isActive: boolean }
export const readSources = (code: string) => api<BookingSource[]>(`/api/hotels/${code}/booking-sources`);
/** Unreadable is not off: {} shows every section (BookingPage.tsx `show`). */
export const readModules = (code: string) =>
  api<{ modules: Array<{ module: string; enabled: boolean }> }>(`/api/hotels/${code}/modules`)
    .then((b) => Object.fromEntries(b.modules.map((m) => [m.module, m.enabled])) as Record<string, boolean>, () => ({} as Record<string, boolean>));
export const readAccounts = (code: string) => api<Array<{ name: string }>>(`/api/hotels/${code}/companies`).catch(() => [] as Array<{ name: string }>);
export const readBilling = (code: string) => api<Array<{ id: string; name: string; gstin: string | null }>>(`/api/hotels/${code}/billing-companies`);
export const readSalesPeople = (code: string) => api<Array<{ id: string; name: string }>>(`/api/hotels/${code}/sales-people`).catch(() => []);
export const readPromotions = (code: string) => api<Promotion[]>(`/api/hotels/${code}/room-promotions`).catch(() => []);
export const readSegments = (code: string) => api<Array<{ label: string; active: boolean }>>(`/api/hotels/${code}/lists/market_segment`).catch(() => null);

export interface ReturningMatch {
  guestId?: string; visits?: number; name: string; suggested: boolean; blacklisted: boolean; blacklistReason: string | null;
  lastCompany?: { name: string | null; gstin: string | null; address: string | null };
}
export const readReturning = (code: string, phone: string, email: string) =>
  api<{ matches: ReturningMatch[] }>(`/api/hotels/${code}/guests/returning?phone=${encodeURIComponent(phone)}&email=${encodeURIComponent(email)}`)
    .then((o) => o.matches, () => [] as ReturningMatch[]);

export interface Booked { ok: true; groupId: string | null; guest: string; bookings: Array<{ id?: string; reference: string; roomType: string; rate: number }>; status?: string }
/** Refused offline by the web's tiers (not a held write): the walk-in waits for the line. */
export const createBooking = (code: string, input: object) => send<Booked>("POST", `/api/hotels/${code}/bookings`, input);
/** The advance, held as credit (D27-4). A payment: refused offline. */
export const takeAdvance = (code: string, id: string, input: object) => send("POST", `/api/hotels/${code}/stays/${id}/payments`, input);

/** The tiles a walk-in can start from (Rooms' empty ones). */
export async function readEmpty(code: string, date: string) {
  const [rooms, house, list] = await Promise.all([readRooms(code), readHouse(code), api<DeskStay[]>(`/api/hotels/${code}/stays?from=${date}&to=${date}&board=1`)]);
  return emptyRooms(rooms, list, new Set(house.rooms.filter((r) => r.outOfOrder).map((r) => r.number)), date);
}

/** A refused write's sentence, as a screen says it. */
export const said = (e: unknown) => (e instanceof ApiError || e instanceof Error ? e.message : String(e));
