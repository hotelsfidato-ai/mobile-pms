/* ══════════════════════════════════════════════════════════════════
   WHO MAY DO WHAT IN PURCHASING. The API decides (AGENTS rule 1); the
   phone shows a control the API would refuse DISABLED, with the API's own
   sentence, and reads nothing for a person the API would refuse the read.

   Three questions with three answers (api/src/modules/purchasing/
   purchasingGrants.ts says why):
     LOOK      VIEW_ROLES (`purchasing` view in api/src/permissions.ts),
               every GET; PURCHASING_REFUSED.view
     RAISE, PRICE, ORDER, CANCEL
               NOT a list: a setting per property (D18-2), asked of the
               server, which answers it as `me.mayRaise` on the list's read.
               Refused with PURCHASING_REFUSED.raise. Nothing here copies it.
     RECEIVE   the Store's rule: mayDeliverInto asks `stock` create
               (api/src/modules/stores/stockGrants.ts STOCK_ROLES.create),
               refused with STOCK_REFUSED.create. The delivery route does
               NOT ask the setting.
   DECIDING the approval is the approvals engine's (the server's
   `mayDecide`), on the app's Approvals screen; nothing here.
   Read from the PMS's code on 4 Nov (no API runs in the cloud);
   roles.check.ts holds the lists against the core's port of the matrix.
   If the PMS changes a role, change it here.
   ══════════════════════════════════════════════════════════════════ */

import { can, type Role } from "../../core/menu.ts";

/** purchasingGrants.ts VIEW_ROLES: who holds `view` on `purchasing`. */
export const VIEW_ROLES: readonly string[] = [
  "owner", "admin", "gm", "hotel_manager", "kitchen_manager", "stores", "housekeeping", "finance", "read_only",
];
/** stockGrants.ts STOCK_ROLES.create: who may put a delivery on a shelf. */
export const RECEIVERS: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "stores", "kitchen_manager"];

/** purchasingGrants.ts PURCHASING_REFUSED, the server's words. */
export const VIEW_REFUSED = "Purchasing is not open to your role. The owner, an administrator, the general manager, the "
  + "hotel manager, the Inventory Manager, the kitchen manager, housekeeping, the accountant and a viewer can see it.";
export const RAISE_REFUSED = "Raising a purchase request here is a setting for this property, and your role is not on it. "
  + "The owner or an administrator can add it, on the Purchasing screen.";
/** stockGrants.ts STOCK_REFUSED.create, the Store's words for a delivery refused. */
export const RECEIVE_REFUSED = "Receiving, issuing, recording waste or a return, and adding an item are for the owner, an "
  + "administrator, the general manager, the hotel manager, the Inventory Manager or the kitchen manager. Ask one of them.";

/** Purchasing.tsx's card for somebody the setting leaves out: told, and told whom to ask (Rule 6). */
export const MAY_NOT_ASK = "Your role cannot raise a purchase request at this property. Who may is a setting the owner or "
  + "an administrator changes at any time - ask one of them, or the Inventory Manager or general manager to raise it for you.";

/** null when the API would answer the read, else its sentence. Not rostered here (null): the route answers. */
export const whyNotRead = (role: string | null): string | null =>
  role === null || VIEW_ROLES.includes(role) ? null : VIEW_REFUSED;

/** The setting, as the server answered it on the list (`me.mayRaise`). */
export const whyNotAct = (mayRaise: boolean | undefined): string | null => (mayRaise === true ? null : RAISE_REFUSED);

/** The Store's rule for the delivery (mayDeliverInto). */
export const whyNotReceive = (role: string | null): string | null =>
  role !== null && RECEIVERS.includes(role) ? null : RECEIVE_REFUSED;

/** Supplier dues (D27-370): the four who hold `approve` on `invoice` (purchasing.ts seesSupplierDues). */
export const seesSupplierDues = (role: string | null): boolean => role !== null && can(role as Role, "approve", "invoice");

/** The app's words for a control the phone does not have yet (the core's menu.ts ON_THE_WEBSITE). */
export const ON_THE_WEBSITE = "On the website for now";
