import { router } from "expo-router";
import { ChevronRight, Inbox } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { dateLong } from "../../core/format";
import { c, face, t } from "../../core/theme";
import { Card, Screen, useRead } from "../../core/ui";
import { readEmpty } from "./data";
import { body, Empty, PageHead, Pill } from "./kit";
import { whyNotBook } from "./roles";
import { Kept, NotRead } from "./StayList";

/* ══════════════════════════════════════════════════════════════════
   TAKE A WALK-IN — the phone's way to the web's empty room. On the web a
   walk-in starts from an empty tile on Rooms or an empty cell on the
   Calendar (HouseFloor.tsx, StayView.tsx); the phone has neither yet
   (slice 10), so this lists the same tiles for tonight, each opening New
   booking on that room. NOT in the pictures: the phone's own screen until
   the Calendar arrives. Open Calendar then goes there and this goes.
   ══════════════════════════════════════════════════════════════════ */

export function TakeWalkIn({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const date = hotel.businessDate;
  const [pulled, setPulled] = useState(false);
  const read = useRead(() => readEmpty(code, date), ["front-desk", code, "empty", date]);
  const refused = whyNotBook(role);
  useEffect(() => { if (!read.loading) setPulled(false); }, [read.loading]);

  return (
    <Screen refreshing={pulled && read.loading} onRefresh={() => { setPulled(true); read.reload(); }}>
      <PageHead title="Take a walk-in" description={`The empty rooms tonight, ${dateLong(date)}. The room and the night are already chosen by the time the form opens.`} />
      {refused ? <Text style={[t.label, body, { color: c.grey600 }]}>{refused}</Text> : null}
      <Kept error={read.data ? read.error : undefined} what="the rooms" />
      {!read.data ? (read.error ? <NotRead what="the rooms" error={read.error} onRetry={read.reload} plural /> : <Text style={t.label}>Reading the rooms…</Text>)
        : read.data.length === 0 ? <Card><Empty title="No empty rooms tonight" line="Every room has a guest, an arrival, or is out of service." Icon={Inbox} /></Card>
          : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {read.data.map((room) => {
                const dirty = room.status === "dirty";
                return (
                  <Pressable
                    key={room.number} disabled={refused != null} onPress={() => router.push(`/front-desk/${code}/walk-in?room=${encodeURIComponent(room.number)}`)}
                    accessibilityRole="button" accessibilityLabel={`Room ${room.number}, ${room.type}, ${dirty ? "needs cleaning" : "empty"}`} accessibilityState={{ disabled: refused != null }}
                    style={({ pressed }) => ({
                      width: "48.8%", minHeight: 84, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 4,
                      borderColor: dirty ? c.red100 : c.grey200, backgroundColor: pressed ? c.grey50 : dirty ? c.red50 : c.white,
                    })}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                      <Text style={[t.figure, face[500], { color: c.grey700 }]}>{room.number}</Text>
                      {dirty ? <Pill tone="danger">Needs cleaning</Pill> : <Text style={[t.caption, { color: c.grey500 }]}>Empty</Text>}
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text numberOfLines={1} style={[t.caption, { flex: 1 }]}>{room.type}</Text>
                      <ChevronRight size={16} color="#9aa2a9" />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
    </Screen>
  );
}
