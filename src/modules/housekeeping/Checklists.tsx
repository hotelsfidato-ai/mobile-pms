import { useQueryClient } from "@tanstack/react-query";
import { ListChecks, Plus } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { ExportButtons } from "../../core/Export";
import { c, space, t } from "../../core/theme";
import { Head, notKnown, Screen, useRead, useStuck } from "../../core/ui";
import { dateTime } from "../night-audit/audit";
import {
  failedText, itemsHint, itemsOf, JOB_LABELS, JOBS, listsEmpty, listTitle, newListBody, REMOVED, roomTypeText, RUN_COLUMNS,
  runPill, runRow, runsEmptyTitle, SWITCH_LABEL, switchedWords, switchNote, whyNotSaveList, KEEPS_LISTS,
  type Checklist, type ChecklistJob, type ChecklistSetup,
} from "./care";
import { addChecklist, changeChecklist, readChecklists, readRuns, removeChecklist, setChecklistsRequired } from "./careData";
import {
  Act, Back, body, Box, Btn, Dialog, Empty, Failed, Field, Foot, Hairline, InDialog, Inside, Input, Loading, NotYours, Pill,
  saidOf, Select, Stale, Toast, Toggle, type Said,
} from "./careKit";

/* ══════════════════════════════════════════════════════════════════
   HOUSEKEEPING CHECKLISTS on a phone - the web's /h/:code/checklists
   (16 Nov release, D27-383 item 10, D27-396): pages/Checklists.tsx. No
   picture was taken of it (the set is of 31 Oct): built from the code.
   The switch (off by default: the board is unchanged until it is on), the
   lists per job and room type, and each room's record - who ticked which
   list, when, and what an inspection failed. The owner, an administrator
   or the GM change the lists and the switch (the server's `mayKeep`); for
   anyone else they are grey with the web's sentence, never hidden.
   THE TICKING ITSELF is on the board (flows/ChecklistFlow.tsx, opened by
   Clean / Inspected when the switch is on): the board is another lane's
   screen, so it is not built here (MODULE.md).
   Every write here is a setting: refused offline in the web's words. A
   destructive Remove asks first (each phone's own dialog, NATIVE.md).
   ══════════════════════════════════════════════════════════════════ */

const JOB_OPTIONS = JOBS.map((j) => ({ value: j, label: JOB_LABELS[j] }));

export function Checklists({ hotel, onBack }: { hotel: Hotel; onBack: () => void }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const q = useRead(() => readChecklists(code), ["housekeeping", code, "checklists"]);
  const [editing, setEditing] = useState<Checklist | "new" | null>(null);
  const [pulled, setPulled] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  const [switching, setSwitching] = useState(false);
  const latch = useRef(false);
  const unsay = useCallback(() => setSaid(null), []);
  useEffect(() => { if (!q.loading) setPulled(false); }, [q.loading]);

  const refresh = () => void cache.invalidateQueries({ queryKey: ["housekeeping", code, "checklists"] });
  const d = q.data;
  const refused = !d && q.error && /is for .*Ask one of them\.$/.test(q.error) ? q.error : null;

  async function toggle(required: boolean) {
    if (latch.current) return;
    latch.current = true;
    setSwitching(true);
    try {
      await setChecklistsRequired(code, required);
      setSaid({ title: switchedWords(required), tone: "ok" });
    } catch (e) {
      setSaid(saidOf("Not changed", e));
    } finally {
      latch.current = false;
      setSwitching(false);
      /* Read again either way: the switch shows what the server holds, not the tap. */
      refresh();
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        <Head title="Housekeeping checklists" under="What is done in a room for each job, and each room's record of who ticked it." action={<Back onPress={onBack} />} />
        {d ? <Act label="Add a checklist" icon={Plus} variant="primary" reason={d.mayKeep ? null : KEEPS_LISTS} onPress={() => setEditing("new")} /> : null}
        <Stale error={d ? q.error : undefined} />
        {!d ? (
          refused ? <NotYours title="The checklists" sentence={refused} />
            : q.error ? <Failed title="The checklists did not load" error={q.error} onRetry={q.reload} />
              : <Loading words="Reading the checklists…" />
        ) : (
          <>
            <Box>
              <Inside>
                <Toggle value={d.required} onChange={(on) => void toggle(on)} disabled={!d.mayKeep || switching}
                  label={SWITCH_LABEL} description={switchNote(d.mayKeep)} />
              </Inside>
            </Box>
            <Lists d={d} onEdit={setEditing} />
            <History code={code} hotelName={hotel.name} />
          </>
        )}
      </Screen>
      <Toast said={said} onClose={unsay} />
      {editing && d ? (
        <ListDialog code={code} d={d} list={editing === "new" ? null : editing}
          onClose={() => { setEditing(null); refresh(); }}
          onDone={(s) => { setEditing(null); setSaid(s); refresh(); }} />
      ) : null}
    </View>
  );
}

function Lists({ d, onEdit }: { d: ChecklistSetup; onEdit: (c: Checklist) => void }) {
  if (d.checklists.length === 0) {
    return <Box><Empty compact Icon={ListChecks} title="No checklists yet" description={listsEmpty(d.mayKeep)} /></Box>;
  }
  return (
    <>
      {d.checklists.map((l) => (
        <Box key={l.id}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: space.cardX, paddingRight: 8, paddingTop: 12, paddingBottom: 8 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={t.heading} accessibilityRole="header">{JOB_LABELS[l.job]}</Text>
              <Text style={[t.label, { color: c.grey500 }]}>{roomTypeText(l)}</Text>
            </View>
            {d.mayKeep ? <Btn label="Change" variant="ghost" a11y={`Change ${listTitle(l)}`} onPress={() => onEdit(l)} /> : null}
          </View>
          <Inside style={{ paddingTop: 4, gap: 4 }}>
            {l.items.map((item, i) => (
              <View key={item} style={{ flexDirection: "row", gap: 8 }}>
                <Text style={[body, t.tab, { color: c.grey500, width: 22, textAlign: "right" }]}>{i + 1}.</Text>
                <Text style={[body, { flex: 1, color: c.ink900, fontSize: 16, lineHeight: 24 }]}>{item}</Text>
              </View>
            ))}
          </Inside>
        </Box>
      ))}
    </>
  );
}

/* ── Each room's record ─────────────────────────────────────────── */

function History({ code, hotelName }: { code: string; hotelName: string }) {
  const [room, setRoom] = useState("");
  const asked = room.trim();
  const runs = useRead(() => readRuns(code, asked), ["housekeeping", code, "checklist-runs", asked.toUpperCase()]);
  const list = runs.data?.runs;
  return (
    <Box style={{ marginTop: 8 }}>
      <View style={{ paddingHorizontal: space.cardX, paddingTop: space.cardY, paddingBottom: 12, gap: 8 }}>
        <Text style={t.heading} accessibilityRole="header">Each room's record</Text>
        <Text style={[body, { color: c.grey500 }]}>Who ticked which list, when, and what an inspection failed.</Text>
        <ExportButtons table={list ? {
          title: "Housekeeping checklists", subtitle: `${hotelName} · ${asked ? `room ${asked.toUpperCase()}` : "every room"}`,
          columns: RUN_COLUMNS, rows: list.map((r) => runRow(r, dateTime)),
        } : null} />
      </View>
      <Hairline />
      <Inside>
        <Field label="Room" hint="Empty: every room">
          <Input label="Room" value={room} onChangeText={setRoom} placeholder="204" autoCapitalize="characters" />
        </Field>
      </Inside>
      <Hairline />
      {!list ? (
        runs.error ? <Inside><Failed title="The record did not load" error={runs.error} onRetry={runs.reload} /></Inside>
          : <Inside><Loading words="Reading the record…" /></Inside>
      ) : list.length === 0 ? (
        <Empty compact title={runsEmptyTitle(asked)} description="A list ticked on the board shows here." />
      ) : (
        <>
          {runs.error ? <Inside><Stale error={runs.error} /></Inside> : null}
          {list.map((r, i) => {
            const p = runPill(r);
            return (
              <View key={r.id}>
                {i ? <Hairline /> : null}
                <View style={{ paddingHorizontal: space.cardX, paddingVertical: 12, gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <Text style={[t.heading, t.tab, { minWidth: 44 }]}>{r.room}</Text>
                    <Text style={[body, { color: c.ink900 }]}>{JOB_LABELS[r.job]}</Text>
                    <Pill tone={p.tone}>{p.label}</Pill>
                  </View>
                  <Text style={[t.label, { color: c.grey500, lineHeight: 20 }]}>{r.doneBy ?? "-"}, {dateTime(r.doneAt)}</Text>
                  {r.failed.map((f) => <Text key={f.item} style={[t.label, { color: c.red700, lineHeight: 20 }]}>{failedText(f)}</Text>)}
                </View>
              </View>
            );
          })}
        </>
      )}
    </Box>
  );
}

/* ── Add or change a checklist (ChecklistDialog) ────────────────── */

function ListDialog({ code, d, list, onClose, onDone }: {
  code: string; d: ChecklistSetup; list: Checklist | null; onClose: () => void; onDone: (s: Said) => void;
}) {
  const [job, setJob] = useState<ChecklistJob>(list?.job ?? "checkout");
  const [roomTypeId, setRoomTypeId] = useState(list?.roomTypeId ?? "");
  const [text, setText] = useState(list?.items.join("\n") ?? "");
  const [said, setSaid] = useState<Said | null>(null);
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const stuck = useStuck();
  const items = itemsOf(text);
  const why = stuck.stuck ? "Not known whether it was saved: close this and look at the lists first." : whyNotSaveList(items);

  async function run(what: "save" | "remove") {
    if (latch.current || stuck.isStuck()) return;
    latch.current = true;
    setBusy(true);
    setSaid(null);
    try {
      if (what === "remove" && list) await removeChecklist(code, list.id);
      else if (list) await changeChecklist(code, list.id, items);
      else await addChecklist(code, newListBody(job, roomTypeId, items));
      onDone({ title: what === "remove" ? REMOVED : "The checklist is saved.", tone: "ok" });
    } catch (e) {
      if (stuck.stop(e)) {
        const k = notKnown(what === "remove" ? "removed" : "saved", "the lists", e);
        setSaid({ title: k.title, body: k.body, tone: "held" });
      } else setSaid(saidOf(what === "remove" ? "Not removed" : "Not saved", e));
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }

  /* The web removes at once; a destructive act on the phone asks first, in the web's words (BRIEF-T3). */
  const askRemove = () => Alert.alert(
    "Remove this checklist?",
    "What was ticked with it stays on each room's record.",
    [{ text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => void run("remove") }],
  );

  return (
    <Dialog title={list ? listTitle(list) : "Add a checklist"} description="One item per line, in the order it is done." onClose={onClose}>
      {!list ? (
        <>
          <Field label="Job" required>
            <Select label="Job" value={job} options={JOB_OPTIONS} onChange={setJob} />
          </Field>
          <Field label="Room type">
            <Select label="Room type" value={roomTypeId} onChange={setRoomTypeId}
              options={[{ value: "", label: "Every room type" }, ...d.roomTypes.map((r) => ({ value: r.id, label: r.name }))]} />
          </Field>
        </>
      ) : null}
      <Field label="Items" required hint={itemsHint(items.length)}>
        <Input label="Items" value={text} onChangeText={setText} rows={8}
          placeholder={"Bed made with fresh linen\nBathroom cleaned and dry\nTowels replaced"} />
      </Field>
      <InDialog said={said} />
      <Foot>
        <Btn label="Cancel" grow tall onPress={onClose} />
        <Btn label="Save" variant="primary" grow tall busy={busy} disabled={Boolean(why)} onPress={() => void run("save")} />
      </Foot>
      {why && !said ? <Text style={[t.caption, { color: c.grey600 }]}>{why}</Text> : null}
      {list ? <Btn label="Remove" variant="ghost" disabled={busy || stuck.stuck} a11y={`Remove ${listTitle(list)}`} onPress={askRemove} style={{ alignSelf: "flex-start" }} /> : null}
    </Dialog>
  );
}
