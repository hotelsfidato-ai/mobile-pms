import { api, send } from "../../core/api";
import type { ImportReport } from "../../core/importSpec";
import type {
  AriState, BookingSource, BookingSourceKind, CancellationPolicy, ChannelBooking, PlaceKind, PlacesData,
  RateChangePreview, RatePlan, RateQuestion, RoomSetupView, SendResult, SuContent, SuStatus,
  policyBody, roomBody, typeFirstBody, typeMoreBody,
} from "./config";

/* ══════════════════════════════════════════════════════════════════
   THE SET-UP SCREENS' READS AND WRITES (lane m13-config, 19 Nov), every
   call through the core's api client, the hotel in every path; the
   screens key every read ["inventory", code, "<screen>", …] (AGENTS
   rule 5). Ported from the PMS at c9394cb:
     roomSetup.ts (getRoomSetup, addRoomType, amendRoomType, removeRoomType,
       addRoom, amendRoom, removeRoom, getAmenities, getTypeAmenities, setTypeAmenities)
     rateSetup.ts 81-138 (the cancellation policies)
     guests/data/bookingSources.ts (list, add, amend, commission)
     src/pages/PlacesAndSuppliers.tsx readPlaces, save
     channel-manager/data/su.ts (status, login, content, hotel, mapping, sends, bookings)
     inventory/data/groupRates.ts (preview, save)

   OFFLINE: none of these writes is listed in the web's src/lib/offline.ts,
   so `send` refuses each with the web's sentence for an unlisted write (an
   ApiError 503): nothing is held. A failed read is a failure, never an
   empty list: the web's getRoomSetup turns every failure into "This
   property did not load"; the phone shows the server's own words.
   ══════════════════════════════════════════════════════════════════ */

const H = (code: string) => `/api/hotels/${encodeURIComponent(code)}`;

/* ── Room types and rooms ────────────────────────────────────────── */

export const readRoomSetup = (code: string) => api<RoomSetupView>(`${H(code)}/room-setup`);

export const addRoomType = (code: string, body: ReturnType<typeof typeFirstBody>) =>
  send<{ ok: true; id: string }>("POST", `${H(code)}/room-types`, body);
export const amendRoomType = (code: string, id: string, body: ReturnType<typeof typeFirstBody> | ReturnType<typeof typeMoreBody>) =>
  send<{ ok: true }>("PATCH", `${H(code)}/room-types/${encodeURIComponent(id)}`, body);
/** Only a type nothing uses (D27-263): the server says what does. */
export const removeRoomType = (code: string, id: string) =>
  send<{ ok: true }>("DELETE", `${H(code)}/room-types/${encodeURIComponent(id)}`);

export const addRoom = (code: string, body: ReturnType<typeof roomBody>) => send<{ ok: true; id: string }>("POST", `${H(code)}/rooms`, body);
export const amendRoom = (code: string, number: string, body: ReturnType<typeof roomBody>) =>
  send<{ ok: true }>("PATCH", `${H(code)}/rooms/${encodeURIComponent(number)}`, body);
/** Only a room nothing has used (D27-336); `unlinked`: the room behind a connecting door, taken off with it. */
export const removeRoom = (code: string, number: string) =>
  send<{ ok: true; unlinked: string | null }>("DELETE", `${H(code)}/rooms/${encodeURIComponent(number)}`);

export interface Amenity { id: string; name: string; isActive: boolean }
/* ── A room type's photos (roomSetup.ts 122-132; M-16, PICKERS 2.10) and the imports (2.9) ── */

export interface TypePhoto { id: string; caption: string | null; width: number; height: number }
export const readTypePhotos = (code: string, typeId: string) =>
  api<{ photos: TypePhoto[]; most: number }>(`${H(code)}/room-types/${encodeURIComponent(typeId)}/photos`);
/** One photo, as base64 JPEG ({ type, data }): shown with files.ts dataUrl. */
export const readTypePhoto = (code: string, typeId: string, photoId: string) =>
  api<{ type: string; data: string }>(`${H(code)}/room-types/${encodeURIComponent(typeId)}/photos/${encodeURIComponent(photoId)}`);
/** `data`: the JPEG's bytes, base64 (core base64For with PHOTO). A repeat adds a second photo (no key read). */
export const addTypePhoto = (code: string, typeId: string, data: string) =>
  send<{ ok: true; id: string }>("POST", `${H(code)}/room-types/${encodeURIComponent(typeId)}/photos`, { data });
export const removeTypePhoto = (code: string, typeId: string, photoId: string) =>
  send<{ ok: true }>("DELETE", `${H(code)}/room-types/${encodeURIComponent(typeId)}/photos/${encodeURIComponent(photoId)}`);
/** The whole order, each of the type's photos once. */
export const orderTypePhotos = (code: string, typeId: string, ids: string[]) =>
  send<{ ok: true }>("PUT", `${H(code)}/room-types/${encodeURIComponent(typeId)}/photos/order`, { ids });

/** Room types or rooms from a file (roomSetup.ts importSetup): `{ rows, dryRun }`, the dry run first. */
export const importSetup = (code: string, what: "room-types" | "rooms", rows: Record<string, string>[], dryRun: boolean) =>
  send<ImportReport>("POST", `${H(code)}/${what}/import`, { rows, dryRun });

export const readAmenities = (code: string) => api<{ amenities: Amenity[] }>(`${H(code)}/amenities`);
export const readTypeAmenities = (code: string, typeId: string) =>
  api<{ amenityIds: string[] }>(`${H(code)}/room-types/${encodeURIComponent(typeId)}/amenities`);
export const setTypeAmenities = (code: string, typeId: string, amenityIds: string[]) =>
  send<{ ok: true }>("PUT", `${H(code)}/room-types/${encodeURIComponent(typeId)}/amenities`, { amenityIds });

/* ── Cancellation terms ──────────────────────────────────────────── */

export const readPolicies = (code: string) => api<CancellationPolicy[]>(`${H(code)}/cancellation-policies`);
export const addPolicy = (code: string, body: ReturnType<typeof policyBody>) =>
  send<{ ok: true; id: string }>("POST", `${H(code)}/cancellation-policies`, body);
/** Retired, not deleted: bookings keep the terms they froze. */
export const retirePolicy = (code: string, id: string) =>
  send<{ ok: true }>("DELETE", `${H(code)}/cancellation-policies/${encodeURIComponent(id)}`);
export const setDefaultPolicy = (code: string, id: string, on: boolean) =>
  send<{ ok: true; name: string | null }>("PUT", `${H(code)}/cancellation-policies/${encodeURIComponent(id)}/default`, { on });

/* ── Booking sources ─────────────────────────────────────────────── */

export const readSources = (code: string) => api<BookingSource[]>(`${H(code)}/booking-sources`);
/** For the WHOLE GROUP. A blank code is left out (the server keeps it NULL). */
export const addSource = (code: string, body: { name: string; kind: BookingSourceKind; channelCode?: string }) =>
  send<{ ok: true; source: BookingSource }>("POST", `${H(code)}/booking-sources`, body);
/** `channelCode: null` clears it (bookingSources.ts 98-102). */
export const amendSource = (code: string, id: string, body: { name: string; kind: BookingSourceKind; isActive: boolean; channelCode: string | null }) =>
  send<{ ok: true; source: BookingSource }>("PATCH", `${H(code)}/booking-sources/${encodeURIComponent(id)}`, body);
/** THIS property's commission; null is "no rate agreed", not 0. */
export const setCommission = (code: string, id: string, commissionPct: number | null) =>
  send<{ ok: true; source: BookingSource }>("PUT", `${H(code)}/booking-sources/${encodeURIComponent(id)}/commission`, { commissionPct });

/* ── Places and suppliers ────────────────────────────────────────── */

export const readPlaces = (code: string) => api<PlacesData>(`${H(code)}/places`);
export const savePlace = (code: string, id: string | null, body: { name: string; kind: PlaceKind; isActive?: boolean }) =>
  id ? send<{ ok: true }>("PUT", `${H(code)}/places/${encodeURIComponent(id)}`, body) : send<{ ok: true }>("POST", `${H(code)}/places`, body);
export interface SupplierBody {
  name: string; contact: string; phone: string; email: string; gstin: string; address: string; note: string; isActive?: boolean;
}
export const saveSupplier = (code: string, id: string | null, body: SupplierBody) =>
  id ? send<{ ok: true }>("PUT", `${H(code)}/suppliers/${encodeURIComponent(id)}`, body) : send<{ ok: true }>("POST", `${H(code)}/suppliers`, body);

/* ── The channel manager (SU) ────────────────────────────────────── */

const CM = (code: string) => `${H(code)}/channel-manager`;
export const readSuStatus = () => api<SuStatus>("/api/channel-manager/su");
export const checkSuLogin = () => send<{ ok: true; environment: string; validUntil: string; loginsThisHour: number }>("POST", "/api/channel-manager/su/login");
export const readSuContent = (code: string) => api<SuContent>(`${CM(code)}/content`);
export const saveSuHotel = (code: string, body: { suHotelId: string; countryCode: string; contactFirstName: string; contactLastName: string; description: string }) =>
  send<{ ok: true }>("PUT", `${CM(code)}/hotel`, body);
export const saveSuRoomType = (code: string, roomTypeId: string, body: { suRoomId: string; suRoomType: number; maxChildren: number; isConnected: boolean }) =>
  send<{ ok: true }>("PUT", `${CM(code)}/room-types/${encodeURIComponent(roomTypeId)}`, body);
export const saveSuRatePlan = (code: string, mealPlan: string, body: { suRatePlanId: string; suMealPlan: number; isConnected: boolean }) =>
  send<{ ok: true }>("PUT", `${CM(code)}/rate-plans/${encodeURIComponent(mealPlan)}`, body);
export const sendSuContent = (code: string) => send<{ ok: true; environment: string; results: SendResult[] }>("POST", `${CM(code)}/content/send`);
export const readSuAvailability = (code: string) => api<AriState>(`${CM(code)}/availability`);
export const sendSuAvailability = (code: string, kind: "all" | "changes") =>
  send<{ ok: true; reason: string }>("POST", `${CM(code)}/availability/send`, { kind });
export const readChannelBookings = (code: string) => api<{ bookings: ChannelBooking[] }>(`${CM(code)}/bookings`);
export const markChannelBookingDone = (code: string, id: string) =>
  send<{ ok: true }>("POST", `${CM(code)}/bookings/${encodeURIComponent(id)}/done`);

/* ── Group rate change ───────────────────────────────────────────── */

/** GET /api/group/rate-change: the room type names, and - once the question is whole - what would change. Writes nothing. */
export function previewRateChange(q: Partial<RateQuestion> & { hotels: string[] }) {
  const parts = [`hotels=${encodeURIComponent(q.hotels.join(","))}`];
  for (const k of ["roomType", "from", "through", "kind", "value"] as const) {
    const v = q[k];
    if (v !== undefined && v !== "") parts.push(`${k}=${encodeURIComponent(String(v))}`);
  }
  return api<RateChangePreview>(`/api/group/rate-change?${parts.join("&")}`);
}
/** POST: what was shown, saved at every property or at none. */
export const saveRateChange = (q: RateQuestion, seen: RatePlan[]) =>
  send<{ ok: true; saved: { code: string; name: string }[]; skipped: { code: string; name: string; reason: string }[] }>(
    "POST", "/api/group/rate-change", { ...q, seen });
