import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { AlertTriangle, Armchair, ChevronRight, Plus, Upload } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { ExportButtons } from "../../core/Export";
import { ON_THE_WEBSITE } from "../../core/menu";
import { c, face, space, t } from "../../core/theme";
import { Head, notKnown, ripple, Screen, useRead, useStuck } from "../../core/ui";
import {
  Act, Back, body, Box, Btn, Dialog, Empty, Failed, Fact, Field, Foot, IconChip, InDialog, Input, Loading, NotYours, Pill,
  Refused, saidOf, Segmented, Select, Stale, Toast, type Said,
} from "../housekeeping/careKit";
import { addEquipment, readEquipment, readEquipmentApprovals, readOptions } from "./data";
import { DecideButtons } from "./Decide";
import {
  ADD_REFUSED, addBody, askedLine, costText, endsText, EXPORT_REFUSED, headLine, heldText, ITEM_COLUMNS, itemRow, may,
  pillsOf, placesOf, placeText, shownOf, STATUS_LABEL, waitingOf, waitingTitle, whyNotAdd,
  type AddForm, type EquipmentItem, type StatusFilter,
} from "./register";

/* ══════════════════════════════════════════════════════════════════
   EQUIPMENT on a phone - the web's /h/:code/equipment (16 Nov release):
   pages/EquipmentRegister.tsx and flows/AddEquipmentDialog.tsx. The
   picture: reference/pms-shots/all/32-store-and-equipment-equipment (31 Oct,
   as the GM): the head and its line, Export · Import · Add an item, Where
   and Status, a card per line with its labelled figures.
   Everything durable in the hotel, filtered by place and status. What waits
   in the one approvals inbox is listed at the top, beside the thing it is
   about, decided through the app's Approvals (Decide.tsx). A control the
   person may not use is grey with who may (register.ts whoMay), never
   hidden. A cost or a warranty nobody typed is a dash. Every write is
   refused offline in the web's words (data.ts).
   Left on the website: Import (it reads a file - no picker on the phone)
   and the add form's three dates (no date picker): MODULE.md.
   ══════════════════════════════════════════════════════════════════ */

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Any status" }, { value: "in_use", label: STATUS_LABEL.in_use },
  { value: "under_repair", label: STATUS_LABEL.under_repair }, { value: "retired", label: STATUS_LABEL.retired },
];

export function Register({ hotel, role, onBack }: { hotel: Hotel; role: string | null; onBack: () => void }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const q = useRead(() => readEquipment(code), ["equipment", code, "list"]);
  const inbox = useRead(() => readEquipmentApprovals(code), ["equipment", code, "approvals"]);
  const [place, setPlace] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [adding, setAdding] = useState(false);
  const [pulled, setPulled] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  const unsay = useCallback(() => setSaid(null), []);
  useEffect(() => { if (!q.loading) setPulled(false); }, [q.loading]);

  const refresh = () => {
    void cache.invalidateQueries({ queryKey: ["equipment", code] });
    void cache.invalidateQueries({ queryKey: ["approvals", code] });
  };
  const items = q.data;
  const refused = !items && q.error && /is for .*Ask one of them\.$/.test(q.error) ? q.error : null;
  const places = items ? placesOf(items) : [];
  const shown = items ? shownOf(items, place, status) : [];
  const waiting = items ? waitingOf(items) : [];
  const mayCreate = may(role, "create");
  const filtered = place !== "all" || status !== "all";

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); inbox.reload(); }}>
        <Head title="Equipment" under={headLine(items)} action={<Back onPress={onBack} />} />
        <View style={{ gap: 10 }}>
          {/* The register's own export right (D27-383 item 1): what the list shows. */}
          {may(role, "export") ? (
            <ExportButtons table={items ? {
              title: "Equipment", subtitle: [hotel.name, place !== "all" ? places.find((p) => p.value === place)?.label : null, status !== "all" ? STATUS_LABEL[status] : null].filter(Boolean).join(" · "),
              columns: ITEM_COLUMNS, rows: shown.map(itemRow),
            } : null} />
          ) : <Text style={[t.caption, { color: c.grey600 }]}>{EXPORT_REFUSED()}</Text>}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "flex-start" }}>
            <Refused label="Import" icon={Upload} reason={mayCreate ? ON_THE_WEBSITE : ADD_REFUSED()} />
          </View>
          <Act label="Add an item" icon={Plus} variant="primary" reason={mayCreate ? null : ADD_REFUSED()} onPress={() => setAdding(true)} />
        </View>
        <Stale error={items ? q.error : undefined} />

        {!items ? (
          refused ? <NotYours title="Equipment" sentence={refused} />
            : q.error ? <Failed title="The register did not load" error={q.error} onRetry={q.reload} />
              : <Loading words="Reading the register…" />
        ) : (
          <>
            {waiting.length > 0 ? (
              <View style={{ borderRadius: 12, borderWidth: 1, borderColor: c.yellow100, backgroundColor: c.yellow50, paddingHorizontal: space.cardX, paddingVertical: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <IconChip Icon={AlertTriangle} tone="yellow" />
                  <Text style={[t.heading, { flex: 1 }]}>{waitingTitle(waiting.length)}</Text>
                </View>
                {waiting.map((w) => (
                  <View key={w.approvalId} style={{ borderTopWidth: 1, borderTopColor: c.yellow100, marginTop: 12, paddingTop: 12 }}>
                    <Text style={[body, { color: c.ink900 }]}>
                      <Text style={{ color: c.orange700, ...face[600] }} onPress={() => router.push(`/equipment/${code}/${w.item.id}`)} accessibilityRole="link">{w.item.name}</Text>
                      {` (${heldText(w.item)}, ${w.item.place}) ${w.what}`}
                    </Text>
                    <Text style={[body, { color: c.grey600, marginTop: 2 }]}>{askedLine(w)}</Text>
                    <DecideButtons code={code} approval={inbox.data?.find((a) => a.id === w.approvalId)} loading={inbox.loading && !inbox.data}
                      approveLabel="Approve" onDone={(s) => { setSaid(s); refresh(); }} />
                  </View>
                ))}
              </View>
            ) : null}

            {items.length > 0 ? (
              <View style={{ gap: 12 }}>
                <Field label="Where">
                  <Select label="Where" value={place} onChange={setPlace} options={[{ value: "all", label: "Everywhere" }, ...places]} />
                </Field>
                <Field label="Status">
                  <Select label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
                </Field>
              </View>
            ) : null}

            {items.length === 0 ? (
              <Box>
                <Empty Icon={Armchair} title="Nothing in the register yet"
                  description={"Each AC, TV and fridge one by one with its tag, and cheaper things as a count in one place - twelve kettles in room 104 is one line. Type them in, or import the list from a file. Nothing is filled in for you: a cost or a warranty nobody enters shows a dash."} />
              </Box>
            ) : shown.length === 0 ? (
              <Box>
                <Empty compact title="Nothing matches these filters" description="Clear them to see the whole register." />
                <View style={{ alignItems: "center", paddingBottom: 20 }}>
                  <Btn label="Clear filters" onPress={() => { setPlace("all"); setStatus("all"); }} />
                </View>
              </Box>
            ) : shown.map((i) => <Line key={i.id} i={i} today={hotel.businessDate} onPress={() => router.push(`/equipment/${code}/${i.id}`)} />)}
            {filtered && shown.length > 0 ? <Text style={[t.caption]}>{`${shown.length} of ${items.length} lines`}</Text> : null}
          </>
        )}
      </Screen>
      <Toast said={said} onClose={unsay} />
      {adding ? (
        <AddDialog code={code} onClose={() => { setAdding(false); refresh(); }}
          onAdded={(id, s) => { setAdding(false); setSaid(s); refresh(); router.push(`/equipment/${code}/${id}`); }} />
      ) : null}
    </View>
  );
}

/** One line as the web's DataTable draws it at phone width: a card of labelled figures. */
function Line({ i, today, onPress }: { i: EquipmentItem; today: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${i.name}, ${placeText(i)}, ${STATUS_LABEL[i.status]}`}
      android_ripple={ripple}
      style={({ pressed }) => ({ backgroundColor: pressed && Platform.OS === "ios" ? c.grey50 : c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, paddingHorizontal: space.cardX, paddingVertical: space.cardY, overflow: "hidden" })}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <View>
            <Text style={[t.heading, face[500]]}>{i.name}</Text>
            {i.category ? <Text style={[body, { color: c.grey500, fontSize: 16 }]}>{i.category}</Text> : null}
          </View>
          <Fact label="Tag or count">{heldText(i)}</Fact>
          <Fact label="Where">{placeText(i)}</Fact>
          <Fact label="Status">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{pillsOf(i).map((p) => <Pill key={p.label} tone={p.tone}>{p.label}</Pill>)}</View>
          </Fact>
          <Fact label="Cost">{costText(i)}</Fact>
          <Fact label="Warranty ends">{endsText(i.warrantyEnds, today)}</Fact>
        </View>
        <ChevronRight size={18} color={c.grey500} />
      </View>
    </Pressable>
  );
}

/* ── Adding a thing to the register (AddEquipmentDialog) ─────────── */

function AddDialog({ code, onClose, onAdded }: { code: string; onClose: () => void; onAdded: (id: string, s: Said) => void }) {
  const options = useRead(() => readOptions(code), ["equipment", code, "options"]);
  const o = options.data;
  const [f, setF] = useState<AddForm>({
    name: "", category: "", heldAs: "tagged", tag: "", quantity: "", whereKind: "room", roomId: "", locationId: "", supplierId: "", unitCost: "", status: "in_use",
  });
  const set = (patch: Partial<AddForm>) => setF((x) => ({ ...x, ...patch }));
  /* The offered tag arrives with the options, once: a label typed over it is kept. */
  const offered = useRef(false);
  useEffect(() => { if (o && !offered.current) { offered.current = true; set({ tag: o.nextTag }); } }, [o]);
  const [said, setSaid] = useState<Said | null>(null);
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  /* POST /equipment reads no key: a counted line would be added twice. */
  const stuck = useStuck();
  const why = stuck.stuck ? "Not known whether it was added: close this and look at the register first." : whyNotAdd(f);

  async function add() {
    if (latch.current || stuck.isStuck() || why) return;
    latch.current = true;
    setBusy(true);
    setSaid(null);
    try {
      const res = await addEquipment(code, addBody(f));
      onAdded(res.id, { title: `${f.name.trim()} added`, tone: "ok" });
    } catch (e) {
      if (stuck.stop(e)) {
        const k = notKnown("added", "the register", e);
        setSaid({ title: k.title, body: k.body, tone: "held" });
      } else setSaid(saidOf("Not added", e));
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }

  const noPlaces = (o?.places.length ?? 0) === 0;
  const noSuppliers = (o?.suppliers.length ?? 0) === 0;
  return (
    <Dialog title="Add an item" description="Something durable the property owns." onClose={onClose}>
      {!o ? (
        options.error ? <Text style={[body, { color: c.red700 }]}>{`The rooms and places could not be loaded, so nothing can be added yet. ${options.error}`}</Text>
          : <Loading words="Reading the rooms and places…" />
      ) : (
        <>
          <Field label="What is it" required>
            <Input label="What is it" value={f.name} onChangeText={(v) => set({ name: v })} placeholder="Split AC 1.5 ton" />
          </Field>
          <Field label="Category" hint="Pick one this property already uses, or type a new one.">
            <Input label="Category" value={f.category} onChangeText={(v) => set({ category: v })} placeholder="Appliance" />
            {o.categories.length ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {o.categories.map((k) => <Btn key={k.id} label={k.name} variant={f.category === k.name ? "primary" : "secondary"} onPress={() => set({ category: k.name })} />)}
              </View>
            ) : null}
          </Field>
          <Field label="How is it kept track of">
            <Segmented label="How is it kept track of" value={f.heldAs} onChange={(v) => set({ heldAs: v })}
              options={[{ value: "tagged", label: "One by one, with a tag" }, { value: "counted", label: "A count in one place" }]} />
          </Field>
          {f.heldAs === "tagged" ? (
            <Field label="Tag" required hint="The next free number is offered. If the item already carries a printed label, type that instead.">
              <Input label="Tag" value={f.tag} onChangeText={(v) => set({ tag: v })} autoCapitalize="characters" />
            </Field>
          ) : (
            <Field label="How many" required hint="Twelve kettles in one room is one line of 12.">
              <Input label="How many" value={f.quantity} onChangeText={(v) => set({ quantity: v })} placeholder="12" keyboardType="number-pad" inputMode="numeric" />
            </Field>
          )}
          <Field label="Where is it" required>
            <Segmented label="Where is it" value={f.whereKind} onChange={(v) => set({ whereKind: v })}
              options={[{ value: "room", label: "A room" }, { value: "place", label: "Another place" }]} />
            {f.whereKind === "room" ? (
              <Select label="Room" value={f.roomId} placeholder="Choose a room" onChange={(v) => set({ roomId: v })}
                options={o.rooms.map((r) => ({ value: r.id, label: `Room ${r.number}` }))} />
            ) : noPlaces ? (
              <Text style={body}>No places other than rooms are set up at this property yet - the lobby, the kitchen, the restaurant. Until they are, choose a room.</Text>
            ) : (
              <Select label="Place" value={f.locationId} placeholder="Choose a place" onChange={(v) => set({ locationId: v })}
                options={o.places.map((p) => ({ value: p.id, label: `${p.name}${p.kind === "store" ? " (a store)" : ""}` }))} />
            )}
          </Field>
          <Field label="Status">
            <Select label="Status" value={f.status} onChange={(v) => set({ status: v })}
              options={[{ value: "in_use", label: "In use" }, { value: "under_repair", label: "Under repair" }]} />
          </Field>
          <Field label="Supplier" hint={noSuppliers ? "No suppliers are set up at this property yet. Leave it blank." : "Blank if nobody knows."}>
            <Select label="Supplier" value={f.supplierId} disabled={noSuppliers} onChange={(v) => set({ supplierId: v })}
              options={[{ value: "", label: "Not known" }, ...o.suppliers.map((s) => ({ value: s.id, label: s.name }))]} />
          </Field>
          <Field label={f.heldAs === "counted" ? "Cost of one, in rupees" : "Cost, in rupees"} hint="Blank if nobody knows. It shows a dash, never zero.">
            <Input label="Cost, in rupees" value={f.unitCost} onChangeText={(v) => set({ unitCost: v })} keyboardType="decimal-pad" inputMode="decimal" />
          </Field>
          <Field label="Bought on · Warranty ends · Service contract (AMC) ends" hint={`${ON_THE_WEBSITE}: a date needs a date picker on the phone. Left blank they show a dash; add them on the website.`}>
            <Input label="Dates" value="" onChangeText={() => undefined} placeholder={ON_THE_WEBSITE} editable={false} />
          </Field>
        </>
      )}
      <InDialog said={said} />
      <Foot>
        <Btn label="Cancel" grow tall onPress={onClose} />
        <Btn label="Add" variant="primary" grow tall busy={busy} disabled={!o || Boolean(why)} onPress={() => void add()} />
      </Foot>
      {o && why && !said ? <Text style={[t.caption, { color: c.grey600 }]}>{why}</Text> : null}
    </Dialog>
  );
}
