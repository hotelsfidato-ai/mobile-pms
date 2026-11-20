import { AlertCircle, Check, ChevronDown, ChevronRight, CloudOff, X, type LucideIcon } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View,
  type KeyboardTypeOptions, type StyleProp, type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ROLE_LABELS, asRole } from "../../core/menu";
import { isOnline } from "../../core/offline";
import { c, face, space, t } from "../../core/theme";
import { Empty, body } from "./kit";

/* ══════════════════════════════════════════════════════════════════
   THE SET-UP SCREENS' PIECES (lane m13-config, 19 Nov): the web kit's
   Button, Dialog, Input, NativeSelect, Switch, StatusPill, DataTable at
   phone width and its states, ported with the core's tokens and the
   owner's native principles (docs/NATIVE.md): every sheet pads its own
   safe areas and lifts over the keyboard, on/off is each phone's own
   Switch, a destructive act is confirmed by each phone's own Alert, a
   press ripples on Android and shades on iPhone, 44 px targets.
   ══════════════════════════════════════════════════════════════════ */

const ripple = { color: c.grey200, borderless: false };
const shade = (pressed: boolean, on: string, off: string) => (pressed && Platform.OS === "ios" ? on : off);

/* ── Button ──────────────────────────────────────────────────────── */

export function Btn({ label, a11y, variant = "secondary", icon: Icon, onPress, disabled, grow, style }: {
  label: string; a11y?: string; variant?: "primary" | "secondary" | "ghost" | "danger"; icon?: LucideIcon;
  onPress: () => void; disabled?: boolean; grow?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const filled = variant === "primary" || variant === "danger";
  const fg = disabled ? (filled ? c.grey600 : c.grey500) : { primary: c.white, danger: c.white, secondary: c.ink900, ghost: c.grey600 }[variant];
  const bg = {
    primary: disabled ? c.grey300 : c.orange600,
    danger: disabled ? c.grey300 : c.red700,
    secondary: disabled ? c.grey50 : c.white,
    ghost: "transparent",
  }[variant];
  return (
    <Pressable
      onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={a11y ?? label}
      accessibilityState={{ disabled: Boolean(disabled) }} android_ripple={ripple}
      style={({ pressed }) => [{
        minHeight: 44, paddingHorizontal: label ? 16 : 0, minWidth: 44, borderRadius: 999, flexDirection: "row", gap: 8,
        alignItems: "center", justifyContent: "center", overflow: "hidden", ...(grow ? { flex: 1 } : null),
        backgroundColor: shade(pressed, variant === "primary" ? c.orange700 : variant === "danger" ? c.red : c.grey100, bg),
        borderWidth: variant === "secondary" ? 1 : 0, borderColor: disabled ? c.grey200 : c.grey300,
      }, style]}
    >
      {Icon ? <Icon size={16} color={fg} /> : null}
      {label ? <Text style={[t.label, { color: fg }]}>{label}</Text> : null}
    </Pressable>
  );
}

/** A control the API (or the phone) refuses: grey, the sentence under it (AGENTS rule 1). */
export function Refused({ label, reason, variant, icon }: { label: string; reason: string; variant?: "primary" | "secondary"; icon?: LucideIcon }) {
  return (
    <View style={{ gap: 4, alignItems: "flex-start" }}>
      <Btn label={label} variant={variant} icon={icon} disabled onPress={() => undefined} />
      <Text style={[t.caption, { color: c.grey600 }]}>{reason}</Text>
    </View>
  );
}

/** Each phone's own confirm (NATIVE.md), the web's words; `act` is the destructive button. */
export function confirm(title: string, message: string, act: string, onYes: () => void, keep = "Keep it") {
  Alert.alert(title, message, [
    { text: keep, style: "cancel" },
    { text: act, style: "destructive", onPress: onYes },
  ]);
}

/* ── The sheet: the web's Dialog, from the foot of the screen ───── */

export function Sheet({ title, under, onClose, children, foot }: {
  title: string; under?: string; onClose: () => void; children: ReactNode; foot?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: "rgba(3,23,40,0.4)", justifyContent: "flex-end" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <View style={{ backgroundColor: c.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "92%", paddingBottom: Math.max(insets.bottom, 16) }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingLeft: space.side, paddingRight: 8, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
            <View style={{ flex: 1, paddingVertical: 10, gap: 4 }}>
              <Text style={t.heading} accessibilityRole="header">{title}</Text>
              {under ? <Text style={[t.caption, { color: c.grey600 }]}>{under}</Text> : null}
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={4} android_ripple={{ ...ripple, borderless: true }}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
              <X size={18} color={c.grey500} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: space.side, paddingVertical: 16, gap: 16 }}>
            {children}
          </ScrollView>
          {foot ? <View style={{ paddingHorizontal: space.side, paddingTop: 12, gap: 8, borderTopWidth: 1, borderTopColor: c.grey100 }}>{foot}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ── Fields ──────────────────────────────────────────────────────── */

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.label, { color: c.grey700 }]}>{label}</Text>
      {children}
      {error ? <Text style={[t.caption, { color: c.red700 }]} accessibilityRole="alert">{error}</Text> : hint ? <Text style={t.caption}>{hint}</Text> : null}
    </View>
  );
}

/** The web's Input: 44 tall, 16px type, the right keyboard per field (NATIVE.md). */
export function TextBox({ label, value, onChangeText, keyboardType = "default", placeholder = "-", maxLength, caps, lines, disabled, big }: {
  label: string; value: string; onChangeText: (v: string) => void; keyboardType?: KeyboardTypeOptions;
  placeholder?: string; maxLength?: number; caps?: "characters" | "none" | "sentences" | "words"; lines?: number; disabled?: boolean; big?: boolean;
}) {
  const email = keyboardType === "email-address";
  return (
    <TextInput
      value={value} onChangeText={onChangeText} keyboardType={keyboardType} editable={!disabled} maxLength={maxLength}
      autoCapitalize={email ? "none" : caps ?? "sentences"} autoCorrect={!email && keyboardType === "default"}
      multiline={Boolean(lines)} numberOfLines={lines} accessibilityLabel={label} placeholder={placeholder} placeholderTextColor={c.grey400}
      style={{
        minHeight: lines ? 44 + (lines - 1) * 22 : 44, paddingHorizontal: 12, paddingVertical: lines ? 10 : 0, borderRadius: 10, borderWidth: 1, borderColor: c.grey300,
        textAlignVertical: lines ? "top" : "center", backgroundColor: disabled ? c.grey50 : c.white,
        fontSize: big ? 18 : 16, color: disabled ? c.grey500 : c.ink900, ...face[500], ...t.tab,
      }}
    />
  );
}

/** The web's NativeSelect: its choices open from the foot of the screen, safe areas kept. */
export function Select({ label, value, options, onChange, placeholder = "Choose…", disabled }: {
  label: string; value: string; options: readonly { value: string; label: string }[]; onChange: (v: string) => void; placeholder?: string; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const shown = options.find((o) => o.value === value)?.label;
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)} disabled={disabled} accessibilityRole="button" accessibilityLabel={`${label}: ${shown ?? placeholder}`}
        android_ripple={ripple}
        style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 12, paddingRight: 10, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, backgroundColor: disabled ? c.grey50 : c.white, overflow: "hidden" }}
      >
        <Text style={{ flex: 1, fontSize: 16, color: shown ? c.ink900 : c.grey400, ...face[500] }} numberOfLines={1}>{shown ?? placeholder}</Text>
        <ChevronDown size={16} color={c.grey500} />
      </Pressable>
      <Modal visible={open} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(3,23,40,0.4)" }}>
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Close" />
          <View style={{ backgroundColor: c.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: space.side, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 16), maxHeight: "75%" }}>
            <Text style={[t.heading, { marginBottom: 8 }]} accessibilityRole="header">{label}</Text>
            <ScrollView>
              {options.map((o) => (
                <Pressable
                  key={o.value} onPress={() => { onChange(o.value); setOpen(false); }} android_ripple={ripple}
                  accessibilityRole="button" accessibilityLabel={o.label} accessibilityState={{ selected: o.value === value }}
                  style={({ pressed }) => ({ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: c.grey100, backgroundColor: shade(pressed, c.grey50, c.white) })}
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

/** On or off: each phone's own Switch (NATIVE.md), the web's label and its line under it. */
export function SwitchLine({ label, hint, on, onChange, disabled }: { label: string; hint?: string; on: boolean; onChange: (on: boolean) => void; disabled?: boolean }) {
  return (
    <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[t.label, { color: c.ink900 }]}>{label}</Text>
        {hint ? <Text style={[t.caption, { color: c.grey500 }]}>{hint}</Text> : null}
      </View>
      <Switch value={on} onValueChange={onChange} disabled={disabled} accessibilityLabel={label}
        trackColor={{ false: c.grey300, true: c.orange600 }} thumbColor={Platform.OS === "android" ? c.white : undefined} ios_backgroundColor={c.grey300} />
    </View>
  );
}

/* ── StatusPill ──────────────────────────────────────────────────── */

export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "accent";
/* StatusPill.tsx TONES and DOT_TONES, from theme.css. */
const PILL: Record<Tone, { bg: string; fg: string; dot: string }> = {
  neutral: { bg: c.grey100, fg: c.grey600, dot: c.grey400 },
  info: { bg: c.info50, fg: c.info, dot: c.info },
  success: { bg: c.success50, fg: c.success600, dot: c.success },
  warning: { bg: c.yellow50, fg: c.yellow800, dot: c.yellow },
  danger: { bg: c.red50, fg: c.red700, dot: c.red },
  accent: { bg: c.orange50, fg: c.orange700, dot: c.orange },
};
export function Pill({ tone = "neutral", children, dot = true }: { tone?: Tone; children: string; dot?: boolean }) {
  const p = PILL[tone];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: p.bg }}>
      {dot ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.dot }} /> : null}
      <Text style={{ fontSize: 12, lineHeight: 17, color: p.fg, ...face[500] }}>{children}</Text>
    </View>
  );
}

/* ── The web's DataTable at phone width: one card, a block per row ── */

/** The table's frame: one white card, a hairline between rows. */
export function Table({ children }: { children: ReactNode }) {
  return <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, overflow: "hidden" }}>{children}</View>;
}

/** One row: its title, its labelled cells (capitals, grey), the actions under them; an
    arrow where the row opens (the Tappable Rule), only for somebody who may. */
export function TableRow({ title, sub, cells, actions, onPress, a11y, first }: {
  title: string; sub?: string | null; cells: { label: string; value: ReactNode }[]; actions?: ReactNode;
  onPress?: () => void; a11y?: string; first?: boolean;
}) {
  const inner = (
    <View style={{ paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 8, borderTopWidth: first ? 0 : 1, borderTopColor: c.grey200 }}>
      <View>
        <Text style={[t.label, face[500], { color: c.ink900, fontSize: 16 }]}>{title}</Text>
        {sub ? <Text style={[t.label, { color: c.grey600, fontSize: 16 }]}>{sub}</Text> : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ flex: 1, gap: 6 }}>
          {cells.map((cell) => (
            <View key={cell.label} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={[t.caption, { width: 108, textTransform: "uppercase", letterSpacing: 0.3 }]}>{cell.label}</Text>
              <View style={{ flex: 1 }}>{typeof cell.value === "string" ? <Text style={[t.label, t.tab, { color: c.ink900 }]}>{cell.value}</Text> : cell.value}</View>
            </View>
          ))}
        </View>
        {onPress ? <ChevronRight size={16} color={c.grey400} /> : null}
      </View>
      {actions ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingLeft: 120 }}>{actions}</View> : null}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y ?? title} android_ripple={ripple}
      style={({ pressed }) => ({ backgroundColor: shade(pressed, c.grey50, c.white) })}>
      {inner}
    </Pressable>
  );
}

/** A section's head: its heading, and its action beside it (the web's Section). */
export function SectionHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: space.section - space.card }}>
      <Text style={[t.heading, { flex: 1, fontSize: 18 }]} accessibilityRole="header">{title}</Text>
      {action}
    </View>
  );
}

/* ── The states ──────────────────────────────────────────────────── */

/** Loading: each phone's own spinner (NATIVE.md), with the words. */
export function Loading({ words }: { words: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 }} accessibilityLiveRegion="polite">
      <ActivityIndicator color={c.orange} />
      <Text style={t.label}>{words}</Text>
    </View>
  );
}

/** A read that failed (the web's ErrorState); with no line, that it is the line. */
export function Failed({ title, what, error, onRetry }: { title: string; what: string; error: string; onRetry: () => void }) {
  const off = !isOnline();
  return (
    <View accessibilityRole="alert" style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, backgroundColor: off ? c.yellow50 : c.white, borderColor: off ? c.yellow100 : c.grey200 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: off ? c.yellow100 : c.red50, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        {off ? <CloudOff size={20} color={c.yellow800} /> : <AlertCircle size={20} color={c.red} />}
      </View>
      <Text style={[t.heading, { textAlign: "center" }]}>{off ? "No connection" : title}</Text>
      <Text style={[body, { color: c.grey500, marginTop: 6, textAlign: "center" }]}>
        {off ? `${what} have not been read on this phone yet. They show once the line is back.` : error}
      </Text>
      <View style={{ marginTop: 20 }}><Btn label="Try again" onPress={onRetry} /></View>
    </View>
  );
}

/** RequireAccess's page (src/components/app/RequireAccess.tsx): a role the web's
    menu does not give this screen; its words, as stores/kit.tsx NotYourRole. */
export function NotYourRole({ role, screen }: { role: string | null; screen: string }) {
  const name = role ? ROLE_LABELS[asRole(role)] : "nobody here";
  return (
    <Empty title="This page is not part of your role"
      description={`You are signed in as ${name}, which does not include ${screen}. If you need it, the person who set up your account can change your role.`} />
  );
}
