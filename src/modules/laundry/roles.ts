/* ══════════════════════════════════════════════════════════════════
   WHO MAY DO WHAT IN THE LAUNDRY. The API decides (AGENTS rule 1); the
   phone shows a control the API would refuse DISABLED, with the API's own
   sentence, and reads nothing for a person the API would refuse the read.
   The lists and words are the API's:
     api/src/roleGate.ts      LAUNDRY (laundry view, every GET), LAUNDRY_TAKE
                              (create), LAUNDRY_CHANGE and LAUNDRY_CHARGE
                              (edit), LAUNDRY_CANCEL (cancel); refusalFor's
                              sentence, WHO's names, in ROLES' order
     api/src/permissions.ts   who holds `laundry` (D18-8: reception and
                              housekeeping, no new roles)
     api/src/modules/laundry/laundry.ts   moduleGate's sentence
   Read from the PMS's code on 4 Nov (no API runs in the cloud, so not read
   back from a refused request: roles.check.ts holds the words as the
   gate builds them). If the PMS changes a role, change it here.
   ══════════════════════════════════════════════════════════════════ */

/** `laundry` view: every read (owner, admin, GM, hotel manager, reception,
    housekeeping, the accountant, a viewer). */
const READERS: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "front_desk", "housekeeping", "finance", "read_only"];
/** `laundry` create = edit = cancel, today: the six who run it. */
const RUNNERS: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "front_desk", "housekeeping"];

const SIX = "the owner, an administrator, the general manager, the hotel manager, reception or housekeeping";
const allow = (list: readonly string[], role: string | null, refusal: string) =>
  role != null && list.includes(role) ? null : refusal;

/** Each answers null when the API would allow it, else the API's sentence. */
export const whyNotRead = (role: string | null) =>
  allow(READERS, role, "Reading laundry is for the owner, an administrator, the general manager, the hotel manager, "
    + "reception, housekeeping, the accountant or a viewer. Ask one of them.");
export const whyNotTake = (role: string | null) => allow(RUNNERS, role, `Taking in laundry is for ${SIX}. Ask one of them.`);
export const whyNotChange = (role: string | null) => allow(RUNNERS, role, `Changing a laundry docket is for ${SIX}. Ask one of them.`);
export const whyNotCancel = (role: string | null) => allow(RUNNERS, role, `Cancelling a laundry docket is for ${SIX}. Ask one of them.`);
export const whyNotCharge = (role: string | null) => allow(RUNNERS, role, `Charging laundry to a room is for ${SIX}. Ask one of them.`);

/** The property has laundry switched off: every route answers this, 403 (moduleGate). */
export const SWITCHED_OFF = "This property does not run a laundry. Turn it on in the property's settings if that is wrong.";

/** The app's words for a control the phone does not have yet (the core's menu.ts ON_THE_WEBSITE). */
export const ON_THE_WEBSITE = "On the website for now";
