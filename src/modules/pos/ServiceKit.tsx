import { Check, ChevronDown, Minus, Plus, X, type LucideIcon } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View,
  type StyleProp, type TextInputProps, type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { c, face, space, t } from "../../core/theme";
import { ty } from "./TablesKit";

/* ══════════════════════════════════════════════════════════════════
   THE PIECES BILL HISTORY, CLOSE RESTAURANT DAY, CHARGES TO ROOMS AND
   TABLE BOOKINGS SHARE — after the web kit (src/components/ui:
   PageHeader, StatusPill, Button, Input's Field and NativeSelect,
   DataTable at phone width, Overlays' Dialog), drawn as docs/NATIVE.md
   asks: safe areas in every sheet, the keyboard lifted, android_ripple on
   Android and the pressed shade on iPhone, 44 px under a finger.
   TablesKit's type steps (`ty`), ReadProblem, Refused, Stale and SaidBar
   are imported where used.
   ══════════════════════════════════════════════════════════════════ */

export type Tone = "success" | "warning" | "danger" | "neutral" | "info";

/** StatusPill.tsx: soft tint, readable ink, a small dot (theme.css values). */
const PILL: Record<Tone, { bg: string; fg: string; dot: string }> = {
  neutral: { bg: c.grey100, fg: c.grey600, dot: c.grey400 },
  success: { bg: c.success50, fg: c.success600, dot: c.success },
  warning: { bg: c.yellow50, fg: c.yellow800, dot: c.yellow },
  danger: { bg: c.red50, fg: c.red700, dot: c.red },
  info: { bg: c.info50, fg: c.info, dot: c.info },
};

export function Pill({ tone, children, dot = true, icon }: { tone: Tone; children: string; dot?: boolean; icon?: ReactNode }) {
  const p = PILL[tone];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: p.bg }}>
      {icon}
      {dot && !icon ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.dot }} /> : null}
      <Text style={[t.caption, ty.xs, { color: p.fg, fontSize: 13 }]}>{children}</Text>
    </View>
  );
}

/** PageHeader.tsx: the title, a pill beside it, the description under it, actions below. */
export function PageHead({ title, pill, description, children }: { title: string; pill?: ReactNode; description?: string; children?: ReactNode }) {
  return (
    <View style={{ gap: 12, marginBottom: space.section - space.card }}>
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", columnGap: 10, rowGap: 4 }}>
          <Text style={t.title} accessibilityRole="header">{title}</Text>
          {pill}
        </View>
        {description ? <Text style={[t.label, ty.sm, { color: c.grey500 }]}>{description}</Text> : null}
      </View>
      {children}
    </View>
  );
}

/** A section's heading inside a page (Section.tsx / a CardHeader's title and line). */
export function Heading({ title, under, right }: { title: string; under?: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[t.heading, ty.md]} accessibilityRole="header">{title}</Text>
        {under ? <Text style={[t.label, ty.sm, { color: c.grey500 }]}>{under}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/** A white card with an optional head over a hairline (Card + CardHeader + CardBody). */
export function Panel({ head, children, style }: { head?: ReactNode; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, overflow: "hidden" }, style]}>
      {head ? <View style={{ paddingHorizontal: space.cardX, paddingVertical: space.cardY, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>{head}</View> : null}
      <View style={{ paddingHorizontal: space.cardX, paddingVertical: space.cardY }}>{children}</View>
    </View>
  );
}

/** DataTable at phone width: one card per row, its first column as the title,
    the rest as LABEL · value lines (the pictures' n-pos-bill-history, n-pos-room-charges). */
export function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", gap: 12, paddingVertical: 3 }}>
      <Text style={[t.caption, ty.xs, { width: 116, textTransform: "uppercase", letterSpacing: 0.6, paddingTop: 2 }]}>{label}</Text>
      <View style={{ flex: 1, gap: 2 }}>{typeof children === "string" ? <Text style={[t.label, ty.md, { color: c.ink900 }]}>{children}</Text> : children}</View>
    </View>
  );
}

/** A figure row of a sum (dl's flex row): the label left, the figure right. */
export function Line({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.grey200 }}>
      <Text style={[t.label, ty.md, { flex: 1, color: tone ?? (strong ? c.ink900 : c.grey600), ...face[strong ? 600 : 500] }]}>{label}</Text>
      <Text style={[t.label, t.tab, strong ? ty.xl : ty.md, { color: tone ?? c.ink900, ...face[strong ? 600 : 500] }]}>{value}</Text>
    </View>
  );
}

/** Button.tsx: a capsule, primary orange-600 (white on brand orange fails AA). */
export function Btn({ label, onPress, primary, ghost, disabled, busy, icon: Icon, a11y, hint, style, tall }: {
  label: string; onPress: () => void; primary?: boolean; ghost?: boolean; disabled?: boolean; busy?: boolean; icon?: LucideIcon;
  a11y?: string; hint?: string; style?: StyleProp<ViewStyle>; tall?: boolean;
}) {
  const off = Boolean(disabled || busy);
  const fg = primary ? (off ? c.grey600 : c.white) : off ? c.grey500 : ghost ? c.grey700 : c.ink900;
  return (
    <Pressable
      onPress={off ? undefined : onPress} disabled={off}
      accessibilityRole="button" accessibilityLabel={a11y ?? label} accessibilityHint={hint}
      accessibilityState={{ disabled: off, busy: Boolean(busy) }}
      android_ripple={{ color: primary ? c.orange700 : c.grey200 }}
      style={({ pressed }) => [{
        minHeight: tall ? 48 : 44, paddingHorizontal: 16, gap: 8, borderRadius: 999, overflow: "hidden",
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        backgroundColor: primary ? (off ? c.grey300 : pressed && Platform.OS === "ios" ? c.orange700 : c.orange600)
          : ghost ? (pressed && Platform.OS === "ios" ? c.grey100 : "transparent")
            : off ? c.grey50 : pressed && Platform.OS === "ios" ? c.grey100 : c.white,
        borderWidth: primary || ghost ? 0 : 1, borderColor: c.grey300,
      }, style]}
    >
      {busy ? <ActivityIndicator size="small" color={fg} /> : Icon ? <Icon size={16} color={fg} /> : null}
      <Text style={[ty.md, face[500], { color: fg, flexShrink: 1, textAlign: "center" }]}>{label}</Text>
    </Pressable>
  );
}

/** A greyed control's reason, under it (AGENTS rule 1). */
export const Why = ({ children }: { children: string | null | undefined }) =>
  children ? <Text style={[t.caption, ty.xs, { color: c.grey600 }]}>{children}</Text> : null;

/* ── Typing (Input.tsx): 44 px, 16 px type, the right keyboard per field ── */

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={c.grey400}
      {...props}
      style={[{ minHeight: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, backgroundColor: props.editable === false ? c.grey50 : c.white, ...face[500], fontSize: 16, color: c.ink900 }, props.style]}
    />
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string | null; error?: string | null; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.label, ty.sm, { color: c.grey700 }]}>{label}</Text>
      {children}
      {error ? <Text style={[t.caption, ty.xs, { color: c.red700 }]}>{error}</Text>
        : hint ? <Text style={[t.caption, ty.xs]}>{hint}</Text> : null}
    </View>
  );
}

/** A day written 2026-10-27, typed or stepped a day at a time (the owner's
    M-7 day stepper; a date picker needs @react-native-community/datetimepicker 9.1.0, not approved). */
export function DayField({ label, value, onChange, step, placeholder = "2026-10-27" }: {
  label: string; value: string; onChange: (v: string) => void; step: (by: number) => void; placeholder?: string;
}) {
  return (
    <Field label={label}>
      <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
        <Square a11y={`${label}: a day earlier`} onPress={() => step(-1)}><Minus size={16} color={c.ink900} /></Square>
        <Input value={value} onChangeText={onChange} placeholder={placeholder} keyboardType="numbers-and-punctuation"
          autoCorrect={false} autoCapitalize="none" maxLength={10} accessibilityLabel={label} style={{ flex: 1, textAlign: "center" }} />
        <Square a11y={`${label}: a day later`} onPress={() => step(1)}><Plus size={16} color={c.ink900} /></Square>
      </View>
    </Field>
  );
}

function Square({ a11y, onPress, children }: { a11y: string; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} android_ripple={{ color: c.grey200 }}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: pressed && Platform.OS === "ios" ? c.grey100 : c.white })}>
      {children}
    </Pressable>
  );
}

/* ── A sheet from the foot of the screen (Overlays' Dialog on a phone) ── */

export function BottomSheet({ open, onClose, title, description, footer, children }: {
  open: boolean; onClose: () => void; title: string; description?: string; footer?: ReactNode; children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: "rgba(1,13,23,0.35)", justifyContent: "flex-end" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <View style={{ backgroundColor: c.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "90%" }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: space.side, paddingTop: 18, paddingBottom: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[t.heading, ty.md]} accessibilityRole="header">{title}</Text>
              {description ? <Text style={[t.label, ty.sm, { color: c.grey500 }]}>{description}</Text> : null}
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", marginTop: -10, marginRight: -12 }}>
              <X size={18} color={c.grey500} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: space.side, paddingBottom: footer ? 12 : Math.max(insets.bottom, 16), gap: 14 }}>
            {children}
          </ScrollView>
          {footer ? (
            <View style={{ borderTopWidth: 1, borderTopColor: c.grey200, backgroundColor: c.grey50, paddingHorizontal: space.side, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16), gap: 8 }}>
              {footer}
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** NativeSelect on a phone: a field that opens its choices in a sheet. */
export function Select({ label, value, options, onChange, disabled }: {
  label: string; value: string; options: readonly { value: string; label: string }[]; onChange: (v: string) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const shown = options.find((o) => o.value === value)?.label ?? "";
  return (
    <>
      <Pressable
        onPress={() => !disabled && setOpen(true)} disabled={disabled} accessibilityRole="button" accessibilityLabel={`${label}: ${shown}`}
        accessibilityState={{ disabled: Boolean(disabled) }} android_ripple={{ color: c.grey200 }}
        style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 12, paddingRight: 10, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, backgroundColor: disabled ? c.grey50 : c.white, overflow: "hidden" }}
      >
        <Text style={{ flex: 1, fontSize: 16, color: disabled ? c.grey500 : c.ink900, ...face[500] }} numberOfLines={1}>{shown}</Text>
        <ChevronDown size={16} color={c.grey500} />
      </Pressable>
      <Modal visible={open} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(1,13,23,0.35)" }}>
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Close" />
          <View style={{ backgroundColor: c.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: space.side, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 16), maxHeight: "75%" }}>
            <Text style={[t.heading, { marginBottom: 6 }]} accessibilityRole="header">{label}</Text>
            <ScrollView>
              {options.map((o) => (
                <Pressable
                  key={o.value || "(none)"} onPress={() => { onChange(o.value); setOpen(false); }}
                  accessibilityRole="button" accessibilityLabel={o.label} accessibilityState={{ selected: o.value === value }}
                  android_ripple={{ color: c.grey200 }}
                  style={({ pressed }) => ({ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: c.grey100, backgroundColor: pressed && Platform.OS === "ios" ? c.grey50 : c.white })}
                >
                  <Text style={[t.label, ty.md, { flex: 1, color: c.ink900 }]}>{o.label}</Text>
                  {o.value === value ? <Check size={18} color={c.orange} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

/** "Loading…" with each phone's own spinner. */
export function Loading({ words }: { words: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 24, justifyContent: "center" }}>
      <ActivityIndicator color={c.orange} />
      <Text style={[t.label, ty.sm]}>{words}</Text>
    </View>
  );
}

/** EmptyState.tsx: an icon, a title, a line. */
export function Empty({ icon: Icon, title, line }: { icon?: LucideIcon; title: string; line?: string }) {
  return (
    <View style={{ alignItems: "center", gap: 8, paddingVertical: 28, paddingHorizontal: 12 }}>
      {Icon ? <Icon size={24} color={c.grey300} /> : null}
      <Text style={[t.heading, { textAlign: "center" }]}>{title}</Text>
      {line ? <Text style={[t.label, ty.sm, { textAlign: "center", color: c.grey500 }]}>{line}</Text> : null}
    </View>
  );
}
