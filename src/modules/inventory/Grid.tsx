import { useQueries } from "@tanstack/react-query";
import { Ban, ChevronLeft, ChevronRight, LogIn, LogOut } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { c, face, t } from "../../core/theme";
import { readBreakup } from "./data";
import { Btn } from "./kit";
import {
  DAYS, addDays, breakupRows, cellsByDay, dayHead, figure, fillOf, lookOf, nightsMark, occupancyOf, rangeOf, rupees,
  tappedPrice, toneOf, typesOf, typesOwnBase,
  type DayRules, type InventoryCell, type Pricing, type RateDay, type Restriction,
} from "./rates";
import type { DayTarget, PriceTarget } from "./Dialogs";

/* ══════════════════════════════════════════════════════════════════
   THE TWO GRIDS — Rates.tsx GridShell (235-296), BaseGrid (618-786),
   BreakupRows (787-835) and InventoryGrid (300-395), on a phone. The
   label column stays put and the fortnight scrolls under it, as the web's
   sticky column: a number with no row label is not information. Each row
   is drawn twice - its label on the left, its days on the right - from one
   list, so the two sides keep the same height.
   Sizes from the web: the label column min-w-38 (152), a day min-w-18 (72),
   the head 50, a room type's row h-11 (44), the break-up rows h-10 (40),
   how the day sold 58. The card runs edge to edge on a phone
   (max-sm:-mx-5, no side borders, no corners).
   ══════════════════════════════════════════════════════════════════ */

const LABEL_W = 152;
const DAY_W = 72;
/** The business date's column in the body: ink-900 at 3.5%. */
const TODAY_WASH = "rgba(3,23,40,0.035)";

/** The window the arrows move, and the business date Today returns to. */
export interface Nav { from: string; today: string; onMove: (from: string) => void; rules?: DayRules }

interface Row {
  key: string;
  height: number;
  label: ReactNode;
  /** The label cell's own wash (a room type's grey row). */
  labelBg?: string;
  /** One day's cell. */
  day: (date: string) => ReactNode;
  /** The day cell's wash: "row" keeps the row's, "week" adds the weekend's (dayWash). */
  wash: "row" | "week";
  borderTop?: string;
}

const dayWash = (date: string, nav: Nav) => (date === nav.today ? TODAY_WASH : dayHead(date, nav.rules).weekend ? c.grey50 : undefined);

function Shell({ nav, dates, corner, rows }: { nav: Nav; dates: string[]; corner: string; rows: Row[] }) {
  const line = { borderBottomWidth: 1, borderBottomColor: c.grey200 } as const;
  return (
    <View style={{ marginHorizontal: -20, backgroundColor: c.white, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.grey200 }}>
      {/* The toolbar: the fortnight's arrows, its range, and Today. */}
      <View style={[line, { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12 }]}>
        <Btn label="" a11y="Previous two weeks" icon={ChevronLeft} onPress={() => nav.onMove(addDays(nav.from, -DAYS))} />
        <Btn label="" a11y="Next two weeks" icon={ChevronRight} onPress={() => nav.onMove(addDays(nav.from, DAYS))} />
        <Text style={[t.heading, t.tab, { marginLeft: 6 }]}>{rangeOf(nav.from)}</Text>
        {nav.from !== nav.today ? <Btn label="Today" variant="ghost" onPress={() => nav.onMove(nav.today)} /> : null}
      </View>
      <View style={{ flexDirection: "row" }}>
        <View style={{ width: LABEL_W, borderRightWidth: 1, borderRightColor: c.grey200 }}>
          <View style={[line, { height: 50, justifyContent: "center", paddingHorizontal: 10 }]}>
            <Text style={{ fontSize: 12, lineHeight: 16, ...face[600], letterSpacing: 0.3, textTransform: "uppercase", color: c.grey500 }}>{corner}</Text>
          </View>
          {rows.map((r) => (
            <View key={r.key} style={[line, { height: r.height, justifyContent: "center", paddingHorizontal: 10, backgroundColor: r.labelBg ?? c.white },
              r.borderTop ? { borderTopWidth: 1, borderTopColor: r.borderTop } : null]}>
              {r.label}
            </View>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View>
            <View style={{ flexDirection: "row" }}>
              {dates.map((d) => {
                const { dow, day, weekend } = dayHead(d, nav.rules);
                const today = d === nav.today;
                return (
                  <View key={d} style={[line, { width: DAY_W, height: 50, alignItems: "center", justifyContent: "center", borderRightWidth: 1, borderRightColor: c.grey100,
                    backgroundColor: today ? c.ink900 : weekend ? c.grey50 : c.white }]}>
                    <Text style={{ fontSize: 12, ...face[600], letterSpacing: 0.3, color: today ? "rgba(255,255,255,0.7)" : c.grey500 }}>{dow}</Text>
                    <Text style={[t.heading, t.tab, { color: today ? c.white : c.ink900 }]}>{day}</Text>
                  </View>
                );
              })}
            </View>
            {rows.map((r) => (
              <View key={r.key} style={[{ flexDirection: "row", backgroundColor: r.labelBg ?? c.white }, r.borderTop ? { borderTopWidth: 1, borderTopColor: r.borderTop } : null]}>
                {dates.map((d) => (
                  <View key={d} style={[line, { width: DAY_W, height: r.height, borderRightWidth: 1, borderRightColor: c.grey100, alignItems: "stretch", justifyContent: "center",
                    backgroundColor: r.wash === "week" ? dayWash(d, nav) : d === nav.today ? TODAY_WASH : undefined }]}>
                    {r.day(d)}
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const rowLabel = (text: string) => <Text style={[t.label, { color: c.grey600 }]} numberOfLines={1}>{text}</Text>;
const cellText = (text: string) => <Text style={[t.label, t.tab, { color: c.grey700, textAlign: "center" }]}>{text}</Text>;

/* ── Prices: each type's base and break-up, and how each day sold ── */

export function BaseGrid({ code, nav, dates, pricing, left, days, mayEdit, onTap }: {
  code: string; nav: Nav; dates: string[]; pricing: Pricing;
  /** The Rooms left tab's own read: what is left of each type on each day (5.2). */
  left: InventoryCell[];
  /** How each day sold; undefined while it is read or when it failed (dashes). */
  days: RateDay[] | undefined;
  mayEdit: boolean;
  onTap: (target: PriceTarget) => void;
}) {
  const at = cellsByDay(pricing);
  const leftAt = new Map(left.map((x) => [`${x.roomTypeId}/${x.date}`, x.available]));
  const dayAt = new Map((days ?? []).map((d) => [d.date, d]));
  /* Every type's break-up, read per type (GET /pricing?breakup=), as the web. */
  const reads = useQueries({
    queries: pricing.roomTypes.map((rt) => ({
      queryKey: ["inventory", code, "breakup", dates[0], rt.id],
      queryFn: () => readBreakup(code, dates[0]!, dates.length, rt.id),
    })),
  });
  const breakups = pricing.roomTypes.map((rt, i) => ({ rt, q: reads[i]! }));

  const rows: Row[] = [];
  for (const { rt, q } of breakups) {
    const editable = mayEdit && typesOwnBase(pricing, rt.id);
    rows.push({
      key: rt.id, height: 44, labelBg: c.grey50, wash: "row",
      label: <Text style={[t.label, face[600], { color: c.ink900 }]} numberOfLines={1}>{rt.name}</Text>,
      day: (d) => {
        const cell = at.get(`${rt.id}/${d}`);
        const rooms = leftAt.get(`${rt.id}/${d}`);
        const look = lookOf(cell);
        const content = (
          <View style={{ alignItems: "center" }}>
            <Text style={[t.label, t.tab, { lineHeight: 20 },
              look === "none" ? { color: c.grey500 }
                : look === "older" ? { color: c.grey500, fontStyle: "italic" }
                  : look === "derived" ? { color: c.grey600 } : { color: c.ink900, ...face[600] }]}>
              {look === "none" ? "-" : rupees(cell!.price)}
            </Text>
            <Text style={[t.caption, t.tab, { lineHeight: 16, color: rooms === 0 ? c.red700 : c.grey500 }]}>
              {rooms === undefined ? "-" : `${rooms} left`}
            </Text>
          </View>
        );
        if (!editable) return content;
        return (
          <Pressable
            onPress={() => onTap({ roomTypeId: rt.id, roomType: rt.name, date: d, price: tappedPrice(cell) })}
            accessibilityRole="button" accessibilityLabel={`${rt.name} on ${d}`}
            style={({ pressed }) => ({ flex: 1, justifyContent: "center", backgroundColor: pressed ? c.grey100 : undefined })}
          >
            {content}
          </Pressable>
        );
      },
    });
    const byDay = new Map((q.data ?? []).map((x) => [x.date, x]));
    const guests = q.data?.[0]?.guests ?? 2;
    for (const r of breakupRows(guests, rt.maxOccupancy)) {
      rows.push({
        key: `${rt.id}/${r.label}`, height: 40, wash: "week", label: rowLabel(r.label),
        /* "…" while read; a dash when it failed or is not set - never ₹0. */
        day: (d) => cellText(q.isLoading ? "…" : figure(byDay.get(d)?.[r.pick])),
      });
    }
  }
  rows.push({
    key: "sold", height: 58, wash: "week", borderTop: c.grey300,
    label: (
      <View>
        <Text style={[t.label, face[600], { color: c.ink900 }]}>Paying rooms sold</Text>
        <Text style={[t.caption, { color: c.grey600 }]}>Occupancy</Text>
      </View>
    ),
    day: (d) => {
      const day = dayAt.get(d);
      return (
        <View style={{ alignItems: "center", gap: 4, paddingHorizontal: 10 }}>
          <Text style={[t.label, t.tab, face[600], { color: c.ink900, lineHeight: 20 }]}>{day ? String(day.paidSold) : "-"}</Text>
          <View style={{ alignSelf: "stretch", height: 4, borderRadius: 2, backgroundColor: c.grey100, overflow: "hidden" }}>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: c.orange, width: `${fillOf(day?.occupancy)}%` }} />
          </View>
          <Text style={[t.caption, t.tab, { lineHeight: 16 }]}>{occupancyOf(day?.occupancy)}</Text>
        </View>
      );
    },
  });
  rows.push({ key: "adr", height: 40, wash: "week", label: rowLabel("ADR"), day: (d) => cellText(rupees(dayAt.get(d)?.adr)) });
  rows.push({ key: "revenue", height: 40, wash: "week", label: rowLabel("Revenue"), day: (d) => cellText(rupees(dayAt.get(d)?.revenue)) });

  const failed = reads.find((r) => r.error)?.error?.message;
  return (
    <>
      <Shell nav={nav} dates={dates} corner="Base, one guest, room only" rows={rows} />
      {/* A dash alone would say "not set": a break-up that did not load says so. */}
      {failed ? <Text style={[t.caption, { color: c.red700 }]} accessibilityRole="alert">{`Could not read the break-up: ${failed}`}</Text> : null}
    </>
  );
}

/* ── Rooms left, and the restrictions (not pictured: from the code) ── */

export function RoomsGrid({ nav, dates, cells, restrictions, mayEdit, onTap }: {
  nav: Nav; dates: string[]; cells: InventoryCell[]; restrictions: Restriction[];
  mayEdit: boolean; onTap: (target: DayTarget) => void;
}) {
  const at = new Map(cells.map((x) => [`${x.roomTypeId}/${x.date}`, x]));
  const ruleAt = new Map(restrictions.map((r) => [`${r.roomTypeId}/${r.date}`, r]));
  const rows: Row[] = typesOf(cells).map((rt) => ({
    key: rt.id, height: 56, wash: "week",
    label: <Text style={[t.label, { color: c.ink900 }]} numberOfLines={1}>{rt.name}</Text>,
    day: (d) => {
      const cell = at.get(`${rt.id}/${d}`);
      const rule = ruleAt.get(`${rt.id}/${d}`);
      const tone = toneOf(cell, rule);
      const nights = rule ? nightsMark(rule) : "";
      return (
        <Pressable
          disabled={!mayEdit} onPress={() => onTap({ roomTypeId: rt.id, roomType: rt.name, date: d })}
          accessibilityRole="button" accessibilityLabel={`${rt.name} on ${d}`} accessibilityState={{ disabled: !mayEdit }}
          style={({ pressed }) => ({ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 6,
            backgroundColor: pressed ? c.grey100 : tone === "closed" ? c.red50 : tone === "none" ? c.yellow50 : undefined })}
        >
          {/* Available is the number a person acts on. */}
          <Text style={{ fontSize: 18, ...face[600], ...t.tab, color: tone === "closed" ? c.red700 : tone === "none" ? c.yellow800 : c.ink900 }}>
            {cell ? String(cell.available) : "-"}
          </Text>
          <Text style={[t.caption, t.tab]}>{cell ? `${cell.sold}/${cell.sellable}` : ""}</Text>
          {rule ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2, marginTop: 2 }}>
              {rule.stopSell ? <Ban size={12} color={c.red700} accessibilityLabel="Stop sell" /> : null}
              {rule.closedArrival ? <LogIn size={12} color={c.yellow800} accessibilityLabel="Closed to arrival" /> : null}
              {rule.closedDeparture ? <LogOut size={12} color={c.yellow800} accessibilityLabel="Closed to departure" /> : null}
              {nights ? <Text style={[t.caption, t.tab, { color: c.grey600 }]}>{nights}</Text> : null}
            </View>
          ) : null}
        </Pressable>
      );
    },
  }));
  return <Shell nav={nav} dates={dates} corner="Room type" rows={rows} />;
}

/** The Rooms left legend (Rates.tsx Legend). */
export function RoomsLegend() {
  const swatch = (bg: string, ring: string) => <View style={{ width: 24, height: 12, borderRadius: 2, backgroundColor: bg, borderWidth: 1, borderColor: ring }} />;
  const item = (mark: ReactNode, words: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>{mark}<Text style={[t.caption, { color: c.grey600 }]}>{words}</Text></View>
  );
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 24, rowGap: 8 }}>
      {item(swatch(c.red50, c.red700), "Stop sell")}
      {item(swatch(c.yellow50, c.yellow), "Nothing left")}
      {item(<LogIn size={14} color={c.yellow800} />, "Closed to arrival")}
      {item(<LogOut size={14} color={c.yellow800} />, "Closed to departure")}
      <Text style={[t.caption, { color: c.grey500 }]}>
        The small figures are <Text style={face[600]}>paying rooms sold / sellable</Text>. Complimentary and tentative rooms hold a room but are left out; occupancy on the reports counts complimentary rooms.
      </Text>
    </View>
  );
}
