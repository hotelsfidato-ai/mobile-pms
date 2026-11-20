import { useQueryClient } from "@tanstack/react-query";
import { router, type Href } from "expo-router";
import {
  AlertTriangle, BedDouble, CalendarDays, Check, ChevronRight, CloudOff, DoorOpen, LogIn, LogOut, Plus, RotateCw, SprayCan, Users, Wrench,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { api, HeldError, type Hotel } from "../../core/api";
import { dateLong } from "../../core/format";
import { isOnline } from "../../core/offline";
import { c, face, space, t } from "../../core/theme";
import type { Stay } from "../../core/types";
import { Card, Head, Screen, useRead } from "../../core/ui";
import { AssignRoom } from "../reservations/AssignRoom";
import { buildChart, groupsOf, PILL_LABEL, PILLS, roomVisible, windowFrom, type ChartRoom, type GroupBy, type Pill } from "../reservations/chart";
import { rememberGrouping } from "../reservations/data";
import { IconChip, type ChipTone } from "../reports/kit";
import { readHouse, readRooms } from "./data";
import { Button, Segmented, Toast, type Said } from "./kit";
import { whyNotBook, whyNotRoom } from "./roles";
import { dirtyMark, inPairs, tileAct, tileState, tileType, tileWhen, todaysStays, TILE_LABEL, type TileState } from "./rooms";

/* ══════════════════════════════════════════════════════════════════
   ROOMS — the web's /h/:code/stay (src/modules/front-desk/pages/
   StayView.tsx, view "floor"; flows/HouseFloor.tsx; picture
   all/02-home-rooms): every room as a tile for today, grouped by room type
   or floor, the eight count tiles filtering them. A tile with a guest
   opens the stay (Check in offered, as the web's panel); a free or
   needs-cleaning tile starts a walk-in into it; out of service opens
   nothing. The grid writes nothing of its own on a room: Assign room is
   reservations' flow, the grouping is the person's preference (087).
   Not the housekeeping board (/housekeeping/<code>): that one groups by
   cleaning state and marks rooms clean; this one is who is in them.
   ══════════════════════════════════════════════════════════════════ */

/** StayView.tsx's two reads for Rooms: the house (getStayView: the rooms,
    the board's fortnight from today, the server's house-now; the night
    prices and the open bills are the Calendar's, not drawn here) and who
    is in each room today (fetchStays on the business date). */
async function readFloor(code: string, today: string) {
  const dates = windowFrom(today);
  const [rooms, board, house, day] = await Promise.all([
    readRooms(code),
    api<Stay[]>(`/api/hotels/${code}/stays?from=${dates[0]}&to=${dates[dates.length - 1]}&board=1`),
    readHouse(code),
    api<Stay[]>(`/api/hotels/${code}/stays?from=${today}&to=${today}`),
  ]);
  return { chart: buildChart({ rooms, stays: board, house: house.rooms, prices: null, start: today, businessDate: today }), today: todaysStays(day, today) };
}

/** HouseFloor.tsx TILE and PILL: the tile's tint and ring, the pill's ink and ring. */
const TILE: Record<TileState, { bg: string; ring: string; ink?: string; pillRing?: string }> = {
  free: { bg: c.white, ring: c.grey200 },
  occupied: { bg: c.info50, ring: c.info100, ink: c.info, pillRing: c.info100 },
  arriving: { bg: c.orange50, ring: c.orange100, ink: c.orange700, pillRing: c.orange100 },
  "due-out": { bg: c.yellow50, ring: c.yellow100, ink: c.yellow800, pillRing: c.yellow100 },
  dirty: { bg: c.red50, ring: c.red100, ink: c.red700, pillRing: c.red100 },
  "out-of-service": { bg: c.grey100, ring: c.grey200, ink: c.grey600, pillRing: c.grey200 },
};
/** StayView.tsx PILL_ICON and PILL_CHIP. */
const PILL_ICON: Record<Pill, LucideIcon> = {
  All: BedDouble, Vacant: DoorOpen, Occupied: Users, Arrivals: LogIn, Reserved: CalendarDays, Blocked: Wrench, "Due Out": LogOut, Dirty: SprayCan,
};
const PILL_CHIP: Record<Pill, ChipTone> = {
  All: "neutral", Vacant: "neutral", Occupied: "blue", Arrivals: "orange", Reserved: "neutral", Blocked: "neutral", "Due Out": "yellow", Dirty: "green",
};

/** Press feedback (docs/NATIVE.md): the ripple on Android, the pressed shade on iPhone, never both. */
const ios = Platform.OS === "ios";
const ripple = { color: c.grey200, borderless: false } as const;

/* The person's Room type / Floor for this run: their server preference (087), then what they chose here. */
let chosenGrouping: GroupBy | null = null;

export function Rooms({ hotel, role, grouping }: { hotel: Hotel; role: string | null; grouping: GroupBy | undefined }) {
  const code = hotel.code;
  const today = hotel.businessDate;
  const cache = useQueryClient();
  const [pill, setPill] = useState<Pill>("All");
  const [groupBy, setGroupBy] = useState<GroupBy>(chosenGrouping ?? grouping ?? "type");
  const [toast, setToast] = useState<Said | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [pulled, setPulled] = useState(false);
  /* The hotel and the business date in the key: yesterday's house never stands under today. */
  const read = useRead(() => readFloor(code, today), ["front-desk", code, "rooms", today]);
  useEffect(() => { if (!read.loading) setPulled(false); }, [read.loading]);

  const refusedBook = whyNotBook(role);
  const refusedRoom = whyNotRoom(role);
  const chooseGrouping = (next: GroupBy) => {
    if (next === groupBy) return;
    setGroupBy(next);
    chosenGrouping = next;
    /* Sets a value: safe to send again. Refused offline (not a held write), as the web says "Not remembered". */
    rememberGrouping(next).catch((e: unknown) => {
      if (!(e instanceof HeldError)) setToast({ title: "Not remembered", body: e instanceof Error ? e.message : String(e), tone: "bad" });
    });
  };
  const open = (room: ChartRoom, stay: Stay | undefined) => {
    const act = tileAct(room, stay);
    if (act.kind === "stay") router.push(`/front-desk/${code}/stay/${act.id}?offer=1` as Href);
    else if (act.kind === "walk-in") {
      /* The web draws the free tile as no control at all for whoever may not book (D24-27); greyed here, with the API's sentence. */
      if (refusedBook) setToast({ title: refusedBook, tone: "held" });
      else router.push(`/front-desk/${code}/walk-in?room=${encodeURIComponent(act.room)}` as Href);
    }
  };

  const data = read.data;
  let body;
  if (data === undefined) {
    body = read.error && !isOnline()
      ? <State title="No connection" line="This device is offline, so the rooms cannot load. They load by themselves as soon as it is back." Icon={CloudOff} onRetry={read.reload} />
      : read.error && !read.loading
        ? <State title="The rooms did not load" line={read.error} Icon={AlertTriangle} bad onRetry={read.reload} />
        : <Skeleton />;
  } else if (data.chart === null) {
    body = <State title="No rooms set up yet" line="Add them in Room types." />;
  } else {
    const groups = groupsOf(data.chart, groupBy).map((g) => ({ ...g, rooms: g.rooms.filter((r) => roomVisible(r, pill)) })).filter((g) => g.rooms.length > 0);
    body = groups.length === 0
      ? <Text style={[t.label, { color: c.grey500 }]}>{`No rooms are ${PILL_LABEL[pill].toLowerCase()} today.`}</Text>
      : (
        <View style={{ gap: 24 }}>
          {groups.map((g) => (
            <View key={g.type} style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={t.heading} accessibilityRole="header">{g.type}</Text>
                <View style={{ height: 20, paddingHorizontal: 8, borderRadius: 10, backgroundColor: c.grey100, justifyContent: "center" }}>
                  <Text style={[t.caption, t.tab, face[600], { color: c.grey600 }]}>{g.rooms.length}</Text>
                </View>
              </View>
              <View style={{ gap: 8 }}>
                {inPairs(g.rooms).map((pair) => (
                  <View key={pair[0]!.number} style={{ flexDirection: "row", gap: 8 }}>
                    {pair.map((r) => (
                      <Tile key={r.number} room={r} stay={data.today[r.number]} refused={refusedBook} onOpen={() => open(r, data.today[r.number])} />
                    ))}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.grey50 }}>
      <Screen refreshing={pulled && read.loading} onRefresh={() => { setPulled(true); read.reload(); }}>
        <Head eyebrow={`Business date · ${dateLong(today)}`} title="Rooms" under={hotel.name} />
        <Segmented<"calendar" | "floor">
          value="floor"
          onChange={(v) => { if (v === "calendar") router.push(`/reservations/${code}/calendar` as Href); }}
          options={[{ value: "calendar", label: "Calendar" }, { value: "floor", label: "Rooms" }]}
        />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: -4 }}>
          <View style={{ flex: 1 }}>
            <Segmented<GroupBy> value={groupBy} onChange={chooseGrouping} options={[{ value: "type", label: "Room type" }, { value: "floor", label: "Floor" }]} />
          </View>
          <Button label="Assign room" Icon={Plus} reason={refusedRoom} onRefused={(r) => setToast({ title: r, tone: "held" })} onPress={() => setAssigning(true)} />
        </View>
        <Tiles pill={pill} onPick={setPill} counts={data?.chart?.counts} />
        {data !== undefined && read.error ? <Stale offline={!isOnline()} error={read.error} busy={read.loading} onRetry={read.reload} /> : null}
        {body}
      </Screen>
      {assigning ? (
        <AssignRoom
          hotel={hotel} onClose={() => setAssigning(false)}
          onDone={(s) => {
            setAssigning(false);
            setToast(s);
            void cache.invalidateQueries({ queryKey: ["front-desk", code] });
            void cache.invalidateQueries({ queryKey: ["reservations", code] });
          }}
        />
      ) : null}
      <Toast said={toast} onClose={() => setToast(null)} />
    </View>
  );
}

/** One room (HouseFloor.tsx RoomTile): is it free (the colour), who is in it (the name), what happens today (the pill). */
function Tile({ room, stay, refused, onOpen }: { room: ChartRoom; stay: Stay | undefined; refused: string | null; onOpen: () => void }) {
  const state = tileState(room);
  const look = TILE[state];
  const free = state === "free";
  const act = tileAct(room, stay);
  /* A tile that opens a stay or a walk-in says so with an arrow (the Tappable Rule). */
  const opens = act.kind === "stay" || (act.kind === "walk-in" && refused === null);
  const off = act.kind === "none";
  const words = [`Room ${room.number}`, TILE_LABEL[state], dirtyMark(room) ? "dirty" : null, stay ? stay.guest : tileType(room), stay ? tileWhen(state, stay) : null]
    .filter(Boolean).join(", ");
  return (
    <Pressable
      onPress={onOpen} disabled={off} accessibilityRole="button" accessibilityLabel={words}
      accessibilityState={{ disabled: off || (act.kind === "walk-in" && refused !== null) }}
      accessibilityHint={act.kind === "walk-in" ? refused ?? "Starts a walk-in into this room" : undefined}
      android_ripple={off ? undefined : ripple}
      style={({ pressed }) => ({
        flex: 1, minHeight: 92, minWidth: 0, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 2, overflow: "hidden",
        backgroundColor: look.bg, borderColor: ios && pressed && !off ? (look.ink ?? c.grey400) : look.ring,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[t.figure, { flexShrink: 0 }, free ? [face[500], { color: c.grey700 }] : { color: c.ink900 }]}>{room.number}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 }}>
          {dirtyMark(room) ? <Text style={[t.caption, face[600], { color: c.red700 }]}>dirty</Text> : null}
          {free ? <Text style={t.caption}>{TILE_LABEL.free}</Text> : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 21, paddingHorizontal: 8, borderRadius: 999, backgroundColor: c.white, borderWidth: 1, borderColor: look.pillRing, flexShrink: 1 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: look.ink }} />
              <Text numberOfLines={1} style={[t.caption, { color: look.ink }]}>{TILE_LABEL[state]}</Text>
            </View>
          )}
        </View>
      </View>
      {stay ? (
        <>
          <Text numberOfLines={1} style={[t.label, { marginTop: 4, color: c.ink900, lineHeight: 20 }]}>{stay.guest}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <Text style={[t.caption, t.tab, { color: state === "due-out" ? c.yellow800 : c.grey600 }]}>{tileWhen(state, stay)}</Text>
            {opens ? <ChevronRight size={16} color={c.grey400} /> : null}
          </View>
        </>
      ) : (
        <>
          <Text numberOfLines={1} style={[t.label, { marginTop: 4, color: c.grey500, lineHeight: 20 }]}>{tileType(room)}</Text>
          <View style={{ flexDirection: "row", justifyContent: "flex-end", minHeight: 16 }}>{opens ? <ChevronRight size={16} color={c.grey400} /> : null}</View>
        </>
      )}
    </Pressable>
  );
}

/** The filters: a row of level count tiles scrolling inside itself (StayView.tsx FilterTiles). Not read yet is a dash. */
function Tiles({ pill, onPick, counts }: { pill: Pill; onPick: (p: Pill) => void; counts: Record<Pill, number> | undefined }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.side }}
      contentContainerStyle={{ paddingHorizontal: space.side, paddingVertical: 2, gap: 8 }} accessibilityRole="tablist" accessibilityLabel="Filter rooms">
      {PILLS.map((p) => {
        const n = counts?.[p];
        const on = pill === p;
        const job = !on && (n ?? 0) > 0 ? (p === "Arrivals" ? "orange" : p === "Due Out" ? "yellow" : null) : null;
        const good = p === "Dirty" && n === 0 && !on;
        return (
          <Pressable
            key={p} onPress={() => onPick(p)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`${PILL_LABEL[p]}, ${n ?? "not read"}`}
            android_ripple={ripple}
            style={({ pressed }) => ({
              minWidth: 116, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 4, overflow: "hidden",
              backgroundColor: on ? c.ink900 : job === "orange" ? c.orange50 : job === "yellow" ? c.yellow50 : ios && pressed ? c.grey50 : c.white,
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

/** What stands in for the house (EmptyState, ErrorState), under the screen's own head. */
function State({ title, line, Icon = BedDouble, bad, onRetry }: { title: string; line: string; Icon?: LucideIcon; bad?: boolean; onRetry?: () => void }) {
  return (
    <Card style={{ borderColor: bad ? c.red100 : c.grey200, backgroundColor: bad ? c.red50 : c.white, padding: 24, alignItems: "center", gap: 6 }}>
      <View accessibilityRole={bad ? "alert" : undefined} style={{ alignItems: "center", gap: 6 }}>
        <Icon size={20} color={bad ? c.red700 : c.grey400} />
        <Text style={[t.heading, { textAlign: "center", color: bad ? c.red700 : c.ink900 }]}>{title}</Text>
        <Text style={[t.label, { textAlign: "center", color: c.grey600, lineHeight: 21 }]}>{line}</Text>
        {onRetry ? <View style={{ marginTop: 8 }}><Button label="Try again" Icon={RotateCw} onPress={onRetry} /></View> : null}
      </View>
    </Card>
  );
}

/** The house on screen is not current, and says so (StaleRooms): the tiles stay, with why above them. */
function Stale({ offline, error, busy, onRetry }: { offline: boolean; error: string; busy: boolean; onRetry: () => void }) {
  return (
    <View accessibilityRole="alert" style={{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12,
      borderColor: offline ? c.yellow100 : c.red100, backgroundColor: offline ? c.yellow50 : c.red50 }}>
      {offline ? <CloudOff size={16} color={c.grey600} /> : <AlertTriangle size={16} color={c.red} />}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[t.label, { color: c.ink900 }]}>{offline ? "No connection - these rooms are possibly out of date." : "The rooms did not refresh - these are possibly out of date."}</Text>
        {offline ? null : <Text style={[t.label, { color: c.grey600 }]}>{error}</Text>}
      </View>
      {/* Offline the web waits for the line (a paused read); the phone cannot tell that it will, so Try again stays. */}
      <Button label="Try again" size="sm" Icon={RotateCw} busy={busy} onPress={onRetry} />
    </View>
  );
}

/** Shaped like the tiles it stands in for (StayViewSkeleton, floor): two groups of 10 and 7. */
function Skeleton() {
  return (
    <View accessibilityLabel="Loading rooms" accessibilityRole="progressbar" style={{ gap: 24 }}>
      {[10, 7].map((tiles, s) => (
        <View key={s} style={{ gap: 12 }}>
          <View style={{ width: 112, height: 20, borderRadius: 6, backgroundColor: c.grey100 }} />
          {inPairs(Array.from({ length: tiles }, (_, i) => i)).map((pair) => (
            <View key={pair[0]} style={{ flexDirection: "row", gap: 8 }}>
              {pair.map((i) => <View key={i} style={{ flex: 1, height: 92, borderRadius: 12, backgroundColor: c.grey100 }} />)}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
