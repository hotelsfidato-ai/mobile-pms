/* Run: node --experimental-strip-types src/modules/admin/roles.check.ts
   Who may open and read Administration: the web's RequireAccess (the core's mayReach) and the API's
   own sentences (api/src/roleGate.ts refusalFor, admin/grants.ts), read from today's PMS (16 Nov). */
import { ROLES } from "../../core/menu.ts";
import {
  AUDIT_REFUSED, BACKFILL_REFUSED, HEALTH_REFUSED, INTEGRATIONS_REFUSED, STAFF_REFUSED, cellOf, inWords, minPasswordFor,
  notYourRole, readsBackfill, refusedBackfill, refusedScreen, roleLabel, switchesModules, whoMay, type ScreenKey,
} from "./roles.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const opens = (screen: ScreenKey) => ROLES.filter((r) => refusedScreen(r, screen) === null);

/* Each screen opens for exactly the roles the web's navigation lets in (nav.ts, settingsConsole). */
eq(opens("people"), ["owner", "admin", "gm", "hotel_manager"], "People: `user`");
eq(opens("users"), ["owner", "admin", "gm", "hotel_manager"], "Users: `user`");
eq(opens("settings"), ["owner", "admin", "gm"], "Settings: `setting`");
eq(opens("roles"), ["owner", "admin"], "Roles: `setting` and `role`");
eq(opens("auditLog"), ["owner", "admin", "gm"], "Audit log: `setting` and `audit_log`");
eq(opens("activity"), ["owner", "admin", "gm"], "Activity");
eq(opens("signIns"), ["owner", "admin"], "Sign-ins and devices: the owner and an Admin (Q-B)");
eq(opens("integrations"), ["owner", "admin"], "Integrations: `integration`");
eq(opens("systemHealth"), ["owner", "admin"], "System health: `role`");
eq(opens("modules"), ["owner", "admin"], "Modules: switchesModules (D17-36)");
eq(opens("properties"), ["owner", "admin", "gm", "hotel_manager", "revenue_manager", "front_desk", "finance", "read_only"], "Properties: `hotel`");
eq(ROLES.filter((r) => refusedBackfill(r) === null), ["owner", "admin", "gm", "finance"], "Backfill: Settings, or the Accountant's read");
eq(ROLES.filter(switchesModules), ["owner", "admin"], "the module switches");
eq(ROLES.filter(readsBackfill), ["owner", "admin", "gm", "finance"], "BACKFILL_READ");

/* RequireAccess's sentence, word for word (picture all/68, as dev-gm). */
eq(refusedScreen("gm", "integrations"), "You are signed in as General Manager, which does not include Integrations. If you need it, the person who set up your account can change your role.", "the web's refusal");
eq(notYourRole("finance", "People"), "You are signed in as Accountant, which does not include People. If you need it, the person who set up your account can change your role.", "names the role");

/* The API's sentences, as refusalFor makes them. */
eq(STAFF_REFUSED, "Reading the staff list is for the owner, an administrator, the general manager or the hotel manager. Ask one of them.", "GET /staff");
eq(INTEGRATIONS_REFUSED, "Reading the integrations is for the owner or an administrator. Ask one of them.", "GET /integrations");
eq(HEALTH_REFUSED, "Reading the system's health is for the owner or an administrator. Ask one of them.", "GET /system-health");
eq(BACKFILL_REFUSED, "Reading what happened before the hotel's first day is for the owner, an administrator, the general manager or the accountant. Ask one of them.", "GET /backfill");
eq(AUDIT_REFUSED, "The audit log is open to the owner, an administrator and the general manager. Ask one of them.", "grants.ts");
eq(whoMay("user", "view"), ["owner", "admin", "gm", "hotel_manager"], "never the automation account");

/* Passwords: 10 for a manager, 8 for anybody else (D27-243 5.3). */
eq(minPasswordFor(["front_desk"]), 8, "reception");
eq(minPasswordFor(["front_desk", "gm"]), 10, "a GM somewhere");
eq(minPasswordFor([], true), 10, "a group administrator");
eq(minPasswordFor([]), 8, "nobody yet");

/* The matrix's words (Admin.tsx RolesPage). */
eq(cellOf("owner", "setting"), { kind: "all" }, "the owner: a tick");
eq(cellOf("pos", "user"), { kind: "none" }, "a waiter: a dash");
eq(cellOf("admin", "inventory"), { kind: "some", words: "View, Edit" }, "the actions by name");
eq(roleLabel("front_desk"), "Reception", "the matrix's word");
eq(roleLabel("night_porter"), "night_porter", "an unknown role as stored");
eq(roleLabel("automation"), "automation", "never offered as a person's role");
eq(inWords(["Ringing up an order", "Printing"]), "ringing up an order and printing", "a list in a sentence");

console.log("admin roles: ok");
