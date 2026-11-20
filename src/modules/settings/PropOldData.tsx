import { useQueryClient } from "@tanstack/react-query";
import { FileUp, Undo2 } from "lucide-react-native";
import { useRef, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { outcomeUnknown } from "../../core/api";
import { OLD_SYSTEM_FILE } from "../../core/files";
import { pickFile } from "../../core/pickers";
import { c, face, t } from "../../core/theme";
import { s as core, confirmAct, notKnown } from "../../core/ui";
import { Btn, Choose, Empty, Field, Labelled, Pill, Segmented, Sheet, Toast, body, useSaid } from "../admin/kit";
import type { AdminProps } from "../admin/Route";
import { dateShort, dateTime } from "../admin/rules";
import { CardHead, PageFrame, Read, StuckLine, refusedPage, usePage, usePickData, useWrites } from "./PropertyKit";
import { bringIn, checkImport, readImports, undoImport } from "./propertyData";
import {
  KIND_WORDS, NAME_THE_SYSTEM, broughtInWords, broughtWords, choiceOf, choiceValue, countsWords, everyDupe, kindNote, rowProblems,
  rowResult, saveBlocked, savingOf, voucherWords, type ImportCheck, type ImportChoice, type ImportKind, type ImportRecord,
} from "./propertyRules";

/* ══════════════════════════════════════════════════════════════════
   BRING IN OLD DATA on a phone — Settings → Property → Bring in old data
   (the web's oldData/OldDataPage.tsx, D27-383 item 7, D27-396): an old
   system's guests, its bookings to come and its past stays, from an Excel
   or CSV file. The owner and an Admin only (the console's switchesModules;
   the server asks again on every call, app.imports_old_data, and its
   refusal is the page's answer, in its words).

   THIS CHANGES REAL DATA, SO IT IS EXACTLY THE WEB'S STEPS (M-16, 20 Nov):
     1  what the file holds, the old system's name (asked first, the web's
        sentence), and the file - the phone's own file picker (.xlsx, .csv,
        .txt; 5 MB and a 200-character name, the server's sentences, checked
        before it is sent), sent as base64 to POST /:code/imports/:kind/check,
        which reads every row and SAVES NOTHING;
     2  the file's columns (each a choice of its headings, kept for the
        next file) and every row - what it becomes, or why not; a guest
        already on file waits for keep, merge or skip (one by one, or "for
        all of them"); a change greys Bring in until Check again;
     3  Bring in N rows: POST /:code/imports/:kind, one transaction, all of
        it or none. The web asks nothing more (its check is the confirmation),
        nor does the phone. "Send each guest our booking voucher" is off
        unless switched on, and only where the hotel's voucher is on.
   Bring in reads no key and a repeat brings the file in TWICE: it goes
   through the page's stop (the core's, MEMORY 16 and 22) - after an
   unknown outcome every act is grey until a read of "Brought in here"
   begun after it. A check is a read in all but name: never stopped.
   Neither is held offline (send()'s refusal, not on the web's list).
   ONE DIFFERENCE: a Bring in the server refuses with its rows (a fault found
   at the save, 409) shows them on the web; the phone's core keeps only the
   sentence, so it says it and asks for Check again, which shows them.
   At phone width the rows are cards, 50 at a time (the server allows 5,000).

   Below: what was brought in (who, when, the file, rows in and refused,
   vouchers, what came in), its refused rows, Undo (POST /:code/imports/
   :id/undo, asking first in the web's words), and the bookings brought in
   with no rate (a dash, never a zero). GET /:code/imports. Not pictured.
   ══════════════════════════════════════════════════════════════════ */

/** The rows drawn at a time, and added by "Show more". */
const ROWS_AT_A_TIME = 50;

export function PropOldData({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const refused = refusedPage(role, "/settings/property/old-data", "Bring in old data");
  const { said, say, close } = useSaid();
  const { q, stop } = usePage(code, "old-data", () => (refused ? Promise.resolve(null) : readImports(code)));
  const w = useWrites(stop, q.reload, say);
  const [pulled, setPulled] = useState(false);
  const cache = useQueryClient();
  const [kind, setKind] = useState<ImportKind>("guests");
  const [system, setSystem] = useState("");
  const [file, setFile] = useState<{ name: string; data: string } | null>(null);
  const [check, setCheck] = useState<ImportCheck | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [columns, setColumns] = useState<Record<string, string>>({});
  const [choices, setChoices] = useState<Record<string, ImportChoice>>({});
  /** The columns or a choice changed since the last check. */
  const [stale, setStale] = useState(false);
  /* "Send each guest our booking voucher": off unless switched on (the master, under D27-396). */
  const [sendVouchers, setSendVouchers] = useState(false);
  const [busy, setBusy] = useState<"check" | "save" | null>(null);
  const going = useRef(false);
  const [shownRows, setShownRows] = useState(ROWS_AT_A_TIME);
  /* A file the server's limits refuse is said in the card, as the web's `problem`. */
  const files = usePickData((x) => setProblem(x.body ?? x.title));
  const off = w.off || busy !== null || files.picking;
  const [refusedOf, setRefusedOf] = useState<ImportRecord | null>(null);
  const lastSystem = q.data?.imports?.[0]?.system ?? "";
  const systemName = system || lastSystem;

  const reset = () => {
    setFile(null); setCheck(null); setProblem(null); setColumns({}); setChoices({}); setStale(false); setShownRows(ROWS_AT_A_TIME);
  };
  /* OldDataPage `ask`: checked (nothing saved), or brought in (all or none). */
  const ask = async (f: { name: string; data: string }, save: boolean, cols?: Record<string, string>) => {
    if (!systemName.trim()) { setProblem(NAME_THE_SYSTEM); return; }
    if (going.current || (save && stop.isStuck())) return;
    going.current = true;
    setBusy(save ? "save" : "check");
    setProblem(null);
    const body = { name: f.name, data: f.data, system: systemName.trim(), columns: cols, choices, sendVouchers };
    try {
      if (save) {
        const out = await stop.guard(() => bringIn(code, kind, body));
        say({ title: "Brought in", body: broughtInWords(out.counts), tone: "ok" });
        reset();
        setSendVouchers(false);
        void cache.invalidateQueries();
        return;
      }
      const out = await checkImport(code, kind, body);
      setCheck(out);
      setColumns(out.columns ?? {});
      setStale(false);
      setShownRows(ROWS_AT_A_TIME);
      if (out.reason) setProblem(out.reason);
    } catch (e) {
      const said = e instanceof Error ? e.message : String(e);
      if (save && outcomeUnknown(e)) setProblem(notKnown("brought in", "Brought in here below", e).body);
      /* Refused at the save: nothing was saved. The web shows the rows the server sent; here, check again. */
      else if (save) { setProblem(said); setStale(true); }
      else { setProblem(said); setCheck(null); }
    } finally {
      going.current = false;
      setBusy(null);
    }
  };
  const choose = async () => {
    if (off) return;
    const got = await files.pick(() => pickFile({ types: OLD_SYSTEM_FILE.types }), OLD_SYSTEM_FILE, () => "Not read");
    if (!got) return;
    reset();
    const f = { name: got.picked.name, data: got.data };
    setFile(f);
    void ask(f, false);
  };
  const undo = (d: ImportRecord) => confirmAct("Undo this import?",
    `${d.fileName}, ${dateTime(d.madeAt)}. Every guest, booking, advance and past stay it brought in is taken away, and the empty fields it filled are empty again. Refused if anything has touched them since.`,
    "Undo it", () => void w.write(() => undoImport(code, d.id), {
      ok: () => ({ title: "Undone", body: `${d.fileName}: everything it brought in is taken away.`, tone: "ok" }),
      done: "undone", where: "Brought in here", no: "Not undone",
    }), "Keep it");
  return (
    <View style={{ flex: 1 }}>
      <PageFrame title="Bring in old data" under="An old system's guests, its bookings to come and its past stays, from an Excel or CSV file."
        refused={refused} refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        <Read q={q} what="what was brought in">
          {(v) => {
            if (!v) return null;
            if (!v.may) return <View style={core.card}><Text style={[t.label, { fontSize: 16, color: c.ink900 }]}>{v.reason}</Text></View>;
            const counts = check?.counts;
            const saving = savingOf(counts);
            const blocked = saveBlocked(check, stale);
            const dupes = check?.rows.filter((r) => r.matches) ?? [];
            const allDupes = (how: "keep" | "merge" | "skip") => { setChoices((now) => everyDupe(check?.rows ?? [], now, how)); setStale(true); };
            return (
              <>
                <StuckLine w={w} />
                <View style={[core.card, { gap: 14 }]}>
                  <CardHead title="Bring in a file" line="Every row is checked and shown before anything is saved; then all of it is saved at once." />
                  <View style={{ gap: 6 }}>
                    <Text style={[t.label, { color: c.grey700 }]}>What the file holds</Text>
                    <Segmented label="What the file holds" value={kind} onChange={(k) => { if (off) return; setKind(k); reset(); setSendVouchers(false); }}
                      options={[{ value: "guests", label: KIND_WORDS.guests }, { value: "bookings", label: KIND_WORDS.bookings }]} />
                  </View>
                  <Field label="The old system" required editable={!off} maxLength={60} placeholder={lastSystem || "IDS, eZee, our spreadsheet"}
                    value={system} onChangeText={setSystem} />
                  <View style={{ alignSelf: "flex-start" }}>
                    <Btn variant="primary" label={busy === "check" ? "Checking…" : file ? "Choose another file" : "Choose the file"} disabled={off}
                      a11y={file ? "Choose another file" : "Choose the old system's file"} icon={<FileUp size={16} color={off ? c.grey500 : c.white} />}
                      onPress={() => void choose()} />
                  </View>
                  <Text style={[body, { color: c.grey600 }]}>{kindNote(kind, v.firstDay ? dateShort(v.firstDay) : "-")}</Text>
                  {kind === "bookings" ? (
                    <View style={{ gap: 4 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 }}>
                        <Text style={[t.label, { flex: 1, color: v.voucherOn ? c.ink900 : c.grey500, ...face[600] }]}>Send each guest our booking voucher</Text>
                        <Switch value={sendVouchers && !!v.voucherOn} onValueChange={setSendVouchers} disabled={!v.voucherOn || off}
                          accessibilityLabel="Send each guest our booking voucher"
                          trackColor={{ false: c.grey300, true: c.orange }} thumbColor={c.white} ios_backgroundColor={c.grey300} />
                      </View>
                      <Text style={[body, { color: c.grey600 }]}>
                        {!v.voucherOn ? "The booking voucher is switched off at this hotel (Settings, Messages), so none goes."
                          : sendVouchers ? "Each booking's guest with an email is sent this hotel's voucher, with its new reference, once it is brought in."
                            : "Off: their old system confirmed them, so no message goes to these guests now. Later messages follow the hotel's settings, as for any booking."}
                      </Text>
                    </View>
                  ) : null}
                  {problem ? (
                    <Text accessibilityRole="alert" style={[body, { color: c.ink900, borderRadius: 8, borderWidth: 1, borderColor: c.red100, backgroundColor: c.red50, paddingHorizontal: 12, paddingVertical: 8 }]}>{problem}</Text>
                  ) : null}
                </View>

                {check && file ? (
                  <>
                    <View style={[core.card, { gap: 12 }]}>
                      <CardHead title="The file's columns" line={`${file.name}. Matched by their headings; change any that is wrong. This match is kept for the next file.`} />
                      {check.fields.map((f) => (
                        <Choose key={f.key} label={f.required ? `${f.label} *` : f.label} hint={f.note ?? undefined} value={columns[f.key] ?? ""} none="Not in the file"
                          disabled={off} choices={[...new Set(check.headers.filter(Boolean))].map((h) => ({ value: h, label: h }))}
                          onChange={(h) => { setColumns((cols) => ({ ...cols, [f.key]: h })); setStale(true); }} />
                      ))}
                    </View>

                    <View style={[core.card, { gap: 12 }]}>
                      <CardHead title="Every row, before anything is saved" line={counts ? countsWords(counts) : undefined} />
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        <Btn label={busy === "check" ? "Checking…" : "Check again"} disabled={off} onPress={() => void ask(file, false, columns)} />
                        <Btn variant="primary" label={busy === "save" ? "Bringing in…" : `Bring in ${saving} ${saving === 1 ? "row" : "rows"}`}
                          disabled={off || blocked !== null} onPress={() => void ask(file, true, columns)} />
                      </View>
                      {blocked ? <Text style={t.caption}>{blocked}</Text> : null}
                      {dupes.length > 1 ? (
                        <View style={{ gap: 8, borderTopWidth: 1, borderColor: c.grey100, paddingTop: 10 }}>
                          <Text style={[body, { color: c.grey600 }]}>{`${dupes.length} already on file. For all of them:`}</Text>
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                            <Btn label="Keep" disabled={off} onPress={() => allDupes("keep")} />
                            <Btn label="Merge where one matches" disabled={off} onPress={() => allDupes("merge")} />
                            <Btn label="Skip" disabled={off} onPress={() => allDupes("skip")} />
                          </View>
                        </View>
                      ) : null}
                      {check.ok === false && (counts?.faults ?? 0) > 0 ? (
                        <Text style={[body, { color: c.red700 }]}>Nothing is saved until every fault below is corrected in the file and it is checked again.</Text>
                      ) : null}
                      {check.rows.length === 0 ? <Empty title="No rows" description="Match the required columns, then check again." /> : (
                        <>
                          {check.rows.slice(0, shownRows).map((r) => {
                            const res = rowResult(r);
                            return (
                              <View key={r.line} style={{ gap: 6, paddingTop: 12, borderTopWidth: 1, borderColor: c.grey100 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                  <Text style={[t.label, t.tab, { color: c.grey600 }]}>{`Row ${r.line}`}</Text>
                                  <Pill tone={res.tone}>{res.word}</Pill>
                                </View>
                                <Text style={[body, { color: c.ink900, ...face[600] }]}>{r.name || "-"}</Text>
                                {r.what ? <Text style={[body, { color: c.grey600 }]}>{r.what}</Text> : null}
                                {r.matches ? (
                                  <Choose label="Keep, merge or skip" value={choiceValue(choices[String(r.line)])} none="Choose…" disabled={off}
                                    choices={[{ value: "keep", label: "Keep: a new guest record" },
                                      ...r.matches.map((m) => ({ value: `merge:${m.id}`, label: `Merge with ${m.name}${m.visits ? ` (${m.visits} ${m.visits === 1 ? "visit" : "visits"})` : ""}` })),
                                      { value: "skip", label: "Skip this row" }]}
                                    onChange={(pick) => {
                                      setChoices((now) => {
                                        const { [String(r.line)]: _gone, ...rest } = now;
                                        return pick ? { ...rest, [String(r.line)]: choiceOf(pick) } : rest;
                                      });
                                      setStale(true);
                                    }} />
                                ) : null}
                                {rowProblems(r).map((x, n) => <Text key={`p${n}`} style={[body, { color: c.red700 }]}>{x}</Text>)}
                                {r.refused ? <Text style={[body, { color: c.red700 }]}>{r.refused}</Text> : null}
                                {r.notes.map((x, n) => <Text key={`n${n}`} style={[body, { color: c.grey600 }]}>{x}</Text>)}
                              </View>
                            );
                          })}
                          {check.rows.length > shownRows ? (
                            <Btn label={`Show ${Math.min(ROWS_AT_A_TIME, check.rows.length - shownRows)} more of ${check.rows.length - shownRows}`}
                              onPress={() => setShownRows((n) => n + ROWS_AT_A_TIME)} />
                          ) : null}
                        </>
                      )}
                    </View>
                  </>
                ) : null}

                {(v.noRate?.length ?? 0) > 0 ? (
                  <View style={[core.card, { gap: 12 }]}>
                    <CardHead title="Bookings with no rate yet"
                      line="Brought in with none. Set each one's rate before the guest arrives (Change rate, on its bill); check-in refuses it until then." />
                    {v.noRate!.map((r, i) => (
                      <View key={r.id} style={{ gap: 10, paddingTop: i === 0 ? 0 : 12, borderTopWidth: i === 0 ? 0 : 1, borderColor: c.grey100 }}>
                        <View style={{ flexDirection: "row", gap: 16 }}>
                          <View style={{ flex: 1 }}><Labelled label="Booking" value={r.reference} strong /></View>
                          <View style={{ flex: 1 }}><Labelled label="Guest" value={r.guest} /></View>
                        </View>
                        <View style={{ flexDirection: "row", gap: 16 }}>
                          <View style={{ flex: 1 }}><Labelled label="Arrival" value={dateShort(r.arrival)} /></View>
                          <View style={{ flex: 1 }}><Labelled label="Room type" value={r.roomType} /></View>
                          <View style={{ flex: 1 }}><Labelled label="Rate" value="-" /></View>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}

                <View style={[core.card, { gap: 12 }]}>
                  <CardHead title="Brought in here" line="Each file: who, when, rows in and rows refused. Undo takes all of it back, while nothing has touched it." />
                  {(v.imports ?? []).length === 0 ? <Empty title="Nothing brought in yet" description="A file brought in is listed here." /> : v.imports!.map((d, i) => (
                    <View key={d.id} style={{ gap: 10, paddingTop: i === 0 ? 0 : 12, borderTopWidth: i === 0 ? 0 : 1, borderColor: c.grey100 }}>
                      <View style={{ gap: 2 }}>
                        <Text style={[t.label, { fontSize: 16, color: c.ink900, ...face[600] }]}>{d.fileName}</Text>
                        <Text style={[body, { color: c.grey600 }]}>{`${KIND_WORDS[d.kind]} from ${d.system}`}</Text>
                      </View>
                      <View style={{ flexDirection: "row", gap: 16 }}>
                        <View style={{ flex: 1 }}><Labelled label="When" value={dateTime(d.madeAt)} /></View>
                        <View style={{ flex: 1 }}><Labelled label="By" value={d.madeBy ?? "-"} /></View>
                      </View>
                      <View style={{ flexDirection: "row", gap: 16 }}>
                        <View style={{ flex: 1 }}><Labelled label="Rows in" value={String(d.rowsIn)} /></View>
                        <View style={{ flex: 1 }}>
                          <Labelled label="Refused">
                            {d.rowsRefused === 0 ? <Text style={[body, t.tab, { color: c.grey700 }]}>0</Text> : (
                              <Pressable onPress={() => setRefusedOf(d)} accessibilityRole="button" accessibilityLabel={`${d.rowsRefused} rows refused: see them`}
                                style={{ minHeight: 44, justifyContent: "center" }}>
                                <Text style={[body, t.tab, { color: c.orange700, ...face[600], textDecorationLine: "underline" }]}>{String(d.rowsRefused)}</Text>
                              </Pressable>
                            )}
                          </Labelled>
                        </View>
                        <View style={{ flex: 1 }}><Labelled label="Vouchers" value={voucherWords(d)} /></View>
                      </View>
                      <Labelled label="Brought in" value={broughtWords(d)} />
                      {d.undoneAt ? (
                        <Text style={[body, { color: c.grey600 }]}>{`Undone ${dateShort(d.undoneAt)}${d.undoneBy ? ` by ${d.undoneBy}` : ""}`}</Text>
                      ) : (
                        <View style={{ alignSelf: "flex-start" }}>
                          <Btn label={w.busy ? "…" : "Undo"} a11y={`Undo ${d.fileName}`} disabled={off} icon={<Undo2 size={16} color={off ? c.grey500 : c.ink900} />} onPress={() => undo(d)} />
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </>
            );
          }}
        </Read>
      </PageFrame>
      {refusedOf ? (
        <Sheet open title="Rows not brought in" onClose={() => setRefusedOf(null)}
          description={`${refusedOf.fileName}: these rows are not in the system. Enter them at the desk, or correct them and bring them in again.`}
          footer={<Btn label="Close" grow onPress={() => setRefusedOf(null)} />}>
          {refusedOf.refused.map((r) => (
            <Text key={r.line} style={[body, { color: c.ink900 }]}><Text style={[t.tab, { color: c.grey600 }]}>{`Row ${r.line}: `}</Text>{r.reason}</Text>
          ))}
        </Sheet>
      ) : null}
      <Toast said={said} onClose={close} />
    </View>
  );
}
