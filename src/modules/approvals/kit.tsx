import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { AlertCircle, CheckCircle2, CloudOff, RotateCw } from "lucide-react-native";
import { useCallback, useEffect, type ReactNode } from "react";
import { AppState, Pressable, Text, TextInput, View } from "react-native";
import { HeldError } from "../../core/api";
import { isOnline } from "../../core/offline";
import { c, face, space, t } from "../../core/theme";

/* ══════════════════════════════════════════════════════════════════
   THE WEB KIT'S PIECES APPROVALS USES, ported from src/components/ui
   (StatusPill.tsx, Misc.tsx Segmented, Button.tsx, Input.tsx Field and
   Textarea, States.tsx, Toast.tsx) with the tokens of src/styles/theme.css
   through the core's theme. Guest services' kit has most of these; it is
   another module's, so the few this screen needs are its own (MODULE.md).
   ══════════════════════════════════════════════════════════════════ */

/** The web's text-sm and text-base: 14 on 21. */
export const body = { ...t.label, lineHeight: 21 };

/** Said, not only seen (the web's toast). */
export type Said = { title: string; tone: "ok" | "held" | "bad" };
/** A held change is never a failure; anything else is the server's (or the web's offline) sentence. */
export const saidOf = (e: unknown): Said =>
  e instanceof HeldError ? { title: e.message, tone: "held" } : { title: e instanceof Error ? e.message : String(e), tone: "bad" };

/** The web's refetchInterval while on screen, not in the background
    (a phone in a pocket is nobody's screen). */
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
        paddingHorizontal: space.cardX, paddingVertical: 12, backgroundColor: tone.bg, borderColor: tone.ring,
      }}
    >
      <Text style={[t.label, { ...face[600], color: tone.fg, lineHeight: 20 }]}>{said.title}</Text>
    </Pressable>
  );
}

/* ── StatusPill: a soft tint, a dot, never a ring ─────────────────── */

export type Tone = "warning" | "success" | "danger";
const PILL: Record<Tone, { bg: string; fg: string; dot: string }> = {
  warning: { bg: c.yellow50, fg: c.yellow800, dot: c.yellow },
  success: { bg: c.success50, fg: c.success600, dot: c.success },
  /* red-700, not red: #e0301e on this tint is 3.98:1 (StatusPill.tsx). */
  danger: { bg: c.red50, fg: c.red700, dot: c.red },
};
export function Pill({ tone, children }: { tone: Tone; children: string }) {
  const p = PILL[tone];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: p.bg }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.dot }} />
      <Text style={{ fontSize: 12, lineHeight: 17, color: p.fg, ...face[500] }}>{children}</Text>
    </View>
  );
}

/* ── Segmented, full width on a phone (Approvals.tsx: max-sm:w-full, each flex-1) ── */

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

/* ── Button, secondary (the web's default): an outlined capsule, 44 under a thumb ── */

export function Btn({ label, a11y, onPress, disabled }: { label: string; a11y?: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={a11y ?? label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => ({
        minHeight: 44, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: c.grey300,
        alignItems: "center", justifyContent: "center",
        backgroundColor: disabled ? c.grey50 : pressed ? c.grey100 : c.white,
      })}
    >
      <Text style={[t.label, { color: disabled ? c.grey500 : c.ink900 }]}>{label}</Text>
    </Pressable>
  );
}

/** The web's Field and Textarea: the label over a box, 16px type under a thumb. */
export function Note({ label, value, onChangeText, placeholder, a11y, editable }: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder: string; a11y: string; editable: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.label, { color: c.grey700 }]}>{label}</Text>
      <TextInput
        value={value} onChangeText={onChangeText} placeholder={placeholder} editable={editable}
        accessibilityLabel={a11y} multiline maxLength={500} placeholderTextColor={c.grey400}
        style={{
          minHeight: 64, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: c.grey300,
          backgroundColor: c.white, fontSize: 16, lineHeight: 24, color: c.ink900, textAlignVertical: "top", ...face[500],
        }}
      />
    </View>
  );
}

/* ── The states, each in a card as the web's list's own states are ── */

const Box = ({ children, tint }: { children: ReactNode; tint?: boolean }) => (
  <View style={{ backgroundColor: tint ? c.yellow50 : c.white, borderRadius: 12, borderWidth: 1, borderColor: tint ? c.yellow100 : c.grey200, alignItems: "center", paddingVertical: 56, paddingHorizontal: 24 }}>
    {children}
  </View>
);

const Disc = ({ children, bg }: { children: ReactNode; bg: string }) => (
  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: bg, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>{children}</View>
);

/** EmptyState with the web's CheckCircle2. Also the refused screen, in the API's words. */
export function Empty({ title, description }: { title: string; description: string }) {
  return (
    <Box>
      <Disc bg={c.grey100}><CheckCircle2 size={20} color={c.grey400} /></Disc>
      <Text style={[t.heading, { textAlign: "center" }]}>{title}</Text>
      <Text style={[t.label, { color: c.grey500, marginTop: 6, textAlign: "center", lineHeight: 23 }]}>{description}</Text>
    </Box>
  );
}

/** ErrorState ("Something went wrong", the server's words), or, with no line, that it is the line. */
export function Failed({ error, onRetry }: { error: string; onRetry: () => void }) {
  const off = !isOnline();
  return (
    <View accessibilityRole="alert">
      <Box tint={off}>
        <Disc bg={off ? c.yellow100 : c.red50}>{off ? <CloudOff size={20} color={c.yellow800} /> : <AlertCircle size={20} color={c.red} />}</Disc>
        <Text style={[t.heading, { textAlign: "center" }]}>{off ? "No connection" : "Something went wrong"}</Text>
        <Text style={[t.label, { color: c.grey500, marginTop: 6, textAlign: "center", lineHeight: 22 }]}>
          {off ? "What is waiting has not been read on this phone yet. It shows once the line is back." : error}
        </Text>
        <View style={{ marginTop: 20, flexDirection: "row" }}>
          <Pressable
            onPress={onRetry} accessibilityRole="button" accessibilityLabel="Try again"
            style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: c.grey300, flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: pressed ? c.grey100 : c.white })}
          >
            <RotateCw size={16} color={c.ink900} />
            <Text style={[t.label, { color: c.ink900 }]}>Try again</Text>
          </Pressable>
        </View>
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

/** The web's Skeleton, in words: a phone reader hears it. */
export const Loading = () => (
  <View style={{ height: 160, borderRadius: 12, backgroundColor: c.grey100, justifyContent: "center", paddingHorizontal: space.cardX }}>
    <Text style={[t.label, { color: c.grey500 }]} accessibilityLiveRegion="polite">Reading what is waiting…</Text>
  </View>
);
