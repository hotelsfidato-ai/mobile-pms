/* files.ts. Run: node --experimental-strip-types src/core/files.check.ts
   Every limit and sentence is the web's or the server's (named in files.ts); these hold them still. */
import {
  ANY_FILE, BILL, CSV_IMPORT, LOGO, OLD_SYSTEM_FILE, PHOTO, ROOMING_FILE, dataUrl, fitSize, formOffline, formSig, isWithin, nameIn, pathOf,
  statusIn, typeFromName, utiOf,
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

/* A hotel's or a room type's photo, redrawn as the web's shrinkPhoto.ts: the long side down to 1600 px,
   never enlarged, each side rounded (Math.round); a JPEG at 0.85. */
eq([PHOTO.longSide, PHOTO.quality], [1600, 0.85], "the web's 1600 px and 0.85");
eq(fitSize(4000, 3000, 1600), { width: 1600, height: 1200 }, "a camera's 4000 × 3000, lying: 1600 × 1200");
eq(fitSize(3000, 4000, 1600), { width: 1200, height: 1600 }, "standing: the long side is the height");
eq(fitSize(4032, 3024, 1600), { width: 1600, height: 1200 }, "an iPhone's 12 MP: 1600 × 1200");
eq(fitSize(4000, 2254, 1600), { width: 1600, height: 902 }, "901.6 rounds up, as Math.round (not down)");
eq(fitSize(4000, 2251, 1600), { width: 1600, height: 900 }, "900.4 rounds down, as Math.round");
eq(fitSize(3001, 2000, 1600), { width: 1600, height: 1066 }, "1066.31… rounds to 1066");
eq(fitSize(3000, 1999, 1600), { width: 1600, height: 1066 }, "1066.13… rounds to 1066");
eq(fitSize(2000, 1250, 1600), { width: 1600, height: 1000 }, "an exact ratio stays exact");
eq(fitSize(1600, 1200, 1600), { width: 1600, height: 1200 }, "exactly 1600 is kept as it is");
eq(fitSize(800, 600, 1600), { width: 800, height: 600 }, "a smaller photo is never enlarged");
eq(fitSize(1601, 1601, 1600), { width: 1600, height: 1600 }, "a square one px over");
eq(fitSize(0, 0, 1600), { width: 0, height: 0 }, "a frame not known is kept");
/* PHOTO.problem: the file as picked, only when the phone could not redraw it. */
eq(PHOTO.problem(f({ width: 1600, height: 1200 })), null, "1600 px on its long side goes");
eq(PHOTO.problem(f({ width: 1200, height: 1601 })),
  "That photo is 1200 × 1601 px. The most is 1600 px on its long side, and this phone could not make it smaller. Choose another, or add it on the website.",
  "1601 px on the long side, standing, not redrawn: refused before it is sent");
eq(PHOTO.problem(f({ mimeType: "image/png", width: 800, height: 600 })),
  "This phone could not make that photo into a JPEG. Choose another, or add it on the website.", "a PNG not redrawn is not a photo the server takes");
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
/* Any file is offered for a sheet or a CSV (Android types a CSV as application/vnd.ms-excel or
   application/octet-stream); the NAME decides, as the web's accept=".xlsx,.csv,.txt". */
eq(OLD_SYSTEM_FILE.types, ["*/*"], "the old system's picker greys nothing");
eq(CSV_IMPORT.types, ANY_FILE, "nor does a CSV import's");
eq(OLD_SYSTEM_FILE.problem(f({ name: "Guests.XLSX", mimeType: "application/octet-stream" })), null, "an Excel file, whatever Android calls it");
eq(OLD_SYSTEM_FILE.problem(f({ name: "export.csv", mimeType: "application/vnd.ms-excel" })), null, "a CSV Android calls Excel");
eq(OLD_SYSTEM_FILE.problem(f({ name: "notes.txt " })), null, "a .txt, a space after its name");
eq(OLD_SYSTEM_FILE.problem(f({ name: "guests.xls" })), "\"guests.xls\" is not an Excel (.xlsx) or CSV file.", "an old .xls: not what the web's picker takes");
eq(OLD_SYSTEM_FILE.problem(f({ name: "scan.pdf", size: 9_000_000 })), "\"scan.pdf\" is not an Excel (.xlsx) or CSV file.", "a PDF: its name first");
eq(CSV_IMPORT.problem(f({ name: "menu.csv", mimeType: "application/octet-stream" })), null, "a CSV with no type the phone knows");
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
/* Where a file sits: a server-named download stays straight inside share/, a picked copy is deleted only
   inside this app's cache. */
const SHARE = "file:///data/user/0/app/cache/share/";
eq(pathOf("file:///a/b%20c/"), "/a/b c", "an address as its path");
eq(pathOf("file:/data/x.pdf"), "/data/x.pdf", "Android's one-slash form");
eq(pathOf("file:///a/../b"), null, "a step up is never resolved: refused");
eq(pathOf("file:///a/%2E%2E/b"), null, "nor written as %2E%2E");
eq(pathOf("file:///a/%E0%A4"), null, "an address that cannot be read");
eq(pathOf("content://media/1"), null, "not a file on this phone");
eq(nameIn(SHARE, "file:///data/user/0/app/cache/share/Bill%20no.%207.heic"), "Bill no. 7.heic", "the server's name, inside");
eq(nameIn(SHARE, "file:/data/user/0/app/cache/share/slip.pdf"), "slip.pdf", "Android's form of the same folder");
eq(nameIn(SHARE, "file:///data/user/0/app/cache/share/../x.pdf"), null, "a name that climbs out");
eq(nameIn(SHARE, "file:///data/user/0/app/cache/x.pdf"), null, "the cache itself is not the folder");
eq(nameIn(SHARE, "file:///data/user/0/app/cache/share/a/b.pdf"), null, "a folder inside it is not straight inside");
eq(nameIn(SHARE, "file:///data/user/0/app/cache/share/"), null, "the folder itself is not a file in it");
eq(nameIn(SHARE, "file:///data/user/0/app/cache/shared.pdf"), null, "a name that only starts like the folder");
const CACHE = "file:///var/mobile/Containers/Data/Application/A1/Library/Caches/";
eq(isWithin(CACHE, `${CACHE}DocumentPicker/B2/guests.xlsx`), true, "a picker's copy in the cache");
eq(isWithin(CACHE, "file:///var/mobile/Media/DCIM/100APPLE/IMG_1.HEIC"), false, "the person's own photo: never deleted");
eq(isWithin(CACHE, CACHE), false, "the cache itself: never deleted");
eq(isWithin(CACHE, `${CACHE}../Documents/x`), false, "out of the cache by a step up");
console.log("core files: all checks pass");
