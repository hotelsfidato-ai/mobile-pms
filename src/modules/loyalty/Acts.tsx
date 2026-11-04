import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Text } from "react-native";
import { outcomeUnknown } from "../../core/api";
import { c } from "../../core/theme";
import { Tick } from "../front-desk/kit";
import { Btn, body, Dialog, Field, Foot, InDialog, message, saidOf, type Said } from "../guest-services/kit";
import { join, leave, redeem } from "./data";
import { Typed } from "./kit";
import { digitsOnly, NO_WORDS, pointsText, rupees, spendLabel, spendOf, type LoyaltyStay } from "./loyalty";

/* ══════════════════════════════════════════════════════════════════
   THE IN-HOUSE CARD'S THREE DIALOGS — the web's JoinDialog, SpendDialog and
   LeaveDialog (src/modules/loyalty/pages/Loyalty.tsx 116-187). Not
   pictured: built from the web's code, its words and order.

   A refusal is the SERVER'S OWN SENTENCE inside the dialog, which stays
   open (the web toasts "Not done" with it): no name yet, no mobile
   number, already a member, from 500, more than the room charges, a tax
   invoice already made. Offline, the web's sentence (no loyalty path is
   held). One tap is one write (MEMORY 8): each is latched at the tap.
   AN UNKNOWN OUTCOME (outcomeUnknown: nothing came back, or a 5xx):
   Use points empties its figure and says so, and the list is read again;
   its route reads the key and the stay's keeper keeps it until that read,
   so a repeat typed before it is taken once. Join and Leave read no key
   (R-30): the dialog takes no more taps until it is closed (MEMORY 16).
   ══════════════════════════════════════════════════════════════════ */

type Props = { code: string; stay: LoyaltyStay; onClose: () => void; onDone: (said: Said) => void };

/** Every accepted write reads loyalty again - at every hotel, as the web
    (`["loyalty"]`): a member's points are the group's. */
const useReread = () => {
  const cache = useQueryClient();
  return () => cache.invalidateQueries({ queryKey: ["loyalty"] });
};

/* L4: the guest's own yes to the programme's own words, separate from offers. */
export function Join({ code, stay, words, onClose, onDone }: Props & { words: string | null }) {
  const reread = useReread();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const stuck = useRef(false);
  const [said, setSaid] = useState<Said | null>(null);

  async function submit() {
    if (latch.current) return;
    latch.current = true;
    setSaid(null);
    setBusy(true);
    try {
      await join(code, stay.guestId);
      void reread();
      onDone({ title: `${stay.name} joined`, tone: "ok" });
    } catch (e) {
      if (outcomeUnknown(e)) {
        stuck.current = true;
        setSaid({ title: "Not known whether they joined", body: `${message(e)} Close this and look at the list before joining them again.`, tone: "bad" });
      } else setSaid(saidOf("Not done", e));
    } finally {
      latch.current = stuck.current;
      setBusy(false);
    }
  }

  return (
    <Dialog title={`Join ${stay.name}`} description="Read this to the guest. Joining is not a yes to offers." onClose={onClose}>
      <Text style={[body, { color: c.ink900 }]}>{words ?? NO_WORDS}</Text>
      {!stay.hasPhone ? <Text style={[body, { color: c.grey600 }]}>This guest has no mobile number on file; a member needs one.</Text> : null}
      <Tick value={agreed} onChange={setAgreed} label="The guest agrees" disabled={!words} />
      <InDialog said={said} />
      <Foot>
        <Btn label="Cancel" tall grow onPress={onClose} />
        <Btn label={busy ? "Joining…" : "Join"} variant="primary" tall grow disabled={busy || stuck.current || !agreed || !words} onPress={() => void submit()} />
      </Foot>
    </Dialog>
  );
}

/* L13: from 500, up to the balance and the room charges on the bill. */
export function Spend({ code, stay, onClose, onDone }: Props) {
  const reread = useReread();
  const [points, setPoints] = useState("");
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const [said, setSaid] = useState<Said | null>(null);
  const n = spendOf(points);

  async function submit() {
    if (latch.current || n === null) return;
    latch.current = true;
    setSaid(null);
    setBusy(true);
    try {
      await redeem(code, stay.id, n);
      void reread();
      onDone({ title: `${rupees(n)} off the room charges`, tone: "ok" });
    } catch (e) {
      if (outcomeUnknown(e)) {
        /* Emptied, so a repeat is typed on purpose; the list's read below
           lets the key go once the guest's points are in view (MEMORY 16). */
        setPoints("");
        setSaid({ title: "Not known whether the points were used", body: `${message(e)} The list is read again: check the guest's points before using them again.`, tone: "bad" });
        void reread();
      } else setSaid(saidOf("Not done", e));
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }

  return (
    <Dialog
      title={`Use points for ${stay.name}`}
      description={`${pointsText(stay.points)} points. They come off the room charges as a discount line, from 500 at a time.`}
      onClose={onClose}
    >
      <Field label="Points" hint="1 point is ₹1 off. The guest signs the bill.">
        <Typed label="Points" value={points} onChangeText={(v) => setPoints(digitsOnly(v))} keyboard="number-pad" autoFocus />
      </Field>
      <InDialog said={said} />
      <Foot>
        <Btn label="Cancel" tall grow onPress={onClose} />
        <Btn label={busy ? "Using…" : spendLabel(points)} variant="primary" tall grow disabled={busy || n === null} onPress={() => void submit()} />
      </Foot>
    </Dialog>
  );
}

/* L5: as easy as joining; what is left lapses. */
export function Leave({ code, stay, onClose, onDone }: Props) {
  const reread = useReread();
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const stuck = useRef(false);
  const [said, setSaid] = useState<Said | null>(null);

  async function submit() {
    if (latch.current) return;
    latch.current = true;
    setSaid(null);
    setBusy(true);
    try {
      await leave(code, stay.guestId);
      void reread();
      onDone({ title: `${stay.name} left`, tone: "ok" });
    } catch (e) {
      if (outcomeUnknown(e)) {
        stuck.current = true;
        setSaid({ title: "Not known whether they left", body: `${message(e)} Close this and look at the list before trying again.`, tone: "bad" });
      } else setSaid(saidOf("Not done", e));
    } finally {
      latch.current = stuck.current;
      setBusy(false);
    }
  }

  return (
    <Dialog
      title={`${stay.name} leaves loyalty?`}
      description={`Their ${pointsText(stay.points)} points lapse. Their history stays with the bills.`}
      onClose={onClose}
    >
      <Text style={[body, { color: c.grey600 }]}>They can join again later, with no points.</Text>
      <InDialog said={said} />
      <Foot>
        <Btn label="Cancel" tall grow onPress={onClose} />
        <Btn label={busy ? "Leaving…" : "Leave"} variant="danger" tall grow disabled={busy || stuck.current} onPress={() => void submit()} />
      </Foot>
    </Dialog>
  );
}
