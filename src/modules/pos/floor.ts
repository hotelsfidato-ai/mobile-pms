import type { Floor, FloorTable, TableState } from "./types";

/* ══════════════════════════════════════════════════════════════════
   TABLES' RULES — ported from the web (one folder up):
     src/modules/pos/pages/Floor.tsx         the key, the tile colours, what
                                             a tile offers, Close early's times
     src/modules/pos/components/KotStation.tsx  statusOf, since (the KOT lines)
     src/modules/pos/data/till.ts            KotKind (the API's answer)
   THE COLOUR IS DERIVED, NEVER STORED: the server sends the state; the
   phone only draws it. Pure: no React Native, so `floor.check.ts` runs.
   ══════════════════════════════════════════════════════════════════ */

/** src/styles/theme.css values the phone's theme.ts does not carry yet. */
const success = "#1f6f5c", success50 = "#eaf4f1", success100 = "#cde5de";
const yellow = "#ffb600", grey400 = "#9aa2a9";

/** One state's look: the tile's wash, its hairline, and the key's swatch ring. */
export interface Look { fill: string; ring: string; swatch: string }

/** The tile (Floor.tsx TILE) and the key's swatch ring (LEGEND), by state. */
export const LOOK: Record<TableState, Look> = {
  blank: { fill: "#ffffff", ring: "#e2e5e8", swatch: "#ccd0d4" },
  running: { fill: "#ebf2f9", ring: "#d2e2f2", swatch: "#2b6cb0" },
  kot: { fill: "#fdf1eb", ring: "#f9dccd", swatch: "#df6128" },
  printed: { fill: success50, ring: success100, swatch: success },
  paid: { fill: "#fff8e6", ring: "#ffedbf", swatch: yellow },
  closed: { fill: "#eef0f2", ring: "#e2e5e8", swatch: grey400 },
};
export const READY = { fill: success50, ring: success100, text: "#1a5f4f" };

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
export const finished = (s: TableState) => s === "paid" || s === "closed";

/** What a tile offers, as the web's Floor.tsx draws it:
      tap      the pad: a first round on a free table, another on a running one;
               none on a finished bill or while the outlet is closed
      ready    "N ready", tapped is Taken (D27-222)
      actions  Print bill and the Eye on a running bill, Clear on a finished one */
export function tileOffers(table: FloorTable, closed: boolean) {
  const done = finished(table.state);
  return {
    tap: table.state === "blank" ? (closed ? null : "new" as const) : done || closed || !table.orderId ? null : "round" as const,
    ready: (table.ready ?? 0) > 0 && table.orderId ? table.ready! : 0,
    actions: table.state === "blank" ? null : done ? "clear" as const : "print-open" as const,
  };
}

/** Where a tile's tap goes (MODULE.md "How the parts meet"): the pad by the table's name. */
export function padHref(code: string, table: FloorTable): string {
  const name = encodeURIComponent(table.label);
  return table.state === "blank" || !table.orderId
    ? `/pos/${code}/pad?table=${name}`
    : `/pos/${code}/pad?order=${table.orderId}&table=${name}`;
}

/** The tile's spoken name for its tap (the web's aria-label). */
export function tileLabel(table: FloorTable): string {
  if (table.state === "blank") return table.seats ? `${table.label}, ${table.seats} seats` : table.label;
  if (finished(table.state)) return `${table.label}, ${table.state === "paid" ? "paid" : "closed unpaid"}`;
  return `Add a round to ${table.label}`;
}

/** Closed now, and the time it reopens ("04:30 pm", the web's en-IN). */
export function closure(outlet: Floor["outlet"], now = Date.now()): { closed: boolean; reopens: string | null } {
  const closed = Boolean(outlet?.closedUntil && Date.parse(outlet.closedUntil) > now);
  return {
    closed,
    reopens: closed ? new Date(outlet!.closedUntil!).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : null,
  };
}

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
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toDateString() === now.toDateString() ? timeOnly(d)
    : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${timeOnly(d)}`;
}

/** One line per kind something prints to; not printing is the red line. */
export function kotLines(kinds: KotKind[], now = new Date()): { id: string; text: string; printing: boolean }[] {
  return kinds.filter((k) => k.sections > 0).map((k) => {
    if (!k.station) return { id: k.id, text: `No computer prints ${k.name} KOTs - they are not printing`, printing: false };
    if (k.station.online) return { id: k.id, text: `${k.name} KOTs: ${k.station.name} - online`, printing: true };
    return { id: k.id, text: `${k.name} KOTs wait: ${k.station.name} not seen since ${since(k.station.seenAt, now)}`, printing: false };
  });
}
