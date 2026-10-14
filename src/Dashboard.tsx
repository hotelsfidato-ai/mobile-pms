import { Text, View } from "react-native";
import type { Room, Stay } from "../../src/data/repositories/types";
import { api, orNull } from "./api";
import { Period } from "./AllProperties";
import {
  cash, count, dateLong, dateShort, methodsToday, monthStart, pct, pick, todaysWork,
  type DueOut, type Figure, type Hotel, type HouseNow, type ReportDoc,
} from "./figures";
import { c, space, t } from "./theme";
import { Capsule, Card, Head, ReadFailed, Row, Screen, s, useRead } from "./ui";

/* ══════════════════════════════════════════════════════════════════
   ONE PROPERTY'S DASHBOARD on a phone — the web's `/` (Dashboard.tsx),
   in its phone order: today's work, the navy Occupancy, the figures as
   blocks, then Money as rows.

   ⚠ Every money and occupancy figure is the MANAGER REPORT'S, for the
   property's own business date, so the phone, the web and the printed
   report cannot disagree by a rupee. A dash is a figure the system does
   not hold yet, never a 0.

   Not on the phone yet (later slices, or the website): the nights ahead,
   the house as a strip of rooms, the quick reports, opening the lists.
   ══════════════════════════════════════════════════════════════════ */

async function readDay(code: string, date: string) {
  const [report, stays, rooms, house, due] = await Promise.all([
    orNull<ReportDoc>(`/api/hotels/${code}/reports/manager?asOn=${date}`),
    /* The board's read of the day (D27-316 (1)), not every booking ever made. */
    orNull<Stay[]>(`/api/hotels/${code}/stays?from=${date}&to=${date}&board=1`),
    orNull<Room[]>(`/api/hotels/${code}/rooms`),
    orNull<HouseNow>(`/api/hotels/${code}/house-now`),
    /* What departing guests still owe: the server asks `invoice` (D27-147);
       a role without money gets no figure, not an error. */
    orNull<DueOut>(`/api/hotels/${code}/due-out`, [403]),
  ]);
  return {
    report,
    work: stays && rooms ? todaysWork(date, stays, rooms, house) : null,
    rooms: rooms?.length ?? null,
    due,
  };
}

type TileState = "now" | "due" | "done" | "none";
const TILE: Record<TileState, { bg: string; ring: string; note: string }> = {
  now: { bg: c.orange50, ring: c.orange100, note: c.orange700 },
  due: { bg: c.yellow50, ring: c.yellow100, note: c.yellow800 },
  done: { bg: c.white, ring: c.grey200, note: c.grey600 },
  none: { bg: c.white, ring: c.grey200, note: c.grey600 },
};

export function Dashboard({ hotel, onBack }: { hotel: Hotel; onBack: () => void }) {
  const date = hotel.businessDate;
  const read = useRead(() => readDay(hotel.code, date), `${hotel.code}@${date}`);
  const r = read.data?.report;
  const w = read.data?.work ?? null;
  const owing = read.data?.due ?? null;
  const loading = read.loading && !read.data;
  const show = (v: string) => (loading ? "…" : v);

  const occ = pick(r, "statistics", "Occupancy Rate (%)");
  const figures: Array<[string, Figure | undefined]> = [
    /* "ARR" on the screen (D27-243); the printed report keeps "ADR". */
    ["Average rate (ARR)", pick(r, "statistics", "Average Daily Rate (ADR)")],
    ["RevPAR", pick(r, "statistics", "Revenue Per Available Room")],
    ["Room revenue", pick(r, "room-charges", "Room Charges")],
  ];
  const paid = pick(r, "payment", "Total Payment");
  const methods = methodsToday(r);
  const owedByGuests = pick(r, "guest-ledger", "Closing Balance*");
  const cityLedger = pick(r, "city-ledger", "Closing Balance");
  const companyPaid = pick(r, "city-ledger", "Payment Received");
  const noShow = pick(r, "room-summary", "No Show Rooms");

  return (
    <Screen refreshing={read.loading && Boolean(read.data)} onRefresh={read.reload}>
      <Head
        eyebrow={`Business date · ${dateLong(date)}`}
        title="Dashboard"
        under={`${hotel.name} · month so far from ${dateShort(monthStart(date))}`}
        action={<Capsule label="‹ All" onPress={onBack} />}
      />

      {read.error ? <ReadFailed what="today's figures" error={read.error} onRetry={read.reload} /> : null}

      {/* ── Today's work: four tiles, two across ─────────────────── */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.tile }} accessibilityLabel="Today's work">
        <WorkTile
          label="Arrivals" n={w?.arriving} left={w?.toArrive} loading={loading}
          state={!w || w.arriving === 0 ? "none" : w.toArrive > 0 ? "due" : "done"}
          note={!w ? [] : w.arriving === 0 ? ["None today"]
            : w.toArrive > 0 ? [`${w.toArrive} still to arrive`, `${w.arriving - w.toArrive} checked in`]
              : [`All ${w.arriving} checked in`]}
        />
        <WorkTile
          label="Due out" n={w?.leaving} left={w?.toLeave} loading={loading}
          state={!w || w.leaving === 0 ? "none" : w.toLeave === 0 ? "done" : (owing?.owing ?? 0) > 0 ? "now" : "due"}
          note={!w ? [] : w.leaving === 0 ? ["None today"]
            : w.toLeave === 0 ? [`All ${w.leaving} checked out`]
              : [owing && owing.owing > 0 ? `${owing.owing} owe ${cash(owing.owed)}` : `${w.toLeave} still to leave`,
                `${w.leaving - w.toLeave} checked out`]}
        />
        <WorkTile
          label="In house" n={w?.inHouse} loading={loading} state="none"
          note={w ? [`${w.inHouse - w.dueOut} staying on`, `${w.dueOut} leave today`] : []}
        />
        <WorkTile
          label="Needs cleaning" n={w?.dirty} loading={loading}
          state={w == null ? "none" : w.dirty > 0 ? "due" : "done"}
          note={w ? ["Free rooms ready", `${w.ready} of ${w.empty}`] : []}
        />
      </View>

      {/* ── The anchor: Occupancy, in navy ───────────────────────── */}
      <View style={[s.navy, { gap: 12 }]}>
        <Text style={[t.label, { color: c.onNavy }]}>Occupancy</Text>
        <View>
          <Text style={[t.lead, { color: occ?.today == null && !loading ? "rgba(255,255,255,0.55)" : c.white }]}>{show(pct(occ?.today))}</Text>
          <Text style={[t.caption, { color: "rgba(255,255,255,0.55)" }]}>Today</Text>
        </View>
        <Gauge label="Month so far" value={occ?.ptd} show={show} />
        <Gauge label="Year so far" value={occ?.ytd} show={show} />
      </View>

      {/* ── The figures: one card of blocks (the Data Rule) ──────── */}
      <Card style={{ paddingVertical: 0 }}>
        {figures.map(([label, f], i) => (
          <View key={label} style={[{ paddingVertical: space.cardY, gap: 8 }, i > 0 && { borderTopWidth: 1, borderTopColor: c.grey200 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <Text style={t.label}>{label}</Text>
              <Text style={[t.figure, f?.today == null && !loading && { color: c.grey500 }]}>{show(cash(f?.today))}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 16 }}>
              <Period label="Month so far" value={show(cash(f?.ptd))} />
              <Period label="Year so far" value={show(cash(f?.ytd))} />
            </View>
          </View>
        ))}
      </Card>

      {/* ── Money: rows ──────────────────────────────────────────── */}
      <Card>
        <Text style={[t.heading, { marginBottom: 4 }]}>Money</Text>
        <MoneyRow label="Collected today" value={show(cash(paid?.today))}
          note={methods.length ? methods.map((m) => `${m.label} ${cash(m.today)}`).join(" · ") : "Nothing taken yet today"} />
        <MoneyRow label="Owed by guests, less refunds" value={show(cash(owedByGuests?.today))} note="Every guest bill still open"
          warn={(owedByGuests?.today ?? 0) > 0} />
        <MoneyRow label="City ledger" value={show(cash(cityLedger?.today))} note={`Paid today ${cash(companyPaid?.today)}`} />
        <MoneyRow label="No-shows" value={show(count(noShow?.today))} note={`Month so far ${count(noShow?.ptd)}`}
          warn={(noShow?.today ?? 0) > 0} />
      </Card>

      <Text style={t.caption}>
        {read.data?.rooms != null ? `${read.data.rooms} rooms · ` : ""}A dash is a figure this system does not hold yet, never a zero. Pull down to read again.
      </Text>
    </Screen>
  );
}

function WorkTile({ label, n, left, state, note, loading }: {
  label: string; n: number | null | undefined; left?: number; state: TileState; note: string[]; loading: boolean;
}) {
  const tone = TILE[state];
  return (
    <View style={{ flexBasis: "47%", flexGrow: 1, backgroundColor: tone.bg, borderColor: tone.ring, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 6 }}>
      <Text style={t.label} numberOfLines={1}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
        <Text style={[t.figure, n == null ? { color: c.grey500 } : state === "done" && { color: c.success600 }]}>
          {loading ? "…" : count(n)}{state === "done" && !loading ? " ✓" : ""}
        </Text>
        {!loading && left != null && left > 0 ? <Text style={t.label}>· {left} left</Text> : null}
      </View>
      {note.map((part, i) => (
        <Text key={i} style={[t.caption, { color: i === 0 ? tone.note : c.grey600, fontWeight: i === 0 && state !== "none" && state !== "done" ? "600" : "500" }]} numberOfLines={1}>
          {part}
        </Text>
      ))}
    </View>
  );
}

/** A 4px capsule gauge on navy, its figure written beside it. */
function Gauge({ label, value, show }: { label: string; value: number | null | undefined; show: (v: string) => string }) {
  return (
    <View style={{ gap: 6 }}>
      <Row label={label} value={show(pct(value))} onNavy />
      <View style={{ height: 4, borderRadius: 2, backgroundColor: c.navyTrack, overflow: "hidden" }}>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: c.orange, width: `${Math.min(100, Math.max(0, value ?? 0))}%` }} />
      </View>
    </View>
  );
}

/** A Money row: the label on line 1, the note and the amount on line 2. */
function MoneyRow({ label, value, note, warn }: { label: string; value: string; note: string; warn?: boolean }) {
  return (
    <View style={{ paddingVertical: 12, gap: 2, borderTopWidth: 1, borderTopColor: c.grey100 }}>
      <Text style={[t.label, { color: c.ink900 }]}>{label}</Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <Text style={[t.caption, { flexShrink: 1 }]}>{note}</Text>
        <Text style={[t.figure, warn && { color: c.orange700 }]}>{value}</Text>
      </View>
    </View>
  );
}
