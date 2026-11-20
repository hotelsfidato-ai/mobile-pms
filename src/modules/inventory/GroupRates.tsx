import { useQueryClient } from "@tanstack/react-query";
import { Check, TriangleAlert } from "lucide-react-native";
import { useRef, useState } from "react";
import { Text, View } from "react-native";
import { outcomeUnknown, type Hotel, type HotelsResponse } from "../../core/api";
import { DateField } from "../../core/DateField";
import { dateShort } from "../../core/format";
import { c, face, space, t } from "../../core/theme";
import { Head, Screen, notKnown, useRead } from "../../core/ui";
import {
  CHANGE_KINDS, changeHint, changeLabel, priceOrDash, propertiesWord, rateQuestion, runDays, saveLine, typedChange,
  type ChangeKind, type RatePlan,
} from "./config";
import { previewRateChange, saveRateChange } from "./configData";
import { Btn, Failed, Field, Loading, NotYourRole, Select, SwitchLine, TextBox } from "./configKit";
import { priceHotels, seesGroupRates } from "./configRoles";
import { Segmented, Toast, body, saidOf, type Said } from "./kit";

/* ══════════════════════════════════════════════════════════════════
   GROUP RATE CHANGE on a phone — the web's /group-rates (new in the
   16 Nov release; src/modules/inventory/pages/GroupRates.tsx and
   data/groupRates.ts, the API's inventory/groupRates.ts). Not pictured.

   The owner, or a revenue manager over several properties, changes one
   room type's base at several properties at once: a new price, or plus or
   minus an amount or a percent, over the days chosen. Every property's old
   and new price is the SERVER's and is shown before anything is saved;
   Save writes them all in one go, or none, and the server refuses it if
   anything moved since it was shown. The phone works nothing out.

   The figure is typed and sent as typed (no minus on a new price); a save
   whose reply was lost empties it and says so (MEMORY 16) - the server's
   check against what was shown refuses a blind repeat too. Dates with
   the phone's own picker (M-16).
   ══════════════════════════════════════════════════════════════════ */

export function GroupRates({ hotel, role, who }: { hotel: Hotel; role: string | null; who: HotelsResponse }) {
  const hotels = priceHotels(who.scope, who.hotels);
  /* RequireAccess path="/group-rates": a price setter here, over more than one real property (inventory/nav.ts). */
  if (!seesGroupRates(role, hotels)) {
    return <Screen refreshing={false} onRefresh={() => undefined}><Head title="Group rate change" /><NotYourRole role={role} screen="Group rate change" /></Screen>;
  }
  return <GroupRatesScreen code={hotel.code} hotels={hotels} />;
}

function GroupRatesScreen({ code, hotels }: { code: string; hotels: ReturnType<typeof priceHotels> }) {
  const cache = useQueryClient();
  const [left, setLeft] = useState<string[]>([]);
  const codes = hotels.filter((h) => !left.includes(h.code)).map((h) => h.code);
  const earliest = hotels.filter((h) => codes.includes(h.code)).map((h) => h.businessDate).sort()[0] ?? "";
  const [roomType, setRoomType] = useState("");
  const [from, setFrom] = useState("");
  const [through, setThrough] = useState("");
  const [kind, setKind] = useState<ChangeKind>("set");
  const [value, setValue] = useState("");
  const [said, setSaid] = useState<Said | null>(null);
  const [saving, setSaving] = useState(false);
  const [unknown, setUnknown] = useState<string | null>(null);
  const latch = useRef(false);

  const first = from || earliest;
  const last = through && through >= first ? through : first;
  const question = rateQuestion({ hotels: codes, roomType, from: first, through: last, kind, text: value });

  /* Two reads, as the web: the names alone, and - once the question is whole - what would change. */
  const names = useRead(() => (codes.length ? previewRateChange({ hotels: codes }) : Promise.resolve(null)), ["inventory", code, "group-rates", codes.join(",")]);
  const preview = useRead(() => (question ? previewRateChange(question) : Promise.resolve(null)), ["inventory", code, "group-rates", codes.join(","), JSON.stringify(question)]);
  const plans: RatePlan[] = preview.data?.hotels ?? [];
  const toSave = plans.filter((p) => !p.skipped);

  async function save() {
    if (!question || latch.current || toSave.length === 0) return;
    latch.current = true; setSaving(true); setSaid(null); setUnknown(null);
    try {
      const r = await saveRateChange(question, plans);
      setSaid({ title: `Prices saved at ${propertiesWord(r.saved.length)}`, body: r.saved.map((s) => s.name).join(", "), tone: "ok" });
      for (const s of r.saved) void cache.invalidateQueries({ queryKey: ["inventory", s.code] });
      /* Cleared, so a second press cannot add the same change twice (GroupRates.tsx 85). */
      setValue("");
    } catch (e) {
      if (outcomeUnknown(e)) {
        /* Emptied and said (MEMORY 16): typed again on purpose, with the prices read again. */
        setValue("");
        setUnknown(notKnown("saved", "each property's Rates", e).line);
      } else setSaid(saidOf("Nothing was saved", e));
    } finally {
      latch.current = false; setSaving(false);
      void cache.invalidateQueries({ queryKey: ["inventory", code, "group-rates"] });
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={false} onRefresh={() => { names.reload(); preview.reload(); }}>
        <Head title="Group rate change" under="One room type's price at several properties: see every property's old and new price, then save them all together." />
        <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 16 }}>
          <Text style={t.heading} accessibilityRole="header">The change</Text>
          <View style={{ gap: 2 }}>
            <Text style={[t.label, { color: c.ink900 }]}>Properties</Text>
            {hotels.map((h) => (
              <SwitchLine key={h.code} label={h.name} on={!left.includes(h.code)}
                onChange={(on) => setLeft((l) => (on ? l.filter((x) => x !== h.code) : [...l, h.code]))} />
            ))}
          </View>
          {names.error && !names.data ? <Failed title="The room types did not load" what="The room types" error={names.error} onRetry={names.reload} /> : null}
          <Field label="Room type" hint={names.data === undefined && codes.length ? "Reading the room types…" : "Matched by its name at each property."}>
            <Select label="Room type" value={roomType} placeholder="Choose a room type"
              options={(names.data?.roomTypes ?? []).map((x) => ({ value: x.name, label: `${x.name} (${x.at.join(", ")})` }))} onChange={setRoomType} />
          </Field>
          {first ? (
            <>
              <DateField label="From" hint="The first day changed." value={first} hotel={{ businessDate: first }} onChange={setFrom} />
              <DateField label="Through" hint="The last day changed." value={last} min={first} hotel={{ businessDate: last }} onChange={setThrough} />
            </>
          ) : null}
          <Field label="Change">
            <Segmented<ChangeKind> label="Change" value={kind} options={CHANGE_KINDS} onChange={(k) => { setKind(k); setValue((v) => typedChange(v, k)); }} />
          </Field>
          <Field label={changeLabel(kind)} hint={changeHint(kind)}>
            {/* A minus is typed on the phone's own keys: number-pad has none, so the full keyboard for a lowering. */}
            <TextBox label={changeLabel(kind)} value={value} big keyboardType={kind === "set" ? "decimal-pad" : "numbers-and-punctuation"}
              onChangeText={(v) => { setUnknown(null); setValue(typedChange(v, kind)); }} />
          </Field>
          {unknown ? <Text style={[t.caption, { color: c.red700 }]} accessibilityRole="alert">{unknown}</Text> : null}
        </View>

        {codes.length > 0 && question ? (
          <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 12 }}>
            <View style={{ gap: 2 }}>
              <Text style={t.heading} accessibilityRole="header">What will change</Text>
              <Text style={[t.label, { color: c.grey500 }]}>Nothing is saved until you press Save. Every property below is saved together, or none is.</Text>
            </View>
            {preview.data === undefined ? (
              preview.error ? <Failed title="The prices did not load" what="The prices" error={preview.error} onRetry={preview.reload} /> : <Loading words="Reading the prices…" />
            ) : preview.data?.problem ? (
              <Text style={[body, { color: c.grey600 }]}>{preview.data.problem}</Text>
            ) : (
              <>
                {plans.map((p, i) => <PlanRow key={p.code} plan={p} first={i === 0} />)}
                <View style={{ gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.grey200 }}>
                  <Text style={[t.label, { color: c.grey600 }]}>{saveLine(toSave.length, plans.length)}</Text>
                  <Btn label={saving ? "Saving…" : `Save at ${propertiesWord(toSave.length)}`} variant="primary"
                    disabled={saving || preview.loading || toSave.length === 0} onPress={() => void save()} />
                </View>
              </>
            )}
          </View>
        ) : null}
      </Screen>
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}

/** One property: its match and every run's old and new price as the server sent them, or why it is skipped. */
function PlanRow({ plan, first }: { plan: RatePlan; first: boolean }) {
  const Icon = plan.skipped ? TriangleAlert : Check;
  return (
    <View style={{ gap: 8, paddingTop: first ? 0 : 12, borderTopWidth: first ? 0 : 1, borderTopColor: c.grey100 }}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: plan.skipped ? c.orange50 : c.success50 }}>
          <Icon size={16} color={plan.skipped ? c.orange700 : c.success600} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[t.label, { color: c.ink900 }]}>{plan.name}</Text>
          <Text style={t.caption}>{plan.roomType ? `${plan.roomType.name.trim()} (${plan.roomType.code})` : "No room type matched"}</Text>
        </View>
      </View>
      {plan.skipped ? <Text style={[t.label, { color: c.grey700 }]}>{plan.skipped}</Text> : (
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: "row" }}>
            <Text style={[t.caption, { flex: 1 }]}>Days</Text>
            <Text style={[t.caption, { width: 92, textAlign: "right" }]}>Now</Text>
            <Text style={[t.caption, { width: 92, textAlign: "right" }]}>New</Text>
          </View>
          {plan.runs.map((r) => (
            <View key={r.from} style={{ flexDirection: "row", paddingTop: 4, borderTopWidth: 1, borderTopColor: c.grey100 }}>
              <Text style={[t.label, t.tab, { flex: 1, color: c.ink900 }]}>{runDays(r.from, r.through, dateShort)}</Text>
              <Text style={[t.label, t.tab, { width: 92, textAlign: "right", color: c.grey600 }]}>{priceOrDash(r.old)}</Text>
              <Text style={[t.label, t.tab, face[600], { width: 92, textAlign: "right", color: c.ink900 }]}>{priceOrDash(r.new)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
