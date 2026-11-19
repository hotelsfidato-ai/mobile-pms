import { router, type Href } from "expo-router";
import { BedDouble, ChevronDown, ChevronRight, Users } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { ExportButtons } from "../../core/Export";
import { c, face, space, t } from "../../core/theme";
import { Card, Screen, useRead } from "../../core/ui";
import { dateDay } from "../finance/bill";
import { body, Button, Empty, PageHead, Pill, Segmented } from "../front-desk/kit";
import { Kept, NotRead } from "../front-desk/StayList";
import { ripple, shade } from "./GroupKit";
import { chipsOf, emptyOf, groupsTable, headLine, owed, rowLine, type Scope, type StayGroup } from "./groups";
import { readGroup, readGroups } from "./groupsData";

/* ══════════════════════════════════════════════════════════════════
   GROUPS — the web's /h/:code/groups (src/modules/reservations/pages/
   Groups.tsx; picture all/13-bookings-groups): one booking with its rooms
   beneath it. Here and coming, or All. A card opens its rooms (read only
   when opened, as the web: forty groups would otherwise fetch four
   hundred bookings), each room opens its stay, and "Open the group" its
   page. TWO BALANCES, NEVER ONE: Rooms owe and Host owes, side by side,
   as the server sent them; a dash where there is no host account or the
   role reads no bills (D27-143). The list in a file: ExportButtons.
   ══════════════════════════════════════════════════════════════════ */

export function Groups({ hotel }: { hotel: Hotel }) {
  const code = hotel.code;
  const [scope, setScope] = useState<Scope>("current");
  const [open, setOpen] = useState<string | null>(null);
  const [pulled, setPulled] = useState(false);
  const read = useRead(() => readGroups(code, scope), ["reservations", code, "groups", scope]);
  useEffect(() => { if (!read.loading) setPulled(false); }, [read.loading]);
  const groups = read.data;
  const empty = emptyOf(scope);

  return (
    <Screen refreshing={pulled && read.loading} onRefresh={() => { setPulled(true); read.reload(); }}>
      <PageHead title="Groups" description={headLine(groups)}>
        <View style={{ gap: 12 }}>
          <ExportButtons table={groups ? groupsTable(groups, hotel.name, scope, dateDay) : null} />
          {/* A choice of view, so the view control (the web's Segmented, full width on a phone). */}
          <Segmented<Scope> value={scope} onChange={(v) => { setScope(v); setOpen(null); }}
            options={[{ value: "current", label: "Here and coming" }, { value: "all", label: "All" }]} />
        </View>
      </PageHead>

      <Kept error={groups ? read.error : undefined} what="the groups" />
      {!groups ? (read.error ? <NotRead what="the groups" error={read.error} onRetry={read.reload} plural />
        : <View style={{ paddingVertical: 24 }}><ActivityIndicator color={c.orange} accessibilityLabel="Reading the groups" /></View>)
        : groups.length === 0 ? <Card><Empty title={empty.title} line={empty.line} Icon={Users} /></Card>
          : groups.map((g) => (
            <GroupRow key={g.id} code={code} group={g} open={open === g.id} onToggle={() => setOpen(open === g.id ? null : g.id)} />
          ))}
    </Screen>
  );
}

function GroupRow({ code, group: g, open, onToggle }: { code: string; group: StayGroup; open: boolean; onToggle: () => void }) {
  const Chevron = open ? ChevronDown : ChevronRight;
  const chips = chipsOf(g);
  return (
    <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, overflow: "hidden" }}>
      <Pressable
        onPress={onToggle} {...ripple} accessibilityRole="button" accessibilityState={{ expanded: open }}
        accessibilityLabel={`${g.name}, ${rowLine(g, dateDay)}. Rooms owe ${owed(g.guestBalance)}, host owes ${owed(g.masterBalance)}`}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: space.cardX, paddingVertical: space.cardY, backgroundColor: shade(pressed) })}
      >
        <Chevron size={16} color={c.grey400} style={{ marginTop: 4 }} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[t.heading, face[500]]}>
            {g.name}
            {g.reference ? <Text style={[t.label, t.tab, body, { color: c.grey500 }]}>{`  ${g.reference}`}</Text> : null}
            {g.company ? <Text style={[t.label, body, { color: c.grey500 }]}>{` · ${g.company}`}</Text> : null}
          </Text>
          <Text style={[t.label, body, { color: c.grey600, lineHeight: 21, marginTop: 2 }]}>{rowLine(g, dateDay)}</Text>
          {chips.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {chips.map((x) => <Pill key={x.label} tone={x.tone}>{x.label}</Pill>)}
            </View>
          ) : null}
        </View>
        {/* TWO BALANCES, side by side, never summed. */}
        <View style={{ alignItems: "flex-end", paddingLeft: 8 }}>
          <Text style={[t.label, body, { color: c.grey500 }]}>Rooms owe</Text>
          <Text style={[t.heading, t.tab, face[500], { color: g.guestBalance == null ? c.grey500 : c.ink900 }]}>{owed(g.guestBalance)}</Text>
          <Text style={[t.label, body, { color: c.grey500, marginTop: 4 }]}>Host owes</Text>
          <Text style={[t.heading, t.tab, face[500], { color: g.masterBalance == null ? c.grey500 : c.ink900 }]}>{owed(g.masterBalance)}</Text>
        </View>
      </Pressable>
      {open ? <Rooms code={code} groupId={g.id} /> : null}
    </View>
  );
}

/** The group's rooms, read when the card is opened; each opens its stay. */
function Rooms({ code, groupId }: { code: string; groupId: string }) {
  const read = useRead(() => readGroup(code, groupId), ["reservations", code, "group", groupId]);
  const d = read.data;
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: c.grey200, paddingHorizontal: space.cardX, paddingVertical: space.cardY }}>
      {d === undefined ? (read.error
        ? <Text style={[t.label, body, { color: c.grey500 }]}>{`This group's rooms did not load. Nothing was changed. ${read.error}`}</Text>
        : <ActivityIndicator color={c.orange} accessibilityLabel="Reading the group's rooms" />)
        : d === null ? <Text style={[t.label, body, { color: c.grey500 }]}>This group's rooms did not load. Nothing was changed.</Text>
          : (
            <>
              <View style={{ marginTop: -12 }}>
                {d.rooms.map((r, i) => (
                  <Pressable
                    key={r.reservationId} {...ripple} onPress={() => router.push(`/front-desk/${code}/stay/${r.reservationId}` as Href)}
                    accessibilityRole="link" accessibilityLabel={`${r.room ? `Room ${r.room}` : "No room"}, ${r.guest}${r.routed ? ", host pays" : ""}, ${owed(r.balance)}`}
                    style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56, paddingVertical: 12, marginHorizontal: -space.cardX, paddingHorizontal: space.cardX,
                      borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.grey100, backgroundColor: shade(pressed) })}
                  >
                    <BedDouble size={16} color={c.grey400} />
                    {/* Null once they have left: a dash, never a room they have vacated. */}
                    <Text style={[t.label, t.tab, face[500], { width: 48, color: r.room ? c.ink900 : c.grey500 }]}>{r.room ?? "-"}</Text>
                    <Text numberOfLines={1} style={[t.heading, face[500], { flex: 1 }]}>{r.guest}</Text>
                    {r.routed ? <Pill tone="neutral">Host pays</Pill> : null}
                    <Text style={[t.label, t.tab, { color: r.balance == null ? c.grey500 : c.ink900, textAlign: "right", minWidth: 72 }]}>{owed(r.balance)}</Text>
                    <ChevronRight size={16} color={c.grey400} />
                  </Pressable>
                ))}
              </View>
              <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingTop: 14, borderTopWidth: 1, borderTopColor: c.grey100 }}>
                <Button label="Open the group" onPress={() => router.push(`/reservations/${code}/groups/${groupId}` as Href)} />
              </View>
            </>
          )}
    </View>
  );
}
