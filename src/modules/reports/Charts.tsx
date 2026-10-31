import { useState } from "react";
import { Pressable, ScrollView, Text, View, type GestureResponderEvent } from "react-native";
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { DASH, cash, dateShort, pct } from "../../core/format";
import { c, face, t } from "../../core/theme";
import { Fade, more, SplitBar, Swatch } from "./kit";
import {
  dayWritten, nightsAhead, nightsOf, revenueSplit, sparkLine, stripState, weekdayOf,
  type DayStatistics, type HouseRoom, type LineKey, type MonthDay, type Night, type ReportDoc, type StripState,
} from "./figures";

/* ══════════════════════════════════════════════════════════════════
   THE DASHBOARD'S DRAWINGS (the owner's D27-217 to D27-219, D27-365): the
   web's Spark, OccupancyByDay, RevenueSplit, NightsAhead and RoomStrip
   (src/modules/reports/pages/Dashboard.tsx), in react-native-svg. None is
   animated, none invents a figure; a gap is never a zero, one value is
   written on the chart (today's), the rest are read by a tap.
   ══════════════════════════════════════════════════════════════════ */

/** The reading box the web shows on a hover or a tap: the value leads, the day follows. */
function Tip({ lead, line, left, top }: { lead: string; line: string; left?: number; top: number }) {
  return (
    <View
      pointerEvents="none" accessibilityLiveRegion="polite"
      style={{
        position: "absolute", top, zIndex: 3, maxWidth: 240, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
        backgroundColor: c.white, borderWidth: 1, borderColor: c.grey200, ...(left == null ? { right: 0 } : { left }),
      }}
    >
      <Text style={[t.label, t.tab, { color: c.ink900, ...face[600] }]}>{lead}</Text>
      <Text style={[t.caption, t.tab, { color: c.grey600 }]}>{line}</Text>
    </View>
  );
}

/* ── Chart 2: the small line in each figure ─────────────────────── */

/* The box: 96 wide, 20 high, the line 4 px in from each side. The drawing
   stands 5 px past it each way, so the end dot and its ring are never cut. */
const SPARK = { w: 96, h: 20, inset: 4, over: 5 };

export function Spark({ name, days, line, loading }: { name: string; days: MonthDay[]; line: LineKey; loading: boolean }) {
  const [at, setAt] = useState(-1);
  if (loading) return <View style={{ height: 16, width: 64, borderRadius: 6, backgroundColor: c.grey100 }} />;
  const n = days.length;
  const values = days.map((d) => d[line]);
  const inner = SPARK.w - SPARK.inset * 2;
  const { path, x, y } = sparkLine(values, inner, SPARK.h);
  if (!path) return <Text style={[t.label, { color: c.grey500 }]}>{DASH}</Text>;

  const last = values[n - 1];
  const gaps = days.filter((_, i) => values[i] == null).map((d) => dateShort(d.date));
  const label = `${name}, last ${n} days: ${cash(values[0])} on ${dateShort(days[0]!.date)}, ${cash(last)} today.`
    + (gaps.length ? ` ${line === "adr" ? "No rooms were sold on" : "No figure on"} ${gaps.join(", ")}.` : "");
  const point = at >= 0 ? days[at]! : null;
  const dx = SPARK.inset;
  const dy = SPARK.over;
  const read = (e: GestureResponderEvent) =>
    setAt(Math.max(0, Math.min(n - 1, Math.round(((e.nativeEvent.locationX - SPARK.inset) / inner) * (n - 1)))));

  return (
    <Pressable
      onPressIn={read} onPressOut={() => setAt(-1)} accessibilityRole="image" accessibilityLabel={label}
      style={{ width: SPARK.w, height: SPARK.h }}
    >
      <Svg width={SPARK.w} height={SPARK.h + SPARK.over * 2} style={{ marginTop: -SPARK.over }}>
        <G x={dx} y={dy}>
          <Path d={path} fill="none" stroke={more.grey400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          {point && values[at] != null && at < n - 1 ? <Dot x={x(at)} y={y(values[at]!)} r={2.5} fill={c.grey600} /> : null}
          {last != null ? <Dot x={x(n - 1)} y={y(last)} r={3} fill={c.ink900} /> : null}
        </G>
      </Svg>
      {point ? (
        <Tip
          left={0} top={-52} lead={cash(values[at])}
          line={`${weekdayOf(point.date)} ${dateShort(point.date)}${values[at] == null && line === "adr" ? " · no rooms sold" : ""}`}
        />
      ) : null}
    </Pressable>
  );
}

/** A dot with its 2 px white ring. */
function Dot({ x, y, r, fill }: { x: number; y: number; r: number; fill: string }) {
  return (
    <>
      <Circle cx={x} cy={y} r={r + 2} fill={c.white} />
      <Circle cx={x} cy={y} r={r} fill={fill} />
    </>
  );
}

/* ── Chart 1: Occupancy by day ──────────────────────────────────── */

/* Recharts' box on the web: 150 high, the % axis 44 wide, 22 above for
   today's number, 24 below for the day numbers; 19% of each night a gap. */
const CHART = { h: 150, axis: 44, top: 22, foot: 24 };
const FONT = { font: "Inter_500Medium", bold: "Inter_600SemiBold" };

export function OccupancyByDay({ days, date, loading, month }: { days: MonthDay[]; date: string; loading: boolean; month: string }) {
  const [width, setWidth] = useState(0);
  const [at, setAt] = useState(-1);
  if (loading) return <View style={{ height: CHART.h, borderRadius: 10, backgroundColor: c.grey100 }} />;
  if (!days.length) return <Text style={[t.lead, { paddingVertical: 24, textAlign: "center", color: c.grey500 }]}>{DASH}</Text>;

  const nights = nightsOf(days, date);
  const todayAt = nights.findIndex((x) => x.today);
  const today = nights[todayAt];
  const kinds = new Set(nights.filter((x) => (x.occ ?? 0) > 0).map((x) => x.ahead));

  const plotW = width - CHART.axis;
  const plotH = CHART.h - CHART.top - CHART.foot;
  const floor = CHART.top + plotH;
  const band = plotW / nights.length;
  const bar = band * 0.62;
  /* The axis stays 0, 50, 100; a night above 100% stands over it, as Recharts draws it. */
  const most = Math.max(100, ...nights.map((x) => x.occ ?? 0));
  const yOf = (v: number) => floor - (v / most) * plotH;
  const every = band >= 18;
  const tapped = at >= 0 ? nights[at] ?? null : null;

  return (
    <>
      <Pressable
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onPress={(e) => {
          const i = Math.floor((e.nativeEvent.locationX - CHART.axis) / band);
          setAt(i === at || i < 0 || i >= nights.length ? -1 : i);
        }}
        accessibilityRole="image"
        accessibilityLabel={`Occupancy by day, ${month}. ${today?.occ != null ? `${pct(today.occ)} today.` : ""}`}
        style={{ height: CHART.h }}
      >
        {width > 0 ? (
          <Svg width={width} height={CHART.h}>
            <Line x1={CHART.axis} x2={width} y1={CHART.top} y2={CHART.top} stroke={c.grey100} strokeWidth={1} />
            {[0, 50, 100].map((v) => (
              <G key={v}>
                <Line x1={CHART.axis} x2={width} y1={yOf(v)} y2={yOf(v)} stroke={v === 0 ? c.grey300 : c.grey100} strokeWidth={1} />
                {/* Whole: on the website 100% is cut off at the chart's edge at phone width (reported). */}
                <SvgText x={CHART.axis - 10} y={yOf(v) + 4} textAnchor="end" fontSize={12} fontFamily={FONT.font} fill={c.grey500}>{`${v}%`}</SvgText>
              </G>
            ))}
            {nights.map((n, i) => (n.weekend
              ? <Rect key={n.date} x={CHART.axis + i * band} y={CHART.top} width={band} height={plotH} fill={c.grey50} /> : null))}
            {tapped ? <Rect x={CHART.axis + at * band} y={CHART.top} width={band} height={plotH} fill={c.ink900} fillOpacity={0.06} /> : null}
            {nights.map((n, i) => <NightBar key={n.date} n={n} x={CHART.axis + i * band + (band - bar) / 2} w={bar} y={yOf(n.occ ?? 0)} floor={floor} />)}
            {nights.map((n, i) => {
              if (!dayWritten(n, i, todayAt, every)) return null;
              const cx = CHART.axis + (i + 0.5) * band;
              if (!n.today) {
                return <SvgText key={n.date} x={cx} y={floor + 19} textAnchor="middle" fontSize={12} fontFamily={FONT.font} fill={c.grey500}>{n.day}</SvgText>;
              }
              const w = Math.max(18, n.day.length * 7 + 10);
              return (
                <G key={n.date}>
                  <Rect x={cx - w / 2} y={floor + 6} width={w} height={18} rx={9} fill={c.ink900} />
                  <SvgText x={cx} y={floor + 19} textAnchor="middle" fontSize={12} fontFamily={FONT.bold} fill={c.white}>{n.day}</SvgText>
                </G>
              );
            })}
          </Svg>
        ) : null}
        {tapped ? (
          <Tip
            left={Math.max(0, Math.min(width - 200, CHART.axis + at * band - 80))} top={0} lead={pct(tapped.occ)}
            line={`${tapped.wd} ${dateShort(tapped.date)}${tapped.rooms != null && tapped.avail != null ? ` · ${tapped.rooms} of ${tapped.avail} rooms` : ""}${tapped.ahead ? " · booked so far" : ""}`}
          />
        ) : null}
      </Pressable>
      {/* Two kinds of bar get a key; one kind gets none (DESIGN.md, Charts). */}
      {kinds.size > 1 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 4, marginTop: 8 }} accessibilityElementsHidden>
          <Key color={c.info} label="Nights so far" />
          <Key color={more.infoAhead} label="Booked ahead" />
        </View>
      ) : null}
    </>
  );
}

/** A bar: rounded on top, and today's value written above it. */
function NightBar({ n, x, w, y, floor }: { n: Night; x: number; w: number; y: number; floor: number }) {
  const h = floor - y;
  if (n.occ == null) return null;
  const r = Math.min(4, w / 2, h);
  return (
    <>
      {h > 0 ? (
        <Path
          d={`M${x},${floor}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${floor}Z`}
          fill={n.ahead ? more.infoAhead : c.info}
        />
      ) : null}
      {n.today ? (
        <SvgText
          x={n.last ? x + w : x + w / 2} y={y - 6} textAnchor={n.last ? "end" : "middle"}
          fontSize={12} fontFamily={FONT.bold} fill={c.ink900}
        >
          {pct(n.occ)}
        </SvgText>
      ) : null}
    </>
  );
}

function Key({ color, label, ring }: { color: string; label: string; ring?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color, ...(ring ? { borderWidth: 1, borderColor: c.grey200 } : null) }} />
      <Text style={t.caption}>{label}</Text>
    </View>
  );
}

/* ── Chart 3: Revenue ───────────────────────────────────────────── */

export function RevenueSplit({ doc, loading }: { doc: ReportDoc | null | undefined; loading: boolean }) {
  const { parts, total } = revenueSplit(doc);
  /* A share of the server's two figures, to two places: the web's. */
  const share = (v: number | null) => (v == null || !total?.ptd ? DASH : `${((v / total.ptd) * 100).toFixed(2)}%`);
  const num = (v: number | null | undefined) => (loading ? "…" : cash(v));
  return (
    <>
      {/* Leads with the month so far; today is a row under it (the owner, D27-365 (4)). */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <Text style={[t.figure, { fontSize: 24, lineHeight: 30 }, total?.ptd == null && !loading && { color: c.grey500 }]}>{num(total?.ptd)}</Text>
        <Text style={t.caption}>Month so far</Text>
      </View>
      {!loading && parts.length > 0 ? (
        <>
          <View style={{ marginVertical: 12 }}>
            <SplitBar parts={parts} label={parts.map((p) => `${p.name} ${cash(p.value)}`).join(", ")} />
          </View>
          {parts.map((p, i) => (
            <View key={p.name} style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 22 }}>
              <Swatch i={i} />
              <Text style={[t.label, { flex: 1 }]} numberOfLines={1}>{p.name}</Text>
              <Text style={[t.label, t.tab, { color: c.grey500, paddingLeft: 4 }]}>{share(p.value)}</Text>
              <Text style={[t.label, t.tab, { color: p.value == null ? c.grey500 : c.grey700, paddingLeft: 4, minWidth: 76, textAlign: "right" }]}>{cash(p.value)}</Text>
            </View>
          ))}
        </>
      ) : null}
      <View style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: c.grey100 }}>
        {([["Today", total?.today], ["Year so far", total?.ytd]] as const).map(([name, v]) => (
          <View key={name} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, minHeight: 22 }}>
            <Text style={[t.label, { color: c.grey500 }]}>{name}</Text>
            <Text style={[t.label, t.tab, { color: v == null ? c.grey500 : c.grey700 }]}>{num(v)}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

/* ── The nights ahead: a bar under each date (D27-243) ──────────── */

const NIGHT = 60;

export function NightsAhead({ from, days, loading }: { from: string; days: DayStatistics[] | null | undefined; loading: boolean }) {
  return (
    <View>
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false} snapToInterval={NIGHT + 4} decelerationRate="fast"
        contentContainerStyle={{ gap: 4 }} accessibilityLabel="Nights ahead: rooms sold"
      >
        {nightsAhead(from, days).map((d) => {
          const ink = d.tonight ? c.white : c.ink900;
          const quiet = d.tonight ? c.onNavy : c.grey500;
          return (
            <View
              key={d.date} accessible accessibilityLabel={`${d.tonight ? "Tonight" : d.wd} ${dateShort(d.date)}: ${d.sold}`}
              style={{
                width: NIGHT, paddingHorizontal: 6, paddingVertical: 8, gap: 4, borderRadius: 8, alignItems: "stretch",
                backgroundColor: d.tonight ? c.ink900 : d.weekend ? c.grey50 : undefined,
              }}
            >
              <Text style={[t.caption, t.tab, { color: quiet, textAlign: "center", lineHeight: 17 }]} numberOfLines={1}>{d.tonight ? "Tonight" : d.wd}</Text>
              <Text style={[t.label, t.tab, { color: ink, textAlign: "center", lineHeight: 20, ...face[600] }]}>{d.day}</Text>
              <View style={{ marginHorizontal: 4, marginVertical: 2, height: 4, borderRadius: 2, overflow: "hidden", backgroundColor: d.tonight ? "rgba(255,255,255,0.16)" : c.grey100 }}>
                <View style={{ height: 4, borderRadius: 2, width: `${Math.min(100, d.share ?? 0)}%`, backgroundColor: d.tonight ? c.white : c.info }} />
              </View>
              <Text style={[t.caption, t.tab, { textAlign: "center", lineHeight: 17, ...face[600], color: d.share == null ? quiet : ink }]}>
                {loading ? "…" : d.share == null ? DASH : `${d.share}%`}
              </Text>
              <Text style={[t.caption, t.tab, { color: quiet, textAlign: "center", lineHeight: 17 }]}>{d.rooms ?? DASH}</Text>
            </View>
          );
        })}
      </ScrollView>
      <Fade id="nights-fade" color={c.white} width="15%" />
    </View>
  );
}

/* ── The strip: one square per room, in the Rooms board's colours ── */

const STRIP: Record<StripState, { label: string; bg: string; fg: string; ring?: boolean }> = {
  in: { label: "In house", bg: c.info, fg: c.white },
  due: { label: "Due out", bg: more.yellow, fg: c.ink900 },
  /* orange-600, not the brand orange: white 12px numbers on #df6128 are 3.57:1. */
  arr: { label: "Arriving", bg: c.orange600, fg: c.white },
  free: { label: "Free", bg: c.grey50, fg: c.grey500, ring: true },
  oos: { label: "Out of service", bg: c.grey200, fg: c.grey600 },
};

export function RoomStrip({ rooms }: { rooms: HouseRoom[] }) {
  const rows = Array.from({ length: Math.ceil(rooms.length / 6) }, (_, i) => rooms.slice(i * 6, i * 6 + 6));
  return (
    <>
      <View style={{ gap: 4 }} accessibilityLabel="Every room, by its state now">
        {rows.map((row) => (
          <View key={row[0]!.number} style={{ flexDirection: "row", gap: 4 }}>
            {row.map((room) => {
              const k = STRIP[stripState(room)];
              return (
                <View
                  key={room.number} accessible accessibilityLabel={`${room.number}, ${k.label}`}
                  style={{ flex: 1, height: 28, borderRadius: 6, alignItems: "center", justifyContent: "center", backgroundColor: k.bg, ...(k.ring ? { borderWidth: 1, borderColor: c.grey200 } : null) }}
                >
                  <Text style={[t.caption, t.tab, { color: k.fg, ...face[600] }]} numberOfLines={1}>{room.number}</Text>
                </View>
              );
            })}
            {Array.from({ length: 6 - row.length }, (_, i) => <View key={i} style={{ flex: 1 }} />)}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 4, marginTop: 8 }} accessibilityElementsHidden>
        {(Object.keys(STRIP) as StripState[]).map((s) => <Key key={s} color={STRIP[s].bg} label={STRIP[s].label} ring={STRIP[s].ring} />)}
      </View>
    </>
  );
}
