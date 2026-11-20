import { AlertCircle, ChevronDown, ChevronRight, Circle, ExternalLink, Plus, X } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Linking, Platform, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { ON_THE_WEBSITE, phoneRoute } from "../../core/menu";
import { c, face, space, t } from "../../core/theme";
import { Contact, s as core, keys, ripple, shade } from "../../core/ui";
import { Btn, Choose, Field, Pill, Sheet, Toast, body, useSaid } from "../admin/kit";
import type { AdminProps } from "../admin/Route";
import {
  CardHead, PageFrame, Read, StuckLine, Value, mayEditHere, readOnlyLine, refusedPage, usePage, useWrites, type Writes,
} from "./PropertyKit";
import { amendProperty, readProfilePage, saveRegistrations, setFssai } from "./propertyData";
import {
  PROPERTY_TYPES, checkAddress, checklistLine, mapPoint, showsChecklist, typeWord,
  type Commissioning, type CommissioningCheck, type PropertyDetail, type ProfileField, type Registration,
} from "./propertyRules";

/* ══════════════════════════════════════════════════════════════════
   PROFILE on a phone — Settings → Property → Profile (the web's
   pages/property/Profile.tsx; picture all/70 as dev-gm): the setup
   checklist (flows/CommissioningCard.tsx, drawn only while something is
   missing, its reasons folded as the web folds them on a phone), the
   profile card (components/PropertyProfileCard.tsx) with Edit
   (Properties.tsx EditPropertyDialog, with the profile's fields), the
   FSSAI number (Property.tsx FssaiCard), then up to four more registration
   numbers and the map point (RegistrationsCard.tsx).

   Reads: GET /:code/commissioning, GET /api/admin/hotels/:code (each null
   for whoever may not, as the web), GET /:code/property-profile. Writes:
   PATCH /api/admin/hotels/:code (app.manages_hotel; the name a group
   administrator's - the web draws Edit for everybody and lets the server
   answer, so does the phone), PUT /:code/fssai and /registrations
   (`room_config` edit). The phone and email open the dialler and mail; the
   map point opens the phone's map.
   ══════════════════════════════════════════════════════════════════ */

export function PropProfile({ hotel, role, who }: AdminProps) {
  const code = hotel.code;
  const refused = refusedPage(role, "/settings/property/profile", "Profile");
  const { said, say, close } = useSaid();
  const { q, stop } = usePage(code, "profile", () => (refused ? Promise.resolve(null) : readProfilePage(code)));
  const w = useWrites(stop, q.reload, say);
  const [pulled, setPulled] = useState(false);
  const [editing, setEditing] = useState(false);
  const mayEdit = mayEditHere(role);
  return (
    <View style={{ flex: 1 }}>
      <PageFrame hotel={hotel.name} title="Profile" under="The name, address and numbers the hotel prints, and where it is."
        refused={refused} refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        <Read q={q} what="the profile">
          {(d) => d ? (
            <>
              <StuckLine stuck={w.stuck} />
              {showsChecklist(d[0]) ? <Checklist d={d[0]} code={code} /> : null}
              {d[1] ? <ProfileCard p={d[1].property} onEdit={() => setEditing(true)} off={w.off} /> : null}
              {d[1] ? <Fssai code={code} value={d[1].property.fssaiNumber} mayEdit={mayEdit} w={w} /> : null}
              <Registrations code={code} rows={d[2].registrations} map={d[2].map} mayEdit={mayEdit} w={w} />
              {!mayEdit ? <Text style={t.caption}>{readOnlyLine("Changing the property's profile")}</Text> : null}
              {editing && d[1] ? (
                <EditProperty p={d[1].property} nameLocked={!who.scope.isGroupAdmin} w={w} onClose={() => setEditing(false)} />
              ) : null}
            </>
          ) : null}
        </Read>
      </PageFrame>
      <Toast said={said} onClose={close} />
    </View>
  );
}

/* ── What this property still needs (CommissioningCard.tsx) ───────── */

function Checklist({ d, code }: { d: Commissioning; code: string }) {
  const outstanding = d.checks.filter((x) => !x.done);
  const blocking = outstanding.some((x) => x.blocking);
  const ring = blocking ? c.yellow100 : c.grey200;
  const setup = phoneRoute("/settings/property/set-up-this-hotel", code);
  return (
    <View style={[core.card, { gap: 10, backgroundColor: blocking ? c.yellow50 : c.white, borderColor: ring, paddingBottom: 0 }]}>
      <Text style={t.heading} accessibilityRole="header">{`Before ${d.property} can take a guest`}</Text>
      <Pill tone={d.canTakeABooking ? "success" : "warning"} dot>{`${d.done} of ${d.total} settled`}</Pill>
      <Text style={[body, { color: c.grey600 }]}>{checklistLine(d)}</Text>
      {setup ? (
        <Pressable onPress={() => router.push(setup as never)} accessibilityRole="link" android_ripple={ripple}
          style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={[t.label, { color: c.orange700, ...face[600] }]}>Set up this hotel, step by step</Text>
          <ChevronRight size={16} color={c.orange700} />
        </Pressable>
      ) : null}
      <View style={{ marginHorizontal: -space.cardX, borderTopWidth: 1, borderColor: ring }}>
        {outstanding.map((x, i) => <CheckRow key={x.id} check={x} code={code} first={i === 0} ring={ring} />)}
      </View>
    </View>
  );
}

/** On a phone the reasons fold (the owner's D27-223): a tap shows why, and the reason opens the screen that settles it. */
function CheckRow({ check, code, first, ring }: { check: CommissioningCheck; code: string; first: boolean; ring: string }) {
  const [open, setOpen] = useState(false);
  const Icon = check.blocking ? AlertCircle : Circle;
  const route = check.to ? phoneRoute(checkAddress(check.to, code), code) : null;
  const label = (
    <Text style={[t.label, { flex: 1, fontSize: 16, color: c.ink900 }]}>
      {check.label}{!check.blocking ? <Text style={[t.label, { color: c.grey500 }]}> · not blocking</Text> : null}
    </Text>
  );
  return (
    <View style={{ borderTopWidth: first ? 0 : 1, borderColor: ring }}>
      <Pressable onPress={check.detail ? () => setOpen((o) => !o) : undefined} accessibilityRole="button" accessibilityState={{ expanded: open }}
        android_ripple={ripple} style={{ minHeight: 56, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: space.cardX, paddingVertical: 12 }}>
        <Icon size={16} color={check.blocking ? c.yellow800 : c.grey500} />
        {label}
        {check.detail ? <ChevronDown size={16} color={c.grey500} style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }} /> : null}
      </Pressable>
      {open && check.detail ? (
        <View style={{ paddingLeft: space.cardX + 26, paddingRight: space.cardX, paddingBottom: 12 }}>
          {route ? (
            <Pressable onPress={() => router.push(route as never)} accessibilityRole="link" style={{ minHeight: 44, flexDirection: "row", gap: 8 }}>
              <Text style={[body, { flex: 1, color: c.grey600 }]}>{check.detail}</Text>
              <ChevronRight size={16} color={c.grey500} />
            </Pressable>
          ) : (
            <Text style={[body, { color: c.grey600 }]}>{check.detail}{check.to ? ` (${ON_THE_WEBSITE.toLowerCase()})` : ""}</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

/* ── The profile card (PropertyProfileCard.tsx) ───────────────────── */

type P = PropertyDetail["property"];
const Pair = ({ children }: { children: ReactNode }) => <View style={{ flexDirection: "row", gap: 16 }}>{children}</View>;

function ProfileCard({ p, onEdit, off }: { p: P; onEdit: () => void; off: boolean }) {
  return (
    <View style={[core.card, { gap: 14 }]}>
      <CardHead title="Profile" line="The name, address, GSTIN, phone and email print on this property's invoices."
        action={<Btn label="Edit" disabled={off} onPress={onEdit} />} />
      <View style={{ gap: 14, borderTopWidth: 1, borderColor: c.grey100, paddingTop: 14 }}>
        <Value label="Name" value={p.name} />
        <Pair><Value label="Property type" value={typeWord(p.propertyType)} /><Value label="Stars" value={p.starRating?.toString()} /></Pair>
        <Value label="Address" value={p.addressLine} />
        <Value label="Address line 2" value={p.addressLine2} />
        <Pair><Value label="City" value={p.city} /><Value label="State" value={p.state} /></Pair>
        <Pair><Value label="PIN code" value={p.pin} /><Value label="Map point" value={mapPoint(p)} /></Pair>
        <Pair>
          <Value label="Phone">{p.phone ? <Contact kind="tel" value={p.phone} style={[t.label, { fontSize: 16 }]} /> : undefined}</Value>
          <Value label="Reservations phone">{p.reservationsPhone ? <Contact kind="tel" value={p.reservationsPhone} style={[t.label, { fontSize: 16 }]} /> : undefined}</Value>
        </Pair>
        <Value label="Reservations contact" value={p.reservationsContact} />
        <Value label="Email">{p.email ? <Contact kind="mailto" value={p.email} style={[t.label, { fontSize: 16 }]} /> : undefined}</Value>
        <Value label="Website" value={p.website} />
        <Pair><Value label="GSTIN" value={p.gstin} /><Value label="PAN" value={p.pan} /></Pair>
      </View>
    </View>
  );
}

/* ── FSSAI (Property.tsx FssaiCard) ───────────────────────────────── */

function Fssai({ code, value, mayEdit, w }: { code: string; value: string | null; mayEdit: boolean; w: Writes }) {
  const [typed, setTyped] = useState<string | null>(null);
  const save = () => void w.write(() => setFssai(code, typed ?? ""), {
    ok: () => ({ title: "FSSAI licence number saved", body: "It prints on food bills from now on.", tone: "ok" }),
    done: "saved", where: "the FSSAI licence number", after: () => setTyped(null),
  });
  return (
    <View style={[core.card, { gap: 10 }]}>
      {typed === null ? (
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[t.label, { color: c.grey600 }]}>FSSAI licence number</Text>
            <Text style={[t.figure, { color: value === null ? c.grey500 : c.ink900 }]}>{value ?? "-"}</Text>
          </View>
          {mayEdit ? <Btn label="Change" disabled={w.off} onPress={() => setTyped(value ?? "")} /> : null}
        </View>
      ) : (
        <>
          <Field label="FSSAI licence number" hint="14 digits, from the licence. Blank for none." maxLength={20} input={keys.count} value={typed} onChangeText={setTyped} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Btn variant="primary" label={w.busy ? "…" : "Save"} disabled={w.off} onPress={save} />
            <Btn variant="ghost" label="Cancel" disabled={w.busy} onPress={() => setTyped(null)} />
          </View>
        </>
      )}
    </View>
  );
}

/* ── More registration numbers, and the map (RegistrationsCard.tsx) ── */

function Registrations({ code, rows: saved, map, mayEdit, w }: {
  code: string; rows: Registration[]; map: { latitude: number; longitude: number } | null; mayEdit: boolean; w: Writes;
}) {
  const [typed, setTyped] = useState<Registration[] | null>(null);
  const rows = typed ?? saved;
  const set = (i: number, patch: Partial<Registration>) => setTyped(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const save = () => void w.write(() => saveRegistrations(code, rows), {
    ok: () => ({ title: "Registration numbers saved", tone: "ok" }), done: "saved", where: "the registration numbers", after: () => setTyped(null),
  });
  const box = { flex: 1, minHeight: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, fontSize: 16, color: mayEdit ? c.ink900 : c.grey600, backgroundColor: mayEdit ? c.white : c.grey50, ...face[500] };
  /* NATIVE.md: a place opens each phone's own map. */
  const openMap = () => {
    if (!map) return;
    const at = `${map.latitude},${map.longitude}`;
    void Linking.openURL(Platform.OS === "ios" ? `maps:?q=${at}&ll=${at}` : `geo:${at}?q=${at}`)
      .catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${at}`).catch(() => undefined));
  };
  return (
    <View style={[core.card, { gap: 12 }]}>
      <CardHead title="More registration numbers" line="Up to four, each with its own name. Kept here; not printed on bills." />
      {rows.length === 0 ? <Text style={[t.label, { fontSize: 16, color: c.grey500 }]}>None.</Text> : null}
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <TextInput accessibilityLabel={`Label ${i + 1}`} placeholder="Trade licence" placeholderTextColor={c.grey400} maxLength={40} value={r.label}
            editable={mayEdit} onChangeText={(v) => set(i, { label: v })} style={box} />
          <TextInput accessibilityLabel={`Number ${i + 1}`} placeholder="Number" placeholderTextColor={c.grey400} maxLength={40} value={r.number}
            editable={mayEdit} autoCapitalize="characters" autoCorrect={false} onChangeText={(v) => set(i, { number: v })} style={box} />
          {mayEdit ? (
            <Pressable onPress={() => setTyped(rows.filter((_, j) => j !== i))} accessibilityRole="button" accessibilityLabel={`Remove number ${i + 1}`}
              hitSlop={4} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
              <X size={18} color={c.grey500} />
            </Pressable>
          ) : null}
        </View>
      ))}
      {mayEdit ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
          <Btn variant="ghost" label="Add" a11y="Add a number" icon={<Plus size={16} color={rows.length >= 4 ? c.grey400 : c.grey700} />}
            disabled={rows.length >= 4} onPress={() => setTyped([...rows, { label: "", number: "" }])} />
          <Btn label={w.busy ? "…" : "Save"} a11y="Save the numbers" disabled={w.off || typed === null} onPress={save} />
        </View>
      ) : null}
      <View style={{ borderTopWidth: 1, borderColor: c.grey100, paddingTop: 8 }}>
        {map ? (
          <Pressable onPress={openMap} accessibilityRole="link" android_ripple={ripple}
            style={shade(({ pressed }) => ({ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, opacity: pressed ? 0.7 : 1 }))}>
            <Text style={[t.label, { color: c.ink900 }]}>Open on map</Text>
            <ExternalLink size={14} color={c.ink900} />
          </Pressable>
        ) : <Text style={[body, { color: c.grey500 }]}>No map point yet: it is set with the profile's latitude and longitude.</Text>}
      </View>
    </View>
  );
}

/* ── Edit the property (Properties.tsx EditPropertyDialog, with the profile) ── */

const STARS = ["1", "2", "3", "4", "5"].map((n) => ({ value: n, label: n }));

function EditProperty({ p, nameLocked, w, onClose }: { p: P; nameLocked: boolean; w: Writes; onClose: () => void }) {
  const [f, setF] = useState({
    name: p.name, city: p.city ?? "", state: p.state ?? "", addressLine: p.addressLine ?? "", gstin: p.gstin ?? "",
    phone: p.phone ?? "", email: p.email ?? "",
  });
  const [more, setMore] = useState<Record<ProfileField, string>>({
    addressLine2: p.addressLine2 ?? "", pin: p.pin ?? "", website: p.website ?? "", pan: p.pan ?? "",
    reservationsPhone: p.reservationsPhone ?? "", propertyType: p.propertyType ?? "", starRating: p.starRating?.toString() ?? "",
    latitude: p.latitude ?? "", longitude: p.longitude ?? "", reservationsContact: p.reservationsContact ?? "",
  });
  const put = (k: keyof typeof f, upper = false) => (v: string) => setF((x) => ({ ...x, [k]: upper ? v.toUpperCase() : v }));
  const putMore = (k: ProfileField, upper = false) => (v: string) => setMore((x) => ({ ...x, [k]: upper ? v.toUpperCase() : v }));
  const save = () => void w.write(() => amendProperty(p.code, {
    name: f.name.trim(), city: f.city.trim(), state: f.state.trim(), gstin: f.gstin.trim(), phone: f.phone.trim(),
    email: f.email.trim(), addressLine: f.addressLine.trim(), ...more,
  }, "profile"), {
    ok: () => ({ title: `${f.name.trim()} saved`, tone: "ok" }), done: "saved", where: "the profile", after: onClose,
  });
  return (
    <Sheet open title={`Edit ${p.name}`} description="These print on this property's invoices." onClose={onClose} closable={!w.busy}
      footer={<>
        <Btn label="Cancel" onPress={onClose} disabled={w.busy} grow />
        <Btn variant="primary" label={w.busy ? "…" : "Save"} disabled={w.off || !f.name.trim()} onPress={save} grow />
      </>}>
      <Field label="Code" hint="In every URL and every invoice number. It cannot be changed." value={p.code} editable={false} onChangeText={() => undefined} />
      <Field label="Name" required hint={nameLocked ? "A group administrator changes the name." : undefined} editable={!nameLocked} value={f.name} onChangeText={put("name")} input={keys.name} />
      <Field label="City" value={f.city} onChangeText={put("city")} input={keys.name} />
      <Field label="State" value={f.state} onChangeText={put("state")} input={keys.name} />
      <Field label="Address" value={f.addressLine} onChangeText={put("addressLine")} />
      <Field label="Address line 2" value={more.addressLine2} onChangeText={putMore("addressLine2")} />
      <Field label="PIN code" hint="Six digits." maxLength={6} input={keys.count} value={more.pin} onChangeText={putMore("pin")} />
      <Field label="GSTIN" hint="Fifteen characters, the two-digit state code first. It prints on every invoice." input={keys.code} value={f.gstin} onChangeText={put("gstin", true)} />
      <Field label="Phone" input={keys.phone} value={f.phone} onChangeText={put("phone")} />
      <Field label="Email" input={keys.email} value={f.email} onChangeText={put("email")} />
      <Choose label="Property type" none="Not set" value={more.propertyType} onChange={putMore("propertyType")}
        choices={PROPERTY_TYPES.map(([value, label]) => ({ value, label }))} />
      <Choose label="Stars" none="Not set" value={more.starRating} onChange={putMore("starRating")} choices={STARS} />
      <Field label="Latitude" hint="The map point: both, or neither." input={{ keyboardType: "numbers-and-punctuation", inputMode: "decimal" }} value={more.latitude} onChangeText={putMore("latitude")} />
      <Field label="Longitude" input={{ keyboardType: "numbers-and-punctuation", inputMode: "decimal" }} value={more.longitude} onChangeText={putMore("longitude")} />
      <Field label="Reservations contact" hint={'The person a guest asks for. Printed on the booking voucher as "Contact".'} maxLength={80} input={keys.name} value={more.reservationsContact} onChangeText={putMore("reservationsContact")} />
      <Field label="Reservations phone" hint="Kept here. It prints on no document." input={keys.phone} value={more.reservationsPhone} onChangeText={putMore("reservationsPhone")} />
      <Field label="Website" hint="Kept here. It prints on no document." input={{ keyboardType: "url", autoCapitalize: "none", autoCorrect: false }} value={more.website} onChangeText={putMore("website")} />
      <Field label="PAN" hint="Ten characters. Kept here; it prints on no document." maxLength={10} input={keys.code} value={more.pan} onChangeText={putMore("pan", true)} />
      {w.stuck ? <StuckLine stuck /> : null}
    </Sheet>
  );
}

