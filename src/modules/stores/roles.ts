/* ══════════════════════════════════════════════════════════════════
   WHO MAY DO WHAT IN THE STORE, THE BAR AND THE KITCHEN. The API decides
   (AGENTS rule 1); these are its lists and its own sentences, read from
   the PMS on 4 Nov (no API runs in the cloud, so not read back from a
   refused request: roles.check.ts pins each list against the core's port
   of the matrix, so the two cannot drift):
     api/src/modules/stores/stockGrants.ts   STOCK_ROLES, STOCK_REFUSED,
                                             BAR_KEEPERS, KITCHEN_KEEPERS
     api/src/modules/stores/barSheet.ts      FORMAT_SETTERS, SHEET_REFUSED,
                                             READ_REFUSED, CLOSED_REFUSED
     api/src/modules/stores/barRequests.ts   BAR_APPROVERS, ASK_REFUSED,
                                             DECIDE_REFUSED
     api/src/modules/stores/kitchenSheet.ts  KEEP_REFUSED
     api/src/modules/stores/barGate.ts       BAR_STOCK_OFF
   Every one of these routes is `own(...)` in api/src/roleGate.ts: the
   route asks the role itself, and these are the words it answers with.
   ══════════════════════════════════════════════════════════════════ */

/** STOCK_ROLES: view (the list, a history), create (receive, issue, waste,
    return, move, break, add), edit (correct a count, count a store, undo). */
export const STOCK_VIEW: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "stores", "kitchen_manager",
  "chef", "housekeeping", "finance", "read_only"];
export const STOCK_CREATE: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "stores", "kitchen_manager"];
export const STOCK_EDIT: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "stores"];
export const BAR_KEEPERS: readonly string[] = ["owner", "admin", "gm", "bar", "stores"];
export const KITCHEN_KEEPERS: readonly string[] = ["owner", "admin", "gm", "stores"];
export const BAR_APPROVERS: readonly string[] = ["owner", "admin", "gm", "stores"];
/** Who marks "Bar closed today" (barSheet.ts FORMAT_SETTERS). */
export const BAR_CLOSERS: readonly string[] = ["owner", "admin", "gm"];

export const STOCK_REFUSED = {
  view: "The Store is not open to your role. The owner, an administrator, the "
    + "general manager, the hotel manager, the Inventory Manager, the kitchen, "
    + "housekeeping, the accountant and a viewer can see it.",
  create: "Receiving, issuing, recording waste or a return, and adding an item are "
    + "for the owner, an administrator, the general manager, the hotel "
    + "manager, the Inventory Manager or the kitchen manager. Ask one of them.",
  edit: "Undoing a movement, correcting a count and changing an item already in "
    + "the store are for the owner, an administrator, the general manager, "
    + "the hotel manager or the Inventory Manager. Ask one of them.",
} as const;

export const BAR_COUNT_REFUSED = "Counting the bar is for the owner, an administrator, the general manager, "
  + "the bar manager (the Bar role) and the Inventory Manager.";
export const BAR_READ_REFUSED = "The bar's sheet is for whoever sees the Store, and the bar manager.";
export const BAR_CLOSED_REFUSED = "\"Bar closed today\" is for the owner, an administrator or the general manager.";
export const ASK_REFUSED = "Asking the store is for the bar manager (the Bar role), the Inventory Manager, "
  + "the general manager, an administrator and the owner.";
export const DECIDE_REFUSED = "The general manager or the Inventory Manager approves the counter's ask "
  + "(an administrator or the owner too).";
export const KITCHEN_KEEP_REFUSED = "Recipes, the kitchen's count and which store is the kitchen's are for the owner, "
  + "an administrator, the general manager and the Inventory Manager.";

/** The web page's own words for a look-only person (Stores.tsx LOOK_ONLY,
    UNDO_NOT_YOURS): the owner's choice of 16 September is ONE sentence and
    no change buttons, not four grey buttons on every card. */
export const LOOK_ONLY = "You can see the store. Receiving, issuing and adding items is for the "
  + "Inventory Manager, hotel manager or GM.";
export const UNDO_NOT_YOURS = "Undoing a movement is for the Inventory Manager, hotel manager or GM.";

const allow = (list: readonly string[], role: string | null, refusal: string) =>
  role != null && list.includes(role) ? null : refusal;

/** Each answers null when the API would allow it, else the API's sentence. */
export const whyNotSee = (role: string | null) => allow(STOCK_VIEW, role, STOCK_REFUSED.view);
export const whyNotChange = (role: string | null) => allow(STOCK_CREATE, role, STOCK_REFUSED.create);
export const whyNotCorrect = (role: string | null) => allow(STOCK_EDIT, role, STOCK_REFUSED.edit);
export const whyNotSeeBar = (role: string | null) => allow([...STOCK_VIEW, ...BAR_KEEPERS], role, BAR_READ_REFUSED);
export const whyNotCountBar = (role: string | null) => allow(BAR_KEEPERS, role, BAR_COUNT_REFUSED);
export const whyNotCloseBar = (role: string | null) => allow(BAR_CLOSERS, role, BAR_CLOSED_REFUSED);
export const whyNotAsk = (role: string | null) => allow(BAR_KEEPERS, role, ASK_REFUSED);
export const whyNotDecide = (role: string | null) => allow(BAR_APPROVERS, role, DECIDE_REFUSED);
export const whyNotCountKitchen = (role: string | null) => allow(KITCHEN_KEEPERS, role, KITCHEN_KEEP_REFUSED);

/** Bar stock switched off at the property: every /bar/ route answers this, 403. */
export const BAR_STOCK_OFF = "Bar stock is switched off at this property. The owner or an administrator turns it on in Admin, Properties.";

/** The app's words for a control the phone does not have yet (the core's menu.ts ON_THE_WEBSITE). */
export const ON_THE_WEBSITE = "On the website for now";
