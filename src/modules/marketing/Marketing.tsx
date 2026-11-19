import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, Text, View } from "react-native";
import { useState } from "react";
import type { Hotel } from "../../core/api";
import { c, space, t } from "../../core/theme";
import { Head, Screen } from "../../core/ui";
import { body, Failed, NotYours, Select, Stale } from "../guest-services/kit";
import { Blank, Exports, Line, Panel, RowCard } from "../leads/kit";
import { isRefused, readNumbers } from "./data";
import {
  CAMPAIGNS, campaignName, campaignsTable, monthChoices, monthOf, NO_CAMPAIGNS, NO_SOURCES, platformWords, rupees,
  sourceName, SOURCES, sourcesTable, spendNote, TITLE, UNDER, whyNotMarketing,
} from "./rules";

/* ══════════════════════════════════════════════════════════════════
   MARKETING on a phone — the web's /h/:code/marketing
   (src/modules/marketing/pages/Marketing.tsx; picture
   pms-shots/new/n-h-marketing, dev-gm). mobile/m13-sales.

   One month by arrival date: the campaigns (spend from the leads app,
   bookings and revenue from this system's stays) and every booking
   source. Each table becomes cards of labelled figures in the web's order;
   every figure is the server's row, nothing added up. The month is a list
   to choose from (the web's month input needs a date picker, not
   installed). Read only; never re-read on coming back (the spend is a
   read of the leads app), as the web.
   ══════════════════════════════════════════════════════════════════ */

export function Marketing({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const refusedRead = whyNotMarketing(role);
  const opens = monthOf(hotel.today ?? hotel.businessDate);
  const [month, setMonth] = useState(opens);
  const [pulled, setPulled] = useState(false);
  const q = useQuery({
    queryKey: ["marketing", code, month],
    queryFn: () => readNumbers(code, month),
    enabled: refusedRead === null,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
  const refused = isRefused(q.data) ? q.data.refused : null;
  const d = q.data && !isRefused(q.data) ? q.data : null;
  const error = q.error ? q.error.message : undefined;

  if (refusedRead || refused) {
    return (
      <Screen refreshing={false} onRefresh={() => void q.refetch()}>
        <Head title={TITLE} under={UNDER} />
        <NotYours title={TITLE} sentence={refusedRead ?? refused!} />
      </Screen>
    );
  }

  const note = spendNote(d);
  const waiting = <View style={{ padding: space.cardX }}><ActivityIndicator color={c.orange} accessibilityLabel="Reading the figures" /></View>;
  return (
    <Screen refreshing={pulled && q.isRefetching} onRefresh={() => { setPulled(true); void q.refetch(); }}>
      <Head title={TITLE} under={UNDER} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={[t.label, { color: c.grey600 }]}>Month</Text>
        <View style={{ flex: 1, maxWidth: 240 }}>
          <Select label="Month" value={month} options={monthChoices(opens)} onChange={setMonth} />
        </View>
      </View>
      {d === null && error ? <Failed title="Could not read the figures" error={error} onRetry={() => void q.refetch()} /> : <Stale error={error} />}

      <Panel title={CAMPAIGNS.title} description={CAMPAIGNS.description} flush>
        <View style={{ paddingHorizontal: space.cardX, paddingTop: 12 }}>
          <Exports role={role} holds="money" table={d ? campaignsTable(d) : null} />
        </View>
        {d === null ? waiting : d.campaigns.length === 0 ? (
          <Blank compact title={NO_CAMPAIGNS.title} line={NO_CAMPAIGNS.line} />
        ) : d.campaigns.map((r, i) => (
          <RowCard key={r.key} first={i === 0} heading={campaignName(r)}>
            <Line label="Where">{platformWords(r.platform)}</Line>
            <Line label="Spend">{rupees(r.spend)}</Line>
            <Line label="Bookings">{String(r.bookings)}</Line>
            <Line label="Revenue">{rupees(r.revenue)}</Line>
          </RowCard>
        ))}
        {note ? <Text style={[body, { color: c.grey600, paddingHorizontal: space.cardX, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.grey100 }]}>{note}</Text> : null}
      </Panel>

      <Panel title={SOURCES.title} description={SOURCES.description} flush>
        <View style={{ paddingHorizontal: space.cardX, paddingTop: 12 }}>
          <Exports role={role} holds="money" table={d ? sourcesTable(d) : null} />
        </View>
        {d === null ? waiting : d.sources.length === 0 ? (
          <Blank compact title={NO_SOURCES} />
        ) : d.sources.map((r, i) => (
          <RowCard key={r.id ?? "none"} first={i === 0} heading={sourceName(r)}>
            <Line label="Bookings">{String(r.bookings)}</Line>
            <Line label="Revenue">{rupees(r.revenue)}</Line>
          </RowCard>
        ))}
      </Panel>
    </Screen>
  );
}
