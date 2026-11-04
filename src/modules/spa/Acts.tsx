import { useQueryClient } from "@tanstack/react-query";
import { Clock } from "lucide-react-native";
import { useRef, useState } from "react";
import { Text } from "react-native";
import { c, face, t } from "../../core/theme";
import { useRead } from "../../core/ui";
import { Btn, body, Dialog, Field, Foot, InDialog, Input, Loading, Select, saidOf, type Said } from "../guest-services/kit";
import { book, cancel, charge, isRefused, readStays, readTherapists, readTreatments } from "./data";
import { bookBody, chargedWords, clockDate, rupees, stayWords, timeWords, treatmentWords, whatAndWhen, type SpaAppointment } from "./diary";

/* ══════════════════════════════════════════════════════════════════
   THE DIARY'S THREE DIALOGS — the web's BookDialog, CancelDialog and
   CloseDialog (src/modules/spa/pages/SpaDiary.tsx 296-647). Not pictured:
   built from the web's code, its words and order.

   Every refusal is the SERVER'S OWN SENTENCE, shown inside the dialog,
   which stays open: the therapist already busy (it names who, the guest,
   the treatment and the hour), the guest not staying that day, no spa tax
   rule (it names where GST is set), not checked in yet. Offline, the web's
   sentence (no spa path is held). One tap is one write (MEMORY 8): each is
   latched at the tap; Charge to room stays latched until the diary is read
   again after it lands, and keeps its key while its outcome is unknown.
   ══════════════════════════════════════════════════════════════════ */

/** Taking a booking, from a telephone call (D18-6): which guest, which
    treatment, which therapist, what time - not how long. */
export function Book({ code, day, onClose, onDone }: { code: string; day: string; onClose: () => void; onDone: (said: Said) => void }) {
  const cache = useQueryClient();
  const [stayId, setStayId] = useState("");
  const [treatmentId, setTreatmentId] = useState("");
  const [therapistId, setTherapistId] = useState("");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const [said, setSaid] = useState<Said | null>(null);

  const stays = useRead(() => readStays(code), ["spa", code, "stays"]);
  const treatments = useRead(() => readTreatments(code), ["spa", code, "treatments"]);
  const therapists = useRead(() => readTherapists(code), ["spa", code, "therapists"]);

  /* Retired ones are not offered; the server refuses them by name anyway. */
  const onOffer = Array.isArray(treatments.data) ? treatments.data.filter((x) => x.isActive) : [];
  const available = Array.isArray(therapists.data) ? therapists.data.filter((x) => x.isActive) : [];
  const chosen = onOffer.find((x) => x.id === treatmentId);

  async function submit() {
    if (latch.current) return;
    setSaid(null);
    const out = bookBody(day, { stayId, treatmentId, therapistId, time });
    if ("problem" in out) { setSaid({ title: out.problem, tone: "bad" }); return; }
    latch.current = true;
    setBusy(true);
    try {
      await book(code, out.body);
      void cache.invalidateQueries({ queryKey: ["spa", code] });
      onDone({ title: "The treatment is in the diary.", tone: "ok" });
    } catch (e) {
      setSaid(saidOf("Not booked", e));
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }

  const listState = (q: { data: unknown; error: string | undefined }, what: string, reading: string) =>
    q.data === undefined
      ? (q.error ? <Text style={[body, { color: c.red700 }]} accessibilityRole="alert">{what} did not load: {q.error}</Text> : <Loading words={reading} />)
      : isRefused(q.data) ? <Text style={[body, { color: c.red700 }]} accessibilityRole="alert">{q.data.refused}</Text> : null;

  return (
    <Dialog title="Book a treatment" onClose={onClose}>
      <Text style={[body, { color: c.grey500 }]}>On {clockDate(day)}, at this property's own clock.</Text>

      {stays.data?.length === 0 ? (
        <Text style={[body, { color: c.grey700 }]}>
          No guest is here or expected, and every treatment is against a stay. Take the booking for the room first.
        </Text>
      ) : null}

      <Field label="Which guest">
        {stays.data === undefined ? listState(stays, "The guests", "Reading who is here or expected…") : (
          <Select<string>
            label="Which guest" value={stayId} onChange={setStayId}
            options={[{ value: "", label: "Pick a guest" }, ...stays.data.map((s) => ({ value: s.id, label: stayWords(s) }))]}
          />
        )}
      </Field>

      <Field label="Which treatment" hint="Its length is what places it in the day, so nothing here asks when it ends.">
        {listState(treatments, "The treatments", "Reading the treatments…") ?? (
          <Select<string>
            label="Which treatment" value={treatmentId} onChange={setTreatmentId}
            options={[{ value: "", label: "Pick a treatment" }, ...onOffer.map((x) => ({ value: x.id, label: treatmentWords(x) }))]}
          />
        )}
      </Field>

      {/* Said before it is booked, not discovered at the till. */}
      {chosen && chosen.price === null ? (
        <Text style={[body, { color: c.grey700 }]}>
          {chosen.name} has no price. The booking can be taken, but it shows a dash and cannot be closed for money. A price
          added later on Treatments and therapists applies to new bookings only, so this one would be cancelled and booked again.
        </Text>
      ) : null}

      <Field label="Which therapist">
        {listState(therapists, "The therapists", "Reading the therapists…") ?? (
          <Select<string>
            label="Which therapist" value={therapistId} onChange={setTherapistId}
            options={[{ value: "", label: "Pick a therapist" }, ...available.map((x) => ({ value: x.id, label: x.name }))]}
          />
        )}
      </Field>

      <Field label="What time">
        <Input label="What time" icon={Clock} value={time} onChangeText={setTime} maxLength={5} placeholder="--:--" keyboardType="numbers-and-punctuation" />
      </Field>
      {/* The phone's own: a typed time is said back as the diary will show it, so "4:00" is seen to be the
          morning before it is booked (MSPA-1; the web's time input shows AM / PM itself). */}
      {time ? <Text style={t.caption}>{timeWords(day, time)}</Text> : null}

      <InDialog said={said} />
      <Foot>
        <Btn label="Cancel" tall grow onPress={onClose} />
        <Btn label={busy ? "Booking…" : "Book it"} variant="primary" tall grow disabled={busy} onPress={() => void submit()} />
      </Foot>
    </Dialog>
  );
}

/** A cancellation says why: the line somebody asks about a month later. */
export function Cancel({ code, appointment, onClose, onDone }: {
  code: string; appointment: SpaAppointment; onClose: () => void; onDone: (said: Said) => void;
}) {
  const cache = useQueryClient();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const [said, setSaid] = useState<Said | null>(null);

  async function submit() {
    if (latch.current) return;
    latch.current = true;
    setSaid(null);
    setBusy(true);
    try {
      /* Sent as typed, trimmed: an empty one is the server's to refuse, in its words. */
      await cancel(code, appointment.id, reason.trim());
      void cache.invalidateQueries({ queryKey: ["spa", code] });
      onDone({ title: "The hour is free again.", tone: "ok" });
    } catch (e) {
      setSaid(saidOf("Not cancelled", e));
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }

  return (
    <Dialog title="Cancel this treatment" onClose={onClose}>
      <Text style={[body, { color: c.grey700 }]}>{whatAndWhen(appointment)}. The therapist's hour goes back into the diary.</Text>
      <Field label="Why" hint="Whoever asks about this in a month reads this line.">
        <Input label="Why" value={reason} onChangeText={setReason} placeholder="The guest cancelled by telephone" maxLength={500} />
      </Field>
      <InDialog said={said} />
      <Foot>
        <Btn label="Keep it" tall grow onPress={onClose} />
        <Btn label={busy ? "Cancelling…" : "Cancel the treatment"} variant="danger" tall grow disabled={busy} onPress={() => void submit()} />
      </Foot>
    </Dialog>
  );
}

/** The treatment was given, and it goes on the room bill (D18-22). Once it
    is posted the only way back is a reversal on the folio, so this says
    exactly what is about to happen. The amount is the server's, as sent. */
export function Charge({ code, appointment, onClose, onDone }: {
  code: string; appointment: SpaAppointment; onClose: () => void; onDone: (said: Said) => void;
}) {
  const cache = useQueryClient();
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const [said, setSaid] = useState<Said | null>(null);

  async function submit() {
    if (latch.current) return;
    latch.current = true;
    setSaid(null);
    setBusy(true);
    try {
      await charge(code, appointment.id);
      /* Held until the diary is read again, so the button is gone before it could be tapped twice. */
      await cache.invalidateQueries({ queryKey: ["spa", code] });
      onDone({ title: chargedWords(appointment), tone: "ok" });
    } catch (e) {
      setSaid(saidOf("Not charged", e));
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }

  return (
    <Dialog title="Charge this treatment to the room" onClose={onClose}>
      <Text style={[body, { color: c.grey700 }]}>
        {whatAndWhen(appointment)}{appointment.room ? `, room ${appointment.room}` : ""}.
      </Text>
      <Text style={[body, { color: c.grey700 }]}>
        <Text style={[t.tab, { ...face[500], color: c.ink900 }]}>{rupees(appointment.amount)}</Text>
        {" "}goes on their bill as its own line, taxed at this property's spa rate. To undo it later, reverse the line on the bill.
      </Text>
      <InDialog said={said} />
      <Foot>
        <Btn label="Not yet" tall grow onPress={onClose} />
        <Btn label={busy ? "Charging…" : "Charge to room"} variant="primary" tall grow disabled={busy} onPress={() => void submit()} />
      </Foot>
    </Dialog>
  );
}
