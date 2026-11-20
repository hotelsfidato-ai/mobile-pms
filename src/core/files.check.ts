/* files.ts. Run: node --experimental-strip-types src/core/files.check.ts
   Every limit and sentence is the web's or the server's (named in files.ts); these hold them still. */
import {
  BILL, CSV_IMPORT, LOGO, OLD_SYSTEM_FILE, PHOTO, ROOMING_FILE, dataUrl, formOffline, formSig, statusIn, typeFromName, utiOf,
  type Picked,
} from "./files.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const MB = 1024 * 1024;
const f = (more: Partial<Picked>): Picked => ({ uri: "file:///x", name: "bill.jpg", mimeType: "image/jpeg", size: 1000, ...more });

/* A bill: 9 MB, the web's sentence; exactly 9 MB is allowed (the web's ">"). */
eq(BILL.problem(f({ size: 9 * MB })), null, "a bill of exactly 9 MB goes");
eq(BILL.problem(f({ size: 9 * MB + 1 })),
  "That file is 9.0 MB. The limit is 9 MB - photograph the bill rather than scanning it at full resolution.",
  "a bill one byte over: the web's sentence");
eq(BILL.problem(f({ size: 12.34 * MB })), "That file is 12.3 MB. The limit is 9 MB - photograph the bill rather than scanning it at full resolution.", "its size to one place");
eq(BILL.problem(f({ size: null })), null, "a size the phone cannot tell is left to the server");
eq(BILL.types, ["image/*", "application/pdf"], "the web's picker: any picture or a PDF");

/* A hotel's or a room type's photo: a JPEG within 1600 px (the server's), the bytes left to the server. */
eq(PHOTO.problem(f({ width: 1600, height: 1200 })), null, "1600 px on its long side goes");
eq(PHOTO.problem(f({ width: 1200, height: 1601 })),
  "That photo is 1200 × 1601 px. The most is 1600 px on its long side, and this phone cannot make it smaller yet. Add it on the website, which does.",
  "1601 px on the long side, standing: refused before it is sent");
eq(PHOTO.problem(f({ mimeType: "image/png", width: 800, height: 600 })), "A photo must be a JPEG. Choose a photo taken with a camera.", "a PNG is not a photo here");
eq(PHOTO.problem(f({ size: 900 * 1024, width: 1600, height: 900 })), null, "900 KB with its camera notes: the server measures without them");
eq(PHOTO.problem(f({ width: 0, height: 0 })), null, "a frame the picker did not give: left to the server");

/* A logo: 200 KB, the server's sentence. */
eq(LOGO.problem(f({ size: 200 * 1024 })), null, "a logo of exactly 200 KB goes");
eq(LOGO.problem(f({ size: 200 * 1024 + 1 })), "The logo is 201 KB. The most is 200 KB.", "a logo over: the server's sentence, rounded up");
eq(LOGO.types, ["image/png", "image/svg+xml"], "a PNG or an SVG, as the web's picker");

/* The old system's file and a rooming list: decimal megabytes, as the server counts. */
eq(OLD_SYSTEM_FILE.problem(f({ name: "ids.xlsx", size: 5_000_000 })), null, "5,000,000 bytes goes");
eq(OLD_SYSTEM_FILE.problem(f({ name: "ids.xlsx", size: 5_000_001 })), "That file is over 5 MB. Split it into smaller files.", "an old file over 5 MB");
eq(OLD_SYSTEM_FILE.problem(f({ name: `${"a".repeat(196)}.csv`, size: 10 })), null, "a 200-letter name goes");
eq(OLD_SYSTEM_FILE.problem(f({ name: `${"a".repeat(197)}.csv`, size: 10 })), "That file's name is too long.", "201 letters");
eq(ROOMING_FILE.problem(f({ name: "group.csv", size: 2_000_001 })), "That file is over 2 MB - far bigger than a rooming list.", "a rooming list over 2 MB");

/* A CSV import (importSpec.ts fileProblem). */
eq(CSV_IMPORT.problem(f({ name: "Menu.XLSX" })), "That is an Excel workbook. Open it, choose File → Save As, and pick CSV - then send that file. The template downloads in the same format and opens in Excel.", "an Excel workbook, whatever its capitals");
eq(CSV_IMPORT.problem(f({ name: "menu.pdf" })), "\"menu.pdf\" is not a CSV file.", "not a CSV");
eq(CSV_IMPORT.problem(f({ name: "menu.csv", size: 2_000_000 })), null, "two million bytes goes");
eq(CSV_IMPORT.problem(f({ name: "menu.csv", size: 2_000_001 })) !== null, true, "over two million is refused");

/* With no connection, a form's sentence is the web's for that route - never a JSON tier's. */
const PHOTO_OFF = "The photo needs the connection. Add it when you are back online.";
eq(formOffline("/api/hotels/5EL/till/day-end/movements/abc/photo"), PHOTO_OFF, "a restaurant paid-out's photo is not a bill settlement");
eq(formOffline("/api/hotels/5EL/cashier-shift/movements/abc/photo"), PHOTO_OFF, "a desk paid-out's photo is not a payment");
eq(formOffline("/api/hotels/5EL/attachments"), PHOTO_OFF, "a deposit slip");
eq(formOffline("/api/hotels/5EL/bar/purchases/abc/photo"), PHOTO_OFF, "a bar bill");
eq(formOffline("/api/hotels/5EL/repair-costs"),
  "A cost needs the connection: its proof is a photo, and a photo cannot be kept on this phone to send later. Record it when you are back online.",
  "a repair cost");
eq(formOffline("/api/somewhere/else"), "Could not reach the server. Try again when you are connected.", "any other form: the web's general sentence");

/* One request, one signature: the same fields and file, the same; a changed amount, not. */
const parts = (amount: string) => [{ name: "amount", value: amount }, { name: "file", file: { uri: "file:///b.jpg", name: "b.jpg", mimeType: "image/jpeg", size: 9 } }];
eq(formSig(parts("500")) === formSig(parts("500")), true, "the same form twice: one signature");
eq(formSig(parts("500")) === formSig(parts("600")), false, "an edited amount: another");

eq(statusIn("Unable to download a file: response has status: 403"), 403, "Android's download failure");
eq(statusIn("Unable to download a file: response has status 404"), 404, "iPhone's");
eq(statusIn("Unable to download a file: The Internet connection appears to be offline."), null, "no status: nothing came back");
eq(typeFromName("Slip.JPG"), "image/jpeg", "a type from a name");
eq(typeFromName("notes"), "application/octet-stream", "no extension: unknown");
eq(utiOf("application/pdf"), "com.adobe.pdf", "a PDF's iPhone type");
eq(dataUrl("image/png", "iVBO"), "data:image/png;base64,iVBO", "a data URL");
console.log("core files: all checks pass");
