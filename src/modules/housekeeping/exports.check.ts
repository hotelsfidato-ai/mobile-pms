/* Run: node --experimental-strip-types src/modules/housekeeping/exports.check.ts
   The board as a file: its groups in the web's order, a dash for none. */
import { boardTable } from "./exports.ts";

const eq = (got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

const room = (number: string, housekeeping: string, occupied: boolean) =>
  ({ number, type: "Deluxe", floor: 1, housekeeping, occupied, dueOut: false });
const t = boardTable([room("101", "clean", false), room("102", "dirty", false), room("103", "dirty", true)],
  (n) => (n === "102" ? "Asha" : null), "Every room");
/* Needs cleaning first, then Clean; an occupied room is In house whatever its state. */
eq(t.rows.map((r) => [r[0], r[3]]), [["102", "Needs cleaning"], ["101", "Clean"], ["103", "In house"]]);
eq(t.rows[0]![6], "Asha");
eq(t.rows[1]![6], "-");
eq(t.columns.length, t.rows[0]!.length);

console.log("housekeeping exports.check: ok");
