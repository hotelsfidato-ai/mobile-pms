import { useQueryClient } from "@tanstack/react-query";
import { Switch, Text, View } from "react-native";
import { c, face, t } from "../../core/theme";
import { s as core, useRead } from "../../core/ui";
import { Empty, body, saidOf, useSaid } from "../admin/kit";
import type { AdminProps } from "../admin/Route";
import { getMessageSwitches, setMessageSwitch } from "./msgData";
import { ChangedBy, MsgPage, StuckLine, unknownSaid, usePageWrite } from "./MsgKit";
import { catchUpLine, onSince, refusedPage, type MessageSwitch } from "./msgRules";

/* ══════════════════════════════════════════════════════════════════
   SETTINGS → MESSAGES → GUEST MESSAGES ON/OFF on a phone (lane
   m13-set-messages) — the web's src/modules/guest-messaging/pages/
   MessageSwitches.tsx (D27-261, D27-264, D27-281).

   One row per message the guest gets by itself: its words and when it
   goes (the server's), each phone's own Switch. A switch changes only this
   hotel, at one tap either way: the web asks nothing before switching one
   off, so neither does the phone. While one is being saved every switch
   waits (the web's `disabled={busy}`). Saved: "Saved", and the list is read
   again. The owner, an administrator or the GM (roleGate room_config;
   app.manages_hotel). Not pictured: built from the web's code.
   ══════════════════════════════════════════════════════════════════ */

export function MsgSwitches(props: AdminProps) {
  const code = props.hotel.code;
  const cache = useQueryClient();
  const { said, say, close } = useSaid();
  const key = ["settings", code, "switches"];
  const read = useRead(() => (refusedPage(props.role, "switches") ? Promise.resolve(null) : getMessageSwitches(code)), key);
  const write = usePageWrite(code, "switches");
  const again = () => void cache.invalidateQueries({ queryKey: key });
  const flip = (m: MessageSwitch, isOn: boolean) => write.run(() => setMessageSwitch(code, m.kind, isOn), {
    ok: () => { say({ title: "Saved", tone: "ok" }); again(); },
    no: (e) => say(saidOf(e, "Not saved")),
    unknown: (e) => { say(unknownSaid(`switched ${isOn ? "on" : "off"}`, `${m.label} here`, e)); again(); },
  });
  return (
    <MsgPage props={props} page="switches" title="Guest messages on/off" what="the guest messages' switches"
      under="Which messages this hotel's guests get by themselves, and when. The wording stays in the sending workflow."
      read={read} said={said} onSaid={close}>
      {(data, writeRefused) => data.messages.length === 0
        ? <Empty title="No message to switch" description="The server sent no guest message for this hotel." />
        : (
          <View style={[core.card, { paddingVertical: 0 }]}>
            {data.messages.map((m, i) => (
              <Row key={m.kind} m={m} first={i === 0} disabled={write.busy || write.stuck || writeRefused !== null} onSave={(v) => void flip(m, v)} />
            ))}
            <View style={{ paddingVertical: 12, borderTopWidth: 1, borderColor: c.grey100, gap: 4 }}>
              <StuckLine stuck={write.stuck} where="the switches" />
              <Text style={[body, { color: c.grey600 }]}>{catchUpLine(data.catchUp)}</Text>
            </View>
          </View>
        )}
    </MsgPage>
  );
}

function Row({ m, first, disabled, onSave }: { m: MessageSwitch; first: boolean; disabled: boolean; onSave: (isOn: boolean) => void }) {
  const since = onSince(m);
  return (
    <View style={{ paddingVertical: 14, borderTopWidth: first ? 0 : 1, borderColor: c.grey100, flexDirection: "row", alignItems: "flex-start", gap: 16 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[t.heading, face[500]]}>{m.label}</Text>
        <Text style={[body, { color: c.grey600 }]}>{m.when}</Text>
        {since ? <Text style={[body, { color: c.grey600 }]}>{since}</Text> : null}
        <ChangedBy who={m.changedBy} />
      </View>
      <Switch value={m.isOn} onValueChange={onSave} disabled={disabled} accessibilityLabel={m.label}
        trackColor={{ false: c.grey300, true: c.orange }} thumbColor={c.white} ios_backgroundColor={c.grey300} />
    </View>
  );
}
