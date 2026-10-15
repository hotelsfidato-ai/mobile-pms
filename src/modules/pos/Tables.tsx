import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { ChevronLeft, ChevronRight, DoorClosed, Eye, LayoutGrid, Printer } from "lucide-react-native";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AppState, Pressable, Text, TextInput, View } from "react-native";
import { api, HeldError, send, type Hotel } from "../../core/api";
import { cash, DASH } from "../../core/format";
import { newKey } from "../../core/offline";
import { c, face, space, t } from "../../core/theme";
import { Capsule, Head, Screen } from "../../core/ui";
import {
  CLOSE_FOR, closedLine, closure, kotLines, LEGEND, LOOK, padHref, READY, tileLabel, tileOffers, type KotKind,
} from "./floor";
import { draftedTables } from "./pad";
import { PrintBill } from "./Pay";
import { whyNotRing } from "./roles";
import type { Floor, FloorTable } from "./types";
import {
  Btn, ReadProblem, Refused, RoundBtn, SaidBar, Sheet, Stale, takeSaid, useAccess, type Said,
} from "./TablesKit";

/* ══════════════════════════════════════════════════════════════════
   TABLES on a phone — the web's /pos/:code/tables (src/modules/pos/
   pages/Floor.tsx, inside PosGate), the waiter's first screen. The room
   as it stands: sections, two tiles across, each answering how long, which
   table, how much. A free table opens the pad; a running one opens it for
   another round; a finished bill offers Clear. Reference: .local/pos-
   reference/01-02. Not here (the web's): the live channel (the 30 s poll
   stands), the "Set up" link on a red KOT line and "Set up tables" (no
   setup screen on the phone).
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
    queryFn: () => api<Floor>(`/api/hotels/${code}/till/floor?outlet=${OUTLET}`),
  });
  const kot = useQuery({
    queryKey: ["pos", code, "tables", "kot"],
    queryFn: () => api<{ kinds: KotKind[] }>(`/api/hotels/${code}/till/kot-setup?device=${DEVICE}`),
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [said, setSaid] = useState<Said | null>(null);
  const [drafted, setDrafted] = useState<Set<string>>(new Set());
  const [closing, setClosing] = useState(false);
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

  const ringReason = whyNotRing(role);
  const outlet = floor.data?.outlet ?? null;
  const { closed, reopens } = closure(outlet);

  /** A write from a tile: the server's sentence on a refusal, held said as held. */
  async function act(id: string, path: string, body: unknown, ok: () => Said | null, failed: string) {
    setBusy(id);
    try {
      await send("POST", path, body);
      const word = ok();
      if (word) setSaid(word);
    } catch (e) {
      setSaid(e instanceof HeldError ? { title: "Saved on this phone", body: e.message, tone: "held" }
        : { title: failed, body: e instanceof Error ? e.message : String(e), tone: "bad" });
    } finally {
      setBusy(null);
      refresh();
    }
  }
  const clear = (tb: FloorTable) => void act(tb.id, `/api/hotels/${code}/till/orders/${tb.orderId}/clear`, undefined,
    () => ({ title: `${tb.label} is free`, tone: "ok" }), "Not cleared");
  /* Every ready dish on the table, taken out at once (D27-222). */
  const take = (tb: FloorTable) => void act(tb.id, `/api/hotels/${code}/till/orders/${tb.orderId}/taken`, { lineIds: tb.readyIds ?? [] },
    () => null, "Not taken");
  /** Refused by the API for this person: the reason, said when tapped (rule 1),
      under the title the web's refusal of that act carries. */
  const refuse = (title: string, why: string) => setSaid({ title, body: why, tone: "bad" });

  const head = (
    <Head
      title="Tables"
      under="The room as it stands. Tap any table to take an order on it - the pad opens here, and nothing reaches the kitchen until you send it."
      action={(
        <View style={{ gap: 8 }}>
          {onBack ? <Capsule label="Back" icon={<ChevronLeft size={16} color={c.grey700} />} onPress={onBack} /> : null}
          {onSignOut ? <Capsule label="Sign out" onPress={onSignOut} /> : null}
        </View>
      )}
    />
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

  const sections = floor.data?.sections ?? [];
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
    body = sections.map((section) => (
      <View key={section.id} style={{ gap: 12, marginTop: 4 }}>
        <Text style={t.heading} accessibilityRole="header">{section.name}</Text>
        {pairs(section.tables).map((row) => (
          <View key={row[0]!.id} style={{ flexDirection: "row", gap: space.tile }}>
            {row.map((tb) => (
              <Tile
                key={tb.id} hotel={hotel} table={tb} closed={closed} busy={busy === tb.id} drafted={drafted.has(tb.label)}
                ringReason={ringReason} onRefused={refuse} onClear={() => clear(tb)} onTake={() => take(tb)} onPrinted={refresh}
              />
            ))}
            {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
          </View>
        ))}
      </View>
    ));
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && floor.isFetching} onRefresh={() => { setPulled(true); refresh(); }}>
        {head}

        {outlet ? (
          <View style={{ flexDirection: "row" }}>
            {closed ? (
              <Btn label={`Reopen ${outlet.name}`} size={44}
                onPress={() => (ringReason ? refuse("Not reopened", ringReason) : void act("outlet", `/api/hotels/${code}/till/outlet/${outlet.code}/closed`, { closed: false },
                  () => ({ title: `${outlet.name} is open`, tone: "ok" }), "Not reopened"))}
                busy={busy === "outlet"} disabled={ringReason != null} hint={ringReason ?? undefined} />
            ) : (
              <Btn label="Close early" size={44} icon={<DoorClosed size={16} color={c.ink900} />}
                onPress={() => { if (ringReason) refuse("Not closed", ringReason); else { setSaid(null); setClosing(true); } }}
                disabled={ringReason != null} hint={ringReason ?? undefined} />
            )}
          </View>
        ) : null}

        {kotLines(kot.data?.kinds ?? []).map((k) => (
          <View
            key={k.id} accessibilityRole={k.printing ? undefined : "alert"}
            style={[{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
              k.printing ? null : { borderWidth: 1, borderColor: c.red100, backgroundColor: c.red50 }]}
          >
            <Printer size={16} color={k.printing ? c.grey600 : c.red700} />
            <Text style={[t.label, { flex: 1, color: k.printing ? c.grey600 : c.red700 }, k.printing ? null : face[600]]}>{k.text}</Text>
          </View>
        ))}

        {closed && outlet ? (
          <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, padding: space.cardX, gap: 2 }}>
            <Text style={[t.label, { color: c.ink900 }]}>{closedLine(outlet, reopens)}</Text>
            <Text style={t.label}>Bills already open can still be settled and printed. New orders are refused until it reopens.</Text>
          </View>
        ) : null}

        {/* The key. */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 16, rowGap: 8 }}>
          {LEGEND.map((l) => (
            <View key={l.state} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 12, height: 12, borderRadius: 4, borderWidth: 1, borderColor: LOOK[l.state].swatch, backgroundColor: LOOK[l.state].fill }} />
              <Text style={[t.caption, { color: c.grey600 }]}>{l.label}</Text>
            </View>
          ))}
        </View>

        {floor.error && floor.data !== undefined ? (
          <Stale error={floor.error} loadedAt={floor.dataUpdatedAt} onRetry={() => void floor.refetch()} />
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
    </View>
  );
}

const pairs = <T,>(list: T[]): T[][] => list.reduce<T[][]>((rows, x, i) => (i % 2 ? rows[rows.length - 1]!.push(x) : rows.push([x]), rows), []);

/** One table. Three things, in the order a person reads them across a room:
    how long, which table, how much (Floor.tsx). */
function Tile({ hotel, table: tb, closed, busy, drafted, ringReason, onRefused, onClear, onTake, onPrinted }: {
  hotel: Hotel; table: FloorTable; closed: boolean; busy: boolean; drafted: boolean; ringReason: string | null;
  onRefused: (title: string, why: string) => void; onClear: () => void; onTake: () => void; onPrinted: () => void;
}) {
  const offer = tileOffers(tb, closed);
  const look = LOOK[tb.state];
  const open = () => (ringReason ? onRefused(tb.label, ringReason) : router.push(padHref(hotel.code, tb)));
  const arrow = offer.tap ? <ChevronRight size={16} color="#9aa2a9" /> : null;
  return (
    <View
      style={{
        flex: 1, minHeight: 96, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: look.fill,
        borderWidth: 1, borderColor: drafted ? c.orange : look.ring, borderStyle: drafted ? "dashed" : "solid",
      }}
    >
      {drafted ? (
        <Text style={[t.caption, { position: "absolute", top: 10, right: 12, fontSize: 11, color: c.orange700 }]}
          accessibilityLabel="A round is on a pad and has not been sent">not sent</Text>
      ) : null}
      <Pressable
        onPress={open} disabled={!offer.tap || busy}
        accessibilityRole="button" accessibilityLabel={tileLabel(tb)} accessibilityState={{ disabled: !offer.tap }}
        accessibilityHint={offer.tap && ringReason ? ringReason : undefined}
        style={({ pressed }) => [{ flex: 1, justifyContent: tb.state === "blank" ? "center" : "flex-start", opacity: pressed ? 0.7 : 1 }]}
      >
        {tb.state === "blank" ? (
          <>
            <Text style={[t.figure, { ...face[500], color: c.grey700 }]}>{tb.label}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
              {tb.seats ? <Text style={[t.label, t.tab, { color: c.grey500 }]}>{tb.seats} seats</Text> : null}
              <View style={{ flex: 1 }} />
              {arrow}
            </View>
          </>
        ) : (
          <>
            <Text style={[t.caption, t.tab, { color: c.grey600 }]}>{tb.minutes ?? DASH} min</Text>
            <Text style={t.figure}>{tb.label}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 4 }}>
              {tb.state === "closed"
                ? <Text style={[t.label, { color: c.grey700 }]}>Closed unpaid</Text>
                : <Text style={[t.heading, t.tab]}>{cash(tb.payable)}</Text>}
              {arrow}
            </View>
          </>
        )}
      </Pressable>

      {offer.ready > 0 ? (
        <Pressable
          onPress={() => (ringReason ? onRefused("Not taken", ringReason) : onTake())} disabled={busy}
          accessibilityRole="button" accessibilityLabel={`Taken: the ${offer.ready} ready at ${tb.label}`}
          accessibilityState={{ disabled: ringReason != null || busy }} accessibilityHint={ringReason ?? undefined}
          style={({ pressed }) => ({
            marginTop: 8, minHeight: 44, borderRadius: 999, borderWidth: 1, borderColor: pressed ? READY.text : READY.ring,
            backgroundColor: READY.fill, alignItems: "center", justifyContent: "center", opacity: busy ? 0.5 : 1,
          })}
        >
          <Text style={[t.label, t.tab, { ...face[600], color: READY.text }]}>{offer.ready} ready</Text>
        </Pressable>
      ) : null}

      {offer.actions === "clear" ? (
        <Btn label="Clear" size={44} a11y={`Clear ${tb.label}`} style={{ marginTop: 8 }} busy={busy}
          onPress={() => (ringReason ? onRefused("Not cleared", ringReason) : onClear())} disabled={ringReason != null} hint={ringReason ?? undefined} />
      ) : offer.actions === "print-open" && tb.orderId ? (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8, alignItems: "center" }}>
          <PrintBill hotel={hotel} orderId={tb.orderId} onPrinted={onPrinted} />
          <RoundBtn a11y={`Open ${tb.label}`} onPress={() => router.push(`/pos/${hotel.code}/order/${tb.orderId}`)}>
            <Eye size={16} color={c.grey600} />
          </RoundBtn>
        </View>
      ) : null}
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
      <View style={{ gap: 6 }}>
        <Text style={[t.label, { color: c.ink900 }]}>Why</Text>
        <TextInput
          value={reason} onChangeText={setReason} placeholder="Power cut" placeholderTextColor={c.grey500} accessibilityLabel="Why"
          style={{ minHeight: 48, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: c.grey300, ...t.label, color: c.ink900 }}
        />
        <Text style={t.caption}>Shown to the waiter who tries to ring an order.</Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {CLOSE_FOR.map((o) => (
          <Btn key={o.key} label={o.label} busy={busy} onPress={() => onClose(o.key, reason)} style={{ flexBasis: "47%", flexGrow: 1 }} />
        ))}
      </View>
    </Sheet>
  );
}
