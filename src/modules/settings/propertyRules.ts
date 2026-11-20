/* ══════════════════════════════════════════════════════════════════
   SETTINGS → PROPERTY on a phone (lane mobile/m13-set-property, P): the
   pure rules and words of the web's Property pages, ported by hand from
   the PMS (16 Nov release), each with its source named:

     src/modules/admin/data/property.ts       HIGHLIGHTS, POLICY_TEXTS
     src/modules/admin/data/admin.ts          PROPERTY_TYPES
     src/modules/admin/pages/property/Policies.tsx   childAgeWords
     src/modules/admin/components/GroupCard.tsx       the office fields
     src/modules/admin/data/groupSettings.ts  logoSrc
     src/modules/admin/setup/steps.ts         the 18 steps, word for word
     src/modules/admin/setup/SetupPage.tsx    state words, the open step,
                                              the summary's two lists
     src/modules/admin/pages/property/Documents.tsx  the five documents
     src/modules/admin/oldData/OldDataPage.tsx  its counts in words
     src/lib/format.ts                        addDays

   No React Native here: node checks it (propertyRules.check.ts).
   ══════════════════════════════════════════════════════════════════ */

/* ── The hotel's texts (data/property.ts) ─────────────────────────── */

export const HIGHLIGHTS = [
  ["about", "About the property"], ["attractions", "Local attractions"],
  ["directions", "Directions and transport"], ["activities", "Activities nearby"],
  ["landmarks", "Famous landmarks"],
] as const;
export const POLICY_TEXTS = [
  ["parking", "Parking and arrival"], ["family", "Family and extra guests"],
  ["reservation_terms", "Reservation terms"],
] as const;
export type TextKind = (typeof HIGHLIGHTS)[number][0] | (typeof POLICY_TEXTS)[number][0];
/** TextEditor.tsx: 2000 characters; saved blank, the text is removed (the server trims). */
export const TEXT_MOST = 2000;

export interface Registration { label: string; number: string }
export interface PropertyProfile {
  registrations: Registration[];
  texts: Partial<Record<TextKind, string>>;
  childFreeAge: number | null; childMaxAge: number | null;
  map: { latitude: number; longitude: number } | null;
}
export interface Amenity { id: string; name: string; icon: string; isActive: boolean; on: boolean; used: boolean }

/* ── The property's own details (data/admin.ts) ───────────────────── */

/** The owner's list (D27-214): the stored word and what people read. */
export const PROPERTY_TYPES: readonly [string, string][] = [
  ["hotel", "Hotel"], ["resort", "Resort"], ["boutique_hotel", "Boutique hotel"],
  ["heritage_hotel", "Heritage hotel"], ["homestay", "Homestay"], ["villa", "Villa"],
  ["serviced_apartment", "Serviced apartment"], ["guest_house", "Guest house"], ["other", "Other"],
];
export const typeWord = (word: string | null) => PROPERTY_TYPES.find(([w]) => w === word)?.[1] ?? "-";

/** PropertyDetail.property: the admin card's row and the profile (D27-214), null = nobody has said. */
export interface PropertyDetail {
  property: {
    id: string; code: string; name: string; city: string | null; state: string | null; gstin: string | null;
    phone: string | null; email: string | null; addressLine: string | null; isActive: boolean;
    rooms: number; roomTypes: string[]; checkedIn: number;
    addressLine2: string | null; pin: string | null; website: string | null; pan: string | null;
    reservationsPhone: string | null; propertyType: string | null; starRating: number | null;
    latitude: string | null; longitude: string | null; reservationsContact: string | null;
    fssaiNumber: string | null; housePolicies: string[];
  };
}
export const PROFILE_FIELDS = [
  "addressLine2", "pin", "website", "pan", "reservationsPhone", "propertyType", "starRating",
  "latitude", "longitude", "reservationsContact",
] as const;
export type ProfileField = (typeof PROFILE_FIELDS)[number];

/** The map point as the web's PropertyProfileCard draws it: both, or a dash. */
export const mapPoint = (p: { latitude: string | null; longitude: string | null }) =>
  p.latitude && p.longitude ? `${p.latitude}, ${p.longitude}` : "-";

/* ── Child ages (Policies.tsx) ────────────────────────────────────── */

/** "Children up to 5 stay free; 6 to 12 are children; 13 and over are adults." */
export function childAgeWords(free: number | null, max: number | null): string | null {
  if (free === null && max === null) return null;
  const parts = [
    free !== null ? `Children up to ${free} stay free` : null,
    max !== null ? `${free !== null ? free + 1 : "up"} to ${max} are children` : null,
    max !== null ? `${max + 1} and over are adults` : null,
  ].filter(Boolean);
  return `${parts.join("; ")}.`;
}
/** A typed age as the request carries it: blank is "not set" (null); whole digits are the number;
    anything else goes as typed, so the server answers in its own words ("An age is a whole number
    up to 17."). The web sends Number(text), whose NaN JSON makes null - quietly clearing the age
    (MSET-P1); the phone never does. */
export const ageOf = (text: string): number | string | null => {
  const t = text.trim();
  return t === "" ? null : /^\d+$/.test(t) ? Number(t) : t;
};
/** The words beside the two fields, for what is typed (a number only where one is typed). */
export const typedAgeWords = (free: string, max: string) => {
  const n = (t: string) => { const v = ageOf(t); return typeof v === "number" ? v : null; };
  return childAgeWords(n(free), n(max));
};

/* ── House policies (VoucherSettings.tsx HousePoliciesCard) ────────── */

/** One policy a line, as typed; the server drops blank lines and holds the limits (8, 200 each). */
export const policyLines = (typed: string) => typed.split("\n");

/* ── Moving one row of a list (Amenities.tsx, HotelGalleryCard.tsx) ── */

/** The ids in their new order: the row at `from` swapped with its neighbour `from + by`. */
export function moved(ids: readonly string[], from: number, by: -1 | 1): string[] | null {
  const to = from + by;
  if (from < 0 || to < 0 || to >= ids.length) return null;
  const out = [...ids];
  [out[from], out[to]] = [out[to]!, out[from]!];
  return out;
}
/** Amenities.tsx's search: the name holds what is typed, ignoring case. */
export const findAmenities = (list: readonly Amenity[], search: string) =>
  list.filter((a) => a.name.toLowerCase().includes(search.trim().toLowerCase()));

/* ── Logos (data/groupSettings.ts) ────────────────────────────────── */

export interface Logo { type: string; data: string }
export type GroupOffice = Record<"address" | "phone" | "email" | "website" | "gstin" | "instagram", string | null>;
export interface GroupRead { name: string | null; logo: Logo | null; hotelLogo?: Logo | null; office?: GroupOffice }

/** What a logo is for the phone: a PNG it can draw, an SVG it does not draw (the website does), or
    none - or nothing for anything that is not one of the two pictures the server accepts (logoSrc). */
export function logoOf(logo: Logo | null | undefined): { kind: "png"; uri: string } | { kind: "svg" } | null {
  if (!logo || !/^[A-Za-z0-9+/]+=*$/.test(logo.data)) return null;
  if (logo.type === "image/png") return { kind: "png", uri: `data:image/png;base64,${logo.data}` };
  return logo.type === "image/svg+xml" ? { kind: "svg" } : null;
}

/** GroupCard.tsx OFFICE (the form's order) and SHOWN (the card's). */
export const OFFICE: readonly [keyof GroupOffice, string, string?][] = [
  ["address", "Office address"], ["phone", "Phone"], ["email", "Email"], ["website", "Website"],
  ["gstin", "GSTIN"], ["instagram", "Instagram", "As it should print, such as @fidatohotels."],
];
export const OFFICE_SHOWN: readonly (keyof GroupOffice)[] = ["address", "phone", "gstin", "email", "website", "instagram"];

/** "Group name saved": the words after it. */
export const groupNameSaid = (name: string | null) =>
  name ? `Bills print "by ${name}" from now on.` : "Bills print the hotel's name alone.";

/* ── Dates (src/lib/format.ts addDays) ─────────────────────────────── */

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
/** This device's date, YYYY-MM-DD (isoDate(new Date())): only where the hotel has not said its own. */
export const deviceDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** dateCompact of a day: "21 Nov". */
export const dayCompact = (iso: string) => `${Number(iso.slice(8, 10))} ${MON[Number(iso.slice(5, 7)) - 1] ?? "-"}`;

/* ── Set up this hotel: the 18 steps (setup/steps.ts, word for word) ── */

export const STEP_IDS = [
  "profile", "taxes", "room-types", "rooms", "prices",
  "payments", "front-desk", "cancellation", "charges", "booking-sources", "people", "messages", "modules",
  "branding", "policies", "lists", "connections",
  "go-live",
] as const;
export type StepId = (typeof STEP_IDS)[number];
export type GroupKey = "must" | "opening" | "optional" | "summary";
export interface SetupScreen { label: string; to: string }
export interface SetupStepInfo { id: StepId; number: number; group: GroupKey; title: string; what: string; why: string; screens: SetupScreen[] }

export const SETUP_GROUPS: ReadonlyArray<{ key: GroupKey; title: string; note: string }> = [
  { key: "must", title: "Must be done before the first booking",
    note: "These five are what the hotel needs before it can sell a room and bill it correctly." },
  { key: "opening", title: "Before opening",
    note: "The hotel can take a booking without these, but should not open its doors until they are done." },
  { key: "optional", title: "Optional",
    note: "Worth doing, and nothing waits on them." },
  { key: "summary", title: "Ready to go live", note: "" },
];

const ROWS: Omit<SetupStepInfo, "number">[] = [
  { id: "profile", group: "must", title: "Hotel profile",
    what: "The hotel's name, GSTIN, address, phone and email.",
    why: "They print on every bill and booking voucher, and the GSTIN is what makes a tax invoice valid.",
    screens: [{ label: "Profile", to: "/settings/property/profile" }] },
  { id: "taxes", group: "must", title: "Taxes",
    what: "The GST added to room charges, by price slab.",
    why: "Without it a room charge cannot be worked out, so no booking can be billed.",
    screens: [{ label: "Taxes", to: "/settings/rates/taxes" }] },
  { id: "room-types", group: "must", title: "Room types",
    what: "The kinds of room you sell, such as Deluxe or Suite, and how many guests each one takes.",
    why: "Every room belongs to a type, and every price is set against one.",
    screens: [{ label: "Room types", to: "/settings/rooms/room-types" }] },
  { id: "rooms", group: "must", title: "Rooms",
    what: "Each room by its number and type. Add a room can add several at once.",
    why: "The Rooms board, bookings and housekeeping all work from this list.",
    screens: [{ label: "Room types", to: "/settings/rooms/room-types" }] },
  { id: "prices", group: "must", title: "Prices",
    what: "The nightly price of every room type.",
    why: "A booking takes its price from here. A room type with no price cannot be sold.",
    screens: [{ label: "Rates", to: "/h/:code/rates" }] },

  { id: "payments", group: "opening", title: "Payment methods and bank details",
    what: "How guests can pay at this hotel, and the bank account that transfers go to.",
    why: "Reception picks from these when taking money, and the bank details print on the booking voucher.",
    screens: [
      { label: "Payment methods", to: "/settings/money/payment-methods" },
      { label: "Bank details", to: "/settings/money/bank" },
    ] },
  { id: "front-desk", group: "opening", title: "Front desk times and rules",
    what: "Check-in and check-out times, and the rules reception works by on a new booking.",
    why: "The times print on vouchers, and the rules decide what a booking must carry before it is saved.",
    screens: [
      { label: "Times and rules", to: "/settings/front-desk/times-and-rules" },
      { label: "Front desk rules", to: "/settings/front-desk/front-desk" },
    ] },
  { id: "cancellation", group: "opening", title: "Cancellation terms",
    what: "What a cancellation or a no-show costs at this hotel.",
    why: "Guests ask what happens if they cancel, and reception needs one answer to give them.",
    screens: [{ label: "Cancellation terms", to: "/h/:code/cancellation-terms" }] },
  { id: "charges", group: "opening", title: "Charges, discounts and commission",
    what: "The extra charges a booking may add, the discounts staff may give, and what each booking source takes.",
    why: "New booking offers exactly these, so a charge or discount that is not here cannot be added.",
    screens: [
      { label: "Extra charges", to: "/settings/money/extra-charges" },
      { label: "Room discounts", to: "/settings/money/discounts" },
      { label: "Commission", to: "/settings/money/commission" },
    ] },
  { id: "booking-sources", group: "opening", title: "Booking sources",
    what: "Where bookings come from: walk-ins, phone calls, the website, and each travel site or agent.",
    why: "Every booking records its source, and reports and commission are worked out by it.",
    screens: [{ label: "Booking sources", to: "/h/:code/booking-sources" }] },
  { id: "people", group: "opening", title: "People and roles",
    what: "The people who work at this hotel, the role each one has, and the password they sign in with.",
    why: "A role decides what a person can see and do, so nobody gets more than their work needs.",
    screens: [{ label: "People", to: "/people" }] },
  { id: "messages", group: "opening", title: "Guest messages and daily reports",
    what: "The messages guests get by themselves, and the report emailed after each night audit.",
    why: "Guests hear about their booking without anyone sending it, and the owners get the day's figures.",
    screens: [
      { label: "Guest messages on/off", to: "/settings/messages/switches" },
      { label: "Daily report emails", to: "/settings/messages/daily-report-emails" },
      { label: "Guest messages", to: "/h/:code/guest-messages" },
    ] },
  { id: "modules", group: "opening", title: "Modules",
    what: "The parts of the system this hotel uses, such as the restaurant and the banquet hall.",
    why: "A part that is switched off is hidden from the menu and refused by the server, so switch on what the hotel really has.",
    screens: [{ label: "Modules", to: "/settings/connections/modules" }] },

  { id: "branding", group: "optional", title: "Logo, photos and highlights",
    what: "The hotel's logo, its photos, and the short texts guests read about it.",
    why: "The logo prints on documents, and guests see the photos and highlights on their booking page.",
    screens: [
      { label: "Logo and photos", to: "/settings/property/photos" },
      { label: "Highlights", to: "/settings/property/highlights" },
    ] },
  { id: "policies", group: "optional", title: "Group and house policies",
    what: "The house rules guests are asked to follow, the texts they read about parking, families and reservation terms, and the group's name and office details.",
    why: "Guests and staff read the same words, instead of each person answering in their own.",
    screens: [
      { label: "Policies", to: "/settings/property/policies" },
      { label: "Group", to: "/settings/property/group" },
    ] },
  { id: "lists", group: "optional", title: "The lists",
    what: "The short lists staff pick from: market segments, reservation types, reasons, holidays, ID types and VIP levels.",
    why: "Staff choose from these on bookings and bills, so a missing entry is a missing choice.",
    screens: [
      { label: "Market segments", to: "/settings/lists/market-segments" },
      { label: "Reservation types", to: "/settings/lists/reservation-types" },
      { label: "Ready reasons", to: "/settings/lists/reasons" },
      { label: "Holidays", to: "/settings/lists/holidays" },
      { label: "ID types", to: "/settings/lists/id-types" },
      { label: "VIP levels", to: "/settings/lists/vip" },
    ] },
  { id: "connections", group: "optional", title: "Connections",
    what: "The links to outside systems: the channel manager, CRS bookings and other integrations, and whether each one is working.",
    why: "Needed only if the hotel takes bookings from online sellers or sends its figures to other systems.",
    screens: [
      { label: "Channel manager", to: "/h/:code/channels" },
      { label: "CRS bookings", to: "/h/:code/crs-bookings" },
      { label: "Integrations", to: "/admin/integrations" },
      { label: "Connection health", to: "/settings/connections/connection-health" },
    ] },

  { id: "go-live", group: "summary", title: "Ready to go live",
    what: "A summary of what is done and what is still waiting.",
    why: "It switches nothing on and locks nothing. You can change anything, at any time.",
    screens: [] },
];
export const STEPS: readonly SetupStepInfo[] = ROWS.map((row, i) => ({ ...row, number: i + 1 }));
export const stepInfo = (id: string | null | undefined) => STEPS.find((s) => s.id === id);

/** The step that hangs on a file the phone cannot choose yet, and the sentence it says (BRIEF-T4). */
export const ON_A_FILE: Partial<Record<StepId, string>> = {
  branding: "The logo and the photos are each a file: choosing one is on the website for now. The highlights can be typed here.",
};

/* data/setup.ts */
export type StepState = "done" | "todo" | "later" | "remind";
export interface SetupStepState {
  id: StepId; state: StepState; automatic: boolean; detail: string | null;
  remindOn: string | null; by: string | null; at: string | null;
}
export interface SetupView { steps: SetupStepState[]; ready: boolean }
export type StepChoice = { choice: "completed" | "later" | "clear" } | { choice: "remind"; remindOn: string };

const STATE_WORDS: Record<StepState, string> = { done: "Done", todo: "To do", later: "Later", remind: "Remind me" };
export const stateText = (s: Pick<SetupStepState, "state" | "remindOn">): string =>
  s.state === "remind" && s.remindOn ? `Remind me ${dayCompact(s.remindOn)}` : STATE_WORDS[s.state];
export const STATE_TONE: Record<StepState, "success" | "neutral" | "warning" | "info"> = {
  done: "success", todo: "neutral", later: "warning", remind: "info",
};

/** A step the server did not name is shown as not done, never as done. */
export const rowOf = (view: SetupView | undefined, id: StepId): SetupStepState =>
  view?.steps.find((s) => s.id === id) ?? { id, state: "todo", automatic: false, detail: null, remindOn: null, by: null, at: null };

/** The step open first: the one asked for, else the first still to do, else the summary. */
export const openStep = (view: SetupView, asked?: string | null): StepId =>
  stepInfo(asked)?.id ?? STEPS.find((s) => s.id !== "go-live" && rowOf(view, s.id).state === "todo")?.id ?? "go-live";

export const doneIn = (view: SetupView, group: GroupKey) =>
  STEPS.filter((s) => s.group === group && rowOf(view, s.id).state === "done").length;

/** May the person take it back: parked (Later, Remind me), or ticked by hand. */
export const mayUndo = (s: SetupStepState) =>
  s.state === "later" || s.state === "remind" || (s.state === "done" && !s.automatic);

/** Step 18 (Summary): what is left (the person's own parked first), what is done, what a first booking still needs. */
export function summaryOf(view: SetupView) {
  const work = STEPS.filter((s) => s.id !== "go-live");
  const state = (id: StepId) => rowOf(view, id).state;
  const parked = new Set(view.steps.filter((s) => s.state === "later" || s.state === "remind").map((s) => s.id));
  const left = work.filter((s) => state(s.id) !== "done")
    .sort((a, b) => Number(parked.has(b.id)) - Number(parked.has(a.id)) || a.number - b.number);
  return {
    left,
    done: work.filter((s) => state(s.id) === "done"),
    missing: work.filter((s) => s.group === "must" && state(s.id) !== "done"),
  };
}

/** The reminder's quick choices (REMIND_IN). */
export const REMIND_IN: ReadonlyArray<[string, number]> = [["Tomorrow", 1], ["In 3 days", 3], ["In a week", 7]];

/* ── The checklist on Profile (data/commissioning.ts, CommissioningCard.tsx) ── */

export interface CommissioningCheck { id: string; label: string; done: boolean; detail: string | null; blocking: boolean; to: string | null }
export interface Commissioning { property: string; checks: CommissioningCheck[]; done: number; total: number; canTakeABooking: boolean; blockedBy: string[] }

/** Drawn only while something is missing. */
export const showsChecklist = (d: Commissioning | null | undefined): d is Commissioning =>
  !!d && !(d.canTakeABooking && d.done === d.total);
export function checklistLine(d: Commissioning): string {
  const blocking = d.checks.filter((c) => !c.done && c.blocking).length;
  return blocking === 0
    ? "Everything that stops a booking is settled. The rest is worth doing and does not block anything."
    : `${blocking === 1 ? "One thing" : `${blocking} things`} must be settled first - until then a booking, a bill or the night audit will refuse and say so.`;
}
/** A check's web address: a settings page as it is, anything else under the hotel. */
export const checkAddress = (to: string, code: string) => (to.startsWith("/settings") ? to : `/h/${code}${to}`);

/* ── Documents (pages/property/Documents.tsx) ──────────────────────── */

export type Doc = "invoice" | "proforma" | "card" | "voucher" | "restaurant";
export const DOCS: ReadonlyArray<[Doc, string]> = [
  ["invoice", "Tax invoice"], ["proforma", "Proforma bill"], ["card", "Registration card"],
  ["voucher", "Booking voucher"], ["restaurant", "Restaurant bill"],
];
const AT_CHECKOUT: Record<string, string> = {
  print: "Issued and printed by itself when the guest checks out.",
  offer: "Offered on the bill after check-out: Issue tax invoice.",
  invoices: "Issued on Invoices; nothing happens at check-out.",
};
/** When each is printed (the hotel's own front desk rules for the invoice), and where that is set. */
export function docWhen(doc: Doc, rules: { invoiceAtCheckout?: string; invoiceCopies?: number } | undefined, code: string) {
  switch (doc) {
    case "invoice": return {
      when: `${AT_CHECKOUT[rules?.invoiceAtCheckout ?? "print"] ?? AT_CHECKOUT.print} ${(rules?.invoiceCopies ?? 2) >= 2
        ? "Two copies: ORIGINAL FOR RECIPIENT and DUPLICATE FOR SUPPLIER." : "One copy."}`,
      where: { to: "/settings/front-desk/front-desk", label: "Front desk rules" },
    };
    case "proforma": return { when: "From the Bill tab's Proforma bill, at any time before the tax invoice. Never by itself.", where: null };
    case "card": return {
      when: "From Print registration card on the guest's panel, once checked in. Never by itself. The house policies print above the signature.",
      where: { to: "/settings/property/policies", label: "Policies" },
    };
    case "voucher": return {
      when: "Sent with the booking's confirmation, by e-mail or WhatsApp, and opened by View voucher.",
      where: { to: `/h/${code}/guest-messages`, label: "Guest messages" },
    };
    case "restaurant": return { when: "From the till's Print bill, or by the bill printer at the printing station.", where: null };
  }
}

/* ── Bring in old data (data/oldSystem.ts, OldDataPage.tsx) ───────── */

export type ImportKind = "guests" | "bookings";
export const KIND_WORDS: Record<ImportKind, string> = { guests: "Guests", bookings: "Bookings and past stays" };
export interface ImportRecord {
  id: string; kind: ImportKind; system: string; fileName: string;
  rowsIn: number; rowsRefused: number; refused: { line: number; reason: string }[];
  sendVouchers: boolean; madeAt: string; madeBy: string | null; undoneAt: string | null; undoneBy: string | null;
  guests: number; filled: number; bookings: number; stays: number; advances: number;
}
export interface ImportsView {
  may: boolean; reason?: string; businessDate?: string; firstDay?: string; voucherOn?: boolean;
  imports?: ImportRecord[];
  noRate?: { id: string; reference: string; guest: string; arrival: string; roomType: string }[];
}
const many = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;
/** "Brought in": its own counts in words, a dash for none. */
export const broughtWords = (d: ImportRecord) =>
  [d.guests && many(d.guests, "guest"), d.filled && `${d.filled} filled in`, d.bookings && many(d.bookings, "booking"),
    d.stays && many(d.stays, "past stay"), d.advances && many(d.advances, "advance")].filter(Boolean).join(", ") || "-";
/** The vouchers column: a guest list sends none. */
export const voucherWords = (d: ImportRecord) => (d.kind === "guests" ? "-" : d.sendVouchers ? "Sent" : "Not sent");
/** What a kind of file holds, as the card under the form says it. */
export const kindNote = (kind: ImportKind, firstDay: string) =>
  kind === "guests"
    ? "Name, phone, email, address, nationality, ID type and number (only its last four are kept), date of birth, company and GSTIN, notes. A guest already on file by phone or email is shown, and you choose: keep, merge (only empty fields are filled) or skip."
    : `Bookings to come become ordinary confirmed bookings, never overbooked; a rate left blank is a dash, set at the desk before arrival. An advance becomes a payment on the booking, dated the day it was paid (before ${firstDay}), never an invoice. A stay already over comes in as history only: no bill, no tax, no report changes.`;
