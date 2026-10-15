import { useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import {
  Ban, BedDouble, Check, ChevronLeft, RotateCcw, Sparkle, UserRound, Wrench, type LucideIcon,
} from "lucide-react-native";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AppState, Modal, Pressable, ScrollView, Text, View } from "react-native";
import type { Room, Stay } from "../../core/types";
import { api, HeldError, send, type Hotel } from "../../core/api";
import { DASH, dateLong } from "../../core/format";
import { isOnline, type OutboxEntry } from "../../core/offline";
import { list, subscribe } from "../../core/outbox";
import { c, face, space, t } from "../../core/theme";
import { Capsule, Card, Head, ReadFailed, Screen, useRead } from "../../core/ui";
import {
  assignPath, boardRooms, firstSheet, GROUPS, heldAssignee, heldMark, inGroup, markPath, onSheet, whyNotClean, whyNotInspected,
  type BoardRoom, type Housekeeper, type HouseNow, type RoomAssignment, type Sheet,
} from "./board";
import { whyNotAssign, whyNotBlock, whyNotRepair } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   THE HOUSEKEEPING BOARD on a phone — the web's /h/:code/housekeeping
   (src/modules/housekeeping/pages/Housekeeping.tsx): the rooms by what
   they need, Mine · All · Unassigned, and on each room Clean, Inspected,
   Repair, Out of service, and who has it. A grey button says why when
   tapped (the owner's D17-8); the API's refusal of the person comes first.
   Held taps show on their card (the web's readHeld); the bar above every
   screen counts them and sends them. Not here (the web's): the head's
   counts and the navy anchor, the live channel (the 30 s floor stands).
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
  const sheet = chosen ?? firstSheet(role, onSheet(rooms, "mine", assignee, me).length);
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
        const s = b?.sheet.data;
        if (!b || !s) return b;
        const assignments = s.assignments.filter((a) => a.room !== n);
        if (staffId) assignments.push({ room: n, staffId, staffName: nameOf(staffId), role: null, note: null });
        return { ...b, sheet: { ...b.sheet, data: { ...s, assignments } } };
      });
      void cache.invalidateQueries({ queryKey: ["housekeeping", code] });
    } catch (e) {
      setSaid(e instanceof HeldError ? { title: "Saved on this phone", body: e.message, tone: "held" }
        : { title: "Not assigned", body: message(e), tone: "bad" });
    }
  }

  const offline = !isOnline();
  const notes = [
    data?.names ? `Guest names and Due out are not shown. ${data.names}` : null,
    sheetReason,
    data?.staff.error ? `Who can be given rooms could not be read. ${data.staff.error}` : null,
  ].filter((x): x is string => x != null);

  let body: ReactNode;
  if (!data) {
    body = !board.error ? <Text style={t.label}>Reading the rooms…</Text>
      : offline ? (
        <Card style={{ backgroundColor: c.yellow50, borderColor: c.yellow100, gap: 8 }}>
          <Text style={[t.heading, { color: c.yellow800 }]}>No connection</Text>
          <Text style={[t.label, { color: c.grey700 }]}>The rooms have not been read on this phone yet. They show once the line is back.</Text>
          <View style={{ flexDirection: "row" }}><Capsule label="Try again" onPress={board.reload} /></View>
        </Card>
      ) : <ReadFailed what="the rooms" error={board.error} onRetry={board.reload} />;
  } else if (shown.length === 0) {
    const [title, line] = sheet === "all" ? ["No rooms set up yet", "Once the property's rooms are added, each one shows here with what it needs."]
      : sheet === "unassigned" ? ["Every room is on somebody's sheet", "Nothing is left unassigned."]
        : ["No rooms on this sheet yet", "Give them rooms from each room's card, or look at every room."];
    body = (
      <Card style={{ gap: 8 }}>
        <Text style={t.heading}>{title}</Text>
        <Text style={t.label}>{line}</Text>
        {sheet !== "all" ? <View style={{ flexDirection: "row" }}><Capsule label="Show all rooms" onPress={() => setSheet("all")} /></View> : null}
      </Card>
    );
  } else {
    body = GROUPS.map((g) => {
      const inIt = inGroup(shown, g.key);
      if (inIt.length === 0) return null;
      return (
        <View key={g.key} style={{ gap: space.tile }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
            <Text style={t.heading} accessibilityRole="header">{g.label}</Text>
            <Pill tone={g.key}>{String(inIt.length)}</Pill>
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

  const count = (s: Sheet) => (s !== "all" && sheetReason ? DASH : String(onSheet(rooms, s, assignee, me).length));
  const current = picking ? assignee(picking) : null;

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && board.loading} onRefresh={() => { setPulled(true); board.reload(); }}>
        <Head
          eyebrow={`Business date · ${dateLong(date)}`}
          title="Housekeeping"
          under={`${hotel.name} · Tap a room to move it on. Clean, then inspected.`}
          action={(
            <View style={{ gap: 8 }}>
              {onBack ? <Capsule label="Back" icon={<ChevronLeft size={16} color={c.grey700} />} onPress={onBack} /> : null}
              {onSignOut ? <Capsule label="Sign out" onPress={onSignOut} /> : null}
            </View>
          )}
        />

        {data && board.error ? (
          <Text style={[t.caption, { color: offline ? c.yellow800 : c.red700 }]} accessibilityRole="alert">
            {offline ? "No connection. Showing the rooms as last read; pull down to read again."
              : `Could not read the rooms again: ${board.error} Showing what was last read.`}
          </Text>
        ) : null}

        {notes.length ? (
          <Card style={{ gap: 6, backgroundColor: c.grey50 }}>
            {notes.map((n) => <Text key={n} style={t.caption}>{n}</Text>)}
          </Card>
        ) : null}

        {data ? (
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }} accessibilityLabel="Whose rooms">
              {(["mine", "all", "unassigned"] as const).map((s) => (
                <Chip
                  key={s} label={s === "mine" ? "Mine" : s === "all" ? "All" : "Unassigned"} count={count(s)} active={sheet === s}
                  reason={s === "all" ? null : sheetReason}
                  onPress={() => { setChipSaid(null); setSheet(s); }} onRefused={setChipSaid}
                />
              ))}
            </View>
            {chipSaid ? <Text style={t.label} accessibilityLiveRegion="polite">{chipSaid}</Text> : null}
          </View>
        ) : null}

        {body}
      </Screen>

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

const PILL: Record<string, [string, string]> = {
  dirty: [c.yellow100, c.yellow800],
  clean: [c.info100, c.info],
  inspected: [c.grey100, c.success600],
  occupied: [c.grey100, c.grey700],
  "out-of-service": [c.red50, c.red700],
  "due-out": [c.yellow100, c.yellow800],
};
function Pill({ tone, children }: { tone: string; children: string }) {
  const [bg, fg] = PILL[tone] ?? [c.grey100, c.grey700];
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: bg }}>
      <Text style={[t.caption, t.tab, { color: fg, ...face[600] }]}>{children}</Text>
    </View>
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

  return (
    <Card style={[{ gap: 8 }, pending != null ? { backgroundColor: c.yellow50, borderColor: c.yellow800 }
      : room.dueOut ? { backgroundColor: c.yellow50, borderColor: c.yellow100 } : null]}>
      <View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Text style={[t.figure, { letterSpacing: -0.4 }]}>{n}</Text>
          <Text style={[t.label, { color: c.grey500 }]}>{room.type}</Text>
          {room.dueOut ? <Pill tone="due-out">Due out</Pill> : null}
          {room.occupied && !blocked ? <BedDouble size={14} color={c.grey500} accessibilityLabel="Guest in the room" /> : null}
        </View>
        <Text style={[t.label, { color: c.grey500, marginTop: 2 }]} numberOfLines={1}>
          {room.occupied ? room.guest ?? "In house" : `Floor ${room.floor}`}
        </Text>
        {pending != null ? <Text style={[t.caption, { color: c.yellow800, marginTop: 2 }]}>Queued: mark {pending}</Text> : null}
      </View>

      <Pressable
        onPress={() => (assignReason ? setSaid(assignReason) : onPick())}
        accessibilityRole="button" accessibilityLabel={`Who is cleaning room ${n}: ${who}`}
        accessibilityState={{ disabled: assignReason != null }} accessibilityHint={assignReason ?? undefined}
        style={{
          minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, borderRadius: 8,
          borderWidth: 1, borderColor: assignReason ? c.grey100 : c.grey300, backgroundColor: assignReason ? c.grey100 : c.white,
        }}
      >
        <UserRound size={16} color={c.grey600} />
        <Text style={[t.label, { flex: 1, color: who === "Unassigned" || assignReason ? c.grey500 : c.ink900 }]} numberOfLines={1}>{who}</Text>
      </Pressable>
      {queuedWho ? <Text style={[t.caption, { color: c.yellow800 }]}>{queuedWho}</Text> : null}

      <View style={{ flexDirection: "row", gap: 8 }}>
        {blocked ? (
          <Act label="Put back" Icon={RotateCcw} a11y={`Put room ${n} back`} reason={whyNotBlock(role)} onPress={() => open("out-of-service")} onRefused={setSaid} />
        ) : (
          <>
            <Act label="Clean" Icon={Sparkle} a11y={`Mark room ${n} clean`} reason={whyNotClean(role, n, effective, pending != null)}
              onPress={() => onMark("clean")} onRefused={setSaid} />
            <Act label="Inspected" Icon={Check} a11y={`Mark room ${n} inspected`} reason={whyNotInspected(role, n, effective, pending != null)}
              onPress={() => onMark("inspected")} onRefused={setSaid} />
            <Act label="Repair" Icon={Wrench} a11y={`Report a repair in room ${n}`} reason={whyNotRepair(role)} onPress={() => open("repair")} onRefused={setSaid} />
            <Act label="Out of service" Icon={Ban} a11y={`Take room ${n} out of service`} reason={whyNotBlock(role)} onPress={() => open("out-of-service")} onRefused={setSaid} />
          </>
        )}
      </View>
      {said ? <Text style={[t.label, { color: c.grey600 }]} accessibilityLiveRegion="polite">{said}</Text> : null}
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
        flex: 1, minHeight: 56, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 2,
        borderColor: ready ? c.grey300 : c.grey100, backgroundColor: !ready ? c.grey100 : pressed ? c.grey50 : c.white,
      })}
    >
      <Icon size={20} color={ready ? c.ink900 : c.grey300} />
      <Text style={[t.caption, { color: ready ? c.ink900 : c.grey500, textAlign: "center" }]} numberOfLines={2}>{label}</Text>
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
