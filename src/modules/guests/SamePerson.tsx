import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Combine, RotateCw, Undo2, Users } from "lucide-react-native";
import { useRef, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { HeldError, outcomeUnknown, type Hotel } from "../../core/api";
import { c, face, space, t } from "../../core/theme";
import { Screen, useRead } from "../../core/ui";
import { PageHead, Pill } from "../front-desk/kit";
import { body, Btn, Failed, Loading, message, NotYours, saidOf, Stale, Toast, type Said } from "../guest-services/kit";
import { Blank, Exports, Panel } from "../leads/kit";
import { whyNotGuest360 } from "./roles";
import {
  apartSaid, apartTail, contactLine, countWords, EMPTY, joinedSaid, joinStrip, joinTail, NO_APART, NO_JOINS, onlyIdWords,
  onlyWithId, otherOf, pairsTable, sharedWords, sideLine, sideState, TITLE, UNDER, UNDO_APART_SAID, UNDO_JOIN_SAID, unknownWords,
  type GuestCard, type SamePersonPair,
} from "./samePersonRules";
import {
  isRefused, joinGuests, readJoins, readNotSame, readPairs, sayNotSame, undoJoin, undoNotSame,
} from "./samePersonData";

/* ══════════════════════════════════════════════════════════════════
   POSSIBLE SAME PERSON on a phone — the web's /crm/same-person
   (src/modules/crm/pages/SamePerson.tsx; picture
   pms-shots/all/20-guests-crm-possible-same-person, dev-gm). mobile/m13-sales.

   Every two guest records that share a phone or an email, for a manager to
   judge: join them into one, or say they are two people. NEVER AUTOMATIC
   (D21-2): nothing is kept until the manager presses "Keep this record" on
   one side, and the join is a second press, under the sentence saying whose
   stays move - the web's own guard; the web asks nothing more, and every
   join and every "not the same person" is undone below (D21-20, D22-8).
   Where only one record has an ID on file, that one stands and the other
   cannot be chosen; the ID itself never reaches the phone.

   For the owner, an administrator and a GM (people.ts MANAGERS_ONLY): the
   server's sentence for anyone else, nothing read. None of the four writes
   reads a key: one tap is one write (a latch), and an outcome nobody knows
   stops every button until the lists are read again (MEMORY 8, 16).
   ══════════════════════════════════════════════════════════════════ */

export function SamePerson({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const refusedRead = whyNotGuest360(role);
  const key = ["guests", code, "same-person"] as const;
  const cache = useQueryClient();
  const none = () => Promise.resolve(null);
  const pairs = useRead(() => (refusedRead ? none() : readPairs(code)), [...key, "pairs"]);
  const joins = useRead(() => (refusedRead ? none() : readJoins(code)), [...key, "joins"]);
  const apart = useRead(() => (refusedRead ? none() : readNotSame(code)), [...key, "not-same"]);
  const [said, setSaid] = useState<Said | null>(null);
  const [pulled, setPulled] = useState(false);
  /* One write at a time, latched at the tap (the state reaches a button a frame late). */
  const latch = useRef(false);
  const [busy, setBusy] = useState<string | null>(null);
  /* A write nobody knows the end of: only a read made after it lets the buttons go. */
  const [unknown, setUnknown] = useState<{ title: string; body: string; at: number } | null>(null);

  const refused = [pairs.data, joins.data, apart.data].find(isRefused);
  const list = Array.isArray(pairs.data) ? pairs.data : null;
  const joinList = Array.isArray(joins.data) ? joins.data : null;
  const apartList = Array.isArray(apart.data) ? apart.data : null;

  const readAgain = async () => {
    await cache.refetchQueries({ queryKey: key, type: "active" });
    const ok = (["pairs", "joins", "not-same"] as const).every((k) => {
      const st = cache.getQueryState([...key, k]);
      return st && !st.error && unknown && st.dataUpdatedAt > unknown.at;
    });
    if (unknown && ok) {
      setUnknown(null);
      setSaid({ title: "The lists are read again", body: "Joined and Not the same person show what was done.", tone: "ok" });
    }
  };

  /** One write: latched, said as the web's toast, the lists read again; an unknown outcome stops the screen. */
  const act = async (id: string, what: string, write: () => Promise<unknown>, done: { title: string; body: string }, notDone: string) => {
    if (latch.current || unknown) return;
    latch.current = true;
    setBusy(id);
    try {
      await write();
      setSaid({ ...done, tone: "ok" });
      void cache.invalidateQueries({ queryKey: key });
    } catch (e) {
      if (outcomeUnknown(e)) {
        const w = unknownWords(what);
        setUnknown({ title: w.title, body: `${message(e)} ${w.body}`, at: Date.now() });
        setSaid({ title: w.title, body: w.body, tone: "bad" });
      } else setSaid(e instanceof HeldError ? saidOf(notDone, e) : { title: notDone, body: message(e), tone: "bad" });
    } finally {
      latch.current = false;
      setBusy(null);
    }
  };

  if (refusedRead || refused) {
    return (
      <Screen refreshing={false} onRefresh={pairs.reload}>
        <PageHead title={TITLE} description={UNDER} />
        <NotYours title={TITLE} sentence={refusedRead ?? (refused as { refused: string }).refused} />
      </Screen>
    );
  }

  const stopped = busy !== null || unknown !== null;
  const open = (id: string) => router.push(`/guests/${code}/find/${id}`);

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && pairs.loading} onRefresh={() => { setPulled(true); void readAgain(); }}>
        <PageHead title={TITLE} description={UNDER} pill={list ? <Pill tone="neutral">{countWords(list.length)}</Pill> : undefined}>
          <Exports role={role} holds="guests" table={list ? pairsTable(list) : null} />
        </PageHead>

        {unknown ? (
          <View accessibilityRole="alert" style={{ padding: 12, gap: 8, borderRadius: 12, backgroundColor: c.red50 }}>
            <Text style={[t.label, { color: c.red700, ...face[600] }]}>{unknown.title}</Text>
            <Text style={[t.caption, { color: c.grey700, lineHeight: 17 }]}>{unknown.body}</Text>
            <Btn label="Read the lists again" icon={RotateCw} onPress={() => void readAgain()} style={{ alignSelf: "flex-start" }} />
          </View>
        ) : null}

        {list === null ? (
          pairs.error ? <Failed title="Could not read the list" error={pairs.error} onRetry={pairs.reload} /> : <Loading words="Reading the records…" />
        ) : (
          <>
            <Stale error={pairs.error} />
            {list.length === 0 ? (
              <Panel flush><Blank compact icon={Users} title={EMPTY.title} line={EMPTY.line} /></Panel>
            ) : list.map((p) => (
              <PairCard
                key={`${p.a.id}-${p.b.id}`} pair={p} stopped={stopped} busy={busy} onOpen={open}
                onApart={() => void act(`apart:${p.a.id}-${p.b.id}`, `${p.a.name} and ${p.b.name} were kept apart`,
                  () => sayNotSame(code, p.a.id, p.b.id), apartSaid(p), "Not recorded")}
                onJoin={(kept, other) => void act(`join:${p.a.id}-${p.b.id}`, `${other.name} was joined into ${kept.name}`,
                  () => joinGuests(code, kept.id, other.id), joinedSaid(kept, other), "Not joined")}
              />
            ))}
          </>
        )}

        {/* ── Joined: each with its undo ── */}
        <Text style={[t.heading, { marginTop: space.section - space.card }]} accessibilityRole="header">Joined</Text>
        {joinList === null ? (
          joins.error ? <Failed title="Could not read the joins" error={joins.error} onRetry={joins.reload} /> : <Loading words="Reading the joins…" />
        ) : joinList.length === 0 ? (
          <Text style={[body, { color: c.grey500 }]}>{NO_JOINS}</Text>
        ) : (
          <Panel flush>
            {joinList.map((j, i) => (
              <Item key={j.id} first={i === 0}>
                <Text style={[body, { color: c.ink900 }]}>
                  <NameLink name={j.joinedName} plain /> joined into <NameLink name={j.keptName} onPress={() => open(j.keptId)} />
                  <Text style={{ color: c.grey500 }}>{joinTail(j)}</Text>
                </Text>
                <Btn
                  label={busy === `undo:${j.id}` ? "Undoing…" : "Undo"} a11y={`Undo the join of ${j.joinedName} into ${j.keptName}`}
                  icon={Undo2} disabled={stopped} style={{ alignSelf: "flex-start" }}
                  onPress={() => void act(`undo:${j.id}`, `the join of ${j.joinedName} was undone`, () => undoJoin(code, j.id),
                    { title: "Undone", body: UNDO_JOIN_SAID }, "Not undone")}
                />
              </Item>
            ))}
          </Panel>
        )}

        {/* ── Not the same person: each with its undo ── */}
        <Text style={[t.heading, { marginTop: space.section - space.card }]} accessibilityRole="header">Not the same person</Text>
        {apartList === null ? (
          apart.error ? <Failed title="Could not read the answers" error={apart.error} onRetry={apart.reload} /> : <Loading words="Reading the answers…" />
        ) : apartList.length === 0 ? (
          <Text style={[body, { color: c.grey500 }]}>{NO_APART}</Text>
        ) : (
          <Panel flush>
            {apartList.map((n, i) => (
              <Item key={n.id} first={i === 0}>
                <Text style={[body, { color: c.ink900 }]}>
                  <NameLink name={n.aName} onPress={() => open(n.aId)} /> and <NameLink name={n.bName} onPress={() => open(n.bId)} /> are two people
                  <Text style={{ color: c.grey500 }}>{apartTail(n)}</Text>
                </Text>
                <Btn
                  label={busy === `undo:${n.id}` ? "Undoing…" : "Undo"} a11y={`Undo: ${n.aName} and ${n.bName} are two people`}
                  icon={Undo2} disabled={stopped} style={{ alignSelf: "flex-start" }}
                  onPress={() => void act(`undo:${n.id}`, "the answer was undone", () => undoNotSame(code, n.id),
                    { title: "Undone", body: UNDO_APART_SAID }, "Not undone")}
                />
              </Item>
            ))}
          </Panel>
        )}
      </Screen>
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}

function PairCard({ pair, stopped, busy, onOpen, onApart, onJoin }: {
  pair: SamePersonPair; stopped: boolean; busy: string | null; onOpen: (id: string) => void;
  onApart: () => void; onJoin: (kept: GuestCard, other: GuestCard) => void;
}) {
  const only = onlyWithId(pair);
  /* Nothing is chosen for the manager, except the one record that holds the only ID. */
  const [kept, setKept] = useState<GuestCard | null>(only);
  const other = otherOf(pair, kept);
  const joining = busy === `join:${pair.a.id}-${pair.b.id}`;
  return (
    <Panel>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <Text style={[body, { flex: 1, minWidth: 120, color: c.grey600 }]}>{sharedWords(pair)}</Text>
        <Btn label="Not the same person" a11y={`${pair.a.name} and ${pair.b.name} are not the same person`} disabled={stopped} onPress={onApart} />
      </View>
      {[pair.a, pair.b].map((g) => {
        const s = sideState(g, kept, only);
        return (
          <View key={g.id} style={{ borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, gap: 6, borderWidth: s.chosen ? 2 : 1, borderColor: s.chosen ? c.orange : c.grey200 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <Text style={[body]}><NameLink name={g.name} onPress={() => onOpen(g.id)} /></Text>
              {g.isVip ? <Pill tone="accent">VIP</Pill> : null}
              {g.isBlacklisted ? <Pill tone="danger">Blacklisted</Pill> : null}
            </View>
            <Text style={[body, t.tab, { color: c.grey600 }]}>{contactLine(g)}</Text>
            <Text style={[body, { color: c.grey600 }]}>{sideLine(g)}</Text>
            <Btn
              label={s.label} a11y={`${s.label}: ${g.name}`} disabled={s.locked || s.chosen || stopped}
              onPress={() => setKept(g)} style={{ alignSelf: "flex-start", marginTop: 6 }}
            />
          </View>
        );
      })}
      {only ? <Text style={[body, { color: c.grey600 }]}>{onlyIdWords(only)}</Text> : null}
      {kept && other ? (
        /* A tinted strip, not a card in the card: the sentence is the web's guard before the join. */
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12, borderRadius: 8, backgroundColor: c.grey50, paddingHorizontal: 14, paddingVertical: 12 }}>
          <Text style={[body, { flex: 1, minWidth: 160, color: c.ink900 }]}>{joinStrip(kept, other)}</Text>
          <Btn
            label={joining ? "Joining…" : "Join into one"} a11y={`Join ${other.name} into ${kept.name}`} icon={Combine}
            variant="primary" disabled={stopped} onPress={() => onJoin(kept, other)}
          />
        </View>
      ) : null}
    </Panel>
  );
}

/** The web's LINK: orange-700, medium; a name with no page of its own (the joined record) is plain. */
function NameLink({ name, onPress, plain }: { name: string; onPress?: () => void; plain?: boolean }) {
  if (plain || !onPress) return <Text style={{ ...face[500] }}>{name}</Text>;
  return (
    <Text onPress={onPress} accessibilityRole="link" accessibilityLabel={`Open ${name} in Guest 360`} suppressHighlighting style={{ color: c.orange700, ...face[500] }}>
      {name}
    </Text>
  );
}

function Item({ first, children }: { first: boolean; children: ReactNode }) {
  return (
    <View style={{ paddingHorizontal: space.cardX, paddingVertical: 12, gap: 10, minHeight: 56, borderTopWidth: first ? 0 : 1, borderTopColor: c.grey100 }}>
      {children}
    </View>
  );
}
