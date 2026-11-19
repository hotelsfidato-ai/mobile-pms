import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { c, face, space, t } from "../../core/theme";
import { body } from "../front-desk/kit";
import { IconChip, type ChipTone } from "../reports/kit";

/* ══════════════════════════════════════════════════════════════════
   THE FEW PIECES GROUPS AND THE WAITLIST SHARE, after the web kit
   (src/components/ui: Card with its CardHeader, FigureTile, Dialog), drawn
   to docs/NATIVE.md (19 Nov): a sheet keeps clear of the home indicator
   and lifts over the keyboard, Android's back closes it, a press ripples
   on Android and shades on iPhone.
   ══════════════════════════════════════════════════════════════════ */

/** The press feedback of NATIVE.md: a ripple on Android, the pressed shade on iPhone, never both. */
export const ripple = Platform.OS === "android" ? { android_ripple: { color: c.grey200 } } : {};
export const shade = (pressed: boolean) => (pressed && Platform.OS === "ios" ? c.grey50 : c.white);

/** Card.tsx with CardHeader (title, description, a grey-200 line under it). */
export function Panel({ title, description, children, action }: { title: string; description?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, overflow: "hidden" }}>
      <View style={{ paddingHorizontal: space.cardX, paddingVertical: space.cardY, borderBottomWidth: 1, borderBottomColor: c.grey200, gap: 2 }}>
        <Text style={t.heading} accessibilityRole="header">{title}</Text>
        {description ? <Text style={[t.label, body, { color: c.grey500, lineHeight: 21 }]}>{description}</Text> : null}
        {action}
      </View>
      {children}
    </View>
  );
}

/** Misc.tsx FigureTile: its chip and label, the figure, a note (or a control) under it. */
export function Tile({ icon, tone, label, value, missing, note }: {
  icon: LucideIcon; tone: ChipTone; label: string; value: string; missing?: boolean; note: ReactNode;
}) {
  return (
    <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <IconChip icon={icon} tone={tone} />
        <Text style={[t.label, { color: c.grey600, flexShrink: 1, lineHeight: 20 }]}>{label}</Text>
      </View>
      <Text style={[t.figure, { lineHeight: 30, color: missing ? c.grey500 : c.ink900 }]} adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1}>{value}</Text>
      {typeof note === "string" ? <Text style={[t.caption, { lineHeight: 17, color: c.grey500 }]}>{note}</Text> : note}
    </View>
  );
}

/** The web's Dialog at phone width: a sheet from the bottom, clear of the home
    indicator, lifted over the keyboard; Android's back and a tap above close it. */
export function Sheet({ title, description, onClose, children, foot }: {
  title: string; description?: string; onClose: () => void; children: ReactNode; foot: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent statusBarTranslucent animationType={Platform.OS === "web" ? "none" : "slide"} onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={{ flex: 1, backgroundColor: "rgba(3,23,40,0.4)" }}>
          <Pressable style={{ flex: 1, minHeight: 48 }} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
          <View style={{ backgroundColor: c.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "88%" }}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: space.side, paddingTop: 18, paddingBottom: 12, gap: 14 }}>
              <View style={{ gap: 2 }}>
                <Text style={t.figure} accessibilityRole="header">{title}</Text>
                {description ? <Text style={[t.label, body, { lineHeight: 21 }]}>{description}</Text> : null}
              </View>
              {children}
            </ScrollView>
            <View style={{ flexDirection: "row", justifyContent: "flex-end", flexWrap: "wrap", gap: 8, paddingHorizontal: space.side, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 16) }}>
              {foot}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** A refusal or a warning under a form, in the server's words. */
export function Said({ text, tone = "bad" }: { text: string | null; tone?: "bad" | "warn" }) {
  if (!text) return null;
  return (
    <Text accessibilityRole="alert" style={[t.label, body, { color: tone === "bad" ? c.red700 : c.yellow800, lineHeight: 21 }]}>{text}</Text>
  );
}

/** A label over its value, as GroupPanel's table cells are read on a card. */
export function Cell({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <View style={{ gap: 2, minWidth: 72 }}>
      <Text style={[t.caption, { color: c.grey500 }]}>{label}</Text>
      <Text style={[t.label, t.tab, { color: muted ? c.grey500 : c.ink900, ...face[strong ? 600 : 500] }]}>{value}</Text>
    </View>
  );
}
