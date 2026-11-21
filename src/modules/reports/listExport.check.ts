/* Run: node --experimental-strip-types src/modules/reports/listExport.check.ts
   Who may take a list away as a file (listExport.ts), against the web's sentences. */
import { LIST_SCREENS, exportRefusal, forWhom, maskId } from "./listExportRules.ts";

/* No node:assert, so the app's own type check reads this file too. */
const eq = (got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* A list of no money and no guests: whoever may open the screen. */
eq(exportRefusal("housekeeping", LIST_SCREENS["lost-property"]), null);
eq(exportRefusal("read_only", LIST_SCREENS["banquet"]), null);
/* Guests' details: the reports' download right. */
eq(exportRefusal("front_desk", LIST_SCREENS["walk-ins"]),
  "A file of guests' details is for those who download reports: the owner, an administrator, the general manager, "
  + "the hotel manager, the revenue manager or the accountant. Ask one of them.");
eq(exportRefusal("gm", LIST_SCREENS["walk-ins"]), null);
eq(exportRefusal("finance", LIST_SCREENS["in-house"]), null);
/* Money. */
eq(exportRefusal("front_desk", LIST_SCREENS["in-house"])?.startsWith("A file of money is for those who download reports"), true);
/* A right of its own: laundry's export. */
eq(exportRefusal("owner", LIST_SCREENS["laundry-dockets"]), null);
eq(exportRefusal("read_only", LIST_SCREENS["laundry-dockets"])?.startsWith("Exporting the laundry dockets is for "), true);
/* The words. */
eq(forWhom(["gm"]), "is for the general manager. Ask them.");
eq(forWhom(["finance", "owner"]), "is for the owner or the accountant. Ask one of them.");
eq(forWhom(["owner", "admin", "gm"]), "is for the owner, an administrator or the general manager. Ask one of them.");
eq(maskId("1234 5678 9012"), "XXXXXXXX9012");
eq(maskId("AB1"), "XXX");

console.log("listExport.check: ok");
