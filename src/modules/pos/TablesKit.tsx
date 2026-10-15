import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Lock, Store, X } from "lucide-react-native";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { api, ApiError } from "../../core/api";
import { c, face, space, t } from "../../core/theme";
import { Capsule } from "../../core/ui";
import { timeOnly } from "./floor";

/* ══════════════════════════════════════════════════════════════════
   THE PIECES TABLES AND THE PAD SHARE — after the web kit
   (src/components/ui: Button, Dialog, toast, ReadProblem) and the POS's
   PosGate. Its words are the web's.
   ══════════════════════════════════════════════════════════════════ */

/* ── Who may use the till here (components/PosGate.tsx) ─────────────
   Only an explicit refusal shuts the door: offline, "go ahead", and the
   screen's own offline handling takes over. */
export function useAccess(code: string) {
  return useQuery({
    queryKey: ["pos", code, "access"],
    staleTime: 60_000,
    queryFn: async (): Promise<{ ok: true } | { ok: false; reason: string }> => {
      try {
        await api(`/api/hotels/${code}/till/access`);
        return { ok: true };
      } catch (e) {
        return e instanceof ApiError && e.status === 403 ? { ok: false, reason: e.message } : { ok: true };
      }
    },
  });
}

/* ── A read that went wrong (components/ui/ReadProblem.tsx) ───────── */

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** refused (the server said no, with its sentence) · unreachable · failed. */
function problem(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 0) return { kind: "unreachable" as const };
    if (error.status >= 400 && error.status < 500) return { kind: "refused" as const, reason: error.message };
    return { kind: "failed" as const, status: error.status as number | null, message: error.message };
  }
  return { kind: "failed" as const, status: null, message: error instanceof Error ? error.message : String(error) };
}

/** In place of a list that has nothing to show because its read failed. */
export function ReadProblem({ error, what, onRetry }: { error: unknown; what: string; onRetry: () => void }) {
  const p = problem(error);
  if (p.kind === "refused") return <Refused title={`${capital(what)} is not available`} reason={p.reason} />;
  return (
    <View style={[box, { gap: 8 }]} accessibilityRole="alert">
      <Text style={[t.heading, { color: c.red700 }]}>{capital(what)} did not load</Text>
      <Text style={[t.label, { color: c.grey700 }]}>
        {p.kind === "unreachable"
          ? "The server could not be reached, and this device has no saved copy to show. Check the connection, then try again."
          : p.status
            ? `The server answered with an error (${p.status}). Try again, and tell the manager if it keeps happening.`
            : `${p.message}. Try again, and tell the manager if it keeps happening.`}
      </Text>
      <View style={{ flexDirection: "row" }}><Capsule label="Try again" onPress={onRetry} /></View>
    </View>
  );
}

/** The server said no: its sentence, as it is. */
export function Refused({ title, reason, store }: { title: string; reason: string; store?: boolean }) {
  const Icon = store ? Store : Lock;
  return (
    <View style={[box, { alignItems: "center", gap: 8, paddingVertical: 28 }]} accessibilityRole="alert">
      <Icon size={24} color={c.grey500} />
      <Text style={[t.heading, { textAlign: "center" }]}>{title}</Text>
      <Text style={[t.label, { textAlign: "center" }]}>{reason}</Text>
    </View>
  );
}

/** A line above what IS shown, when the last refresh failed. */
export function Stale({ error, loadedAt, onRetry }: { error: unknown; loadedAt: number; onRetry: () => void }) {
  const p = problem(error);
  const cause = p.kind === "unreachable" ? "no connection"
    : p.kind === "refused" ? `refused - ${p.reason}`
      : p.status ? `the server answered with an error (${p.status})` : p.message;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, borderRadius: 8, borderWidth: 1, borderColor: c.yellow100, backgroundColor: c.yellow50, paddingHorizontal: 14, paddingVertical: 8 }} accessibilityRole="alert">
      <AlertTriangle size={16} color={c.yellow800} />
      <Text style={[t.label, { color: c.yellow800, flexShrink: 1 }]}>
        Not up to date: {cause}.{loadedAt > 0 ? ` Showing what loaded at ${timeOnly(new Date(loadedAt))}.` : ""}
      </Text>
      <Pressable onPress={onRetry} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}>
        <Text style={[t.label, { color: c.yellow800, ...face[600], textDecorationLine: "underline" }]}>Try again</Text>
      </Pressable>
    </View>
  );
}

const box: ViewStyle = { backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, paddingHorizontal: space.cardX, paddingVertical: space.cardY };

/* ── A button (the web's Button: primary orange, secondary white) ─── */

export function Btn({ label, onPress, primary, disabled, busy, icon, a11y, hint, style, size = 48 }: {
  label: string; onPress: () => void; primary?: boolean; disabled?: boolean; busy?: boolean; icon?: ReactNode;
  a11y?: string; hint?: string; style?: StyleProp<ViewStyle>; size?: number;
}) {
  const off = disabled || busy;
  const bg = primary ? (off ? c.grey300 : c.orange) : c.white;
  return (
    <Pressable
      onPress={onPress} disabled={busy}
      accessibilityRole="button" accessibilityLabel={a11y ?? label} accessibilityHint={hint}
      accessibilityState={{ disabled: Boolean(off), busy: Boolean(busy) }}
      style={({ pressed }) => [{
        minHeight: size, paddingHorizontal: 20, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
        backgroundColor: pressed && !off ? (primary ? c.orange600 : c.grey50) : bg,
        borderWidth: primary ? 0 : 1, borderColor: c.grey300, opacity: !primary && off ? 0.5 : 1,
      }, style]}
    >
      {icon}
      <Text style={[t.heading, { fontSize: 16, color: primary ? (off ? c.grey600 : c.white) : c.ink900 }]}>{busy ? `${label}…` : label}</Text>
    </Pressable>
  );
}

/** A 44 px round icon button (the web's STEP / TILE_ACTION). */
export function RoundBtn({ a11y, onPress, children, disabled, tone }: {
  a11y: string; onPress: () => void; children: ReactNode; disabled?: boolean; tone?: "danger";
}) {
  return (
    <Pressable
      onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={a11y} accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => ({
        width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center",
        borderColor: pressed && tone ? c.red100 : c.grey300, backgroundColor: pressed ? (tone ? c.red50 : c.grey50) : c.white,
        opacity: disabled ? 0.4 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}

/* ── A dialog over the screen (the web's Dialog) ────────────────────── */

export function Sheet({ open, onClose, title, description, footer, children }: {
  open: boolean; onClose: () => void; title: string; description?: string; footer: ReactNode; children: ReactNode;
}) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: "rgba(3,23,40,0.4)", justifyContent: "center", padding: 16 }}>
        <View style={{ backgroundColor: c.white, borderRadius: 16, maxHeight: "100%", overflow: "hidden" }}>
          <SheetHead title={title} description={description} onClose={onClose} />
          <ScrollView contentContainerStyle={{ padding: space.side, gap: 20 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
          <View style={{ backgroundColor: c.grey50, borderTopWidth: 1, borderTopColor: c.grey100, paddingHorizontal: space.side, paddingVertical: 12 }}>{footer}</View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function SheetHead({ title, description, onClose }: { title: string; description?: string; onClose: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: space.side, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.grey100 }}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={t.heading} accessibilityRole="header">{title}</Text>
        {description ? <Text style={[t.label, { color: c.grey500 }]}>{description}</Text> : null}
      </View>
      <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={4} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: -12, marginTop: -10 }}>
        <X size={20} color={c.grey500} />
      </Pressable>
    </View>
  );
}

/** A small capital heading inside a sheet ("VARIATION", "NOTE FOR THE KITCHEN"). */
export function Caps({ children }: { children: ReactNode }) {
  return <Text style={[t.caption, { ...face[600], textTransform: "uppercase", letterSpacing: 0.4 }]}>{children}</Text>;
}

/* ── What was said (the web's toast) ─────────────────────────────────
   The pad closes on Send and Tables says what happened: the pad leaves
   it here, the screen underneath picks it up when it comes back into view.
   A word older than ten seconds is not said. */

export type Said = { title: string; body?: string; tone: "ok" | "held" | "bad" };
let mailbox: { said: Said; at: number } | null = null;
export const leaveSaid = (said: Said) => { mailbox = { said, at: Date.now() }; };
export function takeSaid(): Said | null {
  const m = mailbox;
  mailbox = null;
  return m && Date.now() - m.at < 10_000 ? m.said : null;
}

const SAID = {
  ok: { box: { backgroundColor: c.ink900, borderColor: c.ink900 }, fg: c.white },
  held: { box: { backgroundColor: c.yellow50, borderColor: c.yellow100 }, fg: c.yellow800 },
  bad: { box: { backgroundColor: c.red50, borderColor: c.red100 }, fg: c.red700 },
};

export function SaidBar({ said, onDone, style }: { said: Said; onDone: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      onPress={onDone} accessibilityLiveRegion="polite" accessibilityRole={said.tone === "bad" ? "alert" : "text"}
      style={[{ borderRadius: 12, borderWidth: 1, paddingHorizontal: space.cardX, paddingVertical: 12, gap: 2, ...SAID[said.tone].box }, style]}
    >
      <Text style={[t.label, { ...face[600], color: SAID[said.tone].fg }]}>{said.title}</Text>
      {said.body ? <Text style={[t.caption, { color: SAID[said.tone].fg }]}>{said.body}</Text> : null}
    </Pressable>
  );
}
