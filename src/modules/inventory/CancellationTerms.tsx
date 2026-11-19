import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react-native";
import { useRef, useState } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { ExportButtons } from "../../core/Export";
import type { ExportTable } from "../../core/exportDoc";
import { c, space, t } from "../../core/theme";
import { Head, Screen, notKnown, useRead, useStuck } from "../../core/ui";
import {
  RETENTION_BASES, defaultWords, describe, freeUntil, policyBody, policyForm, typedCount, typedFigure,
  type CancellationPolicy, type PolicyForm,
} from "./config";
import { addPolicy, readPolicies, retirePolicy, setDefaultPolicy } from "./configData";
import { Btn, Failed, Field, Loading, Pill, Refused, Select, TextBox, confirm } from "./configKit";
import { TERMS, TERMS_READ, whyNot } from "./configRoles";
import { Empty, InDialog, Stale, Toast, saidOf, type Said } from "./kit";

/* ══════════════════════════════════════════════════════════════════
   CANCELLATION TERMS on a phone — the web's /h/:code/cancellation-terms
   (src/modules/inventory/pages/CancellationTerms.tsx; picture
   pms-shots/all/25-configuration-cancellation-terms, the empty state).

   What a cancellation or a no-show costs. It ships EMPTY, and the night
   audit charges nothing until somebody here decides otherwise; a
   retention is a price, so nothing is filled in. Two events, priced
   separately. Read by whoever reads prices; written by the rate setters
   (roleGate TERMS). Retire asks first (the brief: a destructive act asks
   first) - the web retires at the tap; its own words are used.
   ══════════════════════════════════════════════════════════════════ */

const exportOf = (rows: CancellationPolicy[], hotel: Hotel): ExportTable => ({
  /* CancellationTerms.tsx POLICY_EXPORT, each in the screen's sentence. */
  title: "Cancellation terms", subtitle: hotel.name,
  columns: ["Policy", "Free until (hours before arrival)", "Cancelled late", "No show", "New bookings get it", "Bookings on it"],
  rows: rows.map((p) => [p.name, p.freeUntilHours === null ? "-" : String(p.freeUntilHours), describe(p.cancelBasis, p.cancelPercent, p.cancelAmount),
    describe(p.noShowBasis, p.noShowPercent, p.noShowAmount), p.appliesToNewBookings ? "Yes" : "No", String(p.bookings)]),
});

export function CancellationTerms({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const cannotRead = whyNot(TERMS_READ, role);
  const cannotWrite = whyNot(TERMS, role);
  const policies = useRead(() => (cannotRead ? Promise.resolve(null) : readPolicies(code)), ["inventory", code, "cancellation-terms"]);
  const [open, setOpen] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  const [pulled, setPulled] = useState(false);
  const latch = useRef(false);
  const refresh = () => void cache.invalidateQueries({ queryKey: ["inventory", code, "cancellation-terms"] });

  function makeDefault(p: CancellationPolicy) {
    if (latch.current || cannotWrite) return;
    latch.current = true; setSaid(null);
    setDefaultPolicy(code, p.id, !p.appliesToNewBookings)
      .then(() => { const w = defaultWords(p); setSaid({ ...w, tone: "ok" }); refresh(); })
      .catch((e: unknown) => setSaid(saidOf("Not changed", e)))
      .finally(() => { latch.current = false; });
  }
  function retire(p: CancellationPolicy) {
    if (cannotWrite) return;
    confirm(`Retire "${p.name}"`, "Bookings already made keep their terms.", "Retire", () => {
      if (latch.current) return;
      latch.current = true; setSaid(null);
      retirePolicy(code, p.id)
        .then(() => { setSaid({ title: `"${p.name}" retired`, body: "Bookings already made keep their terms.", tone: "ok" }); refresh(); })
        .catch((e: unknown) => setSaid(saidOf("Not retired", e)))
        .finally(() => { latch.current = false; });
    }, "Keep it");
  }

  const list = policies.data ?? [];
  let main;
  if (cannotRead) main = <Empty title="Cancellation terms" description={cannotRead} />;
  else if (policies.data === undefined) {
    main = policies.error
      ? <Failed title="The terms did not load" what="The cancellation terms" error={policies.error} onRetry={policies.reload} />
      : <Loading words="Reading the terms…" />;
  } else if (list.length === 0 && !open) {
    main = (
      <View style={{ gap: 12 }}>
        <Empty title="No terms written down"
          description="Until a policy exists, the night audit charges nothing on a no-show. That is a valid way to run a hotel - write terms here only if this property actually bills for them." />
        {cannotWrite ? <Refused label="Write the first one" icon={Plus} reason={cannotWrite} />
          : <View style={{ flexDirection: "row", justifyContent: "center" }}><Btn label="Write the first one" icon={Plus} onPress={() => setOpen(true)} /></View>}
      </View>
    );
  } else {
    main = list.map((p) => (
      <View key={p.id} style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Text style={t.heading}>{p.name}</Text>
          {p.appliesToNewBookings ? <Pill tone="success">New bookings</Pill> : null}
          {p.bookings > 0 ? <Pill tone="info">{`${p.bookings} booking${p.bookings === 1 ? "" : "s"}`}</Pill> : null}
        </View>
        <View style={{ gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.grey100 }}>
          <Term label="Free until" value={freeUntil(p.freeUntilHours)} />
          <Term label="Cancellation" value={describe(p.cancelBasis, p.cancelPercent, p.cancelAmount)} />
          <Term label="No-show" value={describe(p.noShowBasis, p.noShowPercent, p.noShowAmount)} />
        </View>
        {cannotWrite ? <Refused label={p.appliesToNewBookings ? "Stop using" : "Use for new bookings"} reason={cannotWrite} /> : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Btn label={p.appliesToNewBookings ? "Stop using" : "Use for new bookings"} onPress={() => makeDefault(p)} />
            <Btn label="" a11y={`Retire ${p.name}`} icon={Trash2} variant="ghost" onPress={() => retire(p)} />
          </View>
        )}
      </View>
    ));
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && policies.loading} onRefresh={() => { setPulled(true); policies.reload(); }}>
        <Head title="Cancellation terms" under="What a cancellation or a no-show costs at this property." />
        {cannotRead ? null : (
          <View style={{ gap: 8 }}>
            <ExportButtons table={policies.data ? exportOf(list, hotel) : null} />
            {cannotWrite ? <Refused label="New policy" icon={Plus} variant="primary" reason={cannotWrite} />
              : <View style={{ flexDirection: "row" }}><Btn label="New policy" icon={Plus} variant="primary" onPress={() => setOpen((o) => !o)} /></View>}
          </View>
        )}
        {open && !cannotWrite ? <PolicyFormCard code={code} onCancel={() => setOpen(false)} onDone={(s) => { setOpen(false); setSaid(s); refresh(); }} /> : null}
        {policies.data ? <Stale error={policies.error} /> : null}
        {main}
      </Screen>
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={t.caption}>{label}</Text>
      <Text style={[t.label, t.tab, { color: c.ink900, fontSize: 16 }]}>{value}</Text>
    </View>
  );
}

/** CancellationTerms.tsx PolicyForm: the name, the free window, and each event's basis with only the figure it needs. */
function PolicyFormCard({ code, onCancel, onDone }: { code: string; onCancel: () => void; onDone: (s: Said) => void }) {
  const [f, setF] = useState<PolicyForm>(policyForm);
  const [said, setSaid] = useState<Said | null>(null);
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const stuck = useStuck();
  const set = (k: keyof PolicyForm) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  async function save() {
    if (!f.name.trim() || latch.current || stuck.isStuck()) return;
    latch.current = true; setBusy(true); setSaid(null);
    try {
      await addPolicy(code, policyBody(f));
      onDone({ title: `"${f.name.trim()}" saved`, tone: "ok" });
    } catch (e) {
      if (stuck.stop(e)) { const n = notKnown("saved", "the terms"); setSaid({ title: n.title, body: n.body, tone: "bad" }); }
      else setSaid(saidOf("Not saved", e));
    } finally { latch.current = false; setBusy(false); }
  }

  return (
    <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 16 }}>
      <Field label="Name" hint="What the front desk will call it">
        <TextBox label="Name" value={f.name} placeholder="Flexible, Non-refundable, Peak season" caps="words" onChangeText={set("name")} />
      </Field>
      <Field label="Free cancellation until" hint="Hours before arrival. Leave empty for no free window at all.">
        <TextBox label="Free cancellation until" value={f.freeHours} placeholder="24" keyboardType="number-pad" onChangeText={(v) => set("freeHours")(typedCount(v))} />
      </Field>
      <View style={{ gap: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.grey100 }}>
        <Basis legend="A cancellation retains" basis={f.cancelBasis} onBasis={set("cancelBasis")}
          percent={f.cancelPercent} onPercent={set("cancelPercent")} amount={f.cancelAmount} onAmount={set("cancelAmount")} />
        <Basis legend="A no-show retains" basis={f.noShowBasis} onBasis={set("noShowBasis")}
          percent={f.noShowPercent} onPercent={set("noShowPercent")} amount={f.noShowAmount} onAmount={set("noShowAmount")} />
      </View>
      <InDialog said={said} />
      {stuck.stuck ? <Text style={[t.caption, { color: c.red700 }]}>{notKnown("saved", "the terms").line}</Text> : null}
      <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
        <Btn label="Cancel" onPress={onCancel} />
        <Btn label="Save policy" variant="primary" disabled={busy || !f.name.trim() || stuck.stuck} onPress={() => void save()} />
      </View>
    </View>
  );
}

/** CancellationTerms.tsx BasisPicker: only the figure the chosen basis needs. Typed and sent as typed. */
function Basis({ legend, basis, onBasis, percent, onPercent, amount, onAmount }: {
  legend: string; basis: string; onBasis: (v: string) => void;
  percent: string; onPercent: (v: string) => void; amount: string; onAmount: (v: string) => void;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={t.eyebrow}>{legend}</Text>
      <Field label="Basis"><Select label="Basis" value={basis} options={RETENTION_BASES} onChange={onBasis} /></Field>
      {basis === "percent" ? (
        <Field label="Percentage"><TextBox label="Percentage" value={percent} placeholder="50" keyboardType="decimal-pad" onChangeText={(v) => onPercent(typedFigure(v))} /></Field>
      ) : null}
      {basis === "flat" ? (
        <Field label="Amount"><TextBox label="Amount" value={amount} placeholder="-" keyboardType="decimal-pad" onChangeText={(v) => onAmount(typedFigure(v))} /></Field>
      ) : null}
    </View>
  );
}
