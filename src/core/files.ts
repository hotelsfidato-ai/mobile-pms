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
     inventory RoomSetup: redrawn by the web at 1600 px as a JPEG at
     0.85 first, `PHOTO`), the group's and a hotel's logo
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

/** A hotel's or a room type's photo (api/src/modules/admin/gallery.ts readPhoto): a JPEG, at most
    1600 px on its long side, 600 KB once its camera notes are taken out - the server measures the
    bytes after taking them out, so the phone checks only the frame and leaves the bytes to it. The
    web redraws every photo at 1600 px as a JPEG at 0.85 (online-checkin/shrinkPhoto.ts); this
    phone has no way to redraw one (no image library is installed), so a larger photo is refused
    here, said plainly, before it is sent. */
export const PHOTO_LONG_SIDE = 1600;
export const PHOTO_MOST_BYTES = 600 * 1024;
/** The web's JPEG quality when it redraws a photo (shrinkPhoto.ts). */
export const PHOTO_QUALITY = 0.85;
export const PHOTO: FileRule = {
  types: ["image/*"],
  problem(f) {
    if (f.mimeType !== "image/jpeg") return "A photo must be a JPEG. Choose a photo taken with a camera.";
    const long = Math.max(f.width ?? 0, f.height ?? 0);
    if (long > PHOTO_LONG_SIDE) {
      return `That photo is ${f.width} × ${f.height} px. The most is ${PHOTO_LONG_SIDE} px on its long side, `
        + "and this phone cannot make it smaller yet. Add it on the website, which does.";
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

/** The old system's file (api/src/modules/admin/oldSystem.ts readBody): the server's sentences. */
export const OLD_SYSTEM_FILE: FileRule = {
  types: SHEET_TYPES,
  problem(f) {
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
export const CSV_IMPORT: FileRule = { types: ["text/csv", "text/comma-separated-values", "text/plain"], problem: csvImportProblem };

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
