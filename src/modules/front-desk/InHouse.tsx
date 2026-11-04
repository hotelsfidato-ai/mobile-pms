import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { cash, dateLong } from "../../core/format";
import { isOnline } from "../../core/offline";
import { c, face, t } from "../../core/theme";
import { Screen, useRead } from "../../core/ui";
import { readDueOut, readHouse, readInHouse, readOwed } from "./data";
import { body, PageHead, Pill, Segmented } from "./kit";
import { seesBills } from "./roles";
import { Kept, StayList, type Column } from "./StayList";

/* ══════════════════════════════════════════════════════════════════
   IN HOUSE · DUE OUT — the web's /h/:code/in-house and /in-house/due-out
   (src/modules/front-desk/pages/InHouse.tsx, pictures 06 and 07). Every
   guest checked in now (D17-10), and those of them leaving today, each with
   the bill's balance: on the departure list that number stands between a
   guest and the door. How many ROOMS are in house is the server's one count
   (D21-36): the list can hold more bookings than rooms.
   ══════════════════════════════════════════════════════════════════ */

const COLUMNS: Column[] = ["type", "plan", "arrival", "departure", "balance"];

export function InHouse({ hotel, role, view }: { hotel: Hotel; role: string | null; view: string | undefined }) {
  const code = hotel.code;
  const date = hotel.businessDate;
  const out = view === "due-out";
  const bills = seesBills(role);
  const [pulled, setPulled] = useState(false);
  const [asOf, setAsOf] = useState("");

  const here = useRead(() => readInHouse(code, date, bills), ["front-desk", code, "in-house", date, bills]);
  const leaving = useRead(() => readDueOut(code, date, bills), ["front-desk", code, "due-out", date, bills]);
  const house = useRead(() => readHouse(code), ["front-desk", code, "house-now"]);
  const active = out ? leaving : here;
  const rooms = out ? leaving.data?.length : house.data?.inHouse;
  /* Who still owes, and how much: the server's own count and sum (MFD-3), as the Dashboard's tile. */
  const owed = useRead(() => (out && bills ? readOwed(code) : Promise.resolve(null)), ["front-desk", code, "owed", date, out && bills]);
  const count = owed.data?.owing ?? null;

  /* Offline, the last load stays and says how old it is (D27-271). */
  const kept = !isOnline() && active.data !== undefined;
  useEffect(() => {
    if (!active.loading) setPulled(false);
    if (!active.loading && !active.error && active.data) setAsOf(new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }));
  }, [active.loading, active.error, active.data]);

  return (
    <Screen refreshing={pulled && active.loading} onRefresh={() => { setPulled(true); active.reload(); house.reload(); owed.reload(); }}>
      <PageHead
        title={out ? "Due out" : "In house"}
        pill={rooms !== undefined ? <Pill tone={out ? "warning" : "info"}>{`${rooms} room${rooms === 1 ? "" : "s"}`}</Pill> : undefined}
        description={out ? `Departing ${dateLong(date)}. Check-out unlocks when the bill reaches zero.` : `Guests checked in now, on ${dateLong(date)}.`}
      >
        <Segmented<"now" | "due-out">
          value={out ? "due-out" : "now"}
          onChange={(v) => router.setParams({ view: v === "due-out" ? "due-out" : "" })}
          options={[
            { value: "now", label: "In house now", ...(here.data ? { count: here.data.length } : {}) },
            { value: "due-out", label: "Due out", ...(leaving.data ? { count: leaving.data.length } : {}) },
          ]}
        />
      </PageHead>

      {kept && bills && asOf ? <Text style={[t.label, body, { color: c.grey600 }]}>{`Balances as of ${asOf}, may be out of date.`}</Text> : null}

      {out && count != null && count > 0 ? (
        <View style={{ borderRadius: 12, borderWidth: 1, borderColor: c.red100, backgroundColor: c.red50, paddingHorizontal: 16, paddingVertical: 14, gap: 2 }}>
          <Text style={[t.label, face[500], t.tab, { color: c.ink900 }]}>{`${count} departure${count === 1 ? "" : "s"} still owing ${cash(owed.data?.owed)}`}</Text>
          <Text style={[t.label, body, { color: c.grey600, lineHeight: 21 }]}>Settle from the Bill tab. Check-out stays disabled with its reason until each balance clears.</Text>
        </View>
      ) : null}

      <Kept error={active.data ? active.error : undefined} what={out ? "the departures" : "the house"} />
      <StayList
        code={code} rows={active.data} read={active} columns={COLUMNS} what={out ? "the departures" : "the house"} toBill={out && bills}
        emptyTitle={out ? "Nobody departing today" : "Nobody in house"}
        emptyLine={out ? "Every room stays another night." : "The house is empty tonight."}
      />
    </Screen>
  );
}
