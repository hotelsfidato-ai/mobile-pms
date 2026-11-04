import { useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, face, space, t } from "../../core/theme";
import { Head, Screen, useRead } from "../../core/ui";
import { stayedWords } from "../front-desk/desk";
import { Pill } from "../front-desk/kit";
import { Back, body, Box, Btn, Empty, Field, Input, Loading, NotYours, saidOf, Stale, Toast, type Said } from "../guest-services/kit";
import { dayOf, rupees } from "../laundry/docket";
import { LoadFailed } from "../laundry/kit";
import {
  blacklist, clearBlacklist, clearNoOffers, isRefused, readGuest360, readOffersYes, recordNoOffers, recordOffersYes,
} from "./data";
import { FigureLine, Line, Panel } from "./kit";
import {
  agreed, contactLine, joinedLine, noOffersWords, offersWords, sentWords, stayDates, stayWord, whoLine, type Guest360,
} from "./lookup";
import { ON_THE_WEBSITE, whyNotGuest360 } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   ONE GUEST, ACROSS THE GROUP, on a phone — the web's /crm/guests/:id
   (src/modules/crm/pages/Guest360.tsx Guest360Page, BlacklistCard,
   NoOffersCard). For the owner, an administrator and the GM (D21-4). Its
   cards in the web's order at phone width: who they are, what they are
   worth, every stay at every hotel, loyalty, what was sent to them, the
   blacklist, offers. Not pictured (the picture is the search's empty page).

   READ ONLY, except the two things the owner gave these three, which the
   web's phone view does in place and the phone does the web's way: the
   blacklist with its reason, set and cleared (D21-21), and offers - their
   yes, "no offers", a "no" cleared (D25-39, D21-22). Each is one write per
   tap, latched; refused offline with the web's sentence (send()); the
   server's refusal in its own words. Edit guest (a form of its own) and
   the loyalty card (the loyalty module's) stay on the website.

   An ID document never reaches the phone: only whether one is on file.
   ══════════════════════════════════════════════════════════════════ */

export function Guest({ hotel, role, id, onBack }: { hotel: Hotel; role: string | null; id: string; onBack: () => void }) {
  const code = hotel.code;
  const refused = whyNotGuest360(role);
  const cache = useQueryClient();
  const [pulled, setPulled] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);
  const whole = useRead(() => (refused ? Promise.resolve(null) : readGuest360(code, id)), ["guests", code, "guest", id]);
  const off = isRefused(whole.data) ? whole.data.refused : null;
  const g = whole.data && !isRefused(whole.data) ? whole.data : null;

  /* One tap, one write (MEMORY 8): latched at the tap, grey while it travels. */
  const latch = useRef(false);
  const [busy, setBusy] = useState(false);
  const act = useCallback(async (write: () => Promise<unknown>, done: string | null) => {
    if (latch.current) return false;
    latch.current = true;
    setBusy(true);
    try {
      await write();
      if (done) setSaid({ title: done, tone: "ok" });
      await cache.invalidateQueries({ queryKey: ["guests", code] });
      return true;
    } catch (e) {
      setSaid(saidOf("Not changed", e));
      return false;
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }, [cache, code]);

  const back = <Back onPress={onBack} />;
  if (refused || off) {
    return (
      <Screen refreshing={false} onRefresh={whole.reload}>
        <Head title="Guest 360" action={back} />
        <NotYours title="Guest 360" sentence={refused ?? off!} />
      </Screen>
    );
  }
  if (!g) {
    return (
      <Screen refreshing={pulled && whole.loading} onRefresh={() => { setPulled(true); whole.reload(); }}>
        <Head title="Guest 360" action={back} />
        {whole.data === null ? (
          <Box><Empty compact title="No such guest" description="The link may be old. Find them again by name, phone or email." /></Box>
        ) : whole.error ? (
          <LoadFailed
            title="The guest did not load" error={whole.error} onRetry={whole.reload}
            offline="This device is offline, so this guest cannot load. Open them again as soon as the connection is back."
          />
        ) : <Loading words="Reading the guest…" />}
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && whole.loading} onRefresh={() => { setPulled(true); whole.reload(); }}>
        <Head title="Guest 360" under={`${g.name} · ${stayedWords(g.visits)}`} action={back} />
        <Stale error={whole.error} />

        <Panel title="Who they are" action={<Btn label="Edit guest" a11y={`Edit guest: ${ON_THE_WEBSITE}`} disabled onPress={() => undefined} />}>
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <Text style={[t.heading, { lineHeight: 24 }]}>{g.name}</Text>
            {g.isVip ? <Pill tone="accent">VIP</Pill> : null}
            {g.isBlacklisted ? <Pill tone="danger">Blacklisted</Pill> : null}
          </View>
          <Text style={[body, t.tab, { color: c.grey600 }]}>{contactLine(g)}</Text>
          <Text style={[body, { color: c.grey600 }]}>{whoLine(g)}</Text>
          {joinedLine(g) ? (
            <Text style={[body, { color: c.grey500 }]}>
              {joinedLine(g)} <Text style={{ color: c.grey500, ...face[600] }}>Undo a join</Text>: {ON_THE_WEBSITE}.
            </Text>
          ) : null}
          <Text style={[t.caption, { color: c.grey600 }]}>Edit guest: {ON_THE_WEBSITE}</Text>
        </Panel>

        <Panel title="What they are worth">
          <View style={{ marginVertical: -6 }}>
            <FigureLine first label="Visits" value={String(g.visits)} />
            <FigureLine label="Nights" value={String(g.nights)} />
            <FigureLine label="Charged" value={rupees(g.charged)} />
            <FigureLine label="First stay" value={dayOf(g.firstStay)} />
            <FigureLine label="Last stay" value={dayOf(g.lastStay)} />
          </View>
        </Panel>

        <Panel title="Every stay, at every hotel" flush>
          {g.stays.length === 0 ? (
            <Empty compact title="No stays" description="A booking made for this guest appears here, whichever hotel it is at." />
          ) : g.stays.map((s, i) => (
            <View key={s.id} style={{ paddingHorizontal: space.cardX, paddingVertical: 12, gap: 4, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.grey100 }}>
              <Text style={[body, { color: c.ink900, marginBottom: 2 }]}>{s.hotelName}</Text>
              <Line label="Booking">{s.reference}</Line>
              <Line label="Dates">{stayDates(s)}</Line>
              <Line label="Room type">{s.roomType ?? "-"}</Line>
              <Line label="Booked via">{s.source ?? "-"}</Line>
              <Line label="Status">{stayWord(s.status)}</Line>
              <Line label="Charged">{rupees(s.charged)}</Line>
            </View>
          ))}
        </Panel>

        {/* The loyalty module's MemberCard (D27-179): its points, statement, Adjust and Leave. */}
        <Panel title="Loyalty">
          <Text style={[body, { color: c.grey600 }]}>{`The member card, its points and statement: ${ON_THE_WEBSITE}.`}</Text>
        </Panel>

        <Panel title="What was sent to them">
          {g.sent.length === 0 ? (
            <Text style={[body, { color: c.grey500 }]}>Nothing has been sent to this guest from any hotel.</Text>
          ) : (
            <View style={{ marginVertical: -6 }}>
              {g.sent.map((m, i) => {
                const w = sentWords(m);
                return (
                  <View key={`${m.at}-${i}`} style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 2, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.grey100 }}>
                    <Text style={[body, t.tab, { color: c.grey600 }]}>{w.day}</Text>
                    <Text style={[body, { color: c.ink900 }]}>{w.what}</Text>
                    <Text style={[body, { color: c.grey600 }]}>{w.how}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </Panel>

        <BlacklistCard g={g} busy={busy} act={act} code={code} />
        <OffersCard g={g} busy={busy} act={act} code={code} />
      </Screen>
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}

type Act = (write: () => Promise<unknown>, done: string | null) => Promise<boolean>;

/* D21-21: set with a reason, which the desk is shown at the next booking
   with this phone or email. A warning, never a refusal. */
function BlacklistCard({ g, busy, act, code }: { g: Guest360; busy: boolean; act: Act; code: string }) {
  const [reason, setReason] = useState("");
  return (
    <Panel title="Blacklist">
      {g.isBlacklisted ? (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
            <ShieldAlert size={16} color={c.red700} style={{ marginTop: 2 }} />
            <Text style={[body, { color: c.red700, flex: 1 }]}>
              {`Reason: ${g.blacklistReason ?? "-"}. The desk is warned when they book; it is not refused.`}
            </Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <Btn label="Clear the blacklist" disabled={busy} onPress={() => void act(() => clearBlacklist(code, g.id), "Blacklist cleared")} />
          </View>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <Field label="Reason" hint="The desk is shown this when they book again. It warns; it never refuses.">
            <Input label="Reason" value={reason} onChangeText={setReason} />
          </Field>
          <View style={{ flexDirection: "row" }}>
            <Btn
              label="Blacklist" variant="danger" disabled={busy || !reason.trim()}
              onPress={() => void act(() => blacklist(code, g.id, reason), "Blacklisted").then((ok) => { if (ok) setReason(""); })}
            />
          </View>
        </View>
      )}
    </Panel>
  );
}

/* D25-39 (opt-in) and D21-22: against the phone and email themselves, at
   every hotel. Offers go only to a yes; a later answer replaces an earlier
   one. The yes list is the managers' read (GET /crm/offers-yes): the phone
   only asks it whether this guest's phone or email is on it. */
function OffersCard({ g, busy, act, code }: { g: Guest360; busy: boolean; act: Act; code: string }) {
  const yes = useRead(() => readOffersYes(code), ["guests", code, "offers-yes"]);
  const a = agreed(yes.data, g);
  const contact = { phone: g.phone, email: g.email };
  return (
    <Panel title="Offers">
      <Text style={[body, { color: c.grey600 }]}>{offersWords(a)}</Text>
      {yes.error && !yes.data ? <Text style={[t.caption, { color: c.red700 }]} accessibilityRole="alert">{`Could not read who said yes: ${yes.error}`}</Text> : null}
      {g.noOffers.length > 0 ? (
        <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.grey100 }}>
          {g.noOffers.map((o, i) => (
            <View key={o.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.grey100 }}>
              <Text style={[body, t.tab, { flex: 1, color: c.ink900 }]}>{noOffersWords(o)}</Text>
              <Btn label="Clear" a11y={`Clear: ${noOffersWords(o)}`} disabled={busy} onPress={() => void act(() => clearNoOffers(code, o.id), null)} />
            </View>
          ))}
        </View>
      ) : null}
      {g.phone || g.email ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {a === false ? <Btn label="Record their yes" disabled={busy} onPress={() => void act(() => recordOffersYes(code, contact), null)} /> : null}
          <Btn label={"Record “no offers”"} disabled={busy} onPress={() => void act(() => recordNoOffers(code, contact), null)} />
        </View>
      ) : null}
    </Panel>
  );
}
