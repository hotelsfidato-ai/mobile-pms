import { router, type Href } from "expo-router";
import { ChevronRight, ClipboardList, Inbox, LogIn, LogOut, Minus, Plus, Search, SearchX, Users, UserX, X, type LucideIcon } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { Hotel } from "../../core/api";
import { cash, dateLong } from "../../core/format";
import { c, face, space, t } from "../../core/theme";
import { Card, s, Screen, useRead } from "../../core/ui";
import type { DeskStay } from "../front-desk/data";
import { addDays, day, statusOf } from "../front-desk/desk";
import { body, Empty, PageHead, Pill } from "../front-desk/kit";
import { isHeldCheckIn, Kept, NotRead, useHeld } from "../front-desk/StayList";
import { IconChip, type ChipTone } from "../reports/kit";
import { askedOf, countFor, descriptionOf, emptyOf, FILTERS, queryOf, shown, type Chip } from "./bookings";
import { readBook } from "./data";

/* ══════════════════════════════════════════════════════════════════
   ALL BOOKINGS — the web's /h/:code/reservations (src/modules/reservations/
   pages/Reservations.tsx; picture all/12-bookings-all-bookings): where a
   particular booking is, whatever its state. It opens on the bookings
   leaving in the last 90 days and everything ahead (the owner's D27-387,
   2 Nov, after the picture was taken); a search of three letters or more
   asks the server through every booking. The tiles filter on the phone.
   Each card is front desk's StayCard (StayList.tsx), with this page's
   columns; it opens the stay, Check in offered.
   ══════════════════════════════════════════════════════════════════ */

const ICON: Record<string, LucideIcon> = { all: ClipboardList, "due-in": LogIn, "in-house": Users, "checked-out": LogOut, lost: UserX };
const CHIP: Record<Chip, ChipTone> = { neutral: "neutral", orange: "orange", blue: "blue" };

export function AllBookings({ hotel }: { hotel: Hotel }) {
  const code = hotel.code;
  const today = hotel.businessDate;
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [since, setSince] = useState(() => addDays(today, -90));
  const [pulled, setPulled] = useState(false);
  /* The server is asked once the typing stops, three letters or more. */
  const [asked, setAsked] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setAsked(askedOf(search)), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const query = queryOf(asked, since);
  const read = useRead(() => readBook(code, query), ["reservations", code, "book", query]);
  const held = useHeld();
  useEffect(() => { if (!read.loading) setPulled(false); }, [read.loading]);
  const data = read.data;
  const rows = shown(data ?? [], filter, search);
  const searching = search.trim() !== "";
  const empty = emptyOf(searching);

  return (
    <Screen refreshing={pulled && read.loading} onRefresh={() => { setPulled(true); read.reload(); }}>
      <PageHead
        title="All bookings"
        pill={data ? <Pill tone="neutral">{`${data.length} shown`}</Pill> : undefined}
        description={descriptionOf(asked, since, today, dateLong)}
      >
        {/* The search sits in the title row, the filters under it. */}
        <View style={{ gap: 8 }}>
          <Since value={since} max={today} onChange={setSince} />
          <View style={{ minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, backgroundColor: c.white, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12 }}>
            <Search size={16} color={c.grey500} />
            <TextInput
              value={search} onChangeText={setSearch} placeholder="Guest, reference or room" placeholderTextColor={c.grey400}
              accessibilityLabel="Search bookings" style={{ flex: 1, minHeight: 42, fontSize: 16, color: c.ink900, ...face[500] }}
            />
            {search ? (
              <Pressable onPress={() => setSearch("")} accessibilityRole="button" accessibilityLabel="Clear" hitSlop={12}>
                <X size={16} color={c.grey500} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </PageHead>

      {/* The filters: level count tiles, the chosen one navy; not read yet is a dash, never a 0. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.side }} contentContainerStyle={{ paddingHorizontal: space.side, gap: 8 }}
        accessibilityRole="tablist" accessibilityLabel="Filter bookings">
        {FILTERS.map((f) => {
          const on = filter === f.key;
          const n = data ? countFor(data, f) : undefined;
          return (
            <Pressable key={f.key} onPress={() => setFilter(f.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`${f.label}, ${n ?? "not read"}`}
              style={({ pressed }) => ({ minWidth: 116, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 4,
                backgroundColor: on ? c.ink900 : pressed ? c.grey50 : c.white, borderColor: on ? c.ink900 : c.grey200 })}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <IconChip icon={ICON[f.key]!} tone={on ? "glass" : CHIP[f.chip]} size={24} />
                <Text style={[t.figure, { lineHeight: 24, color: on ? c.white : data ? c.ink900 : c.grey500 }]}>{n === undefined ? "-" : n}</Text>
              </View>
              <Text numberOfLines={1} style={[t.label, { lineHeight: 18, color: on ? c.onNavy : c.grey600 }]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Kept error={data ? read.error : undefined} what="the bookings" />
      {data ? <Text style={[t.label, t.tab, { color: c.grey500, textAlign: "right" }]}>{`${rows.length} of ${data.length}`}</Text> : null}
      {!data ? (read.error ? <NotRead what="the bookings" error={read.error} onRetry={read.reload} plural /> : <Text style={t.label}>Reading the bookings…</Text>)
        : rows.length === 0 ? <Card><Empty title={empty.title} line={empty.line} Icon={searching ? SearchX : Inbox} /></Card>
          : rows.map((x) => (
            <BookingCard key={x.id} s={x} held={isHeldCheckIn(held, code, x.id)} onOpen={() => router.push(`/front-desk/${code}/stay/${x.id}?offer=1` as Href)} />
          ))}
    </Screen>
  );
}

/** "Bookings leaving from": a day stepper (M-7), never after the business date (the web's max). */
function Since({ value, max, onChange }: { value: string; max: string; onChange: (d: string) => void }) {
  const atMax = value >= max;
  const step = (Icon: LucideIcon, a11y: string, off: boolean, next: string) => (
    <Pressable onPress={() => onChange(next)} disabled={off} accessibilityRole="button" accessibilityLabel={a11y} accessibilityState={{ disabled: off }}
      style={({ pressed }) => [s.capsule, { width: 44, paddingHorizontal: 0 }, off ? { backgroundColor: c.grey50, borderColor: c.grey200 } : pressed && { backgroundColor: c.grey100 }]}>
      <Icon size={18} color={off ? c.grey300 : c.grey700} />
    </Pressable>
  );
  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.label, { color: c.grey700 }]}>Bookings leaving from</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {step(Minus, "Bookings leaving from: a day earlier", false, addDays(value, -1))}
        <Text style={[t.label, t.tab, { flex: 1, textAlign: "center", color: c.ink900 }]} accessibilityLiveRegion="polite">{dateLong(value)}</Text>
        {step(Plus, "Bookings leaving from: a day later", atMax, addDays(value, 1))}
      </View>
    </View>
  );
}

/** Front desk's StayCard (StayList.tsx): the room and its state, who, the
    reference, then this page's columns (Reservations.tsx COLUMNS). */
function BookingCard({ s: x, held, onOpen }: { s: DeskStay; held: boolean; onOpen: () => void }) {
  const state = statusOf(x);
  const plain = [t.label, face[500], { color: c.ink900, textAlign: "right" as const, flexShrink: 1 }];
  const rows: Array<[string, string, object?]> = [
    ["Type", x.roomType, { color: c.grey600 }], ["Plan", x.ratePlan, { color: c.grey600 }], ["Source", x.source ?? "-", { color: c.grey600 }],
    ["Arrival", day(x.arrival), t.tab], ["Departure", day(x.departure), t.tab], ["Nights", x.isDayUse ? "Day use" : String(x.nights), t.tab],
  ];
  return (
    <Pressable
      onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${x.roomNumber ? `Room ${x.roomNumber}, ` : ""}${x.guest}, ${state.label}`}
      style={({ pressed }) => ({ borderRadius: 12, borderWidth: 1, borderColor: held ? c.yellow800 : c.grey200, backgroundColor: pressed ? c.grey50 : held ? c.yellow50 : c.white, paddingHorizontal: 14, paddingVertical: 12 })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Text style={[t.figure, !x.roomNumber ? { color: c.grey500 } : null]}>{x.roomNumber || "-"}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pill tone={state.tone}>{state.label}</Pill>
          <ChevronRight size={16} color={c.grey400} />
        </View>
      </View>
      <Text numberOfLines={1} style={[t.label, { color: c.ink900, marginTop: 4 }]}>{x.guest}</Text>
      <Text style={[t.caption, t.tab]}>{x.reference}</Text>
      {held ? <Text style={[t.caption, { color: c.yellow800, marginTop: 2 }]}>Queued: check in</Text> : null}
      <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.grey100, gap: 4 }}>
        {rows.map(([label, value, style]) => (
          <View key={label} style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <Text style={[t.label, body, { color: c.grey500 }]}>{label}</Text>
            <Text style={[...plain, style]}>{value}</Text>
          </View>
        ))}
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <Text style={[t.label, body, { color: c.grey500 }]}>Rate</Text>
          {x.isComplimentary ? <Text style={[...plain, { color: c.grey500 }]}>Comp</Text> : <Text style={[...plain, t.tab, face[600]]}>{cash(x.offeredTariff)}</Text>}
        </View>
      </View>
    </Pressable>
  );
}
