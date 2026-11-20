import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { CheckCircle2, Download, FileWarning, PlusCircle, RefreshCw, Upload, type LucideIcon } from "lucide-react-native";
import { useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { ApiError, outcomeUnknown } from "../../core/api";
import { CSV_IMPORT } from "../../core/files";
import {
  acceptedOf, importAbout, importedWords, importLabel, readImport, rejectedOf, templateCsv, templateName,
  type ImportReport, type ImportSpec,
} from "../../core/importSpec";
import { pickFile } from "../../core/pickers";
import { c, face, space, t } from "../../core/theme";
import { modalEdge, notKnown, ripple, shade, useScreenStop, useSheetPad } from "../../core/ui";
import { readText } from "../../core/upload";
import { Btn, Pill, Why } from "./ServiceKit";
import { ty } from "./TablesKit";

/* ══════════════════════════════════════════════════════════════════
   A FILE, LOOKED AT BEFORE IT LANDS — the web's ImportDialog
   (src/components/flows/ImportDialog.tsx, c9394cb) on a phone, for the
   five imports of lane m16-pick-pos: the menu and its sides (pos), room
   types and rooms (inventory), the equipment register. Here and not in
   the core because the core is the mobile chat's (only importSpec.ts was
   this lane's to add); inventory and equipment import it from pos.

   Three states, as the web: choose (the template offered FIRST, then the
   phone's own file picker), preview (the server's dry run: every row and
   what would happen to it - nothing written), done (what happened).
   The CSV is read ON THE PHONE (core importSpec.ts) and its rows are sent
   `{ rows, dryRun }` through `load` (send(): refused offline, as every
   unlisted write). The template is made on the phone and handed to the
   share sheet, as an export is (Export.tsx; expo-file-system, M-14).

   ONE TAP, ONE IMPORT (MEMORY 16, 22): the apply is sent through the
   screen's stop (`stopName`), so it cannot be closed while on its way, and
   after a lost reply Import stays grey - in this sheet and when it is
   opened again - until the screen's read (wrapped in the same stop's
   `watch`) began after the loss. A repeat of a menu, sides, room types or
   rooms file updates; an equipment file's rows are always new things, so
   a repeat would add the register twice.
   ══════════════════════════════════════════════════════════════════ */

export function ImportSheet({ spec, load, stopName, where, onClose, onImported }: {
  spec: ImportSpec;
  /** POST …/import `{ rows, dryRun }`: the server's report; a refusal throws (send()). */
  load: (rows: Record<string, string>[], dryRun: boolean) => Promise<ImportReport>;
  /** The screen's stop, whose read is wrapped in its `watch`. */
  stopName: string;
  /** Where to look after a lost reply: "the menu", "the register". */
  where: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const pad = useSheetPad();
  const stop = useScreenStop(stopName);
  const latch = useRef(false);
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [applied, setApplied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<{ title: string; body: string } | null>(null);
  const [templateSaid, setTemplateSaid] = useState<string | null>(null);

  const reset = () => { setRows(null); setFileName(""); setProblem(null); setReport(null); setApplied(false); setSaid(null); };
  /* Never closed while a dry run or the import is on its way; after a lost reply it may be (the stop is kept by name). */
  const close = () => { if (!busy) onClose(); };

  const template = async () => {
    setTemplateSaid(null);
    try {
      if (!(await Sharing.isAvailableAsync())) { setTemplateSaid("This phone cannot share a file, so the template was not made."); return; }
      const file = new File(Paths.cache, templateName(spec));
      if (file.exists) file.delete();
      file.create();
      file.write(templateCsv(spec));
      await Sharing.shareAsync(file.uri, { mimeType: "text/csv", UTI: "public.comma-separated-values-text", dialogTitle: templateName(spec) });
    } catch (e) {
      setTemplateSaid(e instanceof Error && e.message ? e.message : "The template could not be made.");
    }
  };

  const choose = async () => {
    if (latch.current) return;
    latch.current = true;
    try {
      const picked = await pickFile({ types: CSV_IMPORT.types });
      if (!picked) return;
      reset();
      setFileName(picked.name);
      /* The wrong FILE is far commoner than a wrong row (the web's fileProblem). */
      const bad = CSV_IMPORT.problem(picked);
      if (bad) { setProblem(bad); return; }
      let text: string;
      try { text = await readText(picked); } catch { setProblem("That file could not be read on this phone. Choose it again."); return; }
      const read = readImport(text, spec);
      if (!read.ok) { setProblem(read.problem); return; }
      setRows(read.rows);
      /* Unknown columns are not an error, but said (ImportDialog). */
      if (read.note) setProblem(read.note);
      setBusy(true);
      try {
        const dry = await load(read.rows, true);
        if (!dry.ok) { setProblem(dry.reason ?? "That file could not be read."); return; }
        setReport(dry);
      } catch (e) {
        setProblem(e instanceof Error && e.message ? e.message : "That file could not be read.");
      } finally { setBusy(false); }
    } catch {
      setProblem("The phone's file picker could not be opened. Try again.");
    } finally { latch.current = false; }
  };

  const apply = async () => {
    if (!rows || latch.current || stop.isStuck()) return;
    latch.current = true;
    setBusy(true);
    setSaid(null);
    try {
      const done = await stop.guard(() => load(rows, false));
      if (!done.ok) { setSaid({ title: "Not imported", body: done.reason ?? "" }); return; }
      setReport(done);
      setApplied(true);
      onImported();
    } catch (e) {
      if (outcomeUnknown(e)) { const n = notKnown("imported", where, e); setSaid({ title: n.title, body: n.body }); }
      else setSaid({ title: "Not imported", body: e instanceof ApiError ? e.message : String(e) });
    } finally { latch.current = false; setBusy(false); }
  };

  const rejected = rejectedOf(report);
  const accepted = acceptedOf(report);
  const words = applied && report ? importedWords(spec, report) : null;
  const stuckLine = stop.unknown ? notKnown("imported", where).line : null;

  return (
    <Modal {...modalEdge} visible transparent animationType="slide" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: "rgba(1,13,23,0.35)", justifyContent: "flex-end" }}>
        <Pressable style={{ flex: 1 }} onPress={close} accessibilityRole="button" accessibilityLabel="Close" />
        <View style={{ backgroundColor: c.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "92%", paddingLeft: pad.left, paddingRight: pad.right }}>
          <View style={{ paddingHorizontal: space.side, paddingTop: 18, paddingBottom: 12, gap: 4 }}>
            <Text style={[t.heading, ty.md]} accessibilityRole="header">{`Import ${spec.what}`}</Text>
            <Text style={[t.label, ty.sm, { color: c.grey500 }]}>{importAbout(applied, report !== null)}</Text>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: space.side, paddingBottom: 12, gap: 12 }}>
            {/* ── The template, offered first ── */}
            {!report ? (
              <View style={{ borderRadius: 10, borderWidth: 1, borderColor: c.grey200, backgroundColor: c.grey50, padding: 12, gap: 8 }}>
                <Text style={[t.label, ty.md, { color: c.ink900 }]}>Start from the template</Text>
                <Text style={[t.label, ty.sm]}>
                  It carries the headers this reads, a note under each saying what belongs in it, and a few worked rows. Delete the examples, put your own in, and save it as CSV.
                </Text>
                <View style={{ flexDirection: "row" }}><Btn label="Download the template" icon={Download} onPress={() => void template()} /></View>
                {templateSaid ? <Text style={[t.caption, ty.xs, { color: c.red700 }]} accessibilityRole="alert">{templateSaid}</Text> : null}
              </View>
            ) : null}

            {/* ── Choosing a file: the phone's own picker ── */}
            {!report ? (
              <Pressable onPress={() => void choose()} disabled={busy} accessibilityRole="button"
                accessibilityLabel={fileName ? `File: ${fileName}. Choose another` : "Choose a CSV file"} android_ripple={ripple}
                style={shade(({ pressed }) => ({
                  minHeight: 56, borderRadius: 10, borderWidth: 1, borderStyle: "dashed", borderColor: c.grey300, overflow: "hidden",
                  flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 16,
                  backgroundColor: pressed ? c.grey50 : c.white,
                }))}>
                <Upload size={16} color={c.grey400} />
                <Text style={[t.label, ty.md, { color: c.ink900, flexShrink: 1 }]} numberOfLines={1}>{fileName || "Choose a CSV file"}</Text>
              </Pressable>
            ) : null}

            {problem ? (
              <View style={{ flexDirection: "row", gap: 10, borderRadius: 10, borderWidth: 1, borderColor: c.yellow, backgroundColor: c.yellow50, padding: 12 }}>
                <FileWarning size={16} color={c.yellow800} style={{ marginTop: 2 }} />
                <Text style={[t.label, ty.sm, { color: c.ink900, flex: 1 }]}>{problem}</Text>
              </View>
            ) : null}

            {busy && !report ? <Text style={[t.label, ty.sm, { color: c.grey500 }]}>Reading {fileName}…</Text> : null}

            {/* ── What would happen, or what did ── */}
            {report ? (
              <>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <Tally Icon={PlusCircle} n={report.creates} what="new" />
                  <Tally Icon={RefreshCw} n={report.updates} what="updated" />
                  <Tally Icon={FileWarning} n={report.rejected} what="rejected" bad />
                </View>
                {words ? (
                  <View style={{ flexDirection: "row", gap: 10, borderRadius: 10, borderWidth: 1, borderColor: c.success100, backgroundColor: c.success50, padding: 12 }}>
                    <CheckCircle2 size={16} color={c.success600} style={{ marginTop: 2 }} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[t.label, ty.sm, face[600], { color: c.ink900 }]}>{words.title}</Text>
                      <Text style={[t.label, ty.sm, { color: c.ink900 }]}>{words.saved}</Text>
                    </View>
                  </View>
                ) : null}
                {rejected.length > 0 ? (
                  <View style={{ gap: 6 }}>
                    <Text style={[t.label, ty.sm, face[600], { color: c.ink900 }]}>{applied ? "Did not land" : "Will not land"}</Text>
                    {rejected.map((v) => (
                      <View key={`r${v.line}`} style={{ flexDirection: "row", gap: 8, borderRadius: 8, borderWidth: 1, borderColor: c.red100, backgroundColor: c.red50, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Text style={[t.label, ty.sm, t.tab, { color: c.grey500 }]}>line {v.line}</Text>
                        <Text style={[t.label, ty.sm, { color: c.ink900, flex: 1 }]}><Text style={face[600]}>{v.name}</Text>{` - ${v.detail}`}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                {accepted.length > 0 ? (
                  <View style={{ gap: 4 }}>
                    <Text style={[t.label, ty.sm, face[600], { color: c.ink900 }]}>{applied ? "Landed" : "Will land"}</Text>
                    {accepted.map((v) => (
                      <View key={`a${v.line}`} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 }}>
                        <Pill tone={v.action === "create" ? "success" : "neutral"}>{v.action === "create" ? "New" : "Update"}</Pill>
                        <Text style={[t.label, ty.sm, { color: c.ink900, flexShrink: 1 }]} numberOfLines={1}>{v.name}</Text>
                        <Text style={[t.label, ty.sm, { color: c.grey500, flex: 1 }]} numberOfLines={1}>{v.detail}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                {!applied ? (
                  <Text style={[t.label, ty.sm, { color: c.grey500 }]}>
                    Nothing above has been saved. Importing the same file again later corrects prices rather than adding a second copy.
                  </Text>
                ) : null}
              </>
            ) : null}
          </ScrollView>
          <View style={{ borderTopWidth: 1, borderTopColor: c.grey200, backgroundColor: c.grey50, paddingHorizontal: space.side, paddingTop: 12, paddingBottom: pad.bottom, gap: 8 }}>
            {said ? (
              <View accessibilityRole="alert" style={{ gap: 2 }}>
                <Text style={[t.label, ty.sm, face[600], { color: c.red700 }]}>{said.title}</Text>
                {said.body ? <Text style={[t.label, ty.sm, { color: c.ink900 }]}>{said.body}</Text> : null}
              </View>
            ) : null}
            {applied ? <Btn label="Close" tall onPress={onClose} /> : (
              <>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Btn label="Cancel" tall style={{ flex: 1 }} disabled={busy} onPress={onClose} />
                  <Btn primary tall style={{ flex: 1 }} busy={busy && report !== null}
                    label={busy && report ? "Working…" : importLabel(report, accepted.length)}
                    disabled={!report || busy || accepted.length === 0 || stop.stuck} onPress={() => void apply()} />
                </View>
                {!said ? <Why>{stuckLine}</Why> : null}
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Tally({ Icon, n, what, bad }: { Icon: LucideIcon; n: number; what: string; bad?: boolean }) {
  const none = n === 0;
  return (
    <View accessibilityLabel={`${n} ${what}`} style={{
      flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4,
      borderColor: none ? c.grey200 : bad ? c.red100 : c.grey200, backgroundColor: none ? c.grey50 : bad ? c.red50 : c.white,
    }}>
      <Icon size={14} color={none ? c.grey500 : c.ink900} />
      <Text style={[t.label, ty.sm, t.tab, face[600], { color: none ? c.grey500 : c.ink900 }]}>{n}</Text>
      <Text style={[t.label, ty.sm, { color: none ? c.grey500 : c.ink900 }]}>{what}</Text>
    </View>
  );
}
