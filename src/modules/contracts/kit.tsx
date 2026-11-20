import { Check, X } from "lucide-react-native";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, type KeyboardTypeOptions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { c, face, space, t } from "../../core/theme";
import { body, InDialog, type Said } from "../guest-services/kit";

/* ══════════════════════════════════════════════════════════════════
   THE FORMS' PIECES (mobile/m13-sales, Contracts): the web's Dialog on a
   phone as a whole-screen sheet that keeps clear of the notch and the home
   indicator and lifts over the keyboard (docs/NATIVE.md), its fields with
   the right keyboard each, and a choice list drawn in place (no second
   sheet over the first). Ported from src/components/ui (Overlays, Input,
   Field) with the core's tokens.
   ══════════════════════════════════════════════════════════════════ */

export function FormSheet({ title, description, said, foot, onClose, children }: {
  title: string; description?: string; said: Said | null; foot: ReactNode; onClose: () => void; children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.white }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: space.side, paddingTop: insets.top + 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={t.heading} accessibilityRole="header">{title}</Text>
            {description ? <Text style={[body, { color: c.grey500 }]}>{description}</Text> : null}
          </View>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
            <X size={20} color={c.grey600} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: space.side, gap: 16 }} keyboardShouldPersistTaps="handled">
          {children}
          <InDialog said={said} />
        </ScrollView>
        <View style={{ paddingHorizontal: space.side, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16), borderTopWidth: 1, borderTopColor: c.grey200, gap: 8 }}>
          {foot}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Field.tsx: the label over the box, a hint under it. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6, flex: 1, minWidth: 0 }}>
      <Text style={[t.label, { color: c.grey700 }]}>{label}</Text>
      {children}
      {hint ? <Text style={[t.caption, { color: c.grey500 }]}>{hint}</Text> : null}
    </View>
  );
}

/** Input.tsx Input: 44 under a thumb, 16 px type so a phone does not zoom; the keyboard the field needs. */
export function Box({ label, value, onChange, keyboard, upper, max, rows, placeholder, disabled, mono }: {
  label: string; value: string; onChange: (v: string) => void; keyboard?: KeyboardTypeOptions; upper?: boolean; max?: number;
  rows?: number; placeholder?: string; disabled?: boolean; mono?: boolean;
}) {
  return (
    <TextInput
      value={value} onChangeText={onChange} accessibilityLabel={label} placeholder={placeholder} placeholderTextColor={c.grey400}
      keyboardType={keyboard} autoCapitalize={upper ? "characters" : keyboard === "email-address" ? "none" : undefined}
      autoCorrect={keyboard === undefined || keyboard === "default"} maxLength={max} editable={!disabled}
      multiline={Boolean(rows)} textAlignVertical={rows ? "top" : "center"}
      style={{
        minHeight: rows ? 18 + rows * 26 : 44, paddingHorizontal: 12, paddingVertical: rows ? 8 : 0, borderRadius: 10, borderWidth: 1,
        borderColor: c.grey300, backgroundColor: disabled ? c.grey50 : c.white, fontSize: 16, color: disabled ? c.grey500 : c.ink900,
        ...face[500], ...(mono ? t.tab : null),
      }}
    />
  );
}

/** A NativeSelect drawn as its choices, one a row, the chosen one ticked (no sheet over the sheet). */
export function Choices<T extends string>({ label, value, options, onChange, disabled }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; disabled?: boolean;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ borderRadius: 10, borderWidth: 1, borderColor: c.grey300, overflow: "hidden" }}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value} onPress={() => onChange(o.value)} disabled={disabled} accessibilityRole="radio"
            accessibilityState={{ selected: on, disabled: Boolean(disabled) }} android_ripple={{ color: c.grey200 }}
            style={({ pressed }) => ({
              minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12,
              borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.grey100,
              backgroundColor: disabled ? c.grey50 : pressed && Platform.OS === "ios" ? c.grey50 : c.white,
            })}
          >
            <Text style={[t.label, { flex: 1, color: disabled ? c.grey500 : c.ink900 }]}>{o.label}</Text>
            {on ? <Check size={18} color={disabled ? c.grey400 : c.orange} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** The form's own refusal, red under the fields (the web's `wrong`). */
export const Wrong = ({ words }: { words: string | null }) =>
  words ? <Text style={[body, { color: c.red700 }]} accessibilityLiveRegion="polite">{words}</Text> : null;
