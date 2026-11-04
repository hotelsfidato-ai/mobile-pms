import type { ReactNode } from "react";
import { Text, TextInput, View } from "react-native";
import { c, face, space, t } from "../../core/theme";
import { body } from "../guest-services/kit";

/* ══════════════════════════════════════════════════════════════════
   THE FEW PIECES LOYALTY NEEDS that the kits it imports (guest-services,
   laundry, front desk: imported, never edited) do not carry, ported from
   the web kit with its tokens (src/components/ui Card.tsx CardHeader with
   its description and actions; Input.tsx with inputMode numeric/decimal).
   ══════════════════════════════════════════════════════════════════ */

/** Card.tsx: a white card, its CardHeader (title, a grey-500 line under it,
    actions at the right) over a grey-200 hairline, then the body. */
export function LCard({ title, description, action, children, flush }: {
  title: string; description?: string | null; action?: ReactNode; children?: ReactNode; flush?: boolean;
}) {
  return (
    <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200 }}>
      <View style={{
        flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: space.cardX, paddingVertical: space.cardY,
        ...(children ? { borderBottomWidth: 1, borderBottomColor: c.grey200 } : null),
      }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[t.heading, { lineHeight: 24 }]} accessibilityRole="header">{title}</Text>
          {description ? <Text style={[body, { color: c.grey500 }]}>{description}</Text> : null}
        </View>
        {action}
      </View>
      {children ? <View style={flush ? undefined : { paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 12 }}>{children}</View> : null}
    </View>
  );
}

/** Input.tsx with the web's inputMode: 44 tall, 16px type, the figures tabular. */
export function Typed({ label, value, onChangeText, keyboard = "default", editable = true, maxLength, autoFocus }: {
  label: string; value: string; onChangeText: (v: string) => void;
  keyboard?: "default" | "number-pad" | "decimal-pad" | "numbers-and-punctuation";
  editable?: boolean; maxLength?: number; autoFocus?: boolean;
}) {
  return (
    <TextInput
      value={value} onChangeText={onChangeText} accessibilityLabel={label} keyboardType={keyboard}
      editable={editable} maxLength={maxLength} autoFocus={autoFocus} placeholderTextColor={c.grey400}
      accessibilityState={{ disabled: !editable }}
      style={{
        minHeight: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: c.grey300,
        backgroundColor: editable ? c.white : c.grey50, fontSize: 16, color: editable ? c.ink900 : c.grey500,
        ...face[500], ...(keyboard === "default" ? null : t.tab),
      }}
    />
  );
}
