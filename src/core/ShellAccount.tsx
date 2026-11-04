import { router } from "expo-router";
import { Check, LogOut, ShieldCheck } from "lucide-react-native";
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Hotel } from "./api";
import { ON_THE_WEBSITE, asRole, landing } from "./menu";
import { roleAt, useSession } from "./session";
import { body, regular } from "./Shell";
import { c, face, t } from "./theme";

/* ══════════════════════════════════════════════════════════════════
   THE ACCOUNT MENU BEHIND THE AVATAR — the web's AccountMenu.tsx.
   Nothing here is choosable except the property, and only among the ones
   this person may work in (useWorkableHotels). Picking one goes to its
   landing, by role, as app/index.tsx does.

   Left out, each only a development build or a card the phone does not
   have: "Development only · view as" and "Show Start here again".
   ══════════════════════════════════════════════════════════════════ */

/* GET /api/hotels answers these (api/src/routes/hotels.ts); the core's types do not name them yet. */
type Seen = Hotel & { city?: string };
type Scope = { email?: string; homeScreen?: "dashboard" | "rooms" | "calendar" };

/* src/lib/homeScreen.ts HOME_SCREENS. */
const HOME_SCREENS = [["dashboard", "Dashboard"], ["rooms", "Rooms"], ["calendar", "Calendar"]] as const;

/* src/lib/testHotel.ts plainName. */
const plainName = (h: Hotel) => (h.testOf ? h.name.replace(/\s*·\s*TEST\s*$/i, "") : h.name);

export function ShellAccount({ hotel, routed, onClose }: { hotel: Hotel | null; routed: string | undefined; onClose: () => void }) {
  const { who, signOut } = useSession();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const scope = who!.scope;
  const seen = scope as typeof scope & Scope;
  /* useWorkableHotels: the properties this person may WORK IN, not merely read. */
  const allowed = new Set(scope.hotels.map((h) => h.hotelId));
  const workable = scope.isGroupAdmin ? who!.hotels : who!.hotels.filter((h) => allowed.has(h.id));
  const home = seen.homeScreen ?? "dashboard";

  const pick = (h: Hotel) => {
    onClose();
    if (h.code !== routed) router.replace(landing(asRole(roleAt(who!, h.code)), h.code) as never);
  };

  return (
    <Modal transparent visible onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
      <View style={[styles.panel, { top: insets.top + 56, maxHeight: height - insets.top - 80 }]}>
        <ScrollView contentContainerStyle={{ padding: 4 }}>
          <View style={styles.block}>
            <Text style={[body, { color: c.ink900, ...face[500] }]}>{scope.fullName}</Text>
            {seen.email ? <Text style={[styles.small, { marginTop: 2 }]}>{seen.email}</Text> : null}
            {scope.isGroupAdmin ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                <ShieldCheck size={12} color="#1f6f5c" />
                <Text style={[styles.small, { color: "#1f6f5c" }]}>Group administrator - every property</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.rule} />

          {workable.length > 1 ? (
            <>
              <Text style={styles.label}>Property</Text>
              {workable.map((h: Seen) => (
                <Pressable
                  key={h.id} onPress={() => pick(h)} accessibilityRole="button" accessibilityState={{ selected: h.id === hotel?.id }}
                  accessibilityLabel={`${h.name}, ${h.code}`}
                  style={({ pressed }) => [styles.choice, pressed && { backgroundColor: c.grey100 }]}
                >
                  <Check size={16} color={c.orange} style={{ opacity: h.id === hotel?.id ? 1 : 0 }} />
                  <View style={{ flex: 1 }}>
                    <Name hotel={h} />
                    <Text style={styles.small}>{h.code} · {h.city}</Text>
                  </View>
                </Pressable>
              ))}
            </>
          ) : (
            <View style={styles.block}>
              <Text style={styles.small}>Property</Text>
              {hotel ? <Name hotel={hotel} /> : <Text style={[body, regular, { color: c.ink900 }]}>None assigned</Text>}
              {hotel ? <Text style={[styles.small, { marginTop: 2 }]}>{hotel.code} · {(hotel as Seen).city}</Text> : null}
            </View>
          )}

          <View style={styles.rule} />

          {/* The phone has neither Rooms nor Calendar yet, and does not read this
              choice on opening: "From your next sign-in, on any device" would
              not be true here. */}
          <Text style={styles.label}>Start on</Text>
          {HOME_SCREENS.map(([value, label]) => (
            <View key={value} style={styles.choice} accessibilityState={{ disabled: true }}>
              <Check size={16} color={c.grey300} style={{ opacity: value === home ? 1 : 0 }} />
              <Text style={[body, regular, { color: c.grey500 }]}>{label}</Text>
            </View>
          ))}
          <Text style={[styles.small, { paddingHorizontal: 10, paddingBottom: 6 }]}>{ON_THE_WEBSITE}</Text>

          <View style={styles.rule} />

          <Pressable
            onPress={signOut} accessibilityRole="button" accessibilityLabel="Sign out"
            style={({ pressed }) => [styles.choice, { gap: 8 }, pressed && { backgroundColor: c.grey100 }]}
          >
            <LogOut size={16} color="#9aa2a9" />
            <Text style={[body, regular, { color: c.ink900 }]}>Sign out</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

/** A property's name, with TEST beside a test hotel's (TestHotel.tsx TestTag). */
function Name({ hotel }: { hotel: Hotel }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Text numberOfLines={1} style={[body, regular, { color: c.ink900, flexShrink: 1 }]}>{plainName(hotel)}</Text>
      {hotel.testOf ? (
        <View style={{ backgroundColor: c.orange600, borderRadius: 6, paddingHorizontal: 6 }}>
          <Text style={[t.caption, { lineHeight: 18, color: c.white, ...face[700] }]}>TEST</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute", right: 16, width: 290, backgroundColor: c.white, borderWidth: 1, borderColor: c.grey200, borderRadius: 10,
    boxShadow: "0 8px 24px -6px rgba(3,23,40,0.14), 0 1px 4px rgba(3,23,40,0.06)",
  },
  block: { paddingHorizontal: 10, paddingVertical: 8 },
  small: { fontSize: 12, lineHeight: 17, color: c.grey500, ...regular },
  rule: { height: 1, backgroundColor: c.grey200, marginVertical: 4, marginHorizontal: -4 },
  label: { paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, lineHeight: 17, letterSpacing: 0.3, textTransform: "uppercase", color: c.grey500, ...face[600] },
  choice: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6 },
});
