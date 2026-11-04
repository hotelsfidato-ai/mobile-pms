import {
  BedDouble, Building2, Check, ChartColumn, ChevronLeft, ChevronRight, ClipboardList, Landmark, LogIn, LogOut,
  ReceiptText, SprayCan, UserX, Users, Wallet, type LucideIcon,
} from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import type { Room, Stay } from "../../core/types";
import { orNull, type Hotel } from "../../core/api";
import { DASH, cash, count, dateLong, monthStart, pct } from "../../core/format";
import { isOnline } from "../../core/offline";
import { c, face, space, t } from "../../core/theme";
import { Capsule, Card, Head, ReadFailed, Screen, s, useRead } from "../../core/ui";
import { NightsAhead, OccupancyByDay, RevenueSplit, RoomStrip, Spark } from "./Charts";
import {
  LAST_DAYS, addDays, dateYear, houseRooms, lastDays, methodsToday, monthDays, monthName, pick, todaysWork,
  type DayStatistics, type DueOut, type Figure, type HouseNow, type LineKey, type ReportDoc,
} from "./figures";
import { AnchorGauge, IconChip, InfoButton, Ring, SplitBar, Swatch, Term, more, type ChipTone, type TermKey } from "./kit";

/* ══════════════════════════════════════════════════════════════════
   ONE PROPERTY'S DASHBOARD on a phone — the web's `/`, the picture
   pms-shots/all/01-home-dashboard.png, top to bottom (M-11): today's work,
   the navy Occupancy, the figures with their last 14 days, Occupancy by
   day, Revenue, Nights ahead, Money, the house now, the quick reports.

   ⚠ Every money and occupancy figure is the MANAGER REPORT'S, for the
   property's own business date, so the phone, the web and the printed
   report cannot disagree by a rupee; the charts read the Monthly
   statistics report and the daily statistics, as the web does. A dash is
   a figure the system does not hold yet, never a 0.

   Each read stands alone, as the web's queries do: one that fails says so
   where its figures would be, and the rest of the page still shows.
   ══════════════════════════════════════════════════════════════════ */

/* The section notes, word for word as they stood under the headings. */
const NOTES = {
  today: "Today, then the month so far and the year so far. The year runs from 1 April.",
  house: "Every room on the business date, in the Rooms board's colours.",
  money: "From the same figures as the Manager Report. A dash is a figure this system does not hold yet, never a zero.",
  nights: "Tonight and the 13 nights after it: rooms sold, as a share of the rooms to sell, as the Calendar's footer shows them. A night with no figures shows a dash. Each opens the Calendar.",
  days: "Each night of the month, from the same figures as the Monthly statistics report. Nights after the business date show what is booked so far.",
  revenue: "From the Manager report's Revenue Summary, without tax.",
};

/* One icon each. None is on the phone yet (M-11: greyed, not hidden). */
const QUICK_REPORTS: Array<{ label: string; icon: LucideIcon }> = [
  { label: "Manager report", icon: ClipboardList },
  { label: "Monthly statistics", icon: ChartColumn },
  { label: "Lodging tax", icon: Landmark },
  { label: "City ledger", icon: Building2 },
  { label: "No show", icon: UserX },
];
const WEBSITE = "On the website for now";

async function readDay(code: string, date: string) {
  const [stays, rooms, house] = await Promise.all([
    /* The board's read of the day (D27-316 (1)), not every booking ever made. */
    orNull<Stay[]>(`/api/hotels/${code}/stays?from=${date}&to=${date}&board=1`),
    orNull<Room[]>(`/api/hotels/${code}/rooms`),
    orNull<HouseNow>(`/api/hotels/${code}/house-now`),
  ]);
  return stays && rooms ? { work: todaysWork(date, stays, rooms, house), rooms: houseRooms(date, stays, rooms, house) } : null;
}

type TileState = "now" | "due" | "done" | "none";
const TILE: Record<TileState, { bg: string; ring: string; note: string }> = {
  now: { bg: c.orange50, ring: c.orange100, note: c.orange700 },
  due: { bg: c.yellow50, ring: c.yellow100, note: c.yellow800 },
  done: { bg: c.white, ring: c.grey200, note: c.grey600 },
  none: { bg: c.white, ring: c.grey200, note: c.grey600 },
};

/** Each tile's way in, from the route file; none where the phone has no such screen yet. */
export interface TileLinks { onOpenArrivals?: () => void; onOpenDueOut?: () => void; onOpenInHouse?: () => void; onOpenRooms?: () => void }

export function Dashboard({ hotel, onBack, onOpenArrivals, onOpenDueOut, onOpenInHouse, onOpenRooms }: TileLinks & { hotel: Hotel; onBack: () => void }) {
  const code = hotel.code;
  const date = hotel.businessDate;
  const month = date.slice(0, 7);
  const nightsTo = addDays(date, 13);
  /* The month before as well, while the last 14 days cross a month start. */
  const before = addDays(date, -(LAST_DAYS - 1)) < monthStart(date) ? addDays(monthStart(date), -1).slice(0, 7) : null;

  const report = useRead(() => orNull<ReportDoc>(`/api/hotels/${code}/reports/manager?asOn=${date}`), ["dashboard", code, date, "manager"]);
  const day = useRead(() => readDay(code, date), ["dashboard", code, date, "day"]);
  /* What departing guests still owe: the server asks `invoice` (D27-147);
     a role without money gets no figure, not an error. */
  const due = useRead(() => orNull<DueOut>(`/api/hotels/${code}/due-out`, [403]), ["dashboard", code, date, "due"]);
  const nights = useRead(() => orNull<DayStatistics[]>(`/api/hotels/${code}/statistics/daily?from=${date}&to=${nightsTo}`), ["dashboard", code, date, "nights"]);
  const thisMonth = useRead(() => orNull<ReportDoc>(`/api/hotels/${code}/reports/monthly-statistics?month=${month}`), ["dashboard", code, month, "month"]);
  const lastMonth = useRead(
    () => (before ? orNull<ReportDoc>(`/api/hotels/${code}/reports/monthly-statistics?month=${before}`) : Promise.resolve(null)),
    ["dashboard", code, before, "month"],
  );
  const reads = [report, day, due, nights, thisMonth, lastMonth];
  const again = () => reads.forEach((x) => x.reload());
  const refreshing = reads.some((x) => x.loading && x.data !== undefined);

  const r = report.data;
  const w = day.data?.work ?? null;
  const owing = due.data ?? null;
  const loading = (report.loading && !r) || (day.loading && !day.data);
  const show = (v: string) => (loading ? "…" : v);
  const failed = report.error ?? day.error;

  const monthRows = monthDays(thisMonth.data, month);
  const lastRows = lastDays([...monthDays(lastMonth.data, before ?? ""), ...monthRows], date);
  const sparking = (thisMonth.loading && !thisMonth.data) || (lastMonth.loading && !lastMonth.data);

  const occ = pick(r, "statistics", "Occupancy Rate (%)");
  const figures: Array<{ label: string; term?: TermKey; f: Figure | undefined; line: LineKey }> = [
    /* "ARR" on the screen (D27-243); the printed report keeps "ADR". */
    { label: "Average rate (ARR)", term: "adr", f: pick(r, "statistics", "Average Daily Rate (ADR)"), line: "adr" },
    { label: "RevPAR", term: "revpar", f: pick(r, "statistics", "Revenue Per Available Room"), line: "revpar" },
    { label: "Room revenue", f: pick(r, "room-charges", "Room Charges"), line: "room" },
  ];
  const paid = pick(r, "payment", "Total Payment");
  const methods = methodsToday(r);
  const owedByGuests = pick(r, "guest-ledger", "Closing Balance*");
  const cityLedger = pick(r, "city-ledger", "Closing Balance");
  const companyPaid = pick(r, "city-ledger", "Payment Received");
  const noShow = pick(r, "room-summary", "No Show Rooms");

  return (
    <Screen refreshing={refreshing} onRefresh={again}>
      <Head
        eyebrow={`Business date · ${dateLong(date)}`}
        title="Dashboard"
        under={`${hotel.name} · month so far from ${dateYear(monthStart(date))}`}
        action={<Capsule label="All" icon={<ChevronLeft size={16} color={c.grey700} />} onPress={onBack} />}
      />

      {failed && (r || day.data) && !isOnline() ? (
        <Text style={[t.caption, { color: c.yellow800 }]} accessibilityRole="alert">No connection. Showing the figures as last read; pull down to read again.</Text>
      ) : failed ? <ReadFailed what="today's figures" error={failed} onRetry={again} /> : null}

      {/* ── Today's work: four tiles that open their lists ─────────── */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.card }} accessibilityLabel="Today's work">
        <WorkTile
          icon={LogIn} chip="yellow" label="Arrivals" n={w?.arriving} left={w?.toArrive} loading={loading} onPress={onOpenArrivals}
          state={!w || w.arriving === 0 ? "none" : w.toArrive > 0 ? "due" : "done"}
          note={!w ? [] : w.arriving === 0 ? ["None today"]
            : w.toArrive > 0 ? [<B key="b">{w.toArrive} still to arrive</B>, `${w.arriving - w.toArrive} checked in`]
              : [`All ${w.arriving} checked in`]}
        />
        <WorkTile
          icon={LogOut} chip="orange" label="Due out" n={w?.leaving} left={w?.toLeave} loading={loading} onPress={onOpenDueOut}
          state={!w || w.leaving === 0 ? "none" : w.toLeave === 0 ? "done" : (owing?.owing ?? 0) > 0 ? "now" : "due"}
          note={!w ? [] : w.leaving === 0 ? ["None today"]
            : w.toLeave === 0 ? [`All ${w.leaving} checked out`]
              : [<B key="b">{owing && owing.owing > 0 ? `${owing.owing} owe ${cash(owing.owed)}` : `${w.toLeave} still to leave`}</B>,
                `${w.leaving - w.toLeave} checked out`]}
        />
        <WorkTile
          icon={Users} chip="blue" label="In house" n={w?.inHouse} loading={loading} state="none" onPress={onOpenInHouse}
          note={w ? [`${w.inHouse - w.dueOut} staying on`, `${w.dueOut} leave today`] : []}
        />
        <WorkTile
          icon={SprayCan} chip="green" label="Needs cleaning" n={w?.dirty} loading={loading} onPress={onOpenRooms}
          state={w == null ? "none" : w.dirty > 0 ? "due" : "done"}
          note={w ? ["Free rooms ready", `${w.ready} of ${w.empty}`] : []}
        />
      </View>

      {/* ── The anchor: Occupancy, in navy ───────────────────────── */}
      <View style={[s.navy, { gap: 12 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <IconChip icon={BedDouble} tone="glass" />
          <View style={{ flex: 1 }}><Term name="occupancy" style={[t.label, { color: c.onNavy }]}>Occupancy</Term></View>
          <InfoButton words={NOTES.today} color={more.navy60} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Ring value={occ?.today == null ? null : occ.today / 100} color={c.orange} track={c.navyTrack} />
          <View style={{ flex: 1 }}>
            <Text style={[t.lead, { color: occ?.today == null && !loading ? more.navy55 : c.white }]}>{show(pct(occ?.today))}</Text>
            <Text style={[t.caption, { color: more.navy55, marginTop: 2 }]}>Today</Text>
          </View>
        </View>
        <View style={{ gap: 12 }}>
          <AnchorGauge label="Month so far" value={show(pct(occ?.ptd))} missing={occ?.ptd == null && !loading} fraction={(occ?.ptd ?? 0) / 100} />
          <AnchorGauge label="Year so far" value={show(pct(occ?.ytd))} missing={occ?.ytd == null && !loading} fraction={(occ?.ytd ?? 0) / 100} />
        </View>
      </View>

      {/* ── The figures: one card of blocks (the Data Rule) ──────── */}
      <Card style={{ paddingHorizontal: 0, paddingVertical: 0 }}>
        {figures.map(({ label, term, f, line }, i) => (
          <View key={label} style={[{ paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 8 }, i > 0 && { borderTopWidth: 1, borderTopColor: c.grey200 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              {term ? <Term name={term} style={[t.label, { flexShrink: 1 }]}>{label}</Term> : <Text style={[t.label, { flexShrink: 1 }]}>{label}</Text>}
              <Text style={[t.figure, { textAlign: "right" }, f?.today == null && !loading && { color: c.grey500 }]}>{show(cash(f?.today))}</Text>
            </View>
            {/* zIndex: a Last 14 days reading stands over what is beside it. */}
            <View style={{ flexDirection: "row", gap: 16, zIndex: 1 }}>
              <View style={{ width: 96, gap: 2, zIndex: 1 }}>
                <Text style={t.caption} numberOfLines={1}>Last 14 days</Text>
                <Spark name={label.replace(/ \(.*/, "")} days={lastRows} line={line} loading={sparking} />
              </View>
              {([["Month so far", f?.ptd], ["Year so far", f?.ytd]] as const).map(([name, v]) => (
                <View key={name} style={{ flex: 1, gap: 2 }}>
                  <Text style={t.caption} numberOfLines={1}>{name}</Text>
                  <Text style={[t.label, t.tab, { color: v == null ? c.grey500 : c.grey700 }]}>{show(cash(v))}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </Card>

      {/* ── The charts (D27-365): the month, then where its revenue came from ── */}
      <Card>
        <CardTitle title="Occupancy by day" info={NOTES.days} meta={monthName(date)} />
        {thisMonth.error ? <ReadFailed what="the month's occupancy" error={thisMonth.error} onRetry={thisMonth.reload} /> : (
          <OccupancyByDay days={monthRows} date={date} loading={thisMonth.loading && !thisMonth.data} month={monthName(date)} />
        )}
      </Card>
      <Card>
        <CardTitle title="Revenue" info={NOTES.revenue} meta="Without tax" />
        <RevenueSplit doc={r} loading={report.loading && !r} />
      </Card>

      {/* ── The nights ahead: a bar under each date (D27-243) ─────── */}
      <Card>
        <CardTitle title="Nights ahead" info={NOTES.nights} meta={`${dateYear(date)} to ${dateYear(nightsTo)}`} />
        {nights.error ? <ReadFailed what="the nights ahead" error={nights.error} onRetry={nights.reload} /> : (
          <NightsAhead from={date} days={nights.data} loading={nights.loading && !nights.data} />
        )}
      </Card>

      {/* ── Money ────────────────────────────────────────────────── */}
      <Card>
        <CardTitle title="Money" info={NOTES.money} />
        <MoneyItem
          first icon={Wallet} tone="green" label="Collected today" value={show(cash(paid?.today))}
          note={methods.length
            ? methods.map((m, i) => (
              <View key={m.label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Swatch i={i} /><Text style={[t.caption, { lineHeight: 17 }]}>{m.label} {cash(m.today)}</Text>
              </View>
            ))
            : ["Nothing taken yet today"]}
          /* Chart 4 (D27-365): how it was paid, as a split bar under the methods. */
          bar={methods.length > 0 && !loading ? (
            <SplitBar parts={methods.map((m) => ({ name: m.label, value: m.today }))} label={methods.map((m) => `${m.label} ${cash(m.today)}`).join(", ")} />
          ) : undefined}
        />
        <MoneyItem
          icon={ReceiptText} tone={(owedByGuests?.today ?? 0) > 0 ? "orange" : "neutral"} term="guestLedger"
          label="Owed by guests, less refunds" value={show(cash(owedByGuests?.today))} note={["Every guest bill still open"]}
        />
        <MoneyItem
          icon={Building2} term="cityLedger" label="City ledger" value={show(cash(cityLedger?.today))}
          note={[`Paid today ${cash(companyPaid?.today)}`]}
        />
        <MoneyItem
          last icon={UserX} tone={(noShow?.today ?? 0) > 0 ? "orange" : "neutral"} warn={(noShow?.today ?? 0) > 0}
          label="No-shows" value={show(count(noShow?.today))} note={[`Month so far ${count(noShow?.ptd)}`]}
          /* The picture's arrow opens the No-show report: not on the phone yet, so greyed. */
          elsewhere
        />
      </Card>

      {/* ── The house, now: one square per room ──────────────────── */}
      <Card>
        <CardTitle
          title="The house now" info={NOTES.house}
          meta={w && day.data ? `${day.data.rooms.length} rooms · ${w.empty} empty · ${w.blocked} out of service` : undefined}
        />
        {day.data?.rooms.length ? <RoomStrip rooms={day.data.rooms} /> : null}
      </Card>

      {/* ── Quick reports: none on the phone yet ─────────────────── */}
      <View style={{ marginTop: 8, gap: 8 }}>
        <Text style={t.heading} accessibilityRole="header">Quick reports</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 8 }}>
          {QUICK_REPORTS.map(({ label, icon: Icon }) => (
            <View
              key={label} accessible accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: true }} accessibilityHint={WEBSITE}
              style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: c.grey200, backgroundColor: c.grey50, flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Icon size={16} color={more.grey400} />
              <Text style={[t.label, { color: c.grey500 }]}>{label}</Text>
            </View>
          ))}
        </View>
        <Text style={t.caption}>{WEBSITE}</Text>
      </View>
    </Screen>
  );
}

/** The part of a tile's note that is the job: bold, in the tile's colour. */
function B({ children }: { children: ReactNode }) {
  return <Text style={face[700]}>{children}</Text>;
}

function CardTitle({ title, info, meta }: { title: string; info: string; meta?: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={[t.heading, { flex: 1 }]} accessibilityRole="header">{title}</Text>
        <InfoButton words={info} />
      </View>
      {meta ? <Text style={[t.caption, t.tab, { lineHeight: 17 }]}>{meta}</Text> : null}
    </View>
  );
}

/* Stayntouch's big counts, coloured by what staff must do (Mews; D27-243):
   orange act now, yellow due today, green done, white nothing to do. */
function WorkTile({ icon, chip, label, n, left, state, note, loading, onPress }: {
  icon: LucideIcon; chip: ChipTone; label: string; n: number | null | undefined; left?: number; state: TileState; note: ReactNode[]; loading: boolean; onPress?: () => void;
}) {
  const tone = TILE[state];
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityHint={onPress ? `Opens ${label.toLowerCase()}` : undefined}
      style={({ pressed }) => ({ flexBasis: "47%", flexGrow: 1, backgroundColor: pressed ? c.grey100 : tone.bg, borderColor: tone.ring, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 6 })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <IconChip icon={icon} tone={chip} size={24} />
        <Text style={t.label} numberOfLines={1}>{label}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
        <Text style={[t.figure, { lineHeight: 26 }, n == null ? { color: c.grey500 } : state === "done" && { color: c.success600 }]}>{loading ? "…" : count(n)}</Text>
        {state === "done" && !loading ? <Check size={16} color={c.success600} style={{ alignSelf: "center" }} /> : null}
        {!loading && left != null && left > 0 ? <Text style={t.label}>· {left} left</Text> : null}
      </View>
      <View>
        {note.map((part, i) => (
          <Text key={i} style={[t.caption, { lineHeight: 17, color: i === 0 && typeof part !== "string" ? tone.note : c.grey600 }]} numberOfLines={1}>{part}</Text>
        ))}
      </View>
      {/* It opens its list: an arrow says so (the Tappable Rule). */}
      {onPress ? <View style={{ position: "absolute", right: 12, top: "50%", marginTop: -8 }}><ChevronRight size={16} color={c.grey500} /></View> : null}
    </Pressable>
  );
}

/** A Money row: the chip beside the label and the note, the amount under the
    label on the right; a split bar, when there is one, on a row of its own. */
function MoneyItem({ icon, tone = "neutral", label, term, value, note, bar, warn, first, last, elsewhere }: {
  icon: LucideIcon; tone?: ChipTone; label: string; term?: TermKey; value: string; note: ReactNode[]; bar?: ReactNode; warn?: boolean; first?: boolean; last?: boolean;
  /** Its list is on the website only: the arrow is drawn grey and says so. */
  elsewhere?: boolean;
}) {
  const [why, setWhy] = useState(false);
  return (
    <View style={[{ paddingVertical: 12 }, first ? { paddingTop: 0 } : { borderTopWidth: 1, borderTopColor: c.grey100 }, last && { paddingBottom: 0 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <IconChip icon={icon} tone={tone} />
        <View style={{ flex: 1, gap: 2 }}>
          {term ? <Term name={term} style={t.label}>{label}</Term> : elsewhere ? (
            /* Not `disabled`: the tap is when a person asks why (the web's D17-8). */
            <Pressable
              onPress={() => setWhy(true)} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: true }} accessibilityHint={WEBSITE}
              style={{ minHeight: 44, marginVertical: -12, flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" }}
            >
              <Text style={t.label}>{label}</Text>
              <ChevronRight size={16} color={more.grey400} />
            </Pressable>
          ) : <Text style={t.label}>{label}</Text>}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
            <View style={{ flexShrink: 1 }}>
              {note.map((line, i) => (typeof line === "string" ? <Text key={i} style={[t.caption, { lineHeight: 17 }]}>{line}</Text> : line))}
            </View>
            <Text style={[t.figure, { lineHeight: 30, textAlign: "right" }, value === DASH ? { color: c.grey500 } : warn && { color: c.orange700 }]}>{value}</Text>
          </View>
        </View>
      </View>
      {bar ? <View style={{ marginLeft: 42, marginTop: 6 }}>{bar}</View> : null}
      {why ? <Text style={[t.caption, { marginLeft: 42, marginTop: 6 }]} accessibilityLiveRegion="polite">{WEBSITE}</Text> : null}
    </View>
  );
}
