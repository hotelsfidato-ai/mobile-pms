/* ══════════════════════════════════════════════════════════════════
   THE SET-UP SCREENS' DATA SHAPES AND RULES (lane m13-config, 19 Nov),
   ported from the PMS at c9394cb (16 Nov), each with its source:

     Room types       src/modules/inventory/data/roomSetup.ts, pages/RoomSetup.tsx
     Cancellation     src/modules/inventory/data/rateSetup.ts 57-79, pages/CancellationTerms.tsx
     Booking sources  src/modules/guests/data/bookingSources.ts, pages/BookingSources.tsx
     Places           src/pages/PlacesAndSuppliers.tsx
     Channels         src/modules/channel-manager/data/su.ts, components/SuSetup.tsx
     Group rates      src/modules/inventory/data/groupRates.ts, pages/GroupRates.tsx

   THE FIGURE RULES (CLAUDE.md, MEMORY 9, MINV-1): a price, a fee or a
   percentage is TYPED AND SENT AS TYPED. Each field keeps only what can be
   sent (digits, one point, two places; a minus only where the web takes
   one), so `Number()` of it is never NaN - NaN in a JSON body is null, and
   null is "clear" or "no rate agreed" to these routes. Empty is "not said"
   (null), never 0. Every rupee is shown as the server sent it, paise kept
   (rates.ts rupees); a missing one is a dash.

   Pure: no React Native here, so config.check.ts runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { msAt } from "../../core/format.ts";
import { DASH, rupees, typedPrice } from "./rates.ts";

/* ── What a person types ─────────────────────────────────────────── */

/** A whole count (people, hours, a floor, children): digits only. */
export const typedCount = (text: string) => text.replace(/\D/g, "");

/** A percentage or a rupee figure: digits, one point, two places (rates.ts typedPrice). */
export const typedFigure = typedPrice;

/** A change that may lower a price (Group rate change's By ₹ and By %): a
    leading minus, then a figure. */
export const typedSigned = (text: string) => {
  const minus = text.trim().startsWith("-");
  return (minus ? "-" : "") + typedPrice(text);
};

/** The figure a field holds, null when it holds none: "" and "-" are not
    a number, and nothing typed is never 0. */
export const figureOf = (text: string): number | null => (/\d/.test(text) ? Number(text) : null);

/* ══ ROOM TYPES ═══════════════════════════════════════════════════ */

/** roomSetup.ts RoomTypeSetup, as GET /room-setup sends it. */
export interface RoomTypeSetup {
  id: string; code: string; name: string;
  baseOccupancy: number; maxOccupancy: number; sortOrder: number; isActive: boolean;
  /** Null until somebody prices it: a dash, never a zero. */
  rackRate: number | null;
  rooms: number; sellable: number;
  baseChildren: number; maxAdults: number | null; maxChildren: number | null;
  beds: string | null; viewType: string | null; sizeSqft: number | null; colour: string | null;
}
/** roomSetup.ts RoomSetup. */
export interface RoomSetup {
  id: string; number: string; roomTypeId: string; roomType: string;
  floor: number | null; smoking: boolean; isActive: boolean; occupied: boolean; position: number;
}
export interface RoomSetupView { types: RoomTypeSetup[]; rooms: RoomSetup[] }

/** RoomSetup.tsx 113-118: the page's line under its title. */
export function setupLine(v: RoomSetupView): string {
  if (v.types.length === 0) return "Nothing is set up yet. Add a room type, then the rooms that are of it.";
  const sellable = v.rooms.filter((r) => r.isActive).length;
  return `${v.types.length} room ${v.types.length === 1 ? "type" : "types"} · ${v.rooms.length} rooms, ${sellable} sellable`;
}

/** RoomSetup.tsx 178-185: Sleeps and Rooms on a type's card. */
export const sleepsOf = (t: RoomTypeSetup) =>
  t.baseOccupancy === t.maxOccupancy ? String(t.baseOccupancy) : `${t.baseOccupancy}, up to ${t.maxOccupancy}`;
export const roomsOf = (t: RoomTypeSetup) => (t.rooms === t.sellable ? String(t.rooms) : `${t.sellable} of ${t.rooms}`);

/** RoomSetup.tsx 230-233: under a room's number. */
export const roomLine = (r: RoomSetup) => `${r.roomType}${r.floor !== null ? ` · Floor ${r.floor}` : ""}`;

export interface TypeForm {
  code: string; name: string; base: string; max: string; active: boolean;
  baseChildren: string; maxAdults: string; maxChildren: string;
  beds: string; view: string; size: string; colour: string;
}

export const typeForm = (t: RoomTypeSetup | null): TypeForm => ({
  code: t?.code ?? "", name: t?.name ?? "",
  /* The web's own starting figures for a new type (RoomSetup.tsx 309-310): people, not prices. */
  base: String(t?.baseOccupancy ?? 2), max: String(t?.maxOccupancy ?? 3), active: t?.isActive ?? true,
  baseChildren: String(t?.baseChildren ?? 0),
  maxAdults: t?.maxAdults == null ? "" : String(t.maxAdults),
  maxChildren: t?.maxChildren == null ? "" : String(t.maxChildren),
  beds: t?.beds ?? "", view: t?.viewType ?? "", size: t?.sizeSqft == null ? "" : String(t.sizeSqft), colour: t?.colour ?? "",
});

/** RoomSetup.tsx 357-358: Save is on only for a whole form. */
export const typeReady = (f: TypeForm, editing: boolean) =>
  Boolean(f.name.trim()) && (editing || /^[A-Za-z0-9]{2,10}$/.test(f.code.trim()))
  && Number(f.base) >= 1 && Number(f.max) >= Number(f.base);

/** The field's own error, said not only disabled (RoomSetup.tsx 437-453, QA RT-6). */
export const baseError = (f: TypeForm) => (f.base.trim() !== "" && !(Number(f.base) >= 1) ? "At least one person." : null);
export const maxError = (f: TypeForm) =>
  Number(f.base) >= 1 && f.max.trim() !== "" && !(Number(f.max) >= Number(f.base)) ? `At least what the rate covers (${Number(f.base)}).` : null;

const nullIfEmpty = (v: string) => (v.trim() === "" ? null : Number(v));

/** RoomSetup.tsx 324-337: the first write (POST to add, PATCH to edit). */
export const typeFirstBody = (f: TypeForm, editing: boolean) =>
  editing
    ? { name: f.name.trim(), baseOccupancy: Number(f.base), maxOccupancy: Number(f.max), isActive: f.active }
    : { code: f.code.trim().toUpperCase(), name: f.name.trim(), baseOccupancy: Number(f.base), maxOccupancy: Number(f.max) };

/** RoomSetup.tsx 339-344: the Settings console's fields, a second PATCH. Empty is "not said" (null);
    the children the rate covers is the web's 0 when empty (a count of people, never a price). */
export const typeMoreBody = (f: TypeForm) => ({
  baseChildren: Number(f.baseChildren || 0), maxAdults: nullIfEmpty(f.maxAdults), maxChildren: nullIfEmpty(f.maxChildren),
  beds: f.beds.trim() || null, viewType: f.view.trim() || null, sizeSqft: nullIfEmpty(f.size), colour: f.colour.trim() || null,
});

export interface RoomForm { number: string; typeId: string; floor: string; smoking: boolean; active: boolean }

/** RoomSetup.tsx 712-721, 726: one room's body; an empty floor is no floor. */
export const roomBody = (f: RoomForm, editing: boolean) =>
  editing
    ? { roomTypeId: f.typeId, floor: nullIfEmpty(f.floor), smoking: f.smoking, isActive: f.active }
    : { number: f.number.trim(), roomTypeId: f.typeId, floor: nullIfEmpty(f.floor), smoking: f.smoking };

/* SEVERAL ROOMS (RoomSetup.tsx 616-654, the owner's D27-309, D27-335, D27-336): From and To
   are the same but for ONE number that counts up, or the last letter; at most 100 at a time.
   Each number goes through the one-room create, so the server keeps every check it has. */
const ROOM_NO = /^[A-Za-z0-9-]{1,10}$/; /* api/src/validate.ts roomNumberProblem */
const ROOM_NO_BAD = "At most 10 letters, digits and -, e.g. A101 or G01.";
const MOST = 100;
const runs = (s: string) => s.match(/\d+|\D+/g) ?? [];
const isDigits = (s = "") => /^\d+$/.test(s);

export function roomRange(from: string, to: string) {
  const fromBad = from && !ROOM_NO.test(from) ? ROOM_NO_BAD : undefined;
  let toBad = to && !ROOM_NO.test(to) ? ROOM_NO_BAD : undefined;
  let count = 0;
  let nth = (_i: number) => "";
  if (from && to && !fromBad && !toBad) {
    const f = runs(from), t = runs(to);
    const differ = f.flatMap((r, i) => (r === t[i] ? [] : [i]));
    const i = differ[0] ?? 0, fd = f[i] ?? "";
    const head = from.slice(0, -1), fl = from.charCodeAt(from.length - 1);
    if (from === to) {
      count = 1; nth = () => from;
    } else if (f.length === t.length && differ.length === 1 && isDigits(fd) && isDigits(t[i])) {
      count = Number(t[i]) - Number(fd) + 1;
      nth = (k) => [...f.slice(0, i), String(Number(fd) + k).padStart(fd.length, "0"), ...f.slice(i + 1)].join("");
    } else if (head === to.slice(0, -1) && /[A-Z]$/.test(from) && /[A-Z]$/.test(to)) {
      count = to.charCodeAt(to.length - 1) - fl + 1;
      nth = (k) => head + String.fromCharCode(fl + k);
    } else {
      toBad = "Only one number (or the last letter) may change between From and To.";
    }
    if (!toBad && count < 1) toBad = "To is below From.";
    else if (!toBad && count > MOST) toBad = `At most ${MOST} rooms at a time.`;
    else if (!toBad && nth(count - 1).length > 10) toBad = ROOM_NO_BAD;
    if (toBad) count = 0;
  }
  return { fromBad, toBad, count, nth };
}
export const plural = (n: number) => `${n} room${n === 1 ? "" : "s"}`;

/** RoomSetup.tsx 757-770: what several rooms came to. `unknown`: the reply for that
    number was lost, so whether it was added is not known (MEMORY 16; the phone stops there). */
export function severalWords(done: { added: string[]; skipped: string[]; refused: string[]; unknown: string | null }) {
  const lines = [done.added.length ? `Added ${plural(done.added.length)}: ${done.added.join(", ")}` : "No room was added."];
  if (done.skipped.length) lines.push(`${done.skipped.join(", ")} already ${done.skipped.length === 1 ? "exists" : "exist"}, skipped`);
  lines.push(...done.refused);
  if (done.unknown) lines.push(`Not known whether room ${done.unknown} was added; nothing after it was tried. Look at the rooms before adding again.`);
  return lines;
}

/* ══ CANCELLATION TERMS ═══════════════════════════════════════════ */

/** rateSetup.ts RETENTION_BASES, in the web's order and words. */
export const RETENTION_BASES = [
  { value: "nothing", label: "Nothing" },
  { value: "first_night", label: "The first night" },
  { value: "full_stay", label: "The whole stay" },
  { value: "percent", label: "A percentage of the booking" },
  { value: "flat", label: "A fixed amount" },
] as const;

/** rateSetup.ts CancellationPolicy. */
export interface CancellationPolicy {
  id: string; name: string; freeUntilHours: number | null;
  cancelBasis: string; cancelPercent: number | null; cancelAmount: number | null;
  noShowBasis: string; noShowPercent: number | null; noShowAmount: number | null;
  bookings: number; appliesToNewBookings: boolean;
}

/** CancellationTerms.tsx describe: the terms as a sentence. A flat amount keeps its paise (MEMORY 9). */
export function describe(basis: string, percent: number | null, amount: number | null): string {
  switch (basis) {
    case "nothing": return "Nothing is retained";
    case "first_night": return "The first night";
    case "full_stay": return "The whole stay";
    case "percent": return percent === null ? DASH : `${percent}% of the booking`;
    case "flat": return amount === null ? DASH : rupees(amount);
    default: return DASH;
  }
}

/** CancellationTerms.tsx 160-165. */
export const freeUntil = (hours: number | null) =>
  hours === null ? "No free window" : hours === 0 ? "Check-in time" : `${hours}h before arrival`;

export interface PolicyForm {
  name: string; freeHours: string;
  cancelBasis: string; cancelPercent: string; cancelAmount: string;
  noShowBasis: string; noShowPercent: string; noShowAmount: string;
}
/** The web's starting bases (CancellationTerms.tsx 239, 243): a basis, never a figure. */
export const policyForm = (): PolicyForm => ({
  name: "", freeHours: "", cancelBasis: "first_night", cancelPercent: "", cancelAmount: "",
  noShowBasis: "full_stay", noShowPercent: "", noShowAmount: "",
});

/** CancellationTerms.tsx 249-266: empty is not zero - a blank free window is no free window,
    a typed 0 is free until the check-in instant. Only the figure the basis needs is sent. */
export const policyBody = (f: PolicyForm) => ({
  name: f.name.trim(),
  freeUntilHours: figureOf(f.freeHours),
  cancelBasis: f.cancelBasis,
  cancelPercent: f.cancelBasis === "percent" ? figureOf(f.cancelPercent) : null,
  cancelAmount: f.cancelBasis === "flat" ? figureOf(f.cancelAmount) : null,
  noShowBasis: f.noShowBasis,
  noShowPercent: f.noShowBasis === "percent" ? figureOf(f.noShowPercent) : null,
  noShowAmount: f.noShowBasis === "flat" ? figureOf(f.noShowAmount) : null,
});

/** CancellationTerms.tsx 73-86: the words after Use for new bookings / Stop using. */
export const defaultWords = (p: CancellationPolicy) => ({
  title: p.appliesToNewBookings ? "New bookings carry no terms" : `New bookings will use "${p.name}"`,
  body: "Bookings already taken keep the terms they were made under.",
});

/* ══ BOOKING SOURCES ══════════════════════════════════════════════ */

export type BookingSourceKind = "ota" | "direct" | "corporate" | "travel_agent" | "walk_in" | "other";

/** bookingSources.ts BookingSource. */
export interface BookingSource {
  id: string; name: string; kind: BookingSourceKind; channelCode: string | null;
  isActive: boolean;
  /** THIS property's rate. Null: nobody agreed one - a dash, never 0%. */
  commissionPct: number | null;
  bookings: number;
}

export const SOURCE_KINDS: { value: BookingSourceKind; label: string }[] = [
  { value: "ota", label: "OTA" },
  { value: "travel_agent", label: "Travel agent" },
  { value: "corporate", label: "Corporate account" },
  { value: "direct", label: "Direct" },
  { value: "walk_in", label: "Walk-in" },
  { value: "other", label: "Other" },
];
export const kindLabel = (kind: string) => SOURCE_KINDS.find((k) => k.value === kind)?.label ?? kind;

/** BookingSources.tsx KIND_TONES. */
export const KIND_TONES: Record<string, "info" | "accent" | "neutral" | "success"> = {
  ota: "info", travel_agent: "accent", corporate: "accent", direct: "success", walk_in: "neutral", other: "neutral",
};

/** BookingSources.tsx 211-216. */
export function sourcesLine(rows: BookingSource[]): string {
  if (rows.length === 0) return "Nothing yet. A source is where a booking arrived from.";
  const live = rows.filter((s) => s.isActive).length;
  const priced = rows.filter((s) => s.commissionPct !== null).length;
  return `${live} in use · ${priced} with a commission agreed here`;
}

/** BookingSources.tsx Commission: a percentage, or a dash; never a zero for silence. */
export const commissionOf = (pct: number | null) =>
  pct === null ? DASH : `${pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(2)}%`;

/** CommissionDialog 416-419: blank is "no rate agreed" (null), a real answer. */
export function commissionValue(text: string): { value: number | null; invalid: boolean } {
  const value = figureOf(text.trim());
  return { value, invalid: value !== null && (!Number.isFinite(value) || value < 0 || value > 100) };
}

/** CommissionDialog 467-475: the line that keeps blank and zero apart. */
export function commissionNote(text: string): string {
  const { value } = commissionValue(text);
  if (text.trim() === "") return "Blank means no rate has been agreed. The list shows a dash, and bookings taken through this source record no commission.";
  if (value === 0) return "Zero means you agreed to pay nothing - which is not the same as leaving it blank.";
  return "Copied onto each booking as it is taken. Changing it later does not change bookings already made.";
}

/** CommissionDialog 425-428: the words after Save. */
export const commissionDone = (name: string, value: number | null) =>
  value === null ? `No rate agreed with ${name} here` : `${name} at ${value}% here`;

/* ══ PLACES AND SUPPLIERS ═════════════════════════════════════════ */

export type PlaceKind = "store" | "kitchen" | "bar" | "restaurant" | "public_area" | "office" | "other";
export const PLACE_KIND: Record<PlaceKind, string> = {
  store: "Store - stock is kept here", kitchen: "Kitchen", bar: "Bar", restaurant: "Restaurant",
  public_area: "Public area", office: "Office", other: "Other",
};
export const PLACE_KINDS = Object.keys(PLACE_KIND) as PlaceKind[];
export interface Place { id: string; name: string; kind: PlaceKind; isActive: boolean }
export interface Supplier {
  id: string; name: string; contact: string | null; phone: string | null; email: string | null;
  gstin: string | null; address: string | null; note: string | null; isActive: boolean;
}
export interface PlacesData { mayChange: boolean; whoMay: string | null; places: Place[]; suppliers: Supplier[] }

/* ══ CHANNELS ═════════════════════════════════════════════════════ */

export interface SendRecord {
  onSu: "active" | "deactivated" | null;
  sentAt: string | null; sentAs: string | null; sentResult: string | null; sentOk: boolean | null;
}
export interface ContentRoomType {
  id: string; code: string; name: string; maxOccupancy: number; rackRate: string | null; rooms: number;
  mapping: (SendRecord & { suRoomId: string; suRoomType: number; maxChildren: number; isConnected: boolean }) | null;
}
export interface ContentMealPlan {
  code: string; name: string; includes: string;
  mapping: (SendRecord & { suRatePlanId: string; suMealPlan: number; isConnected: boolean }) | null;
}
export interface SuContent {
  hotel: {
    code: string; name: string; addressLine: string | null; city: string; phone: string | null; email: string | null;
    currency: string; postalCode: string | null; latitude: string | null; longitude: string | null;
  };
  channel: {
    suHotelId: string; countryCode: string | null; contactFirstName: string | null; contactLastName: string | null;
    description: string | null; onSu: boolean;
    contentSentAt: string | null; contentResult: string | null; contentOk: boolean | null;
  } | null;
  roomTypes: ContentRoomType[];
  mealPlans: ContentMealPlan[];
  switchedOn: boolean;
  problems: string[];
  su: { configured: boolean; environment: "sandbox" | "live" | null };
  suRoomTypes: { code: number; name: string }[];
  suMealPlans: { code: number; name: string }[];
}
export interface SuStatus {
  configured: boolean; environment: "sandbox" | "live" | null; missing: string[]; reason: string | null;
  lastLogin: { ok: boolean; at: string; reason: string | null } | null;
  loginsThisHour: number | null; loginsPerHour: number;
}
export interface SendResult { kind: string; name: string; action: string; ok: boolean; reason: string | null }
export interface AriPush {
  kind: "all" | "changes"; from: string; to: string; requests: number; dates: number;
  ok: boolean; result: string; unpricedDates: number; rackDates: number; at: string;
}
export interface AriState { pushes: AriPush[]; atRackRate: { nights: number; firstDate: string | null } }
export interface ChannelBooking {
  id: string; suBookingId: string; channel: string | null;
  status: "new" | "modified" | "cancelled" | "request";
  arrival: string | null; departure: string | null; guestName: string | null; rooms: number;
  currency: string | null; total: string | null; commission: string | null;
  outcome: "received" | "created" | "changed" | "cancelled" | "refused_no_room" | "needs_attention" | "ignored";
  reason: string | null; receivedAt: string; acknowledged: boolean; handled: boolean; cardFieldsRemoved: number;
}

/** SuSetup.tsx OUTCOME. */
export const OUTCOME: Record<ChannelBooking["outcome"], { words: string; tone: "neutral" | "warning" | "danger" | "success" }> = {
  received: { words: "Just arrived", tone: "neutral" },
  created: { words: "Booked", tone: "success" },
  changed: { words: "Changed", tone: "success" },
  cancelled: { words: "Cancelled", tone: "neutral" },
  refused_no_room: { words: "Refused: no room free", tone: "danger" },
  needs_attention: { words: "Needs somebody", tone: "warning" },
  ignored: { words: "Nothing to do", tone: "neutral" },
};

/** SuSetup.tsx 411: a booking somebody still has to deal with. */
export const needsDealing = (b: ChannelBooking) => !b.handled && !["created", "cancelled", "ignored"].includes(b.outcome);

/** A figure the server sends as text ("4099.50"): the rupees it says, paise kept; none a dash. */
export const textRupees = (v: string | null) => (v === null || v.trim() === "" || !Number.isFinite(Number(v)) ? DASH : rupees(Number(v)));

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** The web's dateTime ("d MMM yyyy, h:mm a"), in the phone's own time; a server
    time read through the core's ISO reader first (MEMORY 7). Unreadable: a dash. */
export function whenOf(text: string | null | undefined): string {
  const ms = msAt(text);
  if (ms === null) return DASH;
  const d = new Date(ms);
  const h = d.getHours();
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}, ${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** SuSetup.tsx 435-436 and 505-506: when the sends are blocked. */
export const ariBlocked = (d: SuContent) =>
  !d.su.configured || !d.channel?.onSu || !d.roomTypes.some((x) => x.mapping?.onSu === "active")
  || (d.su.environment === "live" && !d.switchedOn);
export const liveButOff = (d: SuContent) => d.su.environment === "live" && !d.switchedOn;
export const contentBlocked = (d: SuContent) => !d.su.configured || liveButOff(d) || d.problems.length > 0;

/** ChannelManager.tsx 140-147: a booking site's SU code, in words. `name` is SU's name for it, or null. */
export const siteLine = (code: string | null, name: string | null) =>
  !code ? "No SU code: its bookings wait for a person"
    : name ? `SU code ${code} (${name})`
    : `${code}, not one of SU's codes: its bookings wait for a person`;

/* ══ GROUP RATE CHANGE ════════════════════════════════════════════ */

export type ChangeKind = "set" | "by" | "percent";
export const CHANGE_KINDS: { value: ChangeKind; label: string }[] = [
  { value: "set", label: "New price" },
  { value: "by", label: "By ₹" },
  { value: "percent", label: "By %" },
];
export interface RateRun { from: string; through: string; old: number | null; new: number | null }
export interface RatePlan {
  code: string; name: string; roomType: { id: string; name: string; code: string } | null;
  skipped: string | null; runs: RateRun[];
}
export interface RateChangePreview { roomTypes: { name: string; at: string[] }[]; hotels?: RatePlan[]; problem?: string | null }
export interface RateQuestion { hotels: string[]; roomType: string; from: string; through: string; kind: ChangeKind; value: number }

/** GroupRates.tsx 54-58: the question, once it is whole; null until it is. A
    "New price" keeps no minus (the field drops it); the server says the rest. */
export function rateQuestion(a: { hotels: string[]; roomType: string; from: string; through: string; kind: ChangeKind; text: string }): RateQuestion | null {
  const last = a.through && a.through >= a.from ? a.through : a.from;
  const value = figureOf(a.text);
  if (!a.roomType || !a.from || value === null || !Number.isFinite(value) || a.hotels.length === 0) return null;
  return { hotels: a.hotels, roomType: a.roomType, from: a.from, through: last, kind: a.kind, value };
}

/** The field for a kind: a new price takes no minus. */
export const typedChange = (text: string, kind: ChangeKind) => (kind === "set" ? typedPrice(text) : typedSigned(text));

/** GroupRates.tsx 158: the field's label and hint. */
export const changeLabel = (kind: ChangeKind) => (kind === "set" ? "New base per night" : kind === "by" ? "Plus or minus, ₹" : "Plus or minus, %");
export const changeHint = (kind: ChangeKind) => (kind === "set" ? "One guest, room only, as on Rates." : "A minus figure lowers it.");

/** GroupRates.tsx 37-38: a run's days; an old or new price as the server sent it, paise kept. */
export const runDays = (from: string, through: string, short: (d: string) => string) =>
  (from === through ? short(from) : `${short(from)} to ${short(through)}`);
export const priceOrDash = (v: number | null) => (v === null ? DASH : rupees(v));

/** GroupRates.tsx 199-204. */
export const propertiesWord = (n: number) => `${n} ${n === 1 ? "property" : "properties"}`;
export const saveLine = (toSave: number, of: number) =>
  toSave === 0 ? "Nothing to save." : `${toSave} of ${propertiesWord(of)} change.`;
