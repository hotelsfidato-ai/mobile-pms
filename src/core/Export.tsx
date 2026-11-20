import { File } from "expo-file-system";
import { emptyShared, shareFolder } from "./Download";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { FileSpreadsheet, FileText, Printer } from "lucide-react-native";
import { useState } from "react";
import { Platform, Pressable, Share, Text, View } from "react-native";
import { fileName, tableCsv, tableHtml, tableText, type ExportTable } from "./exportDoc";
import { c, face, t as type } from "./theme";

/* ══════════════════════════════════════════════════════════════════
   THE EXPORT BUTTONS every list and report shares (exportDoc.ts), all
   through the phone's own sheets, so each looks and behaves as its
   people expect:
   - "PDF": the page made into a PDF file (expo-print) and handed to the
     share sheet (expo-sharing, M-14) — save to Files / Drive, WhatsApp,
     mail.
   - "Excel": the rows as a CSV file (expo-file-system, M-14), which Excel,
     Sheets and Numbers open; to the share sheet.
   - "Print": the phone's own print sheet.
   A phone that cannot share a file (rare) gets the rows as text through
   React Native's Share instead, and says so. `table` is built by the
   screen from what it shows; null while nothing is read yet (the buttons
   wait, never an empty export). Files go to the cache's share/ folder,
   emptied before each export or download, on sign-out and at app start: nothing about a guest is kept (DPDP).
   ══════════════════════════════════════════════════════════════════ */

const madeNow = () => {
  const d = new Date();
  const h = d.getHours();
  return `${d.getDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()]} ${d.getFullYear()}, ${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

const failed = (e: unknown, what: string) => (e instanceof Error && e.message ? e.message : `Could not ${what}.`);

export function ExportButtons({ table }: { table: ExportTable | null }) {
  const [said, setSaid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ready = table !== null && table.rows.length > 0 && !busy;

  const run = async (what: string, act: (tb: ExportTable) => Promise<void>) => {
    if (!table || busy) return;
    setSaid(null);
    setBusy(true);
    try { await act(table); } catch (e) { setSaid(failed(e, what)); } finally { setBusy(false); }
  };

  /* A phone without a file share: the rows as text, said plainly. */
  const asText = async (tb: ExportTable) => {
    await Share.share({ title: tb.title, message: tableText(tb) });
    setSaid("This phone cannot share a file: the rows were shared as text.");
  };

  const pdf = () => run("make the PDF", async (tb) => {
    if (!(await Sharing.isAvailableAsync())) return asText(tb);
    const { uri } = await Print.printToFileAsync({ html: tableHtml(tb, madeNow()) });
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: tb.title });
  });

  const excel = () => run("make the Excel file", async (tb) => {
    if (!(await Sharing.isAvailableAsync())) return asText(tb);
    /* Into share/, emptied first and on sign-out and app start (Download.tsx): nothing kept (DPDP). */
    emptyShared();
    const dir = shareFolder();
    if (!dir.exists) dir.create();
    const file = new File(dir, `${fileName(tb.title)}.csv`);
    file.create();
    file.write(tableCsv(tb));
    await Sharing.shareAsync(file.uri, { mimeType: "text/csv", UTI: "public.comma-separated-values-text", dialogTitle: tb.title });
  });

  const print = () => run("open the print sheet", async (tb) => {
    await Print.printAsync({ html: tableHtml(tb, madeNow()) });
  });

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Btn label="PDF" a11y="Share as a PDF file" Icon={FileText} on={ready} onPress={pdf} />
        <Btn label="Excel" a11y="Share as an Excel (CSV) file" Icon={FileSpreadsheet} on={ready} onPress={excel} />
        <Btn label="Print" a11y="Print" Icon={Printer} on={ready} onPress={print} />
      </View>
      {table === null ? <Text style={type.caption}>Ready once the figures are read.</Text>
        : table.rows.length === 0 ? <Text style={type.caption}>Nothing to export yet.</Text> : null}
      {said ? <Text style={[type.caption, { color: said.startsWith("This phone") ? c.grey600 : c.red700 }]} accessibilityRole="alert">{said}</Text> : null}
    </View>
  );
}

function Btn({ label, a11y, Icon, on, onPress }: { label: string; a11y: string; Icon: typeof FileText; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={on ? onPress : undefined} disabled={!on} accessibilityRole="button" accessibilityLabel={a11y}
      accessibilityState={{ disabled: !on }} android_ripple={{ color: c.grey200, borderless: false }}
      style={({ pressed }) => ({
        minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: c.grey300,
        flexDirection: "row", alignItems: "center", gap: 6, overflow: "hidden",
        backgroundColor: pressed && Platform.OS === "ios" ? c.grey50 : c.white, opacity: on ? 1 : 0.45,
      })}
    >
      <Icon size={16} color={c.grey600} />
      <Text style={[type.label, { color: c.ink900, ...face[500] }]}>{label}</Text>
    </Pressable>
  );
}
