import { FileUp, Undo2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { ON_THE_WEBSITE } from "../../core/menu";
import { c, face, t } from "../../core/theme";
import { s as core, confirmAct } from "../../core/ui";
import { Btn, Empty, Field, Labelled, Segmented, Sheet, Toast, body, useSaid } from "../admin/kit";
import type { AdminProps } from "../admin/Route";
import { dateShort, dateTime } from "../admin/rules";
import { CardHead, PageFrame, Read, StuckLine, refusedPage, usePage, useWrites } from "./PropertyKit";
import { readImports, undoImport } from "./propertyData";
import { KIND_WORDS, broughtWords, kindNote, voucherWords, type ImportKind, type ImportRecord } from "./propertyRules";

/* ══════════════════════════════════════════════════════════════════
   BRING IN OLD DATA on a phone — Settings → Property → Bring in old data
   (the web's oldData/OldDataPage.tsx, D27-383 item 7, D27-396): an old
   system's guests, its bookings to come and its past stays, from an Excel
   or CSV file. The owner and an Admin only (the console's switchesModules;
   the server asks again on every call, app.imports_old_data, and its
   refusal is the page's answer, in its words).

   THE FILE IS THE WHOLE OF STEPS 1 TO 3 (choose the file, match its
   columns and see every row, bring it in), and the phone cannot choose a
   file yet (expo-document-picker ~57.0.3, not installed): those three are
   greyed "On the website for now", said plainly on the card. What does
   not need a file is here: the list of what was brought in (who, when, the
   file, rows in and refused, vouchers, what came in), its refused rows,
   Undo (POST /:code/imports/:id/undo, asking first in the web's words), and
   the bookings brought in with no rate (the rate a dash, never a zero).
   GET /:code/imports. Not pictured. The web downloads nothing here.
   ══════════════════════════════════════════════════════════════════ */

const DOC_PICKER = "expo-document-picker ~57.0.3";

export function PropOldData({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const refused = refusedPage(role, "/settings/property/old-data", "Bring in old data");
  const { said, say, close } = useSaid();
  const { q, stop } = usePage(code, "old-data", () => (refused ? Promise.resolve(null) : readImports(code)));
  const w = useWrites(stop, q.reload, say);
  const [pulled, setPulled] = useState(false);
  const [kind, setKind] = useState<ImportKind>("guests");
  const [refusedOf, setRefusedOf] = useState<ImportRecord | null>(null);
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
            const lastSystem = v.imports?.[0]?.system ?? "";
            return (
              <>
                <StuckLine stuck={w.stuck} />
                <View style={[core.card, { gap: 14 }]}>
                  <CardHead title="Bring in a file" line="Every row is checked and shown before anything is saved; then all of it is saved at once." />
                  <View style={{ gap: 6 }}>
                    <Text style={[t.label, { color: c.grey700 }]}>What the file holds</Text>
                    <Segmented label="What the file holds" value={kind} onChange={setKind}
                      options={[{ value: "guests", label: KIND_WORDS.guests }, { value: "bookings", label: KIND_WORDS.bookings }]} />
                  </View>
                  <Field label="The old system" required editable={false} placeholder={lastSystem || "IDS, eZee, our spreadsheet"} value="" onChangeText={() => undefined} />
                  <View style={{ gap: 4 }}>
                    <View style={{ alignSelf: "flex-start" }}>
                      <Btn variant="primary" label="Choose the file" a11y={`Choose the file: ${ON_THE_WEBSITE}`} disabled onPress={() => undefined} icon={<FileUp size={16} color={c.grey500} />} />
                    </View>
                    <Text style={[body, { color: c.grey600 }]}>
                      {`${ON_THE_WEBSITE}: choosing the file, matching its columns, seeing every row and bringing it in all need the file, and the phone cannot choose one yet (${DOC_PICKER}, not installed). Bring a file in on the website; it is listed below once it is in.`}
                    </Text>
                  </View>
                  <Text style={[body, { color: c.grey600 }]}>{kindNote(kind, v.firstDay ? dateShort(v.firstDay) : "-")}</Text>
                  {kind === "bookings" ? (
                    <View style={{ gap: 4 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 }}>
                        <Text style={[t.label, { flex: 1, color: c.grey500, ...face[600] }]}>Send each guest our booking voucher</Text>
                        <Switch value={false} disabled accessibilityLabel={`Send each guest our booking voucher: ${ON_THE_WEBSITE}`}
                          trackColor={{ false: c.grey300, true: c.orange }} thumbColor={c.white} ios_backgroundColor={c.grey300} />
                      </View>
                      <Text style={[body, { color: c.grey600 }]}>
                        {!v.voucherOn ? "The booking voucher is switched off at this hotel (Settings, Messages), so none goes."
                          : "Off: their old system confirmed them, so no message goes to these guests now. Later messages follow the hotel's settings, as for any booking."}
                      </Text>
                    </View>
                  ) : null}
                </View>

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
                          <Btn label={w.busy ? "…" : "Undo"} a11y={`Undo ${d.fileName}`} disabled={w.off} icon={<Undo2 size={16} color={w.off ? c.grey500 : c.ink900} />} onPress={() => undo(d)} />
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
