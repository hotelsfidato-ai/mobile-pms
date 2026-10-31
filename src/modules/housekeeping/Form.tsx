import { Check, ChevronDown, X, type LucideIcon } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { c, face, space, t } from "../../core/theme";
import { more } from "../reports/kit";

/* ══════════════════════════════════════════════════════════════════
   THE WEB'S FORM PIECES, for Report a repair and Out of service
   (src/components/ui/Overlays.tsx DialogContent, Input.tsx Field and
   NativeSelect, Button.tsx). The web's two dialogs are screens here (their
   routes are the core's), drawn as the same white card on the page.
   ══════════════════════════════════════════════════════════════════ */

/** The dialog as a screen: its head (title, the words under it, the X), then the form. */
export function Sheet({ title, under, onClose, refreshing, onRefresh, children }: {
  title: string; under: string; onClose: () => void; refreshing: boolean; onRefresh: () => void; children: ReactNode;
}) {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={{ backgroundColor: c.grey50 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.orange} colors={[c.orange]} />}
      >
        <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 16, paddingHorizontal: space.side, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={t.heading} accessibilityRole="header">{title}</Text>
              <Text style={[t.label, { color: c.grey500, lineHeight: 21 }]}>{under}</Text>
            </View>
            <Pressable
              onPress={onClose} accessibilityRole="button" accessibilityLabel="Close"
              style={{ width: 44, height: 44, margin: -14, alignItems: "center", justifyContent: "center" }}
            >
              <X size={16} color={c.grey500} />
            </Pressable>
          </View>
          <View style={{ paddingHorizontal: space.side, paddingVertical: 16, gap: 16 }}>{children}</View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** A label, its control, a hint under it. */
export function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.label, { color: c.grey700 }]}>
        {label}{required ? <Text style={{ color: more.redDot }}> *</Text> : null}
      </Text>
      {children}
      {hint ? <Text style={t.caption}>{hint}</Text> : null}
    </View>
  );
}

const FIELD = { minHeight: 48, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, backgroundColor: c.white } as const;

export function Input({ label, multiline, off, ...props }: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; autoFocus?: boolean; multiline?: boolean; off?: boolean;
}) {
  return (
    <TextInput
      {...props}
      accessibilityLabel={label}
      multiline={multiline}
      editable={!off}
      placeholderTextColor={more.grey400}
      style={[FIELD, {
        fontSize: 14, color: off ? more.grey400 : c.ink900, ...face[500], paddingVertical: 10,
        ...(multiline ? { minHeight: 64, textAlignVertical: "top" as const } : null), ...(off ? { backgroundColor: c.grey50 } : null),
      }]}
    />
  );
}

/** The web's native select: on a phone, the same choice as a sheet from the bottom. */
export function Select({ label, value, options, onChange, off }: {
  label: string; value: string; options: ReadonlyArray<{ value: string; label: string }>; onChange?: (value: string) => void; off?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const chosen = options.find((o) => o.value === value)?.label ?? value;
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)} disabled={off} accessibilityRole="button" accessibilityLabel={`${label}: ${chosen}`} accessibilityState={{ disabled: Boolean(off) }}
        style={[FIELD, { flexDirection: "row", alignItems: "center", gap: 8 }, off ? { backgroundColor: c.grey50 } : null]}
      >
        <Text style={[t.label, { flex: 1, color: off ? c.grey500 : c.ink900 }]} numberOfLines={1}>{chosen}</Text>
        <ChevronDown size={16} color={off ? more.grey400 : c.grey500} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(3,23,40,0.4)" }}>
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Close" />
          <View style={{ backgroundColor: c.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: space.side, paddingTop: 16, paddingBottom: 24, gap: 4, maxHeight: "75%" }}>
            <Text style={[t.heading, { marginBottom: 4 }]} accessibilityRole="header">{label}</Text>
            <ScrollView>
              {options.map((o) => (
                <Pressable
                  key={o.value} onPress={() => { setOpen(false); onChange?.(o.value); }}
                  accessibilityRole="button" accessibilityLabel={o.label} accessibilityState={{ selected: o.value === value }}
                  style={({ pressed }) => ({ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: c.grey100, backgroundColor: pressed ? c.grey50 : c.white })}
                >
                  <Text style={[t.label, { flex: 1, color: c.ink900 }]}>{o.label}</Text>
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

/** The web's Button: a capsule, primary, secondary or ghost, with its disabled colours. */
export function Button({ label, icon: Icon, kind = "secondary", tall, disabled, onPress, a11y, hint }: {
  label: string; icon?: LucideIcon; kind?: "primary" | "secondary" | "ghost"; tall?: boolean; disabled?: boolean; onPress: () => void; a11y?: string; hint?: string;
}) {
  const fg = kind === "primary" ? (disabled ? c.grey600 : c.white) : disabled ? c.grey500 : kind === "ghost" ? c.grey600 : c.ink900;
  return (
    <Pressable
      onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={a11y ?? label}
      accessibilityState={{ disabled: Boolean(disabled) }} accessibilityHint={hint}
      style={({ pressed }) => ({
        minHeight: tall ? 48 : 44, paddingHorizontal: 14, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        ...(kind === "primary"
          ? { backgroundColor: disabled ? c.grey300 : pressed ? c.orange700 : c.orange600 }
          : kind === "secondary"
            ? { borderWidth: 1, borderColor: c.grey300, backgroundColor: disabled ? c.grey50 : pressed ? c.grey100 : c.white }
            : { backgroundColor: pressed ? c.grey100 : "transparent" }),
      })}
    >
      {Icon ? <Icon size={16} color={fg} /> : null}
      <Text style={[t.label, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}
