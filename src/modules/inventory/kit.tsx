import { AlertCircle, Check, ChevronDown, CloudOff, Inbox, Minus, Plus, RotateCw, X, type LucideIcon } from "lucide-react-native";
import { useEffect, useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions,
  type StyleProp, type ViewStyle,
} from "react-native";
import { HeldError } from "../../core/api";
import { isOnline } from "../../core/offline";
import { c, face, space, t } from "../../core/theme";
import { dateShort } from "./rates";

/* ══════════════════════════════════════════════════════════════════
   THE WEB KIT'S PIECES RATES USES — src/components/ui (Button, Segmented,
   Dialog, Field, Input, NativeSelect, Checkbox, States, toast), ported
   for a phone with the core's tokens (src/core/theme.ts, a copy of
   theme.css). Touch targets 44 or more; every icon button is labelled.
   ══════════════════════════════════════════════════════════════════ */

/** The web's text-sm on a 21 line. */
export const body = { ...t.label, lineHeight: 21 };

/** Said, not only seen (the web's toast). */
export type Said = { title: string; body?: string; tone: "ok" | "held" | "bad" };
/** A held change is never a failure (none of these writes is held: the web lists none). */
export const saidOf = (title: string, e: unknown): Said =>
  e instanceof HeldError ? { title: "Saved on this phone", body: e.message, tone: "held" }
    : { title, body: e instanceof Error ? e.message : String(e), tone: "bad" };

const SAID = {
  ok: { bg: c.ink900, ring: c.ink900, fg: c.white },
  held: { bg: c.yellow50, ring: c.yellow100, fg: c.yellow800 },
  bad: { bg: c.red50, ring: c.red100, fg: c.red700 },
};

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
      style={{ position: "absolute", left: space.side, right: space.side, bottom: 16, borderRadius: 12, borderWidth: 1, paddingHorizontal: space.cardX, paddingVertical: 12, gap: 2, backgroundColor: tone.bg, borderColor: tone.ring }}
    >
      <Text style={[t.label, face[600], { color: tone.fg }]}>{said.title}</Text>
      {said.body ? <Text style={[t.caption, { color: tone.fg }]}>{said.body}</Text> : null}
    </Pressable>
  );
}

/** What the server refused, inside the dialog, which stays open. */
export function InDialog({ said }: { said: Said | null }) {
  if (!said) return null;
  return (
    <View accessibilityRole="alert" style={{ gap: 2, padding: 12, borderRadius: 8, backgroundColor: SAID[said.tone].bg }}>
      <Text style={[t.label, face[600], { color: SAID[said.tone].fg }]}>{said.title}</Text>
      {said.body ? <Text style={[t.caption, { color: c.grey700 }]}>{said.body}</Text> : null}
    </View>
  );
}

/* ── Button ──────────────────────────────────────────────────────── */

export function Btn({ label, a11y, variant = "secondary", icon: Icon, onPress, disabled, grow, style }: {
  label: string; a11y?: string; variant?: "primary" | "secondary" | "ghost"; icon?: LucideIcon;
  onPress: () => void; disabled?: boolean; grow?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const fg = disabled ? (variant === "primary" ? c.grey600 : c.grey500) : { primary: c.white, secondary: c.ink900, ghost: c.grey600 }[variant];
  return (
    <Pressable
      onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={a11y ?? label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [{
        minHeight: 44, paddingHorizontal: label ? 16 : 0, minWidth: 44, borderRadius: 999, flexDirection: "row", gap: 8,
        alignItems: "center", justifyContent: "center", ...(grow ? { flex: 1 } : null),
        backgroundColor: {
          primary: disabled ? c.grey300 : pressed ? c.orange700 : c.orange600,
          secondary: disabled ? c.grey50 : pressed ? c.grey100 : c.white,
          ghost: pressed ? c.grey200 : "transparent",
        }[variant],
        borderWidth: variant === "secondary" ? 1 : 0, borderColor: disabled ? c.grey200 : c.grey300,
      }, style]}
    >
      {Icon ? <Icon size={16} color={fg} /> : null}
      {label ? <Text style={[t.label, { color: fg }]}>{label}</Text> : null}
    </Pressable>
  );
}

/** A control the API (or the phone) would refuse: grey, the sentence under it (AGENTS rule 1). */
export function Refused({ label, reason, variant }: { label: string; reason: string; variant?: "primary" | "secondary" }) {
  return (
    <View style={{ gap: 4, alignItems: "flex-start" }}>
      <Btn label={label} variant={variant} disabled onPress={() => undefined} />
      <Text style={[t.caption, { color: c.grey600 }]}>{reason}</Text>
    </View>
  );
}

/* ── Segmented: full width on a phone (Rates.tsx max-sm:w-full) ──── */

export function Segmented<T extends string>({ value, onChange, options, label }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string;
}) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={{ flexDirection: "row", gap: 2, padding: 3, backgroundColor: c.grey100, borderRadius: 10 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value} onPress={() => onChange(o.value)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={{
              flex: 1, minHeight: 44, paddingHorizontal: 12, borderRadius: 7, alignItems: "center", justifyContent: "center",
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
}

/* ── The states ──────────────────────────────────────────────────── */

export function Empty({ title, description }: { title: string; description?: string }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 48, paddingHorizontal: 24, backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.grey100, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Inbox size={20} color={c.grey400} />
      </View>
      <Text style={[t.heading, { textAlign: "center" }]}>{title}</Text>
      {description ? <Text style={[body, { color: c.grey500, marginTop: 6, textAlign: "center" }]}>{description}</Text> : null}
    </View>
  );
}

/** A read that failed: the web's ErrorState; with no line, that it is the line. */
export function Failed({ title, error, onRetry }: { title: string; error: string; onRetry: () => void }) {
  const off = !isOnline();
  return (
    <View accessibilityRole="alert" style={{ alignItems: "center", paddingVertical: 48, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, backgroundColor: off ? c.yellow50 : c.white, borderColor: off ? c.yellow100 : c.grey200 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: off ? c.yellow100 : c.red50, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        {off ? <CloudOff size={20} color={c.yellow800} /> : <AlertCircle size={20} color={c.red} />}
      </View>
      <Text style={[t.heading, { textAlign: "center" }]}>{off ? "No connection" : title}</Text>
      <Text style={[body, { color: c.grey500, marginTop: 6, textAlign: "center" }]}>
        {off ? "The rates have not been read on this phone yet. They show once the line is back." : error}
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

/* ── The web's Dialog, its fields ────────────────────────────────── */

export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const { height } = useWindowDimensions();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: "rgba(3,23,40,0.25)", justifyContent: "center", paddingHorizontal: 16 }}>
        <Pressable style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }} onPress={onClose} accessibilityLabel="Close" />
        <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, maxHeight: height - 64 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingLeft: 20, paddingRight: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
            <Text style={[t.heading, { flex: 1, paddingVertical: 10 }]} accessibilityRole="header">{title}</Text>
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

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.label, { color: c.grey700 }]}>{label}</Text>
      {children}
      {hint ? <Text style={t.caption}>{hint}</Text> : null}
    </View>
  );
}

/** The web's Input: 44 on a touch screen, 16px type; `big` its text-lg price. */
export function Input({ label, value, onChangeText, keyboardType, disabled, big, autoFocus }: {
  label: string; value: string; onChangeText: (v: string) => void; keyboardType: "decimal-pad" | "number-pad";
  disabled?: boolean; big?: boolean; autoFocus?: boolean;
}) {
  return (
    <TextInput
      value={value} onChangeText={onChangeText} keyboardType={keyboardType} editable={!disabled} autoFocus={autoFocus}
      accessibilityLabel={label} placeholder="-" placeholderTextColor={c.grey400}
      style={{
        minHeight: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: c.grey300,
        backgroundColor: disabled ? c.grey50 : c.white, fontSize: big ? 18 : 16, color: disabled ? c.grey500 : c.ink900, ...face[500], ...t.tab,
      }}
    />
  );
}

/** The web's NativeSelect: a field whose choices open from the foot of the screen. */
export function Select({ label, value, options, onChange }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void;
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
          <View style={{ backgroundColor: c.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: space.side, paddingTop: 16, paddingBottom: 24, maxHeight: "75%" }}>
            <Text style={[t.heading, { marginBottom: 8 }]} accessibilityRole="header">{label}</Text>
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

/** The web's Checkbox with its label: a 20px box, the whole line 44 tall. */
export function Tick({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!on)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label}
      style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "flex-start" }}>
      <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: on ? c.orange600 : c.grey300, backgroundColor: on ? c.orange600 : c.white, alignItems: "center", justifyContent: "center" }}>
        {on ? <Check size={14} color={c.white} /> : null}
      </View>
      <Text style={[t.label, { color: c.ink900 }]}>{label}</Text>
    </Pressable>
  );
}

/** A restriction's big toggle (RestrictionDialog Toggle): navy when on. */
export function Toggle({ label, hint, on, onChange }: { label: string; hint: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!on)} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={label}
      style={{ minHeight: 56, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 12,
        backgroundColor: on ? c.ink900 : c.white, borderColor: on ? c.ink900 : c.grey300 }}>
      <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 1, alignItems: "center", justifyContent: "center",
        backgroundColor: on ? "rgba(255,255,255,0.2)" : "transparent", borderColor: on ? "rgba(255,255,255,0.4)" : c.grey300 }}>
        {on ? <Check size={14} color={c.white} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[t.label, { color: on ? c.white : c.ink900 }]}>{label}</Text>
        <Text style={[t.caption, { color: on ? c.onNavy : c.grey500 }]}>{hint}</Text>
      </View>
    </Pressable>
  );
}

/** A day, stepped (M-7: no date-picker package; the web has a date input). Never below `min`. */
export function DayStep({ label, value, min, onChange, step }: {
  label: string; value: string; min?: string; onChange: (date: string) => void; step: (date: string, n: number) => string;
}) {
  const low = min != null && value <= min;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <StepBtn icon={Minus} a11y={`${label}: a day earlier`} disabled={low} onPress={() => onChange(step(value, -1))} />
      <Text style={[t.label, t.tab, { flex: 1, textAlign: "center", color: c.ink900 }]} accessibilityLiveRegion="polite">{dateShort(value)}</Text>
      <StepBtn icon={Plus} a11y={`${label}: a day later`} onPress={() => onChange(step(value, 1))} />
    </View>
  );
}

function StepBtn({ icon: Icon, a11y, disabled, onPress }: { icon: LucideIcon; a11y: string; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={a11y} accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center",
        borderColor: disabled ? c.grey200 : c.grey300, backgroundColor: disabled ? c.grey50 : pressed ? c.grey100 : c.white })}>
      <Icon size={18} color={disabled ? c.grey300 : c.grey700} />
    </Pressable>
  );
}
