import { c } from "../../core/theme.ts";
import type { Floor, FloorTable, TableState } from "./types";
import { instant, msAt as at } from "../../core/format.ts";

/* ══════════════════════════════════════════════════════════════════
   TABLES' RULES — ported from the web (one folder up):
     src/modules/pos/pages/Floor.tsx         the key, the tile colours, what
                                             a tile offers, Close early's times
     src/modules/pos/components/KotStation.tsx  statusOf, since (the KOT lines)
     src/modules/pos/data/till.ts            KotKind, FloorParcel, joinedTo (the API's answers)
   Today's web, 31 Oct (M-11): the picture .local/pms-shots/all/42 is the spec.
   THE COLOUR IS DERIVED, NEVER STORED: the server sends the state; the
   phone only draws it. Pure: no React Native, so `floor.check.ts` runs.
   ══════════════════════════════════════════════════════════════════ */

/** src/styles/theme.css values, named for the floor (theme.ts carries them since 4 Nov);
    every other colour here is a theme.ts token too. */
const success = c.success, success50 = c.success50, success100 = c.success100;
const yellow = c.yellow, grey400 = c.grey400;

/** Today's floor (till.ts): `types.ts` holds the shapes of 15 Oct and is the
    mobile chat's. A joined table's orderId is the bill it went onto (D27-372);
    a parcel (D27-359) is an order named by its customer, with no table. */
export type TileState = TableState | "joined";
export interface Tile extends Omit<FloorTable, "state"> {
  state: TileState;
  joinedTo?: string | null;
  /** The customer, on a parcel's tile. */
  parcel?: string;
}
export interface FloorParcel {
  orderId: string; orderNo: string; name: string; phone: string | null;
  minutes: number; payable: number; ready: number; readyIds: string[];
}
export interface FloorNow {
  outlet: Floor["outlet"];
  sections: { id: string; name: string; tables: Tile[] }[];
  /** The open parcels, oldest first. Absent on an older server: none. */
  parcels?: FloorParcel[];
}

/** One state's look: the tile's wash, its hairline, and the key's swatch ring. */
export interface Look { fill: string; ring: string; swatch: string }

/** The tile (Floor.tsx TILE) and the key's swatch ring (LEGEND), by state. */
export const LOOK: Record<TileState, Look> = {
  blank: { fill: c.white, ring: c.grey200, swatch: c.grey300 },
  running: { fill: c.info50, ring: c.info100, swatch: c.info },
  kot: { fill: c.orange50, ring: c.orange100, swatch: c.orange },
  printed: { fill: success50, ring: success100, swatch: success },
  paid: { fill: c.yellow50, ring: c.yellow100, swatch: yellow },
  closed: { fill: c.grey100, ring: c.grey200, swatch: grey400 },
  joined: { fill: c.grey50, ring: c.grey200, swatch: c.grey200 },
};
export const READY = { fill: success50, ring: success100, text: c.success600 };

/** The key, in the web's order and words. */
export const LEGEND: { state: TableState; label: string }[] = [
  { state: "blank", label: "Free" },
  { state: "running", label: "Running" },
  { state: "kot", label: "In the kitchen" },
  { state: "printed", label: "Bill printed" },
  { state: "paid", label: "Paid - clear it" },
  { state: "closed", label: "Closed unpaid - clear it" },
];

/** A bill that is over - paid, or closed unpaid (POS-33) - takes no more dishes. */
export const finished = (s: TileState) => s === "paid" || s === "closed";

/** What a tile offers, as the web's Floor.tsx draws it:
      tap      the pad: a first round on a free table, another on a running one;
               none on a finished bill, on a joined table or while the outlet is closed
      ready    "N ready", tapped is Taken (D27-222)
      actions  Print bill and the Eye on a running bill, Clear on a finished one,
               the Eye alone on a joined table (it opens the bill it went onto) */
export function tileOffers(table: Tile, closed: boolean) {
  if (table.state === "joined") return { tap: null, ready: 0, actions: "open" as const };
  const done = finished(table.state);
  return {
    tap: table.state === "blank" ? (closed ? null : "new" as const) : done || closed || !table.orderId ? null : "round" as const,
    ready: (table.ready ?? 0) > 0 && table.orderId ? table.ready! : 0,
    actions: table.state === "blank" ? null : done ? "clear" as const : "print-open" as const,
  };
}

/** A parcel as the pad and the tile's buttons take a table (Floor.tsx parcelTable). */
export function parcelTile(p: FloorParcel): Tile {
  return {
    id: `parcel-${p.orderId}`, label: `Parcel · ${p.name}`, seats: null, row: 0, col: 0, orderId: p.orderId, orderNo: p.orderNo,
    state: "running", minutes: p.minutes, payable: p.payable, ready: p.ready, readyIds: p.readyIds, parcel: p.name,
  };
}

/** Where a tile's tap goes (MODULE.md "How the parts meet"): the pad by the table's name. */
export function padHref(code: string, table: Tile): string {
  const name = encodeURIComponent(table.label);
  return table.state === "blank" || !table.orderId
    ? `/pos/${code}/pad?table=${name}`
    : `/pos/${code}/pad?order=${table.orderId}&table=${name}`;
}

/** The tile's spoken names (the web's aria-labels). */
export function tileLabel(table: Tile): string {
  if (table.parcel) return `Add to the parcel for ${table.parcel}`;
  if (table.state === "blank") return table.seats ? `${table.label}, ${table.seats} seats` : table.label;
  if (table.state === "joined") return `${table.label}, joined to ${table.joinedTo ?? "another table"}`;
  if (finished(table.state)) return `${table.label}, ${table.state === "paid" ? "paid" : "closed unpaid"}`;
  return `Add a round to ${table.label}`;
}
export const takenLabel = (table: Tile, ready: number) =>
  table.parcel ? `Taken: the ${ready} ready for ${table.parcel}` : `Taken: the ${ready} ready at ${table.label}`;
export const openLabel = (table: Tile) =>
  table.parcel ? `Open ${table.parcel}'s parcel`
    : table.state === "joined" ? `Open the bill ${table.label} is joined to` : `Open ${table.label}`;

/** A server time as a phone's engine reads it: the core's (format.ts, MPOS-1),
    under the names this module's screens and check use. */
export { instant, at };

/** Closed now, and the time it reopens ("04:30 pm", the web's en-IN). */
export function closure(outlet: Floor["outlet"], now = Date.now()): { closed: boolean; reopens: string | null } {
  const until = at(outlet?.closedUntil);
  const closed = until !== null && until > now;
  return {
    closed,
    reopens: closed ? new Date(until).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : null,
  };
}

/** Off until a time still to come (a side, an add-on: "off today"). */
export const offNow = (offUntil: string | null | undefined, now = Date.now()) => {
  const until = at(offUntil);
  return until !== null && until > now;
};

/** The banner's first line: "Fidato Restaurant is closed until 04:30 pm - Power cut." */
export function closedLine(outlet: NonNullable<Floor["outlet"]>, reopens: string | null): string {
  return `${outlet.name} is closed${reopens ? ` until ${reopens}` : ""}${outlet.closedReason ? ` - ${outlet.closedReason}` : ""}.`;
}

/** Close early's times, and there is no "until I say" (Floor.tsx CLOSE_FOR). */
export const CLOSE_FOR = [
  { key: "2h", label: "2 hours" },
  { key: "4h", label: "4 hours" },
  { key: "8h", label: "8 hours" },
  { key: "24h", label: "24 hours" },
  { key: "next_business_day", label: "Rest of today" },
] as const;

/* ── Start here (components/app/StartHere.tsx, startHereCards.ts) ──── */

/** The waiter's card, and the Bar person's with their orders going to the bar
    (D27-329). `here`: done on this screen. The third job is the web's Till,
    which the phone does not have: it is told, not linked. */
export function startCard(role: string | null) {
  if (role !== "pos" && role !== "bar") return null;
  return {
    intro: "Your three jobs. Each one opens the screen it happens on.",
    tasks: [
      { job: "Open a table", how: "Tap the table - its order pad opens right there.", here: true },
      { job: `Send an order to the ${role === "bar" ? "bar" : "kitchen"}`, how: "Add the dishes on the table's pad, then Send.", here: true },
      { job: "Settle a bill", how: "Open the order and tap how they pay: cash, card, UPI, or Charge to room.", here: false },
    ],
  };
}

/* ── The KOT printer lines (KotStation.tsx) ──────────────────────── */

/** till.ts KotKind: one KOT kind and the computer that prints it. */
export interface KotKind {
  id: string;
  name: string;
  role: "food" | "bar" | null;
  fixed: boolean;
  station: { id: string; name: string; mine: boolean; online: boolean; seenAt: string | null } | null;
  /** Sections with a dish on sale that print on it. */
  sections: number;
}

/** "h:mm a" (the web's timeOnly), and "d MMM yyyy, h:mm a" (dateTime). */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function timeOnly(d: Date): string {
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "AM" : "PM"}`;
}
export function since(iso: string | null, now = new Date()): string {
  const ms = at(iso);
  if (ms === null) return "-";
  const d = new Date(ms);
  return d.toDateString() === now.toDateString() ? timeOnly(d)
    : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${timeOnly(d)}`;
}

/** May open the KOT section: `edit` on `menu` or `room_config` (KotStation.tsx
    maySetUpKots), read from api/src/permissions.ts on 31 Oct. The section is on
    the website: the phone says so when "Set up" is tapped. */
export const maySetUpKots = (role: string | null) => role != null && ["owner", "admin", "gm", "kitchen_manager"].includes(role);

/** One line per kind something prints to; not printing is the red line. */
export function kotLines(kinds: KotKind[], now = new Date()): { id: string; text: string; printing: boolean }[] {
  return kinds.filter((k) => k.sections > 0).map((k) => {
    if (!k.station) return { id: k.id, text: `No computer prints ${k.name} KOTs - they are not printing`, printing: false };
    if (k.station.online) return { id: k.id, text: `${k.name} KOTs: ${k.station.name} - online`, printing: true };
    return { id: k.id, text: `${k.name} KOTs wait: ${k.station.name} not seen since ${since(k.station.seenAt, now)}`, printing: false };
  });
}
