/* ══════════════════════════════════════════════════════════════════
   WHO MAY READ AND CHANGE THE PROPERTY'S SET-UP (lane m13-config, 19 Nov).
   The API decides (AGENTS rule 1); the phone asks the same matrix (the
   core's port of api/src/permissions.ts, checked equal to the PMS of
   16 Nov for room_config, rate, commission, integration, stock and
   reservation) and writes the API's own sentence, so a control the API
   would refuse is drawn DISABLED with its words, never hidden.

   Ported from the PMS at c9394cb (16 Nov):
     api/src/roleGate.ts 173-174  SETUP_ADD    grant("room_config", "create", "Setting the hotel up")
                                  SETUP_CHANGE grant("room_config", "edit", "Changing the hotel's setup")
                         207      TERMS        grant("rate", "edit", "Setting the cancellation terms")
                         210      COMMISSION   grant("commission", "edit", "Setting a booking source's commission")
                         849-875  see(): SETUP see("room_config", "the hotel's setup"), PRICES see("rate", "prices")
                         945      GET booking-sources see(["reservation", "commission"], "booking sources")
                         1289-1329 WHO, whoMay, list, refusalFor - the sentence
     db/migrations/198 app.is_manager(): a group administrator, or the owner,
       an Administrator or the GM AT ANY HOTEL - booking sources' add and
       change (api/src/modules/guests/bookingSources.ts 131-145, 204-210).
     api/src/routes/places.ts 26-36  PLACE_KEEPERS and REFUSED (the server
       also sends mayChange / whoMay with the read; the screen uses those).
     api/src/modules/channel-manager/access.ts 24-55  SU_ROLES, SU_REFUSED,
       CHANNEL_BOOKING_ROLES, CHANNEL_BOOKINGS_REFUSED.
     src/modules/reports/groupHotels.ts hotelsWhere(setsRates): Group rate
       change offers the real properties where the person sets prices.

   Pure: no React Native here, so configRoles.check.ts runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { asRole, can, ROLES, type Resource, type Role } from "../../core/menu.ts";

type Action = "view" | "create" | "edit";
export type Grant = { resource: readonly Resource[]; action: Action; doing: string };

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

const grant = (resource: Resource | readonly Resource[], action: Action, doing: string): Grant =>
  ({ resource: ([] as Resource[]).concat(resource), action, doing });

/* Room types and rooms. */
export const SETUP_READ = grant("room_config", "view", "Reading the hotel's setup");
export const SETUP_ADD = grant("room_config", "create", "Setting the hotel up");
export const SETUP_CHANGE = grant("room_config", "edit", "Changing the hotel's setup");
/* Cancellation terms: read as prices, written by the rate setters. */
export const TERMS_READ = grant("rate", "view", "Reading prices");
export const TERMS = grant("rate", "edit", "Setting the cancellation terms");
/* Booking sources. */
export const SOURCES_READ = grant(["reservation", "commission"], "view", "Reading booking sources");
export const COMMISSION = grant("commission", "edit", "Setting a booking source's commission");
/* Group rate change: PUT pricing/base's rule at every property (groupRates.ts PRICE_RULE). */
export const PRICE = grant("rate", "edit", "Setting a price");

const allows = (g: Grant, role: Role) => g.resource.some((r) => can(role, g.action, r));

/** roleGate.ts whoMay: never the automation account. */
export const whoMay = (g: Grant): Role[] => ROLES.filter((r) => r !== "automation" && allows(g, r));

const list = (names: string[]) =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;

/** roleGate.ts refusalFor: what a refused person reads. */
export const refusalFor = (g: Grant) => `${g.doing} is for ${list(whoMay(g).map((r) => WHO[r]))}. Ask one of them.`;

/** null when the API lets this role through, else the API's sentence. An
    unknown role is a viewer (the web's roleFor, menu.ts asRole). */
export const whyNot = (g: Grant, role: string | null): string | null => (allows(g, asRole(role)) ? null : refusalFor(g));

/* ── Booking sources: the database's app.is_manager() ───────────── */

const MANAGERS: readonly string[] = ["owner", "admin", "gm"];

/** bookingSources.ts 141-145: the database's refusal, turned into words. */
export const SOURCE_ADD_REFUSED = "Adding a booking source is a manager's change - it applies to every property in the group.";
export const SOURCE_CHANGE_REFUSED = "Changing a booking source is a manager's change - it applies to every property in the group.";

/** app.is_manager() (migration 198): a group administrator, or the owner, an
    Administrator or the GM at ANY hotel - the list is the group's, so the
    role at this hotel alone does not decide it. */
export const isManager = (scope: { isGroupAdmin: boolean; hotels: readonly { role: string }[] }) =>
  scope.isGroupAdmin || scope.hotels.some((h) => MANAGERS.includes(h.role));

/* ── The channel manager (access.ts) ────────────────────────────── */

export const SU_ROLES: readonly string[] = ["owner", "admin"];
export const SU_REFUSED = "The SU connection is for the owner and an administrator. Ask one of them.";
export const CHANNEL_BOOKING_ROLES: readonly string[] = ["owner", "admin", "gm"];
export const CHANNEL_BOOKINGS_REFUSED =
  "Bookings from the booking sites are for the owner, an administrator and the general manager.";

/** maySetUpSuAt: the owner or an Administrator at this hotel (a group administrator is the owner). */
export const setsUpSu = (role: string | null) => SU_ROLES.includes(role ?? "");
export const readsChannelBookings = (role: string | null) => CHANNEL_BOOKING_ROLES.includes(role ?? "");

/* ── Group rate change (groupHotels.ts hotelsWhere, groupRates.ts properties) ── */

export interface ScopeHotel { id: string; code: string; name: string; businessDate: string; testOf?: string | null }

/** The real properties where this person sets prices, in the session's order:
    never a test hotel (the server refuses one), never one they do not work at. */
export function priceHotels(
  scope: { isGroupAdmin: boolean; hotels: readonly { hotelId: string; role: string }[] },
  hotels: readonly ScopeHotel[],
): ScopeHotel[] {
  return hotels.filter((h) => {
    if (h.testOf != null) return false;
    const role = scope.isGroupAdmin ? "owner" : scope.hotels.find((g) => g.hotelId === h.id)?.role ?? null;
    return role !== null && whyNot(PRICE, role) === null;
  });
}

/** inventory/nav.ts: the menu shows Group rate change to a price setter over more than one property. */
export const seesGroupRates = (role: string | null, hotels: readonly ScopeHotel[]) =>
  whyNot(PRICE, role) === null && hotels.length > 1;
