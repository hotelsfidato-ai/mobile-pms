import { can, type Role } from "../../core/menu.ts";
import { whyNotGuests } from "../guests/roles.ts";

/* ══════════════════════════════════════════════════════════════════
   WHO MAY DO WHAT ON LOYALTY. The API decides (AGENTS rule 1): the phone
   reads nothing the API would refuse, and draws a control it would refuse
   DISABLED with the sentence. Read in today's PMS (4 Nov):
     api/src/roleGate.ts   READ_RULES: GET /loyalty, /loyalty/guests/:id,
                           /loyalty/by-hotel are GUESTS (`customer` view,
                           "Reading guests" - the guests module's sentence).
                           WRITE_RULES: join and leave LOYALTY_MEMBER
                           (`customer` edit, "Joining a guest to loyalty,
                           or taking them out"); redeem LOYALTY_POINTS
                           (`reservation` edit, "Using a guest's loyalty
                           points"); rules and adjust `own` (the route's
                           and the database's own answers). refusalFor's
                           sentence, WHO's names, ROLES' order.
     api/src/modules/loyalty/loyalty.ts   MANAGERS_ONLY (the card, the
                           month by hotel), the rules' 403 sentence.
     db/migrations/178_loyalty.sql        app.loyalty_adjust's refusal.
     src/modules/loyalty/pages/Loyalty.tsx   mayJoin = can(role, "edit",
                           "customer") (D27-307 (4)); Use points, The
                           rules and Points by hotel ask the server's
                           mayRedeem, maySetRules and isManager, which the
                           screen's read carries.
   No API runs in the cloud, so none was read back from a refused request:
   roles.check.ts holds each against the gate's own way of building it.
   ══════════════════════════════════════════════════════════════════ */

/** Who reads the Loyalty screen: the gate's GUESTS. */
export const whyNotRead = (role: string | null) => whyNotGuests(role);

/** Join and Leave, as the web asks (Loyalty.tsx 67): the gate's LOYALTY_MEMBER. */
export const mayJoin = (role: string | null) => role != null && can(role as Role, "edit", "customer");

/** The gate's sentences, for a refused Join / Leave or Use points. */
export const JOIN_REFUSED = "Joining a guest to loyalty, or taking them out is for the owner, an administrator, the general "
  + "manager, the hotel manager or reception. Ask one of them.";
export const REDEEM_REFUSED = "Using a guest's loyalty points is for the owner, an administrator, the general manager, the "
  + "hotel manager or reception. Ask one of them.";

/** PUT /loyalty/rules, 403 (loyalty.ts 107). */
export const RULES_REFUSED = "The loyalty rules are set by the owner, an administrator or a general manager.";
/** The card and the month by hotel, 403 (loyalty.ts MANAGERS_ONLY). */
export const MANAGERS_ONLY = "This is for the owner, an administrator or a general manager.";
/** app.loyalty_adjust's refusal (178_loyalty.sql 438). */
export const ADJUST_REFUSED = "Points are added or taken by the owner, an administrator or the general manager.";
