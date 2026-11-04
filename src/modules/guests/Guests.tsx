import { AlertTriangle } from "lucide-react-native";
import { useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, space, t } from "../../core/theme";
import { useRead } from "../../core/ui";
import { PageHead, Pill } from "../front-desk/kit";
import { body, Box, Empty, Input, Loading, NotYours, Stale } from "../guest-services/kit";
import { LoadFailed } from "../laundry/kit";
import { isRefused, readGuests } from "./data";
import { Avatar, Line, OwedText } from "./kit";
import { rupees } from "../laundry/docket";
import { backWords, byName, guestCount, lastStayWords, OVERLAP_NOTE, overlapTitle, owed, type GuestRecord } from "./lookup";
import { whyNotGuests } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   GUESTS on a phone — the web's /guests (src/modules/guests/pages/
   Guests.tsx GuestsPage; picture pms-shots/all/15-guests-crm-guests).
   Everyone who has stayed at this property, grouped by name from every
   stay, repeat guests first (the server's order); names whose live stays
   overlap are flagged, never merged. Found by part of the name. Read only,
   as the web: a row is a name, not a guest record, so it opens nothing.
   The web's DataTable at phone width: one card a guest, its columns as
   labelled lines. A FlatList, so 456 guests draw as they scroll into view.
   ══════════════════════════════════════════════════════════════════ */

export function Guests({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const refused = whyNotGuests(role);
  const [search, setSearch] = useState("");
  const [pulled, setPulled] = useState(false);
  const list = useRead(() => (refused ? Promise.resolve(null) : readGuests(code, hotel.businessDate)), ["guests", code, "list", hotel.businessDate]);
  const off = isRefused(list.data) ? list.data.refused : null;
  const all = list.data && !isRefused(list.data) ? list.data : null;
  const shown = all ? byName(all, search) : [];
  const dupes = all ? all.filter((g) => g.possibleDuplicate).length : 0;

  if (refused || off) {
    return (
      <FlatList
        data={[]} renderItem={null} style={{ backgroundColor: c.grey50 }} contentContainerStyle={pad}
        ListHeaderComponent={<View style={{ gap: space.card }}><PageHead title="Guests" /><NotYours title="Guests" sentence={refused ?? off!} /></View>}
      />
    );
  }

  const head = (
    <View style={{ gap: 20, marginBottom: space.section }}>
      <PageHead
        title="Guests"
        pill={all ? <Pill tone="neutral">{guestCount(all)}</Pill> : undefined}
        description={all === null && !list.error ? "Loading…" : "Grouped by name from every stay. Repeat guests rise to the top."}
      >
        <View style={{ width: 256, maxWidth: "100%" }}>
          <Input label="Find a guest by name" placeholder="Find a guest by name" value={search} onChangeText={setSearch} />
        </View>
      </PageHead>
      {dupes > 0 ? (
        <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start", borderRadius: 12, borderWidth: 1, borderColor: c.yellow100, backgroundColor: c.yellow50, paddingHorizontal: 16, paddingVertical: 14 }}>
          <AlertTriangle size={16} color={c.yellow} style={{ marginTop: 3 }} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={[body, { color: c.ink900 }]}>{overlapTitle(dupes)}</Text>
            <Text style={[body, { color: c.grey600 }]}>{OVERLAP_NOTE}</Text>
          </View>
        </View>
      ) : null}
      {all ? <Stale error={list.error} /> : null}
      {all === null ? (list.error
        ? (
          <LoadFailed
            title="The guests did not load" error={list.error} onRetry={list.reload}
            offline="This device is offline, so the guest list cannot load. It loads by itself as soon as the connection is back."
          />
        )
        : <Loading words="Reading the guests…" />) : null}
      {all && shown.length === 0 ? (
        <Box>
          {search.trim()
            ? <Empty compact title="No guest by that name" description="Try part of the surname." />
            : <Empty compact title="No guests yet" description="A guest is added here the first time they are booked." />}
        </Box>
      ) : null}
    </View>
  );

  return (
    <FlatList
      data={shown}
      keyExtractor={(g) => g.id}
      style={{ backgroundColor: c.grey50 }}
      contentContainerStyle={pad}
      keyboardShouldPersistTaps="handled"
      initialNumToRender={8}
      windowSize={7}
      ListHeaderComponent={head}
      refreshControl={<RefreshControl refreshing={pulled && list.loading} onRefresh={() => { setPulled(true); list.reload(); }} tintColor={c.orange} colors={[c.orange]} />}
      renderItem={({ item, index }) => <GuestCard g={item} first={index === 0} last={index === shown.length - 1} />}
    />
  );
}

const pad = { paddingTop: 16, paddingHorizontal: space.side, paddingBottom: 40 };

/** One guest, as DataTable's phone card draws a row: the name (with its
    avatar and the overlap mark) as the card's head, then each column. The
    rows of one white card: the first rounds its top, the last its foot. */
function GuestCard({ g, first, last }: { g: GuestRecord; first: boolean; last: boolean }) {
  const back = backWords(g);
  return (
    <View style={{
      backgroundColor: c.white, borderColor: c.grey200, borderLeftWidth: 1, borderRightWidth: 1,
      borderTopWidth: first ? 1 : 0, borderBottomWidth: last ? 1 : 0,
      borderTopLeftRadius: first ? 12 : 0, borderTopRightRadius: first ? 12 : 0,
      borderBottomLeftRadius: last ? 12 : 0, borderBottomRightRadius: last ? 12 : 0,
    }}>
      <View style={{ paddingHorizontal: space.cardX, paddingVertical: 12, gap: 4, borderTopWidth: first ? 0 : 1, borderTopColor: c.grey100 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 2 }}>
          <Avatar name={g.name} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[body, { color: c.ink900 }]}>{g.name}</Text>
            {g.possibleDuplicate ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                <AlertTriangle size={12} color={c.yellow} />
                <Text style={[t.caption, { color: c.yellow800, lineHeight: 17 }]}>overlapping stays</Text>
              </View>
            ) : null}
          </View>
        </View>
        <Line label="Stays">{String(g.stays)}</Line>
        <Line label="Nights">{String(g.nights)}</Line>
        <Line label="Last stay">
          <View>
            <Text style={[body, t.tab, { color: g.lastStay ? c.grey600 : c.grey500 }]}>{lastStayWords(g)}</Text>
            {back ? <Text style={[t.caption, t.tab, { color: c.info, lineHeight: 17, marginTop: 2 }]}>{back}</Text> : null}
          </View>
        </Line>
        <Line label="Booked via"><Text style={[body, { color: c.grey600 }]}>{g.sources.join(", ")}</Text></Line>
        <Line label="Total spend">{rupees(g.totalSpend)}</Line>
        <Line label="Balance"><OwedText o={owed(g.openBalance)} /></Line>
      </View>
    </View>
  );
}
