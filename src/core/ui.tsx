import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle,
} from "react-native";
import { c, face, space, t } from "./theme";

/* The few pieces every screen shares, after the web kit (src/components/ui). */

/** One read: what came back, what failed, and a way to ask again. A failed
    re-read keeps the last answer on screen and says it failed. The key
    names the hotel (AGENTS rule 5); react-query keeps the answers (M-4). */
export function useRead<T>(read: () => Promise<T>, key: readonly unknown[]) {
  const q = useQuery({ queryKey: key, queryFn: read });
  return {
    data: q.data,
    error: q.error ? q.error.message : undefined,
    loading: q.isFetching,
    reload: () => { void q.refetch(); },
  };
}

/** A screen: the page's grey, the sides' 20px, pull down to read again. */
export function Screen({ children, refreshing, onRefresh }: { children: ReactNode; refreshing: boolean; onRefresh: () => void }) {
  return (
    <ScrollView
      style={{ backgroundColor: c.grey50 }}
      contentContainerStyle={{ paddingTop: 16, paddingHorizontal: space.side, paddingBottom: 40, gap: space.card }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.orange} colors={[c.orange]} />}
    >
      {children}
    </ScrollView>
  );
}

/** The page head: the date in small capitals, the title, a line under it. */
export function Head({ eyebrow, title, under, action }: { eyebrow?: string; title: string; under?: string; action?: ReactNode }) {
  return (
    <View style={{ marginBottom: space.section - space.card, flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        {eyebrow ? <Text style={t.eyebrow}>{eyebrow}</Text> : null}
        <Text style={t.title} accessibilityRole="header">{title}</Text>
        {under ? <Text style={[t.label, { color: c.grey500 }]}>{under}</Text> : null}
      </View>
      {action}
    </View>
  );
}

/** A white tile: a 1px grey-200 hairline, 12px corners. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

/** A capsule button: 44px on a touch screen, a grey-300 ring, an icon before the words. */
export function Capsule({ label, onPress, icon }: { label: string; onPress: () => void; icon?: ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [s.capsule, pressed && { backgroundColor: c.grey100 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {icon}
        <Text style={[t.label, { color: c.grey700 }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

/** A read that failed says so, and what - a dash alone would tell the
    owner the business has no figures. */
export function ReadFailed({ what, error, onRetry }: { what: string; error: string; onRetry: () => void }) {
  return (
    <View style={[s.card, { backgroundColor: c.red50, borderColor: c.red50, gap: 8 }]} accessibilityRole="alert">
      <Text style={[t.heading, { color: c.red700 }]}>Could not read {what}</Text>
      <Text style={[t.label, { color: c.grey700 }]}>{error}</Text>
      <View style={{ flexDirection: "row" }}><Capsule label="Try again" onPress={onRetry} /></View>
    </View>
  );
}

/** A labelled value on one line, label left, value right (the Figure Rule's rows). */
export function Row({ label, value, strong, onNavy }: { label: string; value: string; strong?: boolean; onNavy?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={[t.label, { color: onNavy ? c.onNavy : c.grey500, flexShrink: 1 }]}>{label}</Text>
      <Text style={[t.label, t.tab, { color: onNavy ? c.white : strong ? c.ink900 : c.grey700, ...face[strong ? 600 : 500] }]}>{value}</Text>
    </View>
  );
}

export const s = StyleSheet.create({
  card: {
    backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200,
    paddingHorizontal: space.cardX, paddingVertical: space.cardY,
  },
  navy: { backgroundColor: c.ink900, borderRadius: 12, paddingHorizontal: space.cardX, paddingVertical: space.cardY },
  capsule: {
    minHeight: 44, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: c.grey300,
    backgroundColor: c.white, alignItems: "center", justifyContent: "center",
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 12, paddingVertical: 4 },
  hairline: { height: 1, backgroundColor: c.grey100, marginVertical: 8 },
});
