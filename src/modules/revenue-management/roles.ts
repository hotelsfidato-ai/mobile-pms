/* ══════════════════════════════════════════════════════════════════
   WHO MAY OPEN THE REVENUE OUTLOOK, AND WHAT THE API SAYS TO THE REST.
   The web's page is guarded by its menu entry (routes.tsx RequireAccess,
   nav.ts `canSee: setsRates`: whoever holds `edit` on `rate` - the owner,
   an administrator, the GM and the revenue manager); the core's
   `mayReach` asks the same port of the web's menu (src/core/menu.ts).
   The reads behind it, api/src/roleGate.ts (a4527ea):
     974-976  GET statistics/daily, /period, /snapshot
              see(["report", "rate"], "occupancy and ADR")
     977      GET revenue/pickup   PRICES = see("rate", "prices")
     980      GET market-rates     PRICES
     1156-1198 WHO, list, refusalFor: the sentence, ported below
   The switch (GET/PUT market-rates/switch, `room_config`) is Settings,
   desk set-up: on the website. Pure: roles.check.ts.
   ══════════════════════════════════════════════════════════════════ */

import { ROLES, ROLE_LABELS, asRole, can, mayReach, type Role } from "../../core/menu.ts";

/** The web's address of the page (nav.ts). */
export const OUTLOOK = "/h/:code/revenue-outlook";

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

const FIGURES: Grant = { allows: (r) => can(r, "view", "report") || can(r, "view", "rate"), doing: "Reading occupancy and ADR" };
const PRICES: Grant = { allows: (r) => can(r, "view", "rate"), doing: "Reading prices" };

/** The API's 403 for the statistics reads, word for word. */
export const FIGURES_REFUSED = refusalFor(FIGURES);
/** The API's 403 for pickup and rivals' prices. */
export const PRICES_REFUSED = refusalFor(PRICES);

/** Whether the web's menu, and so its route guard, opens the page to this role. */
export const mayOpen = (role: string | null) => mayReach(asRole(role), OUTLOOK);

/** RequireAccess's sentence for a role the menu does not give the page. */
export const notYourRole = (role: string | null) =>
  `You are signed in as ${ROLE_LABELS[asRole(role)]}, which does not include Revenue outlook. If you need it, the person who set up your account can change your role.`;

/** The API's sentence when it would refuse one of the page's reads, else null. */
export const whyNotRead = (role: string | null) => {
  const r = asRole(role);
  return !FIGURES.allows(r) ? FIGURES_REFUSED : !PRICES.allows(r) ? PRICES_REFUSED : null;
};
