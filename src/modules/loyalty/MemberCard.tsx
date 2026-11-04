import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Text, View } from "react-native";
import { outcomeUnknown } from "../../core/api";
import { c, face, space, t } from "../../core/theme";
import { Btn, body, Field, InDialog, Loading, message, saidOf, type Said } from "../guest-services/kit";
import { LoadFailed } from "../laundry/kit";
import { adjust, isRefused, leave, readCard } from "./data";
import { LCard, Typed } from "./kit";
import { adjustOf, dayOf, lineWords, memberLine, pointsText, signed, signedDigits } from "./loyalty";

/* ══════════════════════════════════════════════════════════════════
   THE MEMBER CARD — the web's src/modules/loyalty/MemberCard.tsx (D27-179,
   L6), the loyalty module's one export: Guest 360 places it, after "Every
   stay, at every hotel" (the web's MODULE.md, Requests). The owner, an
   administrator and the GM see a member's points and every line of their
   statement, at every hotel, and may add or take points with a reason, or
   take them out of the programme (L5). Joining is the desk's, on Loyalty.
   Not pictured (the web's card was never placed on its Guest 360, so no
   picture holds it): built from the web's code, its words and order.

   ADJUST moves points, which are rupees off a bill, and its route reads no
   key (R-30): one tap is one write (latched), and when the outcome is
   unknown the figure is emptied, it says so, and Adjust takes no more taps
   until the card has been read again after it (MEMORY 16). A figure the
   server did not send is a dash; a blank is never 0.
   ══════════════════════════════════════════════════════════════════ */

export function MemberCard({ code, guestId }: { code: string; guestId: string }) {
  const cache = useQueryClient();
  const card = useQuery({ queryKey: ["loyalty", code, "card", guestId], queryFn: () => readCard(code, guestId) });
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const latch = useRef(false);
  /* When an unknown outcome stopped Adjust: it starts again once a read of the card lands after it. */
  const [stuckAt, setStuckAt] = useState<number | null>(null);
  const [said, setSaid] = useState<Said | null>(null);
  const stuck = stuckAt !== null && card.dataUpdatedAt <= stuckAt;
  const reread = () => cache.invalidateQueries({ queryKey: ["loyalty"] });

  async function act(write: () => Promise<unknown>, done: string, fail: string, unknown: string) {
    if (latch.current || stuck) return;
    latch.current = true;
    setSaid(null);
    setBusy(true);
    try {
      await write();
      setSaid({ title: done, tone: "ok" });
      setPoints(""); setReason(""); setLeaving(false);
    } catch (e) {
      if (outcomeUnknown(e)) {
        setPoints("");
        setStuckAt(Date.now());
        setSaid({ title: unknown, body: `${message(e)} The card is read again: look at the statement before trying again.`, tone: "bad" });
      } else setSaid(saidOf(fail, e));
    } finally {
      void reread();
      latch.current = false;
      setBusy(false);
    }
  }

  if (card.data === undefined) {
    return (
      <LCard title="Loyalty">
        {card.error
          ? <LoadFailed title="The card did not load" error={card.error.message} onRetry={() => void card.refetch()} offline="This device is offline, so the card cannot load. It loads by itself as soon as the connection is back." />
          : <Loading words="Reading the card…" />}
      </LCard>
    );
  }
  if (isRefused(card.data)) {
    return <LCard title="Loyalty"><Text style={[body, { color: c.grey600 }]}>{card.data.refused}</Text></LCard>;
  }

  const m = card.data;
  const n = adjustOf(points, reason);
  return (
    <LCard
      title="Loyalty" description={memberLine(m)}
      action={m.member ? <Text style={[t.heading, t.tab, { ...face[600] }]}>{`${pointsText(m.points)} points`}</Text> : undefined}
    >
      {m.statement.length === 0 ? (
        <Text style={[body, { color: c.grey500 }]}>No points yet.</Text>
      ) : (
        <View style={{ marginVertical: -12 }}>
          {m.statement.map((l, i) => (
            <View key={l.id} style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", columnGap: 12, rowGap: 2, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.grey100 }}>
              <Text style={[body, t.tab, { color: c.grey600 }]}>{dayOf(l.at)}</Text>
              <Text style={[body, { flex: 1, minWidth: 120, color: c.ink900 }]}>{lineWords(l)}</Text>
              <Text style={[body, t.tab, { ...face[500] }, l.undone ? { color: c.grey400, textDecorationLine: "line-through" } : { color: c.ink900 }]}>
                {signed(l.points)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {m.member ? (
        <View style={{ gap: 12, borderTopWidth: 1, borderTopColor: c.grey100, paddingTop: 16, marginTop: m.statement.length === 0 ? 0 : 12 }}>
          <Field label="Points" hint="Minus to take">
            <Typed label="Points" value={points} onChangeText={(v) => setPoints(signedDigits(v))} keyboard="numbers-and-punctuation" />
          </Field>
          <Field label="Reason" hint="Stays on the statement">
            <Typed label="Reason" value={reason} onChangeText={setReason} />
          </Field>
          <InDialog said={said} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Btn
              label={busy && !leaving ? "Adjusting…" : "Adjust"} disabled={busy || stuck || n === null}
              onPress={() => n !== null && void act(() => adjust(code, guestId, n, reason), "Points adjusted", "Not done", "Not known whether the points were adjusted")}
            />
            <Btn label="Leave" variant="ghost" disabled={busy || stuck} onPress={() => setLeaving(true)} />
          </View>
          {leaving ? (
            <View style={{ gap: 8, borderRadius: 8, backgroundColor: c.grey50, paddingHorizontal: 14, paddingVertical: 12 }}>
              <Text style={[body, { color: c.ink900 }]}>{`Their ${pointsText(m.points)} points lapse. Their history stays with the bills.`}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
                <Btn label="Cancel" onPress={() => setLeaving(false)} />
                <Btn
                  label={busy ? "Leaving…" : "Leave loyalty"} variant="danger" disabled={busy || stuck}
                  onPress={() => void act(() => leave(code, guestId), "Left the programme", "Not done", "Not known whether they left")}
                />
              </View>
            </View>
          ) : null}
        </View>
      ) : said ? <View style={{ paddingTop: space.tile }}><InDialog said={said} /></View> : null}
    </LCard>
  );
}
