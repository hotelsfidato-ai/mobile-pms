import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { AlertCircle, Check, ChevronDown, CloudOff, Inbox, RotateCw, ShieldOff, X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator, AppState, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View,
  type KeyboardTypeOptions, type TextInputProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeldError, outcomeUnknown } from "../../core/api";
import { isOnline } from "../../core/offline";
import { c, face, space, t } from "../../core/theme";
import { confirmAct, modalEdge, ripple, shade, useSheetPad } from "../../core/ui";

/* ══════════════════════════════════════════════════════════════════
   THE WEB KIT'S PIECES ADMINISTRATION USES — src/components/ui
   (StatusPill, Button, Input/Field, NativeSelect, Dialog, Segmented,
   States, Toast, DataTable's phone cards) with the tokens of
   src/styles/theme.css through the core's theme, built native as
   docs/NATIVE.md asks: each sheet pads its own safe area and lifts over
   the keyboard, a destructive act asks with the phone's own Alert, the
   right keyboard per field, android_ripple on Android and the pressed
   shade on iPhone, 44 px targets.
   ══════════════════════════════════════════════════════════════════ */

/** The web's text-sm: 14 on 21. */
export const body = { ...t.label, lineHeight: 21 };
/** The pressed colour on iPhone only; Android shows the core's `ripple` (core ui.tsx `shade`). */
const tint = (pressed: boolean, base: string, down: string) => (pressed ? down : base);

/* ── Said, not only seen (the web's toast) ──────────────────────── */

export type Said = { title: string; body?: string; tone: "ok" | "held" | "bad" };
/** A held change is never a failure; anything else is the server's (or the web's offline) sentence. */
export const saidOf = (e: unknown, title: string): Said =>
  e instanceof HeldError ? { title: e.message, tone: "held" } : { title, body: e instanceof Error ? e.message : String(e), tone: "bad" };

const SAID = {
  ok: { bg: c.ink900, ring: c.ink900, fg: c.white, sub: c.onNavy },
  held: { bg: c.yellow50, ring: c.yellow100, fg: c.yellow800, sub: c.yellow800 },
  bad: { bg: c.red50, ring: c.red100, fg: c.red700, sub: c.grey700 },
};

/** The floating line the web's toast is; goes by itself after 6 s, or tapped. */
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
        position: "absolute", left: space.side, right: space.side, bottom: Math.max(insets.bottom, 16), borderRadius: 12,
        borderWidth: 1, paddingHorizontal: space.cardX, paddingVertical: 12, backgroundColor: tone.bg, borderColor: tone.ring, gap: 2,
      }}
    >
      <Text style={[t.label, { ...face[600], color: tone.fg, lineHeight: 20 }]}>{said.title}</Text>
      {said.body ? <Text style={[t.label, { color: tone.sub, lineHeight: 20 }]}>{said.body}</Text> : null}
    </Pressable>
  );
}
/** A toast's state, with a stable close so a re-read does not restart its clock. */
export function useSaid() {
  const [said, setSaid] = useState<Said | null>(null);
  const close = useCallback(() => setSaid(null), []);
  return { said, say: setSaid, close };
}

/* ── One tap, one write; an unknown outcome takes no more taps (MEMORY 8, 16) ── */

/** A write's latch at the tap (useRef, MEMORY 8) and the unknown-outcome rule (core ui.tsx useStuck,
    MEMORY 16): when nothing came back or the server failed, this act takes no more taps until the
    record is read again - a sheet until it is closed (it unmounts), a card until a read that BEGAN
    after the failure has landed (`seenAt`, the start of the last read that came back). */
export function useAct(seenAt?: number, stop?: Stop) {
  const latch = useRef(false);
  const [busy, setBusy] = useState(false);
  const own = useStop(seenAt);
  const held = stop ?? own;
  const stuck = held.stuck;
  async function run<T>(fn: () => Promise<T>, on: { ok: (r: T) => void; no: (e: unknown) => void; unknown: (e: unknown) => void }) {
    if (latch.current || stuck) return;
    latch.current = true;
    setBusy(true);
    try {
      on.ok(await fn());
    } catch (e) {
      if (outcomeUnknown(e)) { held.mark(); on.unknown(e); } else on.no(e);
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }
  return { busy, stuck, run };
}

/** The screen-level stop a sheet shares (MADM-3): kept by the screen, so closing the sheet does not
    free it; only a read of the list that BEGAN after the unknown outcome does (`seenAt`). */
export interface Stop { stuck: boolean; mark: () => void }
export function useStop(seenAt?: number): Stop {
  const [at, setAt] = useState<number | null>(null);
  return { stuck: at !== null && !(seenAt !== undefined && seenAt > at), mark: () => setAt(Date.now()) };
}

/** The web's refetchInterval while on screen, not in a pocket. */
export function usePoll(queryKey: readonly unknown[], every: number) {
  const cache = useQueryClient();
  const key = JSON.stringify(queryKey);
  useFocusEffect(useCallback(() => {
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void cache.refetchQueries({ queryKey: JSON.parse(key) as unknown[], type: "active" });
    }, every);
    return () => clearInterval(timer);
  }, [cache, key, every]));
}

/* ── The phone's own confirm (docs/NATIVE.md), in the web's words ── */

/** Alert.alert with the web's title, sentence and button; resolves true on the button. */
/** The core's confirmAct (each phone's own dialog; the browser's in the web preview), as a promise that
    resolves on the act. Cancelled, it never resolves and nothing is sent. */
export const confirm = (title: string, message: string, button: string) =>
  new Promise<true>((resolve) => confirmAct(title, message, button, () => resolve(true)));

/* ── StatusPill: a soft tint, a dot where the web draws one ────── */

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";
const PILL: Record<Tone, { bg: string; fg: string; dot: string }> = {
  neutral: { bg: c.grey100, fg: c.grey700, dot: c.grey400 },
  info: { bg: c.info50, fg: c.info, dot: c.info },
  success: { bg: c.success50, fg: c.success600, dot: c.success },
  warning: { bg: c.yellow50, fg: c.yellow800, dot: c.yellow },
  danger: { bg: c.red50, fg: c.red700, dot: c.red },
};
export function Pill({ tone, children, dot }: { tone: Tone; children: string; dot?: boolean }) {
  const p = PILL[tone];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: p.bg }}>
      {dot ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.dot }} /> : null}
      <Text style={{ fontSize: 12, lineHeight: 17, color: p.fg, ...face[500] }}>{children}</Text>
    </View>
  );
}

/* ── Button: primary (orange), secondary (outlined), ghost, danger ── */

type Variant = "primary" | "secondary" | "ghost" | "danger";
const BTN: Record<Variant, { bg: string; down: string; ring: string; fg: string }> = {
  primary: { bg: c.orange, down: c.orange600, ring: c.orange, fg: c.white },
  secondary: { bg: c.white, down: c.grey100, ring: c.grey300, fg: c.ink900 },
  ghost: { bg: "transparent", down: c.grey100, ring: "transparent", fg: c.grey700 },
  danger: { bg: c.red700, down: c.red, ring: c.red700, fg: c.white },
};
export function Btn({ label, a11y, onPress, disabled, variant = "secondary", icon, grow }: {
  label: string; a11y?: string; onPress: () => void; disabled?: boolean; variant?: Variant; icon?: ReactNode; grow?: boolean;
}) {
  const v = BTN[variant];
  return (
    <Pressable
      onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={a11y ?? label}
      accessibilityState={{ disabled: Boolean(disabled) }} android_ripple={ripple}
      style={shade(({ pressed }) => ({
        minHeight: 44, paddingHorizontal: variant === "ghost" ? 12 : 16, borderRadius: 999, borderWidth: 1, overflow: "hidden",
        borderColor: disabled && variant !== "ghost" ? c.grey200 : v.ring, flexDirection: "row", gap: 6,
        alignItems: "center", justifyContent: "center", ...(grow ? { flexGrow: 1 } : null),
        backgroundColor: disabled ? (variant === "ghost" ? "transparent" : c.grey100) : tint(pressed, v.bg, v.down),
      }))}
    >
      {icon}
      <Text style={[t.label, { color: disabled ? c.grey500 : v.fg, ...face[variant === "ghost" ? 500 : 600] }]}>{label}</Text>
    </Pressable>
  );
}

/* ── Field: a label over a box, 16 px type under a thumb (Input.tsx Field) ── */

export function Field({ label, value, onChangeText, hint, error, required, keyboardType, secure, multiline, editable = true, placeholder, autoCapitalize, textContentType, maxLength, right, input }: {
  label: string; value: string; onChangeText: (v: string) => void; hint?: string; error?: string; required?: boolean;
  keyboardType?: KeyboardTypeOptions; secure?: boolean; multiline?: boolean; editable?: boolean; placeholder?: string;
  autoCapitalize?: TextInputProps["autoCapitalize"]; textContentType?: TextInputProps["textContentType"]; maxLength?: number; right?: ReactNode;
  /** The core's `keys` for the field (the keyboard, autofill, capitals). */
  input?: TextInputProps;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.label, { color: c.grey700 }]}>{label}{required ? <Text style={{ color: c.red700 }}> *</Text> : null}</Text>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
        <TextInput
          value={value} onChangeText={onChangeText} editable={editable} placeholder={placeholder} placeholderTextColor={c.grey400}
          accessibilityLabel={label} keyboardType={keyboardType} secureTextEntry={secure} multiline={multiline}
          autoCapitalize={autoCapitalize} textContentType={textContentType} maxLength={maxLength} autoCorrect={!secure && keyboardType !== "email-address"} {...input}
          style={{
            flex: 1, minHeight: multiline ? 72 : 44, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
            borderColor: error ? c.red700 : c.grey300, backgroundColor: editable ? c.white : c.grey50, fontSize: 16, lineHeight: 22,
            color: editable ? c.ink900 : c.grey500, textAlignVertical: multiline ? "top" : "center", ...face[500],
          }}
        />
        {right}
      </View>
      {error ? <Text style={[t.caption, { color: c.red700 }]}>{error}</Text>
        : hint ? <Text style={[t.caption, { lineHeight: 17 }]}>{hint}</Text> : null}
    </View>
  );
}

/** PasswordBox (People.tsx, QA AD-6): masked, with Show, so it can be read back without sitting in view. */
export function PasswordField(props: { label: string; value: string; onChangeText: (v: string) => void; hint?: string; error?: string }) {
  const [show, setShow] = useState(false);
  return (
    /* Another person's password (MADM-2): never offered to the phone's password manager as this
       person's own Fidato sign-in, so no autofill and no content type. */
    <Field {...props} required secure={!show} input={{ autoCapitalize: "none", autoCorrect: false, autoComplete: "off", importantForAutofill: "no", textContentType: "none" }}
      placeholder="something they will remember"
      right={<Btn label={show ? "Hide" : "Show"} a11y={show ? "Hide the password" : "Show the password"} onPress={() => setShow((v) => !v)} />} />
  );
}

/* ── NativeSelect, as a sheet of choices ────────────────────────── */

export interface Choice { value: string; label: string }
export function Choose({ label, value, choices, onChange, disabled, none, hint }: {
  label: string; value: string; choices: readonly Choice[]; onChange: (v: string) => void; disabled?: boolean; none?: string; hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const shown = choices.find((ch) => ch.value === value)?.label ?? none ?? "Choose…";
  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.label, { color: c.grey700 }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)} disabled={disabled} accessibilityRole="button" accessibilityLabel={`${label}: ${shown}`}
        accessibilityState={{ disabled: Boolean(disabled) }} android_ripple={ripple}
        style={shade(({ pressed }) => ({
          minHeight: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, overflow: "hidden",
          flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: disabled ? c.grey50 : tint(pressed, c.white, c.grey50),
        }))}
      >
        <Text style={{ flex: 1, fontSize: 16, color: disabled ? c.grey500 : c.ink900, ...face[500] }} numberOfLines={1}>{shown}</Text>
        <ChevronDown size={16} color={c.grey500} />
      </Pressable>
      {hint ? <Text style={[t.caption, { lineHeight: 17 }]}>{hint}</Text> : null}
      <Sheet open={open} title={label} onClose={() => setOpen(false)}>
        {[...(none !== undefined ? [{ value: "", label: none }] : []), ...choices].map((ch) => (
          <Pressable
            key={ch.value} onPress={() => { onChange(ch.value); setOpen(false); }} accessibilityRole="button"
            accessibilityState={{ selected: ch.value === value }} android_ripple={ripple}
            style={shade(({ pressed }) => ({ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderColor: c.grey100, backgroundColor: tint(pressed, c.white, c.grey50) }))}
          >
            <Text style={[t.label, { flex: 1, fontSize: 16, color: c.ink900 }]}>{ch.label}</Text>
            {ch.value === value ? <Check size={18} color={c.orange} /> : null}
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
}

/* ── Dialog, as a bottom sheet (Dialog.tsx), safe area and keyboard ── */

export function Sheet({ open, title, description, onClose, children, footer, closable = true }: {
  open: boolean; title: string; description?: string; onClose: () => void; children: ReactNode; footer?: ReactNode;
  /** False while a write is on its way, or stuck (MEMORY 16): it closes once the person may close it. */
  closable?: boolean;
}) {
  const pad = useSheetPad();
  const close = () => { if (closable) onClose(); };
  return (
    <Modal {...modalEdge} visible={open} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(3,23,40,0.45)" }} onPress={close} accessibilityLabel="Close" />
        <View style={{ maxHeight: "90%", backgroundColor: c.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 16, paddingBottom: pad.bottom, paddingLeft: pad.left, paddingRight: pad.right }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: space.side }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[t.heading, { fontSize: 18 }]} accessibilityRole="header">{title}</Text>
              {description ? <Text style={[body, { color: c.grey600 }]}>{description}</Text> : null}
            </View>
            <Pressable onPress={close} disabled={!closable} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", marginTop: -10, marginRight: -10, opacity: closable ? 1 : 0.4 }}>
              <X size={20} color={c.grey500} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: space.side, paddingTop: 12, paddingBottom: 8, gap: 14 }}>
            {children}
          </ScrollView>
          {footer ? <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: space.side, paddingTop: 12, borderTopWidth: 1, borderColor: c.grey100 }}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** The web's Switch with its label and line: each phone's own control (docs/NATIVE.md). */
export function SwitchRow({ label, description, value, onChange, disabled }: {
  label: string; description?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[t.label, { color: c.ink900, ...face[600] }]}>{label}</Text>
        {description ? <Text style={[t.label, { color: c.grey500, lineHeight: 20 }]}>{description}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} disabled={disabled} accessibilityLabel={label}
        trackColor={{ false: c.grey300, true: c.orange }} thumbColor={c.white} ios_backgroundColor={c.grey300} />
    </View>
  );
}

/* ── Segmented, full width on a phone ────────────────────────────── */

export function Segmented<T extends string>({ value, onChange, options, label }: {
  value: T; onChange: (v: T) => void; options: readonly { value: T; label: string }[]; label: string;
}) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={{ flexDirection: "row", gap: 2, padding: 3, backgroundColor: c.grey100, borderRadius: 10 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value} onPress={() => onChange(o.value)} accessibilityRole="tab" accessibilityState={{ selected: on }} android_ripple={ripple}
            style={{
              flex: 1, minHeight: 44, paddingHorizontal: 8, borderRadius: 7, alignItems: "center", justifyContent: "center",
              backgroundColor: on ? c.white : "transparent",
              ...(on ? { shadowColor: c.ink900, shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : null),
            }}
          >
            <Text style={[t.label, { color: on ? c.ink900 : c.grey600, textAlign: "center" }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ── DataTable at phone width: a card per row, a labelled value per column ── */

/** The 12px capitals label over its 14px value, as the web's table cards draw a column at 390 px. */
export function Labelled({ label, value, strong, children }: { label: string; value?: string; strong?: boolean; children?: ReactNode }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={t.eyebrow}>{label}</Text>
      {children ?? <Text style={[body, { color: value === "-" ? c.grey500 : strong ? c.ink900 : c.grey700 }, t.tab]}>{value}</Text>}
    </View>
  );
}
/** A label left, its value right (Properties.tsx Line; a value that must be read whole wraps). */
export function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 1 }}>
      <Text style={[body, { color: c.grey500, lineHeight: 22 }]}>{label}</Text>
      <Text style={[body, t.tab, { flex: 1, textAlign: "right", color: c.grey700, lineHeight: 22 }]}>{value}</Text>
    </View>
  );
}

/* ── The states: loading, failed, offline, empty, refused ───────── */

const Box = ({ children, tint }: { children: ReactNode; tint?: boolean }) => (
  <View style={{ backgroundColor: tint ? c.yellow50 : c.white, borderRadius: 12, borderWidth: 1, borderColor: tint ? c.yellow100 : c.grey200, alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 }}>
    {children}
  </View>
);
const Disc = ({ children, bg }: { children: ReactNode; bg: string }) => (
  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: bg, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>{children}</View>
);

/** EmptyState: its own title and sentence. */
export function Empty({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <Box>
      <Disc bg={c.grey100}><Inbox size={20} color={c.grey400} /></Disc>
      <Text style={[t.heading, { textAlign: "center" }]}>{title}</Text>
      {description ? <Text style={[t.label, { color: c.grey500, marginTop: 6, textAlign: "center", lineHeight: 22 }]}>{description}</Text> : null}
      {action ? <View style={{ marginTop: 16 }}>{action}</View> : null}
    </Box>
  );
}

/** RequireAccess's page, in the web's words; or the API's own refusal. */
export function Refused({ title = "This page is not part of your role", sentence }: { title?: string; sentence: string }) {
  return (
    <Box>
      <Disc bg={c.grey100}><ShieldOff size={20} color={c.grey400} /></Disc>
      <Text style={[t.heading, { textAlign: "center" }]} accessibilityRole="header">{title}</Text>
      <Text style={[t.label, { color: c.grey600, marginTop: 6, textAlign: "center", lineHeight: 22 }]}>{sentence}</Text>
    </Box>
  );
}

/** ErrorState, with the server's words; or, with no line, that it is the line. */
export function Failed({ error, onRetry, title = "Something went wrong" }: { error: string; onRetry: () => void; title?: string }) {
  const off = !isOnline();
  return (
    <View accessibilityRole="alert">
      <Box tint={off}>
        <Disc bg={off ? c.yellow100 : c.red50}>{off ? <CloudOff size={20} color={c.yellow800} /> : <AlertCircle size={20} color={c.red} />}</Disc>
        <Text style={[t.heading, { textAlign: "center" }]}>{off ? "No connection" : title}</Text>
        <Text style={[t.label, { color: c.grey500, marginTop: 6, textAlign: "center", lineHeight: 22 }]}>
          {off ? "This has not been read on this phone yet. It shows once the line is back." : error}
        </Text>
        <View style={{ marginTop: 20 }}><Btn label="Try again" onPress={onRetry} icon={<RotateCw size={16} color={c.ink900} />} /></View>
      </Box>
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

/** The web's Skeleton: each phone's own spinner, and words a reader hears. */
export const Loading = ({ what }: { what: string }) => (
  <View style={{ minHeight: 120, borderRadius: 12, backgroundColor: c.grey100, alignItems: "center", justifyContent: "center", gap: 8, padding: space.cardX }}>
    <ActivityIndicator color={c.grey500} />
    <Text style={[t.label, { color: c.grey500 }]} accessibilityLiveRegion="polite">Reading {what}…</Text>
  </View>
);

/** The web's (i) line under a page: small grey words. */
export const Foot = ({ children }: { children: string }) => (
  <Text style={[t.caption, { lineHeight: 18 }]}>{children}</Text>
);
