import { useQueryClient } from "@tanstack/react-query";
import { Info, Plus, Sparkles, UserRound } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { ExportButtons } from "../../core/Export";
import { c, face, space, t } from "../../core/theme";
import { Head, ripple, Screen, useRead } from "../../core/ui";
import { askFirst, Btn, CardHead, Dialog, DialogFoot, ListRow, useDialogWrite, useRowWrite, Why } from "../banquet/setupKit";
import { Field, Input, Tick } from "../finance/Kit";
import { Box, body, Empty, Loading, NotYours, Pill, Stale, Toast, type Said } from "../guest-services/kit";
import { LoadFailed } from "../laundry/kit";
import { isRefused, readTherapists, readTreatments } from "./data";
import type { SpaTherapist, SpaTreatment } from "./diaryRules";
import { whyNotRead, whyNotSetUp } from "./roles";
import {
  listAct, priceWords, therapistBody, therapistOff, treatmentBody, treatmentDone, treatmentDraft, treatmentOff, treatmentRows,
  TREATMENT_COLUMNS, type TreatmentDraft,
} from "./setupRules";
import { addTherapist, addTreatment, changeTreatment, listTherapist, listTreatment } from "./setupData";

/* ══════════════════════════════════════════════════════════════════
   TREATMENTS AND THERAPISTS on a phone (lane U, 19 Nov) — the web's
   /h/:code/spa/setup (src/modules/spa/pages/SpaSetup.tsx; picture
   pms-shots/new/n-h-spa-setup, as dev-gm).

   What this spa sells, how long each takes and what it costs, and who
   gives them. NO TREATMENT IS SHIPPED, NO PRICE IS INVENTED (an empty
   price is "-", never ₹0), NOTHING IS DELETED (off the list, and back).
   Set by the owner, an administrator or the GM (SPA_LIST_ROLES): the web
   shows every button and the server refuses; here they are grey with its
   sentence. Taking off the list asks first. Everything refused offline.
   ══════════════════════════════════════════════════════════════════ */

const INFO = "Leave the price empty where none has been set. It reads \"-\", never ₹0, and a booking taken while it has none "
  + "cannot be closed for money. A price added later applies to new bookings only.";

export function Setup({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refusedRead = whyNotRead(role);
  const mayList = whyNotSetUp(role);
  const [pulled, setPulled] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  const [info, setInfo] = useState(false);
  const [editing, setEditing] = useState<SpaTreatment | "new" | null>(null);
  const [addingTherapist, setAddingTherapist] = useState(false);

  const treatments = useRead(() => (refusedRead ? Promise.resolve(null) : readTreatments(code)), ["spa", code, "treatments"]);
  const therapists = useRead(() => (refusedRead ? Promise.resolve(null) : readTherapists(code)), ["spa", code, "therapists"]);
  const reread = () => void cache.invalidateQueries({ queryKey: ["spa", code] });
  const row = useRowWrite(setSaid, reread);
  const tList = Array.isArray(treatments.data) ? treatments.data : null;
  const hList = Array.isArray(therapists.data) ? therapists.data : null;
  /* The spa switched off, or the role: the server's one sentence (QA X-5), no cards of buttons that cannot work. */
  const off = isRefused(treatments.data) ? treatments.data.refused : null;

  const flipTherapist = (h: SpaTherapist) => {
    const go = () => void row.run(h.id, () => listTherapist(code, h.id, !h.isActive), {
      refused: "Not changed", done: "changed", where: "the therapists",
    });
    if (h.isActive) { const q = therapistOff(h); askFirst(q.title, q.body, "Take off the list", go); } else go();
  };

  if (refusedRead || off) {
    return (
      <Screen refreshing={false} onRefresh={treatments.reload}>
        <Head title="Treatments and therapists" />
        <NotYours title="Spa" sentence={refusedRead ?? off!} />
      </Screen>
    );
  }

  const failed = (q: { error: string | undefined; reload: () => void }, what: string) => (
    <View style={{ padding: space.cardX }}>
      <LoadFailed
        title={`${what} did not load`} error={q.error ?? ""} onRetry={q.reload}
        offline={`This device is offline, so ${what.toLowerCase()} cannot load. It loads by itself as soon as the connection is back.`}
      />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Screen
        refreshing={pulled && (treatments.loading || therapists.loading)}
        onRefresh={() => { setPulled(true); treatments.reload(); therapists.reload(); }}
      >
        <Head title="Treatments and therapists" under="What this property's spa sells, how long each takes and what it costs - and who gives them." />
        <Why text={mayList} />

        <Box style={{ overflow: "hidden" }}>
          <CardHead
            Icon={Sparkles} title="Treatments" note={info ? INFO : null}
            extra={(
              <Pressable
                onPress={() => setInfo(!info)} accessibilityRole="button" accessibilityLabel="About prices" accessibilityState={{ expanded: info }}
                android_ripple={{ ...ripple, borderless: true }}
                style={{ width: 44, height: 44, marginVertical: -10, marginLeft: -6, alignItems: "center", justifyContent: "center" }}
              >
                <Info size={16} color={c.grey500} />
              </Pressable>
            )}
            action={<Btn label="Add a treatment" variant="primary" icon={Plus} disabled={mayList != null} onPress={() => setEditing("new")} />}
          />
          <View style={{ paddingHorizontal: space.cardX, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.grey100 }}>
            <ExportButtons
              table={tList ? { title: "Spa treatments", subtitle: hotel.name, columns: TREATMENT_COLUMNS, rows: treatmentRows(tList) } : null}
            />
          </View>
          {tList === null ? (
            treatments.error ? failed(treatments, "The treatments") : <View style={{ padding: space.cardX }}><Loading words="Reading the treatments…" /></View>
          ) : (
            <>
              <View style={{ paddingHorizontal: space.cardX }}><Stale error={treatments.error} /></View>
              {tList.length === 0 ? (
                <Empty compact title="Nothing on the list yet" description="Nothing is created for you. Enter what this spa sells, how long each takes, and the price where one has been set." />
              ) : tList.map((x, i) => (
                <ListRow key={x.id} first={i === 0}>
                  <View style={{ flex: 1, minWidth: 160, flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 8, rowGap: 4 }}>
                    <Text style={[body, { color: c.ink900, ...face[500] }]}>{x.name}<Text style={[t.tab, { color: c.grey500, ...face[500] }]}> · {x.minutes} min</Text></Text>
                    {!x.isActive ? <Pill>Off the list</Pill> : null}
                  </View>
                  <View style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Text style={[body, t.tab, x.price === null ? { color: c.grey500 } : { color: c.ink900, ...face[500] }]}>{priceWords(x.price)}</Text>
                    <Btn label="Change" a11y={`Change ${x.name}`} disabled={mayList != null} onPress={() => setEditing(x)} />
                  </View>
                </ListRow>
              ))}
            </>
          )}
        </Box>

        <Box style={{ overflow: "hidden" }}>
          <CardHead
            Icon={UserRound} title="Therapists"
            action={<Btn label="Add a therapist" icon={Plus} disabled={mayList != null} onPress={() => setAddingTherapist(true)} />}
          />
          {hList === null ? (
            isRefused(therapists.data)
              ? <Text style={[body, { color: c.red700, padding: space.cardX }]} accessibilityRole="alert">{therapists.data.refused}</Text>
              : therapists.error ? failed(therapists, "The therapists") : <View style={{ padding: space.cardX }}><Loading words="Reading the therapists…" /></View>
          ) : (
            <>
              <View style={{ paddingHorizontal: space.cardX }}><Stale error={therapists.error} /></View>
              {hList.length === 0 ? (
                <Empty
                  compact title="Nobody on the list yet"
                  description="A name, not an account - nobody here signs in. The diary books against these names, which is how it can refuse to put one person in two places at once."
                />
              ) : hList.map((h, i) => (
                <ListRow key={h.id} first={i === 0}>
                  <View style={{ flex: 1, minWidth: 140, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                    <Text style={[body, { color: c.ink900, ...face[500] }]}>{h.name}</Text>
                    {!h.isActive ? <Pill>Not taking appointments</Pill> : null}
                  </View>
                  <View style={{ marginLeft: "auto" }}>
                    <Btn
                      label={row.busy(h.id) ? "Saving…" : listAct(h.isActive)} a11y={`${listAct(h.isActive)}: ${h.name}`}
                      disabled={mayList != null || row.busy(h.id)} onPress={() => flipTherapist(h)}
                    />
                  </View>
                </ListRow>
              ))}
            </>
          )}
        </Box>
      </Screen>

      {editing ? (
        <TreatmentDialog
          code={code} treatment={editing === "new" ? null : editing}
          onClose={() => { setEditing(null); reread(); }}
          onDone={(words) => { setEditing(null); if (words) setSaid({ title: words, tone: "ok" }); reread(); }}
        />
      ) : null}
      {addingTherapist ? (
        <TherapistDialog
          code={code} onClose={() => { setAddingTherapist(false); reread(); }}
          onDone={(name) => { setAddingTherapist(false); setSaid({ title: `${name} is on the list.`, tone: "ok" }); reread(); }}
        />
      ) : null}
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}

const Problem = ({ text }: { text: string | null }) =>
  text ? <Text style={[body, { color: c.red700 }]} accessibilityRole="alert">{text}</Text> : null;

/* ── One dialog, adding and changing (the web's TreatmentDialog): the same three fields ── */
function TreatmentDialog({ code, treatment, onClose, onDone }: {
  code: string; treatment: SpaTreatment | null; onClose: () => void; onDone: (words: string | null) => void;
}) {
  const [f, setF] = useState<TreatmentDraft>(treatmentDraft(treatment));
  const set = (patch: Partial<TreatmentDraft>) => setF((x) => ({ ...x, ...patch }));
  const [problem, setProblem] = useState<string | null>(null);
  const w = useDialogWrite("Not saved", treatment ? "changed" : "added", "the treatments");
  const save = () => {
    const out = treatmentBody(f);
    if ("problem" in out) { setProblem(out.problem); return; }
    setProblem(null);
    void w.run(
      () => (treatment ? changeTreatment(code, treatment.id, out.body) : addTreatment(code, out.body)),
      () => onDone(treatmentDone(out.body.name, treatment !== null)),
    );
  };
  const retire = () => {
    if (!treatment) return;
    const go = () => void w.run(() => listTreatment(code, treatment.id, !treatment.isActive), () => onDone(null));
    if (treatment.isActive) { const q = treatmentOff(treatment); askFirst(q.title, q.body, "Take off the list", go); } else go();
  };
  return (
    <Dialog title={treatment ? "Change a treatment" : "Add a treatment"} onClose={onClose}>
      <Field label="Name">
        <Input label="Name" value={f.name} onChange={(v) => set({ name: v })} placeholder="Aromatherapy massage" />
      </Field>
      <Field label="How long, in minutes" hint="The diary places a booking by its length, so a treatment with no length cannot be put in a day.">
        <Input label="How long, in minutes" value={f.minutes} onChange={(v) => set({ minutes: v })} keyboard="number-pad" placeholder="60" tabular />
      </Field>
      <Field label="Price" hint="Leave it empty where none has been set. Empty reads as a dash, never as ₹0.">
        <Input label="Price" value={f.price} onChange={(v) => set({ price: v })} keyboard="decimal-pad" placeholder="Not priced yet" off={f.free} tabular />
        <Tick label="Free" on={f.free} onChange={(on) => set({ free: on, price: on ? "0" : "" })} />
      </Field>
      <Problem text={problem} />
      {treatment ? (
        <View style={{ alignItems: "flex-start" }}>
          <Btn label={listAct(treatment.isActive)} disabled={w.busy || w.stuck} onPress={retire} />
        </View>
      ) : null}
      <DialogFoot act={treatment ? "Save" : "Add it"} busyWord="Saving…" ready w={w} onClose={onClose} onAct={save} />
    </Dialog>
  );
}

/* ── Add a therapist: a name the diary books against, not an account ── */
function TherapistDialog({ code, onClose, onDone }: { code: string; onClose: () => void; onDone: (name: string) => void }) {
  const [name, setName] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const w = useDialogWrite("Not added", "added", "the therapists");
  const add = () => {
    const out = therapistBody(name);
    if ("problem" in out) { setProblem(out.problem); return; }
    setProblem(null);
    void w.run(() => addTherapist(code, out.body.name), () => onDone(out.body.name));
  };
  return (
    <Dialog title="Add a therapist" onClose={onClose}>
      <Field label="Name" hint="A name the diary books against — not an account. Nobody here signs in.">
        <Input label="Name" value={name} onChange={setName} placeholder="Priya" />
      </Field>
      <Problem text={problem} />
      <DialogFoot act="Add them" busyWord="Adding…" ready w={w} onClose={onClose} onAct={add} />
    </Dialog>
  );
}
