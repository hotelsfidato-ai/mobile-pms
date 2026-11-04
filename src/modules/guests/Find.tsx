import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, space, t } from "../../core/theme";
import { Screen, useRead } from "../../core/ui";
import { stayedWords } from "../front-desk/desk";
import { PageHead, Pill } from "../front-desk/kit";
import { body, Box, Empty, Loading, NotYours, Stale } from "../guest-services/kit";
import { LoadFailed } from "../laundry/kit";
import { isRefused, searchGuests } from "./data";
import { SearchBox } from "./kit";
import { contactLine, searchReady } from "./lookup";
import { whyNotGuest360 } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   GUEST 360's SEARCH on a phone — the web's /crm/guests
   (src/modules/crm/pages/Guest360.tsx Guest360SearchPage; picture
   pms-shots/all/19-guests-crm-guest-360). For the owner, an administrator
   and the GM (D21-4): a guest found by part of a name, or a whole phone
   number or email, across every hotel of the group; a row opens the guest.
   The server matches (app.guest_search: the name, the phone's and the
   email's keys - not a booking's reference, which All bookings finds).
   Each search is its own read in the core's cache, nowhere else.
   ══════════════════════════════════════════════════════════════════ */

export function Find({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const refused = whyNotGuest360(role);
  const [q, setQ] = useState("");
  const ready = searchReady(q);
  const found = useRead(
    () => (refused || !ready ? Promise.resolve(null) : searchGuests(code, q)),
    ["guests", code, "search", ready ? q.trim() : ""],
  );
  const off = isRefused(found.data) ? found.data.refused : null;
  const guests = found.data && !isRefused(found.data) ? found.data.guests : null;

  const head = <PageHead title="Guest 360" description="Find a guest by name, phone or email, and see every stay at every hotel of the group." />;
  if (refused || off) {
    return (
      <Screen refreshing={false} onRefresh={found.reload}>
        {head}
        <NotYours title="Guest 360" sentence={refused ?? off!} />
      </Screen>
    );
  }

  return (
    <Screen refreshing={false} onRefresh={found.reload}>
      {head}
      <SearchBox label="Find a guest" placeholder="Name, phone or email" value={q} onChangeText={setQ} />
      <View style={{ marginTop: 8, gap: space.card }}>
        {!ready ? <Text style={[body, { color: c.grey500 }]}>Type two letters of a name, or a whole phone number or email.</Text>
          : guests === null ? (found.error
            ? (
              <LoadFailed
                title="The search did not run" error={found.error} onRetry={found.reload}
                offline="This device is offline, so nobody can be looked up. Search again as soon as the connection is back."
              />
            )
            : <Loading words="Looking…" />)
            : guests.length === 0 ? (
              <Box><Empty compact title="Nobody found" description="No guest record has that name, phone or email." /></Box>
            ) : (
              <>
                <Stale error={found.error} />
                <Box>
                  {guests.map((g, i) => (
                    <Pressable
                      key={g.id} onPress={() => router.push(`/guests/${code}/find/${g.id}`)} accessibilityRole="button"
                      accessibilityLabel={`${g.name}${g.isBlacklisted ? ", blacklisted" : ""}, ${stayedWords(g.visits)}`}
                      style={({ pressed }) => ({
                        minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: space.cardX, paddingVertical: 12,
                        borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.grey100, backgroundColor: pressed ? c.grey50 : "transparent",
                      })}
                    >
                      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                          <Text style={[body, { color: c.ink900 }]}>{g.name}</Text>
                          {g.isBlacklisted ? <Pill tone="danger">Blacklisted</Pill> : null}
                        </View>
                        <Text style={[body, t.tab, { color: c.grey600 }]}>{contactLine(g)}</Text>
                        <Text style={[body, { color: c.grey500 }]}>{stayedWords(g.visits)}</Text>
                      </View>
                      <ChevronRight size={16} color={c.grey400} />
                    </Pressable>
                  ))}
                </Box>
              </>
            )}
      </View>
    </Screen>
  );
}
