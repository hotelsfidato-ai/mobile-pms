import { Pressable, Text, View } from "react-native";
import { api, orNull, type Hotel } from "../../core/api";
import { DASH, cash, dateShort, daysBehind, monthStart, pct, yearBack } from "../../core/format";
import { c, t } from "../../core/theme";
import { Capsule, Card, Head, ReadFailed, Screen, s, useRead } from "../../core/ui";
import { addUp, change, type Notification, type PeriodStatistics } from "./figures";

/* ══════════════════════════════════════════════════════════════════
   ALL PROPERTIES on a phone — the web's /all-properties (D27-243): the
   group in one navy summary, "Needs you", then a card per property.
   Each property on its own business date and its own month so far; the
   real hotels only, never a test hotel (D27-296 (11)). Tapping a
   property opens its Dashboard.
   ══════════════════════════════════════════════════════════════════ */

interface Line { hotel: Hotel; today: PeriodStatistics | null; month: PeriodStatistics | null; lastYear: PeriodStatistics | null; waiting: Notification[] }

const period = (code: string, from: string, to: string) =>
  orNull<PeriodStatistics>(`/api/hotels/${code}/statistics/period?from=${from}&to=${to}`);

function readAll(hotels: Hotel[]): Promise<Line[]> {
  return Promise.all(hotels.map(async (hotel) => {
    const d = hotel.businessDate;
    const [today, month, lastYear, waiting] = await Promise.all([
      period(hotel.code, d, d),
      period(hotel.code, monthStart(d), d),
      period(hotel.code, yearBack(monthStart(d)), yearBack(d)),
      /* Without a date the server uses the property's own business day. */
      api<Notification[]>(`/api/hotels/${hotel.code}/notifications`).catch(() => [] as Notification[]),
    ]);
    /* "Had a last year" = sold a room that month a year back (the web's ponytail). */
    return { hotel, today, month, lastYear: lastYear && lastYear.roomsSold > 0 ? lastYear : null, waiting };
  }));
}

export function AllProperties({ hotels, who, onOpen, onSignOut }: {
  hotels: Hotel[]; who: string; onOpen: (h: Hotel) => void; onSignOut: () => void;
}) {
  const real = hotels.filter((h) => !h.testOf);
  const read = useRead(() => readAll(real), ["all-properties", ...real.map((h) => `${h.code}@${h.businessDate}`)]);
  const lines = read.data ?? [];

  const today = addUp(lines.map((l) => l.today));
  const month = addUp(lines.map((l) => l.month));
  const had = lines.filter((l) => l.lastYear);
  const lastYear = addUp(had.map((l) => l.lastYear));
  const vs = change(addUp(had.map((l) => l.month))?.revenue, lastYear?.revenue);
  const waiting = [
    ...real.filter((h) => daysBehind(h) > 0).map((h) => ({
      key: `${h.code}-behind`,
      title: `${h.name}: business date ${dateShort(h.businessDate)}, ${daysBehind(h)} ${daysBehind(h) === 1 ? "day" : "days"} behind today (${dateShort(h.today!)})`,
      body: "Close the days in Night audit",
    })),
    ...lines.flatMap((l) => l.waiting.filter((n) => n.actionRequired)
      .map((n) => ({ key: `${l.hotel.code}-${n.id}`, title: `${l.hotel.name}: ${n.title}`, body: n.body }))),
  ];
  const loading = read.loading && !read.data;
  const show = (v: string) => (loading ? "…" : v);

  return (
    <Screen refreshing={read.loading && Boolean(read.data)} onRefresh={read.reload}>
      <Head
        eyebrow={who}
        title="All properties"
        under={`${real.length} ${real.length === 1 ? "property" : "properties"} · each on its own business date`}
        action={<Capsule label="Sign out" onPress={onSignOut} />}
      />

      {read.error ? <ReadFailed what="every property's figures" error={read.error} onRetry={read.reload} /> : null}

      {/* ── The group: today, the month so far, the month last year ── */}
      <View style={s.navy} accessibilityLabel="The group">
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={[t.label, { color: c.onNavy }]}>The group today</Text>
          {!loading ? <Text style={[t.caption, { color: c.onNavy }]}>Last year: {had.length} of {lines.length}</Text> : null}
        </View>
        {([
          ["Occupancy", pct(today?.occupancy), pct(month?.occupancy), "Month last year", pct(lastYear?.occupancy)],
          ["Average rate (ARR)", cash(today?.arr), cash(month?.arr), "Month last year", cash(lastYear?.arr)],
          ["RevPAR", cash(today?.revpar), cash(month?.revpar), "Month last year", cash(lastYear?.revpar)],
          ["Room revenue", cash(today?.revenue), cash(month?.revenue), "vs last year", vs == null ? DASH : `${vs > 0 ? "+" : ""}${vs}%`],
        ] as const).map(([label, now, so, thenLabel, then], i) => (
          <View key={label} style={[{ paddingVertical: 10, gap: 8 }, i > 0 && { borderTopWidth: 1, borderTopColor: c.navyTrack }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <Text style={[t.label, { color: c.onNavy }]}>{label}</Text>
              <Text style={[t.figure, { color: c.white }]}>{show(now)}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 16 }}>
              <Period label="Month so far" value={show(so)} onNavy />
              <Period label={thenLabel} value={show(then)} onNavy />
            </View>
          </View>
        ))}
      </View>

      {/* ── Needs you: what to act on, at every property ─────────── */}
      <Card>
        <Text style={[t.heading, { marginBottom: 12 }]}>Needs you</Text>
        {loading ? <Text style={t.caption}>…</Text> : waiting.length === 0 ? (
          <Text style={[t.label, { color: c.ink900 }]}>✓  Nothing waiting at any property</Text>
        ) : waiting.map((w, i) => (
          <View key={w.key} style={[{ paddingVertical: 12, gap: 2 }, i > 0 && { borderTopWidth: 1, borderTopColor: c.grey100 }]}>
            <Text style={[t.label, { color: c.ink900 }]}>{w.title}</Text>
            {w.body ? <Text style={t.caption}>{w.body}</Text> : null}
          </View>
        ))}
      </Card>

      {/* ── Each property: today, then the month so far ─────────── */}
      {(read.data ?? real.map((hotel): Partial<Line> & { hotel: Hotel } => ({ hotel }))).map((l) => (
        <Pressable
          key={l.hotel.code}
          onPress={() => onOpen(l.hotel)}
          accessibilityRole="button"
          accessibilityHint="Opens this property's Dashboard"
          style={({ pressed }) => [s.card, pressed && { backgroundColor: c.grey50 }]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={t.heading}>{l.hotel.name}</Text>
              <Text style={[t.caption, t.tab]}>Business date {dateShort(l.hotel.businessDate)}</Text>
            </View>
            <Text style={[t.heading, { color: c.grey500 }]} accessibilityElementsHidden>›</Text>
          </View>
          <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: c.grey100, paddingTop: 8 }}>
            <Text style={[t.caption, { flex: 1 }]} />
            <Text style={[t.caption, { width: 96, textAlign: "right" }]}>Today</Text>
            <Text style={[t.caption, { width: 104, textAlign: "right" }]}>Month so far</Text>
          </View>
          {([
            ["Occupancy", pct(l.today?.occupancyPct), pct(l.month?.occupancyPct)],
            ["ARR", cash(l.today?.roomsSold ? l.today.adr : null), cash(l.month?.roomsSold ? l.month.adr : null)],
            ["RevPAR", cash(l.today?.revpar), cash(l.month?.revpar)],
            ["Room revenue", cash(l.today?.roomRevenue), cash(l.month?.roomRevenue)],
          ] as const).map(([label, now, so]) => (
            <View key={label} style={{ flexDirection: "row", alignItems: "baseline", paddingVertical: 4 }}>
              <Text style={[t.label, { flex: 1, color: c.grey500 }]} numberOfLines={1}>{label}</Text>
              <Text style={[t.label, t.tab, { width: 96, textAlign: "right", color: c.ink900, fontWeight: "600" }]}>{show(now)}</Text>
              <Text style={[t.label, t.tab, { width: 104, textAlign: "right", color: c.grey700 }]}>{show(so)}</Text>
            </View>
          ))}
        </Pressable>
      ))}
    </Screen>
  );
}

/** A period under a figure: a 12px label over a 14px value (the figure block). */
export function Period({ label, value, onNavy }: { label: string; value: string; onNavy?: boolean }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={[t.caption, onNavy && { color: c.onNavy }]}>{label}</Text>
      <Text style={[t.label, t.tab, { color: onNavy ? c.white : c.grey700 }]}>{value}</Text>
    </View>
  );
}

