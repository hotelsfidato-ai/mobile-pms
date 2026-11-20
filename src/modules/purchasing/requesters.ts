/* ══════════════════════════════════════════════════════════════════
   WHO MAY ASK TO BUY, ON A PHONE (lane U, 19 Nov) — ported by hand from the
   web's src/modules/purchasing/pages/WhoMayAsk.tsx (the order by what a
   person reads, a row's words, the toasts) and src/lib/permissions.ts
   ROLE_LABELS. The server is api/src/modules/purchasing/purchasing.ts lines
   315-385 (GET /purchasing/requesters, PUT /purchasing/requesters/:role)
   and purchasingGrants.ts (VIEW_ROLES to read, SETTING_KEEPERS - the owner
   and an administrator - to change; PURCHASING_REFUSED.setting).

   A ROLE AND NOT A PERSON (staff leave), and SWITCHED OFF, NEVER DELETED:
   who was allowed to buy things last March is part of the record. Whether
   this person may change it is the SERVER's answer (`mayChange`), never
   worked out here. Switching a role off asks first (M-13).

   Pure: no React Native, so requesters.check.ts runs under node.
   ══════════════════════════════════════════════════════════════════ */

/** GET /purchasing/requesters. */
export interface RequesterSetting { mayChange: boolean; roles: { role: string; mayRaise: boolean }[] }

/** src/lib/permissions.ts ROLE_LABELS: what anybody reads (the stored value is an identifier). */
export const ROLE_LABELS: Readonly<Record<string, string>> = {
  owner: "Owner", admin: "Admin", gm: "General Manager", hotel_manager: "Hotel Manager", revenue_manager: "Revenue Manager",
  front_desk: "Reception", housekeeping: "Housekeeping", kitchen_manager: "Kitchen Manager", chef: "Chef", pos: "Waiter",
  bar: "Bar", stores: "Inventory Manager", finance: "Accountant", read_only: "Viewer", automation: "Automation",
};
export const labelOf = (role: string) => ROLE_LABELS[role] ?? role;

/** SORTED BY WHAT A PERSON READS, not by the key underneath (the web's own fix). */
export const sortedRoles = (roles: RequesterSetting["roles"]) =>
  [...roles].sort((a, b) => labelOf(a.role).localeCompare(labelOf(b.role)));

export const standing = (mayRaise: boolean) => (mayRaise ? "Can raise a request" : "Cannot raise a request");
/** Without the right to change, the row's right side: "Yes", or a dash. */
export const yesOrDash = (mayRaise: boolean) => (mayRaise ? "Yes" : "-");
export const switchAct = (mayRaise: boolean) => (mayRaise ? "Switch off" : "Switch on");

/** The web's card for somebody who may not change it. */
export const NOT_YOURS = "Changing this is for the owner or an administrator. What it says today is below.";
/** purchasingGrants.ts PURCHASING_REFUSED.setting: the server's 403. */
export const SETTING_REFUSED = "Changing who may raise a purchase request is for the owner or an administrator. Ask one of them.";

/** The web's toast once it lands. */
export const switchedWords = (role: string, next: boolean) =>
  next ? `${labelOf(role)} can now raise a purchase request.` : `${labelOf(role)} can no longer raise one.`;

/** Switching a role off: asked first. */
export const switchOffAsk = (role: string) => ({
  title: `Switch off ${labelOf(role)}?`,
  body: `${labelOf(role)} can no longer raise a purchase request at this property. It takes effect at once; requests already raised stay as they are, and it can be switched on again.`,
});
