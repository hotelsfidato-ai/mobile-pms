import { Lock } from "lucide-react-native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { c, face, space, t } from "../../core/theme";
import { Box, body } from "../guest-services/kit";

/* ══════════════════════════════════════════════════════════════════
   THE FEW PIECES THE DIARY NEEDS THAT THE GUEST-SERVICES, LAUNDRY AND
   FINANCE KITS (imported, never edited) do not carry, ported from the
   web kit with its tokens (src/components/ui ReadFailed's refused state,
   Card/CardHeader, the money card's Line).
   ══════════════════════════════════════════════════════════════════ */

/** The web's ReadFailed when the server said no (any 4xx): "<What> is not available" and its sentence. */
export function NotAvailable({ what, sentence }: { what: string; sentence: string }) {
  return (
    <Box style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.grey100, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Lock size={20} color={c.grey400} />
      </View>
      <Text style={[t.heading, { textAlign: "center" }]}>{what} is not available</Text>
      <Text style={[t.label, { color: c.grey500, marginTop: 6, textAlign: "center", lineHeight: 23 }]}>{sentence}</Text>
    </Box>
  );
}

/** A white card with its padding (the web's Card + CardBody). */
export const Panel = ({ children, gap = 12 }: { children: ReactNode; gap?: number }) => (
  <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap }}>
    {children}
  </View>
);

/** One label over its value (the function's `Detail`: text-sm grey-500, then medium ink-900). */
export function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={[body, { color: c.grey500 }]}>{label}</Text>
      {typeof children === "string" ? <Text style={[body, t.tab, { color: children === "-" ? c.grey500 : c.ink900 }]}>{children}</Text> : children}
    </View>
  );
}

/** A figure's row (the money card's `Line`): label grey-500, value grey-700, a dash grey-500. */
export function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
      <Text style={[body, { lineHeight: 22, color: c.grey500, flexShrink: 1 }]}>{label}</Text>
      <Text style={[
        strong ? { fontSize: 16, lineHeight: 24, ...face[600], color: c.ink900 } : [body, { lineHeight: 22, color: value === "-" ? c.grey500 : c.grey700 }],
        t.tab,
      ]}
      >
        {value}
      </Text>
    </View>
  );
}

/** A warning line in a card (the tax warning, a cancellation): the icon, then the words. */
export function Warn({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <Panel>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View style={{ paddingTop: 3 }}>{icon}</View>
        <Text style={[body, { flex: 1, color: c.ink900 }]}>{children}</Text>
      </View>
    </Panel>
  );
}
