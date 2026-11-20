import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, ShieldCheck } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { c, t } from "../../core/theme";
import { Head, Screen, s as core, notKnown, useRead } from "../../core/ui";
import { getTwoStep, setTwoStepRequired } from "./data";
import { Loading, Refused, SwitchRow, Toast, body, saidOf, useAct, useSaid } from "./kit";
import { MIN_MANAGER_PASSWORD, MIN_PASSWORD, refusedScreen, setsTwoStepRequired } from "./roles";
import type { AdminProps } from "./Route";

/* ══════════════════════════════════════════════════════════════════
   SIGNING IN on a phone — Settings → People and security → Signing in
   (console.settings.ts SigningInSettings: components/SigningIn.tsx, the
   rules, read only; TwoStep.tsx TwoStepRequiredCard, the group's
   setting). The rules are the owner's and the server holds each one.
   Whether two-step sign-in is required: the owner's and an Admin's switch
   (PUT /api/admin/two-step-required, app.set_two_step_required); anybody
   else sees it greyed with the web's sentence. Refused offline. Not
   pictured.
   ══════════════════════════════════════════════════════════════════ */

function Chip({ children }: { children: ReactNode }) {
  return <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: c.orange50, alignItems: "center", justifyContent: "center" }}>{children}</View>;
}

export function SigningIn({ hotel, role, who }: AdminProps) {
  const code = hotel.code;
  const cache = useQueryClient();
  /* The console's own rule (`setting`): the page has no narrower one. */
  const refused = refusedScreen(role, "settings");
  const { said, say, close } = useSaid();
  const [seenAt, setSeenAt] = useState(0);
  const key = ["admin", code, "two-step"];
  const me = useRead(async () => {
    if (refused) return null;
    const started = Date.now();
    const answer = await getTwoStep();
    setSeenAt(started);
    return answer;
  }, key);
  const act = useAct(seenAt);
  /* The server's own rule, from the whole roster (MADM-4), not the role at the hotel in view. */
  const mayChange = setsTwoStepRequired(who);
  const change = (required: boolean) => act.run(() => setTwoStepRequired(required), {
    ok: () => { say({ title: required ? "Two-step sign-in is required" : "Two-step sign-in is no longer required", body: required ? "The owner, Admins, GMs and Accountants set it up before going on." : undefined, tone: "ok" }); void cache.invalidateQueries({ queryKey: key }); },
    no: (e) => say(saidOf(e, "Not changed")),
    unknown: (e) => { say({ ...notKnown("changed", "this setting", e), tone: "bad" }); void cache.invalidateQueries({ queryKey: key }); },
  });
  const li = (s: string) => <Text key={s} style={[body, { color: c.ink900 }]}>{s}</Text>;
  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={false} onRefresh={() => me.reload()}>
        <Head title="Signing in" under={hotel.name} />
        {refused ? <Refused sentence={refused} /> : (
          <>
            <View style={[core.card, { gap: 10 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Chip><KeyRound size={14} color={c.orange700} /></Chip>
                <Text style={t.heading}>Signing in</Text>
              </View>
              {li(`A password is at least ${MIN_MANAGER_PASSWORD} characters for the owner, an Admin and a GM, and at least ${MIN_PASSWORD} for everybody else.`)}
              {li("Somebody given the owner's, an Admin's or a GM's role with a shorter password sets a new one at their next sign-in.")}
              {li("Each sign-in is kept for 90 days: when, and on what device. The owner and an Admin see it under Sign-ins and devices.")}
              {li("Two-step sign-in asks for a code from an app on the phone as well as the password. Anybody may set it up from their account menu; whether it is required is below.")}
            </View>
            <View style={[core.card, { gap: 10 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Chip><ShieldCheck size={14} color={c.orange700} /></Chip>
                <Text style={t.heading}>Two-step sign-in</Text>
              </View>
              {me.data === undefined ? (me.error ? <Text style={[body, { color: c.red700 }]}>{`Could not read the setting. ${me.error}`}</Text> : <Loading what="the setting" />)
                : me.data === null ? null : (
                  <SwitchRow value={me.data.required} disabled={!mayChange || act.busy || act.stuck} onChange={(on) => void change(on)}
                    label="Required for the owner, Admins, GMs and Accountants"
                    description={mayChange ? "When on, each of them sets it up at their next sign-in. Set up your own first, from your account menu." : "The owner or an Admin changes this."} />
                )}
              {act.stuck ? <Text style={[t.caption, { color: c.red700 }]}>{notKnown("changed", "this setting").line}</Text> : null}
              <Text style={[body, { color: c.grey600 }]}>Anybody may set it up for themselves from their account menu, Two-step sign-in.</Text>
            </View>
          </>
        )}
      </Screen>
      <Toast said={said} onClose={close} />
    </View>
  );
}
