import { Mail, MessageCircle, MessageSquare, Phone } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import type { Hotel } from "../../core/api";
import { c, face, space, t } from "../../core/theme";
import { Capsule, Head, Screen, useRead } from "../../core/ui";
import { whyNotDesk } from "../guest-services/roles";
import { getGuestMessages } from "./data";
import { Empty, Failed, Loading, Pill, Refused, Sheet, SheetHead, Stale, body, small } from "./kit";
import { whyNotMessages } from "./roles";
import {
  UNREACHABLE_UNDER, bookingOf, cameBack, dayShort, emptyOf, notConnectedOf, sentByWord, statusTone, statusWord,
  underOf, unreachableTitle, wentTo, type SentMessage, type Unreachable,
} from "./rules";

/* ══════════════════════════════════════════════════════════════════
   GUEST MESSAGES on a phone — the web's /h/:code/guest-messages
   (src/modules/guest-messaging/pages/GuestMessages.tsx; picture
   pms-shots/all/17-guests-crm-guest-messages, as dev-gm). What this system
   sent guests and whether it arrived: the sender's note when nothing can
   be sent, the bookings no message can reach (MSG-3), and the record, one
   card per message as the web's DataTable draws a row at phone width.

   THIS SCREEN NEVER SENDS AND HAS NO BUTTON THAT DOES. The record is
   written by the sender itself; the guest's number and address are shown
   exactly as the web shows them to the same roles (the server's
   `customer` readers, D27-144), and no message text exists to show (the
   wording lives in n8n).

   ?reservation=<id>: what went about one booking and its group, as the web.
   The web's card of messages TO the desk (MessagesToTheDesk) is guest
   services' screen on the phone: a link here for the desk's roles.
   ══════════════════════════════════════════════════════════════════ */

const OFFLINE = {
  title: "No connection",
  description: "This phone is offline, so what was sent cannot load. Pull down to read it again once the connection is back.",
};

export function GuestMessages({ hotel, role, reservation, onOpenDesk }: {
  hotel: Hotel; role: string | null; reservation?: string; onOpenDesk: () => void;
}) {
  const code = hotel.code;
  const refused = whyNotMessages(role);
  const [pulled, setPulled] = useState(false);
  const q = useRead(
    () => (refused ? Promise.resolve(null) : getGuestMessages(code, reservation)),
    ["guest-messaging", code, "messages", reservation ?? "all"],
  );
  const data = q.data;
  const note = data ? notConnectedOf(data) : null;

  return (
    <Screen refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
      <Head title="Guest messages" under={underOf(reservation)} />

      {/* The guests' own messages to the desk (D23-14): the web's card on this page, guest services' screen here. */}
      {whyNotDesk(role) === null && !refused ? (
        <View style={{ flexDirection: "row" }}>
          <Capsule label="Messages from guests" icon={<MessageCircle size={16} color={c.grey600} />} onPress={onOpenDesk} />
        </View>
      ) : null}

      {refused ? <Refused title="What was sent is not available" reason={refused} />
        : data === undefined
          ? (q.error
            ? <Failed title="What was sent did not load" error={q.error} offline={OFFLINE} onRetry={q.reload} />
            : <Loading what="Reading what was sent…" />)
          : data === null ? null
          : (
            <>
              <Stale error={q.error} />

              {/* THE SENDER'S OWN SENTENCE, not a second one written here. */}
              {note ? (
                <View style={{ backgroundColor: c.yellow50, borderColor: c.yellow100, borderWidth: 1, borderRadius: 12, paddingHorizontal: space.cardX, paddingVertical: space.cardY }}>
                  <Text style={[body, { color: c.ink900, lineHeight: 23 }]}>
                    <Text style={face[600]}>Nothing is sent yet</Text>{" - "}{note}
                  </Text>
                </View>
              ) : null}

              {data.unreachable.length > 0 ? <NoWay rows={data.unreachable} /> : null}

              {data.messages.length === 0
                ? <Empty Icon={MessageSquare} {...emptyOf(data.connected)} />
                : (
                  <Sheet label="What was sent">
                    {data.messages.map((m, i) => <Sent key={m.id} m={m} last={i === data.messages.length - 1} />)}
                  </Sheet>
                )}
            </>
          )}
    </Screen>
  );
}

/** MSG-3: a list, not a second record - the record is below. */
function NoWay({ rows }: { rows: Unreachable[] }) {
  return (
    <Sheet>
      <SheetHead title={unreachableTitle(rows.length)} under={UNREACHABLE_UNDER} />
      <View style={{ paddingHorizontal: space.cardX }}>
        {rows.map((u, i) => (
          <View key={u.id} style={{ paddingVertical: 12, flexDirection: "row", flexWrap: "wrap", columnGap: 16, rowGap: 2, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.grey100 }}>
            <Text style={[body, t.tab, { color: c.ink900, ...face[600] }]}>{u.reference}</Text>
            <Text style={[body, { color: c.ink900 }]}>{u.guest}</Text>
            <Text style={[body, { color: c.grey600 }]}>Arrives {dayShort(u.checkIn)}</Text>
            <Text style={[body, { color: c.grey600 }]}>{u.why}</Text>
          </View>
        ))}
      </View>
    </Sheet>
  );
}

/** One label and its value, as the DataTable's phone card writes a column. */
function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <Text style={[small, { width: 114, paddingTop: 2, textTransform: "uppercase", letterSpacing: 0.3 }]}>{label}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
    </View>
  );
}

/** One attempt: when (the property's day), then What, Booking, To, State, Sent by, What came back. */
function Sent({ m, last }: { m: SentMessage; last: boolean }) {
  const Icon = m.channel === "email" ? Mail : Phone;
  const back = cameBack(m);
  return (
    <View style={{ paddingHorizontal: space.cardX, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.grey100 }}>
      <Text style={[body, { color: c.ink900, ...face[600] }]}>{dayShort(m.sentAt)}</Text>
      <View style={{ marginTop: 6, gap: 4 }}>
        <Line label="What"><Text style={[body, { color: c.ink900, ...face[600] }]}>{m.kindLabel}</Text></Line>
        <Line label="Booking"><Text style={[body, { color: c.ink900 }]}>{bookingOf(m)}</Text></Line>
        <Line label="To">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon size={14} color={c.grey400} accessibilityLabel={m.channel === "email" ? "Email" : "Telephone"} />
            <Text style={[body, { color: c.ink900, flexShrink: 1 }]}>{wentTo(m)}</Text>
          </View>
        </Line>
        <Line label="State"><Pill tone={statusTone(m.status)}>{statusWord(m.status)}</Pill></Line>
        <Line label="Sent by"><Text style={[body, { color: c.ink900 }]}>{sentByWord(m)}</Text></Line>
        <Line label="What came back"><Text style={[body, { color: m.detail ? c.grey600 : c.grey500 }]}>{back}</Text></Line>
      </View>
    </View>
  );
}
