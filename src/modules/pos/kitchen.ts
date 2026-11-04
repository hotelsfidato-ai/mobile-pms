import type { OutboxEntry } from "../../core/offline.ts";
import { instant } from "../../core/format.ts";

/* ══════════════════════════════════════════════════════════════════
   THE PASS'S RULES — the web's Kitchen screen, ported, so a phone and the
   wall screen sort, colour and refuse a dish the same way:
     src/modules/pos/pages/Kitchen.tsx          COLUMNS, EMPTY_COLUMN,
       waited, the ten- and five-minute alarm, ByTable, KindFilter
     src/modules/pos/components/KotStation.tsx  statusOf, since,
       maySetUpKots (the KOT printer lines)
     src/modules/pos/data/till.ts               KitchenLine, KotKind
     api/src/modules/pos/till.ts                the pass's two routes
     api/src/roleGate.ts                        PASS and its sentence
   Pure: no React Native here, so `kitchen.check.ts` runs under node.
   ══════════════════════════════════════════════════════════════════ */

/** src/modules/pos/data/till.ts KitchenLine, word for word. */
export interface KitchenLine {
  id: string;
  orderNo: string;
  table: string | null;
  orderType: string;
  outlet: string;
  name: string;
  qty: number;
  note: string | null;
  status: string;
  /** Since it reached the kitchen. The pass sorts and colours by this. */
  waitedSeconds: number;
  /** What it should take, from the dish or its category. NULL means
      nobody has timed it — a dash, never a zero. */
  prepMinutes: number | null;
  /** Which course this dish belongs to. NULL is an unsequenced dish —
      a drink — which is not course zero and must not sort ahead of the
      starters. */
  course: number | null;
  /** Struck after the kitchen already had it — stop cooking. */
  cancelled: boolean;
  /** The dish's numbered add-ons, read under it: "+ Kebab" (D27-289). */
  plus?: { name: string; qty: number }[];
  /** On an add-on line of its own (D27-291): the dish it goes with. */
  forDish?: string | null;
  /** The KOT kind it printed on (D27-292): the board's filter. */
  kindId?: string | null;
  /** Why, in the manager's words (D27-119). */
  cancelReason?: string | null;
}

/** src/modules/pos/data/till.ts KotStationRef, word for word. */
export interface KotStationRef {
  id: string; name: string; mine: boolean; online: boolean; seenAt: string | null;
}

/** src/modules/pos/data/till.ts KotKind, word for word. */
export interface KotKind {
  id: string;
  name: string;
  role: "food" | "bar" | null;
  /** Kitchen and Bar: renamed, never switched off. */
  fixed: boolean;
  station: KotStationRef | null;
  /** Sections with a dish on sale that print on it: the red line shows only
      for a kind something prints to (the owner). */
  sections: number;
}

/** src/modules/pos/data/till.ts KotSetup, cut to the one field the pass reads. */
export interface KotSetup { kinds: KotKind[] }

/* ── Who (the API decides; AGENTS rule 1) ─────────────────────────── */

/** roleGate PASS: `payment` create, plus the chef and the kitchen manager
    by name, in the matrix's order. Read back from the API on 31 Oct as dev-pos and dev-housekeeping. */
const PASS: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "front_desk", "kitchen_manager", "chef", "finance"];

/** Null when the API would let this person Start or Ready a dish, else its sentence. */
export const whyNotMove = (role: string | null) =>
  role != null && PASS.includes(role) ? null
    : "Moving a dish along at the pass is for the owner, an administrator, the general manager, the hotel manager, "
      + "reception, the kitchen manager, a chef or the accountant. Ask one of them.";

/** KotStation.tsx maySetUpKots: `menu` edit or `room_config` edit. */
export const maySetUpKots = (role: string | null) => role != null && ["owner", "admin", "gm", "kitchen_manager"].includes(role);

/* ── The board ────────────────────────────────────────────────────── */

/* TWO BUTTONS, Start and Ready (D27-221). A Ready dish leaves this board:
   it is the waiter's now (Taken, on Tables and the order). */
export const COLUMNS = [
  { key: "sent", label: "Ordered", next: "preparing" as const, action: "Start" },
  { key: "preparing", label: "On the fire", next: "ready" as const, action: "Ready" },
];
export type Column = (typeof COLUMNS)[number];

/** In the column's own words, never "Nothing here" (Kitchen.tsx EMPTY_COLUMN). */
export const EMPTY_COLUMN: Record<string, string> = {
  sent: "Nothing ordered yet.",
  preparing: "Nothing on the fire.",
};

/** Ordered or on the fire: the read holds nothing else (D27-221). */
export const columnOf = (line: KitchenLine) => COLUMNS.find((c) => c.key === line.status);

/** The two routes' path: the kitchen starts a dish or makes it ready. */
export const movePath = (code: string, lineId: string, to: "preparing" | "ready") =>
  `/api/hotels/${code}/kitchen/lines/${lineId}/${to}`;

/** Minutes and seconds, because a kitchen counts in both (Kitchen.tsx waited). */
export function waited(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}

/** The wait TICKS between reads: the server's seconds at the read, plus
    the time since (Kitchen.tsx 165-171 says the number must tick; its own
    tick re-draws the same number - R-16). */
export const waitNow = (seconds: number, readAt: number, now: number) =>
  seconds + Math.max(0, Math.floor((now - readAt) / 1000));

/** Red from ten minutes, yellow from five: the colour carries the wait. */
export const alarm = (seconds: number): "late" | "warm" | null =>
  seconds >= 600 ? "late" : seconds >= 300 ? "warm" : null;

/** The estimate: a dash when nobody has timed it, never a zero. */
export const estimate = (prepMinutes: number | null | undefined) =>
  prepMinutes == null ? "- est" : `${prepMinutes} min est`;

/** "AC4 · DH-003", or the order's kind when it has no table. */
export const where = (line: KitchenLine) => `${line.table ?? line.orderType.replace(/_/g, " ")} · ${line.orderNo}`;

/** "2 × Veg Biryani"; an add-on line of its own reads "+ Extra papad". */
export const dish = (line: KitchenLine) => `${line.qty} × ${line.forDish ? `+ ${line.name}` : line.name}`;

/** "+ Kebab ×2", as the docket prints them. */
export const plusLine = (p: { name: string; qty: number }) => `+ ${p.name}${p.qty > 1 ? ` ×${p.qty}` : ""}`;

/** All (""), or one KOT kind; a kind that is gone reads as All (D27-292). */
export const kindShown = (kinds: KotKind[], chosen: string) => (kinds.some((k) => k.id === chosen) ? chosen : "");
export const ofKind = (lines: KitchenLine[], kind: string) => lines.filter((l) => !kind || l.kindId === kind);

/** "N dishes working": a struck dish is not being worked. */
export const working = (lines: KitchenLine[]) => lines.filter((l) => !l.cancelled).length;

/** A column's tickets and its count: a struck dish stays in its column (its
    "stop cooking this" card) and is counted there, though not as working -
    the picture's "Ordered 70 · On the fire 16" beside "84 dishes working"
    with two struck cards in Ordered (pms-shots 45-point-of-sale-kitchen). */
export const inColumn = (lines: KitchenLine[], key: string) => lines.filter((l) => l.status === key);

export interface TableCard { key: string; title: string; orderNo: string; wait: number; courses: { course: number | null; lines: KitchenLine[] }[] }

/** BY TABLE (Kitchen.tsx ByTable): one card per table, a takeaway per
    order; a table is as old as its oldest dish, oldest first; courses
    lowest first and the unsequenced ("Any time") last, never as zero. */
export function byTable(lines: KitchenLine[]): TableCard[] {
  const tables = new Map<string, KitchenLine[]>();
  for (const l of lines) {
    const key = l.table ?? `${l.orderType}·${l.orderNo}`;
    const at = tables.get(key);
    if (at) at.push(l); else tables.set(key, [l]);
  }
  const oldest = (ls: KitchenLine[]) => Math.max(...ls.map((l) => l.waitedSeconds));
  return [...tables.entries()]
    .sort((a, b) => oldest(b[1]) - oldest(a[1]))
    .map(([key, ls]) => ({
      key,
      title: ls[0]!.table ?? ls[0]!.orderType.replace(/_/g, " "),
      orderNo: ls[0]!.orderNo,
      wait: oldest(ls),
      courses: [...new Set(ls.map((l) => l.course ?? null))]
        .sort((a, b) => (a === null ? 1 : b === null ? -1 : a - b))
        .map((course) => ({ course, lines: ls.filter((l) => (l.course ?? null) === course) })),
    }));
}

/* ── The KOT printer lines (KotStation.tsx KotStatus) ──────────────── */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "4:05 PM" (the web's timeOnly, date-fns "h:mm a"), in the phone's time. */
export function clock(at: Date): string {
  const h = at.getHours();
  return `${h % 12 || 12}:${String(at.getMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
/** The API sends Postgres's own text: the core's reader (format.ts, MPOS-1). */
export { instant };

/** KotStation.tsx since: the time today, else "16 Oct 2026, 4:05 PM" (dateTime). */
export function since(iso: string | null, now: Date): string {
  if (!iso) return "-";
  const d = new Date(instant(iso));
  return d.toDateString() === now.toDateString() ? clock(d)
    : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${clock(d)}`;
}

/** KotStation.tsx statusOf, word for word. */
export function statusOf(k: KotKind, now: Date): { text: string; printing: boolean } {
  if (!k.station) return { text: `No computer prints ${k.name} KOTs - they are not printing`, printing: false };
  if (k.station.online) return { text: `${k.name} KOTs: ${k.station.name} - online`, printing: true };
  return { text: `${k.name} KOTs wait: ${k.station.name} not seen since ${since(k.station.seenAt, now)}`, printing: false };
}

/** One line per kind something prints to. */
export const printingKinds = (kinds: KotKind[]) => kinds.filter((k) => k.sections > 0);

/* ── What this phone holds ────────────────────────────────────────── */

/** The dish's held Start or Ready, matched on the whole path (the hotel's
    code in it), or null when nothing is held for it. */
export function heldMove(held: OutboxEntry[], code: string, lineId: string): "preparing" | "ready" | null {
  const prefix = `/api/hotels/${code}/kitchen/lines/${lineId}/`;
  const e = held.filter((x) => x.status === "waiting" && x.path.startsWith(prefix)).pop();
  const to = e?.path.slice(prefix.length);
  return to === "preparing" || to === "ready" ? to : null;
}
