/* Run: node --experimental-strip-types mobile/src/modules/guest-messaging/roles.check.ts
   Who may read: api/src/modules/guest-messaging/messages.ts VIEW_ROLES and
   MESSAGES_REFUSED; api/src/roleGate.ts (connections-health = view on
   `setting`) over api/src/permissions.ts, read on 4 Nov. */
import { HEALTH_REFUSED, MESSAGES_REFUSED, whyNotHealth, whyNotMessages } from "./roles.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* The API's sentences, word for word. */
eq(MESSAGES_REFUSED, "What was sent to a guest is part of their guest record, and your role cannot open guests at this property.", "messages.ts's sentence");
eq(HEALTH_REFUSED, "Reading the connections' health is for the owner, an administrator or the general manager. Ask one of them.", "refusalFor(see(\"setting\"))");

/* D27-144: `customer`, not `reservation` - the revenue manager, housekeeping, the kitchen and the till read bookings but not these. */
for (const role of ["owner", "admin", "gm", "hotel_manager", "front_desk", "finance", "read_only"]) eq(whyNotMessages(role), null, `${role} reads the messages`);
for (const role of ["revenue_manager", "housekeeping", "kitchen_manager", "chef", "pos", "bar", "stores", "automation"]) {
  eq(whyNotMessages(role), MESSAGES_REFUSED, `${role} is refused the messages`);
}

/* Only the settings console's three. */
for (const role of ["owner", "admin", "gm"]) eq(whyNotHealth(role), null, `${role} reads the health`);
for (const role of ["hotel_manager", "front_desk", "finance", "read_only", "revenue_manager", "housekeeping", "stores", "pos"]) {
  eq(whyNotHealth(role), HEALTH_REFUSED, `${role} is refused the health`);
}

eq(whyNotMessages(null), null, "not rostered: the server's own answer");
eq(whyNotHealth(null), null, "not rostered: the server's own answer");

console.log("guest-messaging roles: ok");
