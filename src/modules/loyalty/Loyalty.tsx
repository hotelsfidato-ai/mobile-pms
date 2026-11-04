import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { outcomeUnknown, type Hotel } from "../../core/api";
import { c, face, space, t } from "../../core/theme";
import { Head, Screen, useRead } from "../../core/ui";
import { Btn, body, Empty, Field, InDialog, Loading, message, NotYours, saidOf, Stale, Toast, type Said } from "../guest-services/kit";
import { Fact, LoadFailed, Note } from "../laundry/kit";
import { Join, Leave, Spend } from "./Acts";
import { isRefused, readByHotel, readLoyalty, saveRules } from "./data";
import { LCard, Typed } from "./kit";
import {
  decimalOnly, inHouseNote, monthOfDate, monthWords, OFF_NOTE, pointsText, rateBody, rateText, rowActs, rulesLine,
  rupees, shiftMonth, type LoyaltyScreen, type LoyaltyStay,
} from "./loyalty";
import { MANAGERS_ONLY, mayJoin as mayJoinOf, RULES_REFUSED, whyNotRead } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   LOYALTY on a phone — the web's /h/:code/loyalty
   (src/modules/loyalty/pages/Loyalty.tsx; picture pms-shots/new/n-h-loyalty,
   dev-gm). Who is in house, whether each is a member and their points; the
   desk joins a guest who agrees in the programme's own words (L4), takes
   points off a member's room charges (L13), or a member leaves (L5). The
   rules card is for whoever sets the group's name; the month by hotel for
   the owner, an administrator and the GM (L18). A figure nobody set is a
   dash.

   WHERE THE WEB LEAVES A THING OUT FOR A ROLE, the phone draws it grey with
   the sentence (AGENTS rule 1): Join, Use points and Leave (the card's head
   says who may, in the web's words); the rules' fields and Save (the
   route's 403 sentence); Points by hotel (its MANAGERS_ONLY sentence, and
   nothing read). A STATE that rules one out leaves it out, as the web: no
   Use points on a booking site's or an agent's stay.
   ══════════════════════════════════════════════════════════════════ */

export function Loyalty({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const refusedRead = whyNotRead(role);
  const [pulled, setPulled] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);

  const q = useRead(() => (refusedRead ? Promise.resolve(null) : readLoyalty(code)), ["loyalty", code]);
  const off = isRefused(q.data) ? q.data.refused : null;
  const s = q.data && !isRefused(q.data) ? q.data : null;

  if (refusedRead || off) {
    return (
      <Screen refreshing={false} onRefresh={q.reload}>
        <Head title="Loyalty" />
        <NotYours title="Loyalty" sentence={refusedRead ?? off!} />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        <Head title="Loyalty" {...(s ? { under: rulesLine(s) } : {})} />
        {s === null ? (
          q.error
            ? (
              <LoadFailed
                title="Loyalty did not load" error={q.error} onRetry={q.reload}
                offline="This device is offline, so Loyalty cannot load. It loads by itself as soon as the connection is back."
              />
            )
            : <Loading words="Reading who is in house…" />
        ) : (
          <>
            <Stale error={q.error} />
            {!s.isOn ? <Note>{OFF_NOTE}</Note> : null}
            <InHouse code={code} screen={s} mayJoin={mayJoinOf(role)} onSaid={setSaid} />
            <Rules key={`${s.name ?? ""}|${s.pointsPer100 ?? ""}`} code={code} screen={s} onSaid={setSaid} />
            <ByHotel code={code} isManager={s.isManager} />
          </>
        )}
      </Screen>
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}

/* ── In house: a phone card per guest, as the web's DataTable at phone width ── */

function InHouse({ code, screen: s, mayJoin, onSaid }: {
  code: string; screen: LoyaltyScreen; mayJoin: boolean; onSaid: (said: Said) => void;
}) {
  const [joining, setJoining] = useState<LoyaltyStay | null>(null);
  const [spending, setSpending] = useState<LoyaltyStay | null>(null);
  const [leaving, setLeaving] = useState<LoyaltyStay | null>(null);
  const done = (said: Said) => { setJoining(null); setSpending(null); setLeaving(null); onSaid(said); };
  const open = { join: setJoining, spend: setSpending, leave: setLeaving };

  return (
    <LCard title="In house" description={inHouseNote(s.mayRedeem, mayJoin)} flush>
      {s.stays.length === 0 ? (
        <Empty compact title="Nobody is checked in" description="Guests in house appear here, to join or to use their points." />
      ) : s.stays.map((r, i) => (
        <View key={r.id} style={{ paddingHorizontal: space.cardX, paddingVertical: 14, gap: 6, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.grey100 }}>
          {/* DataTable's card heading: text-base (14 on 21), font-medium. */}
          <Text style={[body, t.tab, { color: c.ink900, ...face[500] }]}>{r.room ?? "-"}</Text>
          <Fact label="Guest">{r.name}</Fact>
          <Fact label="Points">
            {r.member
              ? <Text style={[body, t.tab, { color: c.ink900 }]}>{pointsText(r.points)}</Text>
              : <Text style={[body, { color: c.grey500 }]}>Not a member</Text>}
          </Fact>
          {/* The web's Buttons: Use points and Join secondary (its default), Leave ghost. */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 8 }}>
            {rowActs(r, s.mayRedeem, mayJoin).map((a) => (
              <Btn
                key={a.act} label={a.label} a11y={`${a.label}: ${r.name}`}
                variant={a.act === "leave" ? "ghost" : "secondary"}
                disabled={a.refused} onPress={() => open[a.act](r)}
              />
            ))}
          </View>
        </View>
      ))}
      {joining ? <Join code={code} stay={joining} words={s.words} onClose={() => setJoining(null)} onDone={done} /> : null}
      {spending ? <Spend code={code} stay={spending} onClose={() => setSpending(null)} onDone={done} /> : null}
      {leaving ? <Leave code={code} stay={leaving} onClose={() => setLeaving(null)} onDone={done} /> : null}
    </LCard>
  );
}

/* ── The rules: L1, L8 - group settings with no default. Empty rate: nothing earns. ── */

function Rules({ code, screen: s, onSaid }: { code: string; screen: LoyaltyScreen; onSaid: (said: Said) => void }) {
  const cache = useQueryClient();
  const [name, setName] = useState(s.name ?? "");
  const [rate, setRate] = useState(rateText(s.pointsPer100));
  const [busy, setBusy] = useState(false);
  const latch = useRef(false);
  const [said, setSaid] = useState<Said | null>(null);
  const may = s.maySetRules;

  async function submit() {
    if (latch.current || !may) return;
    latch.current = true;
    setSaid(null);
    setBusy(true);
    try {
      await saveRules(code, name, rateBody(rate));
      onSaid({ title: "Rules saved", tone: "ok" });
    } catch (e) {
      /* PUT sets both again: a repeat is the same rules. Said, and read again. */
      setSaid(outcomeUnknown(e)
        ? { title: "Not known whether the rules were saved", body: `${message(e)} They are read again: look at the line under Loyalty.`, tone: "bad" }
        : saidOf("Not done", e));
    } finally {
      void cache.invalidateQueries({ queryKey: ["loyalty"] });
      latch.current = false;
      setBusy(false);
    }
  }

  return (
    <LCard title="The rules" description="For every hotel of the group.">
      <Field label="Programme name" hint="The words a guest agrees to use it.">
        <Typed label="Programme name" value={name} onChangeText={setName} maxLength={40} editable={may} />
      </Field>
      <Field label="Points per ₹100" hint="Before GST. Empty: stays earn nothing.">
        <Typed label="Points per ₹100" value={rate} onChangeText={(v) => setRate(decimalOnly(v))} keyboard="decimal-pad" editable={may} />
      </Field>
      <InDialog said={said} />
      <View style={{ gap: 4, alignItems: "flex-start" }}>
        <Btn label={busy ? "Saving…" : "Save the rules"} disabled={busy || !may} onPress={() => void submit()} />
        {!may ? <Text style={[t.caption, { color: c.grey600 }]}>{RULES_REFUSED}</Text> : null}
      </View>
    </LCard>
  );
}

/* ── Points by hotel: L18, in rupees, so the owner can settle between hotels ── */

function ByHotel({ code, isManager }: { code: string; isManager: boolean }) {
  /* The web opens on the device's own month (isoDate(new Date()).slice(0, 7)). */
  const [month, setMonth] = useState(() => monthOfDate(new Date()));
  const q = useRead(() => (isManager ? readByHotel(code, month) : Promise.resolve(null)), ["loyalty", code, "by-hotel", month, isManager]);
  const refused = isRefused(q.data) ? q.data.refused : isManager ? null : MANAGERS_ONLY;
  const rows = Array.isArray(q.data) ? q.data : null;

  const step = (by: number, words: string, Icon: typeof ChevronLeft) => (
    <Pressable
      onPress={() => setMonth(shiftMonth(month, by))} accessibilityRole="button" accessibilityLabel={words}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: c.grey300, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? c.grey100 : c.white })}
    >
      <Icon size={16} color={c.grey700} />
    </Pressable>
  );

  return (
    <LCard title="Points by hotel" description="Earned and used in the month, 1 point = ₹1." flush>
      {refused ? (
        <Empty compact title="Not for your role" description={refused} />
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: space.cardX, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
            {step(-1, "Month before", ChevronLeft)}
            <Text style={[body, { flex: 1, textAlign: "center", color: c.ink900 }]} accessibilityLiveRegion="polite">{monthWords(month)}</Text>
            {step(1, "Month after", ChevronRight)}
          </View>
          {rows === null ? (
            q.error
              ? <View style={{ padding: space.cardX }}><LoadFailed title="Points by hotel did not load" error={q.error} onRetry={q.reload} offline="This device is offline, so the month cannot load. It loads by itself as soon as the connection is back." /></View>
              : <View style={{ padding: space.cardX }}><Loading words="Reading the month…" /></View>
          ) : rows.length === 0 ? (
            <Empty compact title="No points that month" description="Points earned or used at any hotel appear here." />
          ) : rows.map((r, i) => (
            <View key={r.hotelCode} style={{ paddingHorizontal: space.cardX, paddingVertical: 14, gap: 6, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.grey100 }}>
              <Text style={[body, { color: c.ink900, ...face[500] }]}>{r.hotelName}</Text>
              <Fact label="Points earned">{rupees(r.earned)}</Fact>
              <Fact label="Points used">{rupees(r.used)}</Fact>
            </View>
          ))}
          {rows !== null ? <View style={{ paddingHorizontal: space.cardX, paddingBottom: q.error ? 12 : 0 }}><Stale error={q.error} /></View> : null}
        </>
      )}
    </LCard>
  );
}
