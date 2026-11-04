import { AlertCircle, CloudOff, RotateCw } from "lucide-react-native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { isOnline } from "../../core/offline";
import { c, face, space, t } from "../../core/theme";
import { Btn } from "../guest-services/kit";

/* ══════════════════════════════════════════════════════════════════
   THE FEW PIECES THE LAUNDRY NEEDS THAT THE GUEST-SERVICES KIT (imported,
   never edited) does not carry, ported from the web kit with its tokens
   (src/components/ui StatusPill, DataTable's phone card, States).
   ══════════════════════════════════════════════════════════════════ */

/** The web's StatusPill, with its danger tone (Cancelled): flat, a dot, 12 on 17. */
const PILL = {
  info: { bg: c.info50, fg: c.info, dot: c.info },
  success: { bg: c.success50, fg: c.success600, dot: c.success },
  danger: { bg: c.red50, fg: c.red700, dot: c.red },
};
export function StatePill({ tone, children }: { tone: keyof typeof PILL; children: string }) {
  const p = PILL[tone];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: p.bg }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.dot }} />
      <Text style={{ fontSize: 12, lineHeight: 17, color: p.fg, ...face[500] }}>{children}</Text>
    </View>
  );
}

/** The DataTable's phone card's label: text-2xs, capitals, tracking-wide, grey-500. */
export const capsLabel = { fontSize: 12, lineHeight: 17, letterSpacing: 0.3, textTransform: "uppercase", color: c.grey500, ...face[500] } as const;

/** One label and its value, the card's `dl` (a 104 px label column, 12 between). */
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <Text style={[capsLabel, { width: 104, paddingTop: 2 }]}>{label}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        {typeof children === "string" ? <Text style={[t.label, { lineHeight: 21, color: c.ink900 }, t.tab]}>{children}</Text> : children}
      </View>
    </View>
  );
}

/** A read that failed, in the web's words for this screen (its ErrorState):
    offline, its "No connection"; unreachable, its sentence; else the server's. */
export function LoadFailed({ title, offline, error, onRetry }: { title: string; offline: string; error: string; onRetry: () => void }) {
  const off = !isOnline();
  return (
    <View accessibilityRole="alert" style={{ alignItems: "center", paddingVertical: 56, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, backgroundColor: off ? c.yellow50 : c.white, borderColor: off ? c.yellow100 : c.grey200 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: off ? c.yellow100 : c.red50, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        {off ? <CloudOff size={20} color={c.yellow800} /> : <AlertCircle size={20} color={c.red} />}
      </View>
      <Text style={[t.heading, { textAlign: "center" }]}>{off ? "No connection" : title}</Text>
      <Text style={[t.label, { color: c.grey500, marginTop: 6, textAlign: "center", lineHeight: 22 }]}>{off ? offline : error}</Text>
      <View style={{ marginTop: 20 }}><Btn label="Try again" icon={RotateCw} onPress={onRetry} /></View>
    </View>
  );
}

/** A note in a white card (the web's Card with CardBody text-sm grey-600). */
export function Note({ title, children, alert }: { title?: string; children: string; alert?: boolean }) {
  return (
    <View
      accessibilityRole={alert ? "alert" : undefined}
      style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 2 }}
    >
      {title ? <Text style={[t.label, { lineHeight: 21, color: c.ink900 }]}>{title}</Text> : null}
      <Text style={[t.label, { lineHeight: 21, color: alert ? c.red700 : c.grey600 }]}>{children}</Text>
    </View>
  );
}
