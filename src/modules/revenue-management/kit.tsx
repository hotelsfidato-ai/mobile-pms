import { AlertCircle, CloudOff, Inbox, RotateCw, ShieldOff, type LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { isOnline } from "../../core/offline";
import { c, face, t } from "../../core/theme";
import { Capsule } from "../../core/ui";

/* ══════════════════════════════════════════════════════════════════
   THE WEB KIT'S PIECES THE OUTLOOK USES, ported from src/components/ui
   (StatusPill.tsx, Misc.tsx IconChip, States.tsx EmptyState / ErrorState /
   Skeleton, Card.tsx). Tokens from src/core/theme.ts, which copies
   src/styles/theme.css.
   ══════════════════════════════════════════════════════════════════ */

/** Inter at 400, the web's default weight (loaded in app/_layout.tsx; the
    core's `face` starts at 500). */
export const regular = { fontFamily: "Inter_400Regular" };
/** text-sm / text-base on this theme: 14 on 21, grey-600. */
export const body = { fontSize: 14, lineHeight: 21, ...regular, color: c.grey600 };
/** The same, font-medium in ink-900: a suggestion, a date's heading. */
export const strong = { ...body, ...face[500], color: c.ink900 };
/** text-2xs: 12 on 17, grey-500. */
export const small = { fontSize: 12, lineHeight: 17, ...regular, color: c.grey500 };

export type Tone = "neutral" | "success" | "warning";
const PILL: Record<Tone, { bg: string; fg: string; dot: string }> = {
  neutral: { bg: c.grey100, fg: c.grey600, dot: c.grey400 },
  success: { bg: c.success50, fg: c.success600, dot: c.success },
  warning: { bg: c.yellow50, fg: c.yellow800, dot: c.yellow },
};
/** StatusPill: a soft tint, a 6px dot, 12px words. */
export function Pill({ tone, children }: { tone: Tone; children: string }) {
  const p = PILL[tone];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: p.bg }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.dot }} />
      <Text style={{ fontSize: 12, lineHeight: 17, color: p.fg, ...face[500] }}>{children}</Text>
    </View>
  );
}

/** IconChip, 28, neutral: the grey square before a card's heading. */
export function IconChip({ Icon }: { Icon: LucideIcon }) {
  return (
    <View style={{ width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: c.grey100 }}>
      <Icon size={16} color={c.grey600} />
    </View>
  );
}

/** A card's heading: text-md semibold, its chip before it (Outlook.tsx h2). */
export function CardHead({ Icon, title }: { Icon: LucideIcon; title: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <IconChip Icon={Icon} />
      <Text style={[t.heading, { lineHeight: 24, flexShrink: 1 }]} accessibilityRole="header">{title}</Text>
    </View>
  );
}

/** Skeleton: a grey block where a figure is still being read. */
export const Skeleton = ({ height, label }: { height: number; label: string }) => (
  <View accessible accessibilityLabel={label} style={{ height, borderRadius: 6, backgroundColor: c.grey200, opacity: 0.7, marginTop: 12 }} />
);

/** EmptyState, compact. */
export function Empty({ title, description, Icon = Inbox }: { title: string; description: string; Icon?: LucideIcon }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.grey100, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Icon size={20} color={c.grey400} />
      </View>
      <Text style={[t.heading, { textAlign: "center" }]}>{title}</Text>
      <Text style={[t.label, { color: c.grey500, marginTop: 6, textAlign: "center", lineHeight: 23 }]}>{description}</Text>
    </View>
  );
}

/** A white frame (Card / DataTable's frame). */
export const Frame = ({ children }: { children: ReactNode }) => (
  <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, overflow: "hidden" }}>{children}</View>
);

/** RequireAccess's page, or the API's refusal: nothing is read. */
export const Refused = ({ title, sentence }: { title: string; sentence: string }) => (
  <Frame><Empty Icon={ShieldOff} title={title} description={sentence} /></Frame>
);

/** ErrorState: the read failed and nothing was read before; with no line, that is the reason. */
export function Failed({ error, onRetry }: { error: string; onRetry: () => void }) {
  const off = !isOnline();
  return (
    <View accessibilityRole="alert" style={{ alignItems: "center", paddingVertical: 56, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, backgroundColor: off ? c.yellow50 : c.white, borderColor: off ? c.yellow100 : c.grey200 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: off ? c.yellow100 : c.red50, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        {off ? <CloudOff size={20} color={c.yellow800} /> : <AlertCircle size={20} color={c.red} />}
      </View>
      <Text style={[t.heading, { textAlign: "center" }]}>{off ? "No connection" : "Could not read the outlook"}</Text>
      <Text style={[t.label, { color: c.grey500, marginTop: 6, textAlign: "center", lineHeight: 22 }]}>
        {off ? "The coming nights have not been read on this phone yet. They show once the line is back." : error}
      </Text>
      <View style={{ marginTop: 20 }}><Capsule label="Try again" icon={<RotateCw size={16} color={c.grey700} />} onPress={onRetry} /></View>
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
