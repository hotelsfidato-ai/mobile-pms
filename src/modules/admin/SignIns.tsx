import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";
import { ExportButtons } from "../../core/Export";
import { c, t } from "../../core/theme";
import { Head, Screen, s as core, notKnown, useRead } from "../../core/ui";
import { listPeople, listSignIns, signOutDevice } from "./data";
import { Btn, Choose, Empty, Failed, Labelled, Loading, Refused, Stale, Toast, confirm, saidOf, useAct, useSaid, type Said } from "./kit";
import { refusedScreen } from "./rolesRules";
import { dateTime, deviceInWords, signInNow, type SignIn } from "./rules";
import type { AdminProps } from "./Route";

/* ══════════════════════════════════════════════════════════════════
   SIGN-INS AND DEVICES on a phone — the web's /admin/sign-ins, now
   Settings → People and security → Sign-ins and devices (pages/SignIns.tsx;
   picture pms-shots/new/n-admin-sign-ins, as dev-owner). Each sign-in is
   one device, kept 90 days. The owner reads anybody's, an Admin the people
   at a hotel where they hold Admin (app.devices_of: the server decides and
   says so). "Sign out this device" (a revoke) asks first in the web's
   words, with the phone's own dialog; the password still works. The
   network address is kept on the server and never sent.
   ══════════════════════════════════════════════════════════════════ */

export function SignIns({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refused = refusedScreen(role, "signIns");
  const { said, say, close } = useSaid();
  const [whose, setWhose] = useState("");
  const [pulled, setPulled] = useState(false);
  const [seenAt, setSeenAt] = useState(0);
  const people = useRead(() => (refused ? Promise.resolve(null) : listPeople()), ["admin", code, "people"]);
  const key = ["admin", code, "sign-ins", whose] as const;
  const history = useRead(async () => {
    if (refused || !whose) return null;
    const started = Date.now();
    const answer = await listSignIns(whose);
    setSeenAt(started);
    return answer.signIns;
  }, key);
  const name = people.data?.staff.find((p) => p.id === whose)?.name;
  const rows = history.data ?? [];

  const table = whose && history.data ? {
    title: "Sign-ins and devices", subtitle: `${name ?? ""} · ${hotel.name}`,
    columns: ["Signed in", "Device", "Signed out", "Signed out by"],
    rows: rows.map((r) => [dateTime(r.at), deviceInWords(r.device) ?? r.device ?? "-", r.signedOutAt ? dateTime(r.signedOutAt) : "-", r.signedOutBy ?? "-"]),
  } : null;

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && (people.loading || history.loading)} onRefresh={() => { setPulled(true); people.reload(); history.reload(); }}>
        <Head title="Sign-ins and devices" under="When each person signed in, and on what device. Kept 90 days." />
        {refused ? <Refused sentence={refused} /> : people.data === undefined
          ? (people.error ? <Failed error={people.error} onRetry={people.reload} /> : <Loading what="the people" />)
          : (
            <>
              <Choose label="Whose" value={whose} onChange={setWhose} none="Pick a person"
                choices={(people.data?.staff ?? []).map((p) => ({ value: p.id, label: p.name }))} />
              {whose ? <ExportButtons table={table} /> : null}
              {!whose ? null : history.data === undefined
                ? (history.error ? <Failed error={history.error} onRetry={history.reload} /> : <Loading what="the sign-ins" />)
                : (
                  <>
                    <Stale error={history.error} />
                    {rows.length === 0
                      ? <Empty title="No sign-ins" description="None in the last 90 days, or none since this was first kept." />
                      : rows.map((r) => (
                        <Row key={r.id} r={r} seenAt={seenAt} onSaid={say}
                          onDone={(s) => { say(s); void cache.invalidateQueries({ queryKey: key }); }} staffId={whose} />
                      ))}
                  </>
                )}
            </>
          )}
      </Screen>
      <Toast said={said} onClose={close} />
    </View>
  );
}

function Row({ r, staffId, seenAt, onSaid, onDone }: { r: SignIn; staffId: string; seenAt: number; onSaid: (s: Said) => void; onDone: (s: Said) => void }) {
  const act = useAct(seenAt);
  const device = deviceInWords(r.device);
  const signOut = async () => {
    if (act.busy || act.stuck) return;
    const yes = await confirm(`Sign out ${device ?? "this device"}?`,
      `The sign-in of ${dateTime(r.at)} stops working at once; that device must sign in again. Their password still works, and their other devices stay signed in.`, "Sign out");
    if (!yes) return;
    await act.run(() => signOutDevice(staffId, r.id), {
      ok: () => onDone({ title: "Signed out", body: "That device must sign in again. The password still works.", tone: "ok" }),
      no: (e) => onSaid(saidOf(e, "Not signed out")),
      unknown: (e) => onDone({ ...notKnown("signed out", "this sign-in", e), tone: "bad" }),
    });
  };
  return (
    <View style={[core.card, { gap: 10 }]}>
      <Labelled label="Signed in" value={dateTime(r.at)} strong />
      <Labelled label="Device" value={device ?? r.device ?? "-"} />
      <Labelled label="Now" value={signInNow(r)} />
      {!r.signedOutAt ? (
        <View style={{ flexDirection: "row" }}>
          <Btn label={act.busy ? "…" : "Sign out this device"} onPress={() => void signOut()} disabled={act.busy || act.stuck} />
        </View>
      ) : null}
      {act.stuck ? <Text style={[t.caption, { color: c.red700 }]}>{notKnown("signed out", "this sign-in").line} Reading them again…</Text> : null}
    </View>
  );
}
