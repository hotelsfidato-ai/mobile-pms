/* Run: node --experimental-strip-types src/modules/inventory/config.check.ts
   The set-up screens' rules (config.ts): what is typed is what is sent
   (MINV-1: NaN never reaches a body), empty is null and never 0, paise
   kept, a dash for nothing, and the web's own words. */
import {
  commissionNote, commissionOf, commissionValue, describe, figureOf, freeUntil, policyBody, policyForm,
  rateQuestion, roomBody, roomLine, roomRange, roomsOf, severalWords, setupLine, siteLine, sleepsOf, sourcesLine,
  textRupees, typeFirstBody, typeForm, typeMoreBody, typeReady, typedChange, typedCount, typedFigure, typedSigned,
  maxError, baseError, priceOrDash, needsDealing,
  type BookingSource, type ChannelBooking, type RoomSetup, type RoomTypeSetup,
} from "./config.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const noNaN = (body: unknown, what: string) => {
  /* JSON writes NaN as null: look at the object itself. */
  const walk = (v: unknown): boolean => (typeof v === "number" ? Number.isNaN(v) : v && typeof v === "object" ? Object.values(v).some(walk) : false);
  if (walk(body)) throw new Error(`${what}: NaN in the body ${JSON.stringify(body)}`);
};

/* ── What a person types ── */
eq(typedFigure("₹4,099.505"), "4099.50", "a pasted price keeps two places");
eq(typedFigure("12.5%"), "12.5", "a percentage");
eq(typedCount("2 people"), "2", "a count keeps digits");
eq(typedSigned("-₹1,500"), "-1500", "a lowering keeps its minus");
eq(typedSigned("1-500"), "1500", "a minus only in front");
eq(typedChange("-500", "set"), "500", "a new price takes no minus");
eq(typedChange("-10", "percent"), "-10", "a percent may lower");
eq(figureOf(""), null, "empty is no figure");
eq(figureOf("-"), null, "a lone minus is no figure");
eq(figureOf("0"), 0, "a typed 0 is 0");

/* ── Room types ── */
const type: RoomTypeSetup = {
  id: "t1", code: "DLX", name: "Deluxe", baseOccupancy: 2, maxOccupancy: 3, sortOrder: 1, isActive: true,
  rackRate: null, rooms: 8, sellable: 7, baseChildren: 0, maxAdults: null, maxChildren: 1,
  beds: null, viewType: "Garden", sizeSqft: null, colour: null,
};
eq(sleepsOf(type), "2, up to 3", "sleeps");
eq(sleepsOf({ ...type, maxOccupancy: 2 }), "2", "sleeps when the same");
eq(roomsOf(type), "7 of 8", "rooms with one off");
eq(roomsOf({ ...type, sellable: 8 }), "8", "rooms all sellable");
const room: RoomSetup = { id: "r1", number: "301", roomTypeId: "t1", roomType: "Deluxe", floor: 0, smoking: false, isActive: true, occupied: false, position: 1 };
eq(roomLine(room), "Deluxe · Floor 0", "the ground floor is a floor, not nothing");
eq(roomLine({ ...room, floor: null }), "Deluxe", "no floor");
eq(setupLine({ types: [type], rooms: [room, { ...room, id: "r2", isActive: false }] }), "1 room type · 2 rooms, 1 sellable", "the line");
eq(setupLine({ types: [], rooms: [] }), "Nothing is set up yet. Add a room type, then the rooms that are of it.", "nothing set up");

const f = typeForm(type);
eq(typeReady(f, true), true, "an edit is ready");
eq(typeReady({ ...typeForm(null), name: "Suite", code: "S" }, false), false, "a one-letter code is refused");
eq(typeReady({ ...typeForm(null), name: "Suite", code: "STE" }, false), true, "a new type");
eq(typeReady({ ...f, base: "" }, true), false, "no people covered");
eq(baseError({ ...f, base: "0" }), "At least one person.", "base error");
eq(maxError({ ...f, base: "3", max: "2" }), "At least what the rate covers (3).", "max error");
eq(typeFirstBody({ ...typeForm(null), code: "ste", name: " Suite " }, false),
  { code: "STE", name: "Suite", baseOccupancy: 2, maxOccupancy: 3 }, "a new type's body, no price in it");
eq(typeMoreBody(f), { baseChildren: 0, maxAdults: null, maxChildren: 1, beds: null, viewType: "Garden", sizeSqft: null, colour: null }, "empty is null");
noNaN(typeMoreBody({ ...f, size: typedCount("abc"), maxAdults: typedCount("x") }), "typed letters");
eq(roomBody({ number: " 308 ", typeId: "t1", floor: "", smoking: false, active: true }, false),
  { number: "308", roomTypeId: "t1", floor: null, smoking: false }, "an empty floor is no floor");
eq(roomBody({ number: "308", typeId: "t1", floor: "0", smoking: true, active: false }, true),
  { roomTypeId: "t1", floor: 0, smoking: true, isActive: false }, "floor 0 kept");

/* Several rooms (RoomSetup.tsx roomRange). */
const list = (a: string, b: string) => { const r = roomRange(a, b); return Array.from({ length: r.count }, (_, i) => r.nth(i)); };
eq(list("101", "104"), ["101", "102", "103", "104"], "101 to 104");
eq(list("G01", "G03"), ["G01", "G02", "G03"], "zeros kept");
eq(list("111A", "111C"), ["111A", "111B", "111C"], "the last letter");
eq(roomRange("A101", "B102").toBad, "Only one number (or the last letter) may change between From and To.", "two parts change");
eq(roomRange("109", "101").toBad, "To is below From.", "backwards");
eq(roomRange("1", "200").toBad, "At most 100 rooms at a time.", "too many");
eq(severalWords({ added: ["101"], skipped: [], refused: [], unknown: "102" }),
  ["Added 1 room: 101", "Not known whether room 102 was added; nothing after it was tried. Look at the rooms before adding again."], "a lost reply stops the run");

/* ── Cancellation terms ── */
eq(describe("flat", null, 1500.5), "₹1,500.50", "a flat fee keeps its paise");
eq(describe("flat", null, null), "-", "no amount is a dash");
eq(describe("percent", 50, null), "50% of the booking", "a percentage");
eq(describe("first_night", null, null), "The first night", "a basis");
eq(freeUntil(null), "No free window", "no window");
eq(freeUntil(0), "Check-in time", "0 hours is the check-in instant");
eq(freeUntil(24), "24h before arrival", "hours");
const pf = { ...policyForm(), name: " Flexible ", cancelBasis: "flat", cancelAmount: "1500.50", cancelPercent: "99" };
eq(policyBody(pf), {
  name: "Flexible", freeUntilHours: null, cancelBasis: "flat", cancelPercent: null, cancelAmount: 1500.5,
  noShowBasis: "full_stay", noShowPercent: null, noShowAmount: null,
}, "only the figure the basis needs; an empty window is null, never 0");
eq(policyBody({ ...pf, freeHours: "0" }).freeUntilHours, 0, "a typed 0 hours is sent as 0");
eq(policyBody({ ...pf, cancelAmount: "" }).cancelAmount, null, "an empty amount is null - the server asks for it");
noNaN(policyBody({ ...pf, cancelAmount: typedFigure("₹ abc") }), "letters in the amount");

/* ── Booking sources ── */
eq(commissionOf(null), "-", "no rate agreed");
eq(commissionOf(0), "0%", "zero agreed");
eq(commissionOf(17.5), "17.50%", "two places");
eq(commissionValue(""), { value: null, invalid: false }, "blank is no rate");
eq(commissionValue("0"), { value: 0, invalid: false }, "zero is a rate");
eq(commissionValue("101"), { value: 101, invalid: true }, "over 100");
eq(commissionNote("0"), "Zero means you agreed to pay nothing - which is not the same as leaving it blank.", "zero's note");
const src = (over: Partial<BookingSource>): BookingSource => ({ id: "s", name: "Agoda", kind: "ota", channelCode: null, isActive: true, commissionPct: null, bookings: 0, ...over });
eq(sourcesLine([src({}), src({ isActive: false, commissionPct: 0 })]), "1 in use · 1 with a commission agreed here", "the line counts a 0% as agreed");
eq(siteLine(null, null), "No SU code: its bookings wait for a person", "no code");
eq(siteLine("AGODA", null), "AGODA, not one of SU's codes: its bookings wait for a person", "not SU's");
eq(siteLine("189", "Agoda"), "SU code 189 (Agoda)", "SU's");

/* ── Channels ── */
eq(textRupees("4099.50"), "₹4,099.50", "a total in text keeps paise");
eq(textRupees(null), "-", "no total");
const b = { handled: false, outcome: "needs_attention" } as ChannelBooking;
eq(needsDealing(b), true, "a booking waiting for a person");
eq(needsDealing({ ...b, outcome: "created" }), false, "a booked one");

/* ── Group rate change ── */
const ask = { hotels: ["5EL", "AGR"], roomType: "Deluxe", from: "2026-11-20", through: "2026-11-18", kind: "by" as const, text: "-500" };
eq(rateQuestion(ask), { hotels: ["5EL", "AGR"], roomType: "Deluxe", from: "2026-11-20", through: "2026-11-20", kind: "by", value: -500 }, "a Through before From is From");
eq(rateQuestion({ ...ask, text: "-" }), null, "a lone minus is not a question");
eq(rateQuestion({ ...ask, text: "" }), null, "nothing typed");
eq(rateQuestion({ ...ask, roomType: "" }), null, "no room type");
noNaN(rateQuestion({ ...ask, text: typedSigned("₹-1,2a3.456") }), "a pasted figure");
eq(priceOrDash(null), "-", "nobody priced it");
eq(priceOrDash(3222.22), "₹3,222.22", "paise kept");

console.log("inventory set-up rules: ok");
