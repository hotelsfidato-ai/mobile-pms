import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, X } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View,
  type StyleProp, type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, HeldError, outcomeUnknown, send } from "../../core/api";
import { c, face, space, t } from "../../core/theme";
import { Card, notKnown } from "../../core/ui";
import { SaidBar, ty, type Said } from "./TablesKit";

/* ══════════════════════════════════════════════════════════════════
   THE PIECES RESTAURANT SETUP AND THE MENU SHARE (m13-pos-setup, 19 Nov) —
   after the web kit (src/components/ui: Button, Dialog, Field, Input,
   Checkbox → the phone's Switch, Segmented, NativeSelect → a chooser sheet,
   StatusPill, the toast), drawn the way docs/NATIVE.md asks: safe areas in
   every sheet, the keyboard lifted and of the right kind, each phone's own
   Switch, ripple on Android, 44 px to the touch.
   ══════════════════════════════════════════════════════════════════ */

const ripple = Platform.OS === "android" ? { color: c.grey200 } : undefined;
const pressedShade = (pressed: boolean, base: string, shade: string) => (pressed && Platform.OS === "ios" ? shade : base);

/** A button. `why`: refused for this person - grey, and a tap says why (never hidden). */
export function Btn({ label, onPress, kind = "secondary", Icon, why, onRefused, busy, off, a11y, small, grow, style }: {
  label: string; onPress: () => void; kind?: "primary" | "secondary" | "ghost"; Icon?: LucideIcon;
  why?: string | null; onRefused?: (why: string) => void; busy?: boolean; off?: boolean; a11y?: string;
  small?: boolean; grow?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const grey = Boolean(off) || why != null;
  const fg = grey ? c.grey500 : kind === "primary" ? c.white : c.ink900;
  const bg = kind === "primary" ? (grey ? c.grey200 : c.orange600) : kind === "secondary" ? (grey ? c.grey100 : c.white) : "transparent";
  return (
    <Pressable
      onPress={() => (off || busy ? undefined : why != null ? onRefused?.(why) : onPress())}
      accessibilityRole="button" accessibilityLabel={a11y ?? label}
      accessibilityState={{ disabled: grey, busy: Boolean(busy) }} accessibilityHint={why ?? undefined}
      android_ripple={ripple}
      style={({ pressed }) => [{
        minHeight: 44, paddingHorizontal: small ? 12 : 16, borderRadius: 999, overflow: "hidden",
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
        borderWidth: kind === "secondary" ? 1 : 0, borderColor: grey ? c.grey200 : c.grey300,
        backgroundColor: pressedShade(pressed && !grey, bg, kind === "primary" ? c.orange700 : c.grey100),
        opacity: busy ? 0.6 : 1, ...(grow ? { flexGrow: 1 } : {}),
      }, style]}
    >
      {busy ? <ActivityIndicator size="small" color={fg} /> : Icon ? <Icon size={16} color={fg} /> : null}
      <Text style={[small ? ty.sm : ty.md, face[500], { color: fg }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

/** A link in the web's orange-700, 44 px tall to the touch. `why`: greyed with its reason. */
export function LinkBtn({ label, onPress, why, onRefused }: { label: string; onPress: () => void; why?: string | null; onRefused?: (why: string) => void }) {
  return (
    <Pressable
      onPress={() => (why != null ? onRefused?.(why) : onPress())} accessibilityRole="link" accessibilityLabel={label}
      accessibilityHint={why ?? undefined} accessibilityState={{ disabled: why != null }} hitSlop={8}
      style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}
    >
      <Text style={[t.label, ty.sm, { color: why != null ? c.grey500 : c.orange700, ...face[500] }]}>{label}</Text>
    </Pressable>
  );
}

/** A section of the page: its 16 px heading and the sentence under it (the web's Section). */
export function Part({ title, about, children, action }: { title: string; about?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <View style={{ gap: space.card, marginTop: space.section - space.card }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[t.heading, ty.md]} accessibilityRole="header">{title}</Text>
          {about ? <Text style={[t.label, ty.sm, { color: c.grey600 }]}>{about}</Text> : null}
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.label, ty.sm, { color: c.grey700 }]}>{label}</Text>
      {children}
      {error ? <Text style={[t.caption, ty.xs, { color: c.red700 }]} accessibilityRole="alert">{error}</Text>
        : hint ? <Text style={[t.caption, ty.xs]}>{hint}</Text> : null}
    </View>
  );
}

/** A typing box: the right keyboard per field (NATIVE.md), 44 px, 16 px type. */
export function Input({ value, onChange, label, keys = "text", placeholder, off, maxLength, autoFocus, onDone, caps, style }: {
  value: string; onChange: (v: string) => void; label: string; keys?: "text" | "decimal" | "number";
  placeholder?: string; off?: boolean; maxLength?: number; autoFocus?: boolean; onDone?: () => void; caps?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TextInput
      value={value} onChangeText={onChange} accessibilityLabel={label} placeholder={placeholder} editable={!off}
      maxLength={maxLength} autoFocus={autoFocus} onSubmitEditing={onDone} returnKeyType={onDone ? "done" : "default"}
      keyboardType={keys === "decimal" ? "decimal-pad" : keys === "number" ? "number-pad" : "default"}
      inputMode={keys === "decimal" ? "decimal" : keys === "number" ? "numeric" : "text"}
      autoCapitalize={caps ? "characters" : "sentences"}
      placeholderTextColor={c.grey400}
      style={[{
        minHeight: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: c.grey300,
        backgroundColor: off ? c.grey50 : c.white, ...face[500], fontSize: 16, color: off ? c.grey500 : c.ink900,
        ...(keys === "text" ? {} : { fontVariant: ["tabular-nums"] }),
      }, style as object]}
    />
  );
}

/** On or off: each phone's own Switch (NATIVE.md), the web's Checkbox / Switch words beside it. */
export function Toggle({ label, about, on, onChange, why, onRefused }: {
  label: string; about?: string; on: boolean; onChange: (v: boolean) => void; why?: string | null; onRefused?: (why: string) => void;
}) {
  const grey = why != null;
  return (
    <Pressable
      onPress={() => (grey ? onRefused?.(why!) : onChange(!on))} accessibilityRole="switch" accessibilityLabel={label}
      accessibilityState={{ checked: on, disabled: grey }} accessibilityHint={why ?? undefined}
      style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 12 }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[t.label, ty.md, { color: grey ? c.grey500 : c.ink900 }]}>{label}</Text>
        {about ? <Text style={[t.caption, ty.sm, { color: c.grey600 }]}>{about}</Text> : null}
      </View>
      <Switch
        value={on} disabled={grey} onValueChange={onChange}
        trackColor={{ false: c.grey300, true: c.orange600 }} thumbColor={Platform.OS === "android" ? c.white : undefined}
        ios_backgroundColor={c.grey300} accessibilityLabel={label}
      />
    </Pressable>
  );
}

/** The web's Segmented: one of a few, the chosen one white on grey-100. */
export function Seg<T extends string>({ value, options, onPick, label, why, onRefused }: {
  value: T; options: readonly { value: T; label: string }[]; onPick: (v: T) => void; label: string;
  why?: string | null; onRefused?: (why: string) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label}
      style={{ flexDirection: "row", alignSelf: "flex-start", backgroundColor: c.grey100, borderRadius: 10, padding: 3, gap: 2 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value} onPress={() => (why != null ? onRefused?.(why) : onPick(o.value))}
            accessibilityRole="radio" accessibilityState={{ checked: on, disabled: why != null }} accessibilityLabel={o.label}
            style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 8, justifyContent: "center",
              backgroundColor: on ? c.white : "transparent", borderWidth: on ? 1 : 0, borderColor: c.grey200 }}
            hitSlop={{ top: 2, bottom: 2 }}
          >
            <Text style={[t.label, ty.sm, { color: on ? c.ink900 : c.grey600 }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A choice of several in a row of rings, the web's orange when chosen (Variations' types, the promotion's kind). */
export function Ring({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={label} android_ripple={ripple}
      style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, justifyContent: "center", overflow: "hidden",
        borderColor: on ? c.orange : c.grey300, backgroundColor: on ? c.orange50 : c.white }}
    >
      <Text style={[t.label, ty.md, { color: on ? c.orange700 : c.grey700 }]}>{label}</Text>
    </Pressable>
  );
}

/** The web's StatusPill. */
export function Pill({ tone, text }: { tone: "neutral" | "success" | "warning" | "danger"; text: string }) {
  const look = {
    neutral: { bg: c.grey100, fg: c.grey600 }, success: { bg: c.success50, fg: c.success600 },
    warning: { bg: c.yellow50, fg: c.yellow800 }, danger: { bg: c.red50, fg: c.red700 },
  }[tone];
  return (
    <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: look.bg }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: look.fg }} />
      <Text style={[t.caption, ty.xs, { color: look.fg, ...face[500] }]}>{text}</Text>
    </View>
  );
}

/* ── A sheet from the bottom (the web's Dialog at phone width) ───────
   Safe areas (NATIVE.md): the home indicator's height under the buttons,
   the status bar left clear; the keyboard lifts it; back closes it. */
export function Sheet({ open, onClose, title, about, children, footer }: {
  open: boolean; onClose: () => void; title: string; about?: string; children?: ReactNode; footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent statusBarTranslucent animationType={Platform.OS === "web" ? "none" : "slide"} onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={{ flex: 1, backgroundColor: "rgba(3,23,40,0.4)", paddingTop: insets.top + 24 }}>
          <Pressable style={{ flex: 1, minHeight: 48 }} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
          <View style={{ backgroundColor: c.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "100%" }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: space.side, paddingTop: 18, paddingBottom: 10 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[t.heading, ty.md]} accessibilityRole="header">{title}</Text>
                {about ? <Text style={[t.label, ty.sm, { color: c.grey600 }]}>{about}</Text> : null}
              </View>
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}
                style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", marginTop: -10, marginRight: -12 }}>
                <X size={18} color={c.grey500} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: space.side, paddingBottom: 16, gap: 14 }}>
              {children}
            </ScrollView>
            {footer ? (
              <View style={{ paddingHorizontal: space.side, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 16), gap: 8, borderTopWidth: 1, borderTopColor: c.grey100, backgroundColor: c.grey50 }}>
                {footer}
              </View>
            ) : <View style={{ height: Math.max(insets.bottom, 16) }} />}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** The web's NativeSelect on a phone: the choice shown in a box; a tap opens the list. */
export function Chooser<T extends string | null>({ label, value, options, onPick, why, onRefused, wide }: {
  label: string; value: T; options: readonly { value: T; label: string; off?: boolean }[]; onPick: (v: T) => void;
  why?: string | null; onRefused?: (why: string) => void; wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const chosen = options.find((o) => o.value === value)?.label ?? "Not set";
  return (
    <>
      <Pressable
        onPress={() => (why != null ? onRefused?.(why) : setOpen(true))} accessibilityRole="button" accessibilityLabel={`${label}: ${chosen}`}
        accessibilityHint={why ?? undefined} accessibilityState={{ disabled: why != null }} android_ripple={ripple}
        style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, overflow: "hidden",
          backgroundColor: why != null ? c.grey50 : c.white, flexDirection: "row", alignItems: "center", gap: 8,
          ...(wide ? { alignSelf: "stretch" } : { alignSelf: "flex-start", minWidth: 148 }) }}
      >
        <Text style={[t.label, ty.md, { flex: 1, color: why != null ? c.grey500 : c.ink900 }]} numberOfLines={1}>{chosen}</Text>
        <ChevronDown size={16} color={c.grey500} />
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        {options.map((o) => (
          <Pressable
            key={String(o.value)} disabled={o.off} onPress={() => { setOpen(false); if (o.value !== value) onPick(o.value); }}
            accessibilityRole="radio" accessibilityState={{ checked: o.value === value, disabled: Boolean(o.off) }} android_ripple={ripple}
            style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: c.grey100 }}
          >
            <Text style={[t.label, ty.md, { flex: 1, color: o.off ? c.grey400 : c.ink900 }]}>{o.label}</Text>
            {o.value === value ? <Check size={18} color={c.orange700} /> : null}
          </Pressable>
        ))}
      </Sheet>
    </>
  );
}

/* ── Every write on these screens (MEMORY 8, 16; BRIEF-T3) ──────────
   One tap is one write: latched at the tap. Done: said, and every read of
   the restaurant at this hotel asked again (Tables reads the same rows).
   Held (the web's tiers): said as held. Refused: the server's own words.
   Not known (nothing came back, or a 5xx): said so, and that control takes
   no more taps until the page is pulled down and read again - these
   routes read no key, so a second tap could make a second section, a
   second dish, or flip a dish back on. */

export type Words = { done: string; doneBody?: string; not: string; what: string; where: string };
export type Ran = "done" | "held" | "refused" | "unknown";

export function useActs(code: string) {
  const cache = useQueryClient();
  const latch = useRef(new Set<string>());
  const [busy, setBusy] = useState<string | null>(null);
  const [stuck, setStuck] = useState<Record<string, string>>({});
  const [said, setSaid] = useState<Said | null>(null);
  async function run(id: string, method: "POST" | "PUT" | "PATCH", path: string, body: unknown, w: Words): Promise<Ran> {
    if (latch.current.has(id) || stuck[id]) return "refused";
    latch.current.add(id);
    setBusy(id);
    try {
      await send(method, path, body);
      /* An empty `done`: the web says nothing on success (a dish added, taken off): the list shows it. */
      if (w.done) setSaid({ title: w.done, ...(w.doneBody ? { body: w.doneBody } : {}), tone: "ok" });
      else setSaid(null);
      void cache.invalidateQueries({ queryKey: ["pos", code] });
      return "done";
    } catch (e) {
      if (e instanceof HeldError) { setSaid({ title: "Saved on this phone", body: e.message, tone: "held" }); return "held"; }
      if (outcomeUnknown(e)) {
        const n = notKnown(w.what, w.where, e);
        setStuck((s) => ({ ...s, [id]: n.line }));
        setSaid({ title: n.title, body: `${n.body} Pull down to read it again.`, tone: "bad" });
        return "unknown";
      }
      setSaid({ title: w.not, body: e instanceof ApiError ? e.message : String(e), tone: "bad" });
      return "refused";
    } finally {
      latch.current.delete(id);
      setBusy(null);
    }
  }
  return {
    run, busy, said, setSaid,
    /** Why this control takes no taps now: the API's own sentence first, then "not known". */
    why: (id: string, refusal?: string | null) => refusal ?? stuck[id] ?? null,
    /** Pulled down: the page is read again, so a repeat is on purpose. */
    unstick: () => setStuck({}),
    /** A greyed control tapped: its reason, as it is. */
    refused: (why: string) => setSaid({ title: why, tone: "bad" }),
  };
}
export type Acts = ReturnType<typeof useActs>;

/** A small capital heading ("VARIATION", "SIDES"). */
export function Caps({ children }: { children: ReactNode }) {
  return <Text style={[t.caption, ty.xs, { ...face[600], textTransform: "uppercase", letterSpacing: 0.4, color: c.grey500 }]}>{children}</Text>;
}

/** A card's hairline between rows. */
export const Rule = () => <View style={{ height: 1, backgroundColor: c.grey100 }} />;

/** Reading, with what. */
export function Loading({ what }: { what: string }) {
  return (
    <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 20 }}>
      <ActivityIndicator color={c.orange} />
      <Text style={[t.label, ty.sm]}>Reading {what}…</Text>
    </Card>
  );
}

/** One name in a sheet: a section renamed, a KOT kind added or renamed (the web's NameDialog, KindDialog). */
export function NameSheet({ title, about, initial, save, onClose, id, acts, why, label = "Name", hint, placeholder, ready }: {
  title: string; about?: string; initial: string; save: (name: string) => Promise<string>; onClose: () => void;
  id: string; acts: Acts; why?: string | null; label?: string; hint?: string; placeholder?: string; ready?: (name: string) => boolean;
}) {
  const [name, setName] = useState(initial);
  const ok = ready ? ready(name) : name.trim() !== "";
  return (
    <Sheet open onClose={onClose} title={title} about={about}
      footer={<View style={{ flexDirection: "row", gap: 8 }}>
        <Btn label="Cancel" grow onPress={onClose} />
        <Btn label="Save" kind="primary" grow off={!ok} busy={acts.busy === id} why={acts.why(id, why)} onRefused={acts.refused}
          onPress={async () => { if ((await save(name.trim())) === "done") onClose(); }} />
      </View>}
    >
      <Field label={label} hint={hint}><Input label={label} value={name} onChange={setName} placeholder={placeholder} autoFocus /></Field>
      {acts.said && acts.said.tone !== "ok" ? <SaidBar said={acts.said} onDone={() => acts.setSaid(null)} /> : null}
    </Sheet>
  );
}
