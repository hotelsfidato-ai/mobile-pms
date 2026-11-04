import { useQueryClient } from "@tanstack/react-query";
import { Link2, Mail, MessageCircle, RotateCw, Star } from "lucide-react-native";
import { useRef, useState, type ReactNode } from "react";
import { Text, TextInput, View } from "react-native";
import { HeldError, outcomeUnknown, type Hotel } from "../../core/api";
import { c, face, space, t } from "../../core/theme";
import { Head, Screen, useRead } from "../../core/ui";
import { Btn, body, Failed, Loading, message, NotYours, saidOf, Stale, Toast, type Said } from "../guest-services/kit";
import { capsLabel, StatePill } from "../laundry/kit";
import { InfoButton } from "../reports/kit";
import { askForReview, isRefused, readReviews, saveLink } from "./data";
import { LINK_NOT_YOURS, NOTHING_SENT, REFUSED, whyNotView } from "./roles";
import {
  askedWords, askState, day, departuresNote, EMPTY_LINE, EMPTY_TITLE, LINK_NOTE, linkLine, moment, offerFor,
  savedWords, stayWords, TITLE, topNote, UNDER, unknownAsk, unknownLink, WROTE, WROTE_TITLE,
  type Channel, type Departure, type ReviewsPage,
} from "./rules";

/* ══════════════════════════════════════════════════════════════════
   REVIEWS on a phone — the web's /h/:code/reviews
   (src/modules/reputation/pages/Reviews.tsx; picture
   pms-shots/all/18-guests-crm-reviews, taken as dev-gm).

   Who was asked, who has not been, and what came back - and "what came
   back" is the state of the ASK: nothing is pulled in from Google,
   TripAdvisor or the booking sites (D18-14), so there is no score, no
   average, no source and no reply to draw, and the last card says so.

   Four cards, in the web's order: the sender not connected (or a test
   hotel's sentence), the review link, the departures of the last 30 days
   with each one's ask, and what guests wrote. Who may ask and set the link
   is the SERVER's answer in the read (`mayAsk`, `maySetLink`).

   AN ASK LEAVES THE HOTEL - a WhatsApp or an email to the guest - and its
   route reads no key. So the ways are latched at the tap (MEMORY 8), and
   when nobody knows whether it went (outcomeUnknown: nothing came back, or
   a 5xx) the screen says so and no way takes a tap until the list has been
   read again (MEMORY 16). The web, like the phone, asks without a dialog.
   ══════════════════════════════════════════════════════════════════ */

export function Reviews({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const test = Boolean(hotel.testOf);
  const refusedRead = whyNotView(role);
  const key = ["reputation", code] as const;
  const cache = useQueryClient();
  const q = useRead(() => (refusedRead ? Promise.resolve(null) : readReviews(code)), key);
  const [said, setSaid] = useState<Said | null>(null);
  /* An ask nobody knows the end of: its words, and when, so only a read made after it lets go. */
  const [unknown, setUnknown] = useState<{ title: string; body: string; guest: string; at: number } | null>(null);
  const [pulled, setPulled] = useState(false);

  const refused = isRefused(q.data) ? q.data.refused : null;
  const page = q.data && !isRefused(q.data) ? q.data : null;

  /* Read again; a read that landed after the unknown ask lets the ways go, and says to look at the row. */
  const readAgain = async () => {
    await cache.refetchQueries({ queryKey: key, type: "active" });
    const state = cache.getQueryState(key);
    if (unknown && state && !state.error && state.dataUpdatedAt > unknown.at) {
      setSaid({ title: "The list is read again", body: `${unknown.guest}'s row says whether they were asked.`, tone: "ok" });
      setUnknown(null);
    }
  };

  if (refusedRead || refused) {
    return (
      <Screen refreshing={false} onRefresh={q.reload}>
        <Head title={TITLE} under={UNDER} />
        <NotYours title={TITLE} sentence={refusedRead ?? refused!} />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); void readAgain(); }}>
        <Head title={TITLE} under={UNDER} />
        {page === null ? (
          q.error ? <Failed title="Reviews did not load" error={q.error} onRetry={q.reload} /> : <Loading words="Reading the reviews…" />
        ) : (
          <>
            <Stale error={q.error} />
            <Body
              code={code} page={page} test={test} unknown={unknown} setSaid={setSaid}
              /* Said where the tap was too: the card that holds the ways sits at the top of the list. */
              onUnknown={(u) => { setUnknown({ ...u, at: Date.now() }); setSaid({ title: u.title, body: u.body, tone: "bad" }); }}
              onReadAgain={() => void readAgain()}
              refresh={() => void cache.invalidateQueries({ queryKey: key })}
            />
          </>
        )}
      </Screen>
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}

function Body({ code, page, test, unknown, setSaid, onUnknown, onReadAgain, refresh }: {
  code: string; page: ReviewsPage; test: boolean; unknown: { title: string; body: string } | null;
  setSaid: (s: Said) => void; onUnknown: (u: { title: string; body: string; guest: string }) => void;
  onReadAgain: () => void; refresh: () => void;
}) {
  /* What is typed; null until a key is pressed, so Save waits for a change (the web's `typed`). */
  const [typed, setTyped] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  /* One tap, one write: the state reaches the button a frame late (MEMORY 8). */
  const latch = useRef(false);
  const note = topNote(page, test, NOTHING_SENT);

  const refusal = (e: unknown): Said => (e instanceof HeldError ? saidOf("", e) : { title: message(e), tone: "bad" });

  const save = async (url: string) => {
    if (latch.current) return;
    latch.current = true;
    setSaving(true);
    try {
      await saveLink(code, url);
      setSaid({ title: savedWords(url), tone: "ok" });
      setTyped(null);
      refresh();
    } catch (e) {
      /* The server keeps one row per property, so a repeat is harmless: said, and read again. */
      if (outcomeUnknown(e)) { setSaid({ ...unknownLink(url, message(e)), tone: "bad" }); refresh(); }
      else setSaid(refusal(e));
    } finally {
      latch.current = false;
      setSaving(false);
    }
  };

  const ask = async (row: Departure, channel: Channel) => {
    if (latch.current || unknown) return;
    latch.current = true;
    setSending(`${row.id}:${channel}`);
    try {
      await askForReview(code, row.id, channel);
      setSaid({ title: askedWords(row.guest), tone: "ok" });
      refresh();
    } catch (e) {
      if (outcomeUnknown(e)) onUnknown({ ...unknownAsk(row.guest, message(e)), guest: row.guest });
      else setSaid(refusal(e));
    } finally {
      latch.current = false;
      setSending(null);
    }
  };

  const held = sending !== null || unknown !== null;

  return (
    <>
      {note ? (
        <Section>
          <Text style={[body, { color: c.grey700 }]}>{note}</Text>
        </Section>
      ) : null}

      {/* ── the link ── */}
      <Section title="The review link" note={LINK_NOTE}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", columnGap: 8, rowGap: 4 }}>
          <Text style={[body, { color: c.grey500 }]}>This property sends:</Text>
          <Text style={[body, page.link === null ? { color: c.grey500 } : { color: c.ink900, flexShrink: 1 }]}>{page.link ?? "-"}</Text>
        </View>
        <Text style={page.link === null ? [body, { color: c.grey700 }] : [t.caption, { lineHeight: 17 }]}>{linkLine(page)}</Text>
        {page.maySetLink ? (
          <View style={{ gap: 8 }}>
            <View style={{ gap: 6 }}>
              <Text style={[t.label, { color: c.grey700 }]} nativeID="review-link">Paste the link</Text>
              {/* NO PLACEHOLDER THAT LOOKS LIKE A LINK: somebody would copy it out to a guest (the web's). */}
              <TextInput
                value={typed ?? page.link ?? ""} onChangeText={setTyped} accessibilityLabel="Paste the link" accessibilityLabelledBy="review-link"
                keyboardType="url" autoCapitalize="none" autoCorrect={false} editable={!saving}
                style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, backgroundColor: c.white, fontSize: 16, color: c.ink900, ...face[500] }}
              />
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Btn label="Save the link" variant="primary" icon={Link2} disabled={typed === null || saving} onPress={() => void save(typed ?? page.link ?? "")} />
              {page.link !== null ? <Btn label="Clear it" variant="ghost" disabled={saving} onPress={() => void save("")} /> : null}
            </View>
          </View>
        ) : (
          <Text style={[body, { color: c.grey700 }]}>{LINK_NOT_YOURS}</Text>
        )}
      </Section>

      {/* ── who was asked, who has not been ── */}
      <Section title="Departures" note={departuresNote(page.daysBack)} flush>
        {/* The web draws no way and says nothing to a role that may not ask; the phone says the API's sentence (AGENTS rule 1). */}
        {!page.mayAsk ? (
          <Text style={[t.caption, { color: c.grey600, lineHeight: 17, paddingHorizontal: space.cardX, paddingTop: 12 }]}>{REFUSED.ask}</Text>
        ) : null}
        {unknown ? (
          <View accessibilityRole="alert" style={{ margin: space.cardX, marginBottom: 0, padding: 12, gap: 8, borderRadius: 8, backgroundColor: c.red50 }}>
            <Text style={[t.label, { color: c.red700, ...face[600] }]}>{unknown.title}</Text>
            <Text style={[t.caption, { color: c.grey700, lineHeight: 17 }]}>{unknown.body}</Text>
            <Btn label="Read the list again" icon={RotateCw} onPress={onReadAgain} style={{ alignSelf: "flex-start" }} />
          </View>
        ) : null}
        {page.departures.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.grey100, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Star size={20} color={c.grey400} />
            </View>
            <Text style={[t.heading, { textAlign: "center" }]}>{EMPTY_TITLE}</Text>
            <Text style={[t.label, { color: c.grey500, marginTop: 6, textAlign: "center", lineHeight: 23 }]}>{EMPTY_LINE}</Text>
          </View>
        ) : (
          page.departures.map((r, i) => (
            <DepartureRow
              key={r.id} row={r} first={i === 0} sending={sending}
              offer={offerFor(r, page, test, held)} onAsk={(ch) => void ask(r, ch)}
            />
          ))
        )}
      </Section>

      {/* ── what came back ── */}
      <Section title={WROTE_TITLE}>
        <Text style={[body, { color: c.grey700 }]}>{WROTE}</Text>
      </Section>
    </>
  );
}

/** One departure: the DataTable's phone card - the guest and reference, then its labelled lines. */
function DepartureRow({ row, first, offer, sending, onAsk }: {
  row: Departure; first: boolean; offer: ReturnType<typeof offerFor>; sending: string | null; onAsk: (ch: Channel) => void;
}) {
  const state = askState(row);
  return (
    <View style={{ paddingHorizontal: space.cardX, paddingVertical: 12, borderTopWidth: first ? 0 : 1, borderTopColor: c.grey100 }}>
      <Text style={[body, { color: c.ink900 }]}>{row.guest}</Text>
      <Text style={[t.caption, t.tab, { lineHeight: 17 }]}>{row.reference}</Text>
      <View style={{ marginTop: 6, gap: 4 }}>
        <Fact label="Left">{day(row.departed)}</Fact>
        <Fact label="Stay">{stayWords(row)}</Fact>
        <Fact label="Review asked">
          {state ? <StatePill tone={state.tone}>{state.label}</StatePill> : <Text style={[body, { color: c.grey500 }]}>-</Text>}
          {row.askedAt ? <Text style={[t.caption, { lineHeight: 17, marginTop: 2 }]}>{moment(row.askedAt)}</Text> : null}
          {row.askStatus === "failed" && row.askDetail ? <Text style={[t.caption, { lineHeight: 17, marginTop: 2, color: c.red700 }]}>{row.askDetail}</Text> : null}
        </Fact>
        {offer.kind === "group" ? (
          <Fact label=""><Text style={[t.caption, { lineHeight: 17 }]}>{offer.words}</Text></Fact>
        ) : offer.kind === "ways" ? (
          <Fact label="">
            {/* A way is on only where the booking carries an address for it (the web's). */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Btn
                label={sending === `${row.id}:whatsapp` ? "Sending…" : "WhatsApp"} a11y={`Ask ${row.guest} for a review by WhatsApp`}
                icon={MessageCircle} disabled={!offer.whatsapp} onPress={() => onAsk("whatsapp")}
              />
              <Btn
                label={sending === `${row.id}:email` ? "Sending…" : "Email"} a11y={`Ask ${row.guest} for a review by email`}
                icon={Mail} disabled={!offer.email} onPress={() => onAsk("email")}
              />
            </View>
          </Fact>
        ) : null}
      </View>
    </View>
  );
}

/** The card's dl line: a 104 px label column in small capitals (the laundry kit's capsLabel), 12 between. */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <Text style={[capsLabel, { width: 104, paddingTop: 2 }]}>{label}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        {typeof children === "string" ? <Text style={[body, t.tab, { color: c.ink900 }]}>{children}</Text> : children}
      </View>
    </View>
  );
}

/** Card.tsx: CardHeader (px-4 py-3.5, a grey-200 line under it, the title and its (i)) and CardBody (px-4 py-3.5, 12 between). */
function Section({ title, note, flush, children }: { title?: string; note?: string; flush?: boolean; children: ReactNode }) {
  return (
    <View style={{ backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.grey200, overflow: "hidden" }}>
      {title ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: space.cardX, paddingVertical: space.cardY, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
          <Text style={[t.heading, { lineHeight: 24 }]} accessibilityRole="header">{title}</Text>
          {note ? <View style={{ marginLeft: -10 }}><InfoButton words={note} /></View> : null}
        </View>
      ) : null}
      <View style={flush ? undefined : { paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 12 }}>{children}</View>
    </View>
  );
}
