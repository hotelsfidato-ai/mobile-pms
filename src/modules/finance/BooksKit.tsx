import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { c, face, space, t } from "../../core/theme";
import { body } from "../front-desk/kit";
import { shownLine } from "./books";

/* ══════════════════════════════════════════════════════════════════
   THE FEW PIECES FOLIOS, INVOICES AND PAYMENTS SHARE that the kits they
   import (front desk, guests, reports, finance: imported, never edited)
   do not carry, after the web kit (src/components/ui Button, Dialog) and
   docs/NATIVE.md: a sheet that keeps clear of the home indicator and lifts
   over the keyboard, a button with each phone's own press, "Show more".
   ══════════════════════════════════════════════════════════════════ */

/** The web's Button at 44 px: Android's ripple, iPhone's pressed shade. `why`:
    refused for this person - grey, and the tap says why (AGENTS rule 1). */
export function Act({ label, onPress, kind = "secondary", Icon, why, onRefused, busy, off, a11y }: {
  label: string; onPress: () => void; kind?: "primary" | "secondary"; Icon?: LucideIcon;
  why?: string | null; onRefused?: (why: string) => void; busy?: boolean; off?: boolean; a11y?: string;
}) {
  const grey = off || why != null;
  const solid = kind === "primary";
  const fg = grey ? (solid ? c.grey600 : c.grey500) : solid ? c.white : c.ink900;
  return (
    <Pressable
      onPress={() => (off || busy ? undefined : why != null ? onRefused?.(why) : onPress())}
      disabled={off}
      accessibilityRole="button" accessibilityLabel={a11y ?? label} accessibilityHint={why ?? undefined}
      accessibilityState={{ disabled: grey, busy: Boolean(busy) }}
      android_ripple={{ color: solid ? c.orange700 : c.grey200 }}
      style={({ pressed }) => ({
        minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, overflow: "hidden",
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, alignSelf: "flex-start",
        borderColor: solid ? "transparent" : c.grey300,
        backgroundColor: solid ? (grey ? c.grey300 : pressed && Platform.OS === "ios" ? c.orange700 : c.orange600)
          : grey ? c.grey50 : pressed && Platform.OS === "ios" ? c.grey100 : c.white,
        opacity: busy ? 0.6 : 1,
      })}
    >
      {busy ? <ActivityIndicator size="small" color={fg} /> : Icon ? <Icon size={16} color={fg} /> : null}
      <Text style={[t.label, { color: fg, ...face[600] }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

/** The web's Dialog as a bottom sheet: the back gesture closes it, it pads
    itself clear of the home indicator and lifts over the keyboard. */
export function BookSheet({ visible, onClose, title, description, children, footer }: {
  visible: boolean; onClose: () => void; title: string; description?: string; children?: ReactNode; footer: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType={Platform.OS === "web" ? "none" : "slide"} onRequestClose={onClose}>
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
              {footer}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** "50 of 765 shown" and the way to the next page (books.ts PAGE). */
export function More({ shown, of, onMore }: { shown: number; of: number; onMore: () => void }) {
  if (of === 0) return null;
  return (
    <View style={{ gap: 8, alignItems: "flex-start" }}>
      <Text style={[t.caption, t.tab]}>{shownLine(Math.min(shown, of), of)}</Text>
      {shown < of ? <Act label="Show more" onPress={onMore} /> : null}
    </View>
  );
}

/** A short line in a soft card: the web's notes under a heading (an IconChip and its words). */
export function Note({ icon, title, children, tone = "plain" }: { icon: ReactNode; title: string; children?: ReactNode; tone?: "plain" | "info" }) {
  return (
    <View style={{
      flexDirection: "row", gap: 12, alignItems: "flex-start", borderRadius: 8, borderWidth: 1, paddingHorizontal: space.cardX, paddingVertical: space.cardY,
      borderColor: tone === "info" ? c.info100 : c.grey200, backgroundColor: tone === "info" ? c.info50 : c.white,
    }}>
      {icon}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={[t.label, { color: c.ink900, lineHeight: 21 }]}>{title}</Text>
        {typeof children === "string" ? <Text style={[t.label, body, { color: c.grey600, lineHeight: 21 }]}>{children}</Text> : children}
      </View>
    </View>
  );
}
