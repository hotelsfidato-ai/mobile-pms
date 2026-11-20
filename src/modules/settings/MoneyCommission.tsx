import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { c, face, space, t } from "../../core/theme";
import { Head, Screen, Stopped, useRead } from "../../core/ui";
import { Refused as NotYours } from "../admin/kit";
import type { AdminProps } from "../admin/Route";
import { commissionNote, commissionOf, commissionValue } from "../inventory/config";
import { Btn, Failed, Field, Loading, Sheet, TextBox } from "../inventory/configKit";
import { Empty, InDialog, Stale, Toast, body, type Said } from "../inventory/kit";
import { readCommission, setSourceCommission } from "./moneyData";
import { Grey, refusedPage, useWriter, type Writer } from "./moneyKit";
import { COMMISSION, MONEY_READ, commissionSaved, contractLine, typedFigure, whyNot, type CommissionView } from "./moneyRules";

/* ══════════════════════════════════════════════════════════════════
   SETTINGS → MONEY → COMMISSION on a phone (lane m13-set-money, 20 Nov) —
   the web's /settings/money/commission (finance/pages/money/Commission.tsx;
   the owner's D27-259 Q5). What each booking source takes at this hotel,
   set here, and what each agent contract carries, set on the contract.
   Stamped on each booking as it is made, so a change here never restates
   a past month (082). A dash is "not agreed" - never 0%. No payouts yet.

   Read: GET /commission, see("setting"). A source's % is PUT
   booking-sources/:id/commission, roleGate COMMISSION (owner, administrator,
   GM), blank sent as null. The rules of the figure are the Booking sources
   screen's own (inventory/config.ts commissionValue, commissionNote,
   commissionOf), not a second copy. The web types each row's % in place
   with a Save beside it; a phone opens the row in a sheet. A contract's
   company is shown as text: the phone has no company page yet (the web
   links to /companies/:id). Not pictured.
   ══════════════════════════════════════════════════════════════════ */

type Source = CommissionView["sources"][number];

export function Commission({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refused = refusedPage(role, "/settings/money/commission", "Commission");
  const cannotRead = refused ?? whyNot(MONEY_READ, role);
  const key = ["settings", code, "commission"];
  const w = useWriter(`settings/${code}/commission`);
  const q = useRead(w.watch(() => (cannotRead ? Promise.resolve(null) : readCommission(code))), key);
  const cannot = whyNot(COMMISSION, role);
  const [editing, setEditing] = useState<Source | null>(null);
  const [said, setSaid] = useState<Said | null>(null);
  const [pulled, setPulled] = useState(false);
  /* The Booking sources screen shows the same figure: its read goes too. */
  const refresh = () => void cache.invalidateQueries({ predicate: (x) => (x.queryKey[0] === "settings" && x.queryKey[2] === "commission") || x.queryKey[2] === "booking-sources" });
  const v = q.data;

  let main: ReactNode;
  if (refused) main = <NotYours sentence={refused} />;
  else if (cannotRead) main = <Empty title="Commission" description={cannotRead} />;
  else if (!v) main = q.error ? <Failed title="The commission did not load" what="The commission" error={q.error} onRetry={q.reload} /> : <Loading words="Reading the commission…" />;
  else {
    main = (
      <View style={{ gap: space.section }}>
        <Stale error={q.error} />
        <Card title="Booking sources" under="Blank: no commission agreed (a dash, not 0%).">
          {w.line ? <Stopped line={w.line} onRead={q.reload} /> : null}
          <Grey line={cannot} />
          {v.sources.length === 0 ? <Text style={[body, { color: c.grey500 }]}>No booking sources yet.</Text> : v.sources.map((s, i) => (
            <View key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.grey200 }}>
              <Text style={[t.label, { flex: 1, fontSize: 16, color: c.ink900 }]} numberOfLines={2}>{s.name}</Text>
              <Text style={[t.label, t.tab, face[600], { fontSize: 16, color: s.commissionPct === null ? c.grey500 : c.ink900 }]}>{commissionOf(s.commissionPct)}</Text>
              <Btn label="Change" a11y={`${s.name}: commission`} disabled={cannot !== null || w.locked || w.busy} onPress={() => setEditing(s)} />
            </View>
          ))}
        </Card>
        <Card title="Agent contracts" under="Set on the company's contract.">
          {v.contracts.length === 0 ? <Text style={[body, { color: c.grey500 }]}>No contract carries a commission.</Text> : v.contracts.map((k, i) => (
            <View key={k.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.grey200 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[t.label, face[500], { fontSize: 16, color: c.ink900 }]}>{k.company}</Text>
                <Text style={[t.label, { color: c.grey500 }]}>{contractLine(k)}</Text>
              </View>
              <Text style={[t.label, t.tab, { fontSize: 16, color: c.ink900 }]}>{commissionOf(k.commissionPct)}</Text>
            </View>
          ))}
        </Card>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        <Head title="Commission" under="What each booking source and agent takes. A change applies to bookings made after it." />
        {main}
      </Screen>
      {editing ? (
        <RateSheet code={code} source={editing} w={w}
          onClose={() => { if (!w.busy) { setEditing(null); refresh(); } }}
          onDone={(s) => { setEditing(null); setSaid(s); refresh(); }} />
      ) : null}
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}

function Card({ title, under, children }: { title: string; under: string; children: ReactNode }) {
  return (
    <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 8 }}>
      <View style={{ gap: 2, paddingBottom: 4 }}>
        <Text style={t.heading} accessibilityRole="header">{title}</Text>
        <Text style={[t.caption, { color: c.grey600 }]}>{under}</Text>
      </View>
      {children}
    </View>
  );
}

function RateSheet({ code, source, w, onClose, onDone }: { code: string; source: Source; w: Writer; onClose: () => void; onDone: (s: Said) => void }) {
  /* Empty is "no rate agreed", a real answer: text, never a number with a zero in it. */
  const [pct, setPct] = useState(source.commissionPct === null ? "" : String(source.commissionPct));
  const [said, setSaid] = useState<Said | null>(null);
  const [lost, setLost] = useState<string | null>(null);
  const { value, invalid } = commissionValue(pct);
  const changed = value !== source.commissionPct;
  const grey = w.line ?? lost;
  const save = async () => {
    if (invalid || !changed) return;
    setSaid(null);
    const r = await w.run(() => setSourceCommission(code, source.id, value), { title: "Not saved", done: "saved", where: "the commission" });
    if (!r) return;
    if (r.ok) onDone({ title: commissionSaved(source.name, value), tone: "ok" });
    else { setSaid(r.said); if (r.unknown) setLost(`${r.said.title}: close this and look at the commission before trying again.`); }
  };
  return (
    <Sheet title={`${source.name} - commission here`} under="Applies to bookings made after it; bookings already taken keep theirs." onClose={onClose}
      foot={
        <>
          <InDialog said={said} />
          <Grey line={grey} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Btn label="Cancel" grow disabled={w.busy} onPress={onClose} />
            <Btn label={w.busy ? "Saving…" : "Save"} variant="primary" grow disabled={invalid || !changed || w.busy || (grey !== null || w.locked)} onPress={() => void save()} />
          </View>
        </>
      }>
      <Field label="Commission" hint="Per cent of the booking. Leave it blank if no rate has been agreed." error={invalid ? "Between 0 and 100." : null}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1 }}><TextBox label={`${source.name} commission %`} value={pct} keyboardType="decimal-pad" big onChangeText={(x) => setPct(typedFigure(x))} /></View>
          <Text style={[t.label, { color: c.grey500 }]}>%</Text>
        </View>
      </Field>
      <Text style={[body, { color: c.grey600 }]}>{commissionNote(pct)}</Text>
    </Sheet>
  );
}
