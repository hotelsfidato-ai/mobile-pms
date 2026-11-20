import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Download as DownloadIcon } from "lucide-react-native";
import { useRef, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { API_URL, ApiError, refused, who } from "./api";
import { DOWNLOAD_OFFLINE, nameIn, statusIn, UNSAFE_NAME, utiOf } from "./files";
import { noteReachable, noteUnreachable } from "./offline";
import { c, face, t as type } from "./theme";

/* ══════════════════════════════════════════════════════════════════
   A FILE THE SERVER MAKES, TO THE SHARE SHEET (M-16, 20 Nov) — the web's
   downloadFile (src/lib/api.ts) on a phone: fetched with the sign-in
   (who(), as every request) by expo-file-system's own download into the
   cache, then handed to the phone's share sheet (expo-sharing, M-14) -
   save to Files / Drive, WhatsApp, mail, print from there. First for
   Settings › Documents' sample voucher (GET /:code/documents/sample-
   voucher.pdf); any GET file route after it.
   A download is a read with no cached copy: with nothing coming back it
   is refused in the web's sentence, never held. A refusal is the
   server's own sentence: the download says only its status, so the same
   GET is asked once more to read it (a read, safe to repeat).
   NOTHING KEPT (DPDP, 20 Nov): every download goes into one folder,
   `share/` in the cache, emptied at the start of each download, at app
   start and at sign-out (session.tsx) - never straight after the share
   sheet, as Android's receiving app may read the file late.
   A blank `fileName` takes the SERVER's name (Content-Disposition): a
   stored bill may be a JPEG, a HEIC or a PDF, and iPhone's share sheet
   goes by the name. That name is the uploader's, stripped only of ", \,
   CR and LF (api/src/routes/attachments.ts), so where it landed is
   checked: straight inside `share/`, or deleted and refused (UNSAFE_NAME).
   Nothing is ever written over: the folder is empty, so `idempotent`
   stays off and a name that is a folder ("." or "..") fails, never
   replaces it.
   ══════════════════════════════════════════════════════════════════ */

/** The one folder downloads go into. */
/** The one folder every file handed to the share sheet goes into (downloads here, exports in Export.tsx). */
export const shareFolder = () => new Directory(Paths.cache, "share");

/** Empties the downloads folder (app start, sign-out, each download). Never throws. */
export function emptyShared(): void {
  if (Platform.OS === "web") return;
  try {
    const dir = shareFolder();
    if (dir.exists) dir.delete();
  } catch { /* nothing there, or the phone cleared its cache */ }
}

/** Downloads `path` (the API's, with its query) as `fileName` ("": the server's own name) and opens the share
    sheet. `offline`: the web's own sentence for this file when nothing comes back (the voucher's), else
    downloadFile's. */
export async function downloadToShare(path: string, fileName: string, mimeType: string, offline = DOWNLOAD_OFFLINE): Promise<void> {
  const url = `${API_URL}${path}`;
  emptyShared();
  const dir = shareFolder();
  dir.create({ intermediates: true, idempotent: true });
  const file = fileName ? new File(dir, fileName) : dir; /* "": the SERVER's name (Content-Disposition) - a stored bill the phone cannot name (m16-pick-money) */
  if (file instanceof File && nameIn(dir.uri, file.uri) === null) throw new Error(UNSAFE_NAME);
  let got: File;
  try {
    got = await File.downloadFileAsync(url, file, { headers: await who(), idempotent: false });
  } catch (e) {
    const said = e instanceof Error ? e.message : String(e);
    /* A name that is already there (a folder, "." or ".."): refused, never written over. */
    if (/already exists/i.test(said)) throw new Error(UNSAFE_NAME);
    const status = statusIn(said);
    if (status === null) { noteUnreachable(); throw new ApiError(0, offline); }
    noteReachable();
    /* The server's own words for its refusal. */
    let again: Response;
    try { again = await fetch(url, { headers: await who() }); } catch { throw new ApiError(status, `Request failed (${status}).`); }
    throw again.ok ? new ApiError(status, `Request failed (${status}).`) : await refused(again);
  }
  noteReachable();
  /* Where the server's name put it: straight inside share/, or deleted (a file only) and refused. */
  if (nameIn(dir.uri, got.uri) === null) {
    try { if (got.exists) got.delete(); } catch { /* not a file, or gone */ }
    throw new Error(UNSAFE_NAME);
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error("This phone cannot share a file, so it was not opened.");
  await Sharing.shareAsync(got.uri, { mimeType, UTI: utiOf(mimeType), dialogTitle: fileName || got.name });
}

/** A download as a capsule, in ExportButtons' style: one tap at a time, its failure said under it. */
export function DownloadButton({ label, a11y, path, fileName, mimeType, offline, disabled }: {
  label: string; a11y?: string; path: string; fileName: string; mimeType: string; offline?: string; disabled?: boolean;
}) {
  const [said, setSaid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const going = useRef(false);
  const on = !disabled && !busy;
  const press = async () => {
    if (going.current) return;
    going.current = true;
    setBusy(true);
    setSaid(null);
    try { await downloadToShare(path, fileName, mimeType, offline); }
    catch (e) { setSaid(e instanceof Error && e.message ? e.message : "The file could not be downloaded."); }
    finally { going.current = false; setBusy(false); }
  };
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row" }}>
        <Pressable
          onPress={on ? () => void press() : undefined} disabled={!on} accessibilityRole="button" accessibilityLabel={a11y ?? label}
          accessibilityState={{ disabled: !on, busy }} android_ripple={{ color: c.grey200, borderless: false }}
          style={({ pressed }) => ({
            minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: c.grey300,
            flexDirection: "row", alignItems: "center", gap: 6, overflow: "hidden",
            backgroundColor: pressed && Platform.OS === "ios" ? c.grey50 : c.white, opacity: on ? 1 : 0.45,
          })}
        >
          <DownloadIcon size={16} color={c.grey600} />
          <Text style={[type.label, { color: c.ink900, ...face[500] }]}>{busy ? "Downloading…" : label}</Text>
        </Pressable>
      </View>
      {said ? <Text style={[type.caption, { color: c.red700 }]} accessibilityRole="alert">{said}</Text> : null}
    </View>
  );
}
