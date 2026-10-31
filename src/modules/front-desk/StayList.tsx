import { router, type Href } from "expo-router";
import { AlertTriangle, ChevronRight, CloudOff, Inbox, Search, SearchX, X } from "lucide-react-native";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { isOnline, type OutboxEntry } from "../../core/offline";
import { list, subscribe } from "../../core/outbox";
import { cash } from "../../core/format";
import { c, face, t } from "../../core/theme";
import { Capsule, Card, ReadFailed, useRead } from "../../core/ui";
import { checkInPath, readBlacklist, type DeskStay } from "./data";
import { day, matches, statusOf } from "./desk";
import { body, Button, Empty, Pill } from "./kit";

/* ══════════════════════════════════════════════════════════════════
   THE STAY LIST — the web's StayTable.tsx as a phone always gets it, its
   StayCards: the room and its state, who, the reference, then the page's
   own columns as label-left value-right rows. One list: Arrivals, In
   house, Due out and Walk-ins differ only in rows and columns. A row
   opens the stay (the web's panel, here its own screen).
   ══════════════════════════════════════════════════════════════════ */

export type Column = "type" | "plan" | "source" | "arrival" | "departure" | "nights" | "rate" | "balance";
const HEADER: Record<Column, string> = {
  type: "Type", plan: "Plan", source: "Source", arrival: "Arrival", departure: "Departure", nights: "Nights", rate: "Rate", balance: "Balance",
};

function Value({ s, col }: { s: DeskStay; col: Column }) {
  const plain = [t.label, face[500], { color: c.ink900, textAlign: "right" as const, flexShrink: 1 }];
  switch (col) {
    case "type": return <Text style={[...plain, { color: c.grey600 }]}>{s.roomType}</Text>;
    case "plan": return <Text style={[...plain, { color: c.grey600 }]}>{s.ratePlan}</Text>;
    case "source": return <Text style={[...plain, { color: c.grey600 }]}>{s.source ?? "-"}</Text>;
    case "arrival": return <Text style={[...plain, t.tab]}>{day(s.arrival)}</Text>;
    case "departure": return <Text style={[...plain, t.tab]}>{day(s.departure)}</Text>;
    case "nights": return <Text style={[...plain, t.tab]}>{s.isDayUse ? "Day use" : s.nights}</Text>;
    case "rate": return s.isComplimentary ? <Text style={[...plain, { color: c.grey500 }]}>Comp</Text>
      : <Text style={[...plain, t.tab, face[600]]}>{cash(s.offeredTariff)}</Text>;
    case "balance": {
      if (s.balance === undefined) return <Text style={[...plain, { color: c.grey500 }]}>-</Text>;
      const color = s.balance > 0 ? c.red700 : s.balance < 0 ? c.info : c.success600;
      return (
        <Text style={[...plain, t.tab, face[600], { color }]}>
          {cash(Math.abs(s.balance))}{s.balance < 0 ? <Text style={[t.caption, { color: c.grey500 }]}> over</Text> : null}
        </Text>
      );
    }
  }
}

function StayCard({ s, columns, held, onOpen }: { s: DeskStay; columns: Column[]; held: boolean; onOpen: () => void }) {
  const state = statusOf(s);
  return (
    <Pressable
      onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${s.roomNumber ? `Room ${s.roomNumber}, ` : ""}${s.guest}, ${state.label}`}
      style={({ pressed }) => ({
        borderRadius: 12, borderWidth: 1, borderColor: held ? c.yellow800 : c.grey200, backgroundColor: pressed ? c.grey50 : held ? c.yellow50 : c.white, paddingHorizontal: 14, paddingVertical: 12,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Text style={[t.figure, !s.roomNumber ? { color: c.grey500 } : null]}>{s.roomNumber || "-"}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pill tone={state.tone}>{state.label}</Pill>
          <ChevronRight size={16} color="#9aa2a9" />
        </View>
      </View>
      <Text numberOfLines={1} style={[t.label, { color: c.ink900, marginTop: 4 }]}>{s.guest}</Text>
      <Text style={[t.caption, t.tab]}>{s.reference}</Text>
      {held ? <Text style={[t.caption, { color: c.yellow800, marginTop: 2 }]}>Queued: check in</Text> : null}
      <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.grey100, gap: 4 }}>
        {columns.map((col) => (
          <View key={col} style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <Text style={[t.label, body, { color: c.grey500 }]}>{HEADER[col]}</Text>
            <Value s={s} col={col} />
          </View>
        ))}
      </View>
    </Pressable>
  );
}

/** The held check-ins this phone keeps, to mark their rows (the web's readHeld). */
export function useHeld() {
  const [held, setHeld] = useState<OutboxEntry[]>([]);
  useEffect(() => {
    const read = () => { list().then(setHeld, () => setHeld([])); };
    read();
    return subscribe(read);
  }, []);
  return held;
}
export const isHeldCheckIn = (held: OutboxEntry[], code: string, id: string) =>
  held.some((e) => e.status === "waiting" && e.path === checkInPath(code, id));

export function StayList({ code, rows, read, columns, emptyTitle, emptyLine, what, offerCheckIn, toBill }: {
  code: string;
  rows: DeskStay[] | undefined;
  read: { error: string | undefined; loading: boolean; reload: () => void };
  columns: Column[];
  emptyTitle: string;
  emptyLine: string;
  /** How the screen names the list, for "Could not read …". */
  what: string;
  /** Shown as the stay's action when the row can be checked in (the web's `offerCheckIn`). */
  offerCheckIn?: boolean;
  /** Due out opens on the Bill (the web's `defaultTab="folio"`), for a role with bills. */
  toBill?: boolean;
}) {
  const [query, setQuery] = useState("");
  const held = useHeld();
  const filtered = (rows ?? []).filter((s) => matches(s, query));
  const open = (id: string) => router.push((toBill ? `/folio/${code}/${id}` : `/front-desk/${code}/stay/${id}${offerCheckIn ? "?offer=1" : ""}`) as Href);

  let list: ReactNode;
  if (!rows) {
    list = read.error ? (
      !isOnline() ? (
        <Card style={{ backgroundColor: c.yellow50, borderColor: c.yellow100, gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <CloudOff size={16} color={c.yellow800} />
            <Text style={[t.heading, { color: c.yellow800 }]}>No connection</Text>
          </View>
          <Text style={[t.label, { color: c.grey700 }]}>{`${what[0]!.toUpperCase()}${what.slice(1)} have not been read on this phone yet. They show once the line is back.`}</Text>
          <View style={{ flexDirection: "row" }}><Capsule label="Try again" onPress={read.reload} /></View>
        </Card>
      ) : <ReadFailed what={what} error={read.error} onRetry={read.reload} />
    ) : <Text style={t.label}>{`Reading ${what}…`}</Text>;
  } else if (rows.length === 0) {
    list = <Card><Empty title={emptyTitle} line={emptyLine} Icon={Inbox} /></Card>;
  } else if (filtered.length === 0) {
    list = <Empty title="No matches" line="Nothing matches the current search and filters. Try widening them." Icon={SearchX}
      action={<Button label="Clear filters" size="sm" onPress={() => setQuery("")} />} />;
  } else {
    list = filtered.map((s) => (
      <StayCard key={s.id} s={s} columns={columns} held={isHeldCheckIn(held, code, s.id)} onOpen={() => open(s.id)} />
    ));
  }

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <View style={{ flex: 1, minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: c.grey300, backgroundColor: c.white, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12 }}>
          <Search size={16} color={c.grey500} />
          <TextInput
            value={query} onChangeText={setQuery} placeholder="Guest, reference or room…" placeholderTextColor="#9aa2a9"
            accessibilityLabel="Filter this list" style={{ flex: 1, minHeight: 42, fontSize: 16, color: c.ink900, ...face[500] }}
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} accessibilityRole="button" accessibilityLabel="Clear" hitSlop={12}>
              <X size={16} color={c.grey500} />
            </Pressable>
          ) : null}
        </View>
        <Text style={[t.label, t.tab, { color: c.grey500 }]}>{`${filtered.length} of ${(rows ?? []).length}`}</Text>
      </View>
      {list}
    </View>
  );
}

/** The screens' last word when a re-read fails over rows already shown. */
export function Kept({ error, what }: { error: string | undefined; what: string }) {
  if (!error) return null;
  const off = !isOnline();
  return (
    <Text style={[t.caption, { color: off ? c.yellow800 : c.red700 }]} accessibilityRole="alert">
      {off ? `No connection. Showing ${what} as last read; pull down to read again.` : `Could not read ${what} again: ${error} Showing what was last read.`}
    </Text>
  );
}

/** BookingSiteBlacklist.tsx (CRM-3): this booking's phone or email is a
    blacklisted guest's. Only a warning, never a refusal; only about rows shown. */
export function Blacklist({ code, from, to, ids }: { code: string; from: string; to: string; ids: readonly string[] | undefined }) {
  const found = useRead(() => readBlacklist(code, from, to), ["front-desk", code, "blacklist", from, to]);
  const shown = new Set(ids ?? []);
  const warnings = (found.data ?? []).filter((w) => shown.has(w.stayId));
  if (warnings.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      {warnings.map((w) => (
        <View key={`${w.stayId}-${w.blacklistedName}`} accessibilityRole="alert" style={{ flexDirection: "row", gap: 8, borderRadius: 8, borderWidth: 1, borderColor: c.red100, backgroundColor: c.red50, padding: 12 }}>
          <AlertTriangle size={16} color={c.red700} style={{ marginTop: 2 }} />
          <Text style={[t.label, { flex: 1, color: c.red700 }]}>
            {`${w.guest} (${w.reference}, ${w.source}) has the phone or email of ${w.blacklistedName}, who is blacklisted.`}
            <Text style={body}>{` Reason: ${w.reason ?? "-"}. Check-in is not refused - you decide.`}</Text>
          </Text>
        </View>
      ))}
    </View>
  );
}
