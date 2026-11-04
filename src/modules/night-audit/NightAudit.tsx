import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { AlertTriangle, ArrowRight, Check, MoonStar } from "lucide-react-native";
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ApiError, HeldError, type Hotel } from "../../core/api";
import { DASH, dateLong } from "../../core/format";
import { useSession } from "../../core/session";
import { ON_THE_WEBSITE, phoneRoute } from "../../core/menu";
import { c, face, space, t } from "../../core/theme";
import { Card, Screen, useRead } from "../../core/ui";
import {
  TICK, alreadyMade, closeWords, closedDaysNote, dateTime, dayPills, dayRows, dayYear, earlyWords, firstCorrectable,
  headPill, lastRunWords, mayConfirm, openOf, recordLine, resultLines, runBody, stops, undoLines,
  type AuditCheck, type ClosedDay, type NightAuditResult, type NightAuditState,
} from "./audit";
import { closeDay, readChecklist, readClosedDays, readUndos } from "./data";
import { Area, Btn, Dialog, Empty, Failed, Field, IconChip, Pill, Stale, Tick, body, small } from "./kit";
import { mayClose, mayCorrect, whyNotRead } from "./roles";

/* ══════════════════════════════════════════════════════════════════
   NIGHT AUDIT on a phone — the web's /h/:code/night-audit
   (src/modules/night-audit/pages/NightAudit.tsx; picture
   pms-shots/all/49-reports-night-audit, the GM on 31 Oct).
   The checklist is the server's (checklist.ts); whether the day may close
   is the server's too (`canRun`, the same blockersFor POST /run refuses
   with), so the grey button and the refusal cannot disagree. Run opens the
   web's window (D27-117, D27-389): the day, today's date and the last
   audit, the 16 hours' reason when asked, a box to tick. Close sends the
   day the screen SHOWS (NA-2), once per tap (MEMORY 8), refused offline
   with the web's sentence. Every figure after it is the server's.
   ══════════════════════════════════════════════════════════════════ */

const MEANS = "Closes the hotel's day: posts one night's room charge for every guest in house, marks arrivals who never came as no-shows, and moves the business date on."; // src/lib/glossary.ts nightAudit

type Failure = { message: string; record: ClosedDay | null };

export function NightAudit({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const { refresh } = useSession();
  const code = hotel.code;
  const cache = useQueryClient();
  const refused = whyNotRead(role);
  const closer = mayClose(role);

  const list = useRead(() => (refused ? Promise.resolve(null) : readChecklist(code)), ["night-audit", code, "checklist"]);
  const days = useRead(() => (refused ? Promise.resolve([]) : readClosedDays(code)), ["night-audit", code, "runs"]);
  const undos = useRead(() => (refused ? Promise.resolve([]) : readUndos(code)), ["night-audit", code, "undos"]);

  /* The checklist as it stood when Run was tapped: the window draws and sends
     THAT day, so a re-read underneath (another desk closed it, a held change
     sent) never turns it into a day nobody checked (the review of 4 Nov, N-2). */
  const [confirming, setConfirming] = useState<NightAuditState | null>(null);
  const [ticked, setTicked] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  /* One tap, one close (MEMORY 8): latched before the first await. */
  const latch = useRef(false);
  const [result, setResult] = useState<NightAuditResult | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [pulled, setPulled] = useState(false);
  const [explained, setExplained] = useState(false);

  async function close(state: NightAuditState) {
    if (latch.current) return;
    latch.current = true;
    setBusy(true);
    setConfirming(null);
    setFailure(null);
    setResult(null);
    const sent = runBody(state, reason);
    try {
      const r = await closeDay(code, sent);
      setResult(r);
      /* The business date has MOVED: the person's hotels first (every
         screen takes its day from them), then every read on this phone, which
         was for the old day (NightAudit.tsx 97-108; N-1). */
      await refresh();
      await cache.invalidateQueries();
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      /* A day already closed (409, D17-12): its record, read again. */
      const runs = status === 409
        ? await cache.fetchQuery({ queryKey: ["night-audit", code, "runs"], queryFn: () => readClosedDays(code), staleTime: 0 }).catch(() => undefined)
        : undefined;
      setFailure({
        /* The night audit is never held (core offline.ts refuses it); said as held if a tier ever changes. */
        message: e instanceof HeldError || e instanceof Error ? e.message : "The day was not closed. Nothing was changed.",
        record: alreadyMade(status, sent.businessDate, runs),
      });
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }

  const reload = () => { setPulled(true); list.reload(); days.reload(); undos.reload(); };
  const data = list.data ?? null;
  const pill = data ? headPill(data.checks) : null;

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && list.loading} onRefresh={reload}>
        {/* PageHeader: the title, the pill beside it, the line under. */}
        <View style={{ gap: 4, marginBottom: space.section - space.card }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 10, rowGap: 4 }}>
            <Text style={t.title} accessibilityRole="header">Night audit</Text>
            {pill ? <Pill tone={pill.tone}>{pill.words}</Pill> : null}
          </View>
          <Text style={[body, { color: c.grey500 }]}>
            The{" "}
            <Text
              onPress={() => setExplained(!explained)} accessibilityRole="button" accessibilityHint={MEANS} suppressHighlighting
              style={{ textDecorationLine: "underline", textDecorationStyle: "dotted" }}
            >night audit</Text>
            {data ? ` is closing ${dateLong(data.businessDate)} and opening ${dateLong(data.nextBusinessDate)}.` : " closes the business date."}
          </Text>
          {explained ? <Text style={[small, { color: c.grey600 }]}>{MEANS}</Text> : null}
        </View>

        {refused ? (
          <Card><Empty title="Night audit" description={refused} /></Card>
        ) : list.data === undefined && !list.error ? (
          <Text style={t.label} accessibilityLiveRegion="polite">Reading the pre-flight checks…</Text>
        ) : !data ? (
          <Card>
            <Failed
              title="The pre-flight checks did not run" description="Do not close the date on an unread checklist. Try again."
              error={list.error ?? "No such property."} onRetry={list.reload}
            />
          </Card>
        ) : (
          <>
            <Stale error={list.error} />
            <Card style={{ paddingVertical: 0 }}>
              {data.checks.map((x, i) => <CheckRow key={x.id} x={x} code={code} first={i === 0} />)}
            </Card>

            <Card style={{ gap: 16 }}>
              <IconChip Icon={MoonStar} />
              <View style={{ gap: 2 }}>
                <Text style={[body, { color: c.ink900 }]}>Run the audit and roll to {dateLong(data.nextBusinessDate)}</Text>
                {/* Each blocking item, with its reason and what it names. */}
                {stops(data.canRun).map((b, i) => (
                  <View key={i} style={{ gap: 2 }}>
                    <Text style={[body, { color: c.grey600 }]}>{b.reason}</Text>
                    {b.rooms.map((room) => <Text key={room} style={[small, { color: c.grey500, paddingLeft: 12 }]}>{room}</Text>)}
                  </View>
                ))}
                <Text style={[small, { marginTop: 6 }]}>{lastRunWords(data.lastRun)}</Text>
              </View>
              {/* Shown disabled with the reason above, never hidden - except from a
                  role that may never close the day (the web's D27-305). */}
              {closer ? (
                <Btn
                  label={busy ? "Closing the day…" : "Run night audit"} variant="primary" style={{ alignSelf: "flex-start" }}
                  a11y={data.canRun.allowed ? "Run night audit" : `Run night audit. ${data.canRun.reason ?? ""}`}
                  disabled={!data.canRun.allowed || busy}
                  onPress={() => { setTicked(false); setReason(""); setConfirming(data); }}
                />
              ) : null}
            </Card>

            {failure?.record ? (
              /* Not a failure: the day IS closed. Said, and shown. */
              <Card style={{ gap: 6 }}>
                <Text style={[body, { color: c.ink900 }]}>{failure.message}</Text>
                <Text style={[body, { color: c.grey600 }]}>Nothing was run again. The record that was made:</Text>
                <Text style={[body, t.tab, { color: c.grey600 }]}>{recordLine(failure.record)}</Text>
              </Card>
            ) : failure ? (
              <Card style={{ backgroundColor: c.red50, borderColor: c.red100 }}>
                <Text style={[body, { color: c.red700 }]} accessibilityRole="alert">{failure.message}</Text>
              </Card>
            ) : null}

            {result?.ok ? <Closed r={result} /> : null}

            {confirming ? (() => { const shot = confirming; return (
              <Dialog title={`Close ${dateLong(shot.businessDate)}?`} onClose={() => setConfirming(null)}>
                <View style={{ gap: 6 }}>
                  <Fact label="Closing" value={dateLong(shot.businessDate)} />
                  <Fact label="Today at the hotel" value={shot.calendarDate ? dateLong(shot.calendarDate) : DASH} />
                  <Fact label="Last audit" value={shot.lastCompletedAt ? dateTime(shot.lastCompletedAt) : "never"} />
                </View>
                {shot.early ? (
                  <Text style={[body, {
                    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
                    ...(shot.early.may === "warning" ? { backgroundColor: c.red50, color: c.red700, ...face[600] } : { backgroundColor: c.yellow50, color: c.yellow800 }),
                  }]}>{earlyWords(shot.early)}</Text>
                ) : null}
                {shot.early ? (
                  <Field label="Why now" required><Area label="Why now" value={reason} onChangeText={setReason} maxLength={500} /></Field>
                ) : null}
                <Text style={[body, { color: c.grey700 }]}>{closeWords(shot)}</Text>
                <Tick on={ticked} onChange={setTicked} label={TICK} />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Btn label="Cancel" grow onPress={() => setConfirming(null)} />
                  <Btn
                    label={`Close ${dayYear(shot.businessDate)}`} variant="primary" grow
                    disabled={!mayConfirm(shot, ticked, reason) || busy} onPress={() => void close(shot)}
                  />
                </View>
              </Dialog>
            ); })()
            : null}
          </>
        )}

        {/* Closed days: outside the checklist's branches, as the web - a
            history that loaded is worth reading when the checklist did not. */}
        {refused ? null : (
          <Card style={{ paddingHorizontal: 0, paddingVertical: 0 }}>
            <View style={{ paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 4 }}>
              <Text style={t.heading} accessibilityRole="header">Closed days</Text>
              <Text style={[body, { color: c.grey600 }]}>{closedDaysNote(mayCorrect(role), firstCorrectable(data?.businessDate))}</Text>
            </View>
            {days.data === undefined ? (
              days.error
                ? <Failed title="Closed days did not load" error={days.error} onRetry={days.reload} />
                : <Text style={[t.label, { paddingHorizontal: space.cardX, paddingBottom: space.cardY }]}>Reading the closed days…</Text>
            ) : days.data.length === 0 ? (
              <Empty title="No day closed yet" description="Each night audit adds its day here: who ran it, the rooms and revenue it posted, and the no-shows." />
            ) : (
              <>
                {days.error ? <View style={{ paddingHorizontal: space.cardX, paddingBottom: 8 }}><Stale error={days.error} /></View> : null}
                {days.data.map((d) => <DayCard key={d.businessDate} d={d} corrector={mayCorrect(role)} />)}
              </>
            )}
          </Card>
        )}

        {/* Cancelled audits (D27-390): only when there are any. */}
        {!refused && (undos.data ?? []).length > 0 ? (
          <Card style={{ paddingVertical: 0 }}>
            <View style={{ paddingVertical: space.cardY, gap: 4 }}>
              <Text style={t.heading} accessibilityRole="header">Cancelled audits</Text>
              <Text style={[body, { color: c.grey600 }]}>Night audits the owner or an administrator cancelled, newest first, with the reason given.</Text>
            </View>
            {undos.data!.map((u) => {
              const [head, line] = undoLines(u);
              return (
                <View key={u.id} style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.grey100 }}>
                  <Text style={[body, { color: c.ink900 }]}>{head}</Text>
                  <Text style={[body, { color: c.grey600, marginTop: 2 }]}>{line}</Text>
                </View>
              );
            })}
          </Card>
        ) : null}
      </Screen>
    </View>
  );
}

/* One check: the chip, the label and its count, the detail, and Open. */
function CheckRow({ x, code, first }: { x: AuditCheck; code: string; first: boolean }) {
  const ok = x.state === "ok";
  const open = openOf(x, (to) => phoneRoute(to, code));
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14, paddingVertical: 12, minHeight: 56, ...(first ? null : { borderTopWidth: 1, borderTopColor: c.grey100 }) }}>
      <View style={{ marginTop: 2 }}><IconChip Icon={ok ? Check : AlertTriangle} tone={ok ? "green" : "yellow"} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[body, { color: c.ink900 }]}>
          {x.label}{"  "}
          <Text style={[t.tab, { ...face[600], color: ok ? c.grey500 : c.yellow800 }]}>{x.count}</Text>
        </Text>
        <Text style={[body, { color: c.grey600, marginTop: 2 }]}>{x.detail}</Text>
        {open && !open.route ? <Text style={[small, { marginTop: 4 }]}>Open: {ON_THE_WEBSITE}</Text> : null}
      </View>
      {open?.route ? (
        <Pressable
          onPress={() => router.push(open.route as never)} accessibilityRole="link" accessibilityLabel={`Open ${x.label}`}
          style={{ minHeight: 44, marginTop: -11, flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <Text style={[body, { color: c.orange700 }]}>Open</Text>
          <ArrowRight size={14} color={c.orange700} />
        </Pressable>
      ) : null}
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 16 }}>
      <Text style={[body, { color: c.grey600, width: 128 }]}>{label}</Text>
      <Text style={[body, { color: c.ink900, flex: 1 }]}>{value}</Text>
    </View>
  );
}

/* The green card: what the run did, the restaurant's day as read, the two drawers. */
function Closed({ r }: { r: NightAuditResult }) {
  const w = resultLines(r);
  const green = { color: c.success600 };
  return (
    <Card style={{ backgroundColor: c.success50, borderColor: c.success100, gap: 6 }}>
      <Text style={[body, green]} accessibilityRole="alert">{w.head}</Text>
      <Text style={[small, green]}>{w.posted}</Text>
      {w.restaurant.length ? (
        <View style={{ borderTopWidth: 1, borderTopColor: c.success100, paddingTop: 8, marginTop: 2, gap: 2 }}>
          {w.restaurant.map((line, i) => <Text key={i} style={[small, green]}>{line}</Text>)}
        </View>
      ) : null}
      {w.drawers.length ? (
        <View style={{ borderTopWidth: 1, borderTopColor: c.success100, paddingTop: 8, marginTop: 2, gap: 8 }}>
          {w.drawers.map((d) => (
            <View key={d.label}>
              <Text style={[small, green, face[600]]}>{d.label}</Text>
              <Text style={[small, green, t.tab]}>{d.line}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

/* A closed day as the web's phone card lists it (DataTable.tsx 152-190). */
function DayCard({ d, corrector }: { d: ClosedDay; corrector: boolean }) {
  const corrected = (d.corrections ?? 0) > 0;
  /* Correct (the owner, an administrator, the GM) or, for anybody else on a
     corrected day, Corrections: the correction panel is on the website for now. */
  const act = corrector ? "Correct" : corrected ? "Corrections" : null;
  return (
    <View style={{ paddingHorizontal: space.cardX, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.grey100 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <Text style={{ fontSize: 16, lineHeight: 24, color: c.ink900, ...face[500] }}>{dayYear(d.businessDate)}</Text>
        {dayPills(d).map((p) => <Pill key={p.words} tone={p.tone}>{p.words}</Pill>)}
      </View>
      <View style={{ marginTop: 6, gap: 4 }}>
        {dayRows(d).map((row) => (
          <View key={row.label} style={{ flexDirection: "row", gap: 12 }}>
            <Text style={[small, { width: 104, paddingTop: 2, letterSpacing: 0.4, textTransform: "uppercase" }]}>{row.label}</Text>
            <Text style={[t.tab, { flex: 1, fontSize: 16, lineHeight: 24, color: c.ink900, ...face[500] }]}>{row.value}</Text>
          </View>
        ))}
        {act ? (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ width: 104 }} />
            <View style={{ flex: 1, gap: 4, alignItems: "flex-start" }}>
              <Btn label={act} a11y={`${act} ${dayYear(d.businessDate)}. ${ON_THE_WEBSITE}`} disabled onPress={() => undefined} />
              <Text style={small}>{ON_THE_WEBSITE}</Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
