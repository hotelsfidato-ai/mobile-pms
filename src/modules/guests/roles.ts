/* ══════════════════════════════════════════════════════════════════
   WHO MAY LOOK UP A GUEST OR A COMPANY, AND WHO MAY CHANGE ONE. The API
   decides (AGENTS rule 1); the phone reads nothing the API would refuse
   and shows a refused control DISABLED, with the API's own sentence.
   The lists and words are the API's, read in today's PMS (4 Nov):
     api/src/roleGate.ts      READ_RULES: GET /guests, /crm/guests[/:id],
                              /crm/offers-yes are GUESTS (`customer` view);
                              GET /companies, /company-records are `company`
                              view ("Reading companies"). WRITE_RULES:
                              POST /companies `company` create ("Adding a
                              company"), PATCH /companies/:id `company` edit
                              ("Changing a company"), PATCH /guests/:id GUEST
                              (`customer` edit, "Changing a guest's
                              record"); the crm writes are `own`.
                              refusalFor's sentence, WHO's names, ROLES' order.
     api/src/permissions.ts   who holds `customer` and `company` (the
                              core's port: src/core/menu.ts MATRIX)
     api/src/modules/guests/people.ts   isManager (app.is_crm_manager: the
                              owner, an administrator or a GM) and its
                              MANAGERS_ONLY sentence, asked by every /crm route
                              after the gate; src/modules/crm/access.ts
                              seesGuest360, the same three.
   No API runs in the cloud, so these were not read back from a refused
   request: roles.check.ts holds each sentence against the gate's own way of
   building it. If the PMS changes a role, change it here.
   ══════════════════════════════════════════════════════════════════ */

/** `customer` view = `company` view, today: who reads Guests and Companies and agents. */
const READERS: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "front_desk", "finance", "read_only"];
/** `company` create (D27-184, C-7: reception adds a company, without credit). */
const ADDERS: readonly string[] = ["owner", "admin", "gm", "front_desk"];
/** `company` edit; and Guest 360's three (D21-4, app.is_crm_manager). */
const MANAGERS: readonly string[] = ["owner", "admin", "gm"];
/** `customer` edit: who corrects a guest's record (GU-1). */
const GUEST_EDITORS: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "front_desk"];

const READ_LIST = "the owner, an administrator, the general manager, the hotel manager, reception, the accountant or a viewer";
const allow = (list: readonly string[], role: string | null, refusal: string) =>
  role != null && list.includes(role) ? null : refusal;

/** Each answers null when the API would allow it, else the API's sentence. */
export const whyNotGuests = (role: string | null) =>
  allow(READERS, role, `Reading guests is for ${READ_LIST}. Ask one of them.`);
export const whyNotCompanies = (role: string | null) =>
  allow(READERS, role, `Reading companies is for ${READ_LIST}. Ask one of them.`);
export const whyNotAddCompany = (role: string | null) =>
  allow(ADDERS, role, "Adding a company is for the owner, an administrator, the general manager or reception. Ask one of them.");
export const whyNotChangeCompany = (role: string | null) =>
  allow(MANAGERS, role, "Changing a company is for the owner, an administrator or the general manager. Ask one of them.");
export const whyNotEditGuest = (role: string | null) =>
  allow(GUEST_EDITORS, role, "Changing a guest's record is for the owner, an administrator, the general manager, "
    + "the hotel manager or reception. Ask one of them.");

/** people.ts MANAGERS_ONLY: every /crm route, to a reader who is not one of the three. */
export const MANAGERS_ONLY = "This is for the owner, an administrator or a general manager.";

/** Guest 360 and its writes (the blacklist, offers): the gate first, then people.ts. */
export const whyNotGuest360 = (role: string | null) =>
  whyNotGuests(role) ?? allow(MANAGERS, role, MANAGERS_ONLY);

/** The app's words for a control the phone does not have yet (the core's menu.ts ON_THE_WEBSITE). */
export const ON_THE_WEBSITE = "On the website for now";
