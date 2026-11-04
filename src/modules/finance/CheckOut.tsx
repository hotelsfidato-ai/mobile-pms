import { Clock, LogOut, ShieldCheck } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, space, t } from "../../core/theme";
import type { Stay } from "../../core/types";
import { useRead } from "../../core/ui";
import { asksLateReason, isForeign, rupees, stillOutstanding, whyNotLeave } from "./bill";
import { checkOut, readClock } from "./data";
import { Btn, Field, Input, Refused, Sheet, Tick, type Said, useOnce } from "./Kit";
import { whyNotCheckOut } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   CHECK OUT — the foot of the web's Bill tab (FolioPanel.tsx 206-244,
   CheckOutButton 1400-1461) and its way through a late departure
   (front-desk flows/LateCheckOutFlow.tsx). Blocked, visible, and it says
   why (Rule 6). The server decides the rest: the balance again, Form III,
   the late charge. REFUSED OFFLINE: `send` says the web's sentence. The
   room goes dirty on the server, and the tax invoice is issued afterwards
   from its own series, never here.
   ══════════════════════════════════════════════════════════════════ */

type Leave = {
  hotel: Hotel;
  stay: Stay;
  /** Checked out: what to say, then the screen is left. */
  onLeft: (title: string, text: string) => void;
  onSaid: (said: Said) => void;
  onReread: () => void;
};

export function CheckOutPanel({ hotel, stay, balance, role, onLeft, onSaid, onReread }: Leave & {
  /** The server's balance; null is no bill. */
  balance: number | null;
  role: string | null;
}) {
  /* Form III is asked only of a departure still to happen. */
  const foreign = isForeign(stay.nationality) && stay.status !== "checked-out";
  const [next, setNext] = useState("");
  const [asking, setAsking] = useState(false);
  const [late, setLate] = useState(false);
  const [busy, setBusy] = useState(false);

  const why = whyNotCheckOut(role) ?? whyNotLeave(stay.status, balance);
  const allowed = why === null && (!foreign || Boolean(next.trim()));

  const once = useOnce();
  async function leave() {
    setBusy(true);
    try {
      await checkOut(hotel.code, stay.id, {}, next.trim());
      setAsking(false);
      onLeft(`${stay.guest} checked out`, `Room ${stay.roomNumber} is now dirty and on housekeeping's board.`);
    } catch (e) {
      const said = e instanceof Error ? e.message : "Could not check out.";
      setAsking(false);
      /* THE WAY THROUGH, not another refusal (FolioPanel 230-240). */
      if (asksLateReason(said)) setLate(true);
      else onSaid({ tone: "refused", title: "Could not check out", text: said });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.grey200 }}>
      {foreign ? (
        <Field label="Next destination" required hint="Form III reports where a foreign guest goes next.">
          <Input label="Next destination" value={next} onChange={setNext} />
        </Field>
      ) : null}
      {/* Primary only once it may happen: while it is blocked, Settle is the step. */}
      <Btn wide kind={allowed ? "primary" : "secondary"} label="Check out" Icon={LogOut} off={!allowed} onPress={() => setAsking(true)} />
      {why ? <Text style={[t.caption, { color: c.red700, textAlign: "center" }]}>{why}</Text> : null}

      <Sheet
        visible={asking} onClose={() => setAsking(false)} title={`Check ${stay.guest} out?`} description={`Room ${stay.roomNumber}`}
        footer={(
          <>
            <Btn label="Not yet" onPress={() => setAsking(false)} />
            <Btn kind="primary" label="Check out" busy={busy} onPress={() => void once(leave)} />
          </>
        )}
      >
        <Text style={[t.label, { color: c.grey700, lineHeight: 20 }]}>The bill closes and the room goes to housekeeping as dirty.</Text>
      </Sheet>

      {late ? <LateSheet hotel={hotel} stay={stay} next={next.trim()} onClose={() => setLate(false)} onLeft={onLeft} onSaid={onSaid} onReread={onReread} /> : null}
    </View>
  );
}

/** A guest who stayed past check-out time: why, and the charge (LateCheckOutFlow). */
function LateSheet({ hotel, stay, next, onClose, onLeft, onSaid, onReread }: Leave & { next: string; onClose: () => void }) {
  const clock = useRead(() => readClock(hotel.code), ["finance", hotel.code, "clock"]);
  const mayWaive = clock.data?.mayWaive === true;
  const charge = clock.data?.lateCharge ?? null;
  const [reason, setReason] = useState("");
  const [waive, setWaive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);

  const once = useOnce();
  async function submit() {
    setBusy(true);
    setRefused(null);
    try {
      await checkOut(hotel.code, stay.id, { lateReason: reason.trim(), waiveLate: mayWaive && waive }, next);
      onClose();
      onLeft(`${stay.guest} checked out`, waive && mayWaive
        ? "The late departure is recorded and the charge waived - both are on the stay."
        : charge === null ? "The late departure is recorded. The property does not charge for one."
        : `${rupees(charge)} added to the folio.`);
    } catch (e) {
      const said = e instanceof Error ? e.message : "Could not check out.";
      /* THE COMMON OUTCOME, AND NOT A FAILURE: the charge is posted, then the
         balance refuses. Closed, so the reason is never typed twice. */
      if (stillOutstanding(said)) {
        onClose();
        onSaid({ tone: "warn", title: "Recorded - now settle the bill", text: said });
        onReread();
      } else {
        setRefused(said);
      }
    } finally {
      setBusy(false);
    }
  }

  const note = { backgroundColor: c.grey50, borderWidth: 1, borderColor: c.grey200, borderRadius: 8, padding: space.card };
  return (
    <Sheet
      visible onClose={onClose} title="Leaving after check-out time" description={`${stay.guest} · Room ${stay.roomNumber}`}
      footer={(
        <>
          <Btn label="Cancel" onPress={onClose} />
          <Btn kind="primary" label={busy ? "Checking out…" : "Check out"} off={!reason.trim() || busy} onPress={() => void once(submit)} />
        </>
      )}
    >
      <View style={{ flexDirection: "row", gap: 10, backgroundColor: c.yellow50, borderWidth: 1, borderColor: c.yellow100, borderRadius: 8, padding: space.card }}>
        <Clock size={16} color={c.yellow800} style={{ marginTop: 2 }} />
        <Text style={[t.label, { flex: 1, color: c.ink900, lineHeight: 20 }]}>
          Check-out here is {clock.data?.checkOutTime ?? "check-out time"}. A room still occupied after it has been kept out of tonight's inventory, and housekeeping cannot turn it around for an arrival that is already on the chart. That is why this is written down rather than waved through.
        </Text>
      </View>

      <Field label="Why" required hint="Somebody will ask - on the bill, or in the audit trail. A flight time, a manager's say-so, a room not ready on arrival.">
        <Input label="Why" value={reason} onChange={setReason} placeholder="Late flight, agreed at reception" />
      </Field>

      {charge === null ? (
        <Text style={[t.label, note, { lineHeight: 20 }]}>This property does not charge for a late departure, so nothing will be added. It is still recorded.</Text>
      ) : mayWaive ? (
        <View style={note}>
          <Tick on={waive} onChange={setWaive} label={`Waive the ${rupees(charge)} charge`} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <ShieldCheck size={16} color={c.orange} style={{ marginTop: 2 }} />
            <Text style={[t.label, { flex: 1, lineHeight: 20 }]}>Your decision, recorded against your name. The late departure is still written down - waiving the money does not unwrite the fact.</Text>
          </View>
        </View>
      ) : (
        <Text style={[t.label, note, { lineHeight: 20 }]}>{rupees(charge)} will be added to the folio. A manager can waive it - that is a decision about money and it is theirs to make.</Text>
      )}

      <Refused text={refused} />
    </Sheet>
  );
}
