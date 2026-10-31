import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import {
  AlertCircle, Check, ChevronDown, ChevronLeft, CloudOff, Inbox, Info, RotateCw, X, type LucideIcon,
} from "lucide-react-native";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  AppState, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View,
  useWindowDimensions, type StyleProp, type ViewStyle,
} from "react-native";
import { HeldError } from "../../core/api";
import { isOnline } from "../../core/offline";
import { c, face, space, t } from "../../core/theme";
import { Capsule } from "../../core/ui";

/* ══════════════════════════════════════════════════════════════════
   THE WEB KIT'S PIECES THESE SCREENS USE, ported from src/components/ui
   (States, StatusPill, Misc, Button, Input, Overlays). The tokens the
   core's theme does not carry are copied from src/styles/theme.css, not
   eyeballed; a core `theme` that gains them takes these out.
   ══════════════════════════════════════════════════════════════════ */

const brandRed = "#e0301e";
const grey400 = "#9aa2a9";
const success = "#1f6f5c";
const success50 = "#eaf4f1";
const yellow = "#ffb600";

/** Said, not only seen (the web's toast). */
export type Said = { title: string; body?: string; tone: "ok" | "held" | "bad" };
export const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
/** A held change is never a failure. None of these paths is held today; a
    tier added on the web then needs nothing here. */
export const saidOf = (title: string, e: unknown): Said =>
  e instanceof HeldError ? { title: "Saved on this phone", body: e.message, tone: "held" } : { title, body: message(e), tone: "bad" };

/** The web's refetchInterval: every 30 s while on screen, not in the
    background (a phone in a pocket is nobody's screen). */
export function usePoll(queryKey: readonly unknown[]) {
  const cache = useQueryClient();
  const key = JSON.stringify(queryKey);
  useFocusEffect(useCallback(() => {
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void cache.refetchQueries({ queryKey: JSON.parse(key) as unknown[], type: "active" });
    }, 30_000);
    return () => clearInterval(timer);
  }, [cache, key]));
}

const SAID = {
  ok: { bg: c.ink900, ring: c.ink900, fg: c.white },
  held: { bg: c.yellow50, ring: c.yellow100, fg: c.yellow800 },
  bad: { bg: c.red50, ring: c.red100, fg: c.red700 },
};

/** The floating line the web's toast is; goes by itself, or tapped. */
export function Toast({ said, onClose }: { said: Said | null; onClose: () => void }) {
  useEffect(() => {
    if (!said) return;
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [said, onClose]);
  if (!said) return null;
  const tone = SAID[said.tone];
  return (
    <Pressable
      onPress={onClose} accessibilityLiveRegion="polite" accessibilityRole={said.tone === "bad" ? "alert" : "text"}
      style={{
        position: "absolute", left: space.side, right: space.side, bottom: 16, borderRadius: 12, borderWidth: 1,
        paddingHorizontal: space.cardX, paddingVertical: 12, gap: 2, backgroundColor: tone.bg, borderColor: tone.ring,
      }}
    >
      <Text style={[t.label, { ...face[600], color: tone.fg }]}>{said.title}</Text>
      {said.body ? <Text style={[t.caption, { color: tone.fg }]}>{said.body}</Text> : null}
    </Pressable>
  );
}

/* ── StatusPill ──────────────────────────────────────────────────── */

export type Tone = "neutral" | "info" | "success" | "warning";
const PILL: Record<Tone, { bg: string; fg: string; dot: string }> = {
  neutral: { bg: c.grey100, fg: c.grey600, dot: grey400 },
  info: { bg: c.info50, fg: c.info, dot: c.info },
  success: { bg: success50, fg: c.success600, dot: success },
  warning: { bg: c.yellow50, fg: c.yellow800, dot: yellow },
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

/* ── IconChip, 28 ────────────────────────────────────────────────── */

export function IconChip({ Icon, tone = "neutral" }: { Icon: LucideIcon; tone?: "neutral" | "orange" }) {
  const orange = tone === "orange";
  return (
    <View style={{
      width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 1,
      backgroundColor: orange ? c.orange50 : c.grey100, borderWidth: orange ? 1 : 0, borderColor: c.orange100,
    }}>
      <Icon size={16} color={orange ? c.orange700 : c.grey600} />
    </View>
  );
}

/* ── Segmented: scrolls inside itself when it does not fit, never the page ── */

export function Segmented<T extends string>({ value, onChange, options, label, stacked }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string;
  /** One a line, where they do not fit (the web's New request dialog on a phone). */
  stacked?: boolean;
}) {
  const track = (
    <View
      accessibilityRole="tablist" accessibilityLabel={label}
      style={{ flexDirection: stacked ? "column" : "row", alignItems: stacked ? "stretch" : "center", gap: 2, padding: 3, backgroundColor: c.grey100, borderRadius: 10 }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value} onPress={() => onChange(o.value)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={{
              minHeight: 44, paddingHorizontal: 12, borderRadius: 7, alignItems: "center", justifyContent: "center",
              backgroundColor: on ? c.white : "transparent",
              ...(on ? { shadowColor: c.ink900, shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : null),
            }}
          >
            <Text style={[t.label, { color: on ? c.ink900 : c.grey600 }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
  return stacked ? track : <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>{track}</ScrollView>;
}

/* ── Button: one capsule, the web's variants ─────────────────────── */

export function Btn({ label, a11y, variant = "secondary", icon: Icon, onPress, disabled, tall, grow, style }: {
  label: string; a11y?: string; variant?: "primary" | "secondary" | "ghost" | "danger"; icon?: LucideIcon;
  onPress: () => void; disabled?: boolean; tall?: boolean; grow?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const fg = disabled
    ? { primary: c.grey600, secondary: c.grey500, ghost: c.grey500, danger: c.white }[variant]
    : { primary: c.white, secondary: c.ink900, ghost: c.grey600, danger: c.white }[variant];
  return (
    <Pressable
      onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={a11y ?? label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [{
        minHeight: tall ? 48 : 44, paddingHorizontal: 14, borderRadius: 999, flexDirection: "row", gap: 8,
        alignItems: "center", justifyContent: "center", ...(grow ? { flex: 1 } : null),
        backgroundColor: {
          primary: disabled ? c.grey300 : pressed ? c.orange700 : c.orange600,
          secondary: disabled ? c.grey50 : pressed ? c.grey100 : c.white,
          ghost: pressed ? c.grey200 : "transparent",
          danger: disabled ? c.grey300 : pressed ? c.red700 : brandRed,
        }[variant],
        borderWidth: variant === "secondary" ? 1 : 0, borderColor: c.grey300,
      }, style]}
    >
      {Icon ? <Icon size={16} color={fg} /> : null}
      <Text style={[t.label, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

/** A button the API (or the phone) would refuse: grey, the sentence under it (AGENTS rule 1). */
export function Refused({ label, reason, icon, variant }: {
  label: string; reason: string; icon?: LucideIcon; variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <View style={{ gap: 4 }}>
      <Btn label={label} icon={icon} {...(variant ? { variant } : {})} disabled onPress={() => undefined} style={{ alignSelf: "flex-start" }} />
      <Text style={[t.caption, { color: c.grey600 }]}>{reason}</Text>
    </View>
  );
}

/** A section's title and its note behind an (i), the web's InfoButton
    (the owner, D27-82); the note opens under the title, not in a popover. */
export function SectionHead({ title, note, action }: { title: string; note?: string; action?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 2, marginBottom: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, minHeight: 24 }}>
        <Text style={t.heading} accessibilityRole="header">{title}</Text>
        {note ? (
          <Pressable
            onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityLabel={note} accessibilityState={{ expanded: open }}
            style={{ width: 44, height: 44, marginVertical: -10, alignItems: "center", justifyContent: "center" }}
          >
            <Info size={16} color={c.grey500} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }} />
        {action}
      </View>
      {open ? <Text style={[t.label, { lineHeight: 22 }]}>{note}</Text> : null}
    </View>
  );
}

/* ── The states ──────────────────────────────────────────────────── */

export function Empty({ title, description, compact }: { title: string; description?: string; compact?: boolean }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: compact ? 40 : 64, paddingHorizontal: 24 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.grey100, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Inbox size={20} color={grey400} />
      </View>
      <Text style={[t.heading, { textAlign: "center" }]}>{title}</Text>
      {description ? <Text style={[t.label, { color: c.grey500, marginTop: 6, textAlign: "center", lineHeight: 23 }]}>{description}</Text> : null}
    </View>
  );
}

/** A read that failed: the web's ErrorState, or, with no line, that it is the line. */
export function Failed({ title, error, onRetry }: { title: string; error: string; onRetry: () => void }) {
  const off = !isOnline();
  return (
    <View accessibilityRole="alert" style={{ alignItems: "center", paddingVertical: 56, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, backgroundColor: off ? c.yellow50 : c.white, borderColor: off ? c.yellow100 : c.grey200 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: off ? c.yellow100 : c.red50, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        {off ? <CloudOff size={20} color={c.yellow800} /> : <AlertCircle size={20} color={brandRed} />}
      </View>
      <Text style={[t.heading, { textAlign: "center" }]}>{off ? "No connection" : title}</Text>
      <Text style={[t.label, { color: c.grey500, marginTop: 6, textAlign: "center", lineHeight: 22 }]}>
        {off ? "This has not been read on this phone yet. It shows once the line is back." : error}
      </Text>
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

/** A white card round an Empty. */
export const Box = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200 }, style]}>{children}</View>
);

/** The API refuses this person this screen: its sentence, nothing read. */
export const NotYours = ({ title, sentence }: { title: string; sentence: string }) => (
  <Box><Empty compact title={title} description={sentence} /></Box>
);

export const Loading = ({ words }: { words: string }) => (
  <Text style={t.label} accessibilityLiveRegion="polite">{words}</Text>
);

/* ── The page's back, the web's dialog, its fields ───────────────── */

export const Back = ({ onPress }: { onPress: () => void }) => (
  <Capsule label="Back" icon={<ChevronLeft size={16} color={c.grey700} />} onPress={onPress} />
);

/** The web's Dialog: centred, 16px from each side, a hairline under the head. */
export function Dialog({ title, description, onClose, children }: {
  title: string; description?: string; onClose: () => void; children: ReactNode;
}) {
  const { height } = useWindowDimensions();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, backgroundColor: "rgba(3,23,40,0.25)", justifyContent: "center", paddingHorizontal: 16 }}
      >
        <Pressable style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }} onPress={onClose} accessibilityLabel="Close" />
        <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, maxHeight: height - 64 }}>
          <View style={{ flexDirection: "row", gap: 16, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
            <View style={{ flex: 1 }}>
              <Text style={t.heading} accessibilityRole="header">{title}</Text>
              {description ? <Text style={[t.label, { color: c.grey500, marginTop: 4 }]}>{description}</Text> : null}
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={14} style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
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

/** The two buttons at a dialog's foot, 48 tall, half each. */
export const Foot = ({ children }: { children: ReactNode }) => <View style={{ flexDirection: "row", gap: 8 }}>{children}</View>;

/** What the server refused, inside the dialog, which stays open (the toast would sit behind it). */
export function InDialog({ said }: { said: Said | null }) {
  if (!said) return null;
  return (
    <View accessibilityRole="alert" style={{ gap: 2, padding: 12, borderRadius: 8, backgroundColor: SAID[said.tone].bg }}>
      <Text style={[t.label, { color: SAID[said.tone].fg, ...face[600] }]}>{said.title}</Text>
      {said.body ? <Text style={[t.caption, { color: c.grey700 }]}>{said.body}</Text> : null}
    </View>
  );
}

export function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.label, { color: c.grey700 }]}>
        {label}{required ? <Text style={{ color: brandRed }}> *</Text> : null}
      </Text>
      {children}
      {hint ? <Text style={t.caption}>{hint}</Text> : null}
    </View>
  );
}

/** The web's Input and Textarea: 44 on a touch screen, 16px type. */
export function Input({ label, rows, ...props }: {
  label: string; value: string; onChangeText: (v: string) => void; rows?: number; maxLength?: number;
  autoFocus?: boolean; placeholder?: string; keyboardType?: "default" | "numbers-and-punctuation"; autoCapitalize?: "characters";
}) {
  return (
    <TextInput
      {...props}
      accessibilityLabel={label}
      multiline={Boolean(rows)}
      placeholderTextColor={grey400}
      style={{
        minHeight: rows ? 16 + rows * 24 : 44, paddingHorizontal: 12, paddingVertical: rows ? 8 : 0, borderRadius: 10, borderWidth: 1,
        borderColor: c.grey300, backgroundColor: c.white, fontSize: 16, color: c.ink900, ...face[500],
        textAlignVertical: rows ? "top" : "center",
      }}
    />
  );
}

/** The web's native select: a field that opens its choices from the foot of the screen. */
export function Select<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const shown = options.find((o) => o.value === value)?.label ?? "";
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`${label}: ${shown}`}
        style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 12, paddingRight: 10, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, backgroundColor: c.white }}
      >
        <Text style={{ flex: 1, fontSize: 16, color: c.ink900, ...face[500] }} numberOfLines={1}>{shown}</Text>
        <ChevronDown size={16} color={c.grey500} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(3,23,40,0.4)" }}>
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Close" />
          <View style={{ backgroundColor: c.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: space.side, paddingTop: 16, paddingBottom: 24, gap: 4, maxHeight: "75%" }}>
            <Text style={[t.heading, { marginBottom: 4 }]} accessibilityRole="header">{label}</Text>
            <ScrollView>
              {options.map((o) => (
                <Pressable
                  key={o.value} onPress={() => { onChange(o.value); setOpen(false); }}
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

/** "204 · Tanvi Bhide" in a Room select (Requests.tsx, WakeUpCalls.tsx). */
export const roomChoices = (rooms: { reservationId: string; room: string; guest: string | null }[]) =>
  rooms.map((r) => ({ value: r.reservationId, label: r.guest ? `${r.room} · ${r.guest}` : r.room }));
