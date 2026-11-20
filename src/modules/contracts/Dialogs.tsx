import { useRef, useState } from "react";
import { Alert, Text, View } from "react-native";
import { ApiError, HeldError } from "../../core/api";
import { c, t } from "../../core/theme";
import { notKnown, useStuck } from "../../core/ui";
import { Toggle } from "../front-desk/kit";
import { body, Btn, message, Segmented, type Said } from "../guest-services/kit";
import { addAllotment, addCompany, addContract, saveAllotment, saveCompany, saveContract, stopAllotment } from "./data";
import { Box, Choices, Field, FormSheet, Wrong } from "./kit";
import {
  allotmentForm, allotmentInput, alreadyStopped, allotmentWrong, cellKey, companyForm, companyInput, companyWrong, CONTRACT_SAVED, contractForm,
  contractInput, contractWrong, HELD_SAID, KIND_LABEL, KINDS, RATES_NOTE, STOP_ASK, STOPPED_SAID, validWords,
  type Allotment, type AllotmentForm, type Company, type CompanyContracts, type CompanyForm, type Contract, type ContractForm,
} from "./rules";

/* ══════════════════════════════════════════════════════════════════
   THE THREE FORMS OF CONTRACTS on a phone (mobile/m13-sales): the web's
   CompanyDialog, ContractDialog and AllotmentDialog
   (src/modules/contracts/components/), each a whole-screen sheet.

   The web's guards, word for word: the first thing the server would
   refuse is said in red and the primary button stays grey until it is
   put right; the server asks every rule again, and its refusal is said
   in the sheet, which stays open. Stop holding asks first, in the web's
   words, with the phone's own dialog (docs/NATIVE.md).

   ONE TAP, ONE WRITE (MEMORY 8): latched at the tap. AN OUTCOME NOBODY
   KNOWS (MEMORY 16; none of these routes reads a key): "Not known
   whether it was …" in the sheet, and the moment is handed to the company
   page (`onUnknown`), which greys every write - a fresh sheet included -
   until the company has been read again after it (rules.ts stillUnknown,
   MCON-1). The sheet cannot be closed while a write is on its way, so its
   answer always reaches the page.
   ══════════════════════════════════════════════════════════════════ */

type Done = (said: Said) => void;
/** The company page's own record of a write nobody knows the end of (Company.tsx). */
export type OnUnknown = (title: string, line: string, e: unknown) => void;

/** Shared by the three: the latch, the stop, the sheet's own message. */
function useWrite(onUnknown: OnUnknown) {
  const latch = useRef(false);
  const stuck = useStuck();
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  const run = async (write: () => Promise<unknown>, done: () => void, notDone: string, unknownWhat: string) => {
    if (latch.current || stuck.isStuck()) return;
    latch.current = true;
    setBusy(true);
    setSaid(null);
    try {
      await write();
      done();
    } catch (e) {
      if (stuck.stop(e)) {
        const w = notKnown(unknownWhat, "the company's contracts and allotments", e);
        setSaid({ title: w.title, body: w.body, tone: "bad" });
        onUnknown(w.title, w.line, e);
      } else if (e instanceof HeldError) setSaid({ title: "Saved on this phone", body: e.message, tone: "held" });
      else setSaid({ title: notDone, body: message(e), tone: "bad" });
    } finally {
      latch.current = false;
      setBusy(false);
    }
  };
  return { busy, said, stuck: stuck.stuck, run };
}

/* ── Add or edit a company ───────────────────────────────────────── */

export function CompanyDialog({ code, company, keeper, onClose, onDone, onUnknown }: {
  code: string; company?: Company; keeper: boolean; onClose: () => void; onDone: (said: Said, id: string) => void; onUnknown: OnUnknown;
}) {
  const [form, setForm] = useState<CompanyForm>(() => companyForm(company));
  const w = useWrite(onUnknown);
  const set = <K extends keyof CompanyForm>(k: K) => (v: CompanyForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const wrong = companyWrong(form);
  const save = () => {
    const input = companyInput(form);
    let id = company?.id ?? "";
    void w.run(
      async () => { id = (company ? await saveCompany(code, company.id, input) : await addCompany(code, input)).id; },
      () => onDone({ title: company ? "Company updated" : "Company added", body: input.name, tone: "ok" }, id),
      company ? "Not changed" : "Not added", company ? "the company was changed" : "the company was added",
    );
  };
  const text = (k: Exclude<keyof CompanyForm, "kind" | "creditAllowed">, label: string, opts: Partial<Parameters<typeof Box>[0]> = {}, hint?: string) => (
    <Field label={label} hint={hint}><Box label={label} value={form[k]} onChange={set(k)} {...opts} /></Field>
  );
  return (
    <FormSheet
      title={company ? "Edit company" : "Add company"} onClose={onClose} busy={w.busy} said={w.said}
      description={keeper
        ? "One record for the group: the same company at every hotel."
        : "Its name, GSTIN and address, for the tax invoice. Credit and contracts are set by the owner, an administrator or the GM."}
      foot={(
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn label="Cancel" grow tall disabled={w.busy} onPress={onClose} />
          <Btn label={w.busy ? "Saving…" : company ? "Save" : "Add company"} variant="primary" grow tall disabled={wrong !== null || w.busy || w.stuck} onPress={save} />
        </View>
      )}
    >
      {text("name", "Name", { max: 120 })}
      {keeper ? (
        <Field label="Kind"><Segmented label="Kind" value={form.kind} onChange={set("kind")} options={KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))} /></Field>
      ) : null}
      {text("gstin", "GSTIN", { upper: true, max: 15, mono: true }, "From the company's GST certificate. It prints on the company's tax invoices.")}
      {text("addressLine", "Billing address", { max: 200 })}
      <View style={{ flexDirection: "row", gap: 12 }}>
        {text("city", "City", { max: 80 })}
        {text("state", "State", { max: 80 })}
      </View>
      {text("pincode", "PIN code", { keyboard: "number-pad", max: 6, mono: true })}
      {keeper ? (
        <>
          {text("contactName", "Contact person", { max: 120 })}
          {text("phone", "Phone", { keyboard: "phone-pad" })}
          {text("email", "Email", { keyboard: "email-address" })}
          <Toggle value={form.creditAllowed} onChange={set("creditAllowed")} label="Credit allowed" description="A bill may be sent to the company to pay later (Bill to company)." />
          {form.creditAllowed ? (
            <>
              <View style={{ flexDirection: "row", gap: 12 }}>
                {text("creditDays", "Credit days", { keyboard: "number-pad", mono: true })}
                {text("creditLimit", "Credit limit (₹)", { keyboard: "decimal-pad", mono: true })}
              </View>
              <Text style={[t.caption, { color: c.grey500 }]}>Shown, not enforced, until the company's payments are recorded. Blank is not set.</Text>
            </>
          ) : null}
        </>
      ) : null}
      {/* Not "has a name" on an empty new form: the button says it (the web's). */}
      <Wrong words={wrong && (form.name.trim() || company) ? wrong : null} />
    </FormSheet>
  );
}

/* ── Add or edit a contract: its prices are typed, never filled in ── */

export function ContractDialog({ code, data, contract, onClose, onDone, onUnknown }: {
  code: string; data: CompanyContracts; contract?: Contract; onClose: () => void; onDone: Done; onUnknown: OnUnknown;
}) {
  const [form, setForm] = useState<ContractForm>(() => contractForm(contract, data.today));
  const w = useWrite(onUnknown);
  const agent = data.company.kind === "travel_agent";
  const set = <K extends keyof ContractForm>(k: K) => (v: ContractForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setCell = (key: string, which: "single" | "double", v: string) =>
    setForm((f) => ({ ...f, cells: { ...f.cells, [key]: { ...(f.cells[key] ?? { single: "", double: "" }), [which]: v } } }));
  const wrong = contractWrong(form);
  const save = () => {
    const input = contractInput(form, agent);
    void w.run(
      () => (contract ? saveContract(code, contract.id, input) : addContract(code, data.company.id, input)),
      () => onDone({ title: contract ? "Contract updated" : "Contract added", body: CONTRACT_SAVED, tone: "ok" }),
      contract ? "Not changed" : "Not added", contract ? "the contract was changed" : "the contract was added",
    );
  };
  return (
    <FormSheet
      title={contract ? "Edit contract" : "Add contract"} onClose={onClose} busy={w.busy} said={w.said}
      description={`${data.company.name}, at this hotel. The contract in force on the arrival date prices the booking.`}
      foot={(
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn label="Cancel" grow tall disabled={w.busy} onPress={onClose} />
          <Btn label={w.busy ? "Saving…" : contract ? "Save" : "Add contract"} variant="primary" grow tall disabled={wrong !== null || w.busy || w.stuck} onPress={save} />
        </View>
      )}
    >
      <Field label="Name"><Box label="Name" value={form.name} onChange={set("name")} max={80} placeholder={`${data.company.name} 2026-27`} /></Field>
      {/* The web's date inputs; typed here as they send it (no date picker on the phone yet). */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Field label="Valid from" hint="As 2026-04-01"><Box label="Valid from" value={form.validFrom} onChange={set("validFrom")} keyboard="numbers-and-punctuation" max={10} mono /></Field>
        <Field label="Valid to" hint="As 2027-03-31"><Box label="Valid to" value={form.validTo} onChange={set("validTo")} keyboard="numbers-and-punctuation" max={10} mono /></Field>
      </View>
      <Field label="Priced by">
        <Segmented label="Priced by" stacked value={form.pricing} onChange={set("pricing")}
          options={[{ value: "rates", label: "Fixed rates" }, { value: "discount", label: "Discount off the day's rate" }]} />
      </Field>
      {form.pricing === "discount" ? (
        <Field label="Discount (%)" hint="Taken off the price on Rates for the arrival date.">
          <Box label="Discount (%)" value={form.discountPercent} onChange={set("discountPercent")} keyboard="decimal-pad" mono />
        </Field>
      ) : (
        <View style={{ gap: 16 }}>
          <Text style={[body, { color: c.grey600 }]}>{RATES_NOTE}</Text>
          {data.roomTypes.map((rt) => (
            <View key={rt.id} style={{ gap: 8 }}>
              <Text style={[t.label, { color: c.ink900 }]} accessibilityRole="header">{rt.name}</Text>
              {data.mealPlans.map((p) => {
                const key = cellKey(rt.id, p.code);
                const cell = form.cells[key] ?? { single: "", double: "" };
                return (
                  <View key={key} style={{ gap: 6 }}>
                    <Text style={[t.label, { color: c.grey700 }]}>{`${p.code} · ${p.includes}`}</Text>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <Field label="Single (₹)">
                        <Box label={`${rt.name} ${p.code} single`} value={cell.single} onChange={(v) => setCell(key, "single", v)} keyboard="decimal-pad" placeholder="-" mono />
                      </Field>
                      <Field label="Double (₹)">
                        <Box label={`${rt.name} ${p.code} double`} value={cell.double} onChange={(v) => setCell(key, "double", v)} keyboard="decimal-pad" placeholder="-" mono />
                      </Field>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      )}
      {agent ? (
        <Field label="Commission (%)" hint="Stamped on each booking made under this contract, in place of the booking source's. Blank is none agreed.">
          <Box label="Commission (%)" value={form.commissionPct} onChange={set("commissionPct")} keyboard="decimal-pad" mono />
        </Field>
      ) : null}
      <Field label="Notes"><Box label="Notes" value={form.notes} onChange={set("notes")} rows={2} max={500} /></Field>
      <Wrong words={wrong && form.name.trim() ? wrong : null} />
    </FormSheet>
  );
}

/* ── Hold rooms, change an allotment, stop holding ───────────────── */

export function AllotmentDialog({ code, data, contract, allotment, onClose, onDone, onUnknown }: {
  code: string; data: CompanyContracts; contract: Contract; allotment?: Allotment; onClose: () => void; onDone: Done; onUnknown: OnUnknown;
}) {
  const [form, setForm] = useState<AllotmentForm>(() => allotmentForm(allotment, contract, data));
  const w = useWrite(onUnknown);
  const set = (k: keyof AllotmentForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const wrong = allotmentWrong(form, contract);
  const save = () => {
    const input = allotmentInput(form);
    void w.run(
      () => (allotment ? saveAllotment(code, allotment.id, input) : addAllotment(code, { ...input, contractId: contract.id, roomTypeId: form.roomTypeId })),
      () => onDone({ title: allotment ? "Allotment changed" : "Rooms held", body: HELD_SAID, tone: "ok" }),
      allotment ? "Not changed" : "Not held", allotment ? "the allotment was changed" : "the rooms were held",
    );
  };
  /* The web asks with a second press; the phone with its own dialog, in the web's words (docs/NATIVE.md). */
  const stop = () => {
    if (!allotment || w.busy || w.stuck) return;
    Alert.alert("Stop holding?", STOP_ASK, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes, stop holding", style: "destructive",
        onPress: () => void w.run(
          /* A repeated Stop answers 404 "No such allotment here": already stopped (rules.ts alreadyStopped). */
          () => stopAllotment(code, allotment.id).catch((e: unknown) => { if (!(e instanceof ApiError && alreadyStopped(e.status))) throw e; }),
          () => onDone({ title: "No longer held", body: STOPPED_SAID, tone: "ok" }), "Not stopped", "the allotment was stopped"),
      },
    ]);
  };
  return (
    <FormSheet
      title={allotment ? "Change allotment" : "Hold rooms"} onClose={onClose} busy={w.busy} said={w.said}
      description={`${data.company.name}, under "${contract.name}" (${validWords(contract)}). Booked at the contract's rate.`}
      foot={(
        <>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Btn label="Cancel" grow tall disabled={w.busy} onPress={onClose} />
            <Btn label={w.busy ? "Saving…" : allotment ? "Save" : "Hold rooms"} variant="primary" grow tall disabled={wrong !== null || w.busy || w.stuck} onPress={save} />
          </View>
          {allotment ? <Btn label="Stop holding" tall disabled={w.busy || w.stuck} onPress={stop} /> : null}
        </>
      )}
    >
      <Field label="Room type" hint={allotment ? "An allotment keeps its room type: stop it and hold another to change it." : undefined}>
        <Choices label="Room type" value={form.roomTypeId} disabled={Boolean(allotment)} onChange={set("roomTypeId")}
          options={data.roomTypes.map((rt) => ({ value: rt.id, label: rt.name }))} />
      </Field>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Field label="First night" hint="As 2026-12-24"><Box label="First night" value={form.firstNight} onChange={set("firstNight")} keyboard="numbers-and-punctuation" max={10} mono /></Field>
        <Field label="Last night" hint="As 2026-12-31"><Box label="Last night" value={form.lastNight} onChange={set("lastNight")} keyboard="numbers-and-punctuation" max={10} mono /></Field>
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Field label="Rooms a night"><Box label="Rooms a night" value={form.rooms} onChange={set("rooms")} keyboard="number-pad" mono /></Field>
        <Field label="Release (days before each night)" hint="Rooms nobody booked go back on sale at that night audit.">
          <Box label="Release (days before each night)" value={form.releaseDays} onChange={set("releaseDays")} keyboard="number-pad" mono />
        </Field>
      </View>
      <Field label="Notes"><Box label="Notes" value={form.notes} onChange={set("notes")} rows={2} max={500} /></Field>
      <Wrong words={wrong && (form.lastNight || form.rooms) ? wrong : null} />
    </FormSheet>
  );
}
