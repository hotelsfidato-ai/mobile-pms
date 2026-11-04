import { Search, type LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Text, TextInput, View } from "react-native";
import { initials } from "../../core/menu";
import { c, face, space, t } from "../../core/theme";
import { body } from "../guest-services/kit";
import { capsLabel } from "../laundry/kit";
import { IconChip, type ChipTone } from "../reports/kit";
import type { Owed } from "./lookup";

/* ══════════════════════════════════════════════════════════════════
   THE FEW PIECES THE LOOKUP NEEDS that the kits it imports (guest-services,
   laundry, reports, front desk: imported, never edited) do not carry,
   ported from the web kit with its tokens: src/components/ui/Misc.tsx
   Avatar and FigureTile, DataTable's phone card (its `dl`: a label column
   of 6.5rem at least, 12 between), Card's CardHeader.
   ══════════════════════════════════════════════════════════════════ */

/** Misc.tsx Avatar, size sm: 24 px, the initials white 600 on grey-500. */
export function Avatar({ name }: { name: string }) {
  return (
    <View
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.grey500, alignItems: "center", justifyContent: "center" }}
    >
      <Text style={{ fontSize: 12, lineHeight: 17, color: c.white, ...face[600] }}>{initials(name)}</Text>
    </View>
  );
}

/** One line of the phone card: its label in small capitals (104 px), its value. */
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

/** BALANCE / OWED (tabular, font-medium): red what is owed, blue what is in credit, a grey dash for nothing. */
export const OwedText = ({ o }: { o: Owed }) => (
  <Text accessibilityLabel={o.said} style={[body, t.tab, { color: o.tone === "owes" ? c.red700 : o.tone === "credit" ? c.info : c.grey500 }]}>
    {o.text}
  </Text>
);

/** Misc.tsx FigureTile: a white tile, its chip and label, the figure at 20, a note under it. */
export function Tile({ icon, tone, label, value, note }: { icon: LucideIcon; tone: ChipTone; label: string; value: string; note: string }) {
  return (
    <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, paddingHorizontal: 16, paddingVertical: 14, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <IconChip icon={icon} tone={tone} />
        <Text style={[t.label, { color: c.grey600, flexShrink: 1, lineHeight: 20 }]}>{label}</Text>
      </View>
      <Text style={[t.figure, { lineHeight: 30 }]}>{value}</Text>
      <Text style={[t.caption, { lineHeight: 17, color: c.grey500 }]}>{note}</Text>
    </View>
  );
}

/** Card.tsx with its CardHeader (px-4 py-3.5, a grey-200 line under it) and CardBody (px-4 py-3.5).
    With an action the head keeps the 44 px button inside it. */
export function Panel({ title, action, children, flush }: { title: string; action?: ReactNode; children: ReactNode; flush?: boolean }) {
  return (
    <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: space.cardX, paddingVertical: action ? 6 : space.cardY, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
        <Text style={[t.heading, { flex: 1, lineHeight: 24 }]} accessibilityRole="header">{title}</Text>
        {action}
      </View>
      <View style={flush ? undefined : { paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 8 }}>{children}</View>
    </View>
  );
}

/** Input.tsx SearchInput: a 44 px box, the glass inside it on the left, 16 px type. */
export function SearchBox({ value, onChangeText, placeholder, label }: { value: string; onChangeText: (v: string) => void; placeholder: string; label: string }) {
  return (
    <View style={{ justifyContent: "center" }}>
      <View pointerEvents="none" style={{ position: "absolute", left: 12 }}><Search size={16} color={c.grey500} /></View>
      <TextInput
        value={value} onChangeText={onChangeText} placeholder={placeholder} accessibilityLabel={label} autoFocus
        autoCorrect={false} autoCapitalize="none" returnKeyType="search" placeholderTextColor={c.grey400}
        style={{ minHeight: 44, paddingLeft: 36, paddingRight: 12, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, backgroundColor: c.white, fontSize: 16, color: c.ink900, ...face[500] }}
      />
    </View>
  );
}

/** Guest 360's figures as rows: the label left, the value right, a hairline between. */
export function FigureLine({ label, value, first }: { label: string; value: string; first?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 16, paddingVertical: 8, borderTopWidth: first ? 0 : 1, borderTopColor: c.grey100 }}>
      <Text style={[body, { color: c.grey600 }]}>{label}</Text>
      <Text style={[body, t.tab, { color: c.ink900 }]}>{value}</Text>
    </View>
  );
}
