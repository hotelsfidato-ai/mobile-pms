import { router, type Href } from "expo-router";
import { ArrowDown, ArrowUp, ChevronRight, Inbox, ReceiptText, Scale, SearchX } from "lucide-react-native";
import { useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import type { Hotel } from "../../core/api";
import { ExportButtons } from "../../core/Export";
import type { ExportTable } from "../../core/exportDoc";
import { dateLong, DASH } from "../../core/format";
import { c, face, space, t } from "../../core/theme";
import type { Stay } from "../../core/types";
import { Card, Screen, useRead } from "../../core/ui";
import { day, matches, statusOf } from "../front-desk/desk";
import { body, Empty, PageHead, Pill } from "../front-desk/kit";
import { Kept, NotRead } from "../front-desk/StayList";
import { Tile } from "../guests/kit";
import {
  balanceShown, groupBalance, openCounts, openPill, overpaidBanner, overpaidNote, owingNote, PAGE, whyNotReadBills,
} from "./books";
import { readFolios } from "./booksData";
import { More, Note } from "./BooksKit";

/* ══════════════════════════════════════════════════════════════════
   FOLIOS — the web's /h/:code/folios (src/modules/finance/pages/Folios.tsx):
   every account still carrying a balance, in both directions, overpaid
   first; each row opens the stay's own bill (/folio/<code>/<stay id>, the
   web's StayTable with defaultTab "folio"). The groups' master bills under.

   THE THREE TILES' FIGURES ARE THE BROWSER'S SUMS on the web (Outstanding,
   Overpaid, Net position); the server sends none, so the phone draws the
   tiles with their counts and a dash for the figure (MODULE.md, asked of
   the PMS). Every row's balance is the server's, to the paisa.
   ══════════════════════════════════════════════════════════════════ */

type Row = Stay & { balance: number };

export function Folios({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const refusal = whyNotReadBills(role);
  if (refusal) {
    return (
      <Screen refreshing={false} onRefresh={() => undefined}>
        <PageHead title="Folios" />
        <Card style={{ backgroundColor: c.grey50 }}><Text style={[t.label, { color: c.grey700 }]} accessibilityRole="alert">{refusal}</Text></Card>
      </Screen>
    );
  }
  return <Open hotel={hotel} />;
}

const TONE = { owes: c.red700, credit: c.info, settled: c.success600, none: c.grey500 } as const;

function Balance({ b }: { b: number }) {
  const s = balanceShown(b);
  return (
    <Text style={[t.label, t.tab, face[600], { color: TONE[s.tone], textAlign: "right" }]} accessibilityLabel={s.over ? `${s.text} overpaid` : s.text}>
      {s.text}{s.over ? <Text style={[t.caption, { color: c.grey500 }]}> over</Text> : null}
    </Text>
  );
}

function Open({ hotel }: { hotel: Hotel }) {
  const code = hotel.code;
  const q = useRead(() => readFolios(code), ["finance", code, "folios"]);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  const rows = q.data?.rows;
  const groups = q.data?.groups ?? [];
  const counts = openCounts([...(rows ?? []).map((r) => r.balance), ...groups.map((g) => g.balance)]);
  const filtered = (rows ?? []).filter((s) => matches(s, query));
  const pill = q.data ? openPill(counts.open) : null;

  /* The web's StayTable export (D27-383): the rows as shown, the server's balances. */
  const table: ExportTable | null = rows ? {
    title: "Folios",
    subtitle: `${hotel.name} · open on ${dateLong(hotel.businessDate)} · sorted by balance, overpaid first`,
    columns: ["Room", "Guest", "Reference", "Type", "Arrival", "Departure", "Status", "Balance"],
    rows: filtered.map((r) => [r.roomNumber || DASH, r.guest, r.reference, r.roomType, day(r.arrival), day(r.departure), statusOf(r).label, balanceShown(r.balance).text + (r.balance < 0 ? " over" : "")]),
    note: "Each balance as the server sent it. The totals are added up on the website; the server sends none, so none is printed here.",
  } : null;

  return (
    <Screen refreshing={q.loading} onRefresh={q.reload}>
      <PageHead
        title="Folios"
        pill={pill ? <Pill tone={pill.tone}>{pill.label}</Pill> : undefined}
        description="Open folios. A charge is never edited - a wrong posting is reversed, and the reversal is its own line."
      />

      {/* The Figure Rule's three tiles: the counts are the phone's, the figures the browser's sums (a dash here). */}
      <View style={{ gap: space.tile }}>
        <Tile icon={ReceiptText} tone={counts.owing ? "orange" : "neutral"} label="Outstanding" value={DASH} note={q.data ? owingNote(counts.owing) : DASH} />
        <Tile icon={ArrowDown} tone={counts.overpaid ? "blue" : "neutral"} label="Overpaid" value={DASH} note={q.data ? overpaidNote(counts.overpaid) : DASH} />
        <Tile icon={Scale} tone="neutral" label="Net position" value={DASH} note="Owed to the property, less refunds" />
        <Text style={[t.caption, { lineHeight: 17 }]}>The website adds these up in the browser; the server sends no total yet, so the phone shows each bill's own balance below and a dash here.</Text>
      </View>

      {counts.overpaid > 0 ? (
        <Note tone="info" icon={<ArrowDown size={16} color={c.info} style={{ marginTop: 2 }} />} title={overpaidBanner(counts.overpaid)}>
          Money owed outward. Nobody chases these, so they sort first.
        </Note>
      ) : null}

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TextInput
            value={query} onChangeText={(v) => { setQuery(v); setShown(PAGE); }} placeholder="Guest, reference or room…" placeholderTextColor={c.grey400}
            accessibilityLabel="Filter this list" autoCorrect={false} returnKeyType="search"
            style={{ flex: 1, minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, backgroundColor: c.white, paddingHorizontal: 12, fontSize: 16, color: c.ink900, ...face[500] }}
          />
          <Text style={[t.label, t.tab, { color: c.grey500 }]}>{`${filtered.length} of ${(rows ?? []).length}`}</Text>
        </View>

        {!rows ? (
          q.error ? <NotRead what="the open folios" error={q.error} onRetry={q.reload} plural /> : <Text style={t.label}>Reading the open folios…</Text>
        ) : rows.length === 0 ? (
          <Card><Empty title="Every folio is settled" line="Nothing outstanding, and nothing to refund." Icon={Inbox} /></Card>
        ) : filtered.length === 0 ? (
          <Empty title="No matches" line="Nothing matches the current search and filters. Try widening them." Icon={SearchX} />
        ) : (
          filtered.slice(0, shown).map((r) => <FolioCard key={r.id} r={r} onOpen={() => router.push(`/folio/${code}/${r.id}` as Href)} />)
        )}
        {rows && filtered.length > 0 ? <More shown={shown} of={filtered.length} onMore={() => setShown((n) => n + PAGE)} /> : null}
        {rows ? <Kept error={q.error} what="the open folios" /> : null}
      </View>

      {groups.length > 0 ? (
        <View style={{ borderRadius: 8, borderWidth: 1, borderColor: c.grey200, overflow: "hidden", backgroundColor: c.white }}>
          <Text style={[t.eyebrow, { fontSize: 11, backgroundColor: c.grey50, borderBottomWidth: 1, borderBottomColor: c.grey200, paddingHorizontal: space.cardX, paddingVertical: 8 }]}>Group bills</Text>
          {groups.map((g, i) => (
            /* The group's page is not on the phone yet: its name, not a link. */
            <View key={g.groupId} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, minHeight: 44, paddingHorizontal: space.cardX, borderTopWidth: i ? 1 : 0, borderTopColor: c.grey100 }}>
              <Text style={[t.label, body, { color: c.ink900, flexShrink: 1 }]}>{g.group ?? "A group"}</Text>
              <Text style={[t.label, t.tab, g.balance < 0 ? { color: c.info } : { color: c.ink900, ...face[600] }]}>{groupBalance(g.balance)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
        <ArrowUp size={14} color={c.grey500} style={{ marginTop: 2 }} />
        <Text style={[t.caption, { flex: 1, lineHeight: 18 }]}>
          A positive balance is owed by the guest; a negative one is owed to them. Both are real and both print - neither is hidden or shown as zero.
        </Text>
      </View>

      <ExportButtons table={table} />
    </Screen>
  );
}

/** StayTable's phone card: the room and its state, who, the reference, then Type, Arrival, Departure, Balance. */
function FolioCard({ r, onOpen }: { r: Row; onOpen: () => void }) {
  const state = statusOf(r);
  const line = (label: string, value: string) => (
    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
      <Text style={[t.label, body, { color: c.grey500 }]}>{label}</Text>
      <Text style={[t.label, t.tab, { color: label === "Type" ? c.grey600 : c.ink900, textAlign: "right", flexShrink: 1 }]}>{value}</Text>
    </View>
  );
  return (
    <Pressable
      onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${r.roomNumber ? `Room ${r.roomNumber}, ` : ""}${r.guest}, ${state.label}, open the bill`}
      android_ripple={{ color: c.grey200 }}
      style={({ pressed }) => ({
        borderRadius: 12, borderWidth: 1, borderColor: c.grey200, overflow: "hidden", paddingHorizontal: 14, paddingVertical: 12,
        backgroundColor: pressed && Platform.OS === "ios" ? c.grey50 : c.white,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Text style={[t.figure, !r.roomNumber ? { color: c.grey500 } : null]}>{r.roomNumber || DASH}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pill tone={state.tone}>{state.label}</Pill>
          <ChevronRight size={16} color={c.grey400} />
        </View>
      </View>
      <Text numberOfLines={1} style={[t.label, { color: c.ink900, marginTop: 4 }]}>{r.guest}</Text>
      <Text style={[t.caption, t.tab]}>{r.reference}</Text>
      <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.grey100, gap: 4 }}>
        {line("Type", r.roomType)}
        {line("Arrival", day(r.arrival))}
        {line("Departure", day(r.departure))}
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <Text style={[t.label, body, { color: c.grey500 }]}>Balance</Text>
          <Balance b={r.balance} />
        </View>
      </View>
    </Pressable>
  );
}
