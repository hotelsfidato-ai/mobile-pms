/* Run: node --experimental-strip-types src/modules/guests/exports.check.ts
   Guests and companies as files: a dash for none, credit said as credit. */
import { companyTable, guestTable } from "./exports.ts";

const eq = (got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

const g = guestTable([{ id: "1", name: "Tanvi Bhide", stays: 2, nights: 3, lastStay: null, nextStay: null, totalSpend: 0, openBalance: -1500,
  sources: [], possibleDuplicate: false }], "");
eq(g.rows[0]!.slice(4), ["-", "-", "-", "₹0", "₹1,500 in credit"]);
eq(g.columns.length, g.rows[0]!.length);

const co = companyTable([{ id: "1", name: "Agoda", kind: "OTA", bookings: 0, roomNights: 0, revenue: 0, openBalance: 0, commissionPct: null }]);
/* No bookings: the revenue is a dash, not ₹0; nothing owed a dash. */
eq(co.rows[0], ["Agoda", "OTA", "0", "0", "-", "-", "-"]);

console.log("guests exports.check: ok");
