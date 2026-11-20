import { File } from "expo-file-system";
import { API_URL, ApiError, refused, who } from "./api";
import { formOffline, formSig, type FileRule, type FormPart, type Picked } from "./files";
import type { KeyKeeper } from "./keys";
import { newKey, noteReachable, noteUnreachable } from "./offline";
import { forgetPicked } from "./pickers";

/* ══════════════════════════════════════════════════════════════════
   A FILE TO THE API (M-16, 20 Nov) — the two ways the web sends one
   (files.ts says which route takes which).

   A FORM (`sendForm`): the web's attachExpensePhoto, attachSlip,
   attachBarBillPhoto and recordRepairCost - the sign-in (who(), as
   send()), NO content type (the form writes its own boundary), the
   hotel in the path. A file part is React Native's { uri, name, type },
   read from the phone's disk as it is sent. Never held offline: when
   nothing comes back it is an ApiError 503 with the web's sentence for
   that route, and - as send()'s refusals - the outcome is UNKNOWN
   (outcomeUnknown is true: the file may have landed), so a screen keeps
   its stop until the record is read again (MEMORY 16, 22). The server
   reads no idempotency key on these routes (20 Nov); the key is sent
   anyway, as every write's, and `keeper` keeps it for a repeat.
   An answer: the server's JSON, as send() returns it (the screen reads
   `ok` and `reason`); a refusal: ApiError with the server's sentence.
   The picked file is read again on a repeat, so the screen deletes its
   copy (pickers.ts forgetPicked) only once it landed or is given up.

   BASE64 IN JSON (`base64For`): the file's bytes for `data`, sent through
   send() with exactly the web's body; the limits checked first.
   ══════════════════════════════════════════════════════════════════ */

export async function sendForm<T>(
  method: "POST" | "PUT", path: string, parts: FormPart[], keeper?: KeyKeeper,
): Promise<T> {
  const ticket = keeper?.begin(method, path, formSig(parts));
  const key = ticket?.key ?? newKey();
  const form = new FormData();
  for (const p of parts) {
    if ("file" in p) {
      /* React Native's file part: read from `uri` as the request goes. */
      form.append(p.name, { uri: p.file.uri, name: p.file.name, type: p.file.mimeType } as unknown as Blob);
    } else {
      form.append(p.name, p.value);
    }
  }
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { method, headers: { ...(await who()), "idempotency-key": key }, body: form });
  } catch {
    noteUnreachable();
    if (ticket) keeper!.failed(ticket, 0);
    throw new ApiError(503, formOffline(path));
  }
  noteReachable();
  if (!response.ok) {
    if (ticket) keeper!.failed(ticket, response.status);
    throw await refused(response);
  }
  if (ticket) keeper!.landed(ticket);
  return (await response.json()) as T;
}

/** A form's file part from a picked file. */
export const filePart = (name: string, file: Picked): FormPart => ({ name, file });

/** The file's bytes, base64 (no "data:" head), as the web's FileReader gives `data`. */
export const readBase64 = (file: Pick<Picked, "uri">) => new File(file.uri).base64();
/** The file as text (a CSV read on the phone, as the web's file.text()); its picked copy is then deleted
    (DPDP, forgetPicked) - read it once. */
export async function readText(file: Pick<Picked, "uri">): Promise<string> {
  try { return await new File(file.uri).text(); } finally { forgetPicked(file); }
}

/** A picked file for a JSON route's `data`: its rule checked first (files.ts), then read. Its picked copy
    is deleted either way (DPDP, forgetPicked): keep the base64, never the file. */
export async function base64For(file: Picked, rule: FileRule): Promise<{ ok: true; data: string } | { ok: false; reason: string }> {
  try {
    const problem = rule.problem(file);
    if (problem) return { ok: false, reason: problem };
    try {
      return { ok: true, data: await readBase64(file) };
    } catch {
      return { ok: false, reason: "That file could not be read on this phone. Choose it again." };
    }
  } finally {
    forgetPicked(file);
  }
}
