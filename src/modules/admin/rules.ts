/* ══════════════════════════════════════════════════════════════════
   ADMINISTRATION'S WORDS AND RULES — ported from the web, each with its
   source; nothing here is the phone's own unless it says so.
     src/modules/admin/pages/People.tsx, SignIns.tsx, Activity.tsx,
       SystemHealth.tsx, Properties.tsx, Admin.tsx (Users, Audit log,
       Integrations, Modules), backfill/BackfillPage.tsx
     src/modules/admin/data/*.ts (the shapes the API answers)
     src/modules/admin/components/TaxInUse.tsx, src/modules/finance/place.ts
   Every figure is the server's: the phone adds nothing up (BRIEF-T3), and a
   figure not sent is a dash, never a zero.
   Pure: no React Native here, so `rules.check.ts` runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { instant } from "../../core/format.ts";
import { dateShort, dateTime } from "../guest-services/rules.ts";
import { minPasswordFor, roleLabel } from "./roles.ts";

export { dateShort, dateTime, instant };
export const DASH = "-";

/* ── Figures, as the web writes them (src/lib/format.ts) ────────── */

const grouped = new Intl.NumberFormat("en-IN");
/** number(): Indian grouping; a dash for nothing. */
export const number = (n: number | null | undefined) => (n == null ? DASH : grouped.format(n));
const inrPrecise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
/** moneyPrecise(): ₹1,20,000.00, paise shown (backfill's figures); a dash for a figure nobody typed. */
export const precise = (n: number | null | undefined) => (n == null ? DASH : inrPrecise.format(n));
/** TaxInUse.tsx amount: a boundary exactly - whole rupees when whole, else with its paise. */
export const boundary = (n: number) => (Number.isInteger(n) ? inr.format(n) : inrPrecise.format(n));

/* ── People (pages/People.tsx; GET /api/admin/staff) ───────────── */

export interface Access { code: string; role: string; testOf?: string | null }
export interface AdminStaff {
  id: string; email: string; name: string; phone: string | null;
  canSignIn: boolean; isGroupAdmin: boolean; isActive: boolean;
  homeScreen: string;
  /** What the signed-in person may do to them: the server's own answers (127). */
  mayEdit: boolean; maySwitch: boolean; maySetPassword: boolean;
  twoStepOn?: boolean; mayTwoStepOff?: boolean;
  access: Access[];
}
/** A property the signed-in person may roster at, with the roles they may give there (app.grantable_roles). */
export interface RosterPlace { code: string; name: string; roles: string[]; testOf?: string | null }
export interface PeopleList { staff: AdminStaff[]; rosterAt: RosterPlace[] }

/** The places offered: the real hotels, and a group administrator's test hotels too (People.tsx). */
export function placesOf(rosterAt: readonly RosterPlace[], testCodes: ReadonlySet<string>, groupAdmin: boolean) {
  const real = rosterAt.filter((p) => !testCodes.has(p.code));
  const test = groupAdmin ? rosterAt.filter((p) => testCodes.has(p.code)) : [];
  return { real, test, all: [...real, ...test] };
}

/** The page head's line (People.tsx PageHeader description). */
export function peopleLine(rows: readonly AdminStaff[], read: boolean, mayAdd: boolean): string {
  const active = rows.filter((s) => s.isActive);
  return (rows.length === 0 ? "Nobody yet."
    : `${active.length} active · ${active.filter((s) => s.isGroupAdmin).length} can reach every property`)
    + (read && !mayAdd ? ". Adding somebody is for a group administrator, or a property's general manager or Admin." : "");
}

/** Signed in and able to reach nothing (People.tsx `stranded`). */
export const strandedOf = (rows: readonly AdminStaff[]) =>
  rows.filter((s) => s.isActive && !s.isGroupAdmin && s.access.length === 0);
export const strandedLine = (stranded: readonly AdminStaff[]) =>
  `${stranded.length === 1 ? "One person can" : `${stranded.length} people can`} sign in and see nothing`;

/** The ✕ on a chip: never your own (D24-19), and only a place you run, in a role you could give there
    (the owner, 24 September: nobody removes somebody above them). */
export const mayTake = (person: AdminStaff, a: Access, me: string, places: readonly RosterPlace[]) =>
  person.id !== me && places.some((p) => p.code === a.code && p.roles.includes(a.role));

/** Give a property: not a group administrator, and a place they do not hold yet. */
export const mayGrant = (person: AdminStaff, places: readonly RosterPlace[]) =>
  !person.isGroupAdmin && places.some((p) => !person.access.some((a) => a.code === p.code));

/** GrantDialog's places: only those they do not already hold; somebody who works only in test hotels is
    offered only test hotels (D27-296 (6)). */
export function grantable(person: AdminStaff, places: readonly RosterPlace[], testCodes: ReadonlySet<string>) {
  const testOnly = person.access.length > 0 && person.access.every((a) => testCodes.has(a.code));
  return {
    testOnly,
    places: places
      .filter((p) => !person.access.some((a) => a.code === p.code))
      .filter((p) => !testOnly || testCodes.has(p.code)),
  };
}

/** AddPersonDialog: the role used when none is picked - Reception where it may be given, else the first. */
export const chosenRole = (roles: readonly string[], picked: string) =>
  roles.includes(picked) ? picked : roles.includes("front_desk") ? "front_desk" : roles[0] ?? "";

/** AddPersonDialog's `ready`, and the shortest password for it. */
export function addReady(f: { name: string; email: string; password: string; needsPlace: boolean; place: RosterPlace | undefined; role: string }) {
  const min = minPasswordFor(f.needsPlace ? [f.role] : []);
  const ready = Boolean(f.name.trim()) && f.email.trim().includes("@") && f.password.length >= min
    && (!f.needsPlace || (Boolean(f.place) && Boolean(f.role)));
  return { min, ready };
}

/** The toast after Add (AddPersonDialog submit). */
export function addedWords(f: { name: string; existed: boolean; test: boolean; placeRequired: boolean; code: string; role: string }) {
  const name = f.name.trim();
  return {
    title: f.existed ? `${name} was already here` : `${name} added`,
    body: f.test
      ? `They can sign in now, and they work at ${f.code} as ${roleLabel(f.role).toLowerCase()}, in the test hotel only.`
      : f.placeRequired
        ? `They can sign in now, and they work at ${f.code} as ${roleLabel(f.role).toLowerCase()}.`
        : "They can sign in now. Give them a property next - until then the app opens empty for them.",
  };
}

/** The first screen after sign-in (src/lib/homeScreen.ts HOME_SCREENS; the route takes these three). */
export const HOME_SCREENS: readonly { value: string; label: string }[] = [
  { value: "dashboard", label: "Dashboard" }, { value: "rooms", label: "Rooms" }, { value: "calendar", label: "Calendar" },
];

/* ── Users (pages/Admin.tsx UsersPage; GET /api/hotels/:code/staff, adminLists.ts) ── */

export interface ApiStaff {
  id: string; name: string; email: string; role: string | null; roles: string[];
  isGroupAdmin: boolean; properties: string | null; status: "active" | "inactive"; lastSeen: string | null;
}
/** listStaff's translation: a group administrator holds no role at a property (QA AD-2); an unknown role
    is a viewer, which grants the least. */
export function staffRecord(r: ApiStaff) {
  const known = r.role !== null && roleLabel(r.role) !== r.role;
  const role = known ? r.role! : "read_only";
  return {
    id: r.id, name: r.name, email: r.email, role,
    roleLabel: r.isGroupAdmin ? "Group administrator" : roleLabel(role),
    properties: r.properties ? [r.properties] : [],
    status: r.status, lastSeen: r.lastSeen,
  };
}
export const STAFF_STATUS: Record<string, string> = { active: "Active", invited: "Invited", inactive: "Inactive" };

/* ── Sign-ins (pages/SignIns.tsx) ───────────────────────────────── */

export interface SignIn { id: string; at: string; device: string | null; signedOutAt: string | null; signedOutBy: string | null }

/** "Chrome on Windows", from the browser's own description; null when it says nothing known (SignIns.tsx). */
export function deviceInWords(description: string | null): string | null {
  if (!description) return null;
  const d = description;
  const browser = /Edg\//.test(d) ? "Edge" : /OPR\//.test(d) ? "Opera"
    : /(Chrome|CriOS)\//.test(d) ? "Chrome" : /(Firefox|FxiOS)\//.test(d) ? "Firefox"
    : /Safari\//.test(d) ? "Safari" : null;
  const system = /iPhone/.test(d) ? "iPhone" : /iPad/.test(d) ? "iPad" : /Android/.test(d) ? "Android"
    : /Windows/.test(d) ? "Windows" : /Mac OS X/.test(d) ? "Mac" : /Linux/.test(d) ? "Linux" : null;
  return browser && system ? `${browser} on ${system}` : browser ?? system;
}
/** The "Now" column. */
export const signInNow = (r: SignIn) =>
  r.signedOutAt ? `Signed out ${dateTime(r.signedOutAt)} by ${r.signedOutBy ?? DASH}` : "Signed in";

/* ── Audit log and Activity (Admin.tsx AuditLogPage, Activity.tsx) ── */

export interface AuditEntry {
  id: string; at: string; businessDate: string; actor: string | null;
  action: string; subject: string; detail: string; kind: "charge" | "payment" | "reversal";
}
/** A page, and one more asked for to know whether there is an older page (QA AD-4). */
export const AUDIT_PAGE = 100;
export const ACTIVITY_PAGE = 50;
export function paged<T>(rows: readonly T[] | undefined, size: number) {
  return { rows: (rows ?? []).slice(0, size), older: (rows?.length ?? 0) > size };
}
/** The badge: "No entries" or "Entries 101-200". */
export const entriesWords = (page: number, size: number, n: number) =>
  n === 0 ? "No entries" : `Entries ${page * size + 1}-${page * size + n}`;

export interface ActivityChange { field: string; from?: string | null; to?: string | null; masked?: true }
export interface ActivityEntry {
  id: string; at: string; actor: string | null; kind: string; table: string;
  record: string | null; action: string; changes: ActivityChange[];
}
export interface ActivityPage { entries: ActivityEntry[]; kinds: { key: string; label: string }[]; people: { id: string; name: string }[] }
/** A guest's detail reads "changed": the server never sends it. */
export const changeWords = (c: ActivityChange) => (c.masked ? "changed" : `${c.from ?? DASH} → ${c.to ?? DASH}`);

/** A day the API takes ("YYYY-MM-DD"): typed on the phone, checked before it is asked (the route says
    "A date is written YYYY-MM-DD."); blank is no filter. The phone's own, for want of a date picker. */
export const dayOrBlank = (text: string): string | null => {
  const t = text.trim();
  if (t === "") return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(t) && !Number.isNaN(Date.parse(`${t}T00:00:00Z`)) ? t : null;
};

/** The query the two logs send: blank filters are left out (adminLists.ts). */
export function queryOf(q: Record<string, string | number | undefined>) {
  const parts = Object.entries(q).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

/* ── Integrations (adminLists.ts listIntegrations) ─────────────── */

export interface HereAnswer { signIn: boolean; sending: boolean; sendingNote: string | null }
export interface SuAnswer {
  configured: boolean; environment: "sandbox" | "live" | null; reason: string | null;
  lastLogin: { ok: boolean; at: string; reason: string | null } | null;
}
export interface Integration { id: string; name: string; kind: string; setUp: boolean; detail: string }
/** What THIS server has set up, as the server reports it (QA AD-1). No key, secret or address is in
    either answer, and none is shown: only Set up / Not set up and these sentences. */
export function integrationsOf(here: HereAnswer, su: SuAnswer): Integration[] {
  return [
    {
      id: "firebase", name: "Password sign-in (Firebase)", kind: "Platform", setUp: here.signIn,
      detail: here.signIn
        ? "This server holds its Firebase service account, which password sign-in needs."
        : "This server holds no Firebase service account: nobody can sign in with a password here, and no sign-in account can be made.",
    },
    {
      id: "su", name: "Channel manager (SU)", kind: "Channel manager", setUp: su.configured,
      detail: !su.configured ? (su.reason ?? "SU's settings are not on this server.")
        : `SU's ${su.environment === "live" ? "live" : "test"} account is set up on this server. `
          + (su.lastLogin
            ? `Last login ${dateTime(su.lastLogin.at)}: ${su.lastLogin.ok ? "it worked" : su.lastLogin.reason ?? "it failed"}.`
            : "No login tried since the server started."),
    },
    {
      id: "sending", name: "WhatsApp and email", kind: "Messages", setUp: here.sending,
      detail: here.sendingNote ?? "The sending workflow's address and secret are on this server.",
    },
  ];
}

/* ── System health (pages/SystemHealth.tsx, data/systemHealth.ts) ── */

export interface TrafficSlot { requests: number; errors: number; p95Ms: number | null }
export interface Traffic extends TrafficSlot { series: TrafficSlot[] }
export interface SystemHealth {
  version: string; startedAt: string; uptimeSeconds: number;
  pool: { inUse: number; waiting: number; max: number };
  disk: { freeBytes: number; totalBytes: number } | null;
  backup: { state: "passed" | "failed" | "unknown" | "none" | "unreadable"; at: string | null; offsite: "copied" | "failed" | "this disk only" | null };
  databaseBytes: number;
  traffic: { hour: Traffic; day: Traffic; week: Traffic };
  slowest: { method: string; route: string; requests: number; avgMs: number; maxMs: number }[];
  errors: { place: string; what: string; count: number; last: string }[];
  slowQueries: { what: string; count: number; maxMs: number | null; last: string }[];
  hotels: { code: string; name: string; businessDate: string; today: string; lastAuditAt: string | null; lastRun: string | null }[];
  leadsReads?: { cap: number | null; days: { day: string; reads: number }[] };
}

export const bytes = (n: number) =>
  n >= 1024 ** 3 ? `${(n / 1024 ** 3).toFixed(1)} GB` : `${Math.round(n / 1024 ** 2)} MB`;
export const ms = (n: number) => (n >= 1000 ? `${n / 1000} s` : `${n} ms`);
/** "within 250 ms", "over 10 s", or a dash with nothing to measure. */
export const within = (p95: number | null) => (p95 === null ? DASH : p95 === -1 ? "over 10 s" : `within ${ms(p95)}`);
export function uptime(seconds: number): string {
  const d = Math.floor(seconds / 86400), h = Math.floor((seconds % 86400) / 3600), m = Math.floor((seconds % 3600) / 60);
  return d > 0 ? `${d} d ${h} h` : h > 0 ? `${h} h ${m} min` : `${m} min`;
}
/** How far behind a hotel's day is (data/systemHealth.ts auditLag): both dates the hotel's own, from the server.
    Read as days at UTC midnight, so a phone's engine reads them (MEMORY 7). */
export const auditLag = (businessDate: string, today: string) =>
  Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${businessDate}T00:00:00Z`)) / 86_400_000);
export function auditDay(businessDate: string, today: string): { tone: "success" | "warning" | "danger"; words: string } {
  const lag = auditLag(businessDate, today);
  if (lag <= 0) return { tone: "success", words: "Up to date" };
  if (lag === 1) return { tone: "warning", words: "Yesterday not closed yet" };
  return { tone: "danger", words: `Behind by ${lag} days` };
}
export const BACKUP: Record<SystemHealth["backup"]["state"], { value: string; note: string }> = {
  passed: { value: "Restored and checked", note: "" },
  failed: { value: "Failed", note: "The nightly check failed. Read /var/log/fidato-backup.log on the server." },
  unknown: { value: DASH, note: "The last run left no result. It may still be running." },
  none: { value: DASH, note: "No nightly backup has run on this server." },
  unreadable: { value: DASH, note: "The server may not read the backup log, so this cannot say." },
};
export const OFFSITE: Record<NonNullable<SystemHealth["backup"]["offsite"]>, string> = {
  copied: "Copied", failed: "Failed", "this disk only": "This disk only",
};
/** The disk's free share, as the web rounds it; null when the server did not say. */
export const freeShare = (disk: SystemHealth["disk"]) => (disk ? disk.freeBytes / disk.totalBytes : null);
/** Errors, then slow queries, as one list (SystemHealth.tsx `problems`). */
export const problemsOf = (h: Pick<SystemHealth, "errors" | "slowQueries">) => [
  ...h.errors.map((e) => ({ key: `e${e.place}${e.what}`, what: `Error ${e.what}`, where: e.place, count: e.count, last: e.last })),
  ...h.slowQueries.map((q) => ({ key: `q${q.what}`, what: q.what, where: `Slow query${q.maxMs ? `, up to ${ms(q.maxMs)}` : ""}`, count: q.count, last: q.last })),
];

/* ── Properties (pages/Properties.tsx, TaxInUse.tsx) ────────────── */

/** GET /api/hotels/:code (src/data/repositories/types.ts Property), the fields the card reads. */
export interface Property { id: string; name: string; address: string; rooms: number; roomTypes: string[]; checkInTime: string; checkOutTime: string }
/** GET /api/admin/hotels (data/admin.ts AdminProperty), a group administrator's. */
export interface AdminProperty {
  id: string; code: string; name: string; city: string | null; state: string | null; gstin: string | null;
  addressLine: string | null; isActive: boolean; rooms: number; roomTypes: string[]; checkedIn: number; testOf?: string | null;
}
export type TaxKind = "room" | "restaurant" | "bar" | "banquet" | "spa" | "alcohol" | "laundry" | "other";
export interface TaxInUse { kind: TaxKind; slabs: Array<{ overAmount: number; rate: number }> }

/** finance/place.ts placeLine: the address and its place on one line, the place once (QA FI-16). */
export function placeLine(address: string | null, city: string | null, state: string | null): string {
  const after = city && (address ?? "").toLowerCase().includes(city.toLowerCase()) ? null
    : [city, state].filter(Boolean).join(", ") || null;
  return [address, after].filter(Boolean).join(", ");
}

export const TAX_KINDS: readonly TaxKind[] = ["room", "restaurant", "bar", "banquet", "spa", "alcohol", "laundry", "other"];
const TAX_KIND_LABEL: Record<TaxKind, string> = {
  room: "Rooms", restaurant: "Restaurant", bar: "Bar", banquet: "Banquet", spa: "Spa", alcohol: "Alcohol",
  laundry: "Laundry", other: "Everything else",
};
/** data/taxInUse.ts getTaxInUse: lowest boundary first. */
export const taxOf = (body: { kinds: Array<{ kind: TaxKind; slabs: Array<{ overAmount: number | string; rate: number | string }> }> }): TaxInUse[] =>
  body.kinds.map((k) => ({
    kind: k.kind,
    slabs: [...k.slabs].map((s) => ({ overAmount: Number(s.overAmount), rate: Number(s.rate) })).sort((a, b) => a.overAmount - b.overAmount),
  }));
/** TaxInUse.tsx taxLine: "-" (nobody has set one), "5%", or "5% up to ₹7,500 · 18% above ₹7,500". */
export function taxLine(slabs: TaxInUse["slabs"]): string {
  if (slabs.length === 0) return DASH;
  if (slabs.length === 1 && slabs[0]!.overAmount === 0) return `${number(slabs[0]!.rate)}%`;
  return slabs.map((s, i) => {
    const next = slabs[i + 1];
    const from = s.overAmount === 0 ? "" : ` above ${boundary(s.overAmount)}`;
    const to = next ? ` up to ${boundary(next.overAmount)}` : "";
    return `${number(s.rate)}%${from}${to}`;
  }).join(" · ");
}
/** TaxInUseRows: one row per kind, in a fixed order; alcohol (VAT) only where it is listed. */
export const taxRows = (tax: readonly TaxInUse[]) =>
  TAX_KINDS.flatMap((kind) => {
    const rules = tax.find((k) => k.kind === kind);
    if (!rules && kind === "alcohol") return [];
    return [{ key: kind, label: `${kind === "alcohol" ? "VAT" : "GST"} on ${TAX_KIND_LABEL[kind].toLowerCase()}`, value: taxLine(rules?.slabs ?? []) }];
  });

/** Runs this property: owner, GM or Admin AT it - who the server lets open its page (app.manages_hotel). */
export const runs = (scope: { hotels: Array<{ hotelId: string; role: string }> }, hotelId: string | undefined) =>
  scope.hotels.some((g) => g.hotelId === hotelId && ["owner", "gm", "admin"].includes(g.role));

/* ── Modules (Admin.tsx MODULE_COPY, ModulesSettings) ───────────── */

export const MODULE_COPY: Record<string, { label: string; note: string }> = {
  pos: { label: "Point of sale", note: "The till, the kitchen pass and the menu. Turning it off also stops an outside till posting bills to this property." },
  banquet: { label: "Banquet hall", note: "The diary, the halls and their packages. A hall cannot be sold twice for the same session. Off means those screens go and the API refuses them." },
  reception_pos: { label: "Reception can use the POS", note: "Reception staff take, bill and settle orders at the till. Off hides the point of sale from Reception and the API refuses them; every other role is unaffected." },
  laundry: { label: "Laundry", note: "A guest's laundry, charged to their room, and the hotel's own linen going out and coming back. Off means the screens go and the API refuses them." },
  spa: { label: "Spa", note: "Treatments, the day's diary, and each one charged to the guest's room. Off means the screens go and the API refuses them." },
  alcohol: { label: "Serves alcohol", note: "Alcohol on the menu, taxed as VAT rather than GST: its own rate on the tax card, and one VAT line on the bill. Off means no menu section can sell it and the till refuses it." },
  bar_stock: { label: "Bar stock", note: "The bar's store and counter, their counts, the counter's requests, the bar bills and the FLR registers; every KOT takes its drinks off the counter and the night audit waits for the count. Off means those screens go, the API refuses them, KOTs take nothing and the night audit does not wait." },
  loyalty: { label: "Loyalty", note: "Members earn points on their stays here and use them on their room charges. Off means nobody joins, earns or uses points at this property." },
  feedback_survey: { label: "Feedback survey", note: "After check-out the guest's own page asks for scores out of 5 and a comment, once a stay, and a review request carries the link. Off means nobody is asked." },
  channel_manager: { label: "Channel manager", note: "Rooms, rates and bookings shared with Booking.com, Agoda and the other sites through SU. Off means this property sends them nothing and takes no booking from them." },
  booking_company: { label: "Company section", note: "Bill a booking to a company, with its GSTIN; and the guest's own company name, GSTIN and address. Off, every new booking is billed to the guest and those three fields are not shown." },
  booking_notes: { label: "Notes section", note: "A note kept on the booking." },
};
/** Admin.tsx BOOKING_SECTION: New booking's fold-open sections have their own card. */
export const bookingSection = (module: string) => module.startsWith("booking_");
export const moduleLabel = (module: string) => MODULE_COPY[module]?.label ?? module;
/** The toast after a switch (ModulesCard toggle). */
export const switchedWords = (module: string, enabled: boolean) =>
  ({ title: enabled ? "Turned on" : "Turned off", body: `${moduleLabel(module)} at this property.` });

/* ── Backfill (backfill/BackfillPage.tsx, data/backfill.ts) ─────── */

export interface Trail {
  enteredBy: string | null; enteredAt: string | null; changedBy: string | null; changedAt: string | null;
  changeReason: string | null; removedBy: string | null; removedAt: string | null; removedReason: string | null;
}
export interface BackfillStay extends Trail {
  id: string; guestName: string; nationality: string; idType: string; idNumber: string | null;
  formCReference: string | null; room: string; arrival: string; departure: string;
  roomCharges: number | null; gst: number | null; otherCharges: number | null; otherChargesFor: string | null;
  paid: number | null; paidBy: string | null; billNumber: string | null; sendBill: boolean;
  message: { status: "sent" | "failed"; at: string | null; detail: string | null } | null;
}
export interface BackfillBill extends Trail {
  id: string; outlet: string; billDate: string; billNumber: string | null;
  amount: number | null; gst: number | null; total: number | null; paidBy: string | null; note: string | null;
}
export interface BackfillCash extends Trail { id: string; cashDate: string; direction: "in" | "out"; amount: number; purpose: string; person: string }
export interface BackfillView {
  firstDay: string; today: string; mayWrite: boolean; showsId: boolean;
  outlets: { id: string; name: string }[];
  stays: BackfillStay[]; bills: BackfillBill[]; cash: BackfillCash[];
}
export type BackfillKind = "stays" | "bills" | "cash";
/** BackfillPage READ_ONLY: the Accountant's sentence, where the server says `mayWrite` false. */
export const BACKFILL_READ_ONLY = "Only the owner, an administrator or the general manager enters and corrects these.";
/** Why Remove is not offered on a row: the server's `mayWrite`, or a removed line. */
export const removeWhy = (v: Pick<BackfillView, "mayWrite">, row: Pick<Trail, "removedAt">) =>
  !v.mayWrite ? BACKFILL_READ_ONLY : row.removedAt ? "A removed line stays as it was." : null;
/** trailWords: who removed or corrected it, and why. */
export const trailWords = (r: Pick<Trail, "changeReason" | "changedBy" | "removedReason" | "removedBy">) =>
  r.removedReason ? `Removed by ${r.removedBy ?? DASH}: ${r.removedReason}`
    : r.changeReason ? `Corrected by ${r.changedBy ?? DASH}: ${r.changeReason}` : null;
export const live = (rows: readonly { removedAt: string | null }[]) => rows.filter((r) => !r.removedAt).length;
/** guests/ID_TYPES's words, the ones a backfilled stay carries. */
export const ID_WORDS: Record<string, string> = {
  aadhaar: "Aadhaar", passport: "Passport", driving_licence: "Driving licence", voter_id: "Voter ID", pan: "PAN card", other: "Other",
};
