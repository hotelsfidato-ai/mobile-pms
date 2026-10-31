import type { LucideIcon } from "lucide-react-native";
import { Square, SquareCheck } from "lucide-react-native";
import type { ReactNode } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View,
  type KeyboardTypeOptions,
} from "react-native";
import { c, face, space, t } from "../../core/theme";
import { s, useRead } from "../../core/ui";
import type { Tone } from "./bill";
import { readReasons } from "./data";

/* The few pieces the bill's sheets share, after the web kit
   (src/components/ui: Button, StatusPill, Field, Input, Dialog). */

/** Tokens the core's theme does not carry (src/styles/theme.css). */
export const rose = "#b84659"; // brand-rose-700: the reversal's words, 5.17:1
export const success = "#1f6f5c";
export const success50 = "#eaf4f1";

const PILL: Record<Tone, { bg: string; fg: string; dot: string }> = {
  neutral: { bg: c.grey100, fg: c.grey600, dot: "#9aa2a9" },
  info: { bg: c.info50, fg: c.info, dot: c.info },
  success: { bg: success50, fg: c.success600, dot: success },
  danger: { bg: c.red50, fg: c.red700, dot: "#e0301e" },
};

/** The web's StatusPill: a soft tint, a dot, the small words. */
export function Pill({ tone, label }: { tone: Tone; label: string }) {
  const p = PILL[tone];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: p.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.dot }} />
      <Text style={[t.caption, { color: p.fg }]}>{label}</Text>
    </View>
  );
}

/** A capsule, 44px or more. `why`: refused for this person or this bill -
    grey, but the tap still lands and says why (the web's D17-8, Rooms.tsx). */
export function Btn({ label, onPress, kind = "secondary", Icon, off, why, onRefused, busy, a11y, wide }: {
  label: string; onPress: () => void; kind?: "primary" | "secondary" | "ghost" | "danger"; Icon?: LucideIcon; off?: boolean;
  why?: string | null; onRefused?: (why: string) => void; busy?: boolean; a11y?: string; wide?: boolean;
}) {
  const grey = off || why != null;
  const solid = kind === "primary" || kind === "danger";
  const fg = grey ? (solid ? c.grey600 : c.grey500) : solid ? c.white : c.ink900;
  return (
    <Pressable
      onPress={() => (off || busy ? undefined : why != null ? onRefused?.(why) : onPress())}
      disabled={off}
      accessibilityRole="button" accessibilityLabel={a11y ?? label}
      accessibilityState={{ disabled: grey, busy: Boolean(busy) }} accessibilityHint={why ?? undefined}
      style={({ pressed }) => [
        s.capsule, { flexDirection: "row", gap: 6, paddingHorizontal: 14 }, wide && { alignSelf: "stretch" },
        solid
          ? { backgroundColor: grey ? c.grey300 : kind === "danger" ? (pressed ? "#a82115" : c.red700) : pressed ? c.orange700 : c.orange600, borderColor: "transparent" }
          : kind === "ghost" ? { borderColor: "transparent", backgroundColor: pressed ? c.grey100 : "transparent" }
          : grey ? { backgroundColor: c.grey50 } : pressed ? { backgroundColor: c.grey100 } : null,
        { opacity: busy ? 0.6 : 1 },
      ]}
    >
      {busy ? <ActivityIndicator size="small" color={fg} /> : Icon ? <Icon size={16} color={fg} /> : null}
      <Text style={[t.label, { color: fg, ...face[600] }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

/** A line's icon button: 44px to the touch, its label for a screen reader. */
export function IconBtn({ Icon, label, onPress, why, onRefused }: {
  Icon: LucideIcon; label: string; onPress: () => void; why?: string | null; onRefused?: (why: string) => void;
}) {
  return (
    <Pressable
      onPress={() => (why != null ? onRefused?.(why) : onPress())}
      accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled: why != null }} accessibilityHint={why ?? undefined}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? c.grey100 : "transparent" })}
    >
      <Icon size={16} color={why != null ? c.grey300 : c.grey500} />
    </Pressable>
  );
}

/** A sheet from the bottom: the web's Dialog at phone width. */
export function Sheet({ visible, onClose, title, description, children, footer }: {
  visible: boolean; onClose: () => void; title: string; description?: string; children?: ReactNode; footer: ReactNode;
}) {
  return (
    /* No slide in the web preview: a hidden tab never ends a CSS animation (MEMORY 4). */
    <Modal visible={visible} transparent animationType={Platform.OS === "web" ? "none" : "slide"} onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flex: 1, backgroundColor: "rgba(3,23,40,0.4)" }}>
          <Pressable style={{ flex: 1, minHeight: 48 }} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
          <View style={{ backgroundColor: c.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "88%" }}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: space.side, paddingTop: 18, paddingBottom: 12, gap: 14 }}>
              <View style={{ gap: 2 }}>
                <Text style={t.figure} accessibilityRole="header">{title}</Text>
                {description ? <Text style={[t.label, t.tab]}>{description}</Text> : null}
              </View>
              {children}
            </ScrollView>
            <View style={{ flexDirection: "row", justifyContent: "flex-end", flexWrap: "wrap", gap: 8, paddingHorizontal: space.side, paddingTop: 8, paddingBottom: 20 }}>
              {footer}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** The web's Field: the label, the control, its hint. */
export function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.label, { color: c.ink900, ...face[500] }]}>{label}{required ? <Text style={{ color: c.red700 }}> *</Text> : null}</Text>
      {children}
      {hint ? <Text style={[t.caption, { lineHeight: 16 }]}>{hint}</Text> : null}
    </View>
  );
}

/** The web's Input; `numeric` is right for a keyboard of figures. */
export function Input({ value, onChange, label, keyboard, placeholder, off, multiline, maxLength, caps, tabular }: {
  value: string; onChange: (v: string) => void; label: string; keyboard?: KeyboardTypeOptions; placeholder?: string; off?: boolean;
  multiline?: boolean; maxLength?: number; caps?: "characters"; tabular?: boolean;
}) {
  return (
    <TextInput
      value={value} onChangeText={onChange} accessibilityLabel={label} editable={!off} multiline={multiline} maxLength={maxLength}
      {...(keyboard ? { keyboardType: keyboard } : {})} {...(placeholder ? { placeholder } : {})} placeholderTextColor={c.grey500}
      {...(caps ? { autoCapitalize: caps } : {})} autoCorrect={false}
      style={[
        t.label, tabular && t.tab,
        { color: off ? c.grey500 : c.ink900, minHeight: multiline ? 64 : 44, borderWidth: 1, borderColor: c.grey300, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: off ? c.grey50 : c.white, ...(multiline ? { textAlignVertical: "top" as const } : {}) },
      ]}
    />
  );
}

/** A choice from a short list: the web's NativeSelect, as capsules a thumb can reach. */
export function Choice<T extends string>({ options, value, onPick, label }: {
  options: Array<{ value: T; label: string }>; value: T; onPick: (v: T) => void; label: string;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value} onPress={() => onPick(o.value)} accessibilityRole="radio" accessibilityLabel={o.label} accessibilityState={{ selected: on }}
            style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: on ? c.orange : c.grey200, backgroundColor: on ? c.orange50 : c.white }}
          >
            <Text style={[t.label, t.tab, { color: c.ink900 }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A tick box and its words, 44px to the touch. */
export function Tick({ on, onChange, label, off }: { on: boolean; onChange: (v: boolean) => void; label: string; off?: boolean }) {
  const Mark = on ? SquareCheck : Square;
  return (
    <Pressable
      onPress={() => onChange(!on)} disabled={off} accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked: on, disabled: Boolean(off) }}
      style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10 }}
    >
      <Mark size={20} color={off ? c.grey300 : on ? c.orange600 : c.grey500} />
      <Text style={[t.label, { flex: 1, color: c.ink900 }]}>{label}</Text>
    </Pressable>
  );
}

export type Said = { tone: "ok" | "warn" | "refused"; title: string; text?: string };

/** What just happened, on the bill (the web's toast, which a phone would lose). */
export function SaidCard({ said }: { said: Said }) {
  const look = said.tone === "ok" ? { backgroundColor: c.white, borderColor: c.grey200 }
    : said.tone === "warn" ? { backgroundColor: c.yellow50, borderColor: c.yellow100 }
    : { backgroundColor: c.red50, borderColor: c.red100 };
  return (
    <View style={[s.card, look, { gap: 2 }]} accessibilityRole="alert">
      <Text style={[t.heading, said.tone === "refused" && { color: c.red700 }]}>{said.title}</Text>
      {said.text ? <Text style={[t.label, { color: c.grey700, lineHeight: 20 }]}>{said.text}</Text> : null}
    </View>
  );
}

/** A refusal inside a sheet, in the server's words. */
export function Refused({ text }: { text: string | null }) {
  return text ? <Text style={[t.label, { color: c.red700, lineHeight: 20 }]} accessibilityRole="alert">{text}</Text> : null;
}

/** The hotel's ready reasons (D27-260, the web's ReadyReasons): a tap fills the Why. */
export function ReadyReasons({ code, onPick }: { code: string; onPick: (reason: string) => void }) {
  const q = useRead(() => readReasons(code), ["finance", code, "reasons"]);
  if (!q.data?.length) return null;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {q.data.map((r) => (
        <Pressable
          key={r.id} onPress={() => onPick(r.label)} accessibilityRole="button" accessibilityLabel={r.label}
          style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: c.grey200, backgroundColor: c.white }}
        >
          <Text style={[t.label, { color: c.ink900 }]}>{r.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
