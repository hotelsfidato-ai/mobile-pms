import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Text, View } from "react-native";
import { c, t } from "../../core/theme";
import { notKnown, useStuck } from "../../core/ui";
import { decide } from "../approvals/data";
import { blockedLine, doneWord, whyNotDecide, type Approval } from "../approvals/rules";
import { body, Btn, Dialog, Field, Foot, InDialog, Input, saidOf, type Said } from "../housekeeping/careKit";

/* ══════════════════════════════════════════════════════════════════
   DECIDING A WAITING EQUIPMENT REQUEST - the web's flows/Decide.tsx, through
   the app's Approvals (src/modules/approvals: its `decide`, its keeper, its
   words), the one engine every approval goes through. The buttons are
   offered only where the inbox says `mayDecide`; anywhere else its
   `blockedBecause` is the sentence. Refusing needs a reason. Refused
   offline in the web's words (approvals/data.ts). The route reads no key:
   on an unknown outcome the buttons take no more taps until the register
   is read again (MEMORY 16), and Approvals is one tap away.
   ══════════════════════════════════════════════════════════════════ */

export function DecideButtons({ code, approval, approveLabel, loading, onDone }: {
  code: string; approval: Approval | undefined; approveLabel: string; loading: boolean; onDone: (s: Said) => void;
}) {
  const cache = useQueryClient();
  const [refusing, setRefusing] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  const latch = useRef(false);
  const stuck = useStuck();

  if (!approval) {
    /* The inbox is still being read, or could not be: say where it is decided. */
    return loading ? null : (
      <View style={{ marginTop: 8 }}>
        <Btn label="Open Approvals" a11y="Open Approvals, where this request is decided" onPress={() => router.push(`/approvals/${code}`)} style={{ alignSelf: "flex-start" }} />
      </View>
    );
  }
  const blocked = blockedLine(approval);
  if (blocked) return <Text style={[body, { color: c.grey600, marginTop: 6 }]}>{blocked}</Text>;

  async function go(decision: "approved" | "rejected") {
    if (latch.current || stuck.isStuck()) return;
    const why = whyNotDecide(decision, note);
    if (why) { setSaid({ title: why, tone: "bad" }); return; }
    latch.current = true;
    setBusy(true);
    setSaid(null);
    try {
      await decide(code, approval!.id, decision, decision === "rejected" ? note.trim() : undefined);
      setRefusing(false);
      onDone({ title: doneWord(decision), tone: "ok" });
    } catch (e) {
      if (stuck.stop(e)) {
        const k = notKnown(decision === "approved" ? "approved" : "refused", "Approvals", e);
        setSaid({ title: k.title, body: k.body, tone: "held" });
        setRefusing(false);
      } else setSaid(saidOf(decision === "approved" ? "Not approved" : "Not refused", e));
    } finally {
      latch.current = false;
      setBusy(false);
      void cache.invalidateQueries({ queryKey: ["approvals", code] });
      void cache.invalidateQueries({ queryKey: ["equipment", code] });
    }
  }

  return (
    <View style={{ gap: 8, marginTop: 10 }}>
      {stuck.stuck ? null : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Btn label={approveLabel} busy={busy && !refusing} onPress={() => void go("approved")} />
          <Btn label="Refuse" disabled={busy} onPress={() => { setRefusing(true); setSaid(null); }} />
        </View>
      )}
      {stuck.stuck ? <Btn label="Open Approvals" onPress={() => router.push(`/approvals/${code}`)} style={{ alignSelf: "flex-start" }} /> : null}
      {!refusing ? <InDialog said={said} /> : null}
      {refusing ? (
        <Dialog title="Refuse it" description="Say why. The person who asked has to know what to do next." onClose={() => setRefusing(false)} busy={busy}>
          <Field label="Why" required>
            <Input label="Why" value={note} onChangeText={setNote} rows={3} autoFocus />
          </Field>
          <InDialog said={said} />
          <Foot>
            <Btn label="Cancel" grow tall disabled={busy} onPress={() => setRefusing(false)} />
            <Btn label="Refuse" variant="danger" grow tall busy={busy} disabled={!note.trim()} onPress={() => void go("rejected")} />
          </Foot>
          <Text style={[t.caption]}>It is decided in the one approvals inbox, the same as in Approvals.</Text>
        </Dialog>
      ) : null}
    </View>
  );
}
