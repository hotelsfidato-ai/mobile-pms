import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, face, t } from "../../core/theme";
import { Head, Screen, s as core, useRead } from "../../core/ui";
import { decide, listApprovals } from "./data";
import { Btn, Empty, Failed, Loading, Note, Pill, Segmented, Stale, Toast, body, saidOf, usePoll, type Said } from "./kit";
import { whyNotRead } from "./roles";
import {
  amountText, askedBy, askedWhen, blockedLine, decidedLine, doneWord, emptyOf, labelFor, reasonLine,
  statusTone, statusWord, whyNotDecide, type Approval, type Tab,
} from "./rules";

/* ══════════════════════════════════════════════════════════════════
   APPROVALS on a phone — the web's /h/:code/approvals (src/pages/
   Approvals.tsx; picture pms-shots/all/64-system-approvals, as dev-gm).
   One place to see everything waiting on you, from every part of the
   system: purchase requests, cash expenses, stock adjustments, equipment
   leaving the store or retired, and a waiter's NC, discount, strike or
   void (D27-363).

   IT ADDS NO SECOND WAY TO DECIDE. Approve and Refuse post to the one
   endpoint the equipment register and purchasing post to; the buttons are
   offered only where the server's row says `mayDecide`, and anywhere else
   its `blockedBecause` is the sentence (never hidden). The amount is the
   server's text. A decision is refused offline with the web's sentence.
   ══════════════════════════════════════════════════════════════════ */

export function Approvals({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refused = whyNotRead(role);
  const [tab, setTab] = useState<Tab>("pending");
  const [said, setSaid] = useState<Said | null>(null);
  const [pulled, setPulled] = useState(false);
  /* One function, so a re-read (every 15 s) does not restart the toast's clock. */
  const unsay = useCallback(() => setSaid(null), []);

  const list = useRead(() => (refused ? Promise.resolve(null) : listApprovals(code, tab)), ["approvals", code, tab]);
  /* A waiter waits at the table for the answer (D27-363): fresh every 15 seconds. */
  usePoll(["approvals", code], 15_000);
  const refresh = () => void cache.invalidateQueries({ queryKey: ["approvals", code] });

  const rows = list.data?.rows ?? [];
  const empty = emptyOf(tab);

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && list.loading} onRefresh={() => { setPulled(true); list.reload(); }}>
        <Head title="Approvals" under="Everything waiting at this hotel, from every part of the system." />
        {/* PageHeader: 16 between the line and the switch (gap-4), 20 under it (mb-5). */}
        <View style={{ marginTop: -4, marginBottom: 8 }}>
          <Segmented<Tab>
            label="Waiting or everything" value={tab} onChange={setTab}
            options={[{ value: "pending", label: "Waiting" }, { value: "all", label: "Everything" }]}
          />
        </View>

        {refused ? <Empty title="Approvals" description={refused} />
          : list.data === undefined
            ? (list.error ? <Failed error={list.error} onRetry={list.reload} /> : <Loading />)
            : list.data === null ? null
            : rows.length === 0 ? (
              <>
                <Stale error={list.error} />
                <Empty title={empty.title} description={empty.description} />
              </>
            ) : (
              <>
                <Stale error={list.error} />
                {rows.map((a) => <Row key={a.id} a={a} code={code} onSaid={setSaid} onDone={refresh} />)}
              </>
            )}
      </Screen>
      <Toast said={said} onClose={unsay} />
    </View>
  );
}

function Row({ a, code, onSaid, onDone }: { a: Approval; code: string; onSaid: (s: Said) => void; onDone: () => void }) {
  const amount = amountText(a.amount);
  const decided = decidedLine(a);
  return (
    <View style={core.card}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        {/* The web's title is a link to the request's own screen; the phone
            has none of those screens yet, so it is the kind's name alone. */}
        <Text style={[t.heading, { lineHeight: 24, flexShrink: 1 }]}>{labelFor(a.kind)}</Text>
        <Pill tone={statusTone(a.status)}>{statusWord(a.status)}</Pill>
      </View>

      {a.detail ? <Text style={[body, { color: c.ink900, marginTop: 4 }]}>{a.detail}</Text> : null}
      <Text style={[body, { color: c.grey700, marginTop: 4 }]}>{reasonLine(a)}</Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 16, rowGap: 2, marginTop: 8 }}>
        {/* NO INVENTED FIGURE: a stock adjustment has no amount, and nothing is drawn for it. */}
        {amount !== null ? <Text style={[body, t.tab, { color: c.grey700, ...face[500] }]}>{amount}</Text> : null}
        <Text style={[body, { color: c.grey500 }]}>{askedBy(a)}</Text>
        <Text style={[body, { color: c.grey500 }]}>{askedWhen(a.requestedAt)}</Text>
      </View>

      {decided ? <Text style={[body, { color: c.grey500, marginTop: 8 }]}>{decided}</Text> : null}

      {a.status === "pending" ? <Decide a={a} code={code} onSaid={onSaid} onDone={onDone} /> : null}
    </View>
  );
}

/* THE SAME SHAPE EQUIPMENT AND PURCHASING USE: the buttons only where the
   server's row says `mayDecide`; anywhere else its sentence. */
function Decide({ a, code, onSaid, onDone }: { a: Approval; code: string; onSaid: (s: Said) => void; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  /* One tap, one write (MEMORY 8): latched at the tap, before the state reaches the button. */
  const latch = useRef(false);
  const blocked = blockedLine(a);

  const rule = { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.grey100 };
  if (blocked) return <Text style={[body, { color: c.grey500 }, rule]}>{blocked}</Text>;

  async function go(decision: "approved" | "rejected") {
    if (latch.current) return;
    const why = whyNotDecide(decision, note);
    if (why) { onSaid({ title: why, tone: "bad" }); return; }
    latch.current = true;
    setBusy(true);
    try {
      await decide(code, a.id, decision, note.trim() || undefined);
      onSaid({ title: doneWord(decision), tone: "ok" });
    } catch (e) {
      /* The server's sentence; offline, the web's ("This cannot be done offline yet…"). */
      onSaid(saidOf(e));
    } finally {
      latch.current = false;
      setBusy(false);
      /* Read again either way: a reply lost after the server decided shows as decided. */
      onDone();
    }
  }

  const what = labelFor(a.kind).toLowerCase();
  return (
    <View style={rule}>
      <Note
        label="A note (required to refuse)" a11y={`A note on the ${what}, required to refuse`}
        placeholder="Why, in a sentence." value={note} onChangeText={setNote} editable={!busy}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        <Btn label="Approve" a11y={`Approve the ${what}`} disabled={busy} onPress={() => void go("approved")} />
        <Btn label="Refuse" a11y={`Refuse the ${what}`} disabled={busy} onPress={() => void go("rejected")} />
      </View>
    </View>
  );
}
