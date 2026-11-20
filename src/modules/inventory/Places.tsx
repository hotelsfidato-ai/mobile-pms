import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react-native";
import { useRef, useState } from "react";
import { Linking, Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, t } from "../../core/theme";
import { Head, Screen, notKnown, useRead, useStuck } from "../../core/ui";
import { PLACE_KIND, PLACE_KINDS, type Place, type PlaceKind, type Supplier } from "./config";
import { readPlaces, savePlace, saveSupplier, type SupplierBody } from "./configData";
import { asRole, mayReach } from "../../core/menu";
import { Btn, Failed, Field, Loading, NotYourRole, Pill, Select, SectionHead, Sheet, Table, TableRow, TextBox, confirm } from "./configKit";
import { Empty, InDialog, Stale, Toast, body, saidOf, type Said } from "./kit";

/* ══════════════════════════════════════════════════════════════════
   PLACES AND SUPPLIERS on a phone — the web's /h/:code/places
   (src/pages/PlacesAndSuppliers.tsx; picture
   pms-shots/all/33-store-and-equipment-places-and-suppliers).

   Where stock is kept and equipment stands, and who it comes from; shared
   by the Store, the equipment register and purchasing. THE SERVER SAYS
   WHO MAY CHANGE THEM (api/src/routes/places.ts keepsPlaces: the owner, an
   administrator, the GM, the hotel manager and the Inventory Manager) and
   sends it with the read (`mayChange`, `whoMay`); the screen repeats it.
   NOTHING IS DELETED: a place or a supplier is switched off - which the
   phone asks first (the brief: retiring asks first; the web switches at
   the tap).
   ══════════════════════════════════════════════════════════════════ */

const dash = (v: string | null) => v ?? "-";
const StatePill = ({ on }: { on: boolean }) => (on ? <Pill tone="success">In use</Pill> : <Pill>Switched off</Pill>);

export function Places({ hotel, role }: { hotel: Hotel; role: string | null }) {
  /* RequireAccess path="/h/:code/places": whoever the menu shows it to (the Store's or equipment's readers). */
  if (!mayReach(asRole(role), "/h/:code/places")) {
    return <Screen refreshing={false} onRefresh={() => undefined}><Head title="Places and suppliers" /><NotYourRole role={role} screen="Places and suppliers" /></Screen>;
  }
  return <PlacesScreen hotel={hotel} />;
}

function PlacesScreen({ hotel }: { hotel: Hotel }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const q = useRead(() => readPlaces(code), ["inventory", code, "places"]);
  const [place, setPlace] = useState<Place | "new" | null>(null);
  const [supplier, setSupplier] = useState<Supplier | "new" | null>(null);
  const [said, setSaid] = useState<Said | null>(null);
  const [pulled, setPulled] = useState(false);
  /* The Store, the register and purchasing pick from these (PlacesAndSuppliers.tsx 83-87). */
  const refresh = () => {
    for (const key of ["inventory", "stores", "purchasing"]) void cache.invalidateQueries({ queryKey: [key, code] });
  };
  const done = (s: Said) => { setSaid(s); refresh(); };
  const may = q.data?.mayChange ?? false;

  const failed = q.data === undefined && q.error
    ? <Failed title="Places and suppliers did not load" what="Places and suppliers" error={q.error} onRetry={q.reload} /> : null;
  const loading = q.data === undefined && !q.error ? <Loading words="Reading places and suppliers…" /> : null;

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        <Head title="Places and suppliers" under="Where stock is kept and equipment stands, and who it comes from." />
        {q.data && !may && q.data.whoMay ? <Text style={[body, { color: c.grey600 }]}>{q.data.whoMay}</Text> : null}
        {q.data ? <Stale error={q.error} /> : null}
        {failed}{loading}
        {q.data ? (
          <>
            <SectionHead title="Places" action={<Btn label="Add a place" icon={Plus} variant="primary" disabled={!may} onPress={() => setPlace("new")} />} />
            {q.data.places.length === 0 ? (
              <Empty title="No places yet" description="Add where stock is kept - a main store, a kitchen store, a bar store - and the other places equipment stands, like the lobby or the office. Rooms are already known; they are not added here." />
            ) : (
              <Table>
                {q.data.places.map((p, i) => (
                  <TableRow key={p.id} first={i === 0} title={p.name} onPress={may ? () => setPlace(p) : undefined} a11y={`${p.name}, ${PLACE_KIND[p.kind] ?? p.kind}`}
                    cells={[{ label: "Kind", value: PLACE_KIND[p.kind] ?? p.kind }, { label: "State", value: <StatePill on={p.isActive} /> }]} />
                ))}
              </Table>
            )}
            <SectionHead title="Suppliers" action={<Btn label="Add a supplier" icon={Plus} disabled={!may} onPress={() => setSupplier("new")} />} />
            {q.data.suppliers.length === 0 ? (
              <Empty title="No suppliers yet" description="Who the property buys stock and equipment from. Only a name is needed; the rest can be added later." />
            ) : (
              <Table>
                {q.data.suppliers.map((s, i) => (
                  <TableRow key={s.id} first={i === 0} title={s.name} sub={s.contact} onPress={may ? () => setSupplier(s) : undefined}
                    cells={[
                      /* A phone number opens the dialler (NATIVE.md). */
                      { label: "Phone", value: s.phone
                        ? <Text style={[t.label, t.tab, { color: c.ink900, textDecorationLine: "underline" }]} accessibilityRole="link"
                            onPress={() => void Linking.openURL(`tel:${s.phone!.replace(/\s+/g, "")}`)}>{s.phone}</Text>
                        : <Text style={[t.label, { color: c.grey500 }]}>-</Text> },
                      { label: "GSTIN", value: <Text style={[t.label, t.tab, { color: s.gstin ? c.ink900 : c.grey500 }]}>{dash(s.gstin)}</Text> },
                      { label: "State", value: <StatePill on={s.isActive} /> },
                    ]} />
                ))}
              </Table>
            )}
          </>
        ) : null}
      </Screen>
      {place !== null ? <PlaceSheet code={code} place={place === "new" ? null : place} onClose={() => setPlace(null)} onDone={done} /> : null}
      {supplier !== null ? <SupplierSheet code={code} supplier={supplier === "new" ? null : supplier} onClose={() => setSupplier(null)} onDone={done} /> : null}
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}

/** One write at a time; an add whose reply was lost takes no more taps (MEMORY 16). */
function useWrite(adding: boolean, where: string) {
  const [said, setSaid] = useState<Said | null>(null);
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const stuck = useStuck();
  const run = async (write: () => Promise<unknown>, after: () => void, failed: string) => {
    if (latch.current || stuck.isStuck()) return;
    latch.current = true; setBusy(true); setSaid(null);
    try { await write(); after(); } catch (e) {
      if (adding && stuck.stop(e)) { const n = notKnown("added", where); setSaid({ title: n.title, body: n.body, tone: "bad" }); }
      else setSaid(saidOf(failed, e));
    } finally { latch.current = false; setBusy(false); }
  };
  return { said, busy, stuck: stuck.stuck, run };
}

function PlaceSheet({ code, place, onClose, onDone }: { code: string; place: Place | null; onClose: () => void; onDone: (s: Said) => void }) {
  const [name, setName] = useState(place?.name ?? "");
  const [kind, setKind] = useState<PlaceKind | "">(place?.kind ?? "");
  const w = useWrite(!place, "the places");
  const ready = name.trim() !== "" && kind !== "";
  const submit = (isActive?: boolean) => {
    const body = { name: name.trim() || place?.name || "", kind: (kind || place?.kind) as PlaceKind, ...(isActive === undefined ? {} : { isActive }) };
    void w.run(() => savePlace(code, place?.id ?? null, body), () => {
      onDone({ title: isActive === false ? `${place?.name} switched off` : isActive === true ? `${place?.name} switched on` : place ? "Saved" : `${name.trim()} added`, tone: "ok" });
      onClose();
    }, place ? "Not saved" : "Not added");
  };
  const toggle = () => {
    if (!place) return;
    if (!place.isActive) return submit(true);
    confirm(`Switch off ${place.name}`, "A place is never deleted: what was kept or stood here still says where. Switch it off and it is no longer offered.", "Switch off", () => submit(false), "Cancel");
  };
  return (
    <Sheet title={place ? place.name : "Add a place"} under={place ? undefined : "Somewhere stock is kept or equipment stands."} onClose={onClose}
      foot={
        <>
          <InDialog said={w.said} />
          {w.stuck ? <Text style={[t.caption, { color: c.red700 }]}>{notKnown("added", "the places").line}</Text> : null}
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {place ? <Btn label={place.isActive ? "Switch off" : "Switch on"} disabled={w.busy} onPress={toggle} /> : null}
            <Btn label="Cancel" grow onPress={onClose} />
            <Btn label={w.busy ? "Saving…" : place ? "Save" : "Add"} variant="primary" grow disabled={!ready || w.busy || w.stuck} onPress={() => submit()} />
          </View>
        </>
      }>
      <Field label="Name"><TextBox label="Name" value={name} placeholder="Main store" caps="words" onChangeText={setName} /></Field>
      <Field label="Kind" hint="A store is where stock is kept. Equipment taken out of a store waits for the Inventory Manager.">
        <Select label="Kind" value={kind} options={PLACE_KINDS.map((k) => ({ value: k, label: PLACE_KIND[k] }))} onChange={(v) => setKind(v as PlaceKind)} />
      </Field>
      {place ? <Text style={[body, { color: c.grey600 }]}>A place is never deleted: what was kept or stood here still says where. Switch it off and it is no longer offered.</Text> : null}
    </Sheet>
  );
}

function SupplierSheet({ code, supplier, onClose, onDone }: { code: string; supplier: Supplier | null; onClose: () => void; onDone: (s: Said) => void }) {
  const [v, setV] = useState<SupplierBody>({
    name: supplier?.name ?? "", contact: supplier?.contact ?? "", phone: supplier?.phone ?? "", email: supplier?.email ?? "",
    gstin: supplier?.gstin ?? "", address: supplier?.address ?? "", note: supplier?.note ?? "",
  });
  const w = useWrite(!supplier, "the suppliers");
  const set = (k: keyof SupplierBody) => (x: string) => setV((o) => ({ ...o, [k]: x }));
  const ready = v.name.trim() !== "";
  const submit = (isActive?: boolean) => {
    const body = { ...v, name: v.name.trim() || supplier?.name || "", ...(isActive === undefined ? {} : { isActive }) };
    void w.run(() => saveSupplier(code, supplier?.id ?? null, body), () => {
      onDone({ title: isActive === false ? `${supplier?.name} switched off` : isActive === true ? `${supplier?.name} switched on` : supplier ? "Saved" : `${v.name.trim()} added`, tone: "ok" });
      onClose();
    }, supplier ? "Not saved" : "Not added");
  };
  const toggle = () => {
    if (!supplier) return;
    if (!supplier.isActive) return submit(true);
    confirm(`Switch off ${supplier.name}`, "A supplier is never deleted: deliveries that came from them still say so. Switched off, they are no longer offered.", "Switch off", () => submit(false), "Cancel");
  };
  return (
    <Sheet title={supplier ? supplier.name : "Add a supplier"} under={supplier ? undefined : "Only the name is needed now."} onClose={onClose}
      foot={
        <>
          <InDialog said={w.said} />
          {w.stuck ? <Text style={[t.caption, { color: c.red700 }]}>{notKnown("added", "the suppliers").line}</Text> : null}
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {supplier ? <Btn label={supplier.isActive ? "Switch off" : "Switch on"} disabled={w.busy} onPress={toggle} /> : null}
            <Btn label="Cancel" grow onPress={onClose} />
            <Btn label={w.busy ? "Saving…" : supplier ? "Save" : "Add"} variant="primary" grow disabled={!ready || w.busy || w.stuck} onPress={() => submit()} />
          </View>
        </>
      }>
      <Field label="Name"><TextBox label="Name" value={v.name} placeholder="Solapur Electricals" caps="words" onChangeText={set("name")} /></Field>
      <Field label="Person to call"><TextBox label="Person to call" value={v.contact} caps="words" placeholder="" onChangeText={set("contact")} /></Field>
      <Field label="Phone"><TextBox label="Phone" value={v.phone} keyboardType="phone-pad" placeholder="" onChangeText={set("phone")} /></Field>
      <Field label="Email"><TextBox label="Email" value={v.email} keyboardType="email-address" placeholder="" onChangeText={set("email")} /></Field>
      <Field label="GSTIN" hint="15 characters, as printed on their invoice. Leave blank if you do not have it.">
        <TextBox label="GSTIN" value={v.gstin} caps="characters" maxLength={15} placeholder="" onChangeText={(x) => set("gstin")(x.toUpperCase())} />
      </Field>
      <Field label="Address"><TextBox label="Address" value={v.address} lines={2} placeholder="" onChangeText={set("address")} /></Field>
      <Field label="Note"><TextBox label="Note" value={v.note} lines={2} placeholder="" onChangeText={set("note")} /></Field>
    </Sheet>
  );
}
