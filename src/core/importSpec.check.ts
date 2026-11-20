/* importSpec.ts. Run: node --experimental-strip-types src/core/importSpec.check.ts
   The web's own round trip (src/lib/importSpec.test.ts): the template parses back into exactly the rows
   it was made from; and the phone's one difference (a byte-order mark taken off before the headers). */
import {
  MENU_SPEC, ROOM_SPEC, ROOM_TYPE_SPEC, acceptedOf, importAbout, importLabel, importedWords, parseCsv, previewNote, readImport, rejectedOf,
  templateCsv, templateName, type ImportReport, type ImportSpec,
} from "./importSpec.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* The template and the reader are one thing, for every spec. */
for (const [name, spec] of [["menu", MENU_SPEC], ["room types", ROOM_TYPE_SPEC], ["rooms", ROOM_SPEC]] as [string, ImportSpec][]) {
  const text = templateCsv(spec);
  const parsed = parseCsv(text, spec);
  eq(parsed.missing, [], `${name}: the template has its own required columns`);
  eq(parsed.unknown, [], `${name}: the template carries no column its reader ignores`);
  eq(parsed.rows.length, spec.examples.length, `${name}: the notes row is skipped, every example read`);
  spec.examples.forEach((ex, i) => spec.columns.forEach((col, j) => eq(parsed.rows[i]![col.field], ex[j], `${name}: row ${i} ${col.header}`)));
  const notes = text.split("\r\n")[1] ?? "";
  eq((notes.match(/REQUIRED/g) ?? []).length, spec.columns.filter((c) => c.required).length, `${name}: the notes say which are required`);
  eq(text.startsWith("\uFEFF"), true, `${name}: the template leads with a byte-order mark, as the web's`);
}
eq(templateName(MENU_SPEC), "menu-template.csv", "the template's file name");

/* A byte-order mark before the headers (the template's own, or Excel's "CSV UTF-8"): the headers still match. */
eq(parseCsv("\uFEFFRoom number,Type code\r\n201,SUP\r\n", ROOM_SPEC), { rows: [{ number: "201", typeCode: "SUP" }], unknown: [], missing: [] },
  "a byte-order mark is taken off before the first header");

/* A quoted comma is one value; "" is one quote; a Mac's \r alone ends a line. */
eq(parseCsv('Section,Dish,Price\r"Mains","Chicken Tikka, half","350"\r"Mains","The ""Big"" one",400', MENU_SPEC).rows,
  [{ category: "Mains", name: "Chicken Tikka, half", price: "350" }, { category: "Mains", name: 'The "Big" one', price: "400" }],
  "quotes honoured, \\r lines read");

/* A formula guard round-trips: the template writes a tab before "-", the reader takes it off. */
const odd: ImportSpec = { what: "x", filename: "x", columns: [{ header: "A", field: "a", required: true, note: "n" }], examples: [["-5"], ["=SUM(1)"]] };
eq(parseCsv(templateCsv(odd), odd).rows, [{ a: "-5" }, { a: "=SUM(1)" }], "a value csv.ts guards comes back as it was");

/* Headers matched without regard to capitals; a blank row and a commented row are skipped. */
eq(parseCsv("room NUMBER,type code\n\n# a note,x\n,\n14A,DLX", ROOM_SPEC).rows, [{ number: "14A", typeCode: "DLX" }], "capitals, blanks and # skipped");

/* What the dialog says (ImportDialog.tsx). */
eq(readImport("Section,Price\nMains,100", MENU_SPEC), { ok: false, problem: "That file has no Dish column. Start from the template - the headers have to match." }, "one column missing");
eq(readImport("Code,Price", ROOM_TYPE_SPEC), { ok: false, problem: "That file has no Name or Sleeps or Maximum column. Start from the template - the headers have to match." }, "several missing, joined by or");
eq(readImport("Room number,Type code\n", ROOM_SPEC), { ok: false, problem: "That file has headers and no rows." }, "headers alone");
eq(readImport("", ROOM_SPEC), { ok: false, problem: "That file has headers and no rows." }, "an empty file: the web's parseCsv finds nothing missing in no lines");
eq(readImport("Room number,Type code,Notes\n201,SUP,corner", ROOM_SPEC),
  { ok: true, rows: [{ number: "201", typeCode: "SUP" }], note: "Ignoring a column this does not use: Notes. If one of those was meant to be a heading above, check its spelling." },
  "an unknown column is not an error, but said");
eq(readImport("Room number,Type code,Notes,Wing\n201,SUP,a,b", ROOM_SPEC).ok && (readImport("Room number,Type code,Notes,Wing\n201,SUP,a,b", ROOM_SPEC) as { note: string }).note.startsWith("Ignoring columns this does not use: Notes, Wing."), true, "two unknown columns");

const report = (over: Partial<ImportReport>): ImportReport => ({ ok: true, dryRun: true, verdicts: [], creates: 0, updates: 0, rejected: 0, ...over });
const r = report({
  creates: 1, updates: 1, rejected: 1,
  verdicts: [{ line: 2, name: "201", action: "create", detail: "" }, { line: 3, name: "202", action: "rejected", detail: "No type." }, { line: 4, name: "203", action: "update", detail: "" }],
});
eq([acceptedOf(r).map((v) => v.line), rejectedOf(r).map((v) => v.line), acceptedOf(null)], [[2, 4], [3], []], "accepted and rejected split");
eq([importLabel(null, 0), importLabel(r, 1), importLabel(r, 2)], ["Import", "Import 1 row", "Import 2 rows"], "the act's words");
eq([importAbout(false, false), importAbout(false, true), importAbout(true, true)],
  ["A spreadsheet, saved as CSV. Start from the template.", "Nothing has been saved yet. This is what would happen.", "Done. What happened is below."], "the three states");
eq(importedWords(ROOM_SPEC, r), {
  title: "2 rooms imported", body: "1 rows were rejected and are listed - fix them and send the file again.",
  saved: "Saved. The rejected rows below did not land - correct them in the file and import it again, which updates rather than duplicates.",
}, "applied with a rejection: the web's toast and box");
eq(importedWords(MENU_SPEC, report({ creates: 3 })).saved, "Saved. Every row landed.", "applied clean");

/* A file whose rows are always added (the equipment register): never "import it again" (MEQ-P1). */
const adds: ImportSpec = { ...ROOM_SPEC, what: "equipment", repeats: "adds" };
eq(importedWords(adds, r).saved,
  "Saved. The rejected rows below did not land - send only the corrected rows: the rows that landed would be added again.", "adds: the done box");
eq(importedWords(adds, r).body, "1 rows were rejected and are listed - send only the corrected rows: the rows that landed would be added again.", "adds: the toast");
eq(previewNote(adds), "Nothing above has been saved. Send only the corrected rows: the rows that landed would be added again.", "adds: the preview");
eq(previewNote(MENU_SPEC), "Nothing above has been saved. Importing the same file again later corrects prices rather than adding a second copy.", "updates: the web's line");

console.log("importSpec.check: ok");
