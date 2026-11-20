import { Camera, Image as ImageIcon, X } from "lucide-react-native";
import { ActionSheetIOS, Alert, Platform, Pressable, Text, View } from "react-native";
import { downloadToShare } from "../../core/Download";
import { BILL, type Picked } from "../../core/files";
import { explainPick, pickFile, pickPhoto } from "../../core/pickers";
import { c, t } from "../../core/theme";
import { Btn } from "./ServiceKit";
import { ty } from "./TablesKit";

/* ══════════════════════════════════════════════════════════════════
   A PAID-OUT'S BILL (the owner's D27-370; M-16) — the web's ExpenseFields
   and ExpensePhoto (finance/flows/ExpenseFields.tsx, c9394cb) for the
   restaurant's Day end: the web's one file box (accept image/*, PDF,
   the phone's camera offered) is each phone's own chooser here - iPhone's
   action sheet, Android's dialog - with the camera, the photo library and
   the file picker (a PDF). Its limit (core files.ts BILL: 9 MB, the web's
   sentence) is checked when it is chosen, before anything is sent.
   ══════════════════════════════════════════════════════════════════ */

/** The phone's own chooser, then its picker: the bill, or null (cancelled, refused, or too big - `onProblem` says why). */
export function chooseBill(onProblem: (why: string) => void): Promise<Picked | null> {
  return new Promise((resolve) => {
    const run = async (how: "camera" | "photos" | "file") => {
      try {
        const got = how === "file" ? await pickFile({ types: BILL.types }) : await pickPhoto({ camera: how === "camera" });
        if (!got) return resolve(null);
        const bad = BILL.problem(got);
        if (bad) { onProblem(bad); return resolve(null); }
        resolve(got);
      } catch (e) {
        if (!explainPick(e)) onProblem("The phone's picker could not be opened. Try again.");
        resolve(null);
      }
    };
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: "Photo of the bill", options: ["Cancel", "Take a photo", "Choose a photo", "Choose a file"], cancelButtonIndex: 0 },
        (i) => { if (i === 1) void run("camera"); else if (i === 2) void run("photos"); else if (i === 3) void run("file"); else resolve(null); },
      );
    } else {
      /* Android's dialog holds three buttons; a tap outside it cancels. */
      Alert.alert("Photo of the bill", "Take it with the phone's camera, or pick a file.", [
        { text: "File", onPress: () => void run("file") },
        { text: "Photos", onPress: () => void run("photos") },
        { text: "Camera", onPress: () => void run("camera") },
      ], { cancelable: true, onDismiss: () => resolve(null) });
    }
  });
}

/** The Record sheet's "Photo of the bill": what was chosen, or a button to choose it (ExpenseFields). */
export function BillChoice({ file, onFile, problem, onProblem, disabled }: {
  file: Picked | null; onFile: (f: Picked | null) => void; problem: string | null; onProblem: (why: string | null) => void; disabled?: boolean;
}) {
  const choose = async () => {
    onProblem(null);
    const got = await chooseBill((why) => onProblem(why));
    if (got) onFile(got);
  };
  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.label, ty.sm, { color: c.grey700 }]}>Photo of the bill</Text>
      {file ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, paddingLeft: 12 }}>
          <ImageIcon size={16} color={c.grey500} />
          <Text style={[t.label, ty.md, { flex: 1, color: c.ink900 }]} numberOfLines={1}>{file.name}</Text>
          <Pressable onPress={() => onFile(null)} disabled={disabled} accessibilityRole="button" accessibilityLabel={`Remove ${file.name}`} hitSlop={4}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
            <X size={18} color={c.grey500} />
          </Pressable>
        </View>
      ) : (
        <View style={{ flexDirection: "row" }}>
          <Btn label="Take or pick a photo" icon={Camera} disabled={disabled} onPress={() => void choose()} />
        </View>
      )}
      {problem ? <Text style={[t.caption, ty.xs, { color: c.red700 }]} accessibilityRole="alert">{problem}</Text>
        : <Text style={[t.caption, ty.xs]}>Take it with the phone's camera, or pick a file. It can be added later.</Text>}
    </View>
  );
}

/** Open a stored bill: fetched with the sign-in and handed to the share sheet under the server's own file
    name, so a PDF opens as a PDF and a photo as a photo (MPOS-P1; the core checks the name is safe).
    `offline`: the web's own sentence for this photo. */
export const openBill = (path: string, _id: string, offline: string) =>
  downloadToShare(path, "", "*/*", offline);
