import * as Lucide from "lucide-react-native";
import { ArrowDown, ArrowUp, Pencil, Plus, Search, Trash2 } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, Switch, Text, TextInput, View } from "react-native";
import { c, face, space, t } from "../../core/theme";
import { s as core, confirmAct } from "../../core/ui";
import { Btn, Pill, Toast, useSaid } from "../admin/kit";
import type { AdminProps } from "../admin/Route";
import { PageFrame, Read, StuckLine, mayEditHere, readOnlyLine, refusedPage, usePage, useWrites, type Writes } from "./PropertyKit";
import { addAmenity, changeAmenity, orderAmenities, readAmenities, removeAmenity, switchAmenity } from "./propertyData";
import { findAmenities, moved, type Amenity } from "./propertyRules";

/* ══════════════════════════════════════════════════════════════════
   AMENITIES on a phone — Settings → Property → Amenities (the web's
   pages/property/Amenities.tsx, D27-257): ONE list for the whole group.
   This hotel's GM (`room_config` edit) switches on what the hotel has (PUT
   /:code/amenities/:id { on }); the owner or an Admin (the server's
   `mayKeep`, app.keeps_amenities) adds, renames, orders, turns Off and
   deletes - delete only while no hotel has it on (the web draws Delete only
   then; the server refuses otherwise). The phone asks first before a
   delete, and before turning Off an amenity some hotel has on (BRIEF-T4).
   GET /:code/amenities. Not pictured.
   ══════════════════════════════════════════════════════════════════ */

/* amenityIcons.ts: the seed's icon keys; any other - every amenity added by hand - a plain tick. */
const ICONS: Record<string, keyof typeof Lucide> = {
  "front-desk": "ConciergeBell", ac: "Snowflake", wifi: "Wifi", parking: "SquareParking",
  restaurant: "UtensilsCrossed", "room-service": "BellRing", breakfast: "Coffee", laundry: "WashingMachine",
  lift: "ArrowUpDown", power: "Zap", "hot-water": "ShowerHead", tv: "Tv", banquet: "PartyPopper", pool: "Waves",
  gym: "Dumbbell", spa: "Flower2", bar: "Wine", cctv: "Cctv", doctor: "Stethoscope", pickup: "Car",
};
const iconOf = (key: string) => ((Lucide[ICONS[key] ?? "CircleCheck"] ?? Lucide.CircleCheck) as Lucide.LucideIcon);

const box = { flex: 1, minHeight: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, fontSize: 16, color: c.ink900, backgroundColor: c.white, ...face[500] };

export function PropAmenities({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const refused = refusedPage(role, "/settings/property/amenities", "Amenities");
  const { said, say, close } = useSaid();
  const { q, stop } = usePage(code, "amenities", () => (refused ? Promise.resolve(null) : readAmenities(code)));
  const w = useWrites(stop, q.reload, say);
  const [pulled, setPulled] = useState(false);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const mayEdit = mayEditHere(role);
  return (
    <View style={{ flex: 1 }}>
      <PageFrame title="Amenities"
        under="Switch on what this hotel has; guests see them on their page. One list for every hotel in the group."
        refused={refused} refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        <Read q={q} what="the amenities">
          {(d) => {
            if (!d) return null;
            const list = d.amenities;
            const shown = findAmenities(list, search);
            const searching = search.trim() !== "";
            const move = (a: Amenity, by: -1 | 1) => {
              const ids = moved(list.map((x) => x.id), list.findIndex((x) => x.id === a.id), by);
              if (ids) void w.write(() => orderAmenities(code, ids), { ok: () => null, done: "moved", where: "the amenities list" });
            };
            const add = () => {
              const name = (adding ?? "").trim();
              void w.write(() => addAmenity(code, name), {
                ok: () => ({ title: "Added - every hotel can switch it on now", tone: "ok" }), done: "added", where: "the amenities list",
                after: () => setAdding(null),
              });
            };
            return (
              <>
                <StuckLine w={w} />
                {d.mayKeep && adding === null ? (
                  <View style={{ alignSelf: "flex-start" }}>
                    <Btn variant="primary" label="Add" a11y="Add an amenity" disabled={w.off} icon={<Plus size={16} color={w.off ? c.grey500 : c.white} />} onPress={() => setAdding("")} />
                  </View>
                ) : null}
                <View style={[core.card, { gap: 12 }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: c.grey300 }}>
                    <Search size={16} color={c.grey500} />
                    <TextInput value={search} onChangeText={setSearch} placeholder="Find an amenity" placeholderTextColor={c.grey400}
                      accessibilityLabel="Find an amenity" autoCorrect={false} style={{ flex: 1, fontSize: 16, color: c.ink900, ...face[500] }} />
                  </View>
                  {adding !== null ? (
                    <View style={{ gap: 8 }}>
                      <TextInput autoFocus maxLength={40} accessibilityLabel="New amenity" placeholder="Rooftop garden" placeholderTextColor={c.grey400}
                        value={adding} onChangeText={setAdding} onSubmitEditing={() => adding.trim() && add()} style={box} />
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <Btn variant="primary" label={w.busy ? "…" : "Add"} disabled={w.off || !adding.trim()} onPress={add} />
                        <Btn variant="ghost" label="Cancel" disabled={w.busy} onPress={() => setAdding(null)} />
                      </View>
                    </View>
                  ) : null}
                  <View>
                    {shown.map((a, i) => (
                      <Row key={a.id} code={code} a={a} first={i === 0} mayEdit={mayEdit} mayKeep={d.mayKeep} w={w}
                        top={list[0]?.id === a.id} bottom={list.at(-1)?.id === a.id} searching={searching} onMove={(by) => move(a, by)} />
                    ))}
                  </View>
                  {shown.length === 0 ? <Text style={[t.label, { color: c.grey500 }]}>Nothing by that name.</Text> : null}
                </View>
                {!mayEdit ? <Text style={t.caption}>{readOnlyLine("Changing the property's profile")}</Text> : null}
              </>
            );
          }}
        </Read>
      </PageFrame>
      <Toast said={said} onClose={close} />
    </View>
  );
}

function Icon44({ label, onPress, disabled, children }: { label: string; onPress: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: Boolean(disabled) }}
      style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.35 : 1 }}>
      {children}
    </Pressable>
  );
}

function Row({ code, a, first, mayEdit, mayKeep, w, top, bottom, searching, onMove }: {
  code: string; a: Amenity; first: boolean; mayEdit: boolean; mayKeep: boolean; w: Writes;
  top: boolean; bottom: boolean; searching: boolean; onMove: (by: -1 | 1) => void;
}) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const Icon = iconOf(a.icon);
  const rename = () => void w.write(() => changeAmenity(code, a.id, { name: (renaming ?? "").trim() }), {
    ok: () => null, done: "renamed", where: "the amenities list", after: () => setRenaming(null),
  });
  const turn = () => {
    const go = () => void w.write(() => changeAmenity(code, a.id, { isActive: !a.isActive }), { ok: () => null, done: "changed", where: "the amenities list" });
    /* Switching off a kind that is in use asks first (BRIEF-T4); the web turns it at one tap. */
    if (a.isActive && a.used) confirmAct(`Turn ${a.name} Off?`, "Off for every hotel.", "Turn Off", go);
    else go();
  };
  const remove = () => confirmAct(`Delete ${a.name}?`, undefined, "Delete", () =>
    void w.write(() => removeAmenity(code, a.id), { ok: () => ({ title: "Deleted", tone: "ok" }), done: "deleted", where: "the amenities list", no: "Not saved" }));
  return (
    <View style={{ paddingVertical: 8, gap: 4, borderTopWidth: first ? 0 : 1, borderColor: c.grey100 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 }}>
        <Icon size={16} color={c.grey500} />
        {renaming !== null ? (
          <TextInput autoFocus maxLength={40} accessibilityLabel={`New name for ${a.name}`} value={renaming} onChangeText={setRenaming} style={box} />
        ) : (
          <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <Text style={[t.label, { fontSize: 16, color: c.ink900 }]}>{a.name}</Text>
            {!a.isActive ? <Pill tone="neutral">Off for every hotel</Pill> : null}
            {a.isActive && a.on && !mayEdit ? <Pill tone="success">Here</Pill> : null}
          </View>
        )}
        {renaming !== null ? <Btn label="Save" disabled={w.off || !renaming.trim()} onPress={rename} />
          : mayEdit && a.isActive ? (
            <Switch value={a.on} disabled={w.off} accessibilityLabel={a.name} trackColor={{ false: c.grey300, true: c.orange }} thumbColor={c.white} ios_backgroundColor={c.grey300}
              onValueChange={(on) => void w.write(() => switchAmenity(code, a.id, on), { ok: () => null, done: on ? "switched on" : "switched off", where: "the amenities list" })} />
          ) : null}
      </View>
      {mayKeep && renaming === null ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2, paddingLeft: 18, marginLeft: space.tile }}>
          <Icon44 label={`Move ${a.name} up`} disabled={w.off || top || searching} onPress={() => onMove(-1)}><ArrowUp size={16} color={c.grey700} /></Icon44>
          <Icon44 label={`Move ${a.name} down`} disabled={w.off || bottom || searching} onPress={() => onMove(1)}><ArrowDown size={16} color={c.grey700} /></Icon44>
          <Icon44 label={`Rename ${a.name}`} disabled={w.off} onPress={() => setRenaming(a.name)}><Pencil size={16} color={c.grey700} /></Icon44>
          <Btn variant="ghost" label={a.isActive ? "Turn Off" : "Turn On"} disabled={w.off} onPress={turn} />
          {!a.used ? <Icon44 label={`Delete ${a.name}`} disabled={w.off} onPress={remove}><Trash2 size={16} color={c.grey700} /></Icon44> : null}
        </View>
      ) : null}
      {renaming !== null ? <View style={{ alignSelf: "flex-start" }}><Btn variant="ghost" label="Cancel" disabled={w.busy} onPress={() => setRenaming(null)} /></View> : null}
    </View>
  );
}
