import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { ChevronLeft, ChevronRight, Compass, DoorClosed, Eye, LayoutGrid, Printer, Receipt, Send, ShoppingBag } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import { ApiError, api, HeldError, send, type Hotel } from "../../core/api";
import { cash, DASH } from "../../core/format";
import { newKey } from "../../core/offline";
import { c, face, space, t } from "../../core/theme";
import { Capsule, Screen } from "../../core/ui";
import {
  CLOSE_FOR, closedLine, closure, kotLines, LEGEND, LOOK, maySetUpKots, openLabel, padHref, parcelTile, READY, startCard, takenLabel, tileLabel, tileOffers,
  type FloorNow, type KotKind, type Tile as Table,
} from "./floor";
import { draftedTables } from "./pad";
import { PrintBill } from "./Pay";
import { whyNotRing } from "./roles";
import type { Order } from "./types";
import {
  Btn, Field, Input, ReadProblem, Refused, RoundBtn, SaidBar, Sheet, Stale, leaveSaid, takeSaid, ty, useAccess, web, type Said,
} from "./TablesKit";

/* ══════════════════════════════════════════════════════════════════
   TABLES on a phone — the web's /pos/:code/tables (src/modules/pos/
   pages/Floor.tsx, inside PosGate), the waiter's first screen, drawn to the
   PMS's own phone picture (M-11: .local/pms-shots/all/42). The room as it
   stands: the open parcels first, then sections, two tiles across, each
   answering how long, which table, how much. A free table opens the pad; a
   running one opens it for another round; a finished bill offers Clear; a
   joined table only its bill. Not here (the web's): the live channel (the
   30 s poll stands), the KOT section and table setup ("Set up" says they are
   on the website; "Set up tables" is not drawn).
   ══════════════════════════════════════════════════════════════════ */

/** The web polls the floor every 30 s; the minutes are the point of a tile. */
const FLOOR_MS = 30_000;
const OUTLET = "REST";
/** This phone's id for the KOT read: it is never a printing computer. */
const DEVICE = newKey();

export function Tables({ hotel, role, onBack, onSignOut }: {
  hotel: Hotel; role: string | null; onBack?: () => void; onSignOut?: () => void;
}) {
  const code = hotel.code;
  const cache = useQueryClient();
  const access = useAccess(code);
  const floor = useQuery({
    queryKey: ["pos", code, "tables", "floor"],
    queryFn: () => api<FloorNow>(`/api/hotels/${code}/till/floor?outlet=${OUTLET}`),
  });
  const kot = useQuery({
    queryKey: ["pos", code, "tables", "kot"],
    queryFn: () => api<{ kinds: KotKind[] }>(`/api/hotels/${code}/till/kot-setup?device=${DEVICE}`),
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [said, setSaid] = useState<Said | null>(null);
  const [drafted, setDrafted] = useState<Set<string>>(new Set());
  const [closing, setClosing] = useState(false);
  const [parcel, setParcel] = useState(false);
  const [pulled, setPulled] = useState(false);

  const refresh = useCallback(() => { void cache.invalidateQueries({ queryKey: ["pos", code] }); }, [cache, code]);
  /* On screen: the word the pad left, the tables with a round on a pad, and the poll. */
  useFocusEffect(useCallback(() => {
    const word = takeSaid();
    if (word) setSaid(word);
    setDrafted(draftedTables(code));
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void cache.refetchQueries({ queryKey: ["pos", code, "tables"] });
    }, FLOOR_MS);
    return () => clearInterval(timer);
  }, [cache, code]));
  useEffect(() => { if (!floor.isFetching) setPulled(false); }, [floor.isFetching]);
  useEffect(() => {
    if (!said) return;
    const timer = setTimeout(() => setSaid(null), 6000);
    return () => clearTimeout(timer);
  }, [said]);

  /* Start here: remembered on the server until "Got it" (migration 089). */
  const card = startCard(role);
  const me = useQuery({
    queryKey: ["pos", code, "tables", "me"],
    queryFn: () => api<{ scope: { startHereDismissed?: boolean } }>("/api/hotels"),
    enabled: card != null,
  });
  async function putAway() {
    const key = ["pos", code, "tables", "me"];
    const was = cache.getQueryData(key);
    /* Gone at once; put back if the server says no. */
    cache.setQueryData(key, { scope: { startHereDismissed: true } });
    try {
      await send("PUT", "/api/me/preferences", { startHereDismissed: true });
      setSaid({ title: "Put away", body: "Bring it back any time from your account menu.", tone: "ok" });
    } catch (e) {
      cache.setQueryData(key, was);
      setSaid({ title: "Not remembered", body: e instanceof Error ? e.message : String(e), tone: "bad" });
    }
  }

  const ringReason = whyNotRing(role);
  const outlet = floor.data?.outlet ?? null;
  const { closed, reopens } = closure(outlet);

  /** A write from a tile: the server's sentence on a refusal, held said as held.
      One write per tile at a time, latched at the tap (MPOS-3). */
  const writing = useRef(new Set<string>());
  async function act(id: string, path: string, body: unknown, ok: () => Said | null, failed: string) {
    if (writing.current.has(id)) return;
    writing.current.add(id);
    setBusy(id);
    try {
      await send("POST", path, body);
      const word = ok();
      if (word) setSaid(word);
    } catch (e) {
      setSaid(e instanceof HeldError ? { title: "Saved on this phone", body: e.message, tone: "held" }
        : { title: failed, body: e instanceof Error ? e.message : String(e), tone: "bad" });
    } finally {
      writing.current.delete(id);
      setBusy(null);
      refresh();
    }
  }
  const clear = (tb: Table) => void act(tb.id, `/api/hotels/${code}/till/orders/${tb.orderId}/clear`, undefined,
    () => ({ title: `${tb.label} is free`, tone: "ok" }), "Not cleared");
  /* Every ready dish on the table, taken out at once (D27-222). */
  const take = (tb: Table) => void act(tb.id, `/api/hotels/${code}/till/orders/${tb.orderId}/taken`, { lineIds: tb.readyIds ?? [] },
    () => null, "Not taken");
  /** Refused by the API for this person: the reason, said when tapped (rule 1),
      under the title the web's refusal of that act carries. */
  const refuse = (title: string, why: string) => setSaid({ title, body: why, tone: "bad" });

  const head = (
    <View style={{ marginBottom: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text style={[t.title, { flex: 1 }]} accessibilityRole="header">Tables</Text>
        {onBack ? <Capsule label="Back" icon={<ChevronLeft size={16} color={c.grey700} />} onPress={onBack} /> : null}
        {onSignOut ? <Capsule label="Sign out" onPress={onSignOut} /> : null}
      </View>
      <Text style={[t.label, ty.sm, { color: c.grey500, marginTop: 2 }]}>
        The room as it stands. Tap any table to take an order on it - the pad opens here, and nothing reaches the kitchen until you send it.
      </Text>
    </View>
  );

  /* PosGate: the till's own answer first, once, for the whole service. */
  if (access.isLoading || (access.data && !access.data.ok)) {
    return (
      <Screen refreshing={false} onRefresh={() => void access.refetch()}>
        {head}
        {access.data && !access.data.ok
          ? <Refused store title="The point of sale is not open to you here" reason={access.data.reason} />
          : <View style={{ height: 160, borderRadius: 12, backgroundColor: c.grey100 }} />}
      </Screen>
    );
  }

  const tile = (tb: Table) => (
    <Tile
      key={tb.id} hotel={hotel} table={tb} closed={closed} busy={busy === tb.id} drafted={drafted.has(tb.label)}
      ringReason={ringReason} onRefused={refuse} onClear={() => clear(tb)} onTake={() => take(tb)} onPrinted={refresh}
    />
  );
  const grid = (tables: Table[]) => pairs(tables).map((row) => (
    <View key={row[0]!.id} style={{ flexDirection: "row", gap: space.tile }}>
      {row.map(tile)}
      {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
    </View>
  ));

  const sections = floor.data?.sections ?? [];
  const parcels = (floor.data?.parcels ?? []).map(parcelTile);
  let body: ReactNode;
  if (floor.isLoading) {
    body = <View style={{ height: 256, borderRadius: 12, backgroundColor: c.grey100 }} accessibilityLabel="Reading the tables" />;
  } else if (floor.data === undefined && floor.error) {
    body = <ReadProblem error={floor.error} what="the tables" onRetry={() => void floor.refetch()} />;
  } else if (sections.length === 0) {
    body = (
      <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, padding: space.cardX, alignItems: "center", gap: 8 }}>
        <LayoutGrid size={24} color={c.grey500} />
        <Text style={[t.heading, { textAlign: "center" }]}>No tables have been laid out yet.</Text>
        <Text style={[t.label, { textAlign: "center" }]}>
          A section is a part of the room - A/C, Non A/C, the bar - and tables sit inside one. Until they exist, an order carries whatever the waiter types.
        </Text>
      </View>
    );
  } else {
    body = sections.map((section, i) => (
      <View key={section.id} style={{ marginBottom: i < sections.length - 1 ? 12 : 0 }}>
        <Text style={[t.heading, ty.md, { marginBottom: 12 }]} accessibilityRole="header">{section.name}</Text>
        <View style={{ gap: space.tile }}>{grid(section.tables)}</View>
      </View>
    ));
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && floor.isFetching} onRefresh={() => { setPulled(true); refresh(); }}>
        {head}

        {outlet ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            {/* A parcel (D27-359): named by its customer, its pad opens at once. */}
            {!closed ? (
              <Btn label="New parcel" icon={<ShoppingBag size={16} color={c.ink900} />}
                onPress={() => { if (ringReason) refuse("Not opened", ringReason); else setParcel(true); }}
                disabled={ringReason != null} hint={ringReason ?? undefined} />
            ) : null}
            {closed ? (
              <Btn label={`Reopen ${outlet.name}`} size="md"
                onPress={() => (ringReason ? refuse("Not reopened", ringReason) : void act("outlet", `/api/hotels/${code}/till/outlet/${outlet.code}/closed`, { closed: false },
                  () => ({ title: `${outlet.name} is open`, tone: "ok" }), "Not reopened"))}
                busy={busy === "outlet"} disabled={ringReason != null} hint={ringReason ?? undefined} />
            ) : (
              <Btn label="Close early" size="md" icon={<DoorClosed size={16} color={c.ink900} />}
                onPress={() => { if (ringReason) refuse("Not closed", ringReason); else { setSaid(null); setClosing(true); } }}
                disabled={ringReason != null} hint={ringReason ?? undefined} />
            )}
          </View>
        ) : null}

        {card && me.data && !me.data.scope.startHereDismissed ? <StartHere card={card} onPutAway={() => void putAway()} /> : null}

        {kot.data && kotLines(kot.data.kinds).length > 0 ? (
          <View style={{ gap: 4, marginBottom: 8 }}>
            {kotLines(kot.data.kinds).map((k) => (
              <View
                key={k.id} accessibilityRole={k.printing ? undefined : "alert"}
                style={[{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
                  k.printing ? null : { borderWidth: 1, borderColor: c.red100, backgroundColor: c.red50 }]}
              >
                <Printer size={16} color={k.printing ? c.grey600 : c.red700} />
                <Text style={[t.label, ty.sm, { flex: 1, color: k.printing ? c.grey600 : c.red700 }]}>{k.text}</Text>
                {!k.printing && maySetUpKots(role) ? (
                  <Pressable
                    onPress={() => setSaid({ title: "Set up", body: "On the website for now", tone: "held" })}
                    accessibilityRole="link" accessibilityHint="On the website for now"
                    style={{ minHeight: 44, marginVertical: -11, justifyContent: "center" }}
                  >
                    <Text style={[t.label, ty.sm, { color: c.red700, textDecorationLine: "underline" }]}>Set up</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {closed && outlet ? (
          <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, padding: space.cardX, gap: 2, marginBottom: 8 }}>
            <Text style={[t.label, ty.sm, { color: c.ink900 }]}>{closedLine(outlet, reopens)}</Text>
            <Text style={[t.label, ty.sm]}>Bills already open can still be settled and printed. New orders are refused until it reopens.</Text>
          </View>
        ) : null}

        {/* The key: a 12px caption, as the Rooms strip's. */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 16, rowGap: 8, marginBottom: 8 }}>
          {LEGEND.map((l) => (
            <View key={l.state} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 12, height: 12, borderRadius: 4, borderWidth: 1, borderColor: LOOK[l.state].swatch, backgroundColor: LOOK[l.state].fill }} />
              <Text style={[t.caption, ty.xs, { color: c.grey600 }]}>{l.label}</Text>
            </View>
          ))}
        </View>

        {floor.error && floor.data !== undefined ? (
          <Stale error={floor.error} loadedAt={floor.dataUpdatedAt} onRetry={() => void floor.refetch()} />
        ) : null}

        {/* The open parcels, above the room (D27-359). */}
        {parcels.length > 0 ? (
          <View style={{ marginBottom: 12 }}>
            <Text style={[t.heading, ty.md, { marginBottom: 12 }]} accessibilityRole="header">Parcels</Text>
            <View style={{ gap: space.tile }}>{grid(parcels)}</View>
          </View>
        ) : null}

        {body}
      </Screen>

      {said ? <SaidBar said={said} onDone={() => setSaid(null)} style={{ position: "absolute", left: space.side, right: space.side, bottom: 16 }} /> : null}

      {outlet ? (
        <CloseOutlet
          open={closing} name={outlet.name} busy={busy === "outlet"} said={said} onCancel={() => setClosing(false)}
          onClose={(until, reason) => void act("outlet", `/api/hotels/${code}/till/outlet/${outlet.code}/closed`, { closed: true, until, reason: reason.trim() },
            () => { setClosing(false); return { title: `${outlet.name} is closed`, body: `Back in ${CLOSE_FOR.find((o) => o.key === until)!.label.toLowerCase()}.`, tone: "ok" }; },
            "Not closed")}
        />
      ) : null}

      {parcel ? (
        <NewParcel
          code={code} onCancel={() => setParcel(false)}
          onHeld={(word) => { setParcel(false); setSaid(word); }}
          onOpened={(order, name) => {
            setParcel(false);
            refresh();
            /* The pad says it, over the screen that asked. */
            leaveSaid({ title: `Parcel for ${name}`, body: "Add the dishes and send them to the kitchen.", tone: "ok" });
            router.push(`/pos/${code}/pad?order=${order.id}&table=${encodeURIComponent(order.table ?? `Parcel · ${name}`)}`);
          }}
        />
      ) : null}
    </View>
  );
}

const pairs = <T,>(list: T[]): T[][] => list.reduce<T[][]>((rows, x, i) => (i % 2 ? rows[rows.length - 1]!.push(x) : rows.push([x]), rows), []);

/** One table. Three things, in the order a person reads them across a room:
    how long, which table, how much (Floor.tsx). */
function Tile({ hotel, table: tb, closed, busy, drafted, ringReason, onRefused, onClear, onTake, onPrinted }: {
  hotel: Hotel; table: Table; closed: boolean; busy: boolean; drafted: boolean; ringReason: string | null;
  onRefused: (title: string, why: string) => void; onClear: () => void; onTake: () => void; onPrinted: () => void;
}) {
  const offer = tileOffers(tb, closed);
  const look = LOOK[tb.state];
  const open = () => (ringReason ? onRefused(tb.label, ringReason) : router.push(padHref(hotel.code, tb)));
  const arrow = offer.tap ? <ChevronRight size={16} color={web.grey400} /> : null;
  const eye = (
    <RoundBtn a11y={openLabel(tb)} onPress={() => router.push(`/pos/${hotel.code}/order/${tb.orderId}`)}>
      <Eye size={16} color={c.grey600} />
    </RoundBtn>
  );
  return (
    <View
      style={{
        flex: 1, minHeight: 96, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: look.fill,
        borderWidth: 1, borderColor: drafted ? c.orange : look.ring, borderStyle: drafted ? "dashed" : "solid",
      }}
    >
      {drafted ? (
        <Text style={[t.caption, ty.xs, { position: "absolute", top: 12, right: 14, color: c.orange700 }]}
          accessibilityLabel="A round is on a pad and has not been sent">not sent</Text>
      ) : null}
      {tb.state === "joined" ? (
        /* JOINED (D27-372): its food is on another table's bill until that bill
           is settled; it takes nothing itself; the eye opens that bill. */
        <>
          <Text style={[t.figure, ty.xl, { ...face[500], color: c.grey700 }]} accessibilityLabel={tileLabel(tb)}>{tb.label}</Text>
          <Text style={[t.label, ty.sm, { color: c.grey700 }]}>Joined to {tb.joinedTo ?? "another table"}</Text>
          <View style={{ flexDirection: "row", marginTop: "auto", paddingTop: 8 }}>{eye}</View>
        </>
      ) : (
        <>
          <Pressable
            onPress={open} disabled={!offer.tap || busy}
            accessibilityRole="button" accessibilityLabel={tileLabel(tb)} accessibilityState={{ disabled: !offer.tap }}
            accessibilityHint={offer.tap && ringReason ? ringReason : undefined}
            style={({ pressed }) => [{ flexGrow: 1, justifyContent: tb.state === "blank" ? "center" : "flex-start", opacity: pressed ? 0.7 : 1 }]}
          >
            {tb.state === "blank" ? (
              <>
                <Text style={[t.figure, ty.xl, { ...face[500], color: c.grey700 }]}>{tb.label}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {tb.seats ? <Text style={[t.label, ty.sm, t.tab, { color: c.grey500 }]}>{tb.seats} seats</Text> : null}
                  <View style={{ flex: 1 }} />
                  {arrow}
                </View>
              </>
            ) : (
              <>
                <Text style={[t.caption, ty.xs, t.tab, { color: c.grey600 }]}>{tb.minutes ?? DASH} min</Text>
                <Text style={[t.figure, ty.xl]}>{tb.parcel ?? tb.label}</Text>
                <View style={{ marginTop: "auto", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  {tb.state === "closed"
                    ? <Text style={[t.label, ty.sm, { color: c.grey700 }]}>Closed unpaid</Text>
                    : <Text style={[t.heading, ty.md, t.tab]}>{cash(tb.payable)}</Text>}
                  {arrow}
                </View>
              </>
            )}
          </Pressable>

          {offer.ready > 0 ? (
            <Pressable
              onPress={() => (ringReason ? onRefused("Not taken", ringReason) : onTake())} disabled={busy}
              accessibilityRole="button" accessibilityLabel={takenLabel(tb, offer.ready)}
              accessibilityState={{ disabled: ringReason != null || busy }} accessibilityHint={ringReason ?? undefined}
              style={({ pressed }) => ({
                marginTop: 8, minHeight: 44, borderRadius: 999, borderWidth: 1, borderColor: pressed ? web.success : READY.ring,
                backgroundColor: READY.fill, alignItems: "center", justifyContent: "center", opacity: busy ? 0.5 : 1,
              })}
            >
              <Text style={[t.label, ty.sm, t.tab, { ...face[600], color: READY.text }]}>{offer.ready} ready</Text>
            </Pressable>
          ) : null}

          {offer.actions === "clear" ? (
            <Btn label="Clear" size="sm" a11y={`Clear ${tb.label}`} style={{ marginTop: 8 }} busy={busy}
              onPress={() => (ringReason ? onRefused("Not cleared", ringReason) : onClear())} disabled={ringReason != null} hint={ringReason ?? undefined} />
          ) : offer.actions === "print-open" && tb.orderId ? (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8, alignItems: "center" }}>
              <PrintBill hotel={hotel} orderId={tb.orderId} onPrinted={onPrinted} round />
              {eye}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const JOB_ICONS = [LayoutGrid, Send, Receipt];

/** A person's first jobs, on the screen they land on (StartHere.tsx), until
    they tap Got it. The web's third job links to its Till; on the phone the
    order is reached from a tile, so it is told, not linked. */
function StartHere({ card, onPutAway }: { card: NonNullable<ReturnType<typeof startCard>>; onPutAway: () => void }) {
  return (
    <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, padding: 16, marginBottom: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.orange50, alignItems: "center", justifyContent: "center" }}>
          <Compass size={20} color={c.orange700} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[t.heading, ty.md]} accessibilityRole="header">Start here</Text>
          <Text style={[t.label, ty.sm, { marginTop: 2 }]}>{card.intro}</Text>
        </View>
        <Btn label="Got it" size="sm" onPress={onPutAway} />
      </View>
      <View style={{ marginTop: 16, gap: 6 }}>
        {card.tasks.map((task, i) => {
          const Icon = JOB_ICONS[i]!;
          return (
            <View key={task.job} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 10, borderWidth: 1, borderColor: c.grey200, padding: 12 }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.grey100, alignItems: "center", justifyContent: "center" }}>
                <Icon size={16} color={c.grey500} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[t.label, ty.sm, { color: c.ink900 }]}>{task.job}</Text>
                <Text style={[t.label, { marginTop: 2, lineHeight: 19 }]}>{task.how}</Text>
              </View>
              {task.here ? <Text style={[t.caption, ty.xs, { marginTop: 4 }]}>On this screen</Text> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Closing the outlet early (Floor.tsx CloseOutlet): for how long, and why.
    It refuses NEW orders only; open bills are settled and printed as usual. */
function CloseOutlet({ open, name, busy, said, onCancel, onClose }: {
  open: boolean; name: string; busy: boolean; said: Said | null; onCancel: () => void; onClose: (until: string, reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  useEffect(() => { if (!open) setReason(""); }, [open]);
  return (
    <Sheet
      open={open} onClose={onCancel} title={`Close ${name}`}
      description="New orders are refused. Bills already open are settled and printed as usual."
      footer={(
        <View style={{ gap: 8 }}>
          {/* A refusal is said here: the sheet is over the screen's own line. */}
          {said ? <SaidBar said={said} onDone={() => undefined} /> : null}
          <View style={{ flexDirection: "row", justifyContent: "flex-end" }}><Btn label="Cancel" onPress={onCancel} /></View>
        </View>
      )}
    >
      <Field label="Why" hint="Shown to the waiter who tries to ring an order.">
        <Input value={reason} onChangeText={setReason} placeholder="Power cut" accessibilityLabel="Why" />
      </Field>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {CLOSE_FOR.map((o) => (
          <Btn key={o.key} label={o.label} busy={busy} onPress={() => onClose(o.key, reason)} style={{ flexBasis: "47%", flexGrow: 1 }} />
        ))}
      </View>
    </Sheet>
  );
}

/** A parcel has no table: it is named by its customer, with a phone to call
    when it is ready (components/NewParcel.tsx, D27-359). Held offline it has
    no order yet, so no pad opens: the held bar says it is waiting. */
function NewParcel({ code, onCancel, onHeld, onOpened }: {
  code: string; onCancel: () => void; onHeld: (word: Said) => void; onOpened: (order: Order, name: string) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  /* One parcel per tap: a second tap before the first answer is two orders (MPOS-3). */
  const inFlight = useRef(false);

  async function create() {
    const who = name.trim();
    if (!who) { setProblem("Whose parcel is it? Type the customer's name."); return; }
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const order = await send<Order & { ok: true }>("POST", `/api/hotels/${code}/till/orders`, { outlet: OUTLET, parcel: { name: who, phone: phone.trim() || null } });
      onOpened(order, who);
    } catch (e) {
      if (e instanceof HeldError) onHeld({ title: "Saved on this phone", body: e.message, tone: "held" });
      else setProblem(e instanceof ApiError || e instanceof Error ? e.message : String(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <Sheet
      open onClose={onCancel} title="New parcel" gap={12}
      footer={(
        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
          <Btn label="Cancel" size="md" onPress={onCancel} />
          <Btn label="Open the parcel" size="md" primary busy={busy} onPress={() => void create()} />
        </View>
      )}
    >
      <Field label="Customer's name">
        <Input value={name} onChangeText={setName} maxLength={60} autoFocus accessibilityLabel="Customer's name" />
      </Field>
      <Field label="Phone" hint="To call when it is ready. Not needed.">
        <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" accessibilityLabel="Phone" />
      </Field>
      {problem ? <Text style={[t.label, ty.sm, { color: c.red700 }]} accessibilityRole="alert">{problem}</Text> : null}
    </Sheet>
  );
}
