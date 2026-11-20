import { Alert, Platform, type AlertButton } from "react-native";
import { BILL, type Picked } from "../../core/files";
import { explainPick, pickFile, pickPhoto } from "../../core/pickers";

/* ══════════════════════════════════════════════════════════════════
   A BILL'S PHOTO OR PDF FROM THE PHONE (M-16, lane m16-pick-money) — the
   web's <input type="file" accept="image/*,application/pdf"> (a paid-out's
   bill, a deposit slip, a bar bill, a repair's proof), which a phone's
   browser opens as three choices: the camera, the photos, the files. Here
   the same three in each phone's own dialog (Android shows at most three
   buttons, and closes on a tap outside or the back gesture; iPhone adds
   Cancel). The file is sent as picked, never redrawn (the web's); the
   web's and the server's limit (core files.ts BILL, 9 MB) is checked
   before anything is sent, in the web's own sentence. A refused camera is
   said with the way to Settings (core explainPick). Used by finance,
   purchasing (the bar's bills) and housekeeping (a repair's cost).
   ══════════════════════════════════════════════════════════════════ */

/** A file to send, the web's sentence why it cannot be, or null: nothing was chosen. */
export type BillPick = { file: Picked } | { problem: string } | null;

/** Any stored bill or proof opens under the server's own name (core Download.tsx, ""): on Android
    the receiving app reads its type from that name, and iPhone shares by the name alone. */
export const STORED_NAME = "";
export const STORED_TYPE = "*/*";

export function pickBill(title: string): Promise<BillPick> {
  return new Promise((resolve) => {
    let done = false;
    const end = (v: BillPick) => { if (!done) { done = true; resolve(v); } };
    const go = (pick: () => Promise<Picked | null>) => () => {
      pick().then(
        (f) => {
          if (!f) return end(null);
          const problem = BILL.problem(f);
          end(problem ? { problem } : { file: f });
        },
        (e) => end(explainPick(e) ? null : { problem: "That could not be opened on this phone. Try again, or choose another way." }),
      );
    };
    const file = go(() => pickFile({ types: BILL.types }));
    /* The web preview has no camera or dialog of its own: the browser's file box. */
    if (Platform.OS === "web") return file();
    const choices: AlertButton[] = [
      { text: "Take a photo", onPress: go(() => pickPhoto({ camera: true })) },
      { text: "Choose a photo", onPress: go(() => pickPhoto()) },
      { text: "Choose a file", onPress: file },
    ];
    Alert.alert(title, "A photo of the bill, or its PDF.",
      Platform.OS === "ios" ? [...choices, { text: "Cancel", style: "cancel", onPress: () => end(null) }] : choices,
      { cancelable: true, onDismiss: () => end(null) });
  });
}
