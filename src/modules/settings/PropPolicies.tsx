import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { c, face, t } from "../../core/theme";
import { s as core, keys } from "../../core/ui";
import { Btn, Field, Sheet, Toast, body, useSaid } from "../admin/kit";
import type { AdminProps } from "../admin/Route";
import {
  CardHead, GoTo, PageFrame, Read, StuckLine, TextEditor, mayEditHere, readOnlyLine, refusedPage, usePage, useWrites, type Writes,
} from "./PropertyKit";
import { amendProperty, readPolicies, saveChildAges } from "./propertyData";
import { POLICY_TEXTS, ageOf, policyLines, typedAgeWords } from "./propertyRules";

/* ══════════════════════════════════════════════════════════════════
   POLICIES on a phone — Settings → Property → Policies (the web's
   pages/property/Policies.tsx, D27-257): the house policies the voucher
   prints (components/VoucherSettings.tsx HousePoliciesCard: PATCH
   /api/admin/hotels/:code { housePolicies }, app.manages_hotel), the three
   policy texts (PUT /:code/texts/:kind), the child ages (PUT /:code/child-
   ages - WORDS ONLY: no price reads them), and the way to the cancellation
   terms. Reads GET /:code/property-profile and GET /api/admin/hotels/:code
   (the house policies; null for whoever may not, as the web, which then
   waits on its skeleton - the phone says it cannot read them). Not
   pictured.
   ══════════════════════════════════════════════════════════════════ */

export function PropPolicies({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const refused = refusedPage(role, "/settings/property/policies", "Policies");
  const { said, say, close } = useSaid();
  const { q, stop } = usePage(code, "policies", () => (refused ? Promise.resolve(null) : readPolicies(code)));
  const w = useWrites(stop, q.reload, say);
  const [pulled, setPulled] = useState(false);
  const mayEdit = mayEditHere(role);
  return (
    <View style={{ flex: 1 }}>
      <PageFrame title="Policies" under="What the hotel asks of its guests, in the words they read."
        refused={refused} refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        <Read q={q} what="the policies">
          {(d) => d ? (
            <>
              <StuckLine w={w} />
              {d[1] ? <HousePolicies code={code} policies={d[1].property.housePolicies ?? []} w={w} />
                : <View style={core.card}><Text style={[body, { color: c.grey500 }]}>The house policies could not be read for this property.</Text></View>}
              <View style={[core.card, { gap: 20 }]}>
                <CardHead title="Policy texts" line="Parking, families and the terms of a reservation, as the hotel puts them." />
                {POLICY_TEXTS.map(([kind, label]) => (
                  <TextEditor key={kind} code={code} page="policies" kind={kind} label={label} value={d[0].texts[kind] ?? ""} mayEdit={mayEdit} w={w} />
                ))}
              </View>
              <ChildAges code={code} free={d[0].childFreeAge} max={d[0].childMaxAge} mayEdit={mayEdit} w={w} />
              <View style={core.card}>
                <GoTo to="/h/:code/cancellation-terms" code={code} label="Cancellation terms" sub="What a guest pays when they cancel - set with the rates." />
              </View>
              {!mayEdit ? <Text style={t.caption}>{readOnlyLine("Changing the property's profile")}</Text> : null}
            </>
          ) : null}
        </Read>
      </PageFrame>
      <Toast said={said} onClose={close} />
    </View>
  );
}

/* ── House policies (HousePoliciesCard): Edit is drawn for all, the server decides ── */

function HousePolicies({ code, policies, w }: { code: string; policies: string[]; w: Writes }) {
  const [typed, setTyped] = useState<string | null>(null);
  const save = () => void w.write(() => amendProperty(code, { housePolicies: policyLines(typed ?? "") }, "policies"), {
    ok: () => ({ title: "House policies saved", body: "They print on this hotel's booking vouchers from now on.", tone: "ok" }),
    done: "saved", where: "the house policies", after: () => setTyped(null),
  });
  return (
    <View style={[core.card, { gap: 12 }]}>
      <CardHead title="House policies" line="Printed on this hotel's booking voucher."
        info="After the booking's own cancellation terms and the check-in and check-out times."
        action={<Btn label="Edit" disabled={w.off} onPress={() => setTyped(policies.join("\n"))} />} />
      {policies.length === 0 ? (
        <Text style={[t.label, { fontSize: 16, color: c.grey500 }]}>None. The voucher prints the booking's terms and the times only.</Text>
      ) : policies.map((line, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 8 }}>
          <Text style={[t.label, t.tab, { fontSize: 16, color: c.ink900, minWidth: 20 }]}>{`${i + 1}.`}</Text>
          <Text style={[t.label, { flex: 1, fontSize: 16, color: c.ink900 }]}>{line}</Text>
        </View>
      ))}
      {typed !== null ? (
        <Sheet open title="House policies" description="One policy a line, in the order they print." onClose={() => setTyped(null)} closable={!w.busy}
          footer={<>
            <Btn label="Cancel" onPress={() => setTyped(null)} disabled={w.busy} grow />
            <Btn variant="primary" label={w.busy ? "…" : "Save"} disabled={w.off} onPress={save} grow />
          </>}>
          <Text style={[t.label, { color: c.grey700 }]}>Policies</Text>
          <TextInput value={typed} onChangeText={setTyped} multiline accessibilityLabel="Policies"
            style={{ minHeight: 220, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, fontSize: 16, lineHeight: 22, color: c.ink900, textAlignVertical: "top", ...face[500] }} />
          <Text style={[t.caption, { lineHeight: 17 }]}>At most 8, each up to 200 characters. Move a line to change the order; empty the box for none.</Text>
          <StuckLine w={w} />
        </Sheet>
      ) : null}
    </View>
  );
}

/* ── Child ages (Policies.tsx ChildAges): words only ──────────────── */

function ChildAges({ code, free, max, mayEdit, w }: { code: string; free: number | null; max: number | null; mayEdit: boolean; w: Writes }) {
  const [typedFree, setFree] = useState(free === null ? "" : String(free));
  const [typedMax, setMax] = useState(max === null ? "" : String(max));
  const words = typedAgeWords(typedFree, typedMax);
  const save = () => void w.write(() => saveChildAges(code, ageOf(typedFree), ageOf(typedMax)), {
    ok: () => ({ title: "Child ages saved", body: words ?? "Not set.", tone: "ok" }), done: "saved", where: "the child ages",
  });
  return (
    <View style={[core.card, { gap: 12 }]}>
      <CardHead title="Child ages" line="Up to what age a child stays free, and up to what age a guest is a child." />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}><Field label="Free up to age" input={keys.count} maxLength={2} editable={mayEdit} value={typedFree} onChangeText={setFree} /></View>
        <View style={{ flex: 1 }}><Field label="A child up to age" input={keys.count} maxLength={2} editable={mayEdit} value={typedMax} onChangeText={setMax} /></View>
      </View>
      <View style={{ borderRadius: 8, backgroundColor: c.grey50, padding: 12, gap: 8 }}>
        <Text style={[body, { color: c.ink900 }]}>{words ?? "Not set: the desk decides, as today."}</Text>
        <Text style={[body, { color: c.grey600 }]}>Prices do not change with these ages. The desk types the number of children as today, and a child costs the room type's extra-child rate once the room's own places are taken.</Text>
      </View>
      {mayEdit ? (
        <View style={{ alignItems: "flex-end" }}>
          <Btn label={w.busy ? "…" : "Save"} a11y="Save the child ages" disabled={w.off} onPress={save} />
        </View>
      ) : null}
    </View>
  );
}
