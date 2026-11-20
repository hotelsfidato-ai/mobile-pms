import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { ActionSheetIOS, Alert, Linking, Platform, type AlertButton } from "react-native";
import { BILL, isWithin, typeFromName, type Picked } from "./files";

/* ══════════════════════════════════════════════════════════════════
   THE PHONE'S OWN PICKERS (M-16, 20 Nov; docs/NATIVE.md) — a photo from
   the library or the camera (expo-image-picker ~57.0.20), a file
   (expo-document-picker ~57.0.3). Each answers a `Picked` (files.ts) or
   null when the person cancelled. The library and the file picker need
   no permission on either phone (each phone's own picker hands over only
   what was chosen); the camera does: refused, `pickPhoto` throws a
   NoPermission with a plain sentence, and `explainPick` shows it in the
   phone's own dialog with a way to its Settings (Linking.openSettings).

   Nothing is redrawn: the web sends a bill's photo as picked, and
   redraws only the gallery's photos (1600 px, JPEG 0.85) - which this
   phone cannot (no image library is installed), so files.ts PHOTO
   refuses a larger one before it is sent. `quality` re-encodes a JPEG
   only; pass files.ts PHOTO_QUALITY (the web's 0.85) for a gallery photo.
   DPDP (20 Nov): each picker copies the file into this app's cache; the
   caller deletes that copy once it is read or sent (`forgetPicked`;
   upload.ts base64For and readText do it themselves).
   ══════════════════════════════════════════════════════════════════ */

/** The camera was refused: `message` is the sentence; Settings is where it is given back. */
export class NoPermission extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoPermission";
  }
}

const sizeOf = (uri: string, said?: number | null) => {
  if (said != null && said > 0) return said;
  try { return new File(uri).size || null; } catch { return null; }
};

/** A photo: the camera (`camera: true`) or the library. Null: cancelled. */
export async function pickPhoto(opts: { camera?: boolean; quality?: number } = {}): Promise<Picked | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: "images", quality: opts.quality ?? 1, exif: false, base64: false };
  let result: ImagePicker.ImagePickerResult;
  if (opts.camera) {
    const asked = await ImagePicker.requestCameraPermissionsAsync();
    if (!asked.granted) {
      throw new NoPermission(asked.canAskAgain
        ? "The camera was not allowed, so no photo was taken. Allow it when the phone asks, or choose a photo instead."
        : "The camera is turned off for Fidato. Turn it on in the phone's Settings, or choose a photo instead.");
    }
    result = await ImagePicker.launchCameraAsync(options);
  } else {
    result = await ImagePicker.launchImageLibraryAsync({ ...options, allowsMultipleSelection: false });
  }
  if (result.canceled || !result.assets?.length) return null;
  const a = result.assets[0]!;
  const name = a.fileName || a.uri.split("/").pop() || "photo.jpg";
  return {
    uri: a.uri, name, mimeType: a.mimeType || typeFromName(name), size: sizeOf(a.uri, a.fileSize),
    width: a.width || undefined, height: a.height || undefined,
  };
}

/** A file of these types (files.ts: BILL.types, LOGO.types, ANY_FILE for a sheet or a CSV …). Null: cancelled. */
export async function pickFile(opts: { types: string[] }): Promise<Picked | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: opts.types, copyToCacheDirectory: true, multiple: false });
  if (result.canceled || !result.assets?.length) return null;
  const a = result.assets[0]!;
  return { uri: a.uri, name: a.name, mimeType: a.mimeType || typeFromName(a.name), size: sizeOf(a.uri, a.size) };
}

/** Open this app's page in the phone's Settings (the camera's switch is there). */
export const openSettings = () => { void Linking.openSettings().catch(() => undefined); };

/** In a picker's catch: a refused camera is said in the phone's own dialog, with Settings; true
    when it was that, false for anything else (the screen says that itself). */
export function explainPick(e: unknown): boolean {
  if (!(e instanceof NoPermission)) return false;
  Alert.alert("No camera", e.message, [
    { text: "Not now", style: "cancel" },
    { text: "Open Settings", onPress: openSettings },
  ], { cancelable: true });
  return true;
}

/** Deletes a picked file's copy (DPDP: nothing kept once it is read or sent). Only a copy inside this
    app's cache, where both pickers put theirs: a file anywhere else is the person's own and is never
    touched. Never throws (already gone is fine). */
export function forgetPicked(picked: Pick<Picked, "uri"> | null | undefined): void {
  if (!picked) return;
  try {
    if (!isWithin(Paths.cache.uri, picked.uri)) return;
    const copy = new File(picked.uri);
    if (copy.exists) copy.delete();
  } catch { /* already gone, or not ours */ }
}

/* ── A BILL'S PHOTO OR PDF (20 Nov) ──────────────────────────────────
   The web's <input type="file" accept="image/*,application/pdf"> (a
   paid-out's bill, a deposit slip, a bar bill, a repair's proof), which
   a phone's browser opens as three choices: the camera, the photos, the
   files. Here the same three in each phone's own way: iPhone's action
   sheet (with Cancel), Android's dialog (three buttons at most; a tap
   outside or the back gesture closes it). Sent as picked, never redrawn
   (the web's); files.ts BILL's 9 MB checked first, in the web's own
   sentence, and a refused file's copy deleted. A refused camera is said
   with the way to Settings (explainPick). The same as lane 1's
   finance/billPick.ts, which can import it from here. */

/** A file to send (forgetPicked it once sent), the web's sentence why it cannot be, or null: nothing chosen. */
export type BillPick = { file: Picked } | { problem: string } | null;

const BILL_CHOICES = ["Take a photo", "Choose a photo", "Choose a file"] as const;
const BILL_LINE = "A photo of the bill, or its PDF.";

export function pickBill(title: string): Promise<BillPick> {
  return new Promise((resolve) => {
    let done = false;
    const end = (v: BillPick) => { if (!done) { done = true; resolve(v); } };
    const go = (pick: () => Promise<Picked | null>) => () => {
      pick().then(
        (f) => {
          if (!f) return end(null);
          const problem = BILL.problem(f);
          if (problem) forgetPicked(f);
          end(problem ? { problem } : { file: f });
        },
        (e) => end(explainPick(e) ? null : { problem: "That could not be opened on this phone. Try again, or choose another way." }),
      );
    };
    const acts = [go(() => pickPhoto({ camera: true })), go(() => pickPhoto()), go(() => pickFile({ types: BILL.types }))];
    /* The web preview has no camera or dialog of its own: the browser's file box. */
    if (Platform.OS === "web") return acts[2]!();
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { title, message: BILL_LINE, options: [...BILL_CHOICES, "Cancel"], cancelButtonIndex: BILL_CHOICES.length },
        (i) => { const act = acts[i]; if (act) act(); else end(null); },
      );
      return;
    }
    const buttons: AlertButton[] = BILL_CHOICES.map((text, i) => ({ text, onPress: acts[i] }));
    Alert.alert(title, BILL_LINE, buttons, { cancelable: true, onDismiss: () => end(null) });
  });
}
