import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Switch, Text, View } from "react-native";
import { c, face, t } from "../../core/theme";
import { s as core, keys, useRead } from "../../core/ui";
import { Btn, Empty, Field, body, saidOf, useSaid } from "../admin/kit";
import type { AdminProps } from "../admin/Route";
import { getReportEmails, setReportEmails } from "./msgData";
import { ChangedBy, MsgPage, NotSent, StuckLine, unknownSaid, usePageWrite } from "./MsgKit";
import { emailsDraftOf, refusedPage, sendToHint, type EmailsDraft } from "./msgRules";

/* ══════════════════════════════════════════════════════════════════
   SETTINGS → MESSAGES → DAILY REPORT EMAILS on a phone (lane
   m13-set-messages) — the web's src/modules/guest-messaging/pages/
   DailyReportEmails.tsx (the owner's D27-280).

   For this hotel: each report On or Off, and the addresses it goes to,
   right after the night audit closes the day. The switches and the
   addresses are a draft until Save, which sends all of them as a whole
   (PUT /report-emails); the server checks each address and says which is
   not one. The addresses are other people's: the email keyboard, no
   capitals, no autofill (docs/NATIVE.md), one a line as the web asks.
   A read that brings something new resets the draft, as the web's does.
   The owner, an administrator or the GM. Not pictured: built from the
   web's code.
   ══════════════════════════════════════════════════════════════════ */

export function MsgReportEmails(props: AdminProps) {
  const code = props.hotel.code;
  const cache = useQueryClient();
  const { said, say, close } = useSaid();
  const key = ["settings", code, "report-emails"];
  const write = usePageWrite(code, "reportEmails");
  const read = useRead(write.watch(() => (refusedPage(props.role, "reportEmails") ? Promise.resolve(null) : getReportEmails(code))), key);
  const [draft, setDraft] = useState<EmailsDraft>({});
  /* react-query keeps the same answer object when a read brings nothing new, so typing survives a pull. */
  const answer = read.data && "ok" in read.data ? read.data.ok : undefined;
  useEffect(() => { if (answer) setDraft(emailsDraftOf(answer)); }, [answer]);
  const change = (k: string, part: Partial<EmailsDraft[string]>) => setDraft((d) => ({ ...d, [k]: { ...d[k]!, ...part } }));
  const again = () => void cache.invalidateQueries({ queryKey: key });
  const save = () => write.run(() => setReportEmails(code, draft), {
    ok: () => { say({ title: "Saved", tone: "ok" }); again(); },
    no: (e) => say(saidOf(e, "Not saved")),
    unknown: (e) => { say(unknownSaid("saved", "the daily report emails", e)); again(); },
  });
  return (
    <MsgPage props={props} page="reportEmails" title="Daily report emails" what="the daily report emails"
      under="Sent right after the night audit closes the day: the key figures in the email, the whole report as a PDF."
      read={read} said={said} onSaid={close}>
      {(data, writeRefused) => {
        const off = write.busy || write.stuck || writeRefused !== null;
        return (
          <>
            <NotSent sentence={data.notConnected} />
            {data.reports.length === 0
              ? <Empty title="No report to send" description="The server sent no daily report for this hotel." />
              : (
                <View style={[core.card, { paddingVertical: 0 }]}>
                  {data.reports.map((r, i) => {
                    const d = draft[r.key];
                    if (!d) return null;
                    return (
                      <View key={r.key} style={{ paddingVertical: 14, gap: 12, borderTopWidth: i === 0 ? 0 : 1, borderColor: c.grey100 }}>
                        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 16 }}>
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={[t.heading, face[500]]}>{r.title}</Text>
                            <Text style={[body, { color: c.grey600 }]}>{r.contains}</Text>
                            <ChangedBy who={r.changedBy} />
                          </View>
                          <Switch value={d.isOn} onValueChange={(isOn) => change(r.key, { isOn })} disabled={off} accessibilityLabel={r.title}
                            trackColor={{ false: c.grey300, true: c.orange }} thumbColor={c.white} ios_backgroundColor={c.grey300} />
                        </View>
                        <Field label="Send to" value={d.text} onChangeText={(text) => change(r.key, { text })} multiline editable={!off}
                          placeholder="name@example.com" hint={sendToHint(d.isOn, d.text)}
                          input={{ ...keys.email, accessibilityLabel: `Send the ${r.title} to` }} />
                      </View>
                    );
                  })}
                  <View style={{ paddingVertical: 12, borderTopWidth: 1, borderColor: c.grey100, gap: 8 }}>
                    <StuckLine stuck={write.stuck} where="the daily report emails" onRead={read.reload} />
                    <Btn label={write.busy ? "Saving…" : "Save"} variant="primary" disabled={off} onPress={() => void save()} />
                  </View>
                </View>
              )}
          </>
        );
      }}
    </MsgPage>
  );
}
