import type { ExportTable } from "../../core/exportDoc.ts";
import { DASH } from "../../core/format.ts";
import { whyNot } from "../inventory/roles.ts";

/* ══════════════════════════════════════════════════════════════════
   MARKETING — the shapes, the rules and the words (mobile/m13-sales,
   19 Nov). Ported from the web's src/modules/marketing/pages/Marketing.tsx
   and data/numbers.ts; the server is api/src/modules/marketing/numbers.ts
   (GET /:code/marketing/numbers?month=YYYY-MM), gated
   see("marketing", "marketing numbers") in roleGate.ts: the owner, an
   administrator and the GM (D22-17, D27-170).

   One month, by the stays' arrival date. Spend is the leads app's, read
   live; bookings and revenue are this system's own stays (booked value,
   room charges before tax, cancelled and no-shows out: the server's
   NIGHTS). Every figure is the server's row: the phone adds nothing up
   (no total line, as the web has none). A figure nobody has is null: a
   dash. NOTHING HERE SENDS: the guest lists that would (logic/lists.ts on
   the web) have no screen and no route yet (the web's MODULE.md).
   ══════════════════════════════════════════════════════════════════ */

/** data/numbers.ts CampaignLine. */
export interface CampaignLine {
  key: string;
  name: string | null;
  platform: string | null;
  /** From the leads app. Null: not read, or no spend recorded that month. */
  spend: number | null;
  bookings: number;
  /** Numeric text from the database; null where no stay has a charge. */
  revenue: string | null;
}
/** data/numbers.ts SourceLine. */
export interface SourceLine { id: string | null; name: string | null; bookings: number; revenue: string | null }
/** data/numbers.ts MarketingNumbers. */
export interface MarketingNumbers {
  month: string;
  connected: boolean;
  inApp: boolean;
  appError: string | null;
  campaigns: CampaignLine[];
  sources: SourceLine[];
}

/** roleGate.ts: GET /marketing/numbers is see("marketing", "marketing numbers"). */
export const whyNotMarketing = (role: string | null) =>
  whyNot({ resource: ["marketing"], action: "view", doing: "Reading marketing numbers" }, role);

/* ── The figures ─────────────────────────────────────────────────── */

const whole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const paise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** The web's rupees(): money(Number(v)), a dash for none. The phone keeps paise where the server
    sent them (MEMORY 9) and writes a whole amount as the web does ("₹11,097"). */
export function rupees(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return DASH;
  const n = Number(v);
  if (!Number.isFinite(n)) return DASH;
  return Number.isInteger(n) ? whole.format(n) : paise.format(n);
}

const PLATFORM: Record<string, string> = { meta: "Meta Ads", google: "Google Ads", other: "Other ads" };
export const platformWords = (p: string | null) => (p ? PLATFORM[p] ?? p : DASH);
export const campaignName = (r: Pick<CampaignLine, "name" | "key">) => r.name ?? r.key;
export const sourceName = (r: Pick<SourceLine, "name">) => r.name ?? "No source recorded";

/** Why spend may show dashes, in one line under the campaigns (Marketing.tsx spendNote). */
export function spendNote(d: Pick<MarketingNumbers, "connected" | "inApp" | "appError"> | null | undefined): string | null {
  if (!d) return null;
  if (!d.connected) return "Spend is read from the leads app, which is not connected yet.";
  if (!d.inApp) return "This property is not one of the leads app's hotels, so it has no spend.";
  return d.appError;
}

/* ── The month ───────────────────────────────────────────────────── */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "October 2026" (the web's month input writes "October, 2026"). */
export function monthLabel(m: string): string {
  const x = /^(\d{4})-(\d{2})$/.exec(m);
  const name = x ? MONTHS[Number(x[2]) - 1] : undefined;
  return x && name ? `${name} ${x[1]}` : DASH;
}

/** "YYYY-MM" of a "YYYY-MM-DD" day: the month the page opens on. The web takes the browser's
    month; the phone takes the property's own today (its real date, D27-237). */
export const monthOf = (day: string) => day.slice(0, 7);

/** The phone's own (the web has a month input; no date-picker package, M-13): the months to
    choose from, newest first - `ahead` months after `from` down to `back` before it. */
export function monthChoices(from: string, ahead = 12, back = 24): { value: string; label: string }[] {
  const y = Number(from.slice(0, 4));
  const m = Number(from.slice(5, 7)) - 1;
  const out: { value: string; label: string }[] = [];
  for (let i = ahead; i >= -back; i--) {
    const n = y * 12 + m + i;
    const value = `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, "0")}`;
    out.push({ value, label: monthLabel(value) });
  }
  return out;
}

/* ── The words ───────────────────────────────────────────────────── */

export const TITLE = "Marketing";
export const UNDER =
  "One month, by arrival date. Spend from the leads app; bookings and revenue from this system's own stays, room charges before tax.";
export const CAMPAIGNS = { title: "Campaigns", description: "A booking carries its campaign when it is made from a lead." };
export const NO_CAMPAIGNS = {
  title: "No campaigns this month",
  line: "No spend was recorded in the leads app, and no stay arriving this month came from a campaign.",
};
export const SOURCES = { title: "By booking source", description: "Every stay arriving this month." };
export const NO_SOURCES = "No stays arrive this month";

/* ── The exports (Marketing.tsx CAMPAIGN_EXPORT, SOURCE_EXPORT): the rows as shown ── */

export const campaignsTable = (d: Pick<MarketingNumbers, "campaigns" | "month" | "connected" | "inApp" | "appError">): ExportTable => ({
  title: "Marketing campaigns",
  subtitle: monthLabel(d.month),
  columns: ["Campaign", "Where", "Spend", "Bookings", "Revenue"],
  rows: d.campaigns.map((r) => [campaignName(r), platformWords(r.platform), rupees(r.spend), String(r.bookings), rupees(r.revenue)]),
  ...(spendNote(d) ? { note: spendNote(d)! } : {}),
});
export const sourcesTable = (d: Pick<MarketingNumbers, "sources" | "month">): ExportTable => ({
  title: "Marketing by booking source",
  subtitle: monthLabel(d.month),
  columns: ["Booking source", "Bookings", "Revenue"],
  rows: d.sources.map((r) => [sourceName(r), String(r.bookings), rupees(r.revenue)]),
});
