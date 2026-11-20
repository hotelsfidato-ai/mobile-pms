import { Camera, X } from "lucide-react-native";
import { useRef, useState } from "react";
import { Text, View } from "react-native";
import { downloadToShare } from "../../core/Download";
import type { Picked } from "../../core/files";
import { c, t } from "../../core/theme";
import { pickBill, STORED_NAME, STORED_TYPE } from "./billPick";
import { Btn, Field, IconBtn, Refused } from "./Kit";

/* ══════════════════════════════════════════════════════════════════
   A BILL'S PHOTO IN A FORM, AND A STORED ONE OPENED (M-16, lane
   m16-pick-money) — the web's file box in a dialog (ExpenseFields.tsx's
   "Photo of the bill", CashDeposits.tsx's "Photo of the slip", BarBills'
   and RepairCosts' own), and the web's open (an address only this browser
   opens): on a phone, the file downloaded with the sign-in under the
   server's own name and handed to the share sheet, where the phone's own
   viewer, Files or Drive takes it (core Download.tsx). Nothing is kept.
   ══════════════════════════════════════════════════════════════════ */

/** The chosen file in a form: the phone's three ways to it, its name, a way to take it out. The
    web's and the server's limit is checked as it is chosen, in the web's sentence. */
export function BillField({ label, hint, file, onFile, off, required }: {
  label: string; hint: string; file: Picked | null; onFile: (f: Picked | null) => void; off?: boolean; required?: boolean;
}) {
  const [problem, setProblem] = useState<string | null>(null);
  const choose = async () => {
    setProblem(null);
    const got = await pickBill(label);
    if (!got) return;
    if ("problem" in got) { setProblem(got.problem); return; }
    onFile(got.file);
  };
  return (
    <Field label={label} hint={hint} required={required}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Btn label={file ? "Choose another" : "Take or pick a photo"} Icon={Camera} off={off} onPress={() => void choose()} a11y={file ? `${label}: choose another` : label} />
        {file && !off ? <IconBtn Icon={X} label={`Take out ${file.name}`} onPress={() => { setProblem(null); onFile(null); }} /> : null}
      </View>
      {file ? <Text style={[t.label, { color: c.ink900 }]} numberOfLines={1}>{file.name}</Text> : null}
      <Refused text={problem} />
    </Field>
  );
}

/** Opens a stored bill (a GET file route): one at a time; a failure is said in the web's words
    ("Not opened", the server's sentence, or the route's own offline sentence). */
export function useOpenStored(onFailed: (title: string, text: string) => void) {
  const going = useRef(false);
  const [opening, setOpening] = useState<string | null>(null);
  const open = async (path: string, offline: string, name = STORED_NAME, type = STORED_TYPE) => {
    if (going.current) return;
    going.current = true;
    setOpening(path);
    try { await downloadToShare(path, name, type, offline); }
    catch (e) { onFailed("Not opened", e instanceof Error && e.message ? e.message : "The photo could not be opened."); }
    finally { going.current = false; setOpening(null); }
  };
  return { open, opening };
}
