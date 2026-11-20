import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Check, CheckCircle2, ChevronDown, Circle } from "lucide-react-native";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { ON_THE_WEBSITE, mayReach, phoneRoute, type Role } from "../../core/menu";
import { c, face, space, t } from "../../core/theme";
import { msAt } from "../../core/format";
import { s as core, ripple, shade } from "../../core/ui";
import { Btn, Pill, Toast, body, useSaid } from "../admin/kit";
import type { AdminProps } from "../admin/Route";
import { PageFrame, Read, StuckLine, refusedPage, usePage, useWrites, type Writes } from "./PropertyKit";
import { chooseStep, readSetup } from "./propertyData";
import {
  ON_A_FILE, REMIND_IN, SETUP_GROUPS, STATE_TONE, STEPS, addDays, dayCompact, deviceDay, doneIn, mayUndo, openStep, rowOf,
  stateText, stepInfo, summaryOf, type SetupStepInfo, type SetupStepState, type SetupView, type StepChoice, type StepId,
} from "./propertyRules";

/* ══════════════════════════════════════════════════════════════════
   SET UP THIS HOTEL on a phone — Settings → Property → Set up this hotel
   (the web's setup/SetupPage.tsx and steps.ts, the owner's D27-311;
   picture new/n-h-setup as dev-gm). The 18 steps from a bare hotel to its
   first booking, in the owner's order and three groups; each says what it
   is and why it matters, opens the REAL screen (the phone's, where it has
   one; greyed "On the website for now" where not; disabled with the web's
   sentence where the role cannot open it), and offers Completed, Next,
   Later, Remind me and Undo.

   NOTHING HERE DECIDES WHETHER A STEP IS DONE: the server derives it
   (GET /:code/setup, `setting` view, read again each time the page comes
   into view - staleTime 0 on the web); "Completed" is drawn only where
   nothing can be checked. PUT /:code/setup/:step (`room_config` edit and
   app.manages_hotel; the server's refusal in its own words). Nothing is
   switched on or locked by this page; step 18 is a summary.

   Differences: the reminder's own date is a date picker
   (@react-native-community/datetimepicker 9.1.0, not installed): greyed;
   Tomorrow, In 3 days and In a week are here. The web's "Back to setup"
   bar on the opened screen (?setup=) is not on the phone: Back returns
   here. Step 14's logo and photos are files: said on the step.
   ══════════════════════════════════════════════════════════════════ */

export function PropSetup({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const refused = refusedPage(role, "/settings/property/set-up-this-hotel", "Set up this hotel");
  const { said, say, close } = useSaid();
  const { q, stop } = usePage(code, "setup", () => (refused ? Promise.resolve(null) : readSetup(code)));
  const w = useWrites(stop, q.reload, say);
  const [pulled, setPulled] = useState(false);
  const asked = useLocalSearchParams<{ step?: string }>().step;
  const [chosen, setChosen] = useState<string | undefined>(asked);
  const view = q.data ?? undefined;
  /* The first step still to do, fixed once, so a choice made on the way does not move the page under the finger. */
  useEffect(() => { if (view && !stepInfo(chosen)) setChosen(openStep(view)); }, [view, chosen]);
  /* Asked again each time the page comes into view: a step ticks itself when the PMS sees it done. */
  const reload = q.reload;
  useFocusEffect(useCallback(() => { if (!refused) reload(); }, [refused]));
  const today = hotel.today || deviceDay();
  return (
    <View style={{ flex: 1 }}>
      <PageFrame title="Set up this hotel"
        under={`${hotel.name}. ${STEPS.length} steps from a new hotel to its first booking. A step ticks itself when the system can see it is done.`}
        refused={refused} refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        <Read q={q} what="the setup steps">
          {(v) => {
            if (!v) return null;
            const open = openStep(v, chosen);
            const choose = (id: StepId, choice: StepChoice, after?: () => void) =>
              w.write(() => chooseStep(code, id, choice), { ok: () => null, done: "saved", where: `step ${STEPS.find((s) => s.id === id)!.number}`, after });
            return (
              <>
                <StuckLine w={w} />
                {SETUP_GROUPS.map((group) => {
                  const steps = STEPS.filter((s) => s.group === group.key);
                  return (
                    <View key={group.key} style={{ gap: 8 }} accessibilityLabel={group.title}>
                      {group.key !== "summary" ? (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", columnGap: 10 }}>
                          <Text style={t.heading} accessibilityRole="header">{group.title}</Text>
                          <Text style={[t.label, t.tab, { color: c.grey500 }]}>{`${doneIn(v, group.key)} of ${steps.length} done`}</Text>
                        </View>
                      ) : null}
                      {group.note ? <Text style={[body, { color: c.grey600 }]}>{group.note}</Text> : null}
                      <View style={[core.card, { paddingHorizontal: 0, paddingVertical: 0, overflow: "hidden" }]}>
                        {steps.map((step, i) => (
                          <StepRow key={step.id} step={step} state={rowOf(v, step.id)} view={v} first={i === 0} code={code} role={role} today={today}
                            open={open === step.id} w={w} onOpen={() => setChosen(step.id)} onPick={setChosen} onChoose={choose}
                            onNext={() => { const next = STEPS[step.number]; if (next) setChosen(next.id); }} />
                        ))}
                      </View>
                    </View>
                  );
                })}
              </>
            );
          }}
        </Read>
      </PageFrame>
      <Toast said={said} onClose={close} />
    </View>
  );
}

function StepRow({ step, state, view, first, code, role, today, open, w, onOpen, onPick, onChoose, onNext }: {
  step: SetupStepInfo; state: SetupStepState; view: SetupView; first: boolean; code: string; role: Role; today: string; open: boolean; w: Writes;
  onOpen: () => void; onPick: (id: StepId) => void; onChoose: (id: StepId, c: StepChoice, after?: () => void) => Promise<void>; onNext: () => void;
}) {
  const summary = step.id === "go-live";
  const shown: SetupStepState = summary ? { ...state, state: view.ready ? "done" : "todo" } : state;
  const done = shown.state === "done";
  return (
    <View style={{ borderTopWidth: first ? 0 : 1, borderColor: c.grey100 }}>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`Step ${step.number}: ${step.title}`}
        android_ripple={ripple}
        style={shade(({ pressed }) => ({ minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: space.cardX, paddingVertical: 12,
          backgroundColor: open || pressed ? c.grey50 : c.white }))}>
        <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center",
          backgroundColor: done ? c.success50 : open ? c.orange50 : c.grey100 }}>
          {done ? <Check size={16} color={c.success600} /> : <Text style={[t.label, t.tab, { ...face[600], color: open ? c.orange700 : c.grey600 }]}>{step.number}</Text>}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={t.heading}>{step.title}</Text>
          {!open ? <Text style={[body, { color: c.grey500 }]} numberOfLines={1}>{step.what}</Text> : null}
          <Pill tone={summary ? (done ? "success" : "neutral") : STATE_TONE[shown.state]}>
            {summary ? (view.ready ? "Ready" : "Not ready yet") : stateText(shown)}
          </Pill>
        </View>
        <ChevronDown size={16} color={c.grey500} style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }} />
      </Pressable>
      {open ? (
        <View style={{ paddingHorizontal: space.cardX, paddingBottom: 16, paddingTop: 4, gap: 14, backgroundColor: c.white }}>
          <Fact label="What it is">{step.what}</Fact>
          <Fact label="Why it matters">{step.why}</Fact>
          {!summary && !done && shown.detail ? <Fact label="What is missing">{shown.detail}</Fact> : null}
          {done && !shown.automatic && shown.by ? <Fact label="Marked done by">{`${shown.by}${msAt(shown.at) !== null ? `, ${dayCompact(deviceDay(new Date(msAt(shown.at)!)))}` : ""}`}</Fact> : null}
          {summary ? <Summary view={view} onPick={onPick} /> : (
            <>
              <Screens step={step} code={code} role={role} />
              {ON_A_FILE[step.id] ? <Text style={[body, { color: c.grey600 }]}>{ON_A_FILE[step.id]}</Text> : null}
              <Choices step={step} state={shown} today={today} w={w} onChoose={onChoose} onNext={onNext} />
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

const Fact = ({ label, children }: { label: string; children: ReactNode }) => (
  <View style={{ gap: 2 }}>
    <Text style={t.caption}>{label}</Text>
    <Text style={[t.label, { fontSize: 16, lineHeight: 24, color: c.ink900 }]}>{children}</Text>
  </View>
);

/* THE REAL SCREENS: the phone's; one the role cannot open is disabled and says so; one the phone has not yet is greyed. */
function Screens({ step, code, role }: { step: SetupStepInfo; code: string; role: Role }) {
  const blocked = step.screens.filter((s) => !mayReach(role, s.to));
  const away = step.screens.filter((s) => !blocked.includes(s) && !phoneRoute(s.to.replace(":code", code), code));
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {step.screens.map((screen, i) => {
          const route = blocked.includes(screen) ? null : phoneRoute(screen.to.replace(":code", code), code);
          return (
            <Btn key={screen.to} variant={i === 0 && route ? "primary" : "secondary"} label={`Open ${screen.label}`} disabled={!route}
              a11y={route ? `Open ${screen.label}` : `Open ${screen.label}: ${blocked.includes(screen) ? "your role cannot open it" : ON_THE_WEBSITE}`}
              onPress={() => route && router.push(route as never)} />
          );
        })}
      </View>
      {blocked.length > 0 ? <Text style={[body, { color: c.grey600 }]}>{`Your role cannot open ${blocked.map((b) => b.label).join(", ")}. Ask the owner or an Admin.`}</Text> : null}
      {away.length > 0 ? <Text style={[body, { color: c.grey600 }]}>{`${away.map((b) => b.label).join(", ")}: ${ON_THE_WEBSITE.toLowerCase()}.`}</Text> : null}
    </View>
  );
}

function Choices({ step, state, today, w, onChoose, onNext }: {
  step: SetupStepInfo; state: SetupStepState; today: string; w: Writes;
  onChoose: (id: StepId, c: StepChoice, after?: () => void) => Promise<void>; onNext: () => void;
}) {
  const [reminding, setReminding] = useState(false);
  const done = state.state === "done";
  return (
    <View style={{ gap: 8 }} accessibilityLabel={`Choices for ${step.title}`}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {!state.automatic && !done ? <Btn label={w.busy ? "…" : "Completed"} disabled={w.off} onPress={() => void onChoose(step.id, { choice: "completed" })} /> : null}
        <Btn label="Next" onPress={onNext} />
        {!done ? (
          <>
            <Btn label="Later" disabled={w.off || state.state === "later"} onPress={() => void onChoose(step.id, { choice: "later" })} />
            <Btn label="Remind me" disabled={w.off} onPress={() => setReminding((r) => !r)} />
          </>
        ) : null}
        {mayUndo(state) ? <Btn variant="ghost" label="Undo" disabled={w.off} onPress={() => void onChoose(step.id, { choice: "clear" })} /> : null}
      </View>
      {reminding && !done ? (
        <View style={{ gap: 8, borderRadius: 10, backgroundColor: c.grey50, padding: 12 }} accessibilityLabel="When to remind you">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {REMIND_IN.map(([label, days]) => (
              <Btn key={label} label={label} disabled={w.off}
                onPress={() => void onChoose(step.id, { choice: "remind", remindOn: addDays(today, days) }, () => setReminding(false))} />
            ))}
          </View>
          <View style={{ alignSelf: "flex-start" }}><Btn label="Remind me on this date" a11y={`Remind me on this date: ${ON_THE_WEBSITE}`} disabled onPress={() => undefined} /></View>
          <Text style={[t.caption, { lineHeight: 17 }]}>{`Choosing a date: ${ON_THE_WEBSITE.toLowerCase()} (a date picker, @react-native-community/datetimepicker 9.1.0, is not installed).`}</Text>
        </View>
      ) : null}
    </View>
  );
}

/* STEP 18: everything done, everything waiting, and whether a first booking's five are done. Links only: nothing here changes anything. */
function Summary({ view, onPick }: { view: SetupView; onPick: (id: StepId) => void }) {
  const { left, done, missing } = summaryOf(view);
  return (
    <View style={{ gap: 14 }}>
      {view.ready ? (
        <View style={{ flexDirection: "row", gap: 8, borderRadius: 10, backgroundColor: c.success50, padding: 12 }}>
          <CheckCircle2 size={16} color={c.success600} style={{ marginTop: 3 }} />
          <Text style={[t.label, { flex: 1, fontSize: 16, lineHeight: 24, color: c.ink900 }]}>
            <Text style={face[600]}>Ready to go live.</Text> The five things a first booking needs are done. Nothing is locked: change anything, at any time.
          </Text>
        </View>
      ) : (
        <View style={{ borderRadius: 10, backgroundColor: c.yellow50, padding: 12 }}>
          <Text style={[t.label, { fontSize: 16, lineHeight: 24, color: c.ink900 }]}>
            <Text style={face[600]}>Not ready yet.</Text>{` Still needed before the first booking: ${missing.map((s) => s.title).join(", ")}.`}
          </Text>
        </View>
      )}
      <View style={{ gap: 4 }}>
        <Text style={[t.heading, { fontSize: 16 }]}>{`Still to do (${left.length})`}</Text>
        {left.length === 0 ? <Text style={[body, { color: c.grey600 }]}>Every step is done.</Text> : left.map((s, i) => (
          <Pressable key={s.id} onPress={() => onPick(s.id)} accessibilityRole="button" android_ripple={ripple}
            style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: i === 0 ? 0 : 1, borderColor: c.grey100 }}>
            <Circle size={16} color={c.grey400} />
            <Text style={[t.label, { flex: 1, fontSize: 16, color: c.ink900 }]}>{`Step ${s.number}, ${s.title}`}</Text>
            <Text style={[t.label, { color: c.grey500 }]}>{stateText(rowOf(view, s.id))}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ gap: 4 }}>
        <Text style={[t.heading, { fontSize: 16 }]}>{`Done (${done.length})`}</Text>
        {done.length === 0 ? <Text style={[body, { color: c.grey600 }]}>Nothing is done yet.</Text> : done.map((s) => (
          <View key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 }}>
            <Check size={16} color={c.success600} />
            <Text style={[body, { color: c.grey600 }]}>{s.title}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
