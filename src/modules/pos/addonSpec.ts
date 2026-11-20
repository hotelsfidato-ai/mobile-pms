import type { ImportSpec } from "../../core/importSpec";

/* THE ADD-ONS FILE (the owner's D21-43), ported from the PMS's
   src/modules/pos/lib/addonSpec.ts (c9394cb): one row per option, imported
   BEFORE the menu file whose "Add-on groups" column names these groups.
   Beside the menu's spec on the web too (that file is the core's). The
   menu screen's "Import sides" sends it to POST /till/menu/addon-groups/import. */

export const ADDON_SPEC: ImportSpec = {
  what: "add-ons",
  filename: "add-ons-template",
  columns: [
    { header: "Group", field: "group", required: true,
      note: "Choice of bread, Preferences. The name the menu file uses. "
          + "Created if it does not exist." },
    { header: "Option", field: "option", required: true,
      note: "Butter naan, No onion. One row for each." },
    { header: "Price", field: "price", required: true,
      note: "Rupees. A blank is REJECTED - it is not zero. Type 0 for a "
          + "preference such as No onion." },
    { header: "Choose at least", field: "minSelect", required: false,
      note: "How many a guest must choose from the group. On any one of "
          + "its rows. Blank means none are needed." },
    { header: "Choose at most", field: "maxSelect", required: false,
      note: "The most a guest may choose. Blank means no limit." },
  ],
  examples: [
    ["Choice of raita", "Plain raita", "40", "0", "1"],
    ["Choice of raita", "Boondi raita", "50", "", ""],
    ["Preferences", "No onion", "0", "", ""],
    ["Preferences", "Less spicy", "0", "", ""],
    ["Preferences", "Jain", "0", "", ""],
  ],
};
