import { useQueryClient } from "@tanstack/react-query";
import { BedDouble, ChevronRight, Cigarette, Layers, Plus, Upload } from "lucide-react-native";
import { useRef, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { outcomeUnknown, type Hotel } from "../../core/api";
import { ROOM_SPEC, ROOM_TYPE_SPEC } from "../../core/importSpec";
import { c, face, space, t } from "../../core/theme";
import { Head, Screen, notKnown, useRead, useScreenStop, useStuck } from "../../core/ui";
import { ImportSheet } from "../pos/ImportSheet";
import {
  baseError, maxError, plural, roomBody, roomLine, roomRange, roomsOf, setupLine, severalWords, sleepsOf,
  typeFirstBody, typeForm, typeMoreBody, typeReady, typedCount,
  setupImportStop, type RoomForm, type RoomSetup, type RoomTypeSetup, type TypeForm,
} from "./config";
import {
  addRoom, addRoomType, amendRoom, amendRoomType, importSetup, readAmenities, readRoomSetup, readTypeAmenities, removeRoom, removeRoomType,
  setTypeAmenities,
} from "./configData";
import { asRole, mayReach } from "../../core/menu";
import { Btn, Failed, Field, Loading, NotYourRole, Pill, Refused, Select, Sheet, SwitchLine, TextBox, confirm } from "./configKit";
import { SETUP_ADD, SETUP_CHANGE, SETUP_READ, whyNot } from "./configRoles";
import { Empty, InDialog, Segmented, Stale, Toast, body, saidOf, type Said } from "./kit";
import { ON_THE_WEBSITE } from "./roles";
import { TypePhotos } from "./TypePhotos";

/* ══════════════════════════════════════════════════════════════════
   ROOM TYPES on a phone — the web's Settings → Rooms → Room types
   (/settings/rooms/room-types; /h/:code/room-types redirects to it):
   src/modules/inventory/pages/RoomSetup.tsx, picture
   pms-shots/all/23-configuration-room-types.

   What the property sells and what it sells it in. NO PRICE IS ASKED FOR
   HERE: a new type is unpriced, and its price is set on Rates. NOTHING IN
   USE IS DELETED: a type or a room switches off; only one nothing uses may
   be Removed, and the server says what uses it.

   Import (room types, then the rooms of them, as the web offers the second
   file straight after the first) and a type's Photos come through the
   phone's own pickers (M-16; ImportSheet.tsx, TypePhotos.tsx).
   On the website for now: the colour picker (the colour is typed), and
   putting the rooms in order (dragging).
   ══════════════════════════════════════════════════════════════════ */

export function RoomTypes({ hotel, role }: { hotel: Hotel; role: string | null }) {
  /* The settings console's page: whoever its menu shows it to (the owner, an Administrator, the GM). */
  if (!mayReach(asRole(role), "/settings/rooms/room-types")) {
    return <Screen refreshing={false} onRefresh={() => undefined}><Head title="Room types" /><NotYourRole role={role} screen="Room types" /></Screen>;
  }
  return <RoomTypesScreen hotel={hotel} role={role} />;
}

function RoomTypesScreen({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const cannotRead = whyNot(SETUP_READ, role);
  const cannotAdd = whyNot(SETUP_ADD, role);
  const cannotChange = whyNot(SETUP_CHANGE, role);
  /* An import whose reply was lost is let go by a read of the set-up begun after it (ImportSheet.tsx). */
  const imports = useScreenStop(setupImportStop(code));
  const setup = useRead(imports.watch(() => (cannotRead ? Promise.resolve(null) : readRoomSetup(code))), ["inventory", code, "room-setup"]);
  const [importing, setImporting] = useState<"room-types" | "rooms" | null>(null);
  const [addingType, setAddingType] = useState(false);
  const [editingType, setEditingType] = useState<RoomTypeSetup | null>(null);
  const [addingRoom, setAddingRoom] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomSetup | null>(null);
  const [said, setSaid] = useState<Said | null>(null);
  const [pulled, setPulled] = useState(false);
  const typesLanded = useRef(false);

  /* The tape chart, the floor and the rate grid read this too (RoomSetup.tsx 70-75). */
  const refresh = () => {
    void cache.invalidateQueries({ queryKey: ["inventory", code] });
    void cache.invalidateQueries({ queryKey: ["housekeeping", code] });
    void cache.invalidateQueries({ queryKey: ["reservations", code] });
  };
  const done = (s: Said) => { setSaid(s); refresh(); };

  const v = setup.data;
  let main;
  if (cannotRead) main = <Empty title="Room types" description={cannotRead} />;
  else if (v === undefined) {
    main = setup.error
      ? <Failed title="This property did not load" what="The room types" error={setup.error} onRetry={setup.reload} />
      : <Loading words="Reading the room types…" />;
  } else if (v) {
    main = (
      <>
        <Stale error={setup.error} />
        <Text style={[t.heading, { marginTop: 4 }]} accessibilityRole="header">Room types</Text>
        {v.types.length === 0 ? (
          <View style={{ gap: 12 }}>
            <Empty title="No room types yet" description="A room type is what the property sells - Standard, Deluxe, Suite. Rooms are of a type, and rates are set against one." />
            {cannotAdd ? <Refused label="Add the first" reason={cannotAdd} />
              : <View style={{ flexDirection: "row", justifyContent: "center" }}><Btn label="Add the first" onPress={() => setAddingType(true)} /></View>}
          </View>
        ) : v.types.map((x) => (
          <View key={x.id} style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <Text style={[t.heading, { fontSize: 16 }]}>{x.name}</Text>
              <Text style={[t.label, t.tab, { color: c.grey500 }]}>{x.code}</Text>
              {!x.isActive ? <Pill>Off</Pill> : null}
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: c.grey100, paddingTop: 6, gap: 2 }}>
              <Line label="Sleeps" value={sleepsOf(x)} />
              <Line label="Rooms" value={roomsOf(x)} />
            </View>
            {cannotChange ? <Refused label="Edit" reason={cannotChange} />
              : <Btn label="Edit" a11y={`Edit ${x.name}`} onPress={() => setEditingType(x)} />}
          </View>
        ))}
        {v.rooms.length > 0 ? (
          <>
            <View style={{ marginTop: space.section - space.card, gap: 2 }}>
              <Text style={t.heading} accessibilityRole="header">Rooms</Text>
              <Text style={[t.label, { color: c.grey600 }]}>Putting the rooms in order: {ON_THE_WEBSITE.toLowerCase()} (drag a room there).</Text>
            </View>
            {v.rooms.map((r) => <RoomTile key={r.id} room={r} onPress={cannotChange ? undefined : () => setEditingRoom(r)} />)}
            {cannotChange ? <Text style={[t.caption, { color: c.grey600 }]}>{cannotChange}</Text> : null}
          </>
        ) : null}
      </>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && setup.loading} onRefresh={() => { setPulled(true); setup.reload(); }}>
        <Head title="Room types" under={v ? setupLine(v) : cannotRead ? undefined : "Loading…"} />
        {v ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {cannotAdd ? <Refused label="Import" icon={Upload} reason={cannotAdd} /> : <Btn label="Import" icon={Upload} onPress={() => setImporting("room-types")} />}
            {cannotAdd ? <Refused label="Add a room type" icon={Layers} reason={cannotAdd} /> : <Btn label="Add a room type" icon={Layers} onPress={() => setAddingType(true)} />}
            {/* The web's Button is secondary by default (Button.tsx 75), as the picture shows. */}
            {cannotAdd ? <Refused label="Add a room" icon={Plus} reason={cannotAdd} />
              : <Btn label="Add a room" icon={Plus} disabled={v.types.length === 0} onPress={() => setAddingRoom(true)} />}
          </View>
        ) : null}
        {main}
      </Screen>
      {addingType ? <TypeSheet code={code} type={null} mayRemove={false} cannotChange={cannotChange} onClose={() => setAddingType(false)} onDone={done} /> : null}
      {editingType ? <TypeSheet code={code} type={editingType} mayRemove cannotChange={cannotChange} onClose={() => setEditingType(null)} onDone={done} /> : null}
      {addingRoom && v ? <RoomSheet code={code} room={null} types={v.types} existing={v.rooms.map((r) => r.number)} onClose={() => { setAddingRoom(false); refresh(); }} onDone={done} /> : null}
      {editingRoom && v ? <RoomSheet code={code} room={editingRoom} types={v.types} existing={[]} onClose={() => setEditingRoom(null)} onDone={done} /> : null}
      {importing ? (
        <ImportSheet key={importing} spec={importing === "room-types" ? ROOM_TYPE_SPEC : ROOM_SPEC} stopName={setupImportStop(code)}
          where={importing === "room-types" ? "the room types" : "the rooms"}
          load={(rows, dryRun) => importSetup(code, importing, rows, dryRun)}
          /* Room types first, then the rooms of them: the second file is offered straight after the first (RoomSetup.tsx 272-280). */
          onClose={() => { const next = importing === "room-types" && typesLanded.current; typesLanded.current = false; setImporting(next ? "rooms" : null); }}
          onImported={() => { refresh(); if (importing === "room-types") typesLanded.current = true; }} />
      ) : null}
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", minHeight: 22, alignItems: "center" }}>
      <Text style={[t.label, { flex: 1, color: c.grey500 }]}>{label}</Text>
      <Text style={[t.label, t.tab, face[500], { color: c.grey700 }]}>{value}</Text>
    </View>
  );
}

/** RoomSetup.tsx 203-245: a room's tile; dashed and grey when it is off. */
function RoomTile({ room, onPress }: { room: RoomSetup; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole="button" accessibilityLabel={`Room ${room.number}, ${roomLine(room)}`}
      android_ripple={{ color: c.grey200 }}
      style={({ pressed }) => ({
        minHeight: 64, borderRadius: 10, borderWidth: 1, borderStyle: room.isActive ? "solid" : "dashed", paddingHorizontal: 14, paddingVertical: 12,
        flexDirection: "row", alignItems: "center", gap: 8, overflow: "hidden",
        borderColor: room.isActive ? c.grey200 : c.grey300, backgroundColor: !room.isActive ? c.grey50 : pressed && Platform.OS === "ios" ? c.grey50 : c.white,
      })}>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Text style={[t.figure, { color: room.isActive ? c.ink900 : c.grey500 }]}>{room.number}</Text>
          {room.occupied ? <BedDouble size={14} color={c.grey400} accessibilityLabel="Somebody is in it" /> : null}
          {room.smoking ? <Cigarette size={14} color={c.grey400} accessibilityLabel="Smoking room" /> : null}
          {!room.isActive ? <Pill>Off</Pill> : null}
        </View>
        <Text style={[t.label, { color: c.grey500 }]} numberOfLines={1}>{roomLine(room)}</Text>
      </View>
      {onPress ? <ChevronRight size={16} color={c.grey400} /> : null}
    </Pressable>
  );
}

/* ── A room type: add or edit (RoomSetup.tsx TypeDialog) ─────────── */

function TypeSheet({ code, type, mayRemove, cannotChange, onClose, onDone }: {
  code: string; type: RoomTypeSetup | null; mayRemove: boolean; cannotChange: string | null; onClose: () => void; onDone: (s: Said) => void;
}) {
  const [tab, setTab] = useState<"basic" | "amenities" | "photos">("basic");
  const [f, setF] = useState<TypeForm>(() => typeForm(type));
  const [said, setSaid] = useState<Said | null>(null);
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const stuck = useStuck();
  const set = <K extends keyof TypeForm>(k: K) => (v: TypeForm[K]) => setF((x) => ({ ...x, [k]: v }));
  const count = (k: keyof TypeForm) => (v: string) => set(k)(typedCount(v) as never);
  const ready = typeReady(f, type !== null);

  async function save() {
    if (!ready || latch.current || stuck.isStuck()) return;
    latch.current = true; setBusy(true); setSaid(null);
    let id = type?.id;
    try {
      if (type) await amendRoomType(code, type.id, typeFirstBody(f, true));
      else id = (await addRoomType(code, typeFirstBody(f, false))).id;
    } catch (e) {
      /* A second add after a lost reply: the server refuses the same code, but the person sees the list first (MEMORY 16). */
      if (!type && stuck.stop(e)) { const n = notKnown("added", "the room types"); setSaid({ title: n.title, body: n.body, tone: "bad" }); }
      else setSaid(saidOf("Not saved", e));
      latch.current = false; setBusy(false);
      return;
    }
    try {
      await amendRoomType(code, id!, typeMoreBody(f));
      onDone({ title: type ? "Saved" : "Room type added", tone: "ok" });
      onClose();
    } catch (e) {
      /* The first write stood: said so, never "not saved" for a type that now exists. */
      if (type) setSaid(saidOf("Not saved", e));
      else { onDone({ title: "Room type added", body: `Its other details were not saved: ${e instanceof Error ? e.message : String(e)} Edit it to try again.`, tone: "bad" }); onClose(); }
    } finally { latch.current = false; setBusy(false); }
  }

  function remove() {
    if (!type) return;
    confirm(`Remove ${type.name}`, `Remove ${type.name} for good? Only a room type with no rooms, bookings or prices can be removed; otherwise switch it off.`,
      `Remove ${type.name}`, () => {
        if (latch.current) return;
        latch.current = true; setBusy(true); setSaid(null);
        removeRoomType(code, type.id)
          .then(() => { onDone({ title: "Room type removed", body: type.name, tone: "ok" }); onClose(); })
          .catch((e: unknown) => setSaid(saidOf("Not removed", e)))
          .finally(() => { latch.current = false; setBusy(false); });
      });
  }

  const foot = (
    <>
      <InDialog said={said} />
      {stuck.stuck ? <Text style={[t.caption, { color: c.red700 }]}>{notKnown("added", "the room types").line}</Text> : null}
      <View style={{ flexDirection: "row", gap: 8 }}>
        {type && mayRemove ? <Btn label="Remove" variant="ghost" disabled={busy} onPress={remove} /> : null}
        <Btn label="Cancel" grow onPress={onClose} />
        {tab === "basic" ? <Btn label={busy ? "Saving…" : "Save"} variant="primary" grow disabled={!ready || busy || stuck.stuck} onPress={() => void save()} /> : null}
      </View>
    </>
  );

  return (
    <Sheet title={type ? `Edit ${type.name}` : "Add a room type"} under={type ? undefined : "What the property sells. The rate is set separately, on Rates."} onClose={onClose} foot={foot}>
      {type ? (
        <Segmented<"basic" | "amenities" | "photos"> label="Room type" value={tab} onChange={setTab}
          options={[{ value: "basic", label: "Basic" }, { value: "amenities", label: "Amenities" }, { value: "photos", label: "Photos" }]} />
      ) : null}
      {tab === "amenities" && type ? <TypeAmenities code={code} typeId={type.id} /> : null}
      {tab === "photos" && type ? <TypePhotos code={code} typeId={type.id} cannotChange={cannotChange} /> : null}
      {tab === "basic" ? (
        <>
          {!type ? (
            <Field label="Code" hint="Two to ten letters or digits. It prints on the tape chart.">
              <TextBox label="Code" value={f.code} placeholder="DLX" caps="characters" maxLength={10} onChangeText={(v) => set("code")(v.toUpperCase())} />
            </Field>
          ) : null}
          <Field label="Name"><TextBox label="Name" value={f.name} placeholder="Deluxe" caps="words" onChangeText={set("name")} /></Field>
          <Field label="Adults the rate covers" hint="Before an extra-person charge." error={baseError(f)}>
            <TextBox label="Adults the rate covers" value={f.base} keyboardType="number-pad" onChangeText={count("base")} />
          </Field>
          <Field label="Children it covers"><TextBox label="Children it covers" value={f.baseChildren} keyboardType="number-pad" onChangeText={count("baseChildren")} /></Field>
          <Field label="Sleeps at most" error={maxError(f)}><TextBox label="Sleeps at most" value={f.max} keyboardType="number-pad" onChangeText={count("max")} /></Field>
          <Field label="Adults at most" hint="Empty: only the total."><TextBox label="Adults at most" value={f.maxAdults} keyboardType="number-pad" onChangeText={count("maxAdults")} /></Field>
          <Field label="Children at most" hint="Fewer than the total."><TextBox label="Children at most" value={f.maxChildren} keyboardType="number-pad" onChangeText={count("maxChildren")} /></Field>
          <Field label="Size (sq ft)"><TextBox label="Size (sq ft)" value={f.size} keyboardType="number-pad" onChangeText={count("size")} /></Field>
          <Field label="Beds"><TextBox label="Beds" value={f.beds} placeholder="1 King" maxLength={60} onChangeText={set("beds")} /></Field>
          <Field label="View"><TextBox label="View" value={f.view} placeholder="Garden" maxLength={60} onChangeText={set("view")} /></Field>
          <Field label="Colour" hint="On the Calendar and the rate plans. Typed, like #1f6f5c (the picker is on the website).">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View accessibilityLabel="The colour" style={{ width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: c.grey300, backgroundColor: /^#[0-9a-fA-F]{6}$/.test(f.colour) ? f.colour : c.grey500 }} />
              <View style={{ flex: 1 }}><TextBox label="Colour" value={f.colour} caps="none" maxLength={7} onChangeText={set("colour")} /></View>
            </View>
          </Field>
          {type ? (
            <SwitchLine label="Sold at this property" on={f.active} onChange={set("active")}
              hint="Switching it off refuses while rooms are still of this type. Off keeps its bookings and prices." />
          ) : null}
        </>
      ) : null}
    </Sheet>
  );
}

/** RoomSetup.tsx TypeAmenities: from the property's one catalogue; each tap is one PUT of the whole set. */
function TypeAmenities({ code, typeId }: { code: string; typeId: string }) {
  const cache = useQueryClient();
  const all = useRead(() => readAmenities(code), ["inventory", code, "amenities"]);
  const mine = useRead(() => readTypeAmenities(code, typeId), ["inventory", code, "type-amenities", typeId]);
  const [said, setSaid] = useState<Said | null>(null);
  const latch = useRef(false);
  if (all.error && !all.data) return <Failed title="The amenities did not load" what="The amenities" error={all.error} onRetry={all.reload} />;
  if (mine.error && !mine.data) return <Failed title="The amenities did not load" what="The amenities" error={mine.error} onRetry={mine.reload} />;
  if (!all.data || !mine.data) return <Loading words="Reading the amenities…" />;
  const on = new Set(mine.data.amenityIds);
  const offered = all.data.amenities.filter((a) => a.isActive);
  if (offered.length === 0) return <Text style={[body, { color: c.grey600 }]}>No amenities yet. They are added under Property → Amenities.</Text>;
  const toggle = (id: string) => {
    if (latch.current) return;
    latch.current = true; setSaid(null);
    const next = on.has(id) ? [...on].filter((x) => x !== id) : [...on, id];
    setTypeAmenities(code, typeId, next)
      .then(() => cache.invalidateQueries({ queryKey: ["inventory", code, "type-amenities", typeId] }))
      .catch((e: unknown) => setSaid(saidOf("Not saved", e)))
      .finally(() => { latch.current = false; });
  };
  return (
    <View style={{ gap: 4 }}>
      {offered.map((a) => <SwitchLine key={a.id} label={a.name} on={on.has(a.id)} onChange={() => toggle(a.id)} />)}
      <InDialog said={said} />
    </View>
  );
}

/* ── A room: add (one or several) or edit (RoomSetup.tsx RoomDialog) ── */

function RoomSheet({ code, room, types, existing, onClose, onDone }: {
  code: string; room: RoomSetup | null; types: RoomTypeSetup[]; existing: string[]; onClose: () => void; onDone: (s: Said) => void;
}) {
  const [several, setSeveral] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [f, setF] = useState<RoomForm>({
    number: room?.number ?? "", typeId: room?.roomTypeId ?? types.find((x) => x.isActive)?.id ?? "",
    floor: room?.floor == null ? "" : String(room.floor), smoking: room?.smoking ?? false, active: room?.isActive ?? true,
  });
  const [result, setResult] = useState<string[] | null>(null);
  const [said, setSaid] = useState<Said | null>(null);
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const stuck = useStuck();
  const range = roomRange(from, to);
  const ready = Boolean((several ? range.count > 0 : room || f.number.trim()) && f.typeId);
  const set = <K extends keyof RoomForm>(k: K) => (v: RoomForm[K]) => setF((x) => ({ ...x, [k]: v }));

  async function addSeveral() {
    const done = { added: [] as string[], skipped: [] as string[], refused: [] as string[], unknown: null as string | null };
    for (let i = 0; i < range.count; i++) {
      const n = range.nth(i);
      try {
        await addRoom(code, roomBody({ ...f, number: n }, false));
        done.added.push(n);
      } catch (e) {
        /* Nothing came back for this one: whether it was added is not known, so the run stops here (MEMORY 16). */
        if (outcomeUnknown(e)) { stuck.stop(e); done.unknown = n; break; }
        if (existing.includes(n)) done.skipped.push(n);
        else done.refused.push(`${n} not added: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    setResult(severalWords(done));
  }

  async function save() {
    if (!ready || latch.current || stuck.isStuck()) return;
    latch.current = true; setBusy(true); setSaid(null);
    try {
      if (several) { await addSeveral(); return; }
      if (room) await amendRoom(code, room.number, roomBody(f, true));
      else await addRoom(code, roomBody(f, false));
      onDone({ title: room ? "Saved" : `Room ${f.number.trim()} added`, tone: "ok" });
      onClose();
    } catch (e) {
      if (!room && stuck.stop(e)) { const n = notKnown("added", "the rooms"); setSaid({ title: n.title, body: n.body, tone: "bad" }); }
      else setSaid(saidOf("Not saved", e));
    } finally { latch.current = false; setBusy(false); }
  }

  function remove() {
    if (!room) return;
    confirm(`Remove room ${room.number}`,
      `Remove room ${room.number} for good? Only a room nothing has used can be removed - no booking, stay, housekeeping, key card, block, work order, lost item, wake-up call, equipment or guest link; otherwise switch Sellable off.`,
      `Remove room ${room.number}`, () => {
        if (latch.current) return;
        latch.current = true; setBusy(true); setSaid(null);
        removeRoom(code, room.number)
          .then((r) => { onDone({ title: `Room ${room.number} removed`, body: r.unlinked ? `Its connecting door to room ${r.unlinked} was taken off.` : undefined, tone: "ok" }); onClose(); })
          .catch((e: unknown) => setSaid(saidOf("Not removed", e)))
          .finally(() => { latch.current = false; setBusy(false); });
      });
  }

  /* Once rooms were added, closing shows them on the page (RoomSetup.tsx 733). */
  if (result) {
    return (
      <Sheet title="Add a room" onClose={onClose} foot={<Btn label="Done" variant="primary" onPress={onClose} />}>
        <View accessibilityRole="summary" style={{ gap: 6 }}>
          {result.map((line, i) => <Text key={line} style={[body, { color: i === 0 ? c.ink900 : line.includes("not added") || line.startsWith("Not known") ? c.red700 : c.grey600 }]}>{line}</Text>)}
        </View>
      </Sheet>
    );
  }

  const label = busy ? "Saving…" : !several ? "Save" : range.count ? `Add ${plural(range.count)}` : "Add rooms";
  const foot = (
    <>
      <InDialog said={said} />
      {stuck.stuck ? <Text style={[t.caption, { color: c.red700 }]}>{notKnown("added", "the rooms").line}</Text> : null}
      <View style={{ flexDirection: "row", gap: 8 }}>
        {room ? <Btn label="Remove" variant="ghost" disabled={busy} onPress={remove} /> : null}
        <Btn label="Cancel" grow onPress={onClose} />
        <Btn label={label} variant="primary" grow disabled={!ready || busy || stuck.stuck} onPress={() => void save()} />
      </View>
    </>
  );
  const offered = types.filter((x) => x.isActive || x.id === room?.roomTypeId).map((x) => ({ value: x.id, label: `${x.name} (${x.code})` }));

  return (
    <Sheet title={room ? `Room ${room.number}` : "Add a room"} onClose={onClose} foot={foot}>
      {!room ? <SwitchLine label="Several rooms" on={several} onChange={setSeveral} /> : null}
      {!room && several ? (
        <>
          <Field label="From" hint="e.g. 101 to 109, A101 to A110, G01 to G12, 111A to 111D." error={range.fromBad}>
            <TextBox label="From" value={from} placeholder="101" caps="characters" maxLength={10} onChangeText={(v) => setFrom(v.trim().toUpperCase())} />
          </Field>
          <Field label="To" hint="At most 100 rooms at a time." error={range.toBad}>
            <TextBox label="To" value={to} placeholder="109" caps="characters" maxLength={10} onChangeText={(v) => setTo(v.trim().toUpperCase())} />
          </Field>
        </>
      ) : !room ? (
        <Field label="Number" hint="At most 10 letters, digits and -, saved in capitals.">
          <TextBox label="Number" value={f.number} placeholder="308" caps="characters" maxLength={10} onChangeText={(v) => set("number")(v.toUpperCase())} />
        </Field>
      ) : null}
      <Field label="Type"><Select label="Type" value={f.typeId} options={offered} onChange={set("typeId")} /></Field>
      <Field label="Floor" hint="0 (the ground floor) to 99. Leave blank if the property has one floor.">
        <TextBox label="Floor" value={f.floor} keyboardType="number-pad" maxLength={2} onChangeText={(v) => set("floor")(typedCount(v))} />
      </Field>
      <SwitchLine label="Smoking room" on={f.smoking} onChange={set("smoking")} />
      {room ? (
        <SwitchLine label="Sellable" on={f.active} onChange={set("active")}
          hint={room.occupied
            ? "Somebody is in this room, so it cannot be retired. Block it instead - a block carries dates and a reason."
            : "Switching it off takes it out of the sellable house. For a fault with an end date, use a block."} />
      ) : null}
    </Sheet>
  );
}
