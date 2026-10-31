/* Run: node --experimental-strip-types mobile/src/modules/housekeeping/board.check.ts
   The board's rules on a tiny house: groups, names, the sheet, held taps, grey buttons. */
import type { OutboxEntry } from "../../core/offline.ts";
import {
  boardHead, boardRooms, firstSheet, heldAssignee, heldMark, inGroup, markPath, assignPath, onSheet, whyNotClean, whyNotInspected, whyNotOpenRepair,
} from "./board.ts";

/* No node:assert, so the app's own type check reads this file too. */
const eq = (got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const room = (number: string, status: string) => ({ number, type: "Deluxe", floor: 2, status }) as never;
const stay = (roomNumber: string, status: string, arrival: string, guest: string) =>
  ({ roomNumber, status, arrival, guest }) as never;
const rooms = [room("201", "dirty"), room("202", "clean"), room("203", "inspected"), room("204", "out-of-service"),
  room("205", "dirty"), room("206", "out-of-service")];
const house = { rooms: [
  { number: "201", inHouse: false }, { number: "202", inHouse: false }, { number: "203", inHouse: false },
  { number: "204", inHouse: false }, { number: "205", inHouse: true }, { number: "206", inHouse: true },
] };
const stays = [
  stay("205", "in-house", "2026-10-14", "Tanvi Bhide"),
  stay("205", "due-out", "2026-10-12", "Rekha Gaikwad"), // arrived first: she names the room
  stay("201", "checked-out", "2026-10-12", "Gone Guest"), // left: names nothing
  stay("202", "due-in", "2026-10-14", "Not Yet"),
];

const b = boardRooms(rooms, house, stays);
/* Occupancy is house-now's, not the stays' or the status. */
eq(b.map((r) => r.occupied), [false, false, false, false, true, true]);
eq(b[4], { number: "205", type: "Deluxe", floor: 2, housekeeping: "dirty", occupied: true, guest: "Rekha Gaikwad", dueOut: true });
eq([b[0]!.guest, b[0]!.dueOut, b[1]!.guest], [undefined, false, undefined]);
/* Stays refused: the same board, no names, no Due out. */
eq(boardRooms(rooms, house, null).map((r) => [r.occupied, r.guest ?? null, r.dueOut])[4], [true, null, false]);

/* Groups: a guest's room is In house whatever its state, out of service too. */
eq(inGroup(b, "dirty").map((r) => r.number), ["201"]);
eq(inGroup(b, "occupied").map((r) => r.number), ["205", "206"]);
eq(inGroup(b, "out-of-service").map((r) => r.number), ["204"]);

/* The head counts what the groups show: empty rooms by state, a guest's room in none of them. */
eq(boardHead(b), { dirty: 1, clean: 1, inspected: 1, out: 1, empty: 3, ready: 2, inHouse: 2, dueOut: 1 });
eq(boardHead([]).empty, 0);

/* Held taps: the whole path, waiting only, the last one wins. */
const e = (path: string, method: string, body: unknown, status: OutboxEntry["status"] = "waiting") =>
  ({ path, method, body: body === undefined ? undefined : JSON.stringify(body), status }) as OutboxEntry;
const held = [
  e(markPath("5EL", "201"), "PUT", { state: "clean" }),
  e(markPath("5EL", "201"), "PUT", { state: "inspected" }),
  e(markPath("BLR", "202"), "PUT", { state: "clean" }), // another property's 202
  e(markPath("5EL", "203"), "PUT", { state: "clean" }, "rejected"), // refused: shown by the bar, not here
  e(assignPath("5EL", "202"), "PUT", { staffId: "me" }),
  e(assignPath("5EL", "201"), "PUT", { staffId: "me" }),
  e(assignPath("5EL", "201"), "DELETE", undefined),
];
eq(heldMark(held, "5EL", "201"), "inspected");
eq(heldMark(held, "5EL", "202"), null);
eq(heldMark(held, "5EL", "203"), null);
eq(heldAssignee(held, "5EL", "202"), "me");
eq(heldAssignee(held, "5EL", "201"), null);
eq(heldAssignee(held, "5EL", "203"), undefined);

/* The sheet: the server's, with this phone's held changes over it. */
const sheet = new Map([["203", "me"], ["204", "someone"], ["201", "me"]]);
const who = (n: string) => { const h = heldAssignee(held, "5EL", n); return h === undefined ? sheet.get(n) ?? null : h; };
eq(onSheet(b, "mine", who, "me").map((r) => r.number), ["202", "203"]);
eq(onSheet(b, "unassigned", who, "me").map((r) => r.number), ["201", "205", "206"]);
eq(onSheet(b, "mine", who, null).length, 0);
eq(onSheet(b, "all", who, "me").length, 6);

/* A person's chip: their sheet, whoever is looking. */
eq(onSheet(b, "someone", who, "me").map((r) => r.number), ["204"]);
eq(onSheet(b, "nobody", who, "me").length, 0);

/* The first chip (M-7): a housekeeper with rooms today opens on Mine, anybody else on All. */
eq(firstSheet("housekeeping", 2), "mine");
eq(firstSheet("housekeeping", 0), "all");
eq(firstSheet("gm", 2), "all");
eq(firstSheet(null, 2), "all");

/* Grey buttons: the API's refusal of the person first, then the room's order. */
eq(whyNotClean("housekeeping", "201", "dirty", false), null);
eq(whyNotInspected("housekeeping", "201", "dirty", false), "Room 201 needs cleaning first.");
eq(whyNotInspected("front_desk", "202", "clean", false), null);
eq(whyNotClean("housekeeping", "202", "clean", true), "Room 202 is already marked clean, on this phone, waiting to sync.");
eq(whyNotClean("housekeeping", "203", "inspected", false), "Room 203 is already inspected.");
eq(whyNotInspected("housekeeping", "203", "inspected", true), "Room 203 is already inspected, on this phone, waiting to sync.");
eq(whyNotClean("finance", "201", "dirty", false)?.startsWith("Changing a room's status is for"), true);
eq(whyNotInspected(null, "202", "clean", false)?.startsWith("Changing a room's status is for"), true);

/* Repair opens for who may report one or take the room out; grey for who may do neither. */
eq(whyNotOpenRepair("housekeeping"), null);
eq(whyNotOpenRepair("front_desk"), null); // refused a repair, allowed Out of service: the web's foot of the form
eq(whyNotOpenRepair("finance")?.startsWith("Reporting a repair"), true);
eq(whyNotOpenRepair(null)?.startsWith("Reporting a repair"), true);
console.log("board: all checks pass");
