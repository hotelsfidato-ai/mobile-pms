/* Run: node --experimental-strip-types mobile/src/modules/approvals/roles.check.ts
   Who may read the queue: api/src/roleGate.ts (GET approvals = view on
   notification, equipment or purchasing) over api/src/permissions.ts, 4 Nov. */
import { READ_REFUSED, whyNotRead } from "./roles.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* The sentence refusalFor() makes, word for word. */
eq(READ_REFUSED, "Reading approvals is for the owner, an administrator, the general manager, the hotel manager, the revenue manager, reception, housekeeping, the kitchen manager, a chef, the Inventory Manager, the accountant or a viewer. Ask one of them.", "the API's sentence");

for (const role of ["pos", "bar"]) eq(whyNotRead(role), READ_REFUSED, `${role} is refused`);
for (const role of ["owner", "admin", "gm", "hotel_manager", "revenue_manager", "front_desk", "housekeeping",
  "kitchen_manager", "chef", "stores", "finance", "read_only"]) eq(whyNotRead(role), null, `${role} reads`);
eq(whyNotRead(null), null, "not rostered: the server's own answer");

console.log("approvals roles: ok");
