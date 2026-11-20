import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import { c, t } from "../../core/theme";
import { s as core, confirmAct, keys, useRead } from "../../core/ui";
import { Btn, Choose, Empty, Field, Pill, Segmented, Sheet, body, saidOf, useSaid } from "../admin/kit";
import type { AdminProps } from "../admin/Route";
import { getSchedules, removeSchedule, saveSchedule } from "./msgData";
import { MsgPage, NotSent, StuckLine, unknownSaid, usePageWrite } from "./MsgKit";
import {
  NEW, PERIOD_WORDS, WEEKDAYS, lastLine, mayAdd, pausedInput, periodLine, periodsFor, periodsHint, pickReport, refusedPage, removeWords,
  schedulable, draftOf, toInput, toLine, type Draft, type FileType, type Frequency, type Period, type Schedule, type Schedules,
} from "./msgRules";

/* ══════════════════════════════════════════════════════════════════
   SETTINGS → MESSAGES → SCHEDULED REPORTS on a phone (lane
   m13-set-messages) — the web's src/modules/reports/pages/
   ScheduledReports.tsx (the owner's D27-383 item 5).

   Any report by email after the night audit of its day: every day, once a
   week on a chosen day, or once a month on a chosen date, for a period
   worked out from the day closed, as a PDF or Excel, to the addresses
   typed. Added, changed, paused and taken off here; the last send shown.
   The web's dialog is a bottom sheet (its own safe area, over the
   keyboard); its selects are the kit's sheets of choices; "Take it off"
   asks first with each phone's own dialog, in the web's words. The owner,
   an administrator or the GM; the server asks again on every call and
   says why it refuses (api/src/modules/reports/emails.ts scheduleOf).

   POST /report-schedules reads no key: while a save is on its way the
   sheet cannot close and the page sends nothing else; after an unknown
   outcome the sheet closes (the typed schedule goes, MEMORY 16), the list
   is read again, and nothing more is sent until that read, begun after
   the loss, is back (MEMORY 22). Not pictured: built from the web's code.
   ══════════════════════════════════════════════════════════════════ */

type Editing = { id: string | null; draft: Draft };

export function MsgSchedules(props: AdminProps) {
  const code = props.hotel.code;
  const cache = useQueryClient();
  const { said, say, close } = useSaid();
  const key = ["settings", code, "report-schedules"];
  const read = useRead(() => (refusedPage(props.role, "schedules") ? Promise.resolve(null) : getSchedules(code)), key);
  const write = usePageWrite(code, "schedules");
  const [editing, setEditing] = useState<Editing | null>(null);
  /* Which row's Pause is on its way, for its words. */
  const [pausing, setPausing] = useState<string | null>(null);
  const again = () => void cache.invalidateQueries({ queryKey: key });
  const lost = (done: string) => (e: unknown) => { setEditing(null); say(unknownSaid(done, "the list of schedules", e)); again(); };

  const save = (id: string | null, input: ReturnType<typeof toInput>, after?: () => void) => write.run(() => saveSchedule(code, id, input), {
    ok: () => { after?.(); setEditing(null); say({ title: id ? "Saved" : "Schedule added", tone: "ok" }); again(); },
    no: (e) => { after?.(); say(saidOf(e, "Not saved")); },
    unknown: (e) => { after?.(); lost(id ? "saved" : "added")(e); },
  });
  const pause = (sc: Schedule) => { setPausing(sc.id); void save(sc.id, pausedInput(sc), () => setPausing(null)); };
  const remove = (sc: Schedule) => {
    const w = removeWords(sc);
    confirmAct(w.title, w.body, w.act, () => void write.run(() => removeSchedule(code, sc.id), {
      ok: () => { say({ title: "Schedule taken off", tone: "ok" }); again(); },
      no: (e) => say(saidOf(e, "Not taken off")),
      unknown: lost("taken off"),
    }), w.keep);
  };

  return (
    <MsgPage props={props} page="schedules" title="Scheduled reports" what="the scheduled reports"
      under="Any report by email, after the night audit closes its day: every day, once a week or once a month."
      read={read} said={said} onSaid={close}>
      {(data, writeRefused) => {
        const off = write.busy || write.stuck || writeRefused !== null;
        return (
          <>
            <NotSent sentence={data.notConnected} />
            <View style={{ flexDirection: "row" }}>
              <Btn label="Add a schedule" variant="primary" disabled={off} icon={<Plus size={16} color={off ? c.grey500 : c.white} />}
                onPress={() => setEditing({ id: null, draft: NEW })} />
            </View>
            <StuckLine stuck={write.stuck} where="the list of schedules" />
            {data.schedules.length === 0
              ? <Empty title="No report goes on a schedule yet" description="Add one: the report, the days it covers, how often it goes, and who gets it." />
              : (
                <View style={[core.card, { paddingVertical: 0 }]}>
                  {data.schedules.map((sc, i) => (
                    <View key={sc.id} style={{ paddingVertical: 14, gap: 10, borderTopWidth: i === 0 ? 0 : 1, borderColor: c.grey100 }}>
                      <View style={{ gap: 2 }}>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                          <Text style={t.heading}>{sc.title}</Text>
                          {sc.isPaused ? <Pill tone="neutral">Paused</Pill> : null}
                        </View>
                        <Text style={[body, { color: c.grey600 }]}>{periodLine(sc)}</Text>
                        <Text style={[body, { color: c.grey600 }]}>{toLine(sc)}</Text>
                        <Text style={[t.caption, { lineHeight: 17 }]}>{lastLine(sc)}</Text>
                      </View>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        <Btn label={pausing === sc.id ? (sc.isPaused ? "Resuming…" : "Pausing…") : sc.isPaused ? "Resume" : "Pause"}
                          a11y={`${sc.isPaused ? "Resume" : "Pause"} ${sc.title}`} disabled={off} onPress={() => pause(sc)} />
                        <Btn label="Edit" a11y={`Edit ${sc.title}`} disabled={off} onPress={() => setEditing({ id: sc.id, draft: draftOf(sc) })} />
                        <Btn label="Delete" a11y={`Delete ${sc.title}`} variant="ghost" disabled={off} onPress={() => remove(sc)} />
                      </View>
                    </View>
                  ))}
                </View>
              )}
            {editing ? (
              <ScheduleForm key={editing.id ?? "new"} reports={data.reports} editing={editing} saving={write.busy} stuck={write.stuck}
                onClose={() => setEditing(null)} onSave={(input) => void save(editing.id, input)} />
            ) : null}
          </>
        );
      }}
    </MsgPage>
  );
}

const OFTEN: readonly { value: Frequency; label: string }[] = [
  { value: "daily", label: "Every day" }, { value: "weekly", label: "Every week" }, { value: "monthly", label: "Every month" },
];
const FILES: readonly { value: FileType; label: string }[] = [{ value: "pdf", label: "PDF" }, { value: "xlsx", label: "Excel" }];
const DAYS = WEEKDAYS.map((w, i) => ({ value: String(i + 1), label: w }));
const DATES = Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));

function ScheduleForm({ reports, editing, saving, stuck, onClose, onSave }: {
  reports: Schedules["reports"]; editing: Editing; saving: boolean; stuck: boolean;
  onClose: () => void; onSave: (input: ReturnType<typeof toInput>) => void;
}) {
  const [d, setD] = useState<Draft>(editing.draft);
  const change = (part: Partial<Draft>) => setD((x) => ({ ...x, ...part }));
  return (
    <Sheet open title={editing.id ? "Change the schedule" : "Add a schedule"} closable={!saving} onClose={onClose}
      description="It goes after the night audit closes the day; a day never closed sends nothing."
      footer={(
        <>
          <Btn label="Cancel" grow disabled={saving} onPress={onClose} />
          <Btn label={saving ? "Saving…" : "Save"} variant="primary" grow disabled={saving || stuck || !mayAdd(d)} onPress={() => onSave(toInput(d))} />
        </>
      )}>
      <Choose label="Report" value={d.report} disabled={saving}
        choices={schedulable(reports).map((r) => ({ value: r.key, label: r.title }))}
        hint="Yearly statistics, and a statement of one supplier or account, cannot go on a schedule."
        onChange={(k) => setD((x) => pickReport(x, reports, k))} />
      <Choose label="Days it covers" value={d.period} disabled={saving || !d.report} hint={periodsHint(reports, d.report)}
        choices={periodsFor(reports, d.report).map((p) => ({ value: p, label: PERIOD_WORDS[p] }))}
        onChange={(p) => change({ period: p as Period })} />
      <View style={{ gap: 6 }}>
        <Text style={[t.label, { color: c.grey700 }]}>How often</Text>
        <Segmented label="How often" value={d.frequency} options={OFTEN} onChange={(frequency) => change({ frequency })} />
      </View>
      {d.frequency === "weekly" ? (
        <Choose label="After the night audit of" value={String(d.weekday ?? 1)} choices={DAYS} disabled={saving}
          onChange={(v) => change({ weekday: Number(v) })} />
      ) : null}
      {d.frequency === "monthly" ? (
        <Choose label="After the night audit of the" value={String(d.dayOfMonth ?? 1)} choices={DATES} disabled={saving}
          hint="1 to 28, so every month has it." onChange={(v) => change({ dayOfMonth: Number(v) })} />
      ) : null}
      <View style={{ gap: 6 }}>
        <Text style={[t.label, { color: c.grey700 }]}>File</Text>
        <Segmented label="File" value={d.fileType} options={FILES} onChange={(fileType) => change({ fileType })} />
      </View>
      <Field label="Send to" value={d.text} onChangeText={(text) => change({ text })} multiline editable={!saving}
        placeholder="name@example.com" hint="One email address a line." input={keys.email} />
    </Sheet>
  );
}

