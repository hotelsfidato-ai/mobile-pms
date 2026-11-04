import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { Check, type LucideIcon } from "lucide-react-native";
import { useCallback, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import { DASH } from "../../core/format";
import { c, face, t } from "../../core/theme";
import type { Tone } from "./purchase";

/* ══════════════════════════════════════════════════════════════════
   THE FEW PIECES PURCHASING NEEDS THAT THE GUEST-SERVICES AND LAUNDRY KITS
   (imported, never edited) do not carry, ported from the web kit with its
   tokens: StatusPill with all four tones, Checkbox, the order's Fact.
   ══════════════════════════════════════════════════════════════════ */

/** The web's StatusPill: flat, a dot, 12 on 17 (src/components/ui). */
const PILL: Record<Tone, { bg: string; fg: string; dot: string }> = {
  warning: { bg: c.yellow50, fg: c.yellow800, dot: c.yellow },
  danger: { bg: c.red50, fg: c.red700, dot: c.red },
  info: { bg: c.info50, fg: c.info, dot: c.info },
  success: { bg: c.success50, fg: c.success600, dot: c.success },
};
export function StatePill({ tone, children }: { tone: Tone; children: string }) {
  const p = PILL[tone];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: p.bg }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.dot }} />
      <Text style={{ fontSize: 12, lineHeight: 17, color: p.fg, ...face[500] }}>{children}</Text>
    </View>
  );
}

/** The web's IconChip, yellow (Misc.tsx CHIP_TONES.yellow): 28, a yellow-100 ring on yellow-50. */
export function YellowChip({ Icon }: { Icon: LucideIcon }) {
  return (
    <View style={{ width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: c.yellow50, borderWidth: 1, borderColor: c.yellow100 }}>
      <Icon size={16} color={c.yellow800} />
    </View>
  );
}

/** The web's Checkbox with its label: a 20px box, the whole line 44 tall. */
export function Tick({ label, on, onChange, disabled }: { label: string; on: boolean; onChange: (on: boolean) => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={() => onChange(!on)} disabled={disabled} accessibilityRole="checkbox"
      accessibilityState={{ checked: on, disabled: Boolean(disabled) }} accessibilityLabel={label}
      style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "flex-start", opacity: disabled ? 0.5 : 1 }}
    >
      <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: on ? c.orange600 : c.grey300, backgroundColor: on ? c.orange600 : c.white, alignItems: "center", justifyContent: "center" }}>
        {on ? <Check size={14} color={c.white} /> : null}
      </View>
      <Text style={[t.label, { color: c.ink900 }]}>{label}</Text>
    </Pressable>
  );
}

/** PurchaseRequest.tsx Fact: text-xs grey-500 over text-sm 500 ink, grey when it is a dash. */
export function Fact({ label, value, half }: { label: string; value: string; half?: boolean }) {
  return (
    <View style={half ? { width: "50%", paddingRight: 12 } : null}>
      <Text style={[t.caption, { lineHeight: 18 }]}>{label}</Text>
      <Text style={[t.label, t.tab, { lineHeight: 21, marginTop: 2, color: value === DASH ? c.grey500 : c.ink900 }]}>{value}</Text>
    </View>
  );
}

/** Read again when the screen comes back into view (after deciding it in Approvals), not on the first. */
export function useBackInView(queryKey: readonly unknown[]) {
  const cache = useQueryClient();
  const first = useRef(true);
  const key = JSON.stringify(queryKey);
  useFocusEffect(useCallback(() => {
    if (first.current) { first.current = false; return; }
    void cache.invalidateQueries({ queryKey: JSON.parse(key) as unknown[] });
  }, [cache, key]));
}
