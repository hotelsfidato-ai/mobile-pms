/* ══════════════════════════════════════════════════════════════════
   WHO MAY READ AND CLOSE THE DAY. The API decides (AGENTS rule 1); the
   phone asks the same matrix and says the API's own sentence.
     api/src/roleGate.ts 134   CLOSE_DAY = grant("invoice", "create", "Closing the day")
     api/src/roleGate.ts 783   REPORTS   = see("report", "reports"): GET night-audit,
                                            /runs, /undos, /days/:date/charges
     api/src/roleGate.ts 138   CORRECT_DAY = grant("reservation", "approve", ...)
     api/src/roleGate.ts 1156  WHO, list, refusalFor: the sentence, ported below
   The matrix is the core's port of api/src/permissions.ts (src/core/menu.ts
   `can`, `ROLES`, checked equal to the API's on 4 Nov). Pure: roles.check.ts.
   ══════════════════════════════════════════════════════════════════ */

import { ROLES, asRole, can, type Role } from "../../core/menu.ts";

/* roleGate.ts WHO: how each role is named when a refusal says who may. */
const WHO: Readonly<Record<Role, string>> = {
  owner: "the owner",
  admin: "an administrator",
  gm: "the general manager",
  hotel_manager: "the hotel manager",
  revenue_manager: "the revenue manager",
  front_desk: "reception",
  housekeeping: "housekeeping",
  kitchen_manager: "the kitchen manager",
  chef: "a chef",
  pos: "a waiter",
  bar: "a bar person",
  stores: "the Inventory Manager",
  finance: "the accountant",
  read_only: "a viewer",
  automation: "an automation account",
};

type Grant = { allows: (role: Role) => boolean; doing: string };

const list = (names: string[]) =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;

/** roleGate.ts refusalFor: what they tried, and whom to ask. */
const refusalFor = (g: Grant) =>
  `${g.doing} is for ${list(ROLES.filter((r) => r !== "automation" && g.allows(r)).map((r) => WHO[r]))}. Ask one of them.`;

const READ: Grant = { allows: (r) => can(r, "view", "report"), doing: "Reading reports" };
const CLOSE: Grant = { allows: (r) => can(r, "create", "invoice"), doing: "Closing the day" };
const CORRECT: Grant = { allows: (r) => can(r, "approve", "reservation"), doing: "Correcting a closed day" };

/** The API's 403 for the screen's reads, word for word. */
export const READ_REFUSED = refusalFor(READ);
/** The API's 403 for POST /night-audit/run. */
export const CLOSE_REFUSED = refusalFor(CLOSE);

/** null when the API lets this person read the night audit, else its sentence. */
export const whyNotRead = (role: string | null) => (READ.allows(asRole(role)) ? null : READ_REFUSED);

/** Run is shown only to a role that may close the day (the web's `mayClose`,
    NightAudit.tsx 82; the owner's D27-305): the revenue manager and the
    viewer read the screen and are not shown Run at all. */
export const mayClose = (role: string | null) => CLOSE.allows(asRole(role));

/** Correct, or only Corrections, on a closed day (NightAudit.tsx 77, D24-3). */
export const mayCorrect = (role: string | null) => CORRECT.allows(asRole(role));
