import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import type { Hotel } from "../../core/api";
import { dateLong } from "../../core/format";
import { Screen, useRead } from "../../core/ui";
import { readArrivals, readUpcoming, type DeskStay } from "./data";
import { addDays } from "./desk";
import { PageHead, Pill, Segmented } from "./kit";
import { Blacklist, Kept, StayList, type Column } from "./StayList";

/* ══════════════════════════════════════════════════════════════════
   ARRIVALS — the web's /h/:code/arrivals and /arrivals/upcoming
   (src/modules/front-desk/pages/Arrivals.tsx, pictures 04 and 05). Who is
   coming: Today is the one a clerk works from, Upcoming the next fortnight.
   The fortnight is read only once it is opened, as the web: until then its
   tab shows no count.
   ══════════════════════════════════════════════════════════════════ */

const COLUMNS: Column[] = ["type", "plan", "source", "departure", "nights", "rate"];

export function Arrivals({ hotel, view }: { hotel: Hotel; view: string | undefined }) {
  const code = hotel.code;
  const date = hotel.businessDate;
  const later = view === "upcoming";
  const from = addDays(date, 1);
  const to = addDays(date, 14);
  const cache = useQueryClient();
  const [pulled, setPulled] = useState(false);

  const aheadKey = ["front-desk", code, "upcoming", date];
  const opened = later || cache.getQueryData(aheadKey) != null;
  const today = useRead(() => readArrivals(code, date), ["front-desk", code, "arrivals", date]);
  const ahead = useRead<DeskStay[] | null>(() => (opened ? readUpcoming(code, date, to) : Promise.resolve(null)), opened ? aheadKey : [...aheadKey, "not opened"]);
  const active = later ? ahead : today;
  const rows = active.data ?? undefined;
  useEffect(() => { if (!active.loading) setPulled(false); }, [active.loading]);

  return (
    <Screen refreshing={pulled && active.loading} onRefresh={() => { setPulled(true); active.reload(); }}>
      <PageHead
        title="Arrivals"
        pill={rows ? <Pill tone={rows.length ? "info" : "neutral"}>{`${rows.length} expected`}</Pill> : undefined}
        description={later
          ? `Expected between ${dateLong(from)} and ${dateLong(to)}.`
          : `Expected on ${dateLong(date)}. Check in from the row - the panel opens over this list.`}
      >
        <Segmented<"today" | "upcoming">
          value={later ? "upcoming" : "today"}
          onChange={(v) => router.setParams({ view: v === "upcoming" ? "upcoming" : "" })}
          options={[
            { value: "today", label: "Today", ...(today.data ? { count: today.data.length } : {}) },
            { value: "upcoming", label: "Upcoming", ...(ahead.data ? { count: ahead.data.length } : {}) },
          ]}
        />
      </PageHead>

      <Kept error={rows ? active.error : undefined} what="the arrivals" />
      {/* CRM-3: a booking site's guest on a blacklisted phone or email. */}
      <Blacklist code={code} from={later ? from : date} to={later ? to : date} ids={rows?.map((s) => s.id)} />

      <StayList
        code={code} rows={rows} read={active} columns={COLUMNS} what="the arrivals" offerCheckIn={!later}
        emptyTitle={later ? "Nothing booked in the next fortnight" : "No arrivals today"}
        emptyLine={later ? "Bookings appear here as they are taken." : "Nobody is expected. A walk-in can be taken from any empty cell on the Calendar."}
      />
    </Screen>
  );
}
