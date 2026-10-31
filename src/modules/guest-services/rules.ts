/* ══════════════════════════════════════════════════════════════════
   GUEST SERVICES' WORDS AND RULES — ported from the web, each with its
   source; nothing here is the phone's own unless it says so.
     src/modules/guest-services/pages/Requests.tsx, WakeUpCalls.tsx,
       LostProperty.tsx and data/*.ts (the shapes)
     src/modules/online-checkin/pages/Desk.tsx, formIII.ts, data/desk.ts,
       MessagesToTheDesk.tsx
     src/lib/format.ts dateShort ("d MMM yyyy") and dateTime
       ("d MMM yyyy, h:mm a") - NOT the core's dateShort, which is "d MMM"
   Pure: no React Native here, so `rules.check.ts` runs under node.
   ══════════════════════════════════════════════════════════════════ */

import type { Team } from "./roles.ts";

/* ── Dates, as the web writes them ─────────────────────────────── */

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** A day ("2026-10-17") is that day on the phone's clock; a moment is read
    on the phone's clock, as the web's browser does. ponytail: the web reads
    a bare day as UTC midnight - the same day in India, where it runs. */
const toDate = (v: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(Number(v.slice(0, 4)), Number(v.slice(5, 7)) - 1, Number(v.slice(8))) : new Date(v);

/** "17 Oct 2026" (the web's dateShort); a dash for nothing. */
export function dateShort(v: string | null | undefined): string {
  if (!v) return "-";
  const d = toDate(v);
  return Number.isNaN(d.getTime()) ? "-" : `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
}

/** "17 Oct 2026, 9:05 AM" (the web's dateTime). */
export function dateTime(v: string | null | undefined): string {
  if (!v) return "-";
  const d = toDate(v);
  if (Number.isNaN(d.getTime())) return "-";
  const h = d.getHours() % 12 || 12;
  return `${dateShort(v)}, ${h}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "AM" : "PM"}`;
}

/* ── Guest requests (Requests.tsx, data/requests.ts) ───────────── */

export interface GuestRequest {
  id: string;
  team: Team;
  room: string | null;
  /** Null for a role that does not read guests. */
  guest: string | null;
  what: string;
  /** When the guest would like it, in their words. */
  when: string | null;
  status: "open" | "in_progress" | "done" | "cancelled";
  fromGuest: boolean;
  raisedBy: string | null;
  raisedAt: string;
  takenBy: string | null;
  closedAt: string | null;
  resolution: string | null;
  /** Waiting so far while open; how long it took once closed. */
  minutes: number;
}
export interface InHouse { reservationId: string; room: string; guest: string | null }
export interface RequestList { teams: Team[]; requests: GuestRequest[]; rooms: InHouse[] }

export const TEAM_LABEL: Record<Team, string> = {
  housekeeping: "Housekeeping", maintenance: "Something broken", fnb: "Food and drink",
};

/** 12 min · 1 h 5 min · 2 d 3 h */
export const minutes = (m: number) =>
  m < 60 ? `${m} min`
    : m < 1440 ? `${Math.floor(m / 60)} h ${m % 60} min`
      : `${Math.floor(m / 1440)} d ${Math.floor((m % 1440) / 60)} h`;

export const isClosed = (r: { status: string }) => r.status === "done" || r.status === "cancelled";

/** The card's grey line: room, guest, who raised it, how long, who has it. */
export function requestLine(r: GuestRequest): string {
  const closed = isClosed(r);
  return (r.room ? `Room ${r.room}` : "-")
    + (r.guest ? ` · ${r.guest}` : "")
    + (r.fromGuest ? " · from the guest's page" : r.raisedBy ? ` · raised by ${r.raisedBy}` : "")
    + (closed
      ? ` · took ${minutes(r.minutes)}${r.takenBy ? ` · ${r.status === "done" ? "done" : "taken"} by ${r.takenBy}` : ""}`
      : ` · waiting ${minutes(r.minutes)}${r.takenBy ? ` · ${r.takenBy} has it` : " · nobody has taken it"}`);
}

/** What a close asks first, or null for one tap: Done on something broken
    asks what was done; Cancel on any asks why (the server refuses either
    without words). */
export function closeAsks(team: Team, action: "done" | "cancel") {
  if (action === "cancel") return { label: "Why it is cancelled", hint: null, button: "Cancel the request", danger: true };
  if (team === "maintenance") {
    return { label: "What was done", hint: "The line somebody reads the next time this breaks.", button: "Done", danger: false };
  }
  return null;
}

/* ── Wake-up calls (WakeUpCalls.tsx, data/wakeAndLost.ts) ──────── */

export interface WakeUpCall {
  id: string;
  status: "asked" | "set" | "done" | "cancelled";
  fromGuest: boolean;
  room: string | null;
  guest: string | null;
  /** On the hotel's clock: "2026-08-26T07:00". */
  callAt: string;
  note: string | null;
  setBy: string | null;
  handledBy: string | null;
  handledAt: string | null;
  cancelReason: string | null;
  /** Set, and fifteen minutes away or past (D27-241). */
  due: boolean;
}

/** "17 Oct 2026, 07:00" - the hotel's clock, as the server wrote it. */
export const wakeWhen = (callAt: string) => `${dateShort(callAt.slice(0, 10))}, ${callAt.slice(11, 16)}`;

export function wakeLine(w: WakeUpCall): string {
  return (w.room ? `Room ${w.room}` : "-") + (w.guest ? ` · ${w.guest}` : "")
    + (w.fromGuest ? " · asked from the guest's page" : w.setBy ? ` · set by ${w.setBy}` : "")
    + (w.handledBy ? ` · ${w.status === "done" ? "called" : "cancelled"} by ${w.handledBy}` : "");
}

/** The API's TIME (wakeAndLost.ts). */
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
/** The phone's own (the web has a time input): "7:30", "730" and "0730"
    are read as 07:30; anything else is null, and the call is not offered. */
export function timeOf(raw: string): string | null {
  const s = raw.trim().replace(".", ":");
  const m = /^(\d{1,2}):?(\d{2})$/.exec(s);
  if (!m) return null;
  const t = `${m[1]!.padStart(2, "0")}:${m[2]}`;
  return TIME.test(t) ? t : null;
}

/** The phone's own: the web's date input is a calendar from today; here,
    the next `n` days from the hotel's today, each as that input writes it
    (the value the API takes, the words "31-10-2026"). ponytail: a list, no
    date-picker package; @react-native-community/datetimepicker 9.1.0 if the
    owner wants the phone's own calendar. */
export function daysFrom(today: string, n: number): { value: string; label: string }[] {
  const start = Date.parse(`${today}T00:00:00Z`);
  return Array.from({ length: n }, (_, i) => {
    const value = new Date(start + i * 86_400_000).toISOString().slice(0, 10);
    return { value, label: `${value.slice(8)}-${value.slice(5, 7)}-${value.slice(0, 4)}` };
  });
}

/* ── Lost property (LostProperty.tsx) ──────────────────────────── */

export interface LostItem {
  id: string; what: string; foundWhere: string; room: string | null; keptWhere: string | null;
  foundOn: string; daysKept: number; foundBy: string | null;
  status: "kept" | "returned" | "disposed";
  returnedTo: string | null; disposeReason: string | null; handledBy: string | null; handledOn: string | null;
}

export function foundLine(i: LostItem): string {
  return `Found ${i.room ? `in room ${i.room}, ` : ""}${i.foundWhere} · ${dateShort(i.foundOn)}`
    + (i.foundBy ? ` by ${i.foundBy}` : "")
    + (i.status === "kept" ? ` · ${i.daysKept} ${i.daysKept === 1 ? "day" : "days"} kept` : "");
}

/** Where it went, once cleared; null while kept. */
export function clearedLine(i: LostItem): string | null {
  const when = i.handledOn ? `, ${dateShort(i.handledOn)}` : "";
  if (i.status === "returned") return `To ${i.returnedTo}${i.handledBy ? `, by ${i.handledBy}` : ""}${when}`;
  if (i.status === "disposed") return `${i.disposeReason}${i.handledBy ? ` - ${i.handledBy}` : ""}${when}`;
  return null;
}

/* ── Online check-in, the desk (Desk.tsx, data/desk.ts, formIII.ts) ── */

export interface WaitingDetails {
  id: string; guest: string; reference: string; idType: string;
  /** An Aadhaar arrives as its last four digits (D21-18). */
  idNumber: string; fromDigilocker: boolean;
  passportExpiry: string | null; visaNumber: string | null; visaExpiry: string | null;
  addressLine: string | null; city: string | null; country: string | null;
  submittedAt: string;
  more: Record<string, string | boolean>;
  photo: { id: string; sides: ("front" | "back")[]; at: string } | null;
}
export interface OpenRequest {
  id: string; kind: string; what: string; wanted: string | null; createdAt: string; guest: string; reference: string;
}
export interface RoomCardRow { id: string; number: string; cardSince: string | null }
export interface DeskView {
  waiting: WaitingDetails[];
  requests: OpenRequest[];
  rooms: RoomCardRow[];
  idPhotos?: { on: boolean; off: string | null; keeper: boolean };
}

export const ID_LABEL: Record<string, string> = {
  aadhaar: "Aadhaar", passport: "Passport", driving_licence: "Driving licence", voter: "Voter ID", other: "Other ID",
};
export const KIND_LABEL: Record<string, string> = { spa: "Spa", laundry: "Laundry" };

const GENDERS: Record<string, string> = { female: "Female", male: "Male", transgender: "Transgender" };
const PURPOSES: Record<string, string> = {
  tourism: "Tourism", business: "Business", employment: "Employment", medical: "Medical",
  student: "Study", conference: "Conference", others: "Something else",
};
/** Each field's question, in the order the guest's form asks it (formIII.ts LABELS). */
const LABELS: Record<string, string> = {
  expectedArrival: "Arriving at about", specialRequests: "Requests", nationality: "Nationality",
  gender: "Gender", dateOfBirth: "Date of birth", passportIssuedOn: "Passport issued on",
  passportIssuePlace: "Passport issued at", passportIssueCountry: "Passport issued by", visaType: "Visa type",
  visaIssuedOn: "Visa issued on", visaIssuePlace: "Visa issued at", visaIssueCountry: "Visa issued by",
  arrivedFrom: "Coming from", previousStay: "Stayed before this at", purpose: "Purpose of the visit",
  purposeOther: "The purpose, in their words", arrivedInIndiaOn: "Arrived in India on",
  arrivalPort: "Arrived in India at", mobileInIndia: "Mobile in India", phoneInIndia: "Phone in India",
  mobileAbroad: "Mobile abroad", phoneAbroad: "Phone abroad", employedInIndia: "Employed in India",
  refAddress: "Address in India", refCity: "City in India", refState: "State in India", refPincode: "PIN code in India",
};
const DATES = new Set(["dateOfBirth", "passportIssuedOn", "visaIssuedOn", "arrivedInIndiaOn"]);

/** What the guest sent, label then value, only what they filled in, in the
    form's order (Desk.tsx's list and formIII.ts moreLines). */
export function detailLines(d: WaitingDetails): [string, string][] {
  const lines: [string, string][] = [
    [ID_LABEL[d.idType] ?? d.idType, `${d.idNumber}${d.fromDigilocker ? " · from DigiLocker" : ""}`],
  ];
  if (d.passportExpiry) lines.push(["Passport expires", dateShort(d.passportExpiry)]);
  if (d.visaNumber) lines.push(["Visa", `${d.visaNumber}${d.visaExpiry ? `, expires ${dateShort(d.visaExpiry)}` : ""}`]);
  const address = [d.addressLine, d.city, d.country].filter(Boolean).join(", ");
  if (address) lines.push(["Address", address]);
  const more = d.more ?? {};
  for (const k of Object.keys(LABELS)) {
    const v = more[k];
    if (v === undefined || v === "") continue;
    lines.push([LABELS[k]!, typeof v === "boolean" ? (v ? "Yes" : "No")
      : DATES.has(k) ? dateShort(v)
        : k === "gender" ? GENDERS[v] ?? v
          : k === "purpose" ? PURPOSES[v] ?? v
            : k === "nationality" && v === "IN" ? "Indian"
              : v]);
  }
  return lines;
}

/** The ID photo sent with the details, said (IdPhotosAtDesk.tsx). */
export const photoLine = (p: { sides: string[]; at: string }) =>
  `ID photo: ${p.sides.includes("back") ? "front and back" : "front"}, sent ${dateTime(p.at)}.`;

/** "ID photos kept": the list, never the image (data/desk.ts KeptPhoto). */
export interface KeptPhoto {
  id: string; guest: string; reference: string; sides: string[]; at: string;
  /** Null: the guest sent it from their own page. */
  addedBy: string | null; notYetDeleted: boolean;
}
export const keptLine = (p: KeptPhoto) =>
  `${p.reference} · ${p.sides.includes("back") ? "front and back" : "front"} · ${dateTime(p.at)} · ${p.addedBy ? `added by ${p.addedBy}` : "sent by the guest"}`;

/* ── Messages to the desk, and replies (MessagesToTheDesk.tsx) ─── */

export interface DeskMessage {
  id: string; what: string; createdAt: string; guest: string; reference: string; reservationId: string;
  handledBy: string | null; handledAt: string | null;
}
export interface DeskReply { id: string; what: string; sentAt: string; sentBy: string | null }
export interface DeskMessages { messages: DeskMessage[]; replies?: DeskReply[]; canReply?: boolean }

/** The guest's messages and the desk's replies, in one list, newest first. */
export function thread(m: DeskMessages): Array<{ at: string; m: DeskMessage; r: null } | { at: string; m: null; r: DeskReply }> {
  return [
    ...m.messages.map((x) => ({ at: x.createdAt, m: x, r: null as null })),
    ...(m.replies ?? []).map((x) => ({ at: x.sentAt, m: null as null, r: x })),
  ].sort((a, b) => b.at.localeCompare(a.at));
}

export const unread = (m: DeskMessages) => m.messages.filter((x) => !x.handledAt).length;

/** The API's bound (guestMessages.ts): 1 to 500 characters, trimmed. */
export const replyFits = (what: string) => what.trim().length >= 1 && what.trim().length <= 500;
