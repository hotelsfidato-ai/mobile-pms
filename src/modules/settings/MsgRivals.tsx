import { useQueryClient } from "@tanstack/react-query";
import { Switch, Text, View } from "react-native";
import { c, face, t } from "../../core/theme";
import { s as core, useRead } from "../../core/ui";
import { body, saidOf, useSaid } from "../admin/kit";
import type { AdminProps } from "../admin/Route";
import { getRivalsSwitch, setRivalsSwitch } from "./msgData";
import { ChangedBy, MsgPage, StuckLine, unknownSaid, usePageWrite } from "./MsgKit";
import { dayShort, refusedPage } from "./msgRules";

/* ══════════════════════════════════════════════════════════════════
   SETTINGS → MODULES AND CONNECTIONS → RIVALS' PRICES on a phone (lane
   m13-set-messages) — the web's src/modules/market-rates/pages/
   RivalsPrices.tsx (D27-270).

   One switch for this hotel: whether nearby hotels' lowest public prices
   are checked (Google Hotels, through SerpApi), the next 30 nights, on
   Mondays and Thursdays from 06:00. Off until switched on; one tap either
   way, as on the web (it asks nothing). It searches nothing while the
   server has no search key, and says so. Nothing here changes a price.
   The owner, an administrator or the GM (roleGate room_config;
   app.manages_hotel). Not pictured: built from the web's code.
   ══════════════════════════════════════════════════════════════════ */

const LABEL = "Check nearby hotels' prices";

export function MsgRivals(props: AdminProps) {
  const code = props.hotel.code;
  const cache = useQueryClient();
  const { said, say, close } = useSaid();
  const key = ["settings", code, "rivals"];
  const read = useRead(() => (refusedPage(props.role, "rivals") ? Promise.resolve(null) : getRivalsSwitch(code)), key);
  const write = usePageWrite(code, "rivals");
  const again = () => void cache.invalidateQueries({ queryKey: key });
  const flip = (isOn: boolean) => write.run(() => setRivalsSwitch(code, isOn), {
    ok: () => { say({ title: "Saved", tone: "ok" }); again(); },
    no: (e) => say(saidOf(e, "Not saved")),
    unknown: (e) => { say(unknownSaid(`switched ${isOn ? "on" : "off"}`, "Rivals' prices here", e)); again(); },
  });
  return (
    <MsgPage props={props} page="rivals" title="Rivals' prices" what="the rivals' prices switch"
      under="Nearby hotels' lowest public prices, shown beside each suggestion on Revenue outlook. Nothing here changes a price."
      read={read} said={said} onSaid={close}>
      {(data, writeRefused) => (
        <View style={[core.card, { paddingVertical: 0 }]}>
          <View style={{ paddingVertical: 14, flexDirection: "row", alignItems: "flex-start", gap: 16 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[t.heading, face[500]]}>{LABEL}</Text>
              <Text style={[body, { color: c.grey600 }]}>
                The next 30 nights, on Mondays and Thursdays from 06:00, the hotel's time: each nearby hotel's lowest price on Google Hotels. About 260 searches a month.
              </Text>
              {data.lastRunOn ? <Text style={[body, { color: c.grey600 }]}>Last checked {dayShort(data.lastRunOn)}.</Text> : null}
              <ChangedBy who={data.changedBy} />
              <StuckLine stuck={write.stuck} where="this switch" />
            </View>
            <Switch value={data.isOn} onValueChange={(v) => void flip(v)} disabled={write.busy || write.stuck || writeRefused !== null}
              accessibilityLabel={LABEL} trackColor={{ false: c.grey300, true: c.orange }} thumbColor={c.white} ios_backgroundColor={c.grey300} />
          </View>
          {!data.keySet ? (
            <Text style={[body, { color: c.grey600, paddingVertical: 12, borderTopWidth: 1, borderColor: c.grey100 }]}>
              The server has no search key yet (SERPAPI_KEY), so nothing is checked for any hotel.
            </Text>
          ) : null}
        </View>
      )}
    </MsgPage>
  );
}
