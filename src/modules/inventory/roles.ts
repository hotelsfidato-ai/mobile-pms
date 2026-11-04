/* ══════════════════════════════════════════════════════════════════
   WHO MAY READ AND CHANGE RATES. The API decides (AGENTS rule 1): its role
   gate asks the matrix on every route, and a refusal is one sentence that
   names who may. The phone asks the same matrix (the core's port of
   api/src/permissions.ts, src/core/menu.ts `can`) and writes the same
   sentence, so a control the API would refuse is drawn DISABLED with the
   API's own words, never hidden.

   Ported from api/src/roleGate.ts (the PMS at a4527ea, 2 Nov):
     190-193  PRICE        grant("rate", "edit", "Setting a price")
              RESTRICTION  grant("rate", "edit", "Setting a stop sell or a minimum stay")
     796      PRICES       see("rate", "prices")           GET /pricing, /rates
     863      GET /inventory  see(["inventory", "reservation"], "availability")
    1172-1188 WHO, whoMay, list, refusalFor - the sentence
   `rate` edit is exactly RATE_SETTER_ROLES (src/lib/permissions.ts 151,
   api/src/modules/inventory/rateSetters.ts): the owner, an administrator,
   the GM and the revenue manager (INV-5).

   Pure: no React Native here, so roles.check.ts runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { asRole, can, ROLES, type Resource, type Role } from "../../core/menu.ts";

type Action = "view" | "edit";
type Grant = { resource: readonly Resource[]; action: Action; doing: string };

/** roleGate.ts WHO: how each role is named when a refusal says who may. */
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

export const PRICES: Grant = { resource: ["rate"], action: "view", doing: "Reading prices" };
export const AVAILABILITY: Grant = { resource: ["inventory", "reservation"], action: "view", doing: "Reading availability" };
export const PRICE: Grant = { resource: ["rate"], action: "edit", doing: "Setting a price" };
export const RESTRICTION: Grant = { resource: ["rate"], action: "edit", doing: "Setting a stop sell or a minimum stay" };

const allows = (g: Grant, role: Role) => g.resource.some((r) => can(role, g.action, r));

/** roleGate.ts whoMay: never the automation account. */
export const whoMay = (g: Grant): Role[] => ROLES.filter((r) => r !== "automation" && allows(g, r));

const list = (names: string[]) =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;

/** roleGate.ts refusalFor: what a refused person reads. */
export const refusalFor = (g: Grant) => `${g.doing} is for ${list(whoMay(g).map((r) => WHO[r]))}. Ask one of them.`;

/** null when the API lets this role through, else the API's sentence. An
    unknown role is a viewer, as the web's roleFor (menu.ts asRole). */
export const whyNot = (g: Grant, role: string | null): string | null => (allows(g, asRole(role)) ? null : refusalFor(g));

/** A control the phone leaves to the website (heavy set-up, the brief). */
export const ON_THE_WEBSITE = "On the website for now";
