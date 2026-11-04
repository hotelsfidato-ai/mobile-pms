/* Run: node --experimental-strip-types mobile/src/modules/revenue-management/roles.check.ts
   Who opens the Revenue outlook (the web's nav.ts `setsRates`) and the API's
   sentences for its reads (roleGate.ts 974-980), written out by hand from
   roleGate.ts's WHO and api/src/permissions.ts, not by the code above. */
import { ROLES } from "../../core/menu.ts";
import { FIGURES_REFUSED, PRICES_REFUSED, mayOpen, notYourRole, whyNotRead } from "./roles.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* setsRates: `rate` edit - the owner, an administrator, the GM and the revenue manager (INV-5). */
eq(ROLES.filter((r) => mayOpen(r)), ["owner", "admin", "gm", "revenue_manager"], "who opens the page");
eq(mayOpen(null), false, "no role is a viewer, refused");
eq(notYourRole("hotel_manager"), "You are signed in as Hotel Manager, which does not include Revenue outlook. If you need it, the person who set up your account can change your role.", "the guard's sentence");
eq(notYourRole(null).startsWith("You are signed in as Viewer,"), true, "an unknown role reads as a viewer");

/* The statistics: `report` or `rate` view. Pickup and rivals' prices: `rate` view. */
eq(FIGURES_REFUSED, "Reading occupancy and ADR is for the owner, an administrator, the general manager, the hotel manager, the revenue manager, reception, the accountant or a viewer. Ask one of them.", "the statistics' sentence");
eq(PRICES_REFUSED, "Reading prices is for the owner, an administrator, the general manager, the hotel manager, the revenue manager, reception or a viewer. Ask one of them.", "the prices' sentence");
eq(whyNotRead("finance"), PRICES_REFUSED, "the accountant reads the figures but not the prices");
eq(whyNotRead("housekeeping"), FIGURES_REFUSED, "housekeeping reads neither");

/* Every role the page opens to may make every read behind it: the menu and the API agree. */
for (const r of ROLES.filter((x) => mayOpen(x))) eq(whyNotRead(r), null, `${r} reads all of it`);

console.log("revenue roles: ok");
