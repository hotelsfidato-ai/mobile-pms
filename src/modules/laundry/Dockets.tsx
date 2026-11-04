import { router } from "expo-router";
import { ChevronRight, IndianRupee, Plus } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, space, t } from "../../core/theme";
import { Head, Screen, useRead } from "../../core/ui";
import { Back, Box, Btn, body, Empty, Loading, NotYours, Segmented, Stale } from "../guest-services/kit";
import { Collect } from "./Collect";
import { isRefused, readDockets, type Whose } from "./data";
import { byState, collectedDay, rupees, STATUS_TONE, STATUS_WORDS, stillOutWords, whoseWords, type Docket } from "./docket";
import { Fact, LoadFailed, StatePill } from "./kit";
import { ON_THE_WEBSITE, whyNotRead, whyNotTake } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   THE DOCKETS on a phone — the web's /h/:code/laundry
   (src/modules/laundry/pages/Dockets.tsx; picture pms-shots/new/n-h-laundry).
   A guest's bag and the hotel's own linen, one list, whose it is on every
   row (D18-5), open first. The list as the web's DataTable draws it at
   phone width: one card a docket, its six columns as labelled lines.
   Collect a bag opens the web's dialog (Collect.tsx). The Price list is set
   up on the website: its button is here, grey, with the reason.
   ══════════════════════════════════════════════════════════════════ */

export function Dockets({ hotel, role, onBack }: { hotel: Hotel; role: string | null; onBack: () => void }) {
  const code = hotel.code;
  const refused = whyNotRead(role);
  const mayTake = whyNotTake(role);
  const [whose, setWhose] = useState<Whose>("all");
  const [collecting, setCollecting] = useState(false);
  const [pulled, setPulled] = useState(false);

  const list = useRead(() => (refused ? Promise.resolve(null) : readDockets(code, whose)), ["laundry", code, "dockets", whose]);
  const off = isRefused(list.data) ? list.data.refused : null;
  const dockets = list.data && !isRefused(list.data) ? byState(list.data.dockets) : [];
  const open = (d: Docket) => router.push(`/laundry/${code}/${d.id}`);

  const collectButton = <Btn label="Collect a bag" variant="primary" icon={Plus} disabled={mayTake != null} onPress={() => setCollecting(true)} />;

  /* Laundry switched off, or the gate: the server's one sentence, with no
     filter or buttons above it that cannot work (the web, QA X-5). */
  if (refused || off) {
    return (
      <Screen refreshing={false} onRefresh={list.reload}>
        <Head title="Dockets" action={<Back onPress={onBack} />} />
        <NotYours title="Laundry" sentence={refused ?? off!} />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && list.loading} onRefresh={() => { setPulled(true); list.reload(); }}>
        <Head
          title="Dockets" under="Every bag that has gone out - a guest's and the hotel's own - and what has come back."
          action={<Back onPress={onBack} />}
        />
        <View style={{ gap: 4, marginTop: -4 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Btn label="Price list" icon={IndianRupee} disabled onPress={() => undefined} />
            {collectButton}
          </View>
          <Text style={[t.caption, { color: c.grey600 }]}>Price list: {ON_THE_WEBSITE}</Text>
          {mayTake ? <Text style={[t.caption, { color: c.grey600 }]}>{mayTake}</Text> : null}
        </View>

        <View style={{ gap: 8, marginTop: 8 }}>
          <Segmented<Whose>
            label="Whose" value={whose} onChange={setWhose}
            options={[{ value: "all", label: "Everything" }, { value: "guest", label: "Guests' bags" }, { value: "hotel", label: "The hotel's linen" }]}
          />
          {list.data ? <Text style={[body, { color: c.grey600 }]}>{stillOutWords(dockets)}</Text> : null}
        </View>

        {list.data === undefined
          ? (list.error
            ? (
              <LoadFailed
                title="The dockets did not load" error={list.error} onRetry={list.reload}
                offline="This device is offline, so the dockets cannot load. They load by themselves as soon as the connection is back."
              />
            )
            : <Loading words="Reading the dockets…" />)
          : dockets.length === 0 ? (
            <Box style={{ paddingBottom: 24, alignItems: "center" }}>
              <Empty
                title="Nothing has gone to the laundry yet"
                description={"A docket is one bag: whose it is, what is in it, and what has come back. A guest's charges to "
                  + "their room; the hotel's own linen is counted out and counted back, and never charged to anybody."}
              />
              {collectButton}
            </Box>
          ) : (
            <>
              <Stale error={list.error} />
              <Box>
                {dockets.map((d, i) => (
                  <Pressable
                    key={d.id} onPress={() => open(d)} accessibilityRole="button"
                    accessibilityLabel={`${d.number}, ${whoseWords(d)}, ${STATUS_WORDS[d.status]}`}
                    style={({ pressed }) => ({
                      minHeight: 44, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: space.cardX, paddingVertical: 12,
                      borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.grey100, backgroundColor: pressed ? c.grey50 : "transparent",
                      borderTopLeftRadius: i === 0 ? 12 : 0, borderTopRightRadius: i === 0 ? 12 : 0,
                    })}
                  >
                    <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                      <Text style={[body, { color: c.ink900, marginBottom: 2 }]}>{d.number}</Text>
                      <Fact label="Whose">
                        <Text style={[body, { color: d.belongsTo === "hotel" ? c.grey600 : c.ink900 }]}>{whoseWords(d)}</Text>
                      </Fact>
                      <Fact label="State"><StatePill tone={STATUS_TONE[d.status]}>{STATUS_WORDS[d.status]}</StatePill></Fact>
                      <Fact label="Pieces">{String(d.pieces)}</Fact>
                      <Fact label="Still out">{String(d.stillOut)}</Fact>
                      <Fact label="Total">
                        {/* A bag with anything unpriced in it has NO total: a dash, grey. */}
                        <Text style={[body, t.tab, { color: d.total === null ? c.grey500 : c.ink900 }]}>{rupees(d.total)}</Text>
                      </Fact>
                      <Fact label="Collected">{collectedDay(d)}</Fact>
                    </View>
                    <ChevronRight size={16} color={c.grey400} />
                  </Pressable>
                ))}
              </Box>
            </>
          )}
      </Screen>

      {collecting ? (
        <Collect
          code={code} onClose={() => setCollecting(false)}
          onCollected={(id, number) => {
            setCollecting(false);
            /* The end of the act is the docket itself (the web, MEMORY 291), which says it was collected. */
            router.push(`/laundry/${code}/${id}?collected=${encodeURIComponent(number)}`);
          }}
        />
      ) : null}
    </View>
  );
}
