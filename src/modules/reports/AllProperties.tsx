import { ArrowDown, ArrowUp, Check, Hotel as HotelIcon, TriangleAlert } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { api, orNull, type Hotel } from "../../core/api";
import { DASH, cash, dateShort, daysBehind, monthStart, pct, yearBack } from "../../core/format";
import { isOnline } from "../../core/offline";
import { c, face, space, t } from "../../core/theme";
import { Capsule, Card, Head, ReadFailed, Screen, s, useRead } from "../../core/ui";
import { addUp, change, dateYear, type Notification, type PeriodStatistics } from "./figures";
import { IconChip, InfoButton, more } from "./kit";

/* ══════════════════════════════════════════════════════════════════
   ALL PROPERTIES on a phone — the web's /all-properties (D27-243), the
   picture pms-shots/new/n-all-properties.png (M-11): the group in one navy
   summary, "Needs you", then a card per property in one white block. Each
   property on its own business date and its own month so far; the real
   hotels only, never a test hotel (D27-296 (11)). Tapping a property opens
   its Dashboard.
   ══════════════════════════════════════════════════════════════════ */

interface Line { hotel: Hotel; today: PeriodStatistics | null; month: PeriodStatistics | null; lastYear: PeriodStatistics | null; waiting: Notification[] }

const NOTE = "Every property added up, each on its own business date. Last year is the same month a year back, and counts only the properties that sold a room in it.";

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

export function AllProperties({ hotels, onOpen, onSignOut }: {
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
        title="All properties"
        under={`${real.length} ${real.length === 1 ? "property" : "properties"} · each on its own business date`}
        action={<Capsule label="Sign out" onPress={onSignOut} />}
      />

      {read.error && read.data && !isOnline() ? (
        <Text style={[t.caption, { color: c.yellow800 }]} accessibilityRole="alert">No connection. Showing the figures as last read; pull down to read again.</Text>
      ) : read.error ? <ReadFailed what="every property's figures" error={read.error} onRetry={read.reload} /> : null}

      {/* ── The group: today, the month so far, the month last year ── */}
      <View style={s.navy} accessibilityLabel="The group">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <IconChip icon={HotelIcon} tone="glass" />
          <Text style={[t.label, { flex: 1, color: c.onNavy }]}>The group today</Text>
          <InfoButton words={NOTE} color={more.navy60} />
        </View>
        <Text style={[t.caption, t.tab, { color: c.onNavy, marginTop: 4, marginBottom: 12, minHeight: 17 }]}>
          {loading ? "" : `Last year: ${had.length} of ${lines.length} properties`}
        </Text>
        <View style={{ gap: 12 }}>
          {([
            ["Occupancy", pct(today?.occupancy), pct(month?.occupancy), "Month last year", pct(lastYear?.occupancy)],
            ["Average rate (ARR)", cash(today?.arr), cash(month?.arr), "Month last year", cash(lastYear?.arr)],
            ["RevPAR", cash(today?.revpar), cash(month?.revpar), "Month last year", cash(lastYear?.revpar)],
            ["Room revenue", cash(today?.revenue), cash(month?.revenue), "vs last year", vs == null ? DASH : `${vs > 0 ? "+" : ""}${vs}%`],
          ] as const).map(([label, now, so, thenLabel, then], i) => (
            <View key={label} style={[{ gap: 8 }, i > 0 && { borderTopWidth: 1, borderTopColor: c.navyTrack, paddingTop: 12 }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
                <Text style={[t.label, { color: c.onNavy }]}>{label}</Text>
                <Text style={[t.figure, { color: c.white }]}>{show(now)}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 16 }}>
                <Period label="Month so far" value={show(so)} />
                <Period label={thenLabel} value={show(then)} />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* ── Needs you: what to act on, at every property ─────────── */}
      <Card>
        <Text style={[t.heading, { marginBottom: 12 }]} accessibilityRole="header">Needs you</Text>
        {loading ? <Text style={t.caption}>…</Text> : waiting.length === 0 ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 56 }}>
            <IconChip icon={Check} tone="green" />
            <Text style={[t.label, { color: c.ink900 }]}>Nothing waiting at any property</Text>
          </View>
        ) : waiting.map((w, i) => (
          <View key={w.key} style={[{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 56, paddingVertical: 12 }, i > 0 && { borderTopWidth: 1, borderTopColor: c.grey100 }]}>
            <IconChip icon={TriangleAlert} tone="orange" />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[t.label, { color: c.ink900 }]}>{w.title}</Text>
              {w.body ? <Text style={t.caption}>{w.body}</Text> : null}
            </View>
          </View>
        ))}
      </Card>

      {/* ── Each property: today on top, the month so far under it ── */}
      <Card style={{ paddingHorizontal: 0, paddingVertical: 0 }}>
        {(read.data ?? real.map((hotel): Partial<Line> & { hotel: Hotel } => ({ hotel }))).map((l, i) => (
          <Pressable
            key={l.hotel.code}
            onPress={() => onOpen(l.hotel)}
            accessibilityRole="button"
            accessibilityHint="Opens this property's Dashboard"
            style={({ pressed }) => [
              { paddingHorizontal: space.cardX, paddingVertical: 12, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
              i > 0 && { borderTopWidth: 1, borderTopColor: c.grey100, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
              pressed && { backgroundColor: c.grey50 },
            ]}
          >
            <Text style={[t.label, { color: c.ink900, ...face[600] }]}>{l.hotel.name}</Text>
            <Text style={[t.caption, t.tab]}>{dateYear(l.hotel.businessDate)}</Text>
            <View style={{ marginTop: 6, gap: 4 }}>
              <Pair label="Occupancy" now={show(pct(l.today?.occupancyPct))} so={show(pct(l.month?.occupancyPct))} />
              <Pair label="Average rate (ARR)" now={show(cash(l.today?.roomsSold ? l.today.adr : null))} so={show(cash(l.month?.roomsSold ? l.month.adr : null))} />
              <Pair label="RevPAR" now={show(cash(l.today?.revpar))} so={show(cash(l.month?.revpar))} />
              <Pair label="Room revenue" now={show(cash(l.today?.roomRevenue))} so={show(cash(l.month?.roomRevenue))} />
              <VsLastYear change={change(l.month?.roomRevenue, l.lastYear?.roomRevenue)} />
            </View>
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}

/** A period under a figure on navy: a 12px label over a 14px value. */
function Period({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={[t.caption, { color: c.onNavy }]}>{label}</Text>
      <Text style={[t.label, t.tab, { color: c.white, ...face[600] }]}>{value}</Text>
    </View>
  );
}

/* The web's card: a column of small capitals, then each value, right-aligned
   within its own width. "AVERAGE RATE (ARR)", the longest, sets that column. */
function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <Text style={[t.caption, { width: 134, paddingTop: 2, textTransform: "uppercase", letterSpacing: 0.3 }]}>{label}</Text>
      <View style={{ alignItems: "flex-end" }}>{children}</View>
    </View>
  );
}

/** Today's figure over the month so far's. */
function Pair({ label, now, so }: { label: string; now: string; so: string }) {
  return (
    <Stat label={label}>
      <Text style={[t.label, t.tab, { color: c.ink900, ...face[600] }]}>{now}</Text>
      <Text style={[t.caption, t.tab]}>{so}</Text>
    </Stat>
  );
}

function VsLastYear({ change: v }: { change: number | null }) {
  if (v == null) {
    return (
      <Stat label="vs last year">
        <Text style={[t.label, { color: c.grey500 }]}>{DASH}</Text>
        <Text style={t.caption}>No last year yet</Text>
      </Stat>
    );
  }
  const Icon = v >= 0 ? ArrowUp : ArrowDown;
  const tone = v > 0 ? c.success600 : c.grey700;
  return (
    <Stat label="vs last year">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Icon size={14} color={tone} />
        <Text style={[t.label, t.tab, { color: tone, ...face[600] }]}>{Math.abs(v)}%</Text>
      </View>
      <Text style={t.caption}>Month so far</Text>
    </Stat>
  );
}
