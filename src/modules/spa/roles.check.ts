/* Run: node --experimental-strip-types src/modules/spa/roles.check.ts
   Who may read and act in the spa: the diary's readers against the core's
   port of the PMS's matrix (src/core/menu.ts, which since SPA-2 grants `spa`
   exactly to the server's SPA_READ_ROLES), the booking and list roles
   against the web's copies (TAKES_A_BOOKING, SETS_THE_LIST in data/spa.ts),
   and each sentence as api/src/modules/spa/spa.ts writes it. */
import { can, ROLES } from "../../core/menu.ts";
import {
  BOOK_REFUSED, LIST_REFUSED, READ_REFUSED, SWITCHED_OFF, whyNotBook, whyNotRead, whyNotSetUp,
} from "./roles.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

const people = ROLES.filter((r) => r !== "automation");

/* SPA-2: the matrix's `spa` view is the server's six, and the phone's list is that too. */
for (const role of people) eq(whyNotRead(role) === null, can(role, "view", "spa"), `read: ${role} as the matrix says`);

/* The web's copies, data/spa.ts TAKES_A_BOOKING and SETS_THE_LIST. */
const TAKES_A_BOOKING = ["owner", "admin", "gm", "hotel_manager", "front_desk"];
const SETS_THE_LIST = ["owner", "admin", "gm"];
for (const role of people) {
  eq(whyNotBook(role) === null, TAKES_A_BOOKING.includes(role), `book: ${role}`);
  eq(whyNotSetUp(role) === null, SETS_THE_LIST.includes(role), `set up: ${role}`);
}

/* D18-21: housekeeping sees the diary and does not touch it. */
eq(whyNotRead("housekeeping"), null, "housekeeping sees the diary");
eq(whyNotBook("housekeeping"), BOOK_REFUSED, "housekeeping does not book, in the API's words");
eq(whyNotBook("front_desk"), null, "reception books and charges");
eq(whyNotSetUp("front_desk"), LIST_REFUSED, "reception does not set prices");
eq(whyNotRead("finance"), READ_REFUSED, "the accountant does not see the diary (SPA-2)");
eq(whyNotRead(null) !== null && whyNotBook(null) !== null && whyNotSetUp(null) !== null, true, "nobody rostered is refused");

/* The words, as spa.ts writes them. */
eq(READ_REFUSED, "The spa diary is open to reception, housekeeping, the manager, an administrator and the owner. Ask one of them.", "the read's sentence");
eq(BOOK_REFUSED, "Taking a spa booking is for reception, the manager, an administrator or the owner. Ask one of them.", "the booking's sentence");
eq(LIST_REFUSED, "The treatment list is set by the owner, an administrator or the general manager. Ask one of them.", "the list's sentence");
eq(SWITCHED_OFF, "This property has no spa. Turn it on in the property's settings if that is wrong.", "the switch's sentence");

console.log("spa roles: all checks pass");
