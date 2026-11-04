import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, face, t } from "../../core/theme";
import { Head, notKnown, Screen, useRead, useStuck } from "../../core/ui";
import { getDeskMessages, handleRequest, replyToGuest } from "./data";
import {
  Back, Box, Btn, body, Empty, Failed, Field, InDialog, Input, Loading, NotYours, Pill, Stale, Toast, saidOf, type Said,
} from "./kit";
import { whyNotDesk } from "./roles";
import { dateTime, replyFits, thread, unread } from "./rules";

/* ══════════════════════════════════════════════════════════════════
   MESSAGES TO THE FRONT DESK, AND REPLIES on a phone — the web's card in
   Guest messages (src/modules/online-checkin/MessagesToTheDesk.tsx). The
   property's list: every booking's unread, each with Reply and Mark
   handled. A booking's (?reservation=): everything it sent and the desk's
   replies, newest first, and one box. The guest reads a reply on their own
   page as "Front desk"; nothing goes on WhatsApp; a reply marks the
   booking's unread messages handled. No box once the guest has checked out.
   Guest messages' record of what the system SENT is not here: it is
   Tier 2 (PLAN § 3), a screen of its own.
   Where the phone differs: this is a screen, not a card on another page,
   so with nothing to show it says so; the web draws nothing.
   ══════════════════════════════════════════════════════════════════ */

export function Messages({ hotel, role, reservation, onBack, onOpen }: {
  hotel: Hotel; role: string | null; reservation?: string; onBack: () => void; onOpen: (reservation: string) => void;
}) {
  const code = hotel.code;
  const cache = useQueryClient();
  const refused = whyNotDesk(role);
  const title = reservation ? "Messages from the guest" : "Messages from guests";
  const [said, setSaid] = useState<Said | null>(null);
  const [refusal, setRefusal] = useState<Said | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [pulled, setPulled] = useState(false);

  const q = useRead(
    () => (refused ? Promise.resolve(null) : getDeskMessages(code, reservation)),
    ["guest-services", code, "messages", reservation ?? "unread"],
  );
  const refresh = () => cache.invalidateQueries({ queryKey: ["guest-services", code, "messages"] });

  async function markHandled(id: string) {
    setBusy(true);
    try {
      await handleRequest(code, id, "done");
      await refresh();
    } catch (e) {
      setSaid(saidOf("Not changed", e));
    } finally {
      setBusy(false);
    }
  }

  /* A second tap is a second reply to the guest, and the route reads no key:
     latched at the tap, and after an unknown outcome Send reply takes no more
     taps until this thread is left and read again (MGS-3). */
  const latch = useRef(false);
  const once = useStuck();
  async function sendReply() {
    if (latch.current || once.isStuck()) return;
    latch.current = true;
    setBusy(true);
    setRefusal(null);
    try {
      await replyToGuest(code, reservation!, reply.trim());
      setReply("");
      await refresh();
    } catch (e) {
      if (once.stop(e)) {
        setRefusal({ ...notKnown("sent", "the thread once it is opened again", e), tone: "bad" });
        void refresh();
      } else setRefusal(saidOf("Not sent", e));
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }

  const data = q.data;
  const lines = data ? thread(data) : [];
  const waiting = data ? unread(data) : 0;

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        <Head title={title} under={hotel.name} action={<Back onPress={onBack} />} />

        {refused ? <NotYours title={title} sentence={refused} />
          : data === undefined
            ? (q.error ? <Failed title="Messages from guests did not load" error={q.error} onRetry={q.reload} /> : <Loading words="Reading the messages…" />)
            : data ? (
              <>
                <Stale error={q.error} />
                {lines.length === 0 ? (
                  <Box>
                    <Empty
                      compact title={reservation ? "No messages from this guest" : "Nothing unread"}
                      description="A guest writes from “Message the front desk” on their own page, and it waits here until somebody handles it."
                    />
                  </Box>
                ) : (
                  <Box>
                    {waiting > 0 ? (
                      <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.grey200 }}>
                        <Pill tone="warning">{`${waiting} unread`}</Pill>
                      </View>
                    ) : null}
                    {lines.map(({ m, r }, i) => (r ? (
                      <View key={r.id} style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: c.grey50, borderTopWidth: i ? 1 : 0, borderTopColor: c.grey100, borderRadius: 12 }}>
                        <Text style={[body, { color: c.ink900, ...face[600] }]}>Reply from the front desk</Text>
                        <Text style={[body, { color: c.ink900, marginTop: 2 }]}>{r.what}</Text>
                        <Text style={[body, { marginTop: 2 }]}>{r.sentBy ?? "A member of staff"}, {dateTime(r.sentAt)}</Text>
                      </View>
                    ) : m ? (
                      <View key={m.id} style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.grey100 }}>
                        <View>
                          {/* The guest's words: a text node, never markup. */}
                          <Text style={[body, { color: c.ink900 }]}>{m.what}</Text>
                          <Text style={[body, { marginTop: 2 }]}>{m.guest} · {m.reference} · {dateTime(m.createdAt)}</Text>
                          {m.handledAt ? <Text style={[body, { marginTop: 2 }]}>Handled by {m.handledBy ?? "a member of staff"}, {dateTime(m.handledAt)}</Text> : null}
                        </View>
                        {!m.handledAt ? (
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                            {!reservation && m.reservationId ? <Btn label="Reply" a11y={`Reply to ${m.guest}`} variant="ghost" onPress={() => onOpen(m.reservationId)} /> : null}
                            <Btn label="Mark handled" a11y={`Mark handled: ${m.what}`} disabled={busy} onPress={() => void markHandled(m.id)} />
                          </View>
                        ) : null}
                      </View>
                    ) : null))}
                  </Box>
                )}

                {reservation ? (data.canReply ? (
                  <Box style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 12 }}>
                    <Field label="Reply to the guest" hint="They see it on their own page as “Front desk”. It is not sent on WhatsApp.">
                      <Input label="Reply to the guest" rows={3} maxLength={500} value={reply} onChangeText={setReply} />
                    </Field>
                    <InDialog said={refusal} />
                    <View style={{ flexDirection: "row" }}>
                      <Btn label={busy ? "Sending…" : "Send reply"} disabled={busy || once.stuck || !replyFits(reply)} onPress={() => void sendReply()} />
                    </View>
                  </Box>
                ) : <Text style={body}>This guest has checked out. Replies stop at check-out.</Text>) : null}
              </>
            ) : null}
      </Screen>
      <Toast said={said} onClose={() => setSaid(null)} />
    </View>
  );
}
