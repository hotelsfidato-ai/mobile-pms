import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { AlertTriangle, ArrowLeft, Ban, Check, ChevronLeft, Compass, Flame, Printer } from "lucide-react-native";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AppState, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { api, HeldError, send, type Hotel } from "../../core/api";
import { DASH } from "../../core/format";
import { isOnline, type OutboxEntry } from "../../core/offline";
import { list, subscribe } from "../../core/outbox";
import { c, face, space, t } from "../../core/theme";
import { Capsule, ReadFailed, useRead } from "../../core/ui";
import {
  alarm, byTable, clock, COLUMNS, columnOf, dish, EMPTY_COLUMN, estimate, heldMove, kindShown, maySetUpKots, movePath,
  inColumn, ofKind, plusLine, printingKinds, statusOf, waited, waitNow, where, whyNotMove, working,
  type Column, type KitchenLine, type KotKind, type KotSetup,
} from "./kitchen";
import { whyNotRing } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   THE PASS on a phone — the web's /pos/:code/kitchen as it draws itself
   at phone width (src/modules/pos/pages/Kitchen.tsx; the picture is the
   spec, M-11: .local/pms-shots/all/45-point-of-sale-kitchen.png): the
   dishes the kitchen holds, oldest first, By stage (Ordered · On the fire,
   Start and Ready) or By table (courses in order), All · Kitchen · Bar,
   the wait red at ten minutes and yellow at five, the estimate, a struck
   dish said loudly with the manager's reason, the KOT printer lines, and
   the chef's Start here card (components/app/StartHere.tsx).
   Read every 6 s while on screen and the app is open: the web's rate when
   its live stream is down (Kitchen.tsx 159); the stream comes later.
   A Start or Ready with no connection is HELD (offline.ts "Kitchen").
   Not here (the web's): a test hotel's stripe.
   ══════════════════════════════════════════════════════════════════ */

/** theme.css's full-colour edges and amber, which the phone's theme does
    not carry yet (the kitchen alone draws them). */
const RED = "#e0301e";
const YELLOW = "#ffb600";
const TANGERINE = "#eb8c00";
const TANGERINE_700 = "#a96500";
const INK_800 = "#0b2135";

const BOARD_EVERY_S = 6;
const SETUP_EVERY_S = 30;

/* ponytail: the kind chosen is kept for the app's run; the web keeps it on
   the computer (localStorage "pms.kitchen-kind"). On disk when asked. */
let rememberedKind = "";

type Said = { title: string; body?: string; tone: "ok" | "held" | "bad" };
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
const key = (code: string, part: string) => ["pos", code, "kitchen", part];

export function KitchenBoard({ hotel, role, startHere, tableView, onView, onConsole, onBack, onSignOut }: {
  hotel: Hotel; role: string | null;
  /** The chef's first jobs, until they tap Got it (remembered on the server). */
  startHere: boolean;
  tableView: boolean; onView: (byTable: boolean) => void;
  onConsole: () => void; onBack?: () => void; onSignOut?: () => void;
}) {
  const code = hotel.code;
  const cache = useQueryClient();
  /* Stamped with the moment it was read: the wait ticks from there. */
  const board = useRead(async () => ({
    lines: (await api<{ lines: KitchenLine[] }>(`/api/hotels/${code}/kitchen`)).lines, at: Date.now(),
  }), key(code, "board"));
  /* The phone is never a KOT computer, so it names no device. */
  const setup = useRead(() => api<KotSetup>(`/api/hotels/${code}/till/kot-setup`), key(code, "kot-setup"));
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState<string | null>(null);
  const [said, setSaid] = useState<Said | null>(null);
  const [held, setHeld] = useState<OutboxEntry[]>([]);
  const [chosen, setChosen] = useState(rememberedKind);
  const [pulled, setPulled] = useState(false);
  const [putAway, setPutAway] = useState(false);

  useEffect(() => {
    const read = () => { list().then(setHeld, () => setHeld([])); };
    read();
    return subscribe(read);
  }, []);
  /* One clock: the wait ticks every second, the board is read every 6 s and
     the KOT printers every 30 s (the web's useKotSetup) - only while this
     screen is shown and the app is in front. Back in front: read at once
     (the web's refetchOnWindowFocus). */
  useFocusEffect(useCallback(() => {
    let n = 0;
    const timer = setInterval(() => {
      if (AppState.currentState !== "active") return;
      n += 1;
      setNow(Date.now());
      if (n % BOARD_EVERY_S === 0) void cache.refetchQueries({ queryKey: key(code, "board") }, { cancelRefetch: false });
      if (n % SETUP_EVERY_S === 0) void cache.refetchQueries({ queryKey: key(code, "kot-setup") }, { cancelRefetch: false });
    }, 1000);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void cache.refetchQueries({ queryKey: ["pos", code, "kitchen"] });
    });
    return () => { clearInterval(timer); sub.remove(); };
  }, [cache, code]));
  useEffect(() => { if (!board.loading) setPulled(false); }, [board.loading]);
  useEffect(() => {
    if (!said) return;
    const timer = setTimeout(() => setSaid(null), 6000);
    return () => clearTimeout(timer);
  }, [said]);

  async function move(line: KitchenLine, to: "preparing" | "ready") {
    setBusy(line.id);
    try {
      await send("POST", movePath(code, line.id, to));
      void cache.invalidateQueries({ queryKey: ["pos", code] });
    } catch (e) {
      /* Held is not a failure: it goes when the line is back (the web
         never says it - R-17). Refused: the web's "Not moved", the server's words. */
      setSaid(e instanceof HeldError ? { title: "Saved on this phone", body: e.message, tone: "held" }
        : { title: "Not moved", body: message(e), tone: "bad" });
    } finally {
      setBusy(null);
    }
  }

  /* StartHere.tsx putAway: gone at once, put back if the server says no. */
  async function gotIt() {
    setPutAway(true);
    try {
      await send("PUT", "/api/me/preferences", { startHereDismissed: true });
      /* The web adds "Bring it back any time from your account menu": the phone has none yet. */
      setSaid({ title: "Put away", tone: "ok" });
    } catch (e) {
      setPutAway(false);
      setSaid({ title: "Not remembered", body: message(e), tone: "bad" });
    }
  }

  const kinds = setup.data?.kinds ?? [];
  const kind = kindShown(kinds, chosen);
  const data = board.data;
  const lines = data ? ofKind(data.lines, kind).map((l) => ({ ...l, waitedSeconds: waitNow(l.waitedSeconds, data.at, now) })) : [];
  const offline = !isOnline();
  const moveReason = whyNotMove(role);
  const refresh = () => { setPulled(true); board.reload(); setup.reload(); };
  const refreshControl = <RefreshControl refreshing={pulled && board.loading} onRefresh={refresh} tintColor={c.orange} colors={[c.orange]} />;
  const ticket = (l: KitchenLine, col: Column) => (
    <Ticket
      key={l.id} line={l} action={col.action} busy={busy === l.id} heldTo={heldMove(held, code, l.id)}
      reason={moveReason} onMove={() => void move(l, col.next)}
    />
  );

  let body: ReactNode;
  if (!data) {
    /* POS-4: nothing loaded is not nothing ordered - no columns until the first answer. */
    body = (
      <View style={{ flexGrow: 1, justifyContent: "center", padding: space.side, paddingVertical: 40, backgroundColor: c.grey50 }}>
        {!board.error ? <Text style={[t.heading, { ...face[500], color: c.grey500, textAlign: "center" }]}>Loading the kitchen board…</Text>
          : offline ? (
            <View style={{ borderRadius: 12, borderWidth: 1, backgroundColor: c.yellow50, borderColor: c.yellow100, padding: space.cardX, gap: 8 }}>
              <Text style={[t.heading, { color: c.yellow800 }]}>No connection</Text>
              <Text style={[t.label, { color: c.grey700 }]}>The kitchen board has not been read on this phone yet. It shows once the line is back.</Text>
              <View style={{ flexDirection: "row" }}><Capsule label="Try again" onPress={refresh} /></View>
            </View>
          ) : <ReadFailed what="the kitchen board" error={board.error} onRetry={refresh} />}
      </View>
    );
  } else if (tableView) {
    const cards = byTable(lines);
    body = cards.length === 0 ? (
      <View style={{ flexGrow: 1, justifyContent: "center", paddingVertical: 40, backgroundColor: c.grey50 }}>
        <Text style={[t.heading, { ...face[500], color: c.grey500, textAlign: "center" }]}>Nothing with the kitchen.</Text>
      </View>
    ) : (
      <View style={{ flexGrow: 1, padding: 12, gap: 12, backgroundColor: c.grey50 }}>
        {cards.map((card) => {
          const a = alarm(card.wait);
          return (
            <View key={card.key} style={{ borderRadius: 12, borderWidth: 2, borderColor: edge(a), backgroundColor: c.white, overflow: "hidden" }}>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
                <Text style={[t.heading, { flex: 1 }]} numberOfLines={1} accessibilityRole="header">{card.title}</Text>
                <Text style={t.caption}>{card.orderNo}</Text>
                <Text style={[t.label, t.tab, { ...face[600], color: ink(a) }]}>{waited(card.wait)}</Text>
              </View>
              <View style={{ padding: 10, gap: 12 }}>
                {card.courses.map((course) => (
                  <View key={course.course ?? "none"} style={{ gap: 8 }}>
                    <Text style={[t.caption, { textTransform: "uppercase", letterSpacing: 0.3, paddingHorizontal: 4, marginBottom: -2 }]}>
                      {course.course === null ? "Any time" : `Course ${course.course}`}
                    </Text>
                    {course.lines.map((l) => { const col = columnOf(l); return col ? ticket(l, col) : null; })}
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </View>
    );
  } else {
    /* By stage: the web's two columns side by side. At phone width the web's
       page is one long scroll and the columns grow with it (the picture is
       18000 px tall, both columns running down it), so here too. */
    body = (
      <View style={{ flexGrow: 1, flexDirection: "row", gap: 1, backgroundColor: c.grey300 }}>
        {COLUMNS.map((col) => {
          const mine = inColumn(lines, col.key);
          return (
            <View key={col.key} style={{ flex: 1, minWidth: 0, backgroundColor: c.grey50 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.grey200, backgroundColor: c.white }}>
                <Text style={t.heading} accessibilityRole="header">{col.label}</Text>
                <View style={{ height: 20, paddingHorizontal: 8, borderRadius: 999, backgroundColor: c.grey100, justifyContent: "center" }}>
                  <Text style={[t.caption, t.tab, { ...face[600], color: c.grey600 }]}>{mine.length}</Text>
                </View>
              </View>
              <View style={{ padding: 12, gap: 12 }}>
                {mine.length === 0
                  ? <Text style={[t.label, { color: c.grey500, textAlign: "center", paddingTop: 40, paddingBottom: 40 }]}>{EMPTY_COLUMN[col.key]}</Text>
                  : mine.map((l) => ticket(l, col))}
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.grey100 }}>
      {/* Two rows on a phone (the owner's D27-293): the name, the count and
          Console, then the two choices under them. */}
      <View style={{ backgroundColor: c.white, borderBottomWidth: 1, borderBottomColor: c.grey300, paddingHorizontal: space.side, paddingVertical: 8, gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", columnGap: 16 }}>
          <Flame size={20} color={c.orange} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={t.heading} accessibilityRole="header">Kitchen</Text>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", columnGap: 8 }}>
              {/* A dash until the board has loaded, never "0 dishes working". */}
              <Text style={[t.caption, t.tab]}>{data ? working(lines) : DASH} dishes working</Text>
              {/* The web's amber: not live, on a timer. "not live", not the web's
                  "reconnecting": the phone has no stream to reconnect yet. */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }} accessibilityLabel="Not live: read every 6 seconds">
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: TANGERINE }} />
                <Text style={[t.caption, { color: TANGERINE_700, textTransform: "uppercase", letterSpacing: 0.3 }]}>not live</Text>
              </View>
            </View>
          </View>
          {/* The way to the till, only for somebody who may use it (QA RO-4). */}
          {whyNotRing(role) == null ? <Way label="Console" icon={<ArrowLeft size={16} color={c.ink900} />} onPress={onConsole} /> : null}
          {onBack ? <Way label="Back" icon={<ChevronLeft size={16} color={c.ink900} />} onPress={onBack} /> : null}
          {onSignOut ? <Way label="Sign out" onPress={onSignOut} /> : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Segmented
            label="How the board is laid out" value={tableView ? "table" : "stage"}
            options={[{ id: "stage", name: "By stage" }, { id: "table", name: "By table" }]}
            onChange={(v) => onView(v === "table")}
          />
          {/* All, or one KOT kind (the owner's D27-292), when there are two. */}
          {kinds.length >= 2 ? (
            <Segmented
              label="Which KOTs" value={kind} options={[{ id: "", name: "All" }, ...kinds]}
              onChange={(v) => { rememberedKind = v; setChosen(v); }}
            />
          ) : null}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} refreshControl={refreshControl}>
        <KotLines kinds={kinds} role={role} now={new Date(now)} onSetUp={() => setSaid({ title: "On the website for now", tone: "held" })} />

        {/* A read that failed while the board was up: the tickets stay, and say they are not current. */}
        {data && board.error ? (
          <View accessibilityRole="alert" style={{ marginHorizontal: space.side, marginTop: 12, flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 12, rowGap: 4, borderRadius: 10, borderWidth: 1, borderColor: c.yellow100, backgroundColor: c.yellow50, paddingHorizontal: 14, paddingVertical: 8 }}>
            <AlertTriangle size={16} color={c.yellow800} />
            <Text style={[t.label, { flex: 1, minWidth: 160, color: c.yellow800 }]}>
              Not up to date: {offline ? "no connection" : board.error.replace(/\.$/, "")}. Showing what loaded at {clock(new Date(data.at))}.
            </Text>
            <Pressable onPress={refresh} accessibilityRole="button" accessibilityLabel="Try again" style={{ minHeight: 44, justifyContent: "center" }}>
              <Text style={[t.label, { color: c.yellow800, textDecorationLine: "underline" }]}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {startHere && !putAway ? <StartHere onGotIt={() => void gotIt()} /> : null}

        <View style={{ flexGrow: 1 }}>{body}</View>
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
    </View>
  );
}

const SAID = {
  ok: { box: { backgroundColor: c.ink900, borderColor: c.ink900 }, fg: c.white },
  held: { box: { backgroundColor: c.yellow50, borderColor: c.yellow100 }, fg: c.yellow800 },
  bad: { box: { backgroundColor: c.red50, borderColor: c.red100 }, fg: c.red700 },
};

const edge = (a: "late" | "warm" | null) => (a === "late" ? RED : a === "warm" ? YELLOW : c.grey200);
const ink = (a: "late" | "warm" | null) => (a === "late" ? c.red700 : a === "warm" ? c.yellow800 : c.grey500);

/** The header's way out: the web's Console, 48 px high, ink words. */
function Way({ label, icon, onPress }: { label: string; icon?: ReactNode; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => ({
        height: 48, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: c.grey300, flexDirection: "row",
        alignItems: "center", gap: 8, backgroundColor: pressed ? c.grey50 : c.white,
      })}
    >
      {icon}
      <Text style={[t.label, { color: c.ink900 }]}>{label}</Text>
    </Pressable>
  );
}

/** The kit's segmented control: a grey-100 track, the chosen one white with one small lift. */
function Segmented({ label, value, options, onChange }: {
  label: string; value: string; options: { id: string; name: string }[]; onChange: (id: string) => void;
}) {
  return (
    <View accessibilityLabel={label} style={{ flexDirection: "row", gap: 2, padding: 3, borderRadius: 10, backgroundColor: c.grey100 }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id || "all"} onPress={() => onChange(o.id)} accessibilityRole="button" accessibilityLabel={o.name} accessibilityState={{ selected: on }}
            style={{
              minHeight: 44, paddingHorizontal: 14, borderRadius: 7, justifyContent: "center",
              ...(on ? { backgroundColor: c.white, shadowColor: c.ink900, shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : null),
            }}
          >
            <Text style={[t.label, { color: on ? c.ink900 : c.grey600 }]}>{o.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** One line per KOT kind something prints to (the web's KotStatus). */
function KotLines({ kinds, role, now, onSetUp }: { kinds: KotKind[]; role: string | null; now: Date; onSetUp: () => void }) {
  const shown = printingKinds(kinds);
  if (shown.length === 0) return null;
  return (
    <View style={{ marginHorizontal: space.side, marginTop: 12, gap: 4 }}>
      {shown.map((k) => {
        const s = statusOf(k, now);
        return (
          <View
            key={k.id} accessibilityRole={s.printing ? undefined : "alert"}
            style={{
              flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
              ...(s.printing ? null : { borderWidth: 1, borderColor: c.red100, backgroundColor: c.red50 }),
            }}
          >
            <Printer size={16} color={s.printing ? c.grey600 : c.red700} />
            <Text style={[t.label, { flex: 1, color: s.printing ? c.grey600 : c.red700 }]}>{s.text}</Text>
            {/* The web's link to Restaurant setup: that screen is not on the phone. */}
            {!s.printing && maySetUpKots(role) ? (
              <Pressable
                onPress={onSetUp} accessibilityRole="button" accessibilityLabel="Set up" accessibilityState={{ disabled: true }}
                accessibilityHint="On the website for now" style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Text style={[t.label, { color: c.grey500, textDecorationLine: "underline" }]}>Set up</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/** The chef's card (StartHere.tsx, startHereCards.ts chef), its words. */
function StartHere({ onGotIt }: { onGotIt: () => void }) {
  return (
    <View style={{ paddingHorizontal: space.side, paddingTop: 16, paddingBottom: 4 }} accessibilityLabel="Start here">
      <View style={{ borderRadius: 12, borderWidth: 1, borderColor: c.grey200, backgroundColor: c.white, padding: 16, gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.orange50, alignItems: "center", justifyContent: "center" }}>
            <Compass size={20} color={c.orange700} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={t.heading} accessibilityRole="header">Start here</Text>
            <Text style={[t.label, { marginTop: 2 }]}>Your one screen. Everything waiting for the kitchen is on it.</Text>
          </View>
          <Capsule label="Got it" onPress={onGotIt} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 10, borderWidth: 1, borderColor: c.grey200, padding: 12 }}>
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.grey100, alignItems: "center", justifyContent: "center" }}>
            <Flame size={16} color={c.grey500} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[t.label, { color: c.ink900 }]}>See what is waiting</Text>
            <Text style={[t.label, { marginTop: 2 }]}>Start a dish when you begin it, Ready when it goes out.</Text>
          </View>
          <Text style={[t.caption, { marginTop: 4 }]}>On this screen</Text>
        </View>
      </View>
    </View>
  );
}

/** One dish. Colour carries the wait; a struck one says stop. The button is
    never `disabled`: a grey one says why when tapped (the web's D17-8). */
function Ticket({ line, action, busy, heldTo, reason, onMove }: {
  line: KitchenLine; action: string; busy: boolean; heldTo: "preparing" | "ready" | null; reason: string | null; onMove: () => void;
}) {
  const [why, setWhy] = useState<string | null>(null);
  const heldAs = heldTo === "preparing" ? "Start" : heldTo === "ready" ? "Ready" : null;
  /* A tap already held is not taken twice; the API's refusal comes first. */
  const blocked = reason ?? (heldAs ? `${heldAs} is held on this phone, waiting to sync.` : null);
  useEffect(() => setWhy(null), [line.status, heldTo]);
  const struck = { textDecorationLine: "line-through" as const, color: c.ink900 };

  if (line.cancelled) {
    return (
      <View accessibilityRole="alert" style={{ borderRadius: 12, borderWidth: 2, borderColor: RED, backgroundColor: c.red50, paddingHorizontal: 14, paddingVertical: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ban size={20} color={RED} />
          <Text style={[t.heading, { color: c.red700 }]}>CANCELLED</Text>
        </View>
        <Text style={[t.heading, struck, { ...face[500], marginTop: 6 }]}>{dish(line)}</Text>
        {line.forDish ? <Text style={[t.label, struck]}>for {line.forDish}</Text> : null}
        {(line.plus ?? []).map((p, i) => <Text key={i} style={[t.label, struck]}>{plusLine(p)}</Text>)}
        {/* Said loudly, because the food may already be in a pan. */}
        <Text style={[t.label, { color: c.grey600, marginTop: 4 }]}>{line.orderNo} · stop cooking this</Text>
        {line.cancelReason ? <Text style={[t.label, { color: c.ink900, marginTop: 4 }]}>Why: {line.cancelReason}</Text> : null}
      </View>
    );
  }

  const a = alarm(line.waitedSeconds);
  return (
    <View style={{ borderRadius: 12, borderWidth: 2, borderColor: edge(a), backgroundColor: c.white, paddingHorizontal: 14, paddingVertical: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        {/* Left and right as the web. A long table name wraps here, where the
            web's runs under the wait at this width. */}
        <View style={{ flexShrink: 1, minWidth: 0 }}>
          <Text style={[t.caption, { textTransform: "uppercase", letterSpacing: 0.3 }]}>{where(line)}</Text>
          <Text style={[t.figure, { marginTop: 2, lineHeight: 25 }]}>{dish(line)}</Text>
          {line.forDish ? <Text style={[t.heading, { ...face[500], color: c.grey700, marginTop: 2 }]}>for {line.forDish}</Text> : null}
          {(line.plus ?? []).map((p, i) => <Text key={i} style={[t.heading, { marginTop: 2 }]}>{plusLine(p)}</Text>)}
          {/* A modifier the kitchen must not miss: "no chilli" sent back is a whole plate. */}
          {line.note ? <Text style={[t.heading, { color: c.orange700, marginTop: 4 }]}>{line.note}</Text> : null}
        </View>
        <View style={{ flexShrink: 0, alignItems: "flex-end" }}>
          <Text style={[t.heading, t.tab, { color: ink(a) }]}>{waited(line.waitedSeconds)}</Text>
          {/* A dash when nobody has timed it - never a zero, which would read as instant. */}
          <Text style={[t.caption, t.tab]}>{estimate(line.prepMinutes)}</Text>
        </View>
      </View>
      {heldAs ? <Text style={[t.caption, { color: c.yellow800, marginTop: 8 }]}>Queued: {heldAs}</Text> : null}
      <Pressable
        onPress={() => (busy ? undefined : blocked ? setWhy(blocked) : onMove())}
        accessibilityRole="button" accessibilityLabel={`${action}: ${dish(line)}, ${where(line)}`}
        accessibilityState={{ disabled: blocked != null || busy, busy }} accessibilityHint={blocked ?? undefined}
        style={({ pressed }) => ({
          height: 56, marginTop: 12, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
          backgroundColor: blocked ? c.grey100 : pressed ? INK_800 : c.ink900, opacity: busy ? 0.5 : 1,
        })}
      >
        <Check size={16} color={blocked ? c.grey500 : c.white} />
        <Text style={[t.label, { ...face[600], color: blocked ? c.grey500 : c.white }]}>{action}</Text>
      </Pressable>
      {why ? <Text style={[t.label, { color: c.grey600, marginTop: 8 }]} accessibilityLiveRegion="polite">{why}</Text> : null}
    </View>
  );
}
