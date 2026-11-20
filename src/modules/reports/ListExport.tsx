import { FileSpreadsheet, FileText, Printer } from "lucide-react-native";
import { Text, View } from "react-native";
import { ExportButtons } from "../../core/Export";
import type { ExportTable } from "../../core/exportDoc";
import { asRole } from "../../core/menu";
import { c, face, t } from "../../core/theme";
import { LIST_SCREENS, exportRefusal, type ListScreenKey } from "./listExport";

/* ══════════════════════════════════════════════════════════════════
   A LIST SCREEN'S EXPORT (the web's ExportButtons on a list screen,
   src/modules/reports/components/ExportButtons.tsx): the core's PDF,
   Excel and Print (src/core/Export.tsx, M-14) with the rows the screen shows,
   or, for a role the web refuses the file to, the same two buttons grey
   with the web's own sentence (AGENTS rule 1: never hidden). The title
   is the web's screen title (LIST_SCREENS).
   ══════════════════════════════════════════════════════════════════ */

export function ListExport({ screen, role, table }: {
  screen: ListScreenKey; role: string | null;
  /** Built from the rows the screen shows; null while nothing is read. */
  table: Omit<ExportTable, "title"> | null;
}) {
  const refusal = exportRefusal(asRole(role), LIST_SCREENS[screen]);
  if (!refusal) return <ExportButtons table={table && { title: LIST_SCREENS[screen].title, ...table }} />;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }} accessibilityState={{ disabled: true }}>
        {([["PDF", FileText], ["Excel", FileSpreadsheet], ["Print", Printer]] as const).map(([label, Icon]) => (
          <View
            key={label} accessibilityRole="button" accessibilityLabel={`${label}. ${refusal}`} accessibilityState={{ disabled: true }}
            style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: c.grey300, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.white, opacity: 0.45 }}
          >
            <Icon size={16} color={c.grey600} />
            <Text style={[t.label, { color: c.ink900, ...face[500] }]}>{label}</Text>
          </View>
        ))}
      </View>
      <Text style={[t.caption, { color: c.grey600 }]}>{refusal}</Text>
    </View>
  );
}
