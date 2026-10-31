import { useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import {
  BedDouble, Check, ChevronDown, ChevronLeft, ChevronRight, CloudOff, DoorOpen, LogOut, RefreshCw, RotateCcw, Sparkle, SprayCan, UserRound, Users, Wrench, type LucideIcon,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, Modal, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import type { Room, Stay } from "../../core/types";
import { api, HeldError, send, type Hotel } from "../../core/api";
import { DASH } from "../../core/format";
import { isOnline, watchConnection, type OutboxEntry } from "../../core/offline";
import { list, subscribe } from "../../core/outbox";
import { c, face, space, t } from "../../core/theme";
import { Capsule, Card, Head, ReadFailed, s, useRead } from "../../core/ui";
import { AnchorGauge, Fade, IconChip, more, Ring, type ChipTone } from "../reports/kit";
import {
  assignPath, boardHead, boardRooms, firstSheet, GROUPS, heldAssignee, heldMark, inGroup, markPath, onSheet, whyNotClean, whyNotInspected, whyNotOpenRepair,
  type BoardRoom, type Housekeeper, type HouseNow, type RoomAssignment, type Sheet,
} from "./board";
import { whyNotAssign, whyNotBlock } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   THE HOUSEKEEPING BOARD on a phone — the web's /h/:code/housekeeping
   (src/modules/housekeeping/pages/Housekeeping.tsx), the picture
   pms-shots/all/10-front-desk-housekeeping.png (M-11): the navy Empty rooms,
   the six counts that jump to their group, whose sheet, and the rooms by
   what they need, each with who has it, Clean, Inspected and Repair. Out of
   service is inside Repair, as on the web. A grey button says why when
   tapped (the owner's D17-8); the API's refusal of the person comes first.
   Held taps show on their card (the web's readHeld); the bar above every
   screen counts them and sends them. Not here: the live channel (the 30 s
   floor stands).
   ══════════════════════════════════════════════════════════════════ */

/** A read that may be refused without sinking the board. */
const settle = <T,>(p: Promise<T>) =>
  p.then((data) => ({ data, error: null }), (e: unknown) => ({ data: null, error: message(e) }));
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function readBoard(code: string, date: string) {
  const [rooms, house, stays, sheet, staff] = await Promise.all([
    api<Room[]>(`/api/hotels/${code}/rooms`),
    api<HouseNow>(`/api/hotels/${code}/house-now`),
    /* The board's read of the day (D27-316); guest names need the booking right. */
    settle(api<Stay[]>(`/api/hotels/${code}/stays?from=${date}&to=${date}&board=1`)),
    settle(api<{ date: string; assignments: RoomAssignment[] }>(`/api/hotels/${code}/housekeeping/assignments`)),
    /* The web hides a failed roster (R-5); the phone says so. */
    settle(api<Housekeeper[]>(`/api/hotels/${code}/housekeepers`)),
  ]);
  return { rooms: boardRooms(rooms, house, stays.data), names: stays.error, sheet, staff };
}
type Board = Awaited<ReturnType<typeof readBoard>>;
type Said = { title: string; body?: string; tone: "ok" | "held" | "bad" };

/** The web's board polls every 30 s while it is on screen (HK-1). */
const FLOOR_MS = 30_000;

export function Rooms({ hotel, role, me, onBack, onSignOut }: {
  hotel: Hotel; role: string | null; me: string | null; onBack?: () => void; onSignOut?: () => void;
}) {
  const code = hotel.code;
  const date = hotel.businessDate;
  const key = ["housekeeping", code, "rooms", date];
  const cache = useQueryClient();
  const board = useRead(() => readBoard(code, date), key);
  /* Null until somebody taps a chip: until then the first sheet follows the role (M-7). */
  const [chosen, setSheet] = useState<Sheet | null>(null);
  const [chipSaid, setChipSaid] = useState<string | null>(null);
  const [said, setSaid] = useState<Said | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  const [pulled, setPulled] = useState(false);
  const [held, setHeld] = useState<OutboxEntry[]>([]);
  const [online, setOnline] = useState(isOnline);
  const scroller = useRef<ScrollView>(null);
  const groupAt = useRef<Record<string, number>>({});

  useEffect(() => watchConnection(() => setOnline(isOnline())), []);
  useEffect(() => {
    const read = () => { list().then(setHeld, () => setHeld([])); };
    read();
    return subscribe(read);
  }, []);
  /* Not in the background: a phone in a pocket is nobody's screen. */
  useFocusEffect(useCallback(() => {
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void cache.refetchQueries({ queryKey: ["housekeeping", code, "rooms"] });
    }, FLOOR_MS);
    return () => clearInterval(timer);
  }, [cache, code]));
  useEffect(() => { if (!board.loading) setPulled(false); }, [board.loading]);
  useEffect(() => {
    if (!said) return;
    const timer = setTimeout(() => setSaid(null), 6000);
    return () => clearTimeout(timer);
  }, [said]);

  const data = board.data;
  const staff = data?.staff.data ?? [];
  const given = new Map((data?.sheet.data?.assignments ?? []).map((a) => [a.room, a]));
  const assignee = (n: string) => { const h = heldAssignee(held, code, n); return h === undefined ? given.get(n)?.staffId ?? null : h; };
  const nameOf = (id: string) => staff.find((p) => p.id === id)?.name ?? [...given.values()].find((a) => a.staffId === id)?.staffName ?? DASH;
  const rooms = data?.rooms ?? [];
  /* No roster, no chips (the web's): then nothing could lead back from a sheet. */
  const sheet = staff.length ? chosen ?? firstSheet(role, onSheet(rooms, "mine", assignee, me).length) : "all";
  const shown = onSheet(rooms, sheet, assignee, me);
  const sheetReason = data?.sheet.error ? `Who has which room could not be read. ${data.sheet.error}` : null;
  const assignReason = whyNotAssign(role)
    ?? (data?.staff.error ? `Who can be given rooms could not be read. ${data.staff.error}` : null) ?? sheetReason;

  async function mark(n: string, state: "clean" | "inspected") {
    try {
      await send("PUT", markPath(code, n), { state });
      /* Shown and said at once (HK-12), then read again. */
      cache.setQueryData<Board>(key, (b) => b && { ...b, rooms: b.rooms.map((r) => (r.number === n ? { ...r, housekeeping: state } : r)) });
      setSaid({ title: `Room ${n} is ${state}.`, tone: "ok" });
      void cache.invalidateQueries({ queryKey: ["housekeeping", code] });
    } catch (e) {
      setSaid(e instanceof HeldError ? { title: "Saved on this phone", body: e.message, tone: "held" }
        : { title: "Could not update", body: message(e), tone: "bad" });
    }
  }

  async function give(n: string, staffId: string | null) {
    setPicking(null);
    if (staffId === assignee(n)) return;
    try {
      await (staffId ? send("PUT", assignPath(code, n), { staffId }) : send("DELETE", assignPath(code, n)));
      cache.setQueryData<Board>(key, (b) => {
        const x = b?.sheet.data;
        if (!b || !x) return b;
        const assignments = x.assignments.filter((a) => a.room !== n);
        if (staffId) assignments.push({ room: n, staffId, staffName: nameOf(staffId), role: null, note: null });
        return { ...b, sheet: { ...b.sheet, data: { ...x, assignments } } };
      });
      void cache.invalidateQueries({ queryKey: ["housekeeping", code] });
    } catch (e) {
      setSaid(e instanceof HeldError ? { title: "Saved on this phone", body: e.message, tone: "held" }
        : { title: "Not assigned", body: message(e), tone: "bad" });
    }
  }

  /* A count at the top jumps to its group (the owner, 28 September). The
     counts are of every room, so a name's sheet is let go first, or the
     group may not be on the page to jump to. */
  function jump(group: string) {
    const go = () => scroller.current?.scrollTo({ y: (groupAt.current[group] ?? 0) - 8, animated: true });
    if (sheet === "all") return go();
    setSheet("all");
    /* ponytail: a beat for the taller page to lay out, not a layout listener. */
    setTimeout(go, 100);
  }

  const notes = [
    data?.names ? `Guest names and Due out are not shown. ${data.names}` : null,
    sheetReason,
    data?.staff.error ? `Who can be given rooms could not be read. ${data.staff.error}` : null,
  ].filter((x): x is string => x != null);

  let body: ReactNode;
  if (!data) {
    body = !board.error ? <Text style={t.label}>Reading the rooms…</Text>
      : !online ? (
        <Card style={{ backgroundColor: c.yellow50, borderColor: c.yellow100, gap: 8 }}>
          <Text style={[t.heading, { color: c.yellow800 }]}>No connection</Text>
          <Text style={[t.label, { color: c.grey700 }]}>The rooms have not been read on this phone yet. They show once the line is back.</Text>
          <View style={{ flexDirection: "row" }}><Capsule label="Try again" onPress={board.reload} /></View>
        </Card>
      ) : <ReadFailed what="the rooms" error={board.error} onRetry={board.reload} />;
  } else if (shown.length === 0) {
    const owner = staff.find((p) => p.id === (sheet === "mine" ? me : sheet))?.name;
    const [title, line] = sheet === "all" ? ["No rooms set up yet", "Once the property's rooms are added, each one shows here with what it needs."]
      : sheet === "unassigned" ? ["Every room is on somebody's sheet", "Nothing is left unassigned."]
        : [owner ? `No rooms on ${owner}'s sheet yet` : "No rooms on this sheet yet", "Give them rooms from each room's card, or look at every room."];
    body = (
      <Card style={{ alignItems: "center", gap: 8, paddingVertical: 24 }}>
        <IconChip icon={SprayCan} />
        <Text style={[t.heading, { textAlign: "center" }]}>{title}</Text>
        <Text style={[t.label, { textAlign: "center" }]}>{line}</Text>
        {sheet !== "all" ? <Capsule label="Show all rooms" onPress={() => setSheet("all")} /> : null}
      </Card>
    );
  } else {
    body = GROUPS.filter((g) => inGroup(shown, g.key).length > 0).map((g, i) => {
      const inIt = inGroup(shown, g.key);
      return (
        <View
          key={g.key} style={{ gap: 10, marginTop: i === 0 ? 8 : 12 }}
          onLayout={(e) => { groupAt.current[g.key] = e.nativeEvent.layout.y; }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <Text style={t.heading} accessibilityRole="header">{g.label}</Text>
            <Pill tone={TONE[g.key]!}>{String(inIt.length)}</Pill>
          </View>
          {inIt.map((room) => {
            const pending = heldMark(held, code, room.number);
            const heldWho = heldAssignee(held, code, room.number);
            const who = assignee(room.number);
            return (
              <RoomCard
                key={room.number} code={code} room={room} role={role} pending={pending}
                who={sheetReason ? DASH : who ? nameOf(who) : "Unassigned"}
                queuedWho={heldWho === undefined ? null : heldWho ? `Queued: give to ${nameOf(heldWho)}` : "Queued: unassigned"}
                assignReason={assignReason}
                onMark={(state) => void mark(room.number, state)}
                onPick={() => setPicking(room.number)}
              />
            );
          })}
        </View>
      );
    });
  }

  const count = (x: Sheet) => (x !== "all" && sheetReason ? DASH : String(onSheet(rooms, x, assignee, me).length));
  const current = picking ? assignee(picking) : null;
  const pick = (x: Sheet) => { setChipSaid(null); setSheet(x); };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scroller}
        style={{ backgroundColor: c.grey50 }}
        contentContainerStyle={{ paddingTop: 16, paddingHorizontal: space.side, paddingBottom: 40, gap: space.card }}
        refreshControl={<RefreshControl refreshing={pulled && board.loading} onRefresh={() => { setPulled(true); board.reload(); }} tintColor={c.orange} colors={[c.orange]} />}
      >
        <Head
          title="Housekeeping"
          under="Tap a room to move it on. Clean, then inspected."
          action={(
            <View style={{ gap: 8 }}>
              {onBack ? <Capsule label="Back" icon={<ChevronLeft size={16} color={c.grey700} />} onPress={onBack} /> : null}
              {onSignOut ? <Capsule label="Sign out" onPress={onSignOut} /> : null}
            </View>
          )}
        />
        {/* Connectivity, the shared answer rather than the OS's optimism. */}
        <View style={{ flexDirection: "row", marginBottom: 8 }}>
          <View
            accessibilityLiveRegion="polite"
            style={{
              height: 28, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 6,
              backgroundColor: online ? more.success50 : c.yellow50, borderColor: online ? more.success100 : c.yellow100,
            }}
          >
            {online ? <RefreshCw size={14} color={c.success600} /> : <CloudOff size={14} color={c.yellow800} />}
            <Text style={[t.caption, { color: online ? c.success600 : c.yellow800, ...face[600] }]}>{online ? "Online" : "Offline"}</Text>
          </View>
        </View>

        {data && board.error ? (
          <Text style={[t.caption, { color: !online ? c.yellow800 : c.red700 }]} accessibilityRole="alert">
            {!online ? "No connection. Showing the rooms as last read; pull down to read again."
              : `Could not read the rooms again: ${board.error} Showing what was last read.`}
          </Text>
        ) : null}

        {notes.length ? (
          <Card style={{ gap: 6, backgroundColor: c.grey50 }}>
            {notes.map((n) => <Text key={n} style={t.caption}>{n}</Text>)}
          </Card>
        ) : null}

        {rooms.length > 0 ? <BoardHead rooms={rooms} onJump={jump} /> : null}

        {/* Whose sheet. Scrolls sideways rather than wrapping into a block that pushes the rooms off the screen. */}
        {staff.length > 0 ? (
          <View style={{ gap: 6, marginTop: 10 }}>
            <View style={{ marginHorizontal: -space.side }}>
              <ScrollView
                horizontal showsHorizontalScrollIndicator={false} accessibilityLabel="Whose rooms"
                contentContainerStyle={{ paddingHorizontal: space.side, gap: 8 }}
              >
                <Chip label="All rooms" count={count("all")} active={sheet === "all"} reason={null} onPress={() => pick("all")} onRefused={setChipSaid} />
                {staff.map((p) => (
                  <Chip
                    key={p.id} label={p.name} count={count(p.id)} active={sheet === p.id || (sheet === "mine" && p.id === me)}
                    reason={sheetReason} onPress={() => pick(p.id)} onRefused={setChipSaid}
                  />
                ))}
                <Chip label="Unassigned" count={count("unassigned")} active={sheet === "unassigned"} reason={sheetReason} onPress={() => pick("unassigned")} onRefused={setChipSaid} />
              </ScrollView>
              <Fade id="sheets-fade" color={c.grey50} width={24} />
            </View>
            {chipSaid ? <Text style={t.label} accessibilityLiveRegion="polite">{chipSaid}</Text> : null}
          </View>
        ) : null}

        {body}
      </ScrollView>

      {said ? (
        <Pressable
          onPress={() => setSaid(null)} accessibilityLiveRegion="polite" accessibilityRole={said.tone === "bad" ? "alert" : "text"}
          style={{
            position: "absolute", left: space.side, right: space.side, bottom: 16, borderRadius: 12, borderWidth: 1,
            paddingHorizontal: space.cardX, paddingVertical: 12, gap: 2, ...SAID[said.tone].box,
          }}
        >
          <Text style={[t.label, { ...face[600], color: SAID[said.tone].fg }]}>{said.title}</Text>
          {said.body ? <Text style={[t.caption, { color: SAID[said.tone].fg }]}>{said.body}</Text> : null}
        </Pressable>
      ) : null}

      {/* Who is cleaning it: the web's native select, as a sheet from the bottom. */}
      <Modal visible={picking != null} transparent animationType="fade" onRequestClose={() => setPicking(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(3,23,40,0.4)" }}>
          <Pressable style={{ flex: 1 }} onPress={() => setPicking(null)} accessibilityRole="button" accessibilityLabel="Close" />
          <View style={{ backgroundColor: c.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: space.side, paddingTop: 16, paddingBottom: 24, gap: 4, maxHeight: "75%" }}>
            <Text style={[t.heading, { marginBottom: 4 }]} accessibilityRole="header">Who is cleaning room {picking}</Text>
            <ScrollView>
              {[{ id: null as string | null, name: "Unassigned" }, ...staff].map((p) => (
                <Pressable
                  key={p.id ?? "none"} onPress={() => void give(picking!, p.id)}
                  accessibilityRole="button" accessibilityLabel={p.name} accessibilityState={{ selected: current === p.id }}
                  style={({ pressed }) => ({ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: c.grey100, backgroundColor: pressed ? c.grey50 : c.white })}
                >
                  <Text style={[t.label, { flex: 1, color: p.id ? c.ink900 : c.grey500 }]}>{p.name}</Text>
                  {current === p.id ? <Check size={18} color={c.orange} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const SAID = {
  ok: { box: { backgroundColor: c.ink900, borderColor: c.ink900 }, fg: c.white },
  held: { box: { backgroundColor: c.yellow50, borderColor: c.yellow100 }, fg: c.yellow800 },
  bad: { box: { backgroundColor: c.red50, borderColor: c.red100 }, fg: c.red700 },
};

/* The kit's StatusPill: bg, words, dot. */
const PILL = {
  warning: [c.yellow50, c.yellow800, more.yellow],
  info: [c.info50, c.info, c.info],
  success: [more.success50, c.success600, more.success],
  neutral: [c.grey100, c.grey600, more.grey400],
  danger: [c.red50, c.red700, more.redDot],
} as const;
const TONE: Record<string, keyof typeof PILL> = { dirty: "warning", clean: "info", inspected: "success", occupied: "neutral", "out-of-service": "danger" };
function Pill({ tone, children }: { tone: keyof typeof PILL; children: string }) {
  const [bg, fg, dot] = PILL[tone];
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: bg, flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot }} />
      <Text style={[t.caption, t.tab, { color: fg }]}>{children}</Text>
    </View>
  );
}

/* The board's head (the owner, 27 September): the navy anchor is how many
   empty rooms are ready; the six counts are the board's own groups with Due
   out, and the warm tiles are today's jobs while there are some. */
function BoardHead({ rooms, onJump }: { rooms: BoardRoom[]; onJump: (group: string) => void }) {
  const { dirty, clean, inspected, out, empty, ready, inHouse, dueOut } = boardHead(rooms);
  const of = (x: number) => <Text>{x}<Text style={{ color: more.navy55 }}>/{empty}</Text></Text>;
  return (
    <View style={{ gap: space.card }}>
      <View style={[s.navy, { gap: 12 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <IconChip icon={DoorOpen} tone="glass" />
          <Text style={[t.label, { color: c.onNavy }]}>Empty rooms</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Ring value={empty ? ready / empty : null} color={c.white} track={c.navyTrack} />
          <View>
            <Text style={[t.lead, { color: c.white }]}>{of(ready)}</Text>
            <Text style={[t.caption, { color: more.navy55, marginTop: 2 }]}>clean</Text>
          </View>
        </View>
        <View style={{ gap: 12 }}>
          <AnchorGauge label="Clean" value={of(ready)} fraction={empty ? ready / empty : 0} />
          <AnchorGauge label="Inspected" value={of(inspected)} fraction={empty ? inspected / empty : 0} />
        </View>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <HeadCount icon={SprayCan} chip={dirty ? "neutral" : "green"} label="Needs cleaning" n={dirty} job={dirty > 0 ? "orange" : undefined} goodAtZero onPress={() => onJump("dirty")} />
        <HeadCount icon={Sparkle} chip="blue" label="Clean" n={clean} onPress={() => onJump("clean")} />
        <HeadCount icon={Check} label="Inspected" n={inspected} onPress={() => onJump("inspected")} />
        <HeadCount icon={Users} label="In house" n={inHouse} onPress={() => onJump("occupied")} />
        {/* No group of its own on this board, so it stays flat. */}
        <HeadCount icon={LogOut} chip="yellow" label="Due out" n={dueOut} job={dueOut > 0 ? "yellow" : undefined} />
        <HeadCount icon={Wrench} label="Out of service" n={out} warn={out > 0} onPress={() => onJump("out-of-service")} />
      </View>
    </View>
  );
}

/* A count that jumps to its group has an arrow and presses (the Tappable
   Rule, D27-54). A zero has no group to jump to, so it stays flat. */
function HeadCount({ icon, chip = "neutral", label, n, job, warn, goodAtZero, onPress }: {
  icon: LucideIcon; chip?: ChipTone; label: string; n: number;
  job?: "orange" | "yellow"; warn?: boolean; goodAtZero?: boolean; onPress?: () => void;
}) {
  const tappable = !!onPress && n > 0;
  const good = goodAtZero && n === 0;
  return (
    <Pressable
      disabled={!tappable} onPress={onPress}
      accessibilityRole={tappable ? "button" : undefined} accessibilityLabel={`${label}, ${n}`}
      style={({ pressed }) => ({
        flexBasis: "47%", flexGrow: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 4,
        backgroundColor: job === "orange" ? c.orange50 : job === "yellow" ? c.yellow50 : pressed ? c.grey50 : c.white,
        borderColor: job === "orange" ? c.orange100 : job === "yellow" ? c.yellow100 : c.grey200,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <IconChip icon={icon} tone={chip} size={24} />
        <Text style={[t.figure, { lineHeight: 24 }, warn || job === "orange" ? { color: c.orange700 } : good && { color: c.success600 }]}>{n}</Text>
        {good ? <Check size={14} color={c.success600} /> : null}
        {tappable ? <View style={{ marginLeft: "auto" }}><ChevronRight size={16} color={more.grey400} /></View> : null}
      </View>
      <Text style={[t.label, { lineHeight: 18 }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function RoomCard({ code, room, role, pending, who, queuedWho, assignReason, onMark, onPick }: {
  code: string; room: BoardRoom; role: string | null; pending: string | null; who: string; queuedWho: string | null;
  assignReason: string | null; onMark: (state: "clean" | "inspected") => void; onPick: () => void;
}) {
  const n = room.number;
  const effective = pending ?? room.housekeeping;
  const blocked = room.housekeeping === "out-of-service";
  /* The reason a grey button gave goes when the room moves on (the web's). */
  const [said, setSaid] = useState<string | null>(null);
  useEffect(() => setSaid(null), [effective]);
  const open = (screen: "repair" | "out-of-service") => router.push(`/housekeeping/${code}/${screen}?room=${n}`);
  const putBack = whyNotBlock(role);

  return (
    <Card style={[{ gap: 8, paddingHorizontal: 14, paddingVertical: 12 }, pending != null ? { backgroundColor: c.yellow50, borderColor: more.yellow }
      : room.dueOut ? { backgroundColor: c.yellow50, borderColor: c.yellow100 } : null]}>
      <View>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <Text style={t.figure}>{n}</Text>
          <Text style={[t.label, { color: c.grey500 }]}>{room.type}</Text>
          {room.dueOut ? <Pill tone="warning">Due out</Pill> : null}
          {room.occupied && !blocked ? <BedDouble size={14} color={more.grey400} accessibilityLabel="Guest in the room" /> : null}
        </View>
        <Text style={[t.label, { color: c.grey500, marginTop: 4 }]} numberOfLines={1}>
          {room.occupied ? room.guest ?? "In house" : `Floor ${room.floor}`}
        </Text>
        {pending != null ? <Text style={[t.caption, { color: c.yellow800, marginTop: 4 }]}>Queued: mark {pending}</Text> : null}
      </View>

      <Pressable
        onPress={() => (assignReason ? setSaid(assignReason) : onPick())}
        accessibilityRole="button" accessibilityLabel={`Who is cleaning room ${n}: ${who}`}
        accessibilityState={{ disabled: assignReason != null }} accessibilityHint={assignReason ?? undefined}
        style={{
          minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, borderRadius: 10,
          borderWidth: 1, borderColor: assignReason ? c.grey100 : c.grey300, backgroundColor: assignReason ? c.grey100 : c.white,
        }}
      >
        <UserRound size={16} color={who === "Unassigned" ? c.grey500 : c.grey600} />
        <Text style={[t.label, { flex: 1, color: who === "Unassigned" || assignReason ? c.grey500 : c.ink900 }]} numberOfLines={1}>{who}</Text>
        <ChevronDown size={16} color={c.grey500} />
      </Pressable>
      {queuedWho ? <Text style={[t.caption, { color: c.yellow800 }]}>{queuedWho}</Text> : null}

      {blocked ? (
        /* What it does (the owner, 17 September): opens what is out, with Put back on it. */
        <Pressable
          onPress={() => (putBack ? setSaid(putBack) : open("out-of-service"))}
          accessibilityRole="button" accessibilityLabel={`Put room ${n} back`} accessibilityState={{ disabled: putBack != null }} accessibilityHint={putBack ?? undefined}
          style={({ pressed }) => ({
            minHeight: 44, marginTop: 4, borderRadius: 999, borderWidth: 1, borderColor: c.grey300, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
            backgroundColor: putBack ? c.grey100 : pressed ? c.red50 : c.white,
          })}
        >
          <RotateCcw size={16} color={putBack ? c.grey300 : c.red700} />
          <Text style={[t.label, { color: putBack ? c.grey500 : c.red700 }]}>Put back</Text>
        </Pressable>
      ) : (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
          <Act label="Clean" Icon={Sparkle} a11y={`Mark room ${n} clean`} reason={whyNotClean(role, n, effective, pending != null)}
            onPress={() => onMark("clean")} onRefused={setSaid} />
          <Act label="Inspected" Icon={Check} a11y={`Mark room ${n} inspected`} reason={whyNotInspected(role, n, effective, pending != null)}
            onPress={() => onMark("inspected")} onRefused={setSaid} />
          {/* Out of service is a second choice inside it: a dripping tap does not cost a night's sale. */}
          <Act label="Repair" Icon={Wrench} a11y={`Report a repair in room ${n}`} reason={whyNotOpenRepair(role)} onPress={() => open("repair")} onRefused={setSaid} />
        </View>
      )}
      {said ? <Text style={[t.label, { color: c.grey500 }]} accessibilityLiveRegion="polite">{said}</Text> : null}
    </Card>
  );
}

/** One of the card's buttons, its icon over its word. NOT `disabled`: a
    disabled button swallows the tap, and the tap is when a person asks
    why (the web's MarkButton). */
function Act({ label, Icon, a11y, reason, onPress, onRefused }: {
  label: string; Icon: LucideIcon; a11y: string; reason: string | null; onPress: () => void; onRefused: (reason: string) => void;
}) {
  const ready = reason == null;
  return (
    <Pressable
      onPress={() => (ready ? onPress() : onRefused(reason))}
      accessibilityRole="button" accessibilityLabel={a11y} accessibilityState={{ disabled: !ready }} accessibilityHint={reason ?? undefined}
      style={({ pressed }) => ({
        flex: 1, minHeight: 56, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 4,
        borderColor: ready ? c.grey300 : "transparent", backgroundColor: !ready ? c.grey100 : pressed ? c.grey50 : c.white,
      })}
    >
      <Icon size={20} color={ready ? c.ink900 : c.grey300} />
      <Text style={[t.label, { color: ready ? c.ink900 : c.grey500 }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

/** One sheet, with how many rooms are on it (the web's SheetChip). */
function Chip({ label, count, active, reason, onPress, onRefused }: {
  label: string; count: string; active: boolean; reason: string | null; onPress: () => void; onRefused: (reason: string) => void;
}) {
  return (
    <Pressable
      onPress={() => (reason ? onRefused(reason) : onPress())}
      accessibilityRole="button" accessibilityLabel={`${label}, ${count}`} accessibilityState={{ selected: active, disabled: reason != null }}
      accessibilityHint={reason ?? undefined}
      style={{
        minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 8,
        borderColor: active ? c.ink900 : c.grey300, backgroundColor: active ? c.ink900 : reason ? c.grey100 : c.white,
      }}
    >
      <Text style={[t.label, { color: active ? c.white : c.grey700 }]}>{label}</Text>
      <Text style={[t.label, t.tab, { color: active ? "rgba(255,255,255,0.7)" : c.grey500 }]}>{count}</Text>
    </Pressable>
  );
}
