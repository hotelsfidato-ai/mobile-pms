import { useQueryClient } from "@tanstack/react-query";
import { router, type Href } from "expo-router";
import {
  AlertTriangle, BedDouble, Building2, CalendarDays, Check, ChevronLeft, ChevronRight, CloudOff, DoorOpen, Globe, LogIn, LogOut, Plus,
  RotateCw, Sparkle, SprayCan, User, Users, Wrench, type LucideIcon,
} from "lucide-react-native";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View, type TextStyle } from "react-native";
import { HeldError, type Hotel } from "../../core/api";
import { dateLong } from "../../core/format";
import { isOnline } from "../../core/offline";
import { c, face, space, t } from "../../core/theme";
import { useRead } from "../../core/ui";
import { day } from "../front-desk/desk";
import { Button, Segmented, Toast, WEBSITE, type Said } from "../front-desk/kit";
import { IconChip, type ChipTone } from "../reports/kit";
import { AssignRoom } from "./AssignRoom";
import {
  addDays, BAR_LABEL, groupsOf, headOf, isWeekend, LEGEND, PILL_LABEL, PILLS, rateK, readableOn, roomVisible,
  type BarTone, type Chart, type ChartBar, type GroupBy, type Pill,
} from "./chart";
import { readChart, rememberGrouping } from "./data";
import { whyNotBook, whyNotRoom } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   THE CALENDAR — the web's /h/:code/calendar (src/modules/front-desk/
   pages/StayView.tsx, view "calendar"; picture all/03-home-calendar): a
   fortnight across every room, three nights and a quarter in view on a
   phone, snapping night by night. The head and the tiles stay put; the
   chart scrolls both ways inside its card, the dates and the footer pinned
   to it and the room column pinned to its left (one horizontal scroll, the
   date and footer rows follow it). A bar opens the stay; an empty cell
   opens New booking on that room and night. The last fortnight that loaded
   stays on screen while another loads, or when it cannot.
   ══════════════════════════════════════════════════════════════════ */

const ROOM_W = 72;
const HEAD_H = 50;
const GROUP_H = 44;
const ROW_H = 40;
const FOOT_H = 58;
const rose700 = "#b84659"; // theme.css --color-brand-rose-700: white on it 5.17:1 (the core has no rose yet)

/** StayView.tsx BAR: the Rooms tiles' colours. */
const BAR: Record<BarTone, { bg: string; fg: string; ring?: string; dashed?: boolean; strike?: boolean }> = {
  "in-house": { bg: c.info, fg: c.white },
  confirmed: { bg: c.info50, fg: c.info, ring: c.info100 },
  departed: { bg: c.grey100, fg: c.grey600, ring: c.grey200 },
  "due-out": { bg: c.yellow, fg: c.ink900 },
  "no-show": { bg: rose700, fg: c.white },
  void: { bg: c.red50, fg: c.red700, strike: true },
  waiting: { bg: c.grey100, fg: c.grey600, ring: c.grey300, dashed: true },
};
const SOURCE_ICON: Record<string, LucideIcon> = { "Walk-in": User, "Fidato Hotels": Building2 };
const PILL_ICON: Record<Pill, LucideIcon> = {
  All: BedDouble, Vacant: DoorOpen, Occupied: Users, Arrivals: LogIn, Reserved: CalendarDays, Blocked: Wrench, "Due Out": LogOut, Dirty: SprayCan,
};
const PILL_CHIP: Record<Pill, ChipTone> = {
  All: "neutral", Vacant: "neutral", Occupied: "blue", Arrivals: "orange", Reserved: "neutral", Blocked: "neutral", "Due Out": "yellow", Dirty: "green",
};

/** src/lib/api.ts DeskRules, the Calendar's three (the core's Hotel does not name them yet). */
interface CalendarRules {
  weekendDays?: number[];
  holidays?: Array<{ day: string; name: string; colour?: string | null }>;
  statusColours?: Partial<Record<BarTone, string>>;
}
const rulesOf = (hotel: Hotel) => (hotel as Hotel & { deskRules?: CalendarRules }).deskRules;

/* The person's Room type / Floor for this run: their server preference
   (087) once read, then what they last chose here. */
let chosenGrouping: GroupBy | null = null;

export function Calendar({ hotel, role, grouping }: { hotel: Hotel; role: string | null; grouping: GroupBy | undefined }) {
  const code = hotel.code;
  const today = hotel.businessDate;
  const rules = rulesOf(hotel);
  const holiday = new Map((rules?.holidays ?? []).map((h) => [h.day, h]));
  const cache = useQueryClient();
  const { width } = useWindowDimensions();
  /* A night is a third of what is left, three and a quarter showing (CHART_VARS). */
  const dayW = Math.max(48, (width - ROOM_W) / 3.25);

  const [start, setStart] = useState(today);
  const [pill, setPill] = useState<Pill>("All");
  const [groupBy, setGroupBy] = useState<GroupBy>(chosenGrouping ?? grouping ?? "type");
  const [toast, setToast] = useState<Said | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [pulled, setPulled] = useState(false);

  /* The fortnight's read, the hotel and the business date in its key. */
  const read = useRead(() => readChart(code, start, today), ["reservations", code, "chart", start, today]);
  /* THE LAST GOOD HOUSE STAYS ON SCREEN: only this hotel's, on this business date. */
  const [last, setLast] = useState<{ code: string; today: string; start: string; data: Chart | null } | null>(null);
  useEffect(() => { if (read.data !== undefined) setLast({ code, today, start, data: read.data }); }, [read.data, code, today, start]);
  const earlier = read.data === undefined && last && last.code === code && last.today === today && last.start !== start ? last : null;
  const data = read.data !== undefined ? read.data : earlier?.data;
  useEffect(() => { if (!read.loading) setPulled(false); }, [read.loading]);

  /* One horizontal scroll: the body's; the dates and the footer follow it. */
  const headRef = useRef<ScrollView>(null);
  const footRef = useRef<ScrollView>(null);
  const follow = (x: number) => {
    headRef.current?.scrollTo({ x, animated: false });
    footRef.current?.scrollTo({ x, animated: false });
  };

  const refusedBook = whyNotBook(role);
  const refusedRoom = whyNotRoom(role);
  const chooseGrouping = (next: GroupBy) => {
    if (next === groupBy) return;
    setGroupBy(next);
    chosenGrouping = next;
    rememberGrouping(next).catch((e: unknown) => {
      if (!(e instanceof HeldError)) setToast({ title: "Not remembered", body: e instanceof Error ? e.message : String(e), tone: "bad" });
    });
  };
  const bookRoom = (room: string, date: string) => {
    if (refusedBook) return setToast({ title: refusedBook, tone: "held" });
    router.push(`/reservations/${code}/book?room=${encodeURIComponent(room)}&date=${date}` as Href);
  };

  const head = (
    <View style={{ paddingHorizontal: space.side, paddingTop: 16, gap: 12 }}>
      <View style={{ gap: 2 }}>
        <Text style={t.eyebrow}>{`Business date · ${dateLong(today)}`}</Text>
        <Text style={t.title} accessibilityRole="header">Calendar</Text>
        <Text style={[t.label, { color: c.grey500, lineHeight: 21 }]}>{hotel.name}</Text>
      </View>
      {/* Rooms is the desk's tiles (/h/:code/stay): not on the phone yet. */}
      <Segmented<"calendar" | "floor">
        value="calendar"
        onChange={(v) => { if (v === "floor") setToast({ title: WEBSITE, body: "Rooms, the house as tiles, is on the website for now.", tone: "held" }); }}
        options={[{ value: "calendar", label: "Calendar" }, { value: "floor", label: "Rooms" }]}
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Segmented<GroupBy> value={groupBy} onChange={chooseGrouping} options={[{ value: "type", label: "Room type" }, { value: "floor", label: "Floor" }]} />
        </View>
        <Button label="Assign room" Icon={Plus} reason={refusedRoom} onRefused={(r) => setToast({ title: r, tone: "held" })} onPress={() => setAssigning(true)} />
      </View>
    </View>
  );

  let body: ReactNode;
  if (data === null) {
    body = <State title="No rooms set up yet" line="Add them in Room types." />;
  } else if (data === undefined) {
    body = read.error && !isOnline()
      ? <State title="No connection" line="This device is offline, so the rooms cannot load. They load by themselves as soon as it is back." Icon={CloudOff} />
      : read.error && !read.loading
        ? <State title="The rooms did not load" line={read.error} Icon={AlertTriangle} bad onRetry={read.reload} />
        : <Skeleton dayW={dayW} />;
  } else {
    const groups = groupsOf(data, groupBy).map((g) => ({ ...g, rooms: g.rooms.filter((r) => roomVisible(r, pill)) })).filter((g) => g.rooms.length > 0);
    const chartW = data.dates.length * dayW;
    const shade = (d: string) => isWeekend(d, rules?.weekendDays) || holiday.has(d);
    body = (
      <View style={{ flex: 1, backgroundColor: c.white, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.grey200 }}>
        {/* The chart's toolbar: the fortnight, and what the bars mean. */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Round Icon={ChevronLeft} label="Previous week" onPress={() => setStart(addDays(start, -7))} />
            <Round Icon={ChevronRight} label="Next week" onPress={() => setStart(addDays(start, 7))} />
            <Text style={[t.heading, t.tab, { marginLeft: 6, flexShrink: 1 }]} numberOfLines={1}>{`${day(data.dates[0])} – ${day(data.dates[data.dates.length - 1])}`}</Text>
            {start !== today ? <Button label="Today" kind="ghost" size="sm" onPress={() => setStart(today)} /> : null}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 4 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {LEGEND.map((tone) => {
              const own = rules?.statusColours?.[tone];
              const b = BAR[tone];
              return (
                <View key={tone} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 18, height: 10, borderRadius: 3, backgroundColor: own ?? b.bg, borderWidth: b.ring && !own ? 1 : 0, borderColor: b.ring, borderStyle: b.dashed ? "dashed" : "solid" }} />
                  <Text style={t.caption}>{BAR_LABEL[tone]}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* The dates, pinned to the top of the chart. */}
        <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
          <View style={{ width: ROOM_W, height: HEAD_H, borderRightWidth: 1, borderRightColor: c.grey200 }} />
          <ScrollView ref={headRef} horizontal scrollEnabled={false} showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", width: chartW }}>
              {data.dates.map((d) => {
                const h = headOf(d);
                const on = d === today;
                const own = holiday.get(d)?.colour;
                return (
                  <View key={d} accessibilityLabel={dateLong(d)} style={{ width: dayW, height: HEAD_H, alignItems: "center", justifyContent: "center", borderRightWidth: 1, borderRightColor: c.grey100, backgroundColor: on ? c.ink900 : own ? `${own}26` : shade(d) ? c.grey50 : c.white }}>
                    <Text style={[t.caption, face[600], { letterSpacing: 0.3, color: on ? c.onNavy : c.grey500 }]}>{h.weekday}</Text>
                    <Text style={[t.heading, t.tab, { color: on ? c.white : c.ink900 }]}>{h.day}</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          refreshControl={<RefreshControl refreshing={pulled && read.loading} onRefresh={() => { setPulled(true); read.reload(); }} tintColor={c.orange} colors={[c.orange]} />}
        >
          {groups.length === 0 ? (
            <Text style={[t.label, { padding: 16, color: c.grey500 }]}>{`No rooms are ${PILL_LABEL[pill].toLowerCase()} today.`}</Text>
          ) : (
            <View style={{ flexDirection: "row" }}>
              {/* The room column, pinned to the left. */}
              <View style={{ width: ROOM_W, borderRightWidth: 1, borderRightColor: c.grey200 }}>
                {groups.map((g) => (
                  <View key={g.type}>
                    <View style={{ height: GROUP_H, justifyContent: "center", paddingHorizontal: 10, backgroundColor: c.grey50, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
                      <Text numberOfLines={1} style={[t.caption, face[600], { color: c.ink900 }]}>{g.type}</Text>
                    </View>
                    {g.rooms.map((r) => (
                      <View key={r.number} style={{ height: ROW_H, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: c.grey100 }}
                        accessibilityLabel={`Room ${r.number}, ${r.housekeeping === "dirty" ? "dirty" : "clean"}${r.outOfService ? ", out of service" : ""}`}>
                        <Text style={[t.label, t.tab, { color: c.ink900 }]}>{r.number}</Text>
                        <View style={{ flexDirection: "row", gap: 2, marginLeft: "auto" }}>
                          <Sparkle size={12} color={r.housekeeping === "dirty" ? c.yellow : c.grey300} />
                          <Wrench size={12} color={r.outOfService ? c.red : c.grey300} />
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
              <ScrollView
                horizontal showsHorizontalScrollIndicator={false} snapToInterval={dayW} decelerationRate="fast"
                scrollEventThrottle={16} onScroll={(e) => follow(e.nativeEvent.contentOffset.x)}
              >
                <View style={{ width: chartW }}>
                  {groups.map((g) => (
                    <View key={g.type}>
                      {/* Availability over the night's price, per date. */}
                      <View style={{ height: GROUP_H, flexDirection: "row", backgroundColor: c.grey50, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
                        {g.perDate.map((cell) => (
                          <View key={cell.date} style={{ width: dayW, alignItems: "center", justifyContent: "center", borderRightWidth: 1, borderRightColor: c.grey200 }}>
                            <Text style={[t.label, t.tab, face[600], { lineHeight: 20, color: cell.available === 0 ? c.red700 : c.ink900 }]}>{cell.available}</Text>
                            <Text style={[t.caption, t.tab, { lineHeight: 16 }]}>{rateK(cell.rate)}</Text>
                          </View>
                        ))}
                      </View>
                      {g.rooms.map((r) => (
                        <View key={r.number} style={{ height: ROW_H, borderBottomWidth: 1, borderBottomColor: c.grey100 }}>
                          <View style={{ flexDirection: "row", height: ROW_H - 1 }}>
                            {data.dates.map((d) => (
                              <Pressable
                                key={d} onPress={() => bookRoom(r.number, d)} accessibilityRole="button" accessibilityLabel={`Book room ${r.number} on ${d}`}
                                accessibilityState={{ disabled: refusedBook != null }}
                                style={({ pressed }) => ({
                                  width: dayW, borderRightWidth: 1, borderRightColor: c.grey100,
                                  backgroundColor: pressed && !refusedBook ? c.orange50 : d === today ? "rgba(3,23,40,0.035)" : shade(d) ? c.grey50 : c.white,
                                })}
                              />
                            ))}
                          </View>
                          {r.bars.map((b) => (
                            <Bar key={b.stay.id} bar={b} dayW={dayW} own={rules?.statusColours?.[b.tone]}
                              onOpen={() => router.push(`/front-desk/${code}/stay/${b.stay.id}` as Href)} />
                          ))}
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </ScrollView>

        {/* What is left, and how full, pinned to the bottom of the chart. */}
        <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: c.grey300, backgroundColor: c.white }}>
          <View style={{ width: ROOM_W, height: FOOT_H, justifyContent: "center", paddingHorizontal: 10, borderRightWidth: 1, borderRightColor: c.grey200 }}>
            <Text style={[t.label, face[600], { color: c.ink900 }]}>Available</Text>
          </View>
          <ScrollView ref={footRef} horizontal scrollEnabled={false} showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", width: chartW }}>
              {data.footer.map((f) => (
                <View key={f.date} accessibilityLabel={`${f.date}: ${f.availableInventory} available, ${Math.round(f.occupancyPct)}% full`}
                  style={{ width: dayW, height: FOOT_H, alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 10, borderRightWidth: 1, borderRightColor: c.grey100 }}>
                  <Text style={[t.label, t.tab, face[600], { lineHeight: 20, color: c.ink900 }]}>{f.availableInventory}</Text>
                  <View style={{ alignSelf: "stretch", height: 4, borderRadius: 2, backgroundColor: c.grey100, overflow: "hidden" }}>
                    <View style={{ height: 4, borderRadius: 2, backgroundColor: c.orange, width: `${Math.min(100, Math.max(0, f.occupancyPct))}%` }} />
                  </View>
                  <Text style={[t.caption, t.tab, { lineHeight: 16 }]}>{`${Math.round(f.occupancyPct)}%`}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.grey50 }}>
      {head}
      <Tiles pill={pill} onPick={setPill} counts={data?.counts} />
      {data !== undefined && data !== null && read.error ? (
        <Stale offline={!isOnline()} error={read.error} missing={earlier ? start : null} busy={read.loading} onRetry={read.reload} />
      ) : null}
      {body}
      {assigning ? (
        <AssignRoom hotel={hotel} onClose={() => setAssigning(false)} onDone={(s) => { setAssigning(false); setToast(s); void cache.invalidateQueries({ queryKey: ["reservations", code] }); }} />
      ) : null}
      <Toast said={toast} onClose={() => setToast(null)} />
    </View>
  );
}

/** The filters: a row of level count tiles, scrolling inside itself (FilterTiles). Not read yet is a dash. */
function Tiles({ pill, onPick, counts }: { pill: Pill; onPick: (p: Pill) => void; counts: Record<Pill, number> | undefined }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.side, paddingVertical: 16, gap: 8 }}
      accessibilityRole="tablist" accessibilityLabel="Filter rooms">
      {PILLS.map((p) => {
        const n = counts?.[p];
        const on = pill === p;
        const job = !on && (n ?? 0) > 0 ? (p === "Arrivals" ? "orange" : p === "Due Out" ? "yellow" : null) : null;
        const good = p === "Dirty" && n === 0 && !on;
        return (
          <Pressable
            key={p} onPress={() => onPick(p)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`${PILL_LABEL[p]}, ${n ?? "not read"}`}
            style={({ pressed }) => ({
              minWidth: 116, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 4,
              backgroundColor: on ? c.ink900 : job === "orange" ? c.orange50 : job === "yellow" ? c.yellow50 : pressed ? c.grey50 : c.white,
              borderColor: on ? c.ink900 : job === "orange" ? c.orange100 : job === "yellow" ? c.yellow100 : c.grey200,
            })}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <IconChip icon={PILL_ICON[p]} tone={on ? "glass" : p === "Dirty" && (n ?? 0) > 0 ? "neutral" : PILL_CHIP[p]} size={24} />
              <Text style={[t.figure, { lineHeight: 24 }, on ? { color: c.white } : n === undefined ? { color: c.grey500 }
                : p === "Blocked" && n > 0 ? { color: c.orange700 } : good ? { color: c.success600 } : null]}>{n === undefined ? "-" : n}</Text>
              {good ? <Check size={14} color={c.success600} /> : null}
            </View>
            <Text numberOfLines={1} style={[t.label, { lineHeight: 18, color: on ? c.onNavy : c.grey600 }]}>{PILL_LABEL[p]}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** A booking's bar, over its nights (BookingBar). The hotel's own colour when it chose one. */
function Bar({ bar, dayW, own, onOpen }: { bar: ChartBar; dayW: number; own: string | undefined; onOpen: () => void }) {
  const b = BAR[bar.tone];
  const Icon = SOURCE_ICON[bar.stay.source ?? ""] ?? Globe;
  const fg = own ? readableOn(own) : b.fg;
  const nights = bar.stay.isDayUse ? "day use" : `${bar.stay.nights} night${bar.stay.nights === 1 ? "" : "s"}`;
  const text: TextStyle = { fontSize: 11, ...face[500], color: fg, flexShrink: 1, ...(b.strike ? { textDecorationLine: "line-through" } : null) };
  return (
    <Pressable
      onPress={onOpen} accessibilityRole="button"
      accessibilityLabel={`${bar.stay.guest}, ${BAR_LABEL[bar.tone]}, ${day(bar.stay.arrival)} to ${day(bar.stay.departure)}, ${nights}`}
      style={({ pressed }) => ({
        position: "absolute", top: (ROW_H - 1 - 24) / 2, height: 24,
        left: bar.startIndex * dayW + (bar.clippedStart ? 0 : 2), width: bar.span * dayW - (bar.clippedStart ? 0 : 2) - (bar.clippedEnd ? 0 : 2),
        borderTopLeftRadius: bar.clippedStart ? 0 : 4, borderBottomLeftRadius: bar.clippedStart ? 0 : 4,
        borderTopRightRadius: bar.clippedEnd ? 0 : 4, borderBottomRightRadius: bar.clippedEnd ? 0 : 4,
        backgroundColor: own ?? b.bg, borderWidth: b.ring && !own ? 1 : 0, borderColor: b.ring, borderStyle: b.dashed ? "dashed" : "solid",
        flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 6, opacity: pressed ? 0.85 : 1,
      })}
    >
      <Icon size={10} color={fg} style={{ opacity: 0.8 }} />
      <Text numberOfLines={1} style={text}>{bar.stay.guest}</Text>
    </Pressable>
  );
}

function Round({ Icon, label, onPress }: { Icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: c.grey300, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? c.grey100 : c.white })}>
      <Icon size={16} color={c.ink900} />
    </Pressable>
  );
}

/** What stands in for the house (EmptyState, ErrorState), under the screen's own head. */
function State({ title, line, Icon = BedDouble, bad, onRetry }: { title: string; line: string; Icon?: LucideIcon; bad?: boolean; onRetry?: () => void }) {
  return (
    <View style={{ marginHorizontal: space.side, borderRadius: 12, borderWidth: 1, borderColor: bad ? c.red100 : c.grey200, backgroundColor: bad ? c.red50 : c.white, padding: 24, alignItems: "center", gap: 6 }}
      accessibilityRole={bad ? "alert" : undefined}>
      <Icon size={20} color={bad ? c.red700 : c.grey400} />
      <Text style={[t.heading, { textAlign: "center", color: bad ? c.red700 : c.ink900 }]}>{title}</Text>
      <Text style={[t.label, { textAlign: "center", color: c.grey600, lineHeight: 21 }]}>{line}</Text>
      {onRetry ? <View style={{ marginTop: 8 }}><Button label="Try again" Icon={RotateCw} onPress={onRetry} /></View> : null}
    </View>
  );
}

/** The house on screen is not current, and says so (StaleRooms). */
function Stale({ offline, error, missing, busy, onRetry }: { offline: boolean; error: string; missing: string | null; busy: boolean; onRetry: () => void }) {
  return (
    <View accessibilityRole="alert" style={{ marginHorizontal: space.side, marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12,
      borderColor: offline ? c.yellow100 : c.red100, backgroundColor: offline ? c.yellow50 : c.red50 }}>
      {offline ? <CloudOff size={16} color={c.grey600} /> : <AlertTriangle size={16} color={c.red} />}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[t.label, { color: c.ink900 }]}>
          {offline ? "No connection - these rooms are possibly out of date." : "The rooms did not refresh - these are possibly out of date."}
          {missing ? ` The fortnight from ${day(missing)} has not loaded.` : ""}
        </Text>
        {!offline ? <Text style={[t.label, { color: c.grey600 }]}>{error}</Text> : null}
      </View>
      <Button label="Try again" size="sm" Icon={RotateCw} busy={busy} onPress={onRetry} />
    </View>
  );
}

/** Shaped like the fortnight it stands in for. */
function Skeleton({ dayW }: { dayW: number }) {
  return (
    <View style={{ flex: 1, backgroundColor: c.white, borderTopWidth: 1, borderColor: c.grey200 }} accessibilityLabel="Loading calendar" accessibilityRole="progressbar">
      {Array.from({ length: 8 }).map((_, r) => (
        <View key={r} style={{ height: ROW_H, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: c.grey100 }}>
          <View style={{ width: ROOM_W, paddingHorizontal: 10 }}><View style={{ width: 32, height: 12, borderRadius: 4, backgroundColor: c.grey100 }} /></View>
          <View style={{ marginLeft: ((r * 5) % 3) * dayW * 0.6, width: (1 + (r % 3)) * dayW * 0.7, height: 24, borderRadius: 7, backgroundColor: c.grey100 }} />
        </View>
      ))}
    </View>
  );
}
