import * as Print from "expo-print";
import { FileText, Share2 } from "lucide-react-native";
import { useState } from "react";
import { Platform, Pressable, Share, Text, View } from "react-native";
import { tableHtml, tableText, type ExportTable } from "./exportDoc";
import { c, face, t as type } from "./theme";

/* ══════════════════════════════════════════════════════════════════
   THE EXPORT BUTTONS every list and report shares (exportDoc.ts): "PDF or
   print" opens the phone's own print sheet, "Share" the phone's own share
   sheet. Both are the operating system's, so they look and behave as each
   phone's people expect. `table` is built by the screen from what it
   shows; null while nothing is read yet (both buttons wait, never an
   empty export).
   ══════════════════════════════════════════════════════════════════ */

const madeNow = () => {
  const d = new Date();
  const h = d.getHours();
  return `${d.getDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()]} ${d.getFullYear()}, ${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

export function ExportButtons({ table }: { table: ExportTable | null }) {
  const [said, setSaid] = useState<string | null>(null);
  const ready = table !== null && table.rows.length > 0;
  const pdf = () => {
    if (!table) return;
    setSaid(null);
    Print.printAsync({ html: tableHtml(table, madeNow()) }).catch((e: unknown) => setSaid(e instanceof Error ? e.message : "Could not open the print sheet."));
  };
  const share = () => {
    if (!table) return;
    setSaid(null);
    Share.share({ title: table.title, message: tableText(table) }).catch((e: unknown) => setSaid(e instanceof Error ? e.message : "Could not open the share sheet."));
  };
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Btn label={Platform.OS === "ios" ? "PDF or print" : "Save as PDF or print"} Icon={FileText} on={ready} onPress={pdf} />
        <Btn label="Share" Icon={Share2} on={ready} onPress={share} />
      </View>
      {!ready ? <Text style={[type.caption]}>{table === null ? "Ready once the figures are read." : "Nothing to export yet."}</Text> : null}
      {said ? <Text style={[type.caption, { color: c.red700 }]} accessibilityRole="alert">{said}</Text> : null}
    </View>
  );
}

function Btn({ label, Icon, on, onPress }: { label: string; Icon: typeof FileText; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={on ? onPress : undefined} disabled={!on} accessibilityRole="button" accessibilityLabel={label}
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
