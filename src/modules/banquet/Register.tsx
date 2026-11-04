import { useRef, useState } from "react";
import { Text, View } from "react-native";
import { HeldError, outcomeUnknown } from "../../core/api";
import { c, t } from "../../core/theme";
import { useRead } from "../../core/ui";
import { Field, Input, Tick } from "../finance/Kit";
import { Btn, body, Dialog, Foot, InDialog, Loading, Select, message, saidOf, type Said } from "../guest-services/kit";
import { Day } from "../housekeeping/DayStepper";
import { isRefused, readSetup, register } from "./data";
import { clockText, figure, hallWords, overfull, registerBody, usualHint } from "./rules";

/* ══════════════════════════════════════════════════════════════════
   REGISTER A FUNCTION — the web's RegisterDialog (pages/Banquet.tsx).
   "This holds nothing yet. Confirming it takes the hall." An ENQUIRY: two
   families may ask about the same Saturday, and the server only warns of a
   clash (its own sentence). TILL WHEN is required - the question the whole
   module exists to ask. The price is only what is typed: blank is
   UNPRICED, the hall's usual is OFFERED ("Use usual"), 0 only with Free
   (D27-120). Not pictured: built from the code.

   The web's datetime-local is a day stepper and a 24-hour time here (M-7:
   no date-picker package), sent as the same "YYYY-MM-DDTHH:MM" on the
   property's clock. OFFLINE it is HELD (the web's "Function enquiry" tier)
   with the key it was given at the tap: one call is one enquiry (062).
   One tap, one write (MEMORY 8).
   ══════════════════════════════════════════════════════════════════ */

export function Register({ code, businessDate, onClose, onDone, onHeld }: {
  code: string; businessDate: string; onClose: () => void;
  onDone: (id: string, reference: string, warning: string | null) => void; onHeld: (said: Said) => void;
}) {
  const setup = useRead(() => readSetup(code), ["banquet", code, "setup"]);
  const [venueId, setVenueId] = useState("");
  const [title, setTitle] = useState("");
  const [fromDay, setFromDay] = useState(businessDate);
  const [fromTime, setFromTime] = useState("");
  const [untilDay, setUntilDay] = useState(businessDate);
  const [untilTime, setUntilTime] = useState("");
  const [hostName, setHostName] = useState("");
  const [hostPhone, setHostPhone] = useState("");
  const [pax, setPax] = useState("");
  const [amount, setAmount] = useState("");
  const [free, setFree] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const [said, setSaid] = useState<Said | null>(null);

  const halls = setup.data && !isRefused(setup.data) ? setup.data.venues.filter((v) => v.isActive) : [];
  const chosen = halls.find((v) => v.id === venueId);
  const holds = overfull(chosen, pax);
  const body_ = registerBody({ venueId, title, hostName, hostPhone, fromDay, fromTime, untilDay, untilTime, pax, amount, free, notes });

  async function submit() {
    if (latch.current || !body_) return;
    latch.current = true;
    setBusy(true);
    setSaid(null);
    try {
      const res = await register(code, body_);
      onDone(res.id, res.reference, res.warning);
    } catch (e) {
      if (e instanceof HeldError) onHeld(saidOf("", e));
      else setSaid({ title: outcomeUnknown(e) ? "Not known whether it was registered" : "Not registered", body: outcomeUnknown(e) ? `${message(e)} Tapped again unchanged, it is sent with the same key, so it is made once.` : message(e), tone: "bad" });
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }

  const timeHint = (text: string) => (text.trim() !== "" && !clockText(text) ? "Not a time: 24-hour, as 18:00." : "24-hour, as 18:00.");

  return (
    <Dialog title="Register a function" description="This holds nothing yet. Confirming it takes the hall." onClose={onClose}>
      <Field label="Hall" required>
        {setup.data === undefined ? (
          setup.error ? <Text style={[body, { color: c.red700 }]} accessibilityRole="alert">The halls did not load: {setup.error}</Text>
            : <Loading words="Reading the halls…" />
        ) : isRefused(setup.data) ? (
          <Text style={[body, { color: c.red700 }]} accessibilityRole="alert">{setup.data.refused}</Text>
        ) : (
          <Select<string>
            label="Hall" value={venueId} onChange={setVenueId}
            options={[{ value: "", label: "Choose a hall…" }, ...halls.map((v) => ({ value: v.id, label: hallWords(v) }))]}
          />
        )}
      </Field>

      <Field label="What is the function?" required>
        <Input label="What is the function?" value={title} onChange={setTitle} placeholder="Sharma sangeet" />
      </Field>

      <Field label="From" required hint={timeHint(fromTime)}>
        <View style={{ gap: 8 }}>
          <Day label="From" value={fromDay} off={false} onChange={(v) => { setFromDay(v); if (untilDay < v) setUntilDay(v); }} />
          <Input label="From, the time" value={fromTime} onChange={setFromTime} keyboard="numbers-and-punctuation" placeholder="18:00" maxLength={5} tabular />
        </View>
      </Field>

      {/* The question the whole module exists to make somebody answer; the hint says why. */}
      <Field label="Until" required hint={`A hall booked with no end is a hall nobody else can be sold. ${timeHint(untilTime)}`}>
        <View style={{ gap: 8 }}>
          <Day label="Until" value={untilDay} min={fromDay} off={false} onChange={setUntilDay} />
          <Input label="Until, the time" value={untilTime} onChange={setUntilTime} keyboard="numbers-and-punctuation" placeholder="23:00" maxLength={5} tabular />
        </View>
      </Field>

      <Field label="Host" required>
        <Input label="Host" value={hostName} onChange={setHostName} placeholder="Mr Sharma" />
      </Field>
      <Field label="Telephone">
        <Input label="Telephone" value={hostPhone} onChange={setHostPhone} keyboard="phone-pad" />
      </Field>

      <Field label="Expected guests">
        <Input label="Expected guests" value={pax} onChange={setPax} keyboard="number-pad" tabular />
        {holds !== null ? <Text style={[t.caption, { color: c.yellow800 }]}>More than this hall holds ({holds}).</Text> : null}
        {figure(pax) === "bad" ? <Text style={[t.caption, { color: c.red700 }]}>Not a figure.</Text> : null}
      </Field>

      <Field label="Agreed amount" hint={figure(amount) === "bad" ? "Not a figure." : usualHint(chosen?.defaultRate)}>
        <Input label="Agreed amount" value={amount} onChange={setAmount} keyboard="decimal-pad" placeholder="-" off={free} tabular />
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          {/* OFFERED, never applied on its own: the number billed is the one somebody put here. */}
          {chosen?.defaultRate != null && !free ? <Btn label="Use usual" onPress={() => setAmount(String(chosen.defaultRate))} /> : null}
          <View style={{ flex: 1, minWidth: 120 }}>
            <Tick label="Free" on={free} onChange={(on) => { setFree(on); setAmount(on ? "0" : ""); }} />
          </View>
        </View>
      </Field>

      <Field label="Notes">
        <Input label="Notes" value={notes} onChange={setNotes} multiline />
      </Field>

      <InDialog said={said} />
      <Foot>
        <Btn label="Cancel" tall grow onPress={onClose} />
        <Btn label={busy ? "Registering…" : "Register"} variant="primary" tall grow disabled={!body_ || busy} onPress={() => void submit()} />
      </Foot>
    </Dialog>
  );
}
