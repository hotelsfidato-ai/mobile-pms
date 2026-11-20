/* ══════════════════════════════════════════════════════════════════
   THE HOUSEKEEPING LISTS AS FILES — the web's columns, ported by hand:
   the board's (pages/Housekeeping.tsx `exported`: its groups in order,
   the sheet chosen) and ORDER_EXPORT (pages/WorkOrders.tsx, without the
   repairs' costs, which stay on the screen). Each cell as the screen
   writes it, a dash for none. Pure: exports.check.ts runs it under node.
   ══════════════════════════════════════════════════════════════════ */

import type { ExportTable } from "../../core/exportDoc.ts";
import { GROUPS, inGroup, type BoardRoom } from "./board.ts";
import { PRIORITY, day, type WorkOrder } from "./workOrders.ts";

type Table = Omit<ExportTable, "title">;
const or = (v: string | number | null | undefined) => (v == null || v === "" ? "-" : String(v));

/** The board's rooms in its groups' order, the sheet shown; `who` names a room's housekeeper. */
export const boardTable = (rooms: BoardRoom[], who: (room: string) => string | null, facts: string): Table => ({
  subtitle: facts,
  columns: ["Room", "Type", "Floor", "State", "Guest", "Due out", "Housekeeper"],
  rows: GROUPS.flatMap((g) => inGroup(rooms, g.key).map((r) => [
    r.number, or(r.type), or(r.floor), g.label, or(r.guest), r.dueOut ? "Yes" : "-", or(who(r.number)),
  ])),
});

/* pages/WorkOrders.tsx STATUS_WORD. */
const STATUS_WORD: Record<string, string> = { open: "Open", in_progress: "Being fixed", done: "Fixed", cancelled: "Not needed" };

export const orderTable = (orders: WorkOrder[], showing: string): Table => ({
  subtitle: `Showing ${showing}`,
  columns: ["Room", "What", "Detail", "Category", "Priority", "Status", "Equipment", "Takes the room out", "Raised by", "Raised",
    "Assigned to", "Days open", "Closed by", "Closed", "What was done"],
  rows: orders.map((o) => [
    or(o.room), o.title, or(o.detail), or(o.category), PRIORITY[o.priority]?.label ?? o.priority, STATUS_WORD[o.status] ?? o.status,
    o.equipment ? `${o.equipment.name} (${o.equipment.tag})` : "-", o.blocksRoom ? "Yes" : "No", or(o.raisedBy), day(o.raisedAt),
    or(o.assignedTo), or(o.daysOpen), or(o.closedBy), day(o.closedAt), or(o.resolution),
  ]),
});
