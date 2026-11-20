/* Run: node --experimental-strip-types src/modules/guest-services/exports.check.ts
   The guest-services lists as files: a dash for none, an ID number masked. */
import { lostTable, waitingTable } from "./exports.ts";

const eq = (got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

const lost = lostTable([{
  id: "1", what: "Black umbrella", foundWhere: "Lobby", room: null, keptWhere: null, foundOn: "2026-11-02", daysKept: 0, foundBy: null,
  status: "kept", returnedTo: null, disposeReason: null, handledBy: null, handledOn: null,
}], "kept");
eq(lost.rows[0], ["Black umbrella", "Lobby", "-", "2 Nov 2026", "-", "-", "0", "Kept", "-", "-", "-", "-"]);
eq(lost.columns.length, lost.rows[0]!.length);

const w = waitingTable([{
  id: "1", guest: "Tanvi Bhide", reference: "FH-1", idType: "aadhaar", idNumber: "1234 5678 9012", fromDigilocker: false,
  passportExpiry: null, visaNumber: null, visaExpiry: null, addressLine: null, city: "Pune", country: null,
  submittedAt: "2026-11-02T10:05:00", more: {}, photo: null,
}]);
eq(w.rows[0]![3], "Aadhaar");
eq(w.rows[0]![4], "XXXXXXXX9012");
eq(w.columns.length, w.rows[0]!.length);

console.log("guest-services exports.check: ok");
