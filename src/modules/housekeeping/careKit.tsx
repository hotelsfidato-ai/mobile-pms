import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import {
  AlertCircle, Check, ChevronDown, ChevronLeft, CloudOff, Inbox, Minus, Plus, RotateCw, X, type LucideIcon,
} from "lucide-react-native";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator, AppState, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View,
  useWindowDimensions, type KeyboardTypeOptions, type StyleProp, type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeldError } from "../../core/api";
import { isOnline } from "../../core/offline";
import { c, face, space, t } from "../../core/theme";
import { Capsule, modalEdge, ripple as coreRipple, useSheetPad } from "../../core/ui";

/* ══════════════════════════════════════════════════════════════════
   THE WEB KIT'S PIECES THE MINIBAR, THE CHECKLISTS AND EQUIPMENT USE
   (lane m13-hk, 19 Nov), ported from src/components/ui (States,
   StatusPill, Misc Segmented, Button, Input Field / Textarea, Switch,
   Checkbox, Overlays Dialog) with the tokens of src/styles/theme.css
   through the core's theme, and the owner's native principles
   (docs/NATIVE.md): the phone's own Switch, its own spinner, a ripple on
   Android and the pressed shade on iPhone, safe areas in every sheet, the
   keyboard lifting the form. Modelled on guest-services' kit, which is
   another module's; housekeeping's own screens keep theirs.
   ══════════════════════════════════════════════════════════════════ */

/** The core's Android ripple (src/core/ui.tsx, the native sweep); iPhone ignores it. */
const ripple = coreRipple;
/** The pressed shade on iPhone only: Android has its ripple (NATIVE.md, never both). */
const pressedShade = (pressed: boolean, shade: string, rest: string) => (pressed && Platform.OS === "ios" ? shade : rest);

/** The web's text-sm and text-base: 14 on 21. */
export const body = { ...t.label, lineHeight: 21 };

/** Said, not only seen (the web's toast). */
export type Said = { title: string; body?: string; tone: "ok" | "held" | "bad" };
export const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
/** A held change is never a failure; anything else is the server's (or the web's offline) sentence. */
export const saidOf = (title: string, e: unknown): Said =>
  e instanceof HeldError ? { title: "Saved on this phone", body: e.message, tone: "held" } : { title, body: message(e), tone: "bad" };

/** The web's refetchInterval while on screen, not in the background. */
export function usePoll(queryKey: readonly unknown[], every = 30_000) {
  const cache = useQueryClient();
  const key = JSON.stringify(queryKey);
  useFocusEffect(useCallback(() => {
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void cache.refetchQueries({ queryKey: JSON.parse(key) as unknown[], type: "active" });
    }, every);
    return () => clearInterval(timer);
  }, [cache, key, every]));
}

const SAID = {
  ok: { bg: c.ink900, ring: c.ink900, fg: c.white },
  held: { bg: c.yellow50, ring: c.yellow100, fg: c.yellow800 },
  bad: { bg: c.red50, ring: c.red100, fg: c.red700 },
};

/** The floating line the web's toast is; goes by itself, or tapped. Above the home indicator. */
export function Toast({ said, onClose }: { said: Said | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
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
        position: "absolute", left: space.side, right: space.side, bottom: Math.max(insets.bottom, 16), borderRadius: 12, borderWidth: 1,
        paddingHorizontal: space.cardX, paddingVertical: 12, gap: 2, backgroundColor: tone.bg, borderColor: tone.ring,
      }}
    >
      <Text style={[t.label, { ...face[600], color: tone.fg }]}>{said.title}</Text>
      {said.body ? <Text style={[t.caption, { color: tone.fg }]}>{said.body}</Text> : null}
    </Pressable>
  );
}

/* ── StatusPill ──────────────────────────────────────────────────── */

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";
const PILL: Record<Tone, { bg: string; fg: string; dot: string }> = {
  neutral: { bg: c.grey100, fg: c.grey600, dot: c.grey400 },
  info: { bg: c.info50, fg: c.info, dot: c.info },
  success: { bg: c.success50, fg: c.success600, dot: c.success },
  warning: { bg: c.yellow50, fg: c.yellow800, dot: c.yellow },
  danger: { bg: c.red50, fg: c.red700, dot: c.red },
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

/** The web's IconChip, 28, yellow for something to do. */
export function IconChip({ Icon, tone = "neutral" }: { Icon: LucideIcon; tone?: "neutral" | "yellow" }) {
  const y = tone === "yellow";
  return (
    <View style={{ width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: y ? c.yellow100 : c.grey100 }}>
      <Icon size={16} color={y ? c.yellow800 : c.grey600} />
    </View>
  );
}

/* ── Segmented ───────────────────────────────────────────────────── */

export function Segmented<T extends string>({ value, onChange, options, label }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
      <View accessibilityRole="tablist" accessibilityLabel={label} style={{ flexDirection: "row", gap: 2, padding: 3, backgroundColor: c.grey100, borderRadius: 10 }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value} onPress={() => onChange(o.value)} accessibilityRole="tab" accessibilityState={{ selected: on }} android_ripple={ripple}
              style={{
                minHeight: 44, paddingHorizontal: 12, borderRadius: 7, alignItems: "center", justifyContent: "center", overflow: "hidden",
                backgroundColor: on ? c.white : "transparent",
                ...(on ? { shadowColor: c.ink900, shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : null),
              }}
            >
              <Text style={[t.label, { color: on ? c.ink900 : c.grey600 }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

/* ── Button: one capsule, the web's variants ─────────────────────── */

export type Variant = "primary" | "secondary" | "ghost" | "danger";
export function Btn({ label, a11y, variant = "secondary", icon: Icon, onPress, disabled, busy, tall, grow, style }: {
  label: string; a11y?: string; variant?: Variant; icon?: LucideIcon; onPress: () => void; disabled?: boolean;
  /** On its way: the phone's own spinner, no second tap. */
  busy?: boolean; tall?: boolean; grow?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const off = Boolean(disabled || busy);
  const fg = off
    ? { primary: c.grey600, secondary: c.grey500, ghost: c.grey500, danger: c.white }[variant]
    : { primary: c.white, secondary: c.ink900, ghost: c.grey600, danger: c.white }[variant];
  return (
    <Pressable
      onPress={onPress} disabled={off} accessibilityRole="button" accessibilityLabel={a11y ?? label}
      accessibilityState={{ disabled: off, busy: Boolean(busy) }} android_ripple={ripple}
      style={({ pressed }) => [{
        minHeight: tall ? 48 : 44, paddingHorizontal: 14, borderRadius: 999, flexDirection: "row", gap: 8, overflow: "hidden",
        alignItems: "center", justifyContent: "center", ...(grow ? { flex: 1 } : null),
        backgroundColor: {
          primary: off ? c.grey300 : pressedShade(pressed, c.orange700, c.orange600),
          secondary: off ? c.grey50 : pressedShade(pressed, c.grey100, c.white),
          ghost: pressedShade(pressed, c.grey200, "transparent"),
          danger: off ? c.grey300 : pressedShade(pressed, c.red700, c.red),
        }[variant],
        borderWidth: variant === "secondary" ? 1 : 0, borderColor: c.grey300,
      }, style]}
    >
      {busy ? <ActivityIndicator size="small" color={fg} /> : Icon ? <Icon size={16} color={fg} /> : null}
      <Text style={[t.label, { color: fg }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

/** A button the API (or the phone) would refuse: grey, the sentence under it (AGENTS rule 1). */
export function Refused({ label, reason, icon, variant }: { label: string; reason: string; icon?: LucideIcon; variant?: Variant }) {
  return (
    <View style={{ gap: 4, alignSelf: "stretch" }}>
      <Btn label={label} icon={icon} {...(variant ? { variant } : {})} disabled onPress={() => undefined} style={{ alignSelf: "flex-start" }} />
      <Text style={[t.caption, { color: c.grey600, lineHeight: 17 }]}>{reason}</Text>
    </View>
  );
}

/** A button that may be grey: the sentence shows under it whenever it is (never hidden). */
export function Act({ reason, ...b }: Parameters<typeof Btn>[0] & { reason: string | null }) {
  return reason ? <Refused label={b.label} reason={reason} {...(b.icon ? { icon: b.icon } : {})} {...(b.variant ? { variant: b.variant } : {})} /> : <Btn {...b} />;
}

/** A section's title, its count pill, its action (Minibar.tsx's h2). */
export function SectionHead({ title, pill, note, action }: { title: string; pill?: ReactNode; note?: string; action?: ReactNode }) {
  return (
    <View style={{ gap: 4, marginTop: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 28 }}>
        <Text style={t.heading} accessibilityRole="header">{title}</Text>
        {pill}
        <View style={{ flex: 1 }} />
        {action}
      </View>
      {note ? <Text style={[body, { color: c.grey500 }]}>{note}</Text> : null}
    </View>
  );
}

/* ── The states ──────────────────────────────────────────────────── */

export function Empty({ title, description, Icon = Inbox, compact }: { title: string; description?: string; Icon?: LucideIcon; compact?: boolean }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: compact ? 32 : 56, paddingHorizontal: 24 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.grey100, alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
        <Icon size={20} color={c.grey400} />
      </View>
      <Text style={[t.heading, { textAlign: "center" }]}>{title}</Text>
      {description ? <Text style={[t.label, { color: c.grey500, marginTop: 6, textAlign: "center", lineHeight: 22 }]}>{description}</Text> : null}
    </View>
  );
}

/** A read that failed: the web's ErrorState, or, with no line, that it is the line. */
export function Failed({ title, error, onRetry }: { title: string; error: string; onRetry: () => void }) {
  const off = !isOnline();
  return (
    <View accessibilityRole="alert" style={{ alignItems: "center", paddingVertical: 48, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, backgroundColor: off ? c.yellow50 : c.white, borderColor: off ? c.yellow100 : c.grey200 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: off ? c.yellow100 : c.red50, alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
        {off ? <CloudOff size={20} color={c.yellow800} /> : <AlertCircle size={20} color={c.red} />}
      </View>
      <Text style={[t.heading, { textAlign: "center" }]}>{off ? "No connection" : title}</Text>
      <Text style={[t.label, { color: c.grey500, marginTop: 6, textAlign: "center", lineHeight: 22 }]}>
        {off ? "This has not been read on this phone yet. It shows once the line is back." : error}
      </Text>
      <View style={{ marginTop: 18 }}><Btn label="Try again" icon={RotateCw} onPress={onRetry} /></View>
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

/** A white card. */
export const Box = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200 }, style]}>{children}</View>
);
/** The web's CardBody padding. */
export const Inside = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[{ paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 8 }, style]}>{children}</View>
);
/** A hairline between rows (the Rhythm Rule). */
export const Hairline = () => <View style={{ height: 1, backgroundColor: c.grey100 }} />;

/** The API refuses this person this screen: its sentence, nothing read. */
export const NotYours = ({ title, sentence }: { title: string; sentence: string }) => (
  <Box><Empty compact title={title} description={sentence} /></Box>
);

/** Each phone's own spinner, with the words (NATIVE.md). */
export const Loading = ({ words }: { words: string }) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }} accessibilityLiveRegion="polite">
    <ActivityIndicator color={c.orange} />
    <Text style={t.label}>{words}</Text>
  </View>
);

export const Back = ({ onPress }: { onPress: () => void }) => (
  <Capsule label="Back" icon={<ChevronLeft size={16} color={c.grey700} />} onPress={onPress} />
);

/** The web's Dialog: centred, 16px from each side, a hairline under the head; the
    safe areas kept, the keyboard lifting it, Android's back closing it (NATIVE.md). */
export function Dialog({ title, description, onClose, children }: {
  title: string; description?: string; onClose: () => void; children: ReactNode;
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} {...modalEdge}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: "rgba(3,23,40,0.25)", justifyContent: "center", paddingHorizontal: 16, paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <Pressable style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }} onPress={onClose} accessibilityLabel="Close" />
        <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, maxHeight: height - insets.top - insets.bottom - 48 }}>
          <View style={{ flexDirection: "row", gap: 12, paddingLeft: 20, paddingRight: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
            <View style={{ flex: 1, paddingTop: 4 }}>
              <Text style={t.heading} accessibilityRole="header">{title}</Text>
              {description ? <Text style={[t.label, { color: c.grey500, marginTop: 4, lineHeight: 21 }]}>{description}</Text> : null}
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" android_ripple={{ ...coreRipple, borderless: true }}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
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
      {said.body ? <Text style={[t.caption, { color: said.tone === "ok" ? c.white : c.grey700 }]}>{said.body}</Text> : null}
    </View>
  );
}

export function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.label, { color: c.grey700 }]}>
        {label}{required ? <Text style={{ color: c.red }}>{" *"}</Text> : null}
      </Text>
      {children}
      {hint ? <Text style={[t.caption, { lineHeight: 17 }]}>{hint}</Text> : null}
    </View>
  );
}

/** The web's Input and Textarea: 44 on a touch screen, 16px type, the right keyboard. */
export function Input({ label, rows, ...props }: {
  label: string; value: string; onChangeText: (v: string) => void; rows?: number; maxLength?: number;
  autoFocus?: boolean; placeholder?: string; keyboardType?: KeyboardTypeOptions; inputMode?: "text" | "decimal" | "numeric";
  autoCapitalize?: "none" | "characters" | "sentences"; editable?: boolean;
}) {
  return (
    <TextInput
      {...props}
      accessibilityLabel={label}
      multiline={Boolean(rows)}
      placeholderTextColor={c.grey400}
      style={{
        minHeight: rows ? 18 + rows * 24 : 44, paddingHorizontal: 12, paddingVertical: rows ? 10 : 0, borderRadius: 10, borderWidth: 1,
        borderColor: c.grey300, backgroundColor: props.editable === false ? c.grey50 : c.white, fontSize: 16, color: c.ink900, ...face[500],
        textAlignVertical: rows ? "top" : "center",
      }}
    />
  );
}

/** The web's native select: a field that opens its choices from the foot of the screen. */
export function Select<T extends string>({ label, value, options, onChange, placeholder, disabled }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; placeholder?: string; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pad = useSheetPad();
  const shown = options.find((o) => o.value === value)?.label ?? placeholder ?? "";
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)} disabled={disabled} accessibilityRole="button" accessibilityLabel={`${label}: ${shown}`}
        accessibilityState={{ disabled: Boolean(disabled) }} android_ripple={ripple}
        style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 12, paddingRight: 10, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, backgroundColor: disabled ? c.grey50 : c.white, overflow: "hidden" }}
      >
        <Text style={{ flex: 1, fontSize: 16, color: disabled ? c.grey500 : c.ink900, ...face[500] }} numberOfLines={1}>{shown}</Text>
        <ChevronDown size={16} color={c.grey500} />
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)} {...modalEdge}>
        <View style={{ flex: 1, backgroundColor: "rgba(3,23,40,0.4)" }}>
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Close" />
          <View style={{ backgroundColor: c.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: space.side, paddingTop: 16, paddingBottom: pad.bottom, gap: 4, maxHeight: "75%" }}>
            <Text style={[t.heading, { marginBottom: 4 }]} accessibilityRole="header">{label}</Text>
            <ScrollView>
              {options.map((o) => (
                <Pressable
                  key={o.value} onPress={() => { onChange(o.value); setOpen(false); }} android_ripple={ripple}
                  accessibilityRole="button" accessibilityLabel={o.label} accessibilityState={{ selected: o.value === value }}
                  style={({ pressed }) => ({ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: c.grey100, backgroundColor: pressedShade(pressed, c.grey50, c.white) })}
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

/** The web's Switch, as each phone's own (NATIVE.md); its label and line beside it. */
export function Toggle({ value, onChange, label, description, disabled }: {
  value: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[t.label, { color: c.ink900, lineHeight: 21 }]}>{label}</Text>
        {description ? <Text style={[t.caption, { lineHeight: 17 }]}>{description}</Text> : null}
      </View>
      <Switch
        value={value} onValueChange={onChange} disabled={disabled} accessibilityLabel={label}
        trackColor={{ false: c.grey300, true: c.orange600 }} thumbColor={Platform.OS === "android" ? c.white : undefined} ios_backgroundColor={c.grey300}
      />
    </View>
  );
}

/** The web's Checkbox: 44 tall, the box and the words. */
export function Tick({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable
      onPress={() => onChange(!on)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label} android_ripple={ripple}
      style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 12, overflow: "hidden" }}
    >
      <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1, alignItems: "center", justifyContent: "center", borderColor: on ? c.orange600 : c.grey300, backgroundColor: on ? c.orange600 : c.white }}>
        {on ? <Check size={14} color={c.white} /> : null}
      </View>
      <Text style={[body, { flex: 1, color: c.ink900 }]}>{label}</Text>
    </Pressable>
  );
}

/** − n + : one less, how many, one more (MinibarFlow), 44 each. */
export function Stepper({ n, name, onStep }: { n: number; name: string; onStep: (by: number) => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Square Icon={Minus} a11y={`One less ${name}`} disabled={n === 0} onPress={() => onStep(-1)} />
      <Text style={[t.heading, t.tab, { width: 28, textAlign: "center" }]} accessibilityLiveRegion="polite">{n}</Text>
      <Square Icon={Plus} a11y={`One more ${name}`} disabled={n >= 99} onPress={() => onStep(1)} />
    </View>
  );
}
function Square({ Icon, a11y, disabled, onPress }: { Icon: LucideIcon; a11y: string; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={a11y} accessibilityState={{ disabled: Boolean(disabled) }}
      android_ripple={ripple}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: disabled ? c.grey50 : pressedShade(pressed, c.grey100, c.white) })}
    >
      <Icon size={16} color={disabled ? c.grey400 : c.ink900} />
    </Pressable>
  );
}

/** A labelled figure on a card (the web's DataTable at phone width: the label in small capitals). */
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 25 }}>
      <Text style={{ width: 118, fontSize: 12, lineHeight: 17, letterSpacing: 0.3, textTransform: "uppercase", color: c.grey500, ...face[500] }}>{label}</Text>
      <View style={{ flex: 1 }}>{typeof children === "string" ? <Text style={[body, t.tab, { color: c.ink900 }]}>{children}</Text> : children}</View>
    </View>
  );
}
