import { ArrowRight } from "lucide-react-native";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { dateLong } from "../../core/format";
import { c, face, t } from "../../core/theme";
import { Card, Screen, useRead } from "../../core/ui";
import { readWalkIns } from "./data";
import { body, PageHead, Pill, TextLink } from "./kit";
import { Kept, StayList, type Column } from "./StayList";

/* ══════════════════════════════════════════════════════════════════
   WALK-INS — the web's /h/:code/walk-ins (src/modules/front-desk/pages/
   WalkIns.tsx, picture 08). A record, not a form: taking a walk-in starts
   from an empty room, because the first question is always "which room is
   free tonight". The web's link opens the Calendar; the phone has no
   Calendar yet (slice 10), so Open Calendar opens tonight's empty rooms
   (TakeWalkIn.tsx), the phone's way to the same empty cell.
   ══════════════════════════════════════════════════════════════════ */

const COLUMNS: Column[] = ["type", "plan", "arrival", "departure", "nights", "rate"];

export function WalkIns({ hotel }: { hotel: Hotel }) {
  const code = hotel.code;
  const date = hotel.businessDate;
  const [pulled, setPulled] = useState(false);
  const read = useRead(() => readWalkIns(code), ["front-desk", code, "walk-ins"]);
  const rows = read.data;
  /* Not read yet is a dash, never "0 today". */
  const today = rows ? String(rows.filter((s) => s.arrival === date).length) : "-";
  useEffect(() => { if (!read.loading) setPulled(false); }, [read.loading]);

  return (
    <Screen refreshing={pulled && read.loading} onRefresh={() => { setPulled(true); read.reload(); }}>
      <PageHead
        title="Walk-ins"
        pill={rows ? <Pill tone="neutral">{`${rows.length} on record`}</Pill> : undefined}
        description={`Guests taken at the desk without a booking. ${today} today, ${dateLong(date)}.`}
      />

      <Card style={{ gap: 2 }}>
        <Text style={[t.label, face[500], { color: c.ink900 }]}>Take a walk-in from the Calendar</Text>
        <Text style={[t.label, body, { color: c.grey600, lineHeight: 23 }]}>
          Click any empty cell on the chart. The room and the night are already chosen by the time the form opens, which is the order the question actually arrives in at a front desk.
        </Text>
        <View style={{ flexDirection: "row" }}>
          <TextLink label="Open Calendar" Icon={ArrowRight} onPress={() => router.push(`/front-desk/${code}/take-walk-in`)} />
        </View>
      </Card>

      <Kept error={rows ? read.error : undefined} what="the walk-ins" />
      <StayList
        code={code} rows={rows} read={read} columns={COLUMNS} what="the walk-ins" offerCheckIn
        emptyTitle="No walk-ins on record" emptyLine="One appears here the moment it is taken from an empty cell on the Calendar."
      />
    </Screen>
  );
}
