import { useQuery } from "@tanstack/react-query";
import { useGlobalSearchParams, usePathname } from "expo-router";
import { AlertTriangle, Bell, ChevronDown, Menu, Search } from "lucide-react-native";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { api, type Hotel, type HotelsResponse } from "./api";
import { dateShort, daysBehind } from "./format";
import { ON_THE_WEBSITE, ROLE_LABELS, asRole, can, coversTheFrame, initials, mayReach } from "./menu";
import { roleAt, useSession } from "./session";
import { ShellAccount } from "./ShellAccount";
import { ShellMenu, type Modules } from "./ShellMenu";
import { NotesDrawer, unreadOf, useNotes } from "./ShellNotes";
import { c, face, t } from "./theme";

/* ══════════════════════════════════════════════════════════════════
   THE FRAME — the web's TopBar, BusinessDateBehind and TestHotelStripe
   (src/components/app), at phone width. Every signed-in screen sits under
   it. The property is the one in the route; a screen with none in its
   route (All properties) keeps the last one, as the web keeps its
   remembered hotel.
   ══════════════════════════════════════════════════════════════════ */

/** The web's regular weight. theme.ts's `face` starts at 500. */
export const regular = { fontFamily: "Inter_400Regular" };
/** text-sm / text-base: the web's 14 on 21. */
export const body = { fontSize: 14, lineHeight: 21 };
const GREY_400 = "#9aa2a9"; // --color-grey-400

export function Shell() {
  const { who } = useSession();
  const path = usePathname();
  const routed = useGlobalSearchParams<{ code?: string }>().code;
  const [open, setOpen] = useState<"menu" | "search" | "bell" | "account" | null>(null);
  /* Remembered for the person, as useUi's foldedSections (the frame goes on sign-out). */
  const [folded, setFolded] = useState<Record<string, boolean>>({});

  /* The dates, read again each time a screen opens (AppShell.tsx, the owner
     of 28 September): after the night audit on another desk this one went
     on showing yesterday. */
  const fresh = useQuery({ queryKey: ["shell", "hotels"], queryFn: () => api<HotelsResponse>("/api/hotels") });
  useEffect(() => { void fresh.refetch(); }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  const last = useRef(routed);
  if (routed) last.current = routed;
  const hotels = fresh.data?.hotels ?? who!.hotels;
  const hotel = hotels.find((h) => h.code === (routed ?? last.current)) ?? hotels[0] ?? null;
  const code = hotel?.code ?? "";
  const role = asRole(hotel ? roleAt(who!, code) : null);

  /* Sidebar.tsx's own read: undefined until it answers keeps every section,
     and an unreadable answer is not a property losing its restaurant. */
  const modules = useQuery({
    queryKey: ["modules", code],
    enabled: Boolean(code),
    staleTime: 5 * 60_000,
    queryFn: () => api<{ modules: { module: string; enabled: boolean }[] }>(`/api/hotels/${code}/modules`)
      .then((b): Modules => Object.fromEntries(b.modules.map((m) => [m.module, m.enabled])))
      .catch((): Modules => ({})),
  });

  const notes = useNotes(hotel);
  const close = () => setOpen(null);
  if (coversTheFrame(path)) return null;

  return (
    <>
      {hotel?.testOf ? <TestStripe /> : null}
      <View style={styles.bar}>
        <Pressable
          onPress={() => setOpen("menu")} accessibilityRole="button" accessibilityLabel="Open navigation"
          style={({ pressed }) => [styles.icon, { marginLeft: -10 }, pressed && styles.pressed]}
        >
          <Menu size={20} color={c.grey500} />
        </Pressable>

        <Pressable
          onPress={() => setOpen("search")} accessibilityRole="button" accessibilityLabel={`Find a screen. ${ON_THE_WEBSITE}`}
          style={({ pressed }) => [styles.icon, { marginLeft: 12 }, pressed && styles.pressed]}
        >
          <Search size={16} color={GREY_400} />
        </Pressable>

        <View style={styles.right}>
          <BellButton unread={unreadOf(notes.data)} onPress={() => setOpen("bell")} />
          <View style={styles.rule} />
          <Pressable
            onPress={() => setOpen("account")} accessibilityRole="button"
            accessibilityLabel={`${who!.scope.fullName}, ${ROLE_LABELS[role]}. Account and property`}
            style={({ pressed }) => [styles.account, pressed && styles.pressed]}
          >
            <View style={styles.avatar}>
              <Text style={[t.caption, { color: c.white, ...face[600] }]}>{initials(who!.scope.fullName)}</Text>
            </View>
            <ChevronDown size={14} color={GREY_400} />
          </Pressable>
        </View>
      </View>
      {hotel ? <DateBehind hotel={hotel} audit={mayReach(role, "/h/:code/night-audit")} /> : null}

      {open === "menu" ? (
        <ShellMenu
          role={role} code={code} modules={modules.data} path={path}
          folded={folded} onFold={(key, shownFolded) => setFolded((f) => ({ ...f, [key]: !shownFolded }))}
          onClose={close}
        />
      ) : null}
      {open === "search" ? <FindAScreen books={can(role, "view", "reservation")} onClose={close} /> : null}
      {open === "bell" ? <NotesDrawer hotel={hotel} onClose={close} /> : null}
      {open === "account" ? <ShellAccount hotel={hotel} routed={routed} onClose={close} /> : null}
    </>
  );
}

function BellButton({ unread, onPress }: { unread: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress} accessibilityRole="button" accessibilityLabel={`Notifications${unread ? `, ${unread} unread` : ""}`}
      style={({ pressed }) => [styles.icon, pressed && styles.pressed]}
    >
      <Bell size={18} color={c.grey500} />
      {unread > 0 ? (
        <View style={styles.count}>
          <Text style={[t.caption, t.tab, { color: c.white, lineHeight: 16, ...face[600] }]}>{unread > 9 ? "9+" : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** BusinessDateBehind.tsx: one line while the business date is behind today.
    The web links Night audit; the phone has no such screen yet. */
function DateBehind({ hotel, audit }: { hotel: Hotel; audit: boolean }) {
  const days = daysBehind(hotel);
  if (!days) return null;
  return (
    <View style={styles.behind} accessibilityLiveRegion="polite">
      <View style={{ marginTop: 2 }}><AlertTriangle size={16} color={c.yellow800} /></View>
      <Text style={[body, regular, { flex: 1, color: c.ink900 }]}>
        Business date {dateShort(hotel.businessDate)}, {days} {days === 1 ? "day" : "days"} behind
        {" "}today ({dateShort(hotel.today!)}). Close the days in Night audit.
        {audit ? <Text style={{ color: c.grey500 }}> {ON_THE_WEBSITE}</Text> : null}
      </Text>
    </View>
  );
}

/** TestHotel.tsx: on every screen of a test hotel; nothing closes it. */
function TestStripe() {
  return (
    <View style={{ backgroundColor: c.orange600, paddingHorizontal: 16, paddingVertical: 6 }} accessibilityRole="text">
      <Text style={{ fontSize: 14, lineHeight: 19, color: c.white, textAlign: "center", ...face[600] }}>
        TEST HOTEL · practice only · nothing here is real
      </Text>
    </View>
  );
}

/** CommandPalette.tsx, the empty dialog: the web's search also finds guests
    and bookings, and the phone has no booking screen to open them on. */
function FindAScreen({ books, onClose }: { books: boolean; onClose: () => void }) {
  return (
    <Modal transparent visible onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: SCRIM }]} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.dialog} accessibilityRole="alert">
        <View style={styles.dialogRow}>
          <Search size={16} color={GREY_400} />
          <Text style={[{ fontSize: 16, flex: 1, color: GREY_400 }, regular]} numberOfLines={1}>
            {books ? "Find a screen, a guest or a booking" : "Find a screen"}
          </Text>
        </View>
        <View style={{ paddingHorizontal: 20, paddingVertical: 28, alignItems: "center" }}>
          <Text style={[body, { color: c.ink900, ...face[500] }]}>{ON_THE_WEBSITE}</Text>
        </View>
      </View>
    </Modal>
  );
}

/** bg-ink-900/40, the drawer's and the dialog's. */
export const SCRIM = "rgba(3,23,40,0.4)";

/** A drawer from one side (AppShell.tsx, Overlays.tsx): 200 ms, as motion-drawer. */
export function Slide({ from, width, scrim, onClose, children }: {
  from: "left" | "right"; width: number; scrim: string; onClose: () => void; children: ReactNode;
}) {
  const x = useRef(new Animated.Value(from === "left" ? -width : width)).current;
  useEffect(() => {
    Animated.timing(x, { toValue: 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== "web" }).start();
  }, [x]);
  return (
    <Modal transparent visible onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: scrim }]} onPress={onClose} accessibilityLabel="Close" />
      <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, width, transform: [{ translateX: x }] }, from === "left" ? { left: 0 } : { right: 0 }]}>
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row", alignItems: "center", height: 56, paddingHorizontal: 16,
    backgroundColor: c.white, borderBottomWidth: 1, borderBottomColor: c.grey200,
  },
  icon: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  pressed: { backgroundColor: c.grey100 },
  right: { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: "auto" },
  rule: { width: 1, height: 24, marginHorizontal: 4, backgroundColor: c.grey200 },
  account: { flexDirection: "row", alignItems: "center", gap: 8, height: 44, paddingLeft: 6, paddingRight: 10, borderRadius: 10 },
  avatar: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#67737e" },
  count: {
    position: "absolute", top: 2, right: 2, minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10,
    borderWidth: 2, borderColor: c.white, backgroundColor: c.orange600, alignItems: "center", justifyContent: "center",
  },
  behind: {
    flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: 16, paddingVertical: 6,
    backgroundColor: c.yellow50, borderBottomWidth: 1, borderBottomColor: c.yellow100,
  },
  dialog: {
    position: "absolute", top: "10%", left: 16, right: 16, overflow: "hidden", borderRadius: 16, backgroundColor: c.white,
  },
  dialogRow: {
    flexDirection: "row", alignItems: "center", gap: 10, height: 56, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: c.grey200,
  },
});
