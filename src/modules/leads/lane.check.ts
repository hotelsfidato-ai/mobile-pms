/* Run: node --experimental-strip-types src/modules/leads/lane.check.ts
   Who may export the sales lane's lists (listExports.ts exportRefusal). */
import { exportRefusal } from "./lane.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

const may = ["owner", "admin", "gm", "hotel_manager", "revenue_manager", "finance"];
for (const r of may) eq(exportRefusal(r, "guests"), null, `${r} downloads reports`);
for (const r of ["front_desk", "read_only", "housekeeping", "pos", "stores", null]) {
  eq(exportRefusal(r, "money"), "A file of money is for those who download reports: the owner, an administrator, the general "
    + "manager, the hotel manager, the revenue manager or the accountant. Ask one of them.", `${r}: money`);
}
eq(exportRefusal("front_desk", "guests")?.startsWith("A file of guests' details is for"), true, "guests' details");
console.log("lane: all checks pass");
