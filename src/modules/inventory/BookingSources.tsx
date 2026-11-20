import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Globe, Percent, Plus, type LucideIcon } from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import type { Hotel, HotelsResponse } from "../../core/api";
import { ExportButtons } from "../../core/Export";
import type { ExportTable } from "../../core/exportDoc";
import { c, space, t } from "../../core/theme";
import { Head, Screen, notKnown, useRead, useStuck } from "../../core/ui";
import {
  KIND_TONES, SOURCE_KINDS, commissionDone, commissionNote, commissionOf, commissionValue, kindLabel, sourcesLine, typedFigure,
  type BookingSource, type BookingSourceKind,
} from "./config";
import { addSource, amendSource, readSources, setCommission } from "./configData";
import { Btn, Failed, Field, Loading, Pill, Refused, Select, Sheet, SwitchLine, Table, TableRow, TextBox } from "./configKit";
import { COMMISSION, SOURCES_READ, SOURCE_ADD_REFUSED, SOURCE_CHANGE_REFUSED, isManager, whyNot } from "./configRoles";
import { Empty, InDialog, Stale, Toast, body, saidOf, type Said } from "./kit";
import { SU_CHANNELS, suChannelName } from "./suChannels";

/* ══════════════════════════════════════════════════════════════════
   BOOKING SOURCES on a phone — the web's /h/:code/booking-sources
   (src/modules/guests/pages/BookingSources.tsx; picture
   pms-shots/all/26-configuration-booking-sources).

   THE SCREEN SAYS WHICH HALF IS WHICH: the LIST is the group's (adding
   Agoda adds it everywhere), the COMMISSION is this property's. NO
   COMMISSION IS INVENTED: none agreed is a dash, never 0%. NOTHING IS
   DELETED: a source no longer used is switched off.

   Who: adding and changing a source is the database's app.is_manager()
   (the owner, an Administrator or the GM at any hotel, or a group
   administrator); a commission is roleGate COMMISSION. The web shows
   both buttons to every reader and lets the server refuse; the phone
   draws them disabled with the server's own sentence.
   ══════════════════════════════════════════════════════════════════ */

/* BookingSources.tsx SOURCE_EXPORT: no commission agreed is a dash. */
const exportOf = (rows: BookingSource[], hotel: Hotel): ExportTable => ({
  title: "Booking sources", subtitle: hotel.name,
  columns: ["Source", "Kind", "Channel", "In use", "Commission", "Bookings"],
  rows: rows.map((s) => [s.name, kindLabel(s.kind), suChannelName(s.channelCode) ?? s.channelCode ?? "-", s.isActive ? "Yes" : "No",
    commissionOf(s.commissionPct), String(s.bookings)]),
});

export function BookingSources({ hotel, role, scope }: { hotel: Hotel; role: string | null; scope: HotelsResponse["scope"] }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const cannotRead = whyNot(SOURCES_READ, role);
  const manager = isManager(scope);
  const cannotRate = whyNot(COMMISSION, role);
  const sources = useRead(() => (cannotRead ? Promise.resolve(null) : readSources(code)), ["inventory", code, "booking-sources"]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<BookingSource | null>(null);
  const [rating, setRating] = useState<BookingSource | null>(null);
  const [said, setSaid] = useState<Said | null>(null);
  const [pulled, setPulled] = useState(false);
  /* The list is the group's: every hotel's copy is read again (BookingSources.tsx refresh). */
  const refresh = () => void cache.invalidateQueries({ predicate: (q) => q.queryKey[0] === "inventory" && q.queryKey[2] === "booking-sources" });
  const done = (s: Said) => { setSaid(s); refresh(); };
  const rows = sources.data ?? [];

  let main;
  if (cannotRead) main = <Empty title="Booking sources" description={cannotRead} />;
  else if (sources.data === undefined) {
    main = sources.error
      ? <Failed title="The booking sources did not load" what="The booking sources" error={sources.error} onRetry={sources.reload} />
      : <Loading words="Reading the booking sources…" />;
  } else if (rows.length === 0) {
    main = (
      <View style={{ gap: 12 }}>
        <Empty title="No booking sources yet" description="A source is where a booking arrived from - an OTA, a travel agent, a corporate account, the property's own website, or somebody at the door." />
        {manager ? <View style={{ flexDirection: "row", justifyContent: "center" }}><Btn label="Add the first" onPress={() => setAdding(true)} /></View>
          : <Refused label="Add the first" reason={SOURCE_ADD_REFUSED} />}
      </View>
    );
  } else {
    main = (
      <Table>
        {rows.map((s, i) => (
          <TableRow key={s.id} first={i === 0} title={s.name} sub={s.isActive ? null : "Not offered on new bookings"}
            cells={[
              { label: "Kind", value: <Pill tone={KIND_TONES[s.kind] ?? "neutral"} dot={false}>{kindLabel(s.kind)}</Pill> },
              { label: "Channel code", value: s.channelCode ? `${s.channelCode}${suChannelName(s.channelCode) ? ` · ${suChannelName(s.channelCode)}` : ""}` : "-" },
              { label: "Commission here", value: commissionOf(s.commissionPct) },
              { label: "Bookings here", value: String(s.bookings) },
            ]}
            actions={
              <>
                <Btn label="Commission" icon={Percent} a11y={`${s.name}: commission`} disabled={cannotRate !== null} onPress={() => setRating(s)} />
                <Btn label="Edit" a11y={`Edit ${s.name}`} variant="ghost" disabled={!manager} onPress={() => setEditing(s)} />
              </>
            } />
        ))}
      </Table>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && sources.loading} onRefresh={() => { setPulled(true); sources.reload(); }}>
        <Head title="Booking sources" under={sources.data ? sourcesLine(rows) : cannotRead ? undefined : "Loading…"} />
        {cannotRead ? null : (
          <>
            <ExportButtons table={sources.data ? exportOf(rows, hotel) : null} />
            {manager ? <View style={{ flexDirection: "row" }}><Btn label="Add a source" icon={Plus} variant="primary" onPress={() => setAdding(true)} /></View>
              : <Refused label="Add a source" icon={Plus} variant="primary" reason={SOURCE_ADD_REFUSED} />}
            {/* Which half is which: stated, not inferred (BookingSources.tsx 225-258). */}
            <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 16 }}>
              <Half Icon={Globe} title="The list is the group's"
                text="A source added here appears at every property. Agoda is Agoda everywhere, so the source-mix report can add them up without matching names." />
              <Half Icon={Percent} title="The commission is this property's"
                text="What you agreed here, and nowhere else. It is copied onto each booking as it is taken, so renegotiating later does not restate last month." />
            </View>
            {/* The two refusals, said once under the list (the buttons are grey). */}
            {rows.length > 0 && (cannotRate || !manager) ? (
              <Text style={[t.caption, { color: c.grey600 }]}>
                {[cannotRate, manager ? null : SOURCE_CHANGE_REFUSED].filter(Boolean).join(" ")}
              </Text>
            ) : null}
          </>
        )}
        {sources.data ? <Stale error={sources.error} /> : null}
        {main}
      </Screen>
      {adding ? <SourceSheet code={code} source={null} onClose={() => setAdding(false)} onDone={done} /> : null}
      {editing ? <SourceSheet code={code} source={editing} onClose={() => setEditing(null)} onDone={done} /> : null}
      {rating ? <CommissionSheet code={code} source={rating} onClose={() => setRating(null)} onDone={done} /> : null}
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}

function Half({ Icon, title, text }: { Icon: LucideIcon; title: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: c.grey100, alignItems: "center", justifyContent: "center" }}>
        <Icon size={16} color={c.grey600} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[t.label, { color: c.ink900 }]}>{title}</Text>
        <Text style={[body, { color: c.grey600 }]}>{text}</Text>
      </View>
    </View>
  );
}

/* ── Adding and editing (BookingSources.tsx SourceDialog) ────────── */

function SourceSheet({ code, source, onClose, onDone }: { code: string; source: BookingSource | null; onClose: () => void; onDone: (s: Said) => void }) {
  const [name, setName] = useState(source?.name ?? "");
  const [kind, setKind] = useState<BookingSourceKind>(source?.kind ?? "ota");
  const [channel, setChannel] = useState(source?.channelCode ?? "");
  const [active, setActive] = useState(source?.isActive ?? true);
  const [said, setSaid] = useState<Said | null>(null);
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const stuck = useStuck();

  async function save() {
    if (!name.trim() || latch.current || stuck.isStuck()) return;
    latch.current = true; setBusy(true); setSaid(null);
    try {
      if (source) {
        /* An explicit null CLEARS the code: emptying it means "there is no code". */
        await amendSource(code, source.id, { name: name.trim(), kind, isActive: active, channelCode: channel.trim() || null });
      } else {
        await addSource(code, { name: name.trim(), kind, ...(channel.trim() ? { channelCode: channel.trim() } : {}) });
      }
      onDone({ title: source ? `${name.trim()} saved` : `${name.trim()} added`, tone: "ok" });
      onClose();
    } catch (e) {
      if (!source && stuck.stop(e)) { const n = notKnown("added", "the list"); setSaid({ title: n.title, body: n.body, tone: "bad" }); }
      else setSaid(saidOf("Not saved", e));
    } finally { latch.current = false; setBusy(false); }
  }

  return (
    <Sheet title={source ? `Edit ${source.name}` : "Add a booking source"}
      under={source ? "Changes apply at every property in the group." : "It will be available at every property in the group. The commission is set separately, on this screen, for this property."}
      onClose={onClose}
      foot={
        <>
          <InDialog said={said} />
          {stuck.stuck ? <Text style={[t.caption, { color: c.red700 }]}>{notKnown("added", "the list").line}</Text> : null}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Btn label="Cancel" grow onPress={onClose} />
            <Btn label={busy ? "Saving…" : "Save"} variant="primary" grow disabled={!name.trim() || busy || stuck.stuck} onPress={() => void save()} />
          </View>
        </>
      }>
      <Field label="Name"><TextBox label="Name" value={name} placeholder="Agoda" caps="words" onChangeText={setName} /></Field>
      <Field label="Kind" hint="What the name cannot answer: how much came through OTAs at all.">
        <Select label="Kind" value={kind} options={SOURCE_KINDS} onChange={(v) => setKind(v as BookingSourceKind)} />
      </Field>
      <Field label="Channel code" hint="The code SU sends with a booking from this site. None for a source no channel manager sends, such as a walk-in.">
        <CodePicker value={channel} onChange={setChannel} />
      </Field>
      {source ? (
        <SwitchLine label="Offer this on new bookings" on={active} onChange={setActive}
          hint="Switching it off hides it from the booking form. It stays on every booking that already used it - a source is never deleted." />
      ) : null}
    </Sheet>
  );
}

/** The web's select of SU's codes (D27-183: picked, not typed), with a search a phone needs for 260 sites. */
function CodePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [find, setFind] = useState("");
  const known = suChannelName(value);
  const shown = !value ? "None" : known ? `${known} · ${value}` : `${value} (not one of SU's codes)`;
  const matches = useMemo(() => {
    const q = find.trim().toLowerCase();
    return SU_CHANNELS.filter(([c_, n]) => !q || n.toLowerCase().includes(q) || c_ === q).slice(0, 40);
  }, [find]);
  const pick = (v: string) => { onChange(v); setOpen(false); setFind(""); };
  const Choice = ({ v, label }: { v: string; label: string }) => (
    <Pressable onPress={() => pick(v)} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: v === value }}
      android_ripple={{ color: c.grey200 }}
      style={({ pressed }) => ({ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: c.grey100, backgroundColor: pressed && Platform.OS === "ios" ? c.grey50 : c.white })}>
      <Text style={[t.label, { flex: 1, color: c.ink900 }]}>{label}</Text>
      {v === value ? <Check size={18} color={c.orange} /> : null}
    </Pressable>
  );
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`Channel code: ${shown}`} android_ripple={{ color: c.grey200 }}
        style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 12, paddingRight: 10, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, backgroundColor: c.white, overflow: "hidden" }}>
        <Text style={[t.label, { flex: 1, fontSize: 16, color: c.ink900 }]} numberOfLines={1}>{shown}</Text>
        <ChevronDown size={16} color={c.grey500} />
      </Pressable>
      {open ? (
        <Sheet title="Channel code" under="SU's own list of booking sites." onClose={() => setOpen(false)}>
          <TextBox label="Find a site" value={find} placeholder="Find a site, or type its code" caps="none" onChangeText={setFind} />
          <View>
            <Choice v="" label="None" />
            {/* A code saved before the list: shown, never silently dropped. */}
            {value && !known ? <Choice v={value} label={`${value} (not one of SU's codes)`} /> : null}
            {matches.map(([c_, n]) => <Choice key={c_} v={c_} label={`${n} · ${c_}`} />)}
          </View>
          {matches.length === 40 ? <Text style={t.caption}>The first 40 that match. Type more of the name to narrow it.</Text> : null}
        </Sheet>
      ) : null}
    </>
  );
}

/* ── This property's commission (BookingSources.tsx CommissionDialog) ── */

function CommissionSheet({ code, source, onClose, onDone }: { code: string; source: BookingSource; onClose: () => void; onDone: (s: Said) => void }) {
  /* Empty is "no rate agreed", a real answer: a string, never a number with a zero in it. */
  const [pct, setPct] = useState(source.commissionPct === null ? "" : String(source.commissionPct));
  const [said, setSaid] = useState<Said | null>(null);
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const { value, invalid } = commissionValue(pct);

  async function save() {
    if (invalid || latch.current) return;
    latch.current = true; setBusy(true); setSaid(null);
    try {
      /* A PUT of a value: a repeat after a lost reply sets the same figure again. */
      await setCommission(code, source.id, value);
      onDone({ title: commissionDone(source.name, value), tone: "ok" });
      onClose();
    } catch (e) {
      setSaid(saidOf("Not saved", e));
    } finally { latch.current = false; setBusy(false); }
  }

  return (
    <Sheet title={`${source.name} - commission here`}
      under="What this property pays. Other properties keep their own rate, and bookings already taken keep the rate they were taken at."
      onClose={onClose}
      foot={
        <>
          <InDialog said={said} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Btn label="Cancel" grow onPress={onClose} />
            <Btn label={busy ? "Saving…" : "Save"} variant="primary" grow disabled={invalid || busy} onPress={() => void save()} />
          </View>
        </>
      }>
      <Field label="Commission" hint="Per cent of the booking. Leave it blank if no rate has been agreed." error={invalid ? "Between 0 and 100." : null}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1 }}><TextBox label="Commission" value={pct} keyboardType="decimal-pad" big onChangeText={(v) => setPct(typedFigure(v))} /></View>
          <Text style={[t.label, { color: c.grey500 }]}>%</Text>
        </View>
      </Field>
      {/* Blank and zero are two different statements, and a manager may make either. */}
      <Text style={[body, { color: c.grey600 }]}>{commissionNote(pct)}</Text>
      {source.bookings > 0 ? (
        <Text style={[body, { color: c.grey500 }]}>{`${source.bookings} booking${source.bookings === 1 ? "" : "s"} at this property came through ${source.name}.`}</Text>
      ) : null}
    </Sheet>
  );
}
