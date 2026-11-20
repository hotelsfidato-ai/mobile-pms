/* ══════════════════════════════════════════════════════════════════
   A CSV IMPORT, READ ON THE PHONE (M-16, 20 Nov) — ported from the PMS's
   src/lib/importSpec.ts (the specs, parseCsv, splitLine, the template),
   src/lib/csv.ts (toCsv's cell, for the template) and
   src/components/flows/ImportDialog.tsx (the sentences the dialog says
   about a file before and after its dry run), at c9394cb.

   ONE SPEC, TWO USES (the web's words): the template somebody downloads
   and the reader that takes it back are made from the same list of
   columns, so they cannot drift. The phone sends what the web sends:
   POST …/import `{ rows, dryRun }`, a dry run first that changes
   nothing, then the same rows to apply. A file's own problem (an .xlsx,
   too big) is files.ts `csvImportProblem` (the web's fileProblem).

   A byte-order mark (the template carries one so Excel reads ₹) is
   taken off the first header by splitLine's trim(), which counts U+FEFF
   as a space: the phone's File.text() keeps the mark the browser's
   file.text() drops, and the headers still match (the check holds it).

   The add-ons spec (the web's pos/lib/addonSpec.ts) and the equipment
   spec (equipment/importColumns.ts) live in their modules, as on the web.
   Pure: importSpec.check.ts runs it under node.
   ══════════════════════════════════════════════════════════════════ */

export interface Column {
  /** The header written into the template and matched on the way back. */
  header: string;
  /** The field it becomes. */
  field: string;
  required: boolean;
  /** Shown in the notes row of the template, and in the dialog. */
  note: string;
}

export interface ImportSpec {
  /** What one row is, in the plural. */
  what: string;
  filename: string;
  columns: Column[];
  /** Worked rows. Real-looking, and clearly examples. */
  examples: string[][];
}

/** What an import would do, or did (the web's data/repositories/importReport.ts). */
export interface ImportVerdict {
  line: number;
  name: string;
  action: "create" | "update" | "rejected";
  detail: string;
}
export interface ImportReport {
  ok: boolean;
  reason?: string;
  dryRun: boolean;
  verdicts: ImportVerdict[];
  creates: number;
  updates: number;
  rejected: number;
}

/* ── The menu (importSpec.ts MENU_SPEC) ───────────────────────────── */

export const MENU_SPEC: ImportSpec = {
  what: "menu items",
  filename: "menu-template",
  columns: [
    { header: "Section", field: "category", required: true,
      note: "Starters, Main course, Spirits. Created if it does not exist." },
    { header: "Dish", field: "name", required: true,
      note: "The name a guest reads on the bill." },
    { header: "Variation", field: "variation", required: false,
      note: "Half, Full, 250 ml. One row for each, with its own price. "
          + "Blank for a dish sold at one price." },
    { header: "Price", field: "price", required: true,
      note: "Rupees. A blank is REJECTED - it is not zero." },
    { header: "Tax heading", field: "taxKind", required: false,
      note: "restaurant, bar, banquet or other - or alcohol, where the "
          + "property serves it. Sets it for the whole section. Leave blank "
          + "to keep what the section already has." },
    { header: "GST %", field: "taxRate", required: false,
      note: "Only for an exception, such as bottled water on a food bill. "
          + "Blank means follow the section's heading, which is right for "
          + "nearly every dish." },
    { header: "Veg", field: "veg", required: false,
      note: "yes or no. Blank leaves it unsaid." },
    { header: "Short code", field: "shortCode", required: false,
      note: "What a waiter types instead of the name. Optional." },
    { header: "Add-on groups", field: "addonGroups", required: false,
      note: "The groups this dish offers, separated by ; - they come from "
          + "the add-ons file, which is imported FIRST." },
  ],
  examples: [
    ["Starters", "Paneer Tikka", "", "300", "restaurant", "", "yes", "PT", "Preferences"],
    ["Starters", "Chicken 65", "", "350", "restaurant", "", "no", "", ""],
    ["Main course", "Chicken Biryani", "Half", "180", "restaurant", "", "no", "CB",
     "Choice of raita; Preferences"],
    ["Main course", "Chicken Biryani", "Full", "320", "", "", "", "", ""],
    ["Beverages", "Bottled water", "", "50", "restaurant", "18", "yes", "", ""],
    ["Spirits", "Old Monk", "30 ml", "150", "bar", "", "", "", ""],
    ["Spirits", "Old Monk", "60 ml", "250", "", "", "", "", ""],
  ],
};

/* ── Rooms and room types (ROOM_TYPE_SPEC, ROOM_SPEC) ─────────────── */

export const ROOM_TYPE_SPEC: ImportSpec = {
  what: "room types",
  filename: "room-types-template",
  columns: [
    { header: "Code", field: "code", required: true,
      note: "Two to four letters. SUP, DLX, STE." },
    { header: "Name", field: "name", required: true,
      note: "Superior, Deluxe, Suite." },
    { header: "Sleeps", field: "baseOccupancy", required: true,
      note: "How many the tariff covers." },
    { header: "Maximum", field: "maxOccupancy", required: true,
      note: "The most that may be put in the room." },
    { header: "Tariff", field: "rate", required: false,
      note: "Per night. Blank means UNPRICED - the type shows a dash and "
          + "cannot be sold until it has one. That is deliberate." },
    { header: "Extra adult", field: "extraAdult", required: false,
      note: "Blank means an extra adult makes the whole tariff a dash, "
          + "rather than adding nothing." },
    { header: "Extra child", field: "extraChild", required: false,
      note: "As above." },
  ],
  examples: [
    ["SUP", "Superior", "2", "3", "4000", "800", "500"],
    ["DLX", "Deluxe", "2", "3", "3500", "800", "500"],
  ],
};

export const ROOM_SPEC: ImportSpec = {
  what: "rooms",
  filename: "rooms-template",
  columns: [
    { header: "Room number", field: "number", required: true,
      note: "As it appears on the door. 201, 14A." },
    { header: "Type code", field: "typeCode", required: true,
      note: "Must match a room type that already exists." },
    { header: "Floor", field: "floor", required: false,
      note: "A number. Blank leaves it unsaid." },
    { header: "Smoking", field: "smoking", required: false,
      note: "yes or no. Blank means no." },
  ],
  examples: [
    ["201", "SUP", "2", "no"],
    ["202", "SUP", "2", "no"],
    ["301", "DLX", "3", "no"],
  ],
};

/* ── The template (downloadTemplate, csv.ts toCsv) ────────────────── */

/** One cell, as csv.ts writes it: a value starting =, +, -, @ (a formula) gets a tab first; quoted when it must be. */
function cell(value: string): string {
  let text = value;
  if (/^[=+\-@\t\r]/.test(text)) text = `\t${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** The template's text, as the web's downloadTemplate writes it: a byte-order mark (downloadCsv's, so
    Excel reads ₹), the headers, a NOTES row starting with `#` (the reader skips it), the worked rows;
    CRLF lines. */
export function templateCsv(spec: ImportSpec): string {
  const headers = spec.columns.map((c) => c.header);
  const notes = spec.columns.map((c, i) => (i === 0 ? "# " : "") + (c.required ? "REQUIRED. " : "") + c.note);
  return `\uFEFF${[headers, notes, ...spec.examples].map((r) => r.map(cell).join(",")).join("\r\n")}`;
}
export const templateName = (spec: ImportSpec) => `${spec.filename}.csv`;

/* ── Reading one back (parseCsv) ──────────────────────────────────── */

export interface ParseResult {
  rows: Record<string, string>[];
  /** Headers in the file that the spec does not know about. */
  unknown: string[];
  /** Required columns the file is missing entirely. */
  missing: string[];
}

/** A line of CSV, honouring quotes ("Chicken Tikka, half" is one dish); the tab csv.ts puts before a
    formula is taken off again. */
function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      out.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((v) => v.replace(/^\t/, "").trim());
}

export function parseCsv(text: string, spec: ImportSpec): ParseResult {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim() !== "");
  if (lines.length === 0) return { rows: [], unknown: [], missing: [] };

  const headers = splitLine(lines[0]!);
  const byHeader = new Map(spec.columns.map((c) => [c.header.toLowerCase(), c.field]));
  const unknown = headers.filter((h) => h && !byHeader.has(h.toLowerCase()));
  const present = new Set(headers.map((h) => byHeader.get(h.toLowerCase())).filter(Boolean));
  const missing = spec.columns.filter((c) => c.required && !present.has(c.field)).map((c) => c.header);

  const rows: Record<string, string>[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitLine(line);
    /* The notes row (quoted by the writer, so checked after splitting) and anything commented out. */
    if ((cells[0] ?? "").startsWith("#")) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      const field = byHeader.get(h.toLowerCase());
      if (field) row[field] = cells[i] ?? "";
    });
    if (Object.values(row).some((v) => v !== "")) rows.push(row);
  }
  return { rows, unknown, missing };
}

/* ── What the dialog says (ImportDialog.tsx choose / apply) ───────── */

/** A file read: its rows to dry-run, with a note (unknown columns, not an error); or why it stops there. */
export function readImport(text: string, spec: ImportSpec):
  { ok: true; rows: Record<string, string>[]; note: string | null } | { ok: false; problem: string } {
  const parsed = parseCsv(text, spec);
  if (parsed.missing.length > 0) {
    return { ok: false, problem: `That file has no ${parsed.missing.join(" or ")} column. Start from the template - the headers have to match.` };
  }
  if (parsed.rows.length === 0) return { ok: false, problem: "That file has headers and no rows." };
  const note = parsed.unknown.length > 0
    ? `Ignoring ${parsed.unknown.length === 1 ? "a column" : "columns"} this does not use: ${parsed.unknown.join(", ")}. `
      + "If one of those was meant to be a heading above, check its spelling."
    : null;
  return { ok: true, rows: parsed.rows, note };
}

/** The verdicts split as the dialog lists them. */
export const rejectedOf = (r: ImportReport | null) => (r?.verdicts ?? []).filter((v) => v.action === "rejected");
export const acceptedOf = (r: ImportReport | null) => (r?.verdicts ?? []).filter((v) => v.action !== "rejected");

/** The sheet's line under its title, in its three states. */
export const importAbout = (applied: boolean, previewed: boolean) =>
  applied ? "Done. What happened is below."
    : previewed ? "Nothing has been saved yet. This is what would happen."
      : "A spreadsheet, saved as CSV. Start from the template.";

/** The act's words: "Import 3 rows" once previewed. */
export const importLabel = (report: ImportReport | null, accepted: number) =>
  report ? `Import ${accepted} ${accepted === 1 ? "row" : "rows"}` : "Import";

/** What the web's toast says once applied, and the saved box under the tallies. */
export function importedWords(spec: ImportSpec, done: ImportReport) {
  return {
    title: `${done.creates + done.updates} ${spec.what} imported`,
    body: done.rejected > 0
      ? `${done.rejected} rows were rejected and are listed - fix them and send the file again.`
      : "Nothing was rejected.",
    saved: `Saved. ${done.rejected > 0
      ? "The rejected rows below did not land - correct them in the file and import it again, which updates rather than duplicates."
      : "Every row landed."}`,
  };
}
