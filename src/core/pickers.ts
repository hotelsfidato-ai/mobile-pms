import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Alert, Linking } from "react-native";
import { typeFromName, type Picked } from "./files";

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

/** A file of these types (files.ts: BILL.types, LOGO.types, SHEET_TYPES …). Null: cancelled. */
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
