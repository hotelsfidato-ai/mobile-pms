import { MessageSquareHeart } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, t } from "../../core/theme";
import { Head, Screen, useRead } from "../../core/ui";
import { Pill } from "../front-desk/kit";
import { body, Failed, Loading, NotYours, Stale } from "../guest-services/kit";
import { Blank, Exports, Line, Panel, RowCard } from "../leads/kit";
import {
  answerRef, answersTable, FAILED, LATEST_EMPTY, LATEST_TITLE, latestNote, MONTHS_EMPTY, MONTHS_NOTE, MONTHS_TITLE, monthWords, OFF,
  overallTone, overallWords, PART_WORD, PARTS, partsLine, score, TITLE, UNDER, whyNotFeedback,
} from "./feedbackRules";
import { isRefused, readFeedback } from "./feedbackData";
import { moment } from "./rules";

/* ══════════════════════════════════════════════════════════════════
   GUEST FEEDBACK on a phone — the web's /h/:code/feedback
   (src/modules/reputation/pages/Feedback.tsx, new in the 16 Nov release;
   not pictured: the 31 Oct pictures were taken before it). mobile/m13-sales.

   What guests answered on their own page after check-out: a card when the
   hotel is not asking, the scores by month and the latest answers with
   their comments. For the owner, an administrator and the GM (the server's
   FEEDBACK_ROLES): anyone else reads the server's sentence, nothing read.
   Every figure is the server's (its averages, rounded by it); a part
   nobody scored is a dash. Read only; no poll (the web's does not).
   ══════════════════════════════════════════════════════════════════ */

export function Feedback({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const refusedRead = whyNotFeedback(role);
  const q = useRead(() => (refusedRead ? Promise.resolve(null) : readFeedback(code)), ["reputation", code, "feedback"]);
  const [pulled, setPulled] = useState(false);
  const refused = isRefused(q.data) ? q.data.refused : null;
  const page = q.data && !isRefused(q.data) ? q.data : null;

  if (refusedRead || refused) {
    return (
      <Screen refreshing={false} onRefresh={q.reload}>
        <Head title={TITLE} under={UNDER} />
        <NotYours title={TITLE} sentence={refusedRead ?? refused!} />
      </Screen>
    );
  }

  return (
    <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
      <Head title={TITLE} under={UNDER} />
      <Exports role={role} holds="guests" table={page ? answersTable(page) : null} />
      {page === null ? (
        q.error ? <Failed title={FAILED} error={q.error} onRetry={q.reload} /> : <Loading words="Reading the answers…" />
      ) : (
        <>
          <Stale error={q.error} />
          {!page.on ? <Panel><Text style={[body, { color: c.grey700 }]}>{OFF}</Text></Panel> : null}

          <Panel title={MONTHS_TITLE} note={MONTHS_NOTE} flush>
            {page.months.length === 0 ? (
              <Blank compact icon={MessageSquareHeart} title={MONTHS_EMPTY.title} line={MONTHS_EMPTY.line} />
            ) : page.months.map((m, i) => (
              <RowCard key={m.month} first={i === 0} heading={monthWords(m.month)}>
                <Line label="Answers">{String(m.answers)}</Line>
                <Line label="Overall">{score(m.overall)}</Line>
                {PARTS.map((p) => <Line key={p} label={PART_WORD[p]}>{score(m[p])}</Line>)}
                <Line label="Low (1-2)">
                  {/* A count: none is a real 0; some are red (the web's). */}
                  <Text style={[body, t.tab, { color: m.low ? c.red700 : c.ink900 }]}>{String(m.low)}</Text>
                </Line>
              </RowCard>
            ))}
          </Panel>

          <Panel title={LATEST_TITLE} note={latestNote(page.latest)} flush>
            {page.answers.length === 0 ? (
              <Blank compact icon={MessageSquareHeart} title={LATEST_EMPTY.title} line={LATEST_EMPTY.line} />
            ) : page.answers.map((a, i) => (
              <RowCard
                key={a.id} first={i === 0}
                heading={(
                  <View>
                    <Text style={[body, { color: c.ink900 }]}>{a.guest}</Text>
                    <Text style={[t.caption, t.tab, { lineHeight: 17 }]}>{answerRef(a)}</Text>
                    <Text style={[t.caption, { lineHeight: 17 }]}>{moment(a.answeredAt)}</Text>
                  </View>
                )}
              >
                <Line label="Overall"><View style={{ alignSelf: "flex-start" }}><Pill tone={overallTone(a)}>{overallWords(a)}</Pill></View></Line>
                <Line label="The parts"><Text style={[body, t.tab, { color: c.grey600 }]}>{partsLine(a)}</Text></Line>
                <Line label="Comment">
                  {a.comment
                    ? <Text style={[body, { color: c.ink900 }]}>{a.comment}</Text>
                    : <Text style={[body, { color: c.grey500 }]}>-</Text>}
                </Line>
              </RowCard>
            ))}
          </Panel>
        </>
      )}
    </Screen>
  );
}
