import type { ImportSpec } from "../../core/importSpec";

/* THE OPENING REGISTER, AS A FILE — the web's EQUIPMENT_SPEC
   (src/modules/equipment/importSpec.ts with importColumns.ts, c9394cb):
   the template and its reader from one list of columns (core importSpec.ts).
   The server reads the same field names (api equipment.ts, POST
   /:code/equipment/import). NO COST IS EVER FILLED IN: a blank Cost is
   "not known". Every row of this file is a NEW thing (a blank Tag takes the
   next EQ-number), so a repeat adds the register twice: the phone's sheet
   keeps one import per tap (ImportSheet.tsx). */

export const EQUIPMENT_SPEC: ImportSpec = {
  what: "equipment",
  filename: "equipment-template",
  /* Every row is a new thing (api equipment.ts import only inserts): the sheet says so (MEQ-P1). */
  repeats: "adds",
  columns: [
    { header: "Item", field: "name", required: true,
      note: "Split AC 1.5 ton, LED TV 43 inch, Electric kettle." },
    { header: "Category", field: "category", required: false,
      note: "Appliance, Furniture, Kitchen equipment. Made if the property "
          + "does not have it yet; capitals do not matter." },
    { header: "Held as", field: "heldAs", required: true,
      note: "tag - one thing with its own tag. count - a number of the "
          + "same thing in one place." },
    { header: "Tag", field: "tag", required: false,
      note: "For a tag row. Blank gives it the next free number (EQ-0001…). "
          + "Must be blank on a count row." },
    { header: "How many", field: "quantity", required: false,
      note: "For a count row: how many are there. Blank or 1 on a tag row." },
    { header: "Room", field: "room", required: false,
      note: "The room number it is in. Give a Room or a Place, not both." },
    { header: "Place", field: "place", required: false,
      note: "Where it is if not in a room - a place already set up at the "
          + "property, spelled the same. Putting it in a place by import is "
          + "adding it, so nothing waits for approval." },
    { header: "Supplier", field: "supplier", required: false,
      note: "A supplier already set up at the property. Blank if not known." },
    { header: "Bought on", field: "purchaseDate", required: false,
      note: "Day first: 14/03/2025. Blank if not known." },
    { header: "Cost", field: "unitCost", required: false,
      note: "Rupees, PER PIECE on a count row. Blank is NOT KNOWN - it is "
          + "never read as zero." },
    { header: "Warranty ends", field: "warrantyEnds", required: false,
      note: "Day first. Blank means nobody entered one - never 'expired'." },
    { header: "Service contract ends", field: "amcEnds", required: false,
      note: "The AMC. Day first. Blank if there is none." },
    { header: "Status", field: "status", required: false,
      note: "Blank means in use. Or: under repair." },
  ],
  examples: [
    ["Split AC 1.5 ton", "Appliance", "tag", "", "", "Example room", "", "", "", "", "", "", ""],
    ["Electric kettle", "Appliance", "count", "", "12", "Example room", "", "", "", "", "", "", ""],
    ["Sofa, three seater", "Furniture", "tag", "", "", "", "Example lobby", "", "", "", "", "", "under repair"],
  ],
};

/** The stop an import's lost reply puts on the register: let go by the register's read begun after it. */
export const importStop = (code: string) => `equipment/${code}/import`;
