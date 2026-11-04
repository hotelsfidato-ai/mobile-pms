import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Bell, CheckCheck, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, orNull, type Hotel } from "./api";
import { ON_THE_WEBSITE, phoneRoute, relative } from "./menu";
import { isOnline } from "./offline";
import { body, regular, Slide } from "./Shell";
import { c, face, t } from "./theme";
import { Capsule, Card, Screen } from "./ui";

/* ══════════════════════════════════════════════════════════════════
   THE BELL AND THE NOTIFICATIONS SCREEN — the web's NotificationBell.tsx,
   src/pages/Notifications.tsx and data/repositories/notifications.ts.
   Derived on the server, never stored. "Read" is a fact about one person
   on one device, kept in memory as the web keeps it: nothing to send.
   ══════════════════════════════════════════════════════════════════ */

export interface Note {
  id: string;
  category: string;
  title: string;
  body: string;
  isRead: boolean;
  at: string;
  link?: string;
}

const dismissed = new Set<string>();
/** The frame goes on sign-out; what this person read goes with it, so the
    next person on the same phone starts with everything unread. */
export const forgetRead = () => dismissed.clear();

/** The list for a property, every 30 s (D27-363). A role the API refuses (the
    waiter holds no `notification`) gets the web's quiet "No notifications". */
export function useNotes(hotel: Hotel | null) {
  return useQuery({
    queryKey: ["notifications", hotel?.code],
    enabled: Boolean(hotel),
    refetchInterval: 30_000,
    queryFn: async () => {
      const rows = await orNull<Note[]>(`/api/hotels/${hotel!.code}/notifications?asOn=${hotel!.businessDate}`, [403]);
      return (rows ?? []).map((n) => ({ ...n, isRead: dismissed.has(n.id) }));
    },
  });
}

export const unreadOf = (notes: Note[] | undefined) => notes?.filter((n) => !n.isRead).length ?? 0;

/* NOTE_TONE: the category's tone, as a tint, its ink and its dot. */
const TONES: Record<string, [string, string, string]> = {
  approval: [c.yellow50, c.yellow800, "#ffb600"],
  reservation: [c.info50, c.info, c.info],
  payment: [c.red50, c.red700, "#e0301e"],
  automation: [c.orange50, c.orange700, c.orange],
  customer: [c.info50, c.info, c.info],
};
const NEUTRAL: [string, string, string] = [c.grey100, c.grey600, "#9aa2a9"];

/** StatusPill.tsx. */
function Pill({ tone, dot, children }: { tone: [string, string, string]; dot: boolean; children: string | number }) {
  return (
    <View style={[styles.pill, { backgroundColor: tone[0] }]}>
      {dot ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tone[2] }} /> : null}
      <Text style={[t.caption, t.tab, { color: tone[1] }]}>{children}</Text>
    </View>
  );
}

/** The bell's drawer: edge to edge on a phone, up to 420 wide. */
export function NotesDrawer({ hotel, onClose }: { hotel: Hotel | null; onClose: () => void }) {
  const cache = useQueryClient();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const q = useNotes(hotel);
  const notes = q.data;
  const unread = unreadOf(notes);
  const reread = () => void cache.invalidateQueries({ queryKey: ["notifications", hotel?.code] });

  const open = (n: Note, route: string | null) => {
    if (!n.isRead) { dismissed.add(n.id); reread(); }
    if (route) { onClose(); router.push(route as never); }
  };

  return (
    <Slide from="right" width={Math.min(width, 420)} scrim="rgba(1,13,23,0.25)" onClose={onClose}>
      <View style={[styles.sheet, { paddingTop: insets.top }]}>
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <Text style={[t.heading, { lineHeight: 24 }]} accessibilityRole="header">Notifications</Text>
            {/* Said only once the list is read: loading or failed is not "caught up". */}
            <Text style={[body, regular, { color: c.grey500, marginTop: 4 }]}>
              {!notes ? "-" : unread > 0 ? `${unread} unread` : "You are all caught up"}
            </Text>
          </View>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={14} style={{ padding: 4 }}>
            <X size={16} color={c.grey500} />
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }}>
          {!hotel || q.isLoading ? <Text style={[t.label, { padding: 20 }]}>Reading what needs attention…</Text>
            : q.error ? <View style={{ padding: 16 }}><Trouble error={q.error} retry={() => void q.refetch()} /></View>
            : !notes?.length ? (
              <Quiet title="No notifications" line="Approvals, arrivals and payment alerts will appear here." />
            ) : notes.map((n) => {
              const route = n.link ? phoneRoute(n.link, hotel.code) : null;
              return (
                <Pressable
                  key={n.id} onPress={() => open(n, route)} accessibilityRole="button" accessibilityLabel={n.title}
                  style={({ pressed }) => [styles.row, !n.isRead && { backgroundColor: "rgba(253,241,235,0.4)" }, pressed && { backgroundColor: c.grey50 }]}
                >
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                    <Text style={[{ flex: 1, fontSize: 14, lineHeight: 19, color: n.isRead ? c.grey600 : c.ink900 }, n.isRead ? regular : face[500]]}>{n.title}</Text>
                    {!n.isRead ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.orange, marginTop: 6 }} /> : null}
                  </View>
                  <Text style={[{ fontSize: 14, lineHeight: 19, color: c.grey500, marginTop: 4 }, regular]}>{n.body}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
                    <Pill tone={TONES[n.category] ?? NEUTRAL} dot={false}>{n.category}</Pill>
                    <Text style={styles.time}>{relative(n.at)}</Text>
                    {n.link && !route ? <Text style={[styles.time, { marginLeft: "auto" }]}>{ON_THE_WEBSITE}</Text> : null}
                  </View>
                </Pressable>
              );
            })}
        </ScrollView>

        {unread > 0 ? (
          <View style={[styles.foot, { paddingBottom: 14 + insets.bottom }]}>
            <Capsule
              label="Mark all as read" icon={<CheckCheck size={16} color={c.grey700} />}
              onPress={() => { notes?.forEach((n) => dismissed.add(n.id)); reread(); }}
            />
          </View>
        ) : null}
      </View>
    </Slide>
  );
}

/** The screen the menu opens (src/pages/Notifications.tsx). */
export function NotesScreen({ hotel }: { hotel: Hotel }) {
  const q = useNotes(hotel);
  const notes = q.data;
  const [pulled, setPulled] = useState(false);
  useEffect(() => { if (!q.isFetching) setPulled(false); }, [q.isFetching]);

  return (
    <Screen refreshing={pulled && q.isFetching} onRefresh={() => { setPulled(true); void q.refetch(); }}>
      <View style={{ marginBottom: 8, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={t.title} accessibilityRole="header">Notifications</Text>
          {notes ? <Pill tone={notes.length ? TONES.approval! : ["#eaf4f1", c.success600, "#1f6f5c"]} dot>{notes.length}</Pill> : null}
        </View>
        <Text style={[body, regular, { color: c.grey500 }]}>
          Derived, never stored - so nothing here can go stale while the thing it describes changes.
        </Text>
      </View>

      {q.error && notes ? (
        <Text style={[t.caption, { color: isOnline() ? c.red700 : c.yellow800 }]} accessibilityRole="alert">
          {isOnline() ? q.error.message : "No connection. Showing these as last read; pull down to read again."}
        </Text>
      ) : null}

      {notes?.length ? notes.map((n) => {
        const route = n.link ? phoneRoute(n.link, hotel.code) : null;
        return (
          <Card key={n.id} style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Pill tone={TONES[n.category] ?? NEUTRAL} dot>{n.category}</Pill>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginLeft: "auto" }}>
                <Text style={[t.caption, t.tab, regular]}>{relative(n.at)}</Text>
                {route ? (
                  <Pressable onPress={() => router.push(route as never)} accessibilityRole="link" hitSlop={12}>
                    <Text style={[body, { color: c.orange700, ...face[500] }]}>Open</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
            <Text style={[body, { color: c.ink900, ...face[500] }]}>{n.title}</Text>
            <Text style={[body, regular, { color: c.grey600 }]}>{n.body}</Text>
            {n.link && !route ? <Text style={[t.caption, regular]}>{ON_THE_WEBSITE}</Text> : null}
          </Card>
        );
      }) : q.isLoading ? <Text style={t.label}>Reading what needs attention…</Text>
        : q.error ? <Trouble error={q.error} retry={() => void q.refetch()} />
        : (
          <Card style={{ padding: 0 }}>
            <Quiet title="Nothing needs attention" line="No arrivals outstanding, no balances carrying into departure, no refunds due." />
          </Card>
        )}
    </Screen>
  );
}

/** Nothing there: the web's EmptyState. */
function Quiet({ title, line }: { title: string; line: string }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 }}>
      <View style={styles.quietIcon}><Bell size={20} color="#9aa2a9" /></View>
      <Text style={[t.heading, { textAlign: "center" }]}>{title}</Text>
      <Text style={[body, regular, { color: c.grey500, marginTop: 6, textAlign: "center" }]}>{line}</Text>
    </View>
  );
}

/** Could not read: the web's words, or no connection. */
function Trouble({ error, retry }: { error: Error; retry: () => void }) {
  const offline = !isOnline() || (error instanceof ApiError && error.status === 0);
  return (
    <Card style={{ gap: 8, ...(offline ? { backgroundColor: c.yellow50, borderColor: c.yellow100 } : { backgroundColor: c.red50, borderColor: c.red50 }) }}>
      <Text style={[t.heading, { color: offline ? c.yellow800 : c.red700 }]} accessibilityRole="alert">
        {offline ? "No connection" : "Could not work out what needs attention"}
      </Text>
      <Text style={[t.label, { color: c.grey700 }]}>
        {offline ? "These have not been read on this phone yet. They show once the line is back."
          : `These are derived from the day's stays and postings. Nothing is lost - try again. ${error.message}`}
      </Text>
      <View style={{ flexDirection: "row" }}><Capsule label="Try again" onPress={retry} /></View>
    </Card>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, alignSelf: "flex-start" },
  sheet: { flex: 1, backgroundColor: c.white },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 16, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.grey200 },
  row: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.grey100 },
  time: { fontSize: 12, lineHeight: 17, color: c.grey500, ...regular },
  foot: { alignItems: "flex-end", paddingHorizontal: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.grey200, backgroundColor: c.grey50 },
  quietIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: c.grey100, marginBottom: 16 },
});
