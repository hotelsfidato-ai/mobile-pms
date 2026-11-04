/* Run: node --experimental-strip-types mobile/src/modules/night-audit/roles.check.ts
   Who reads the night audit and who may close the day: the API's grants
   (roleGate.ts CLOSE_DAY, REPORTS, CORRECT_DAY) and its sentences, written
   out by hand from roleGate.ts's WHO and the matrix, not by the code above. */
import { CLOSE_REFUSED, READ_REFUSED, mayClose, mayCorrect, whyNotRead } from "./roles.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

eq(CLOSE_REFUSED, "Closing the day is for the owner, an administrator, the general manager, the hotel manager, reception or the accountant. Ask one of them.", "the close's sentence");
eq(READ_REFUSED, "Reading reports is for the owner, an administrator, the general manager, the hotel manager, the revenue manager, reception, the accountant or a viewer. Ask one of them.", "the read's sentence");

/* CLOSE_DAY: `invoice` create - roleGate.ts 131: "the owner, an administrator,
   the GM, the hotel manager, reception and the accountant". */
for (const r of ["owner", "admin", "gm", "hotel_manager", "front_desk", "finance"]) eq(mayClose(r), true, `${r} closes`);
for (const r of ["revenue_manager", "read_only", "housekeeping", "kitchen_manager", "chef", "pos", "bar", "stores", "automation"]) eq(mayClose(r), false, `${r} does not close`);
/* An unknown role is a viewer (the web's roleFor): never shown Run. */
eq(mayClose(null), false, "no role");
eq(mayClose("someone"), false, "an unknown role");

/* REPORTS: `report` view. The kitchen, the store and housekeeping carry no
   report (D27-141): refused with the sentence. */
for (const r of ["owner", "admin", "gm", "hotel_manager", "revenue_manager", "front_desk", "finance", "read_only"]) eq(whyNotRead(r), null, `${r} reads`);
for (const r of ["housekeeping", "kitchen_manager", "chef", "pos", "bar", "stores"]) eq(whyNotRead(r), READ_REFUSED, `${r} is refused`);

/* CORRECT_DAY: the owner, an administrator and the GM (D24-3). */
for (const r of ["owner", "admin", "gm"]) eq(mayCorrect(r), true, `${r} corrects`);
for (const r of ["hotel_manager", "front_desk", "finance", "read_only"]) eq(mayCorrect(r), false, `${r} does not correct`);

console.log("night-audit roles: ok");
