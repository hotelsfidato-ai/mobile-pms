import { Info, type LucideIcon } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Modal, Pressable, Text, View, type StyleProp, type TextStyle } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { c, face, space, t } from "../../core/theme";

/* ══════════════════════════════════════════════════════════════════
   THE WEB KIT'S SMALL PIECES the Dashboard and the housekeeping board share
   (src/components/ui/Misc.tsx IconChip, Rings, AnchorGauge; Term.tsx Term,
   InfoButton; the Dashboard's Swatch and SplitBar), from src/styles/theme.css.
   They belong in src/core once the core is open: asked in the report.
   ══════════════════════════════════════════════════════════════════ */

/** Tokens core/theme.ts does not carry yet. */
export const more = {
  grey400: "#9aa2a9",
  yellow: "#ffb600",
  redDot: "#e0301e",
  infoAhead: "#95b6d8",
  success: "#1f6f5c",
  success50: "#eaf4f1",
  success100: "#cde5de",
  /** Labels on navy: white at 60% and 55%. */
  navy60: "rgba(255,255,255,0.6)",
  navy55: "rgba(255,255,255,0.55)",
};

const CHIP = {
  neutral: { bg: c.grey100, fg: c.grey600 },
  orange: { bg: c.orange50, fg: c.orange700, ring: c.orange100 },
  yellow: { bg: c.yellow50, fg: c.yellow800, ring: c.yellow100 },
  blue: { bg: c.info50, fg: c.info, ring: c.info100 },
  green: { bg: more.success50, fg: more.success, ring: more.success100 },
  glass: { bg: "rgba(255,255,255,0.1)", fg: c.orange },
} as const;
export type ChipTone = keyof typeof CHIP;

/** A small icon in its tinted square: 28 px, or 24 px in a tight place. */
export function IconChip({ icon: Icon, tone = "neutral", size = 28 }: { icon: LucideIcon; tone?: ChipTone; size?: 28 | 24 }) {
  const k: { bg: string; fg: string; ring?: string } = CHIP[tone];
  return (
    <View
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{
        width: size, height: size, borderRadius: size === 28 ? 8 : 7, alignItems: "center", justifyContent: "center", backgroundColor: k.bg,
        ...(k.ring ? { borderWidth: 1, borderColor: k.ring } : null),
      }}
    >
      <Icon size={size === 28 ? 16 : 14} color={k.fg} />
    </View>
  );
}

/** One open ring (the kit's Rings with one arc): null draws the track alone.
    ponytail: drawn at rest; the web's once-a-session close is 600 ms of motion. */
export function Ring({ value, color, track, size = 80 }: { value: number | null | undefined; color: string; track: string; size?: number }) {
  const r = 45.5;
  const len = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value ?? 0));
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: [{ rotate: "-90deg" }] }}>
      <Circle cx={50} cy={50} r={r} fill="none" stroke={track} strokeWidth={9} />
      {v > 0 ? (
        <Circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={9} strokeLinecap="round"
          strokeDasharray={`${len} ${len}`} strokeDashoffset={len * (1 - v)} />
      ) : null}
    </Svg>
  );
}

/** A thin capsule gauge on the navy anchor: its label and figure, a 4 px bar under them. */
export function AnchorGauge({ label, value, fraction, missing }: { label: string; value: ReactNode; fraction: number; missing?: boolean }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <Text style={[t.label, { color: more.navy60 }]}>{label}</Text>
        <Text style={[t.heading, t.tab, { color: missing ? more.navy55 : c.white }]}>{value}</Text>
      </View>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: c.navyTrack, overflow: "hidden" }}>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: c.orange, width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }} />
      </View>
    </View>
  );
}

/** The words a tap opens: the web's popover, centred on the phone. */
function Words({ open, onClose, title, words }: { open: boolean; onClose: () => void; title?: string; words: string }) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose} accessibilityRole="button" accessibilityLabel="Close"
        style={{ flex: 1, backgroundColor: "rgba(3,23,40,0.4)", justifyContent: "center", paddingHorizontal: space.side + 16 }}
      >
        <View style={{ backgroundColor: c.white, borderRadius: 12, padding: 14, gap: 4 }} accessibilityLiveRegion="polite">
          {title ? <Text style={[t.label, { color: c.ink900, ...face[600] }]}>{title}</Text> : null}
          <Text style={[t.label, { lineHeight: 22 }]}>{words}</Text>
        </View>
      </Pressable>
    </Modal>
  );
}

/** The (i): a real button whose name is the note, a tap shows the same words.
    44 px to the touch, its margins taking back what a 28 px mark would use. */
export function InfoButton({ words, color = c.grey500 }: { words: string; color?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={words}
        style={{ width: 44, height: 44, marginVertical: -10, marginRight: -14, alignItems: "center", justifyContent: "center" }}
      >
        <Info size={16} color={color} />
      </Pressable>
      <Words open={open} onClose={() => setOpen(false)} words={words} />
    </>
  );
}

/* src/lib/glossary.ts, the words the Dashboard underlines. */
const GLOSSARY = {
  occupancy: { term: "Occupancy", means: "Rooms sold, as a share of the rooms that could be sold. Rooms out of service are left out. A complimentary room counts as sold, as in the group's eZee reports." },
  adr: { term: "Average rate (ARR)", means: "Room revenue divided by rooms sold, complimentary rooms included: what a sold room earned, on average. Room charges only. Extras, food and tax are not in it." },
  revpar: { term: "RevPAR", means: "Revenue per available room: room revenue divided by every room that could be sold, sold or not. Unlike the average rate, it falls when rooms stay empty." },
  cityLedger: { term: "City ledger", means: "Money owed by companies and booking sites for stays billed to them, not paid by the guest. The balance is what they still owe on their accounts; Paid today is what they paid that day." },
  guestLedger: { term: "Guest ledger", means: "What guests owe on their bills, less refunds: the charges posted, less what they have paid, less what is owed back to guests who paid too much. It clears as each bill is settled." },
};
export type TermKey = keyof typeof GLOSSARY;

/** A trade word: dotted underline, a tap says what it means. */
export function Term({ name, children, style }: { name: TermKey; children: string; style?: StyleProp<TextStyle> }) {
  const [open, setOpen] = useState(false);
  const entry = GLOSSARY[name];
  return (
    <>
      <Text
        onPress={() => setOpen(true)} accessibilityRole="button" accessibilityHint={entry.means} suppressHighlighting
        style={[style, { textDecorationLine: "underline", textDecorationStyle: "dotted" }]}
      >
        {children}
      </Text>
      <Words open={open} onClose={() => setOpen(false)} title={entry.term} words={entry.means} />
    </>
  );
}

/* A split bar: ink and greys, so no colour gets a second meaning. */
const SPLIT = [c.ink900, c.grey600, more.grey400, c.grey300];
export const splitColour = (i: number) => SPLIT[Math.min(i, SPLIT.length - 1)]!;

export function Swatch({ i, color }: { i?: number; color?: string }) {
  return <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color ?? splitColour(i ?? 0) }} />;
}

export function SplitBar({ parts, label }: { parts: Array<{ name: string; value: number | null }>; label: string }) {
  return (
    <View accessibilityRole="image" accessibilityLabel={label} style={{ flexDirection: "row", height: 8, gap: 2, borderRadius: 999, overflow: "hidden" }}>
      {parts.map((p, i) => (p.value != null && p.value > 0
        ? <View key={p.name} style={{ flex: p.value, minWidth: 2, backgroundColor: splitColour(i) }} /> : null))}
    </View>
  );
}

/** A row that scrolls fades at its edge, so a phone says there is more (the web's mask). */
export function Fade({ id, color, width }: { id: string; color: string; width: number | `${number}%` }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, bottom: 0, right: 0, width }}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={color} stopOpacity={0} />
            <Stop offset="1" stopColor={color} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
