import { useState } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { DateField } from "../../core/DateField";
import { ExportButtons } from "../../core/Export";
import { c, face, t } from "../../core/theme";
import { Head, Screen, s as core, useRead } from "../../core/ui";
import { listActivity, listAuditLog } from "./data";
import { Btn, Choose, Empty, Failed, Field, Foot, Labelled, Loading, Pill, Refused, Segmented, Stale, body, type Tone } from "./kit";
import { refusedScreen, seesGroupActivity } from "./roles";
import {
  ACTIVITY_PAGE, AUDIT_PAGE, DASH, changeWords, dateShort, dateTime, dayOrBlank, entriesWords, paged, type AuditEntry,
} from "./rules";
import type { AdminProps } from "./Route";

/* ══════════════════════════════════════════════════════════════════
   THE TWO LOGS on a phone.
   AUDIT LOG — the web's /admin/audit-log, now Settings → People and
     security → Audit log (pages/Admin.tsx AuditLogPage; picture
     pms-shots/all/69, as dev-gm): the money's ledger, append-only, by
     page of 100 (one more asked for, to know of an older page).
   ACTIVITY — the web's /admin/activity, now Settings → People and
     security → Activity (pages/Activity.tsx; picture new/n-admin-activity,
     as dev-owner): every change, who, when, which record, what changed; a
     guest's details read "changed" (the server never sends them). "Across
     the group" for the owner and an Admin.
   Both read only. At phone width each entry is a card of the web's
   columns, labelled, in its order (the pictures). From and To are each
   phone's own date picker (M-16), sent as the API takes them (YYYY-MM-DD).
   ══════════════════════════════════════════════════════════════════ */

const AUDIT_TONE: Record<string, Tone> = { charge: "info", payment: "success", reversal: "danger" };

/** By / From / To, applied with Show (the web filters as it is typed; a phone asks once). */
function useFilters() {
  const [draft, setDraft] = useState({ who: "", from: "", to: "" });
  const [applied, setApplied] = useState({ who: "", from: "", to: "" });
  const from = dayOrBlank(draft.from), to = dayOrBlank(draft.to);
  const ok = from !== null && to !== null;
  return { draft, setDraft, applied, ok, apply: () => { if (ok) setApplied({ who: draft.who.trim(), from: from!, to: to! }); }, from, to };
}

/** The web's From / To <input type="date">: the phone's own picker, blank for no filter; To never before From. */
function DayField({ label, value, onChange, hotel, min }: { label: string; value: string; onChange: (v: string) => void; hotel: Hotel; min?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <DateField label={label} value={value} onChange={onChange} hotel={hotel} min={min || undefined} clearable />
    </View>
  );
}

export function AuditLog({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const refused = refusedScreen(role, "auditLog");
  const f = useFilters();
  const [page, setPage] = useState(0);
  const [pulled, setPulled] = useState(false);
  const q = { ...f.applied, offset: page * AUDIT_PAGE, limit: AUDIT_PAGE + 1 };
  const list = useRead(() => (refused ? Promise.resolve(null) : listAuditLog(code, q)), ["admin", code, "audit-log", q]);
  const { rows, older } = paged(list.data ?? undefined, AUDIT_PAGE);

  const table = list.data ? {
    title: "Audit log", subtitle: [hotel.name, f.applied.who && `By ${f.applied.who}`, f.applied.from && `From ${f.applied.from}`, f.applied.to && `To ${f.applied.to}`, rows.length ? entriesWords(page, AUDIT_PAGE, rows.length) : ""].filter(Boolean).join(" · "),
    columns: ["When", "Business date", "Action", "Subject", "Detail", "By"],
    rows: rows.map((e: AuditEntry) => [dateTime(e.at), dateShort(e.businessDate), e.action, e.subject, e.detail, e.actor ?? DASH]),
  } : null;

  return (
    <Screen refreshing={pulled && list.loading} onRefresh={() => { setPulled(true); list.reload(); }}>
      <Head title="Audit log" under="Append-only. Nothing here is edited or deleted - a wrong posting is reversed, and the reversal is its own entry." />
      {refused ? <Refused sentence={refused} /> : (
        <>
          {list.data ? <View style={{ flexDirection: "row", marginTop: -8 }}><Pill tone="neutral">{entriesWords(page, AUDIT_PAGE, rows.length)}</Pill></View> : null}
          <View style={[core.card, { gap: 12 }]}>
            <Field label="By" value={f.draft.who} onChangeText={(who) => f.setDraft({ ...f.draft, who })} placeholder="Part of a name" autoCapitalize="words" />
            <DayField label="From" value={f.draft.from} hotel={hotel} onChange={(from) => f.setDraft({ ...f.draft, from })} />
            <DayField label="To" value={f.draft.to} hotel={hotel} min={f.draft.from} onChange={(to) => f.setDraft({ ...f.draft, to })} />
            <View style={{ flexDirection: "row" }}><Btn label="Show" variant="primary" disabled={!f.ok} onPress={() => { f.apply(); setPage(0); }} /></View>
          </View>
          <ExportButtons table={table} />
          <Pager page={page} older={older} onPage={setPage} />
          {list.data === undefined ? (list.error ? <Failed error={list.error} onRetry={list.reload} /> : <Loading what="the audit log" />)
            : list.data === null ? null : (
              <>
                <Stale error={list.error} />
                {rows.length === 0 ? <Empty title="Nothing recorded yet" description="Changes are recorded here as they are made, with who made them and when." />
                  : rows.map((e) => (
                    <View key={e.id} style={[core.card, { gap: 10 }]}>
                      <Text style={[t.label, t.tab, { color: c.grey600 }]}>{dateTime(e.at)}</Text>
                      <Labelled label="Business date" value={dateShort(e.businessDate)} />
                      <Labelled label="Action"><Pill tone={AUDIT_TONE[e.kind] ?? "neutral"} dot>{e.action}</Pill></Labelled>
                      <Labelled label="Subject" value={e.subject} strong />
                      <Labelled label="Detail" value={e.detail} />
                      <Labelled label="By" value={e.actor ?? DASH} />
                    </View>
                  ))}
                <Pager page={page} older={older} onPage={setPage} />
              </>
            )}
          <Foot>The folio ledger is the audit trail for money. It is append-only by construction, so nothing is recorded twice and nothing can be quietly rewritten. By is the person who made the entry. A dash means nobody was recorded - older charges, payments and reversals made at the desk did not record who made them.</Foot>
        </>
      )}
    </Screen>
  );
}

function Pager({ page, older, onPage }: { page: number; older: boolean; onPage: (p: number) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Btn label="Newer" disabled={page === 0} onPress={() => onPage(page - 1)} />
      <Btn label="Older" disabled={!older} onPress={() => onPage(page + 1)} />
    </View>
  );
}

export function Activity({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const refused = refusedScreen(role, "activity");
  const mayGroup = seesGroupActivity(role);
  const [scope, setScope] = useState<"hotel" | "group">("hotel");
  const [who, setWho] = useState("");
  const [kind, setKind] = useState("");
  const f = useFilters();
  const [page, setPage] = useState(0);
  const [pulled, setPulled] = useState(false);
  const q = { scope, who, kind, from: f.applied.from, to: f.applied.to, offset: page * ACTIVITY_PAGE, limit: ACTIVITY_PAGE + 1 };
  const list = useRead(() => (refused ? Promise.resolve(null) : listActivity(code, q)), ["admin", code, "activity", q]);
  const { rows, older } = paged(list.data?.entries, ACTIVITY_PAGE);

  const table = list.data ? {
    title: "Activity",
    subtitle: [hotel.name, scope === "group" ? "across the group" : "this hotel", who && `By ${list.data.people.find((p) => p.id === who)?.name ?? ""}`,
      kind && list.data.kinds.find((k) => k.key === kind)?.label, f.applied.from && `From ${f.applied.from}`, f.applied.to && `To ${f.applied.to}`].filter(Boolean).join(" · "),
    columns: ["When", "Who", "What", "Record", "What changed"],
    rows: rows.map((e) => [dateTime(e.at), e.actor ?? DASH, `${e.action} · ${e.kind}`, e.record ?? DASH,
      e.changes.map((ch) => `${ch.field} ${changeWords(ch)}`).join("; ") || DASH]),
  } : null;

  return (
    <Screen refreshing={pulled && list.loading} onRefresh={() => { setPulled(true); list.reload(); }}>
      <Head title="Activity" under="Every change made here: who, when, which record and what changed. A guest's details read 'changed'." />
      {refused ? <Refused sentence={refused} /> : (
        <>
          <View style={[core.card, { gap: 12 }]}>
            {mayGroup ? (
              <Segmented label="Where" value={scope} onChange={(v) => { setScope(v); setWho(""); setKind(""); setPage(0); }}
                options={[{ value: "hotel", label: "This hotel" }, { value: "group", label: "Across the group" }]} />
            ) : null}
            <Choose label="By" value={who} none="Anybody" onChange={(v) => { setWho(v); setPage(0); }}
              choices={(list.data?.people ?? []).map((p) => ({ value: p.id, label: p.name }))} />
            <Choose label="Kind" value={kind} none="Everything" onChange={(v) => { setKind(v); setPage(0); }}
              choices={(list.data?.kinds ?? []).map((k) => ({ value: k.key, label: k.label }))} />
            <DayField label="From" value={f.draft.from} hotel={hotel} onChange={(from) => f.setDraft({ ...f.draft, from })} />
            <DayField label="To" value={f.draft.to} hotel={hotel} min={f.draft.from} onChange={(to) => f.setDraft({ ...f.draft, to })} />
            <View style={{ flexDirection: "row" }}><Btn label="Show" variant="primary" disabled={!f.ok} onPress={() => { f.apply(); setPage(0); }} /></View>
          </View>
          <ExportButtons table={table} />
          <Pager page={page} older={older} onPage={setPage} />
          {list.data === undefined ? (list.error ? <Failed error={list.error} onRetry={list.reload} /> : <Loading what="the changes" />)
            : list.data === null ? null : (
              <>
                <Stale error={list.error} />
                {rows.length === 0 ? <Empty title="No changes" description="Nothing recorded for these choices." />
                  : rows.map((e) => (
                    <View key={e.id} style={[core.card, { gap: 10 }]}>
                      <Text style={[t.label, t.tab, { color: c.grey600 }]}>{dateTime(e.at)}</Text>
                      <Labelled label="Who" value={e.actor ?? DASH} />
                      <Labelled label="Which record">
                        <Text style={[body, { color: c.ink900 }]}>{`${e.action} · ${e.kind}`}{e.record ? <Text style={{ color: c.grey600 }}>{` ${e.record}`}</Text> : null}</Text>
                      </Labelled>
                      <Labelled label="What changed">
                        {e.changes.length === 0 ? <Text style={[body, { color: c.grey500 }]}>{DASH}</Text> : e.changes.map((ch) => (
                          <Text key={ch.field} style={[body, { color: c.grey600 }]}><Text style={[face[600], { color: c.grey700 }]}>{ch.field}</Text>{` ${changeWords(ch)}`}</Text>
                        ))}
                      </Labelled>
                    </View>
                  ))}
                <Pager page={page} older={older} onPage={setPage} />
              </>
            )}
        </>
      )}
    </Screen>
  );
}
