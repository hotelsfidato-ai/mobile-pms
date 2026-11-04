/* Run: node --experimental-strip-types src/modules/reputation/roles.check.ts
   Who may look, ask and set the link on Reviews: the server's three lists
   (api/src/modules/reputation/reputation.ts) against the core's port of the
   PMS's matrix (src/core/menu.ts) - the server's own test holds its lists to
   the matrix the same way - and each sentence as reputation.ts writes it. */
import { can, ROLES } from "../../core/menu.ts";
import { ASK_ROLES, LINK_NOT_YOURS, LINK_ROLES, NOTHING_SENT, REFUSED, VIEW_ROLES, whyNotView } from "./roles.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

const people = ROLES.filter((r) => r !== "automation");

/* The menu shows Reviews to `customer: view`; the server opens it to VIEW_ROLES. One list. */
for (const role of people) {
  eq(VIEW_ROLES.includes(role), can(role, "view", "customer"), `view: ${role} as the matrix says`);
  eq(ASK_ROLES.includes(role), can(role, "create", "customer"), `ask: ${role} as the matrix says`);
  eq(LINK_ROLES.includes(role), can(role, "edit", "hotel"), `link: ${role} as the matrix says`);
  eq(whyNotView(role) === null, VIEW_ROLES.includes(role), `the read's refusal: ${role}`);
}

/* The owner's answers of 19 September. */
eq(ASK_ROLES.includes("finance") || ASK_ROLES.includes("read_only"), false, "the accountant and a viewer read and send nothing");
eq(VIEW_ROLES.includes("finance") && VIEW_ROLES.includes("read_only"), true, "the accountant and a viewer may look");
eq([...LINK_ROLES], ["owner", "admin"], "the link is the owner's or an administrator's");
eq(whyNotView("housekeeping"), REFUSED.view, "housekeeping is refused in the API's words");
eq(whyNotView(null), REFUSED.view, "nobody rostered is refused");

/* The words, as reputation.ts and testHotel.ts write them. */
eq(REFUSED.view, "Reviews is not open to your role. The owner, an administrator, the general manager, the hotel manager, reception, the accountant and a viewer can see it.", "view");
eq(REFUSED.ask, "Asking a guest for a review is for the owner, an administrator, the general manager, the hotel manager or reception.", "ask");
eq(REFUSED.link, "Setting this property's review link is for the owner or an administrator. Ask one of them.", "link");
eq(LINK_NOT_YOURS, "Setting this is for the owner or an administrator. Ask one of them.", "the card's line");
eq(NOTHING_SENT, "This is a test hotel: nothing is sent from it.", "a test hotel");

console.log("reputation roles: all checks pass");
