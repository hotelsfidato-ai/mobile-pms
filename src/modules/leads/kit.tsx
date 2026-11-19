import { ChevronRight, FileText, Inbox, Share2, type LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { ExportButtons } from "../../core/Export";
import type { ExportTable } from "../../core/exportDoc";
import { c, face, space, t } from "../../core/theme";
import { body, Btn } from "../guest-services/kit";
import { capsLabel } from "../laundry/kit";
import { InfoButton } from "../reports/kit";
import { exportRefusal } from "./lane";

/* ══════════════════════════════════════════════════════════════════
   THE PIECES THE SALES LANE'S SCREENS SHARE (mobile/m13-sales, 19 Nov):
   Leads, Marketing, Contracts, Guest feedback and Possible same person.
   Ported from the web kit with its tokens (src/components/ui Card.tsx
   CardHeader / CardBody, DataTable.tsx's phone card, States.tsx
   EmptyState); the kits they lean on are imported, never edited.
   ══════════════════════════════════════════════════════════════════ */

/** Card.tsx: a white card; CardHeader (px-4 py-3.5, a grey-200 line under it: the title, its
    description, an (i) and an action) and CardBody (px-4 py-3.5), or `flush` for a list. */
export function Panel({ title, description, note, action, flush, children }: {
  title?: ReactNode; description?: string; note?: string; action?: ReactNode; flush?: boolean; children?: ReactNode;
}) {
  return (
    <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, overflow: "hidden" }}>
      {title !== undefined ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: space.cardX, paddingVertical: space.cardY, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
              {typeof title === "string" ? <Text style={[t.heading, { lineHeight: 24 }]} accessibilityRole="header">{title}</Text> : title}
              {note ? <View style={{ marginLeft: -10 }}><InfoButton words={note} /></View> : null}
            </View>
            {description ? <Text style={[body, { color: c.grey500 }]}>{description}</Text> : null}
          </View>
          {action}
        </View>
      ) : null}
      {children !== undefined ? (
        <View style={flush ? undefined : { paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 12 }}>{children}</View>
      ) : null}
    </View>
  );
}

/** One line of DataTable's phone card: its header in small capitals (6.5rem), the value beside it. */
export function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <Text style={[capsLabel, { width: 104, paddingTop: 2 }]}>{label}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        {typeof children === "string" ? <Text style={[body, t.tab, { color: c.ink900 }]}>{children}</Text> : children}
      </View>
    </View>
  );
}

/** DataTable.tsx on a phone: one card per row, the first column its heading, the rest as lines;
    a row that opens something carries the arrow (the owner, 27 September). */
export function RowCard({ heading, children, first, onPress, a11y }: {
  heading: ReactNode; children?: ReactNode; first: boolean; onPress?: () => void; a11y?: string;
}) {
  const inner = (
    <View style={{ flex: 1, minWidth: 0 }}>
      {typeof heading === "string" ? <Text style={[body, { color: c.ink900, ...face[500] }]}>{heading}</Text> : heading}
      {children ? <View style={{ marginTop: 6, gap: 4 }}>{children}</View> : null}
    </View>
  );
  const frame = { paddingHorizontal: space.cardX, paddingVertical: 12, borderTopWidth: first ? 0 : 1, borderTopColor: c.grey100 };
  if (!onPress) return <View style={frame}>{inner}</View>;
  return (
    <Pressable
      onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y}
      style={({ pressed }) => [frame, { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: pressed ? c.grey50 : c.white }]}
    >
      {inner}
      <ChevronRight size={16} color={c.grey400} />
    </Pressable>
  );
}

/** States.tsx EmptyState: the icon in a grey disc, the title, its line. */
export function Blank({ icon: Icon = Inbox, title, line, compact }: { icon?: LucideIcon; title: string; line?: string; compact?: boolean }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: compact ? 40 : 64, paddingHorizontal: 24 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.grey100, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Icon size={20} color={c.grey400} />
      </View>
      <Text style={[t.heading, { textAlign: "center" }]}>{title}</Text>
      {line ? <Text style={[t.label, { color: c.grey500, marginTop: 6, textAlign: "center", lineHeight: 23 }]}>{line}</Text> : null}
    </View>
  );
}

/** The web's ExportButtons on a list that holds money or guests' details: the core's print and
    share sheets (src/core/Export.tsx) for whoever downloads reports; anyone else reads the server's
    sentence under the two greyed buttons (lane.ts). A real .xlsx file waits for a package
    (expo-file-system ~57.0.7 + expo-sharing ~57.0.23, M-13). */
export function Exports({ role, holds, table }: { role: string | null; holds: "money" | "guests"; table: ExportTable | null }) {
  const refused = exportRefusal(role, holds);
  if (!refused) return <ExportButtons table={table} />;
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Btn label="PDF or print" a11y={`PDF or print. ${refused}`} icon={FileText} disabled onPress={() => undefined} />
        <Btn label="Share" a11y={`Share. ${refused}`} icon={Share2} disabled onPress={() => undefined} />
      </View>
      <Text style={[t.caption, { color: c.grey500 }]}>{refused}</Text>
    </View>
  );
}
