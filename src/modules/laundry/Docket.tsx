import { useQueryClient } from "@tanstack/react-query";
import { Ban, IndianRupee, Info, PackageCheck, Printer } from "lucide-react-native";
import { useRef, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { HeldError, type Hotel } from "../../core/api";
import { DASH } from "../../core/format";
import { c, face, space, t } from "../../core/theme";
import { Head, Screen, useRead } from "../../core/ui";
import {
  Back, Btn, body, Dialog, Foot, InDialog, Input, Loading, NotYours, Stale, Toast, message, saidOf, type Said,
} from "../guest-services/kit";
import { cancelDocket, chargeDocket, isRefused, readDocket, recordReturn } from "./data";
import {
  backWords, clockOf, collectedDay, lineParts, mayCancel, mayCharge, mayReturn, returnBody, rupees, SERVICE_WORDS,
  STATUS_TONE, STATUS_WORDS, unpricedWords, whoseWords, type DocketDetail,
} from "./docket";
import { LoadFailed, Note, StatePill } from "./kit";
import { ON_THE_WEBSITE, whyNotCancel, whyNotChange, whyNotCharge, whyNotRead } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   ONE DOCKET on a phone — the web's /h/:code/laundry/:id
   (src/modules/laundry/pages/Docket.tsx). Not pictured: built from the
   web's code. What is in the bag, what has come back, whose bill.

   Three acts, each one's condition the SERVER'S facts on the docket
   (docket.ts mayReturn, mayCancel, mayCharge): the web leaves a button out
   when the docket's state rules it out, and says why in a card (the
   hotel's own linen, a bag with no total, already on the bill); the phone
   does the same. A role the API refuses sees the button GREY with the
   API's sentence (roles.ts; AGENTS rule 1), where the web shows it and the
   server refuses.

   THE CHARGE IS NOT WRITTEN HERE: it is the laundry route, through
   finance's door, and the screen says what it answers. Refused offline
   with the web's sentence (no laundry path is on its list). One tap is one
   charge: latched at the tap, a keeper per docket (data.ts), and the
   server locks the docket and answers "already on the bill" to a second.
   ══════════════════════════════════════════════════════════════════ */

const NOT_IN_THIS_VERSION = "Not in this version: linen par levels per room type, an outside laundry's bills, express "
  + "surcharges, and a guest sending a bag from their own page.";

export function Docket({ hotel, role, id, collected, onBack }: {
  hotel: Hotel; role: string | null; id: string; collected?: string; onBack: () => void;
}) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refusedRead = whyNotRead(role);
  const [pulled, setPulled] = useState(false);
  const [returning, setReturning] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [charging, setCharging] = useState(false);
  const latch = useRef(false);
  const [noteOpen, setNoteOpen] = useState(false);
  /* The server's own sentence, kept on the screen: a refusal about money is something somebody acts on. */
  const [refusal, setRefusal] = useState<Said | null>(null);
  const [said, setSaid] = useState<Said | null>(collected ? { title: `${collected} is collected.`, tone: "ok" } : null);

  const q = useRead(() => (refusedRead ? Promise.resolve(null) : readDocket(code, id)), ["laundry", code, "docket", id]);
  const off = isRefused(q.data) ? q.data.refused : null;
  const d: DocketDetail | null = q.data && !isRefused(q.data) ? q.data : null;
  const refresh = () => void cache.invalidateQueries({ queryKey: ["laundry", code] });

  async function charge() {
    if (latch.current || !d) return;
    latch.current = true;
    setCharging(true);
    setRefusal(null);
    try {
      await chargeDocket(code, id);
      refresh();
      setSaid({ title: `${d.number} is on the room's bill as its own line.`, tone: "ok" });
    } catch (e) {
      setRefusal(e instanceof HeldError ? saidOf("", e) : { title: message(e), tone: "bad" });
    } finally {
      latch.current = false;
      setCharging(false);
    }
  }

  if (refusedRead || off) {
    return (
      <Screen refreshing={false} onRefresh={q.reload}>
        <Head title="Docket" action={<Back onPress={onBack} />} />
        <NotYours title="Laundry" sentence={refusedRead ?? off!} />
      </Screen>
    );
  }

  const why = { change: whyNotChange(role), charge: whyNotCharge(role), cancel: whyNotCancel(role) };
  const shown = d ? {
    ret: mayReturn(d), chg: mayCharge(d), can: mayCancel(d),
  } : null;
  /* Each refused act's sentence once, under the buttons. */
  const reasons = shown
    ? [...new Set([shown.ret && why.change, shown.chg && why.charge, shown.can && why.cancel].filter((x): x is string => Boolean(x)))]
    : [];

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        <Head title={d?.number ?? "Docket"} {...(d ? { under: whoseWords(d) } : {})} action={<Back onPress={onBack} />} />

        {d === null ? (
          q.error
            ? (
              <LoadFailed
                title="This docket did not load" error={q.error} onRetry={q.reload}
                offline="This device is offline, so this docket cannot load. It loads by itself as soon as the connection is back."
              />
            )
            : <Loading words="Reading the docket…" />
        ) : (
          <>
            <Stale error={q.error} />
            {/* The state beside the title, and the note that stood under the docket behind an (i) (D27-45, D27-82). */}
            <View style={{ gap: 6, marginTop: -8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <StatePill tone={STATUS_TONE[d.status]}>{STATUS_WORDS[d.status]}</StatePill>
                <Pressable
                  onPress={() => setNoteOpen(!noteOpen)} accessibilityRole="button" accessibilityLabel={NOT_IN_THIS_VERSION}
                  accessibilityState={{ expanded: noteOpen }}
                  style={{ width: 44, height: 44, marginVertical: -10, alignItems: "center", justifyContent: "center" }}
                >
                  <Info size={16} color={c.grey500} />
                </Pressable>
              </View>
              {noteOpen ? <Text style={[body, { color: c.grey600 }]}>{NOT_IN_THIS_VERSION}</Text> : null}
            </View>

            <View style={{ gap: 4 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {shown!.ret ? (
                  <Btn label="Record what came back" variant="primary" icon={PackageCheck} disabled={why.change != null} onPress={() => setReturning(true)} />
                ) : null}
                {shown!.chg ? (
                  <Btn
                    label={charging ? "Charging…" : "Charge to the room"} icon={IndianRupee}
                    disabled={why.charge != null || charging} onPress={() => void charge()}
                  />
                ) : null}
                <Btn label="Print" icon={Printer} disabled onPress={() => undefined} />
                {shown!.can ? (
                  <Btn label="Cancel" a11y={`Cancel ${d.number}`} variant="danger" icon={Ban} disabled={why.cancel != null} onPress={() => setCancelling(true)} />
                ) : null}
              </View>
              <Text style={[t.caption, { color: c.grey600 }]}>Print: {ON_THE_WEBSITE}</Text>
              {reasons.map((r) => <Text key={r} style={[t.caption, { color: c.grey600 }]}>{r}</Text>)}
            </View>

            <Sheet d={d} hotelName={hotel.name} />

            {d.belongsTo === "hotel" ? <Note title="The hotel's own linen">Counted out and back, never charged to anybody.</Note> : null}
            {unpricedWords(d) ? <Note>{unpricedWords(d)!}</Note> : null}
            {d.charged ? (
              <Note title="Already on the bill">
                It is its own line on the room's folio. A charge is reversed on the folio, never by cancelling the docket under it.
              </Note>
            ) : null}
            {/* The server's refusal in its own words; a held change (none of these paths is held today) is never said as one. */}
            {refusal ? (refusal.body ? <Note title={refusal.title}>{refusal.body}</Note> : <Note alert>{refusal.title}</Note>) : null}
          </>
        )}
      </Screen>

      {returning && d ? (
        <ReturnDialog
          code={code} d={d} onClose={() => setReturning(false)}
          onDone={(stillOut) => { setReturning(false); refresh(); setSaid({ title: backWords(stillOut), tone: "ok" }); }}
        />
      ) : null}
      {cancelling && d ? (
        <CancelDialog
          code={code} d={d} onClose={() => setCancelling(false)}
          onDone={() => { setCancelling(false); refresh(); setSaid({ title: `${d.number} is cancelled.`, tone: "ok" }); }}
          onRefused={(r) => { setCancelling(false); setRefusal(r); }}
        />
      ) : null}
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}

/* ── The docket, in the document's look (D27-52): the hotel and "Docket",
   its facts in the washed strip (two across on a phone), the lines over a
   2px ink rule on hairlines. ── */

const ink700 = "#142b3a"; // theme.css --color-ink-700
const accentFrom = "#fe611f"; // theme.css --color-accent-from
const docLabel = { fontSize: 12, lineHeight: 17, letterSpacing: 0.96, textTransform: "uppercase", color: c.grey500, ...face[700] } as const;

function Strip({ items }: { items: Array<{ label: string; value: string; strong?: boolean }> }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", borderRadius: 10, borderWidth: 1, borderColor: c.grey200, backgroundColor: c.grey50 }}>
      {items.map((f, i) => (
        <View key={f.label} style={{ width: "50%", paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: i > 1 ? 1 : 0, borderTopColor: c.grey200 }}>
          <Text style={docLabel}>{f.label}</Text>
          <Text style={[t.tab, {
            marginTop: 2, color: f.value === DASH ? c.grey500 : ink700,
            ...(f.strong ? { fontSize: 16, lineHeight: 24, ...face[700] } : { fontSize: 14, lineHeight: 21, ...face[600] }),
          }]}>{f.value}</Text>
        </View>
      ))}
    </View>
  );
}

function Cell({ children, grow, right }: { children: ReactNode; grow?: boolean; right?: boolean }) {
  return <View style={{ ...(grow ? { flex: 1, minWidth: 0 } : { width: 64 }), alignItems: right ? "flex-end" : "flex-start" }}>{children}</View>;
}

function Sheet({ d, hotelName }: { d: DocketDetail; hotelName: string }) {
  return (
    <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 12 }}>
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 20, lineHeight: 28, letterSpacing: -0.2, color: ink700, ...face[700] }}>{hotelName}</Text>
        <View style={{ borderLeftWidth: 4, borderLeftColor: accentFrom, paddingLeft: 10 }}>
          <Text style={{ fontSize: 16, lineHeight: 24, letterSpacing: 0.96, textTransform: "uppercase", color: ink700, ...face[700] }}>Docket</Text>
          <Text style={[t.caption, t.tab, { marginTop: 2 }]}>{d.number}</Text>
        </View>
      </View>

      {/* D18-5 first: it decides everything else on this screen. */}
      <Strip items={[
        { label: "Whose it is", value: whoseWords(d) },
        { label: "Stay", value: d.belongsTo === "hotel" ? "None - the hotel's own" : d.stayReference ?? DASH },
        { label: "Collected", value: d.collectedAt ? clockOf(d.collectedAt) : collectedDay(d) },
        { label: "Came back", value: d.returnedAt ? clockOf(d.returnedAt) : DASH },
      ]} />
      <Strip items={[
        { label: "Pieces", value: String(d.pieces) },
        { label: "Still out", value: String(d.stillOut) },
        { label: "Total", value: rupees(d.total), strong: true },
        { label: "On a bill", value: d.charged ? "Yes" : "No" },
      ]} />

      {d.notes ? <Text style={[body, { color: c.ink900 }]}>{d.notes}</Text> : null}

      <View>
        <View style={{ flexDirection: "row", gap: 8, paddingBottom: 6, borderBottomWidth: 2, borderBottomColor: ink700 }}>
          <Cell grow><Text style={docLabel}>What it is</Text></Cell>
          <Cell right><Text style={docLabel}>Went</Text></Cell>
          <Cell right><Text style={docLabel}>Back</Text></Cell>
          <Cell right><Text style={docLabel}>Each</Text></Cell>
        </View>
        {d.lines.map((l) => (
          <View key={l.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.grey200, gap: 2 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Cell grow>
                <Text style={[body, { color: c.ink900 }]}>
                  <Text style={face[600]}>{l.description}</Text>
                  <Text style={{ color: c.grey500 }}> · {SERVICE_WORDS[l.service]}</Text>
                </Text>
              </Cell>
              <Cell right><Text style={[body, t.tab, { color: ink700 }]}>{l.quantity}</Text></Cell>
              <Cell right><Text style={[body, t.tab, { color: ink700 }]}>{l.returnedQuantity}</Text></Cell>
              {/* Unpriced at collection stays unpriced: a dash, never 0, never blank. */}
              <Cell right><Text style={[body, t.tab, { color: l.unitPrice === null ? c.grey500 : ink700 }]}>{rupees(l.unitPrice)}</Text></Cell>
            </View>
            <Text style={[t.caption, t.tab, { textAlign: "right" }]}>Amount {lineParts(l)}</Text>
          </View>
        ))}
        <Text style={[t.caption, { marginTop: 8 }]}>
          A line's amount is its count times each. The total above is the server's: none while anything is not priced.
        </Text>
      </View>
    </View>
  );
}

/* ── What came back: counts in total, against what went out. Starts from
   what has already come back. The server marks the docket back. ── */
function ReturnDialog({ code, d, onClose, onDone }: { code: string; d: DocketDetail; onClose: () => void; onDone: (stillOut: number) => void }) {
  const [counts, setCounts] = useState<Record<string, string>>(Object.fromEntries(d.lines.map((l) => [l.id, String(l.returnedQuantity)])));
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const [said, setSaid] = useState<Said | null>(null);

  async function submit() {
    if (latch.current) return;
    setSaid(null);
    const out = returnBody(d.lines, counts);
    if ("problem" in out) { setSaid({ title: out.problem, tone: "bad" }); return; }
    latch.current = true;
    setBusy(true);
    try {
      const done = await recordReturn(code, d.id, out.body);
      onDone(done.data.stillOut);
    } catch (e) {
      setSaid(saidOf("Not recorded", e));
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }

  return (
    <Dialog title="Record what came back" onClose={onClose}>
      <Text style={[body, { color: c.grey600 }]}>
        How many of each have come back in total - not how many arrived this time. The docket closes itself when nothing is still out.
      </Text>
      {d.lines.map((l) => (
        <View key={l.id} style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[body, { color: c.ink900, ...face[500] }]}>{l.description}</Text>
            <Text style={[body, { color: c.grey500 }]}>{SERVICE_WORDS[l.service]} · {l.quantity} went out</Text>
          </View>
          <View style={{ width: 100 }}>
            <Input
              label={`How many ${l.description} have come back`} keyboardType="numbers-and-punctuation" maxLength={4}
              value={counts[l.id] ?? ""} onChangeText={(v) => setCounts((all) => ({ ...all, [l.id]: v }))}
            />
          </View>
        </View>
      ))}
      <InDialog said={said} />
      <Foot>
        <Btn label="Cancel" tall grow onPress={onClose} />
        <Btn label={busy ? "Recording…" : "Record it"} variant="primary" tall grow disabled={busy} onPress={() => void submit()} />
      </Foot>
    </Dialog>
  );
}

function CancelDialog({ code, d, onClose, onDone, onRefused }: {
  code: string; d: DocketDetail; onClose: () => void; onDone: () => void; onRefused: (r: Said) => void;
}) {
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);

  async function go() {
    if (latch.current) return;
    latch.current = true;
    setBusy(true);
    try {
      await cancelDocket(code, d.id);
      onDone();
    } catch (e) {
      /* The server's sentence, on the screen (the web closes the dialog and keeps it). */
      onRefused(e instanceof HeldError ? saidOf("", e) : { title: message(e), tone: "bad" });
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }

  return (
    <Dialog title={`Cancel ${d.number}?`} onClose={onClose}>
      <Text style={[body, { color: ink700 }]}>
        The docket stays on the record as cancelled - nothing is deleted. It cannot be cancelled once it is on a bill.
      </Text>
      <Foot>
        <Btn label="Leave it" tall grow onPress={onClose} />
        <Btn label={busy ? "Cancelling…" : "Cancel the docket"} variant="danger" tall grow disabled={busy} onPress={() => void go()} />
      </Foot>
    </Dialog>
  );
}
