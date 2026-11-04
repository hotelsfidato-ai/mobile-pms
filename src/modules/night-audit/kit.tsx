import { AlertCircle, Check, CloudOff, Inbox, RotateCw, X, type LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions,
  type StyleProp, type ViewStyle,
} from "react-native";
import { isOnline } from "../../core/offline";
import { c, face, t } from "../../core/theme";

/* ══════════════════════════════════════════════════════════════════
   THE WEB KIT'S PIECES THE NIGHT AUDIT USES, from src/components/ui
   (StatusPill, Misc IconChip, Button, Overlays Dialog, Checkbox, Input,
   States), with the core's theme tokens (theme.css's values). The
   module's own: another module's kit is not shared (the lanes).
   ══════════════════════════════════════════════════════════════════ */

/** The web's text-sm: 14 on 21. */
export const body = { ...t.label, lineHeight: 21 };
/** The web's text-2xs: 12 on 17. */
export const small = { ...t.caption, lineHeight: 17 };

/* ── StatusPill ── */
export type Tone = "neutral" | "info" | "success" | "warning";
const PILL: Record<Tone, { bg: string; fg: string; dot: string }> = {
  neutral: { bg: c.grey100, fg: c.grey600, dot: c.grey400 },
  info: { bg: c.info50, fg: c.info, dot: c.info },
  success: { bg: c.success50, fg: c.success600, dot: c.success },
  warning: { bg: c.yellow50, fg: c.yellow800, dot: c.yellow },
};
export function Pill({ tone = "neutral", children }: { tone?: Tone; children: string }) {
  const p = PILL[tone];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: p.bg }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.dot }} />
      <Text style={{ fontSize: 12, lineHeight: 17, color: p.fg, ...face[500] }}>{children}</Text>
    </View>
  );
}

/* ── IconChip, 28: a -50 wash, a -100 ring, the ink icon (Misc.tsx CHIP_TONES) ── */
const CHIP = {
  neutral: { bg: c.grey100, ring: c.grey100, fg: c.grey600 },
  yellow: { bg: c.yellow50, ring: c.yellow100, fg: c.yellow800 },
  green: { bg: c.success50, ring: c.success100, fg: c.success },
};
export function IconChip({ Icon, tone = "neutral" }: { Icon: LucideIcon; tone?: keyof typeof CHIP }) {
  const x = CHIP[tone];
  return (
    <View style={{ width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: x.bg, borderWidth: 1, borderColor: x.ring }}>
      <Icon size={16} color={x.fg} />
    </View>
  );
}

/* ── Button ── */
export function Btn({ label, a11y, variant = "secondary", icon: Icon, onPress, disabled, grow, style }: {
  label: string; a11y?: string; variant?: "primary" | "secondary"; icon?: LucideIcon;
  onPress: () => void; disabled?: boolean; grow?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const fg = disabled ? (variant === "primary" ? c.grey600 : c.grey500) : variant === "primary" ? c.white : c.ink900;
  return (
    <Pressable
      onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={a11y ?? label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [{
        minHeight: 44, paddingHorizontal: 14, borderRadius: 999, flexDirection: "row", gap: 8,
        alignItems: "center", justifyContent: "center", ...(grow ? { flex: 1 } : null),
        backgroundColor: variant === "primary"
          ? (disabled ? c.grey300 : pressed ? c.orange700 : c.orange600)
          : (disabled ? c.grey50 : pressed ? c.grey100 : c.white),
        borderWidth: variant === "secondary" ? 1 : 0, borderColor: c.grey300,
      }, style]}
    >
      {Icon ? <Icon size={16} color={fg} /> : null}
      <Text style={[t.label, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

/* ── Dialog (Overlays.tsx): centred, 16 from each side, a hairline under the head ── */
export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const { height } = useWindowDimensions();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, backgroundColor: "rgba(3,23,40,0.25)", justifyContent: "center", paddingHorizontal: 16 }}
      >
        <Pressable style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }} onPress={onClose} accessibilityLabel="Close" />
        <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, maxHeight: height - 64 }}>
          <View style={{ flexDirection: "row", gap: 16, alignItems: "center", paddingLeft: 20, paddingRight: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
            <Text style={[t.heading, { flex: 1 }]} accessibilityRole="header">{title}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
              <X size={16} color={c.grey500} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, gap: 16 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ── Checkbox: the box and its words, one 44-tall target ── */
export function Tick({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable
      onPress={() => onChange(!on)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label}
      style={{ minHeight: 44, flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 4 }}
    >
      <View style={{
        width: 20, height: 20, borderRadius: 5, marginTop: 1, alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: on ? c.orange600 : c.grey300, backgroundColor: on ? c.orange600 : c.white,
      }}>
        {on ? <Check size={14} color={c.white} /> : null}
      </View>
      <Text style={[body, { flex: 1, color: c.ink900 }]}>{label}</Text>
    </Pressable>
  );
}

/* ── Field and Textarea ── */
export function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.label, { color: c.grey700 }]}>
        {label}{required ? <Text style={{ color: c.red }}>{" *"}</Text> : null}
      </Text>
      {children}
    </View>
  );
}
export function Area({ label, value, onChangeText, maxLength }: { label: string; value: string; onChangeText: (v: string) => void; maxLength: number }) {
  return (
    <TextInput
      value={value} onChangeText={onChangeText} maxLength={maxLength} multiline accessibilityLabel={label}
      placeholderTextColor={c.grey400}
      style={{
        minHeight: 70, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: c.grey300,
        backgroundColor: c.white, fontSize: 16, color: c.ink900, textAlignVertical: "top", ...face[500],
      }}
    />
  );
}

/* ── The states (States.tsx) ── */
export function Empty({ title, description }: { title: string; description: string }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.grey100, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Inbox size={20} color={c.grey400} />
      </View>
      <Text style={[t.heading, { textAlign: "center" }]}>{title}</Text>
      <Text style={[t.label, { color: c.grey500, marginTop: 6, textAlign: "center", lineHeight: 23 }]}>{description}</Text>
    </View>
  );
}

/** A read that failed: the web's ErrorState, or, with no line, that it is the line. */
export function Failed({ title, description, error, onRetry }: { title: string; description?: string; error: string; onRetry: () => void }) {
  const off = !isOnline();
  return (
    <View accessibilityRole="alert" style={{ alignItems: "center", paddingVertical: 48, paddingHorizontal: 24 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: off ? c.yellow100 : c.red50, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        {off ? <CloudOff size={20} color={c.yellow800} /> : <AlertCircle size={20} color={c.red} />}
      </View>
      <Text style={[t.heading, { textAlign: "center" }]}>{off ? "No connection" : title}</Text>
      <Text style={[t.label, { color: c.grey500, marginTop: 6, textAlign: "center", lineHeight: 22 }]}>
        {off ? "This has not been read on this phone yet. It shows once the line is back." : description ?? error}
      </Text>
      {!off && description ? <Text style={[t.caption, { marginTop: 6, textAlign: "center" }]}>{error}</Text> : null}
      <View style={{ marginTop: 20 }}><Btn label="Try again" icon={RotateCw} onPress={onRetry} /></View>
    </View>
  );
}

/** A read again that failed, over what was last read. */
export function Stale({ error }: { error: string | undefined }) {
  if (!error) return null;
  const off = !isOnline();
  return (
    <Text style={[t.caption, { color: off ? c.yellow800 : c.red700 }]} accessibilityRole="alert">
      {off ? "No connection. Showing what was last read; pull down to read again." : `Could not read this again: ${error} Showing what was last read.`}
    </Text>
  );
}
