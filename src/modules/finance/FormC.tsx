import { useQueryClient } from "@tanstack/react-query";
import * as Print from "expo-print";
import { Check, Globe2, Printer, ShieldAlert } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, face, t } from "../../core/theme";
import { Card, Screen } from "../../core/ui";
import {
  GENDERS, ID_TYPES, PERSON, PURPOSES, VISIT, idNumberProblem, particularsPayload, requiredKeys, type Spec,
} from "../front-desk/guestId";
import {
  DASH, allFiled, cardLines, clockAt, documentChange, filing, filingBody, formCPill, formCTable, guestLine, particularsOf, peopleWords,
  recordLabel, rowOf, unrecordedLine, whyNotExport, whyNotReadFormC, whyNotRecordFormC,
  type FilingKind, type FormCRegister, type FormCRow,
} from "./desk";
import { completeDetails, readFormC, recordFiling } from "./deskData";
import { DeskExport, DeskSheet, PageHead, ReadState, RefusedCard, TextAct, TonePill, failedSaid, useWrite, StopCard, useDeskRead, usePull, useStop, type Stop } from "./DeskKit";
import { Btn, Choice, Field, IconBtn, Input, Refused, SaidCard, type Said } from "./Kit";

/* ══════════════════════════════════════════════════════════════════
   FORM III on a phone — the web's /h/:code/form-c (src/modules/guests/
   pages/FormC.tsx, data/formC.ts; the API's guests/formC.ts; picture
   pms-shots/all/41-finance-form-c). Immigration and Foreigners Rules 2025,
   Rule 17: Form III to the FRRO portal within 24 hours of a foreigner's
   arrival, and again within 24 hours of leaving.
   THIS SCREEN DOES NOT FILE, and says so: it is a REGISTER - who owes a
   filing, by the server's time, and the portal's number as evidence, one
   for each person (D27-382). Guest data (DPDP): read only by those who check
   guests in (GUEST_ID); no more than the web shows - the passport whole on
   the screen and the card, as the web's, and masked to its last four in an
   export, as the web's file. Recording a number and completing details are
   refused offline in the web's words (core offline.ts: /form-c).
   ══════════════════════════════════════════════════════════════════ */

const LABEL = { fontSize: 12, ...face[500], letterSpacing: 0.6, textTransform: "uppercase" as const, color: c.grey500 };
type DeskRules = { idTypesOff?: string[] };

export function FormC({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refused = whyNotReadFormC(role);
  const q = useDeskRead(() => (refused ? Promise.resolve(null) : readFormC(code)), ["finance", code, "desk", "form-c"]);
  const stop = useStop(`${code}/form-c`, q.began, q.reload);
  const [said, setSaid] = useState<Said | null>(null);
  const [editing, setEditing] = useState<FormCRow | null>(null);
  const [card, setCard] = useState<FormCRow | null>(null);
  const pulling = usePull(q.loading, () => { q.reload(); });
  const done = (s: Said | null) => { if (s) setSaid(s); void cache.invalidateQueries({ queryKey: ["finance", code] }); };
  const d = q.data;
  const pill = d ? formCPill(d) : null;

  return (
    <Screen refreshing={pulling.refreshing} onRefresh={pulling.pull}>
      <PageHead title="Form III" pill={pill ? <TonePill tone={pill.tone} words={pill.words} /> : null}
        under="Foreign guests reported to the FRRO: arrival and departure, each within 24 hours (Form III, earlier called Form C)." />
      {refused ? <RefusedCard title="Form III" why={refused} /> : (
        <>
          <DeskExport why={whyNotExport(role, "guests")} table={d ? formCTable(d, hotel.name) : null} />
          {/* Said on the screen: nobody reading this page may walk away believing the filing happened. */}
          <View style={{ flexDirection: "row", gap: 12, borderWidth: 1, borderColor: c.yellow100, backgroundColor: c.yellow50, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
            <ShieldAlert size={16} color={c.yellow800} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[t.label, { color: c.ink900, ...face[500] }]}>This system does not file with the FRRO</Text>
              <Text style={[t.label, { color: c.grey600, lineHeight: 21 }]}>Filing happens on the government portal, where the guest's photo is taken. This is a register: it names who owes a filing and records the number the portal gives back - one for each person in the room. The number is required - a register with no evidence reads as compliance and is not.</Text>
            </View>
          </View>
          {d && unrecordedLine(d) ? <Text style={[t.label, { color: c.yellow800, lineHeight: 21 }]}>{unrecordedLine(d)}</Text> : null}
          {said ? <SaidCard said={said} /> : null}
      <StopCard stop={stop} failed={Boolean(q.error)} />
          {!d ? <ReadState what="the Form III register" reading="Reading the Form III register…" error={q.error} onRetry={q.reload} />
            : d.rows.length === 0 ? (
              <Card style={{ alignItems: "center", gap: 6, paddingVertical: 24 }}>
                <Globe2 size={24} color={c.grey400} />
                <Text style={t.heading}>No foreign nationals have stayed</Text>
                <Text style={[t.label, { textAlign: "center", lineHeight: 20 }]}>Nothing is owed to the FRRO. A guest whose nationality is anything other than IN appears here on arrival.</Text>
              </Card>
            ) : <Register stop={stop} code={code} d={d} why={whyNotRecordFormC(role)} onSaid={setSaid} onDone={done} onEdit={setEditing} onCard={setCard} />}
          {d && allFiled(d) ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Check size={16} color={c.success} />
              <Text style={[t.label, { color: c.grey600 }]}>Every foreign national on record has been filed.</Text>
            </View>
          ) : null}
        </>
      )}
      {editing ? <CompleteDetails stop={stop} code={code} row={editing} idsOff={(hotel as Hotel & { deskRules?: DeskRules }).deskRules?.idTypesOff ?? []} onClose={() => setEditing(null)} onDone={done} /> : null}
      {card && d ? <CardSheet hotel={hotel} row={card} premises={d.premises} onClose={() => setCard(null)} /> : null}
    </Screen>
  );
}

/* The rows, and the portal's number typed where the button was. Keyed by the screen's pulls:
   a filing whose outcome is unknown stays stuck until the register is read again. */
function Register({ stop, code, d, why, onSaid, onDone, onEdit, onCard }: {
  stop: Stop; code: string; d: FormCRegister; why: string | null; onSaid: (s: Said) => void; onDone: (s: Said | null) => void;
  onEdit: (r: FormCRow) => void; onCard: (r: FormCRow) => void;
}) {
  const [open, setOpen] = useState<{ id: string; kind: FilingKind } | null>(null);
  const [reference, setReference] = useState("");
  const w = useWrite(stop, "recorded", "the register");
  const refused = (why: string) => onSaid({ tone: "refused", title: "Not recorded", text: why });
  const save = (r: FormCRow, kind: FilingKind) => void w.run(async () => {
    await recordFiling(code, r.reservationId, filingBody(r, kind, reference));
    setOpen(null);
    setReference("");
    onDone(null);
  }, (e, lost) => {
    /* Not known whether it was recorded: the number typed goes, so a repeat is typed on purpose (MEMORY 16). */
    if (lost) { setReference(""); setOpen(null); }
    onSaid(failedSaid(e, "Not recorded", "recorded", "the register"));
    onDone(null);
  });

  const entry = (r: FormCRow, kind: FilingKind, numbers: string[]) =>
    open?.id === rowOf(r) && open.kind === kind ? (
      <View style={{ gap: 6, marginTop: 4 }}>
        <Input value={reference} onChange={setReference} label={`FRRO ${kind} number`} placeholder="Portal number" caps="characters" />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn label="Save" kind="primary" busy={w.busy} off={!reference.trim() || w.stuck || w.out} onPress={() => save(r, kind)} />
          <Btn label="Cancel" kind="ghost" onPress={() => setOpen(null)} />
        </View>
      </View>
    ) : (
      <View style={{ flexDirection: "row" }}>
        <TextAct label={recordLabel(numbers)} why={why} onRefused={refused} onPress={() => { setOpen({ id: rowOf(r), kind }); setReference(""); }} />
      </View>
    );

  const clock = (r: FormCRow, at: string | null, due: string | null, overdue: boolean, numbers: string[], kind: FilingKind) => {
    const f = filing(numbers, overdue, due);
    return (
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[t.label, t.tab, { color: c.grey600 }]}>{clockAt(at)}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
          <TonePill tone={f.tone} words={f.pill} />
          <Text style={[t.caption, t.tab, { color: f.tone === "danger" ? c.red700 : f.tone === "success" ? c.ink900 : c.grey600, ...(f.tone === "danger" ? face[500] : {}) }]}>{f.words}</Text>
        </View>
        {entry(r, kind, numbers)}
      </View>
    );
  };

  return (
    <>
      {d.rows.map((r) => (
        <Card key={rowOf(r)} style={{ gap: 10 }}>
          <View style={{ gap: 2 }}>
            <Text style={[t.heading, face[500]]}>{r.guest}</Text>
            <Text style={[t.caption, t.tab]}>{guestLine(r)}</Text>
            {/* Every adult is recorded (D27-382): a warning, never a refusal. */}
            {r.recorded < r.adults ? <Text style={[t.caption, { color: c.yellow800 }]}>{peopleWords(r.adults, r.recorded)}</Text> : null}
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Text style={[LABEL, { width: 110 }]}>Passport</Text>
            {/* Not hidden and not blank: no passport on record is somebody's job this morning. */}
            {r.passport ? <Text style={[t.label, t.tab, { color: c.ink900 }]}>{r.passport}</Text> : <Text style={[t.caption, { color: c.red700 }]}>not on record</Text>}
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Text style={[LABEL, { width: 110 }]}>Arrival</Text>
            {clock(r, r.arrivedAt, r.dueBy, r.overdue, r.arrivalNumbers, "arrival")}
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Text style={[LABEL, { width: 110 }]}>Departure</Text>
            {r.status === "checked_out" ? clock(r, r.departedAt, r.departureDueBy, r.departureOverdue, r.departureNumbers, "departure")
              : <Text style={[t.caption, { flex: 1 }]}>In house</Text>}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
            <Btn label="Complete details" why={why} onRefused={refused} onPress={() => onEdit(r)} />
            <IconBtn Icon={Printer} label={`Print the Form III card for ${r.guest}`} onPress={() => onCard(r)} />
          </View>
        </Card>
      ))}
    </>
  );
}

/* ── Complete details: what check-in left blank, filled in later ── */
function CompleteDetails({ stop, code, row, idsOff, onClose, onDone }: {
  stop: Stop; code: string; row: FormCRow; idsOff: string[]; onClose: () => void; onDone: (s: Said | null) => void;
}) {
  const [value, setValue] = useState<Record<string, string>>(() => particularsOf(row));
  const [idType, setIdType] = useState(typeof row["idType"] === "string" ? (row["idType"] as string) : "");
  const [idNumber, setIdNumber] = useState(row.passport ?? "");
  const [problem, setProblem] = useState<string | null>(null);
  const w = useWrite(stop, "saved", "the guest's details");
  const doc = documentChange(row, idType, idNumber, idNumberProblem);
  const required = new Set(requiredKeys(row.nationality, Boolean(idType && idNumber.trim())));
  const close = () => { onClose(); onDone(null); };
  const save = () => {
    const typed = particularsPayload(value);
    const body = {
      ...typed,
      identity: doc.changed && idType ? { ...typed.identity, idType, idNumber: idNumber.trim() } : typed.identity,
      ...(row.companion ? { guestId: row.guestId } : {}),
    };
    setProblem(null);
    void w.run(async () => {
      await completeDetails(code, row.reservationId, body);
      onClose();
      onDone(null);
    }, (e, lost) => { const x = failedSaid(e, "Nothing was saved", "saved", "the guest's details"); if (lost) { onClose(); onDone(x); return; } setProblem(x.text ? `${x.title}. ${x.text}` : x.title); });
  };
  const box = ([key, label, kind]: Spec) => {
    if (key === "purposeOther" && value["purpose"] !== "others") return null;
    const set = (v: string) => setValue({ ...value, [key]: v });
    const on = value[key] ?? "";
    const list = kind === "gender" ? GENDERS : kind === "purpose" ? PURPOSES : kind === "yesno" ? ([["yes", "Yes"], ["no", "No"]] as const) : null;
    return (
      <Field key={key} label={label} required={required.has(key)}>
        {list ? (
          <Choice label={label} value={on} onPick={set} options={[{ value: "", label: "Not recorded" }, ...list.map(([v, l]) => ({ value: v, label: l }))]} />
        ) : (
          <Input value={on} onChange={set} label={label} placeholder={kind === "date" ? "YYYY-MM-DD" : undefined}
            keyboard={kind === "tel" ? "phone-pad" : kind === "date" ? "numbers-and-punctuation" : undefined} />
        )}
      </Field>
    );
  };
  return (
    <DeskSheet busy={w.out} title="Complete details" description={`${row.guest} · ${row.nationality} · room ${row.room}`} onClose={close} footer={(
      <>
        <Btn label="Cancel" off={w.out} onPress={close} />
        <Btn label="Save" kind="primary" busy={w.busy} off={doc.wrong !== null || w.stuck || w.out} onPress={save} />
      </>
    )}>
      <Refused text={problem} />
      <Field label="Document">
        <Choice label="Document" value={idType} onPick={setIdType}
          options={[{ value: "", label: "Not recorded" }, ...ID_TYPES.filter(([v]) => v === idType || !idsOff.includes(v)).map(([v, l]) => ({ value: v, label: l }))]} />
      </Field>
      <Field label="Number">
        <Input value={idNumber} onChange={setIdNumber} label="Number" off={!idType} caps="characters" placeholder={idType === "passport" ? "P1234567" : "Document number"} />
      </Field>
      {doc.wrong ? <Text style={[t.label, { color: c.red700 }]}>{doc.wrong}</Text> : null}
      <View style={{ gap: 16, borderLeftWidth: 2, borderLeftColor: c.yellow, paddingLeft: 14 }}>
        {PERSON.map(box)}
        <Text style={[t.label, { color: c.ink900 }]}>This visit</Text>
        {VISIT.map(box)}
        {row.status === "checked_out" ? box(["nextDestination", "Next destination", "text"]) : null}
      </View>
    </DeskSheet>
  );
}

/* ── The card the guest signs: Form III's own order, then two signature lines ── */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function CardSheet({ hotel, row, premises, onClose }: { hotel: Hotel; row: FormCRow; premises: FormCRegister["premises"]; onClose: () => void }) {
  const lines = cardLines(row, premises, PURPOSES);
  const [said, setSaid] = useState<string | null>(null);
  /* A test hotel's card says so across its head, so a practice guest's card is never filed (D27-296 (8)). */
  const test = Boolean(hotel.testOf);
  const print = () => {
    setSaid(null);
    const body = lines.map((l) => typeof l === "string" ? `<h3>${esc(l)}</h3>` : `<div class="r"><span>${esc(l[0])}</span><b>${esc(l[1])}</b></div>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,Roboto,Inter,sans-serif;color:#031728;margin:28px;font-size:12px}
h1{font-size:18px;margin:0} h2{font-size:14px;margin:2px 0 8px;color:#4c5b67} h3{font-size:11px;text-transform:uppercase;letter-spacing:.06em;margin:14px 0 4px;padding-bottom:3px;border-bottom:2px solid #0b2135}
.r{display:flex;gap:12px;padding:3px 0;border-bottom:1px solid #e2e5e8}.r span{width:14rem;color:#67737e}.r b{font-weight:500}
.sig{display:flex;gap:32px;margin-top:48px}.sig p{flex:1;border-top:2px solid #0b2135;padding-top:6px}.test{color:#c52a1a;font-weight:700;border:2px solid #c52a1a;padding:4px 8px;display:inline-block;margin-bottom:8px}
</style></head><body>${test ? '<div class="test">TEST · NOT VALID</div>' : ""}<h1>${esc(premises?.name ?? DASH)}</h1><h2>Form III</h2>
<p>Report on a foreigner accommodated (Immigration and Foreigners Rules 2025, Rule 17). The photograph is taken on the FRRO portal.</p>${body}
<div class="sig"><p>Guest's signature on arrival, and date</p><p>Guest's signature on departure, and date</p></div>
<p style="color:#67737e">A guest who cannot write signs with a thumb impression (Rule 17(7)). Keep this card; the record is kept for at least a year (Rule 17(1)).</p></body></html>`;
    Print.printAsync({ html }).catch((e: unknown) => setSaid(e instanceof Error ? e.message : "Could not open the print sheet."));
  };
  return (
    <DeskSheet title="Form III" description={`${premises?.name ?? DASH}${test ? " · TEST · NOT VALID" : ""}`} onClose={onClose} footer={(
      <>
        <Btn label="Back" onPress={onClose} />
        <Btn label="Print" kind="primary" Icon={Printer} onPress={print} />
      </>
    )}>
      <Text style={[t.caption, { lineHeight: 16 }]}>Report on a foreigner accommodated (Immigration and Foreigners Rules 2025, Rule 17). The photograph is taken on the FRRO portal.</Text>
      {lines.map((l) => typeof l === "string" ? (
        <Text key={l} style={[LABEL, { color: c.ink900, marginTop: 6, paddingBottom: 4, borderBottomWidth: 2, borderBottomColor: c.ink800 }]}>{l}</Text>
      ) : (
        <View key={l[0]} style={{ gap: 2, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
          <Text style={t.caption}>{l[0]}</Text>
          <Text style={[t.label, t.tab, { color: c.ink900 }]}>{l[1]}</Text>
        </View>
      ))}
      <Text style={[t.caption, { lineHeight: 16 }]}>A guest who cannot write signs with a thumb impression (Rule 17(7)). Keep this card; the record is kept for at least a year (Rule 17(1)).</Text>
      {said ? <Text style={[t.caption, { color: c.red700 }]}>{said}</Text> : null}
    </DeskSheet>
  );
}
