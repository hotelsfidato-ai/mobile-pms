import { Check, ChevronDown, X, type LucideIcon } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View,
  type KeyboardTypeOptions, type StyleProp, type TextStyle, type ViewStyle,
} from "react-native";
import { c, face, space, t } from "../../core/theme";
import type { Tone } from "./desk";

/* ══════════════════════════════════════════════════════════════════
   THE WEB'S KIT, AS THE FRONT DESK USES IT ON A PHONE — after
   src/components/ui: PageHeader, StatusPill, Misc (Segmented), Button,
   Input (Field, Input, NativeSelect), Misc (Switch, Checkbox). Sizes are
   the web's own under a thumb: its `pointer-coarse:` 44px.
   ══════════════════════════════════════════════════════════════════ */

/** The web's body text is Inter 400; the core loads 500, 600 and 700 only (report). */
export const body: TextStyle = { ...face[500] };
export const orange600 = c.orange600;

const PILL: Record<Tone, { bg: string; fg: string; dot: string }> = {
  neutral: { bg: c.grey100, fg: c.grey600, dot: "#9aa2a9" },
  info: { bg: c.info50, fg: c.info, dot: c.info },
  success: { bg: c.grey100, fg: c.success600, dot: "#1f6f5c" },
  warning: { bg: c.yellow50, fg: c.yellow800, dot: "#ffb600" },
  danger: { bg: c.red50, fg: c.red700, dot: "#e0301e" },
  accent: { bg: c.orange50, fg: c.orange700, dot: c.orange },
};

/** StatusPill.tsx: a soft tint, a readable ink, a small dot, no ring. */
export function Pill({ tone, children, dot = true }: { tone: Tone; children: string; dot?: boolean }) {
  const p = PILL[tone];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: p.bg }}>
      {dot ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.dot }} /> : null}
      <Text style={[t.caption, { color: p.fg, lineHeight: 17 }]}>{children}</Text>
    </View>
  );
}

/** PageHeader.tsx: the title, the pill beside it, the description under it. */
export function PageHead({ title, pill, description, children }: { title: string; pill?: ReactNode; description?: string; children?: ReactNode }) {
  return (
    <View style={{ gap: 16, marginBottom: 8 }}>
      <View style={{ gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <Text style={t.title} accessibilityRole="header">{title}</Text>
          {pill}
        </View>
        {description ? <Text style={[t.label, body, { color: c.grey500, lineHeight: 21 }]}>{description}</Text> : null}
      </View>
      {children}
    </View>
  );
}

/** Misc.tsx Segmented: a 3px track, 7px corners, 44px under a thumb. */
export function Segmented<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string; count?: number }>;
}) {
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 2, padding: 3, backgroundColor: c.grey100, borderRadius: 10 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value} onPress={() => onChange(o.value)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={[{ flex: 1, minHeight: 44, borderRadius: 7, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 12 },
              on ? { backgroundColor: c.white, shadowColor: c.ink900, shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : null]}
          >
            <Text numberOfLines={1} style={[t.label, { color: on ? c.ink900 : c.grey600 }]}>{o.label}</Text>
            {o.count === undefined ? null : <Text style={[t.caption, t.tab]}>{o.count}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Button.tsx: one capsule shape; the disabled label stays readable. NOT
    `disabled` when it has a reason: the tap is when a person asks why. */
export function Button({ label, onPress, kind = "secondary", Icon, Trail, busy, reason, onRefused, size = "md", style }: {
  label: string; onPress: () => void; kind?: "primary" | "secondary" | "danger" | "ghost"; Icon?: LucideIcon; Trail?: LucideIcon;
  busy?: boolean; reason?: string | null; onRefused?: (reason: string) => void; size?: "sm" | "md" | "lg"; style?: StyleProp<ViewStyle>;
}) {
  const off = busy === true || reason != null;
  const fill = off && kind !== "secondary" && kind !== "ghost" ? c.grey300
    : kind === "primary" ? c.orange600 : kind === "danger" ? "#e0301e" : kind === "secondary" ? (off ? c.grey50 : c.white) : "transparent";
  const ink = kind === "primary" || kind === "danger" ? (off ? c.grey600 : c.white) : off ? c.grey500 : kind === "ghost" ? c.grey600 : c.ink900;
  return (
    <Pressable
      onPress={off ? () => { if (reason) onRefused?.(reason); } : onPress} accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled: off, busy: busy === true }} accessibilityHint={reason ?? undefined}
      style={({ pressed }) => [{
        minHeight: size === "lg" ? 48 : 44, paddingHorizontal: size === "sm" ? 12 : 16, borderRadius: 999, flexDirection: "row",
        alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: pressed && !off && kind === "secondary" ? c.grey100 : fill,
        borderWidth: kind === "secondary" ? 1 : 0, borderColor: c.grey300, opacity: pressed && !off ? 0.9 : 1,
      }, style]}
    >
      {busy ? <ActivityIndicator size="small" color={ink} /> : Icon ? <Icon size={16} color={ink} /> : null}
      <Text numberOfLines={1} style={[t.label, { color: ink, fontSize: size === "lg" ? 16 : 14 }]}>{label}</Text>
      {Trail ? <Trail size={16} color={ink} /> : null}
    </Pressable>
  );
}

/** The quiet underlined link beside the marks (Mark VIP, Edit guest). A grey one says why when tapped. */
export function MarkLink({ label, onPress, reason, onRefused }: { label: string; onPress: () => void; reason?: string | null; onRefused?: (reason: string) => void }) {
  return (
    <Pressable
      onPress={() => { if (reason) onRefused?.(reason); else onPress(); }} accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled: reason != null }} accessibilityHint={reason ?? undefined} hitSlop={8} style={{ minHeight: 32, justifyContent: "center", paddingHorizontal: 4 }}
    >
      <Text style={[t.label, { color: reason ? c.grey500 : c.grey600, textDecorationLine: "underline" }]}>{label}</Text>
    </Pressable>
  );
}

/** A plain text link: orange-700, as the web's `link` button. */
export function TextLink({ label, onPress, Icon, a11y }: { label: string; onPress: () => void; Icon?: LucideIcon; a11y?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={a11y ?? label} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Text style={[t.label, { color: c.orange700 }]}>{label}</Text>
      {Icon ? <Icon size={14} color={c.orange700} /> : null}
    </Pressable>
  );
}

/** Input.tsx Field: the label, the box, a hint or an error under it. */
export function Field({ label, required, hint, error, children }: { label: string; required?: boolean; hint?: string | null; error?: string | null; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.label, { color: c.grey700 }]}>
        {label}{required ? <Text style={{ color: "#e0301e" }}> *</Text> : null}
      </Text>
      {children}
      {error ? <Text style={[t.caption, { color: "#e0301e" }]}>{error}</Text>
        : hint ? <Text style={[t.caption, { color: c.grey500 }]}>{hint}</Text> : null}
    </View>
  );
}

const BOX: ViewStyle = { minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, backgroundColor: c.white, paddingHorizontal: 12 };

/** Input.tsx Input: 44px under a thumb, 16px text so a phone does not zoom. */
export function Box({ value, onChange, placeholder, label, keyboard, disabled, upper, max, multiline, tall }: {
  value: string; onChange: (v: string) => void; placeholder?: string; label: string; keyboard?: KeyboardTypeOptions;
  disabled?: boolean; upper?: boolean; max?: number; multiline?: boolean; tall?: boolean;
}) {
  return (
    <TextInput
      value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#9aa2a9" editable={!disabled}
      accessibilityLabel={label} keyboardType={keyboard} autoCapitalize={upper ? "characters" : undefined} maxLength={max} multiline={multiline}
      style={[BOX, { fontSize: 16, color: c.ink900, ...face[500] }, tall ? { minHeight: 48 } : null, multiline ? { minHeight: 76, paddingTop: 10, textAlignVertical: "top" } : null, disabled ? { backgroundColor: c.grey50, color: c.grey500 } : null]}
    />
  );
}

export interface Choice { value: string; label: string; note?: string | undefined; disabled?: boolean | undefined }

/** Input.tsx NativeSelect: the same list, as a sheet from the bottom. */
export function Pick({ value, onChange, options, title, label, placeholder, disabled, tall }: {
  value: string; onChange: (v: string) => void; options: Choice[]; title: string; label?: string; placeholder?: string; disabled?: boolean; tall?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const shown = options.find((o) => o.value === value);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)} disabled={disabled} accessibilityRole="button"
        accessibilityLabel={`${label ?? title}: ${shown?.label ?? placeholder ?? ""}`} accessibilityState={{ disabled: disabled === true }}
        style={[BOX, { flexDirection: "row", alignItems: "center", gap: 8 }, tall ? { minHeight: 48 } : null, disabled ? { backgroundColor: c.grey50 } : null]}
      >
        <Text numberOfLines={1} style={[t.heading, face[500], { flex: 1, color: shown ? c.ink900 : "#9aa2a9" }]}>{shown?.label ?? placeholder ?? ""}</Text>
        <ChevronDown size={16} color={c.grey500} />
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <ScrollView>
          {options.map((o) => (
            <Pressable
              key={o.value} disabled={o.disabled} onPress={() => { setOpen(false); onChange(o.value); }} accessibilityRole="button"
              accessibilityLabel={o.label} accessibilityState={{ selected: o.value === value, disabled: o.disabled === true }}
              style={({ pressed }) => ({ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.grey100, backgroundColor: pressed ? c.grey50 : c.white })}
            >
              <View style={{ flex: 1 }}>
                <Text style={[t.label, { color: o.disabled ? c.grey500 : c.ink900 }]}>{o.label}</Text>
                {o.note ? <Text style={t.caption}>{o.note}</Text> : null}
              </View>
              {o.value === value ? <Check size={18} color={c.orange} /> : null}
            </Pressable>
          ))}
        </ScrollView>
      </Sheet>
    </>
  );
}

/** A sheet from the bottom: the phone's dialog. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(3,23,40,0.4)" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <View style={{ backgroundColor: c.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: space.side, paddingTop: 16, paddingBottom: 24, gap: 6, maxHeight: "80%" }}>
          <Text style={[t.heading, { marginBottom: 4 }]} accessibilityRole="header">{title}</Text>
          {children}
        </View>
      </View>
    </Modal>
  );
}

/** The web's dialog on a phone: the whole screen, its head and a pinned foot. */
export function FormSheet({ title, description, foot, onClose, said, onSaid, children }: {
  title: string; description?: string; foot: ReactNode; onClose: () => void; said: Said | null; onSaid: (s: Said | null) => void; children: ReactNode;
}) {
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.white }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: space.side, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[t.heading, { fontSize: 16 }]} accessibilityRole="header">{title}</Text>
            {description ? <Text style={[t.label, body, { color: c.grey500 }]}>{description}</Text> : null}
          </View>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
            <X size={20} color={c.grey600} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: space.side, gap: 16 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        <View style={{ padding: space.side, borderTopWidth: 1, borderTopColor: c.grey200 }}>{foot}</View>
        <Toast said={said} onClose={() => onSaid(null)} />
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Misc.tsx Switch: its label and what it means, the switch on the right. */
export function Toggle({ value, onChange, label, description }: { value: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[t.label, { color: c.ink900 }]}>{label}</Text>
        {description ? <Text style={[t.caption, { color: c.grey500 }]}>{description}</Text> : null}
      </View>
      <Switch
        value={value} onValueChange={onChange} accessibilityLabel={label}
        trackColor={{ true: "#1f6f5c", false: c.grey300 }} thumbColor={c.white}
      />
    </View>
  );
}

/** Misc.tsx Checkbox. A greyed one says why through its own label (the web's),
    or, refused by the API, through its `reason` when tapped (AGENTS rule 1). */
export function Tick({ value, onChange, label, disabled, reason, onRefused }: {
  value: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; reason?: string | null; onRefused?: (reason: string) => void;
}) {
  const refused = reason != null;
  if (refused) disabled = true;
  return (
    <Pressable
      onPress={() => (refused ? onRefused?.(reason) : onChange(!value))} disabled={disabled && !refused} accessibilityRole="checkbox" accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled: disabled === true }} accessibilityHint={reason ?? undefined}
      style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10 }}
    >
      <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 1, alignItems: "center", justifyContent: "center", borderColor: value ? c.orange : c.grey300, backgroundColor: value ? c.orange : disabled ? c.grey100 : c.white }}>
        {value ? <Check size={14} color={c.white} /> : null}
      </View>
      <Text style={[t.label, { flex: 1, color: disabled ? c.grey500 : c.ink900 }]}>{label}</Text>
    </Pressable>
  );
}

/** BookingPage.tsx Fold: closed until the clerk needs it. */
export function Fold({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ backgroundColor: c.white, borderWidth: 1, borderColor: c.grey200, borderRadius: 12 }}>
      <Pressable
        onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: open }}
        style={{ minHeight: 48, flexDirection: "row", alignItems: "center", paddingHorizontal: space.cardX }}
      >
        <Text style={[t.heading, { flex: 1 }]}>{title}</Text>
        <ChevronDown size={16} color={c.grey500} style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }} />
      </Pressable>
      {open ? <View style={{ paddingHorizontal: space.cardX, paddingBottom: 16, gap: 16 }}>{children}</View> : null}
    </View>
  );
}

/** The reason on a control the phone cannot do yet (the rules' words). */
export const WEBSITE = "On the website for now";

export type Said = { title: string; body?: string; tone: "ok" | "held" | "bad" };
/* A word for the screen a write returns to: the web's toast outlives its dialog. */
let note: Said | null = null;
export const leaveNote = (s: Said) => { note = s; };
export const takeNote = () => { const n = note; note = null; return n; };
const SAID = {
  ok: { bg: c.ink900, ring: c.ink900, fg: c.white },
  held: { bg: c.yellow50, ring: c.yellow100, fg: c.yellow800 },
  bad: { bg: c.red50, ring: c.red100, fg: c.red700 },
};
/** The web's toast, at the foot of the screen; a tap puts it away. */
export function Toast({ said, onClose }: { said: Said | null; onClose: () => void }) {
  if (!said) return null;
  const s = SAID[said.tone];
  return (
    <Pressable
      onPress={onClose} accessibilityLiveRegion="polite" accessibilityRole={said.tone === "bad" ? "alert" : "text"}
      style={{ position: "absolute", left: space.side, right: space.side, bottom: 16, borderRadius: 12, borderWidth: 1, paddingHorizontal: space.cardX, paddingVertical: 12, gap: 2, backgroundColor: s.bg, borderColor: s.ring }}
    >
      <Text style={[t.label, face[600], { color: s.fg }]}>{said.title}</Text>
      {said.body ? <Text style={[t.caption, { color: s.fg }]}>{said.body}</Text> : null}
    </Pressable>
  );
}

/** States.tsx EmptyState: the words, centred, with a way on. */
export function Empty({ title, line, Icon, action }: { title: string; line: string; Icon: LucideIcon; action?: ReactNode }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 24, gap: 6 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.grey100, alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
        <Icon size={20} color="#9aa2a9" />
      </View>
      <Text style={[t.heading, { textAlign: "center" }]}>{title}</Text>
      <Text style={[t.label, body, { color: c.grey500, textAlign: "center", lineHeight: 21 }]}>{line}</Text>
      {action ? <View style={{ marginTop: 14 }}>{action}</View> : null}
    </View>
  );
}
