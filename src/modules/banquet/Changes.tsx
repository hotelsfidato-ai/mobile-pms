import { useRef, useState } from "react";
import { Text, View } from "react-native";
import { ApiError, HeldError, outcomeUnknown } from "../../core/api";
import { c } from "../../core/theme";
import { useRead } from "../../core/ui";
import { Field, Input, Tick } from "../finance/Kit";
import { Btn, body, Dialog, Foot, InDialog, Select, message, saidOf, type Said } from "../guest-services/kit";
import { addCourse, cancelFn, isRefused, readSetup, setPrice } from "./data";
import { choosePackage, courseBody, figure, packageWords, platesProblem, priceBody, priceHint, type CourseDraft, type Fn } from "./rules";

/* ══════════════════════════════════════════════════════════════════
   WHAT A MANAGER CHANGES ON A FUNCTION — the web's PriceDialog,
   CourseDialog and CancelDialog (pages/BanquetEvent.tsx), their words and
   bodies. Not pictured: built from the code. Every one is refused offline
   (no banquet path but the enquiry is on the web's list): `send` says the
   web's sentence and nothing is held. One tap, one write (MEMORY 8).
   ══════════════════════════════════════════════════════════════════ */

/** A refusal inside a dialog, which stays open: its title and the server's words; offline the web's sentence. */
const inDialog = (title: string, e: unknown): Said =>
  e instanceof HeldError ? saidOf("", e)
    : e instanceof ApiError && e.status === 503 ? { title: message(e), tone: "bad" }
    : { title, body: message(e), tone: "bad" };

/** The one write a dialog makes, latched at the tap. */
function useWrite(onDone: () => void, title: string) {
  const latch = useRef(false);
  const stuck = useRef(false);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  const run = async (write: () => Promise<unknown>) => {
    if (latch.current) return;
    latch.current = true;
    setBusy(true);
    setSaid(null);
    try {
      await write();
      onDone();
    } catch (e) {
      /* Not known whether it was made (a lost reply, a server failure), and a
         course has no key the server reads: this dialog takes no more taps; it
         is closed and the function read again before anything is tried twice
         (the review of 4 Nov). */
      if (outcomeUnknown(e)) {
        stuck.current = true;
        setSaid({ title: `${title.replace(/^Not /, "Not known whether it was ")}`, body: `${message(e)} Close this and look at the function before trying again.`, tone: "bad" });
      } else setSaid(inDialog(title, e));
    } finally {
      latch.current = stuck.current;
      setBusy(false);
    }
  };
  return { busy, said, run };
}

/* ── The hall price: an empty box CLEARS it (a quote withdrawn); 0 only with Free (D27-120) ── */
export function PriceDialog({ code, f, onClose, onDone }: { code: string; f: Fn; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState(f.agreedAmount === null ? "" : String(f.agreedAmount));
  const [free, setFree] = useState(f.agreedAmount === 0);
  const w = useWrite(onDone, "Not changed");
  const sent = priceBody(amount, free);
  const usual = f.venue.defaultRate;
  return (
    <Dialog title="The hall" description="What was agreed for this function. Nothing is filled in for you." onClose={onClose}>
      <Field label="Agreed amount" hint={sent === null ? "Not a figure." : priceHint(usual)}>
        <Input label="Agreed amount" value={amount} onChange={setAmount} keyboard="decimal-pad" placeholder="-" off={free} tabular />
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1, minWidth: 120 }}>
            <Tick label="Free" on={free} onChange={(on) => { setFree(on); setAmount(on ? "0" : ""); }} />
          </View>
          {usual != null && !free ? <Btn label="Use usual" onPress={() => setAmount(String(usual))} /> : null}
        </View>
      </Field>
      <InDialog said={w.said} />
      <Foot>
        <Btn label="Cancel" tall grow onPress={onClose} />
        <Btn
          label={w.busy ? "Saving…" : "Save"} variant="primary" tall grow disabled={w.busy || sent === null}
          onPress={() => void w.run(() => setPrice(code, f.id, sent!))}
        />
      </Foot>
    </Dialog>
  );
}

/* ── Add a course: from a package (its rate OFFERED, then snapshotted from this box) or off-menu ── */
export function CourseDialog({ code, f, onClose, onDone }: { code: string; f: Fn; onClose: () => void; onDone: () => void }) {
  const setup = useRead(() => readSetup(code), ["banquet", code, "setup"]);
  const packages = setup.data && !isRefused(setup.data) ? setup.data.packages.filter((p) => p.isActive) : [];
  const [d, setD] = useState<CourseDraft>({ packageId: "", name: "", heads: f.pax === null ? "" : String(f.pax), rate: "", free: false, notes: "" });
  const set = (patch: Partial<CourseDraft>) => setD((x) => ({ ...x, ...patch }));
  const w = useWrite(onDone, "Not added");
  const sent = courseBody(d);
  const plates = platesProblem(d.heads);
  return (
    <Dialog title="Add a course" description="From a package, or off-menu. A rate can wait - the total says so until it arrives." onClose={onClose}>
      {packages.length > 0 ? (
        <Field label="Package">
          <Select<string>
            label="Package" value={d.packageId} onChange={(id) => setD((x) => choosePackage(x, packages.find((p) => p.id === id)))}
            options={[{ value: "", label: "Off-menu" }, ...packages.map((p) => ({ value: p.id, label: packageWords(p) }))]}
          />
        </Field>
      ) : null}
      {setup.error && setup.data === undefined ? (
        <Text style={[body, { color: c.red700 }]} accessibilityRole="alert">The packages did not load: {setup.error}</Text>
      ) : null}
      <Field label="What is being served?" required>
        <Input label="What is being served?" value={d.name} onChange={(v) => set({ name: v })} placeholder="Dinner buffet" />
      </Field>
      <Field label="Plates" required hint={plates ?? "A per-head rate with no head count is not a price."}>
        <Input label="Plates" value={d.heads} onChange={(v) => set({ heads: v })} keyboard="number-pad" tabular />
      </Field>
      <Field label="Rate a head" hint={figure(d.rate) === "bad" ? "Not a figure." : "Leave blank if it is not agreed yet."}>
        <Input label="Rate a head" value={d.rate} onChange={(v) => set({ rate: v })} keyboard="decimal-pad" placeholder="-" off={d.free} tabular />
        <Tick label="Free" on={d.free} onChange={(on) => set({ free: on, rate: on ? "0" : "" })} />
      </Field>
      <Field label="Notes">
        <Input label="Notes" value={d.notes} onChange={(v) => set({ notes: v })} multiline />
      </Field>
      <InDialog said={w.said} />
      <Foot>
        <Btn label="Cancel" tall grow onPress={onClose} />
        <Btn
          label={w.busy ? "Adding…" : "Add"} variant="primary" tall grow disabled={w.busy || sent === null}
          onPress={() => void w.run(() => addCourse(code, f.id, sent!))}
        />
      </Foot>
    </Dialog>
  );
}

/* ── Cancel: a reason is required; the hall goes back on the diary ── */
export function CancelDialog({ code, f, onClose, onDone }: { code: string; f: Fn; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const w = useWrite(onDone, "Not cancelled");
  return (
    <Dialog title="Cancel this function" description="The hall goes back on the diary. The cancellation stays on the record." onClose={onClose}>
      <Field label="Why?" required hint="This is the line somebody asks about a month later.">
        <Input label="Why?" value={reason} onChange={setReason} multiline />
      </Field>
      <InDialog said={w.said} />
      <Foot>
        <Btn label="Keep it" tall grow onPress={onClose} />
        <Btn
          label={w.busy ? "Cancelling…" : "Cancel the function"} variant="danger" tall grow disabled={!reason.trim() || w.busy}
          onPress={() => void w.run(() => cancelFn(code, f.id, reason))}
        />
      </Foot>
    </Dialog>
  );
}
