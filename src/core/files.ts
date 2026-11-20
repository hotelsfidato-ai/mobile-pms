/* ══════════════════════════════════════════════════════════════════
   A FILE FROM THE PHONE, BEFORE IT IS SENT (M-16, 20 Nov) — the web's
   and the server's own limits, ported; nothing here is the phone's
   own figure.

   TWO WAYS THE WEB SENDS A FILE (read in the PMS, 20 Nov):
   - A FORM (multipart), never held offline: a bill's photo or PDF -
     a paid-out's bill (finance/data/expenses.ts: POST …/cashier-shift
     or till/day-end/movements/:id/photo), a deposit slip (finance/data/
     deposits.ts: POST …/attachments with table, id, file), a bar bill
     (purchasing/data/barBills.ts: POST …/bar/purchases/:id/photo), a
     repair cost's proof (housekeeping/data/housekeeping.ts: POST
     …/repair-costs with workOrderId, amount, note, file). Sent with the
     sign-in and no content type (the form writes its own); the server
     reads the file's first bytes (api/src/storage.ts): a JPEG, PNG, WebP,
     HEIC or PDF, 9 MB at most (`BILL`).
   - JSON with the file's bytes in base64 (`data`), through `send()`:
     the hotel's photos and a room type's (admin/data/gallery.ts,
     inventory RoomSetup: redrawn at 1600 px as a JPEG at 0.85 first,
     by the web and the phone alike, `PHOTO`, `fitSize`), the group's and a hotel's logo
     (admin/components/GroupCard.tsx: as picked, `LOGO`), the old
     system's file (admin/data/oldSystem.ts, `OLD_SYSTEM_FILE`) and a
     group's rooming list (reservations/data/roomingList.ts, `ROOMING_FILE`).
   - A CSV read on the phone itself (components/flows/ImportDialog.tsx,
     `csvImportProblem`): its rows are sent, not the file.

   Pure: files.check.ts runs it under node.
   ══════════════════════════════════════════════════════════════════ */

/** A file picked on the phone (pickers.ts). `size` null: the phone could not say. */
export interface Picked {
  uri: string;
  name: string;
  mimeType: string;
  size: number | null;
  /** A photo's frame, when the picker said (0 or absent: not known). */
  width?: number;
  height?: number;
}

/** What may be picked for one use, and why a file is refused before it is sent. */
export interface FileRule {
  /** The picker's types (MIME; "image/*" for any picture). */
  types: string[];
  /** The sentence when the file cannot be sent, or null when it may. */
  problem(file: Picked): string | null;
}

const MB = 1024 * 1024;

/** A bill's photo or PDF: 9 MB at most (the web's BILL_MOST_BYTES, src/lib/api.ts; the server's
    MAX_BYTES, api/src/storage.ts - nginx stops a body at 10 MB with no answer the phone can read). */
export const BILL_MOST_BYTES = 9 * MB;
/** The web's billTooBig, word for word. */
export const billTooBig = (size: number): string | null =>
  size > BILL_MOST_BYTES
    ? `That file is ${(size / 1024 / 1024).toFixed(1)} MB. The limit is 9 MB - `
      + "photograph the bill rather than scanning it at full resolution."
    : null;
/** The types the server keeps (api/src/storage.ts ALLOWED); the web's picker: image/*,application/pdf. */
export const BILL_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
export const BILL: FileRule = {
  types: ["image/*", "application/pdf"],
  problem: (f) => (f.size == null ? null : billTooBig(f.size)),
};

/** A rule for a photo the phone redraws before it is sent (photoFit.ts fitPhoto, M-18): the long side
    at most, the JPEG quality, and `problem` for the file as picked when the phone could not redraw it. */
export interface PhotoRule extends FileRule {
  longSide: number;
  quality: number;
}

/** The frame a photo is redrawn at: its long side brought down to `most`, never enlarged, each side
    rounded - the web's shrinkPhoto.ts:19-22 (scale = min(1, most / long side), Math.round). A frame
    not known (0 or less) is kept. */
export function fitSize(width: number, height: number, most: number): { width: number; height: number } {
  const long = Math.max(width, height);
  if (!(width > 0 && height > 0) || long <= most) return { width, height };
  const scale = most / long;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** A hotel's or a room type's photo (api/src/modules/admin/gallery.ts readPhoto): a JPEG, at most
    1600 px on its long side, 600 KB once its camera notes are taken out. The web redraws every photo
    upright at 1600 px at most as a JPEG at 0.85 before it is sent (online-checkin/shrinkPhoto.ts,
    called by admin/components/HotelGalleryCard.tsx:46 and inventory/pages/RoomSetup.tsx:566); the
    phone does the same (photoFit.ts fitPhoto, M-18) and leaves the bytes to the server, whose 600 KB
    sentence is shown when it refuses. `problem` is for the file AS PICKED, used only when the phone
    could not redraw it (the web then sends the file as it is, shrinkPhoto.ts:27-28): only a JPEG
    within the frame can be taken by the server, so anything else is said plainly before it is sent. */
export const PHOTO_LONG_SIDE = 1600;
export const PHOTO_MOST_BYTES = 600 * 1024;
/** The web's JPEG quality when it redraws a photo (shrinkPhoto.ts:25). */
export const PHOTO_QUALITY = 0.85;
export const PHOTO: PhotoRule = {
  types: ["image/*"],
  longSide: PHOTO_LONG_SIDE,
  quality: PHOTO_QUALITY,
  problem(f) {
    if (f.mimeType !== "image/jpeg") return "This phone could not make that photo into a JPEG. Choose another, or add it on the website.";
    const long = Math.max(f.width ?? 0, f.height ?? 0);
    if (long > PHOTO_LONG_SIDE) {
      return `That photo is ${f.width} × ${f.height} px. The most is ${PHOTO_LONG_SIDE} px on its long side, `
        + "and this phone could not make it smaller. Choose another, or add it on the website.";
    }
    return null;
  },
};

/** A logo: a PNG or an SVG, 200 KB at most (api/src/modules/admin/groupSettings.ts readLogo; the web's
    picker accept="image/png,image/svg+xml"). The server's sentence, word for word. */
export const LOGO_MOST_BYTES = 200 * 1024;
export const LOGO: FileRule = {
  types: ["image/png", "image/svg+xml"],
  problem: (f) => (f.size != null && f.size > LOGO_MOST_BYTES
    ? `The logo is ${Math.ceil(f.size / 1024)} KB. The most is 200 KB.` : null),
};

/** The spreadsheet and text types behind the web's accept=".xlsx,.csv,.txt" (Android names a CSV either way). */
export const SHEET_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv", "text/comma-separated-values", "text/plain",
];

/** Any file, for a sheet or a CSV (20 Nov): Android often types a CSV as application/vnd.ms-excel or
    application/octet-stream, and a type filter greys it. The web's pickers go by the NAME (accept=
    ".xlsx,.csv,.txt", ".csv,.txt,text/csv"), so the phone takes any file and the rule decides by its
    name; what is inside is the server's to read (the old system's) or the CSV reader's. */
export const ANY_FILE = ["*/*"];

/** The old system's file (api/src/modules/admin/oldSystem.ts readBody): the server's sentences, after the
    web picker's names (OldDataPage.tsx accept=".xlsx,.csv,.txt"), said in a sentence as csvImportProblem's. */
export const OLD_SYSTEM_FILE: FileRule = {
  types: ANY_FILE,
  problem(f) {
    if (!/\.(xlsx|csv|txt)$/i.test(f.name.trim())) return `"${f.name}" is not an Excel (.xlsx) or CSV file.`;
    if (f.name.trim().length > 200) return "That file's name is too long.";
    if (f.size != null && f.size > 5_000_000) return "That file is over 5 MB. Split it into smaller files.";
    return null;
  },
};

/** A group's rooming list (api/src/modules/reservations/roomingList.ts, POST …/rooming-list/read). */
export const ROOMING_FILE: FileRule = {
  types: SHEET_TYPES,
  problem: (f) => (f.size != null && f.size > 2_000_000 ? "That file is over 2 MB - far bigger than a rooming list." : null),
};

/** A CSV import's file, read on the phone (src/lib/importSpec.ts fileProblem, word for word). */
export function csvImportProblem(f: Pick<Picked, "name" | "size">): string | null {
  const name = f.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    return "That is an Excel workbook. Open it, choose File → Save As, "
      + "and pick CSV - then send that file. The template downloads in "
      + "the same format and opens in Excel.";
  }
  if (name.endsWith(".numbers") || name.endsWith(".ods")) {
    return "Export that as CSV first - the template downloads in that "
      + "format and your spreadsheet will open it.";
  }
  if (!name.endsWith(".csv") && !name.endsWith(".txt")) return `"${f.name}" is not a CSV file.`;
  if (f.size != null && f.size > 2_000_000) {
    return "That file is larger than two megabytes, which is far bigger "
      + "than any menu. It is almost certainly not the right file.";
  }
  return null;
}
/** Any file is offered (ANY_FILE: Android's CSV types vary); the name decides, as the web's accept=".csv,.txt". */
export const CSV_IMPORT: FileRule = { types: ANY_FILE, problem: csvImportProblem };

/** A picture as an <Image> source, as the web shows the server's { type, data } (gallery.ts photoSrc). */
export const dataUrl = (type: string, base64: string) => `data:${type};base64,${base64}`;

/** A type from a file's name, when the picker gave none. */
export function typeFromName(name: string): string {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  return ({
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic",
    pdf: "application/pdf", svg: "image/svg+xml", csv: "text/csv", txt: "text/plain",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  } as Record<string, string>)[ext] ?? "application/octet-stream";
}

/* ── WITH NO CONNECTION ──────────────────────────────────────────────
   A form is never held to send later: a photo cannot be kept on the phone
   (each web helper says so). The sentence is the web's for that route;
   NOT the JSON writes' tiers (offline.ts), which would call a paid-out's
   photo (…/till/day-end/movements/:id/photo) a bill settlement. */
const FORM_OFFLINE: { test: RegExp; reason: string }[] = [
  {
    test: /\/repair-costs$/,
    reason: "A cost needs the connection: its proof is a photo, and a photo cannot be kept on this "
      + "phone to send later. Record it when you are back online.",
  },
  {
    test: /\/attachments$|\/movements\/[^/]+\/photo$|\/bar\/purchases\/[^/]+\/photo$/,
    reason: "The photo needs the connection. Add it when you are back online.",
  },
];
/** online-checkin/data/upload.ts, the web's general form helper. */
const FORM_OFFLINE_ELSE = "Could not reach the server. Try again when you are connected.";
export const formOffline = (path: string) =>
  FORM_OFFLINE.find((r) => r.test.test(path.split("?")[0]!))?.reason ?? FORM_OFFLINE_ELSE;

/** One part of a form: a text field, or a picked file. */
export type FormPart = { name: string; value: string } | { name: string; file: Pick<Picked, "uri" | "name" | "mimeType" | "size"> };

/** The form as text, for a key keeper (keys.ts): the same fields and the same file are the same request. */
export const formSig = (parts: FormPart[]) =>
  JSON.stringify(parts.map((p) => ("file" in p ? [p.name, p.file.uri, p.file.name, p.file.size] : [p.name, p.value])));

/** The web's downloadFile, when nothing came back. */
export const DOWNLOAD_OFFLINE = "Could not reach the server, so the file was not downloaded. Try again when the connection is back.";

/** The HTTP status in a download's failure ("response has status: 403", "server returned HTTP 403"), or null. */
export function statusIn(message: string): number | null {
  const m = /\b(?:status:?|HTTP)\s*([1-5]\d\d)\b/i.exec(message);
  return m ? Number(m[1]) : null;
}

/** iOS's name for a type, for the share sheet (Export.tsx gives the same two). */
export const utiOf = (mimeType: string): string | undefined => ({
  "application/pdf": "com.adobe.pdf",
  "text/csv": "public.comma-separated-values-text",
  "application/json": "public.json",
  "application/xml": "public.xml", "text/xml": "public.xml",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "org.openxmlformats.spreadsheetml.sheet",
} as Record<string, string>)[mimeType];


/* ── WHERE A FILE SITS ON THIS PHONE (20 Nov) ────────────────────────
   A downloaded file under the SERVER's name (Download.tsx): the server
   keeps the uploader's name and strips only ", \, CR and LF
   (api/src/routes/attachments.ts), so a name could climb out of the
   folder ("../x"). And a picked file's copy is deleted only inside this
   app's cache (pickers.ts forgetPicked), never the person's own file. */

/** A file:// address as its plain path ("file:///a/b%20c/" → "/a/b c"), or null: not a local file, not
    readable, or with a "." or ".." step (never resolved here: refused). */
export function pathOf(uri: string): string | null {
  const m = /^file:(.*)$/i.exec(uri);
  if (!m) return null;
  let path: string;
  try { path = decodeURIComponent(m[1]!); } catch { return null; }
  if (path.includes("\0") || !path.startsWith("/")) return null;
  const steps = path.split("/").filter((s) => s !== "");
  if (steps.some((s) => s === "." || s === "..")) return null;
  return `/${steps.join("/")}`;
}

/** The file's name when it sits straight inside the folder; else null. */
export function nameIn(folderUri: string, fileUri: string): string | null {
  const dir = pathOf(folderUri), file = pathOf(fileUri);
  if (!dir || !file) return null;
  const base = dir === "/" ? "/" : `${dir}/`;
  if (!file.startsWith(base)) return null;
  const name = file.slice(base.length);
  return name && !name.includes("/") ? name : null;
}

/** Whether the address is inside the folder, at any depth (not the folder itself). */
export function isWithin(folderUri: string, uri: string): boolean {
  const dir = pathOf(folderUri), file = pathOf(uri);
  if (!dir || !file) return false;
  return file.startsWith(dir === "/" ? "/" : `${dir}/`) && file !== dir;
}

/** Said when a server-named download did not land straight in the downloads folder (deleted, never opened). */
export const UNSAFE_NAME = "The file's name from the server could not be used on this phone, so it was not kept or opened. Open it on the website.";