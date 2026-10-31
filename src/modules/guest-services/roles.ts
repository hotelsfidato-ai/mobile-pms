/* ══════════════════════════════════════════════════════════════════
   WHO MAY DO WHAT IN GUEST SERVICES. The API decides (AGENTS rule 1); the
   phone shows a screen or a control the API would refuse DISABLED, with
   the API's own sentence. The lists and words are the API's:
     api/src/modules/guest-services/requests.ts    DESK, RECEIVERS,
                                                    teamsFor, REFUSED
     api/src/modules/guest-services/wakeAndLost.ts LOST_LOGGERS and the
                                                    three sentences
     api/src/routes/guestDoorKit.ts                 DESK_ROLES, DESK_REFUSED
                                                    (online check-in and the
                                                    guests' messages)
   Read back from the API on 17 Oct (roles.check.ts holds the words). If
   the PMS changes a role, change it here.
   ══════════════════════════════════════════════════════════════════ */

export type Team = "housekeeping" | "maintenance" | "fnb";
export const TEAMS: readonly Team[] = ["housekeeping", "maintenance", "fnb"];

/** The desk: owner, admin, GM, hotel manager, reception (requests.ts DESK,
    guestDoorKit.ts DESK_ROLES - the same five). */
export const DESK: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "front_desk"];

/** Who receives each team's requests (D27-181). Maintenance is housekeeping's
    REPAIR_UPDATERS (D22-34). */
const RECEIVERS: Record<Team, readonly string[]> = {
  housekeeping: ["housekeeping"],
  maintenance: ["owner", "admin", "gm", "hotel_manager", "stores", "housekeeping"],
  fnb: ["kitchen_manager", "chef", "pos", "bar"],
};

/** The teams whose requests a role sees and acts on: all three for the desk (requests.ts teamsFor). */
export const teamsFor = (role: string | null): Team[] =>
  role === null ? [] : TEAMS.filter((t) => DESK.includes(role) || RECEIVERS[t].includes(role));

const LOST_LOGGERS: readonly string[] = [...DESK, "housekeeping"];

export const REQUESTS_REFUSED =
  "Guest requests are for the front desk, housekeeping, the kitchen and the restaurant. Ask one of them.";
export const WAKE_REFUSED = "Wake-up calls are for the front desk. Ask one of them.";
export const LOST_REFUSED = "Lost property is for the front desk and housekeeping. Ask one of them.";
export const CLEAR_REFUSED = "Returning or disposing of lost property is for the front desk. Ask one of them.";
export const DESK_REFUSED = "Online check-in is handled by reception, the manager, an "
  + "administrator or the owner. Ask one of them.";
/** A control the phone cannot do yet (it needs a package, or the owner's yes). */
export const ON_THE_WEBSITE = "On the website for now.";

const allow = (ok: boolean, refusal: string) => (ok ? null : refusal);

/** Each answers null when the API would allow it, else the API's sentence. */
export const whyNotRequests = (role: string | null) => allow(teamsFor(role).length > 0, REQUESTS_REFUSED);
export const whyNotWakeUps = (role: string | null) => allow(role != null && DESK.includes(role), WAKE_REFUSED);
export const whyNotLost = (role: string | null) => allow(role != null && LOST_LOGGERS.includes(role), LOST_REFUSED);
export const whyNotClear = (role: string | null) => allow(role != null && DESK.includes(role), CLEAR_REFUSED);
/** Online check-in's desk screen, and the guests' messages to the desk with their replies. */
export const whyNotDesk = (role: string | null) => allow(role != null && DESK.includes(role), DESK_REFUSED);
