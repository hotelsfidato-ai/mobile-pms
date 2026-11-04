import { AlertCircle, CloudOff, Lock, RotateCw, type LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { isOnline } from "../../core/offline";
import { c, face, space, t } from "../../core/theme";
import type { Tone } from "./rules";

/* ══════════════════════════════════════════════════════════════════
   THE WEB KIT'S PIECES THESE TWO PAGES USE, from src/components/ui
   (StatusPill.tsx, Card.tsx CardHeader, States.tsx EmptyState and
   ErrorState, ReadProblem.tsx ReadFailed, DataTable.tsx's phone card),
   with the core's theme tokens (theme.css's values). The module's own:
   another module's kit is not shared (the lanes).
   ══════════════════════════════════════════════════════════════════ */

/** The web's text-sm / text-base: 14 on 21. */
export const body = { ...t.label, lineHeight: 21 };
/** The web's text-2xs / text-xs: 12 on 17. */
export const small = { ...t.caption, lineHeight: 17 };

/* ── StatusPill: a soft tint and a dot ── */
const PILL: Record<Tone, { bg: string; fg: string; dot: string }> = {
  neutral: { bg: c.grey100, fg: c.grey600, dot: c.grey400 },
  success: { bg: c.success50, fg: c.success600, dot: c.success },
  warning: { bg: c.yellow50, fg: c.yellow800, dot: c.yellow },
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

/** A white card with no padding of its own (rows and heads pad themselves). */
export const Sheet = ({ children, label }: { children: ReactNode; label?: string }) => (
  <View accessibilityLabel={label} style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, overflow: "hidden" }}>
    {children}
  </View>
);

/** CardHeader: 16 / 14, a grey-200 line under it, text-md title, text-sm grey-500 under. */
export const SheetHead = ({ title, under }: { title: string; under?: string }) => (
  <View style={{ paddingHorizontal: space.cardX, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
    <Text style={[t.heading, { lineHeight: 24 }]} accessibilityRole="header">{title}</Text>
    {under ? <Text style={[body, { color: c.grey500, marginTop: 2 }]}>{under}</Text> : null}
  </View>
);

/* ── The states, each in a card ── */

const Box = ({ children, tint }: { children: ReactNode; tint?: boolean }) => (
  <View style={{ backgroundColor: tint ? c.yellow50 : c.white, borderRadius: 12, borderWidth: 1, borderColor: tint ? c.yellow100 : c.grey200, alignItems: "center", paddingVertical: 56, paddingHorizontal: 24 }}>
    {children}
  </View>
);

const Disc = ({ Icon, bg, fg }: { Icon: LucideIcon; bg: string; fg: string }) => (
  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: bg, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
    <Icon size={20} color={fg} />
  </View>
);

/** EmptyState: the page's own icon on grey, the title, the line under. */
export function Empty({ Icon, title, description }: { Icon: LucideIcon; title: string; description: string }) {
  return (
    <Box>
      <Disc Icon={Icon} bg={c.grey100} fg={c.grey400} />
      <Text style={[t.heading, { textAlign: "center" }]}>{title}</Text>
      <Text style={[body, { color: c.grey500, marginTop: 6, textAlign: "center", lineHeight: 23 }]}>{description}</Text>
    </Box>
  );
}

/** ReadFailed's refused: the Lock, "<What> is not available", the API's sentence. */
export const Refused = ({ title, reason }: { title: string; reason: string }) => <Empty Icon={Lock} title={title} description={reason} />;

/** ErrorState, or - with no line - that it is the line, in the page's own words. */
export function Failed({ title, error, offline, onRetry }: {
  title: string; error: string; offline: { title: string; description: string }; onRetry: () => void;
}) {
  const off = !isOnline();
  return (
    <View accessibilityRole="alert">
      <Box tint={off}>
        {off ? <Disc Icon={CloudOff} bg={c.yellow100} fg={c.yellow800} /> : <Disc Icon={AlertCircle} bg={c.red50} fg={c.red} />}
        <Text style={[t.heading, { textAlign: "center" }]}>{off ? offline.title : title}</Text>
        <Text style={[body, { color: c.grey500, marginTop: 6, textAlign: "center", lineHeight: 22 }]}>{off ? offline.description : error}</Text>
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
export const Loading = ({ what }: { what: string }) => (
  <View style={{ height: 160, borderRadius: 12, backgroundColor: c.grey100, justifyContent: "center", paddingHorizontal: space.cardX }}>
    <Text style={[t.label, { color: c.grey500 }]} accessibilityLiveRegion="polite">{what}</Text>
  </View>
);
